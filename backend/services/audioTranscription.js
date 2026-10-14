const OpenAI = require('openai');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
// A API da OpenAI aceita no máximo 25.000.000 bytes. Mantemos margem para os
// metadados enviados no multipart e dividimos gravações longas antes do envio.
const MAX_OPENAI_AUDIO_BYTES = 24 * 1000 * 1000;
const SEGMENT_SECONDS = 10 * 60;

let client;
function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const CLINICAL_PROMPT =
  'Sessão clínica em português brasileiro entre profissional e paciente. ' +
  'Vocabulário: psicologia, psicoterapia, ansiedade, depressão, TDAH, TEA, TCC, ' +
  'psicanálise, prontuário, anamnese, diagnóstico, medicação, emoções e sintomas. ' +
  'Transcreva somente o que foi falado, sem inventar conteúdo.';

async function transcribeOneAudio(buffer, originalName, mimeType, language, prompt) {
  const safeName = originalName || 'audio.webm';
  const extension = (safeName.split('.').pop() || 'webm').toLowerCase();
  const allowedExtensions = new Set(['webm', 'mp4', 'm4a', 'ogg', 'wav', 'mp3', 'opus']);
  const ext = allowedExtensions.has(extension) ? extension : 'webm';
  const { toFile } = require('openai');
  const file = await toFile(buffer, `audio.${ext}`, { type: mimeType || 'audio/webm' });
  const result = await getClient().audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'text',
    prompt: prompt || CLINICAL_PROMPT,
  });
  return String(result || '').trim();
}

async function splitAndTranscribe(buffer, originalName, mimeType, language, prompt) {
  const safeName = path.basename(originalName || 'audio.webm').replace(/[^a-zA-Z0-9._-]/g, '_');
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'psiflux-transcribe-'));
  const inputPath = path.join(temporaryDirectory, safeName);
  const outputPattern = path.join(temporaryDirectory, 'parte-%03d.ogg');

  try {
    await fs.writeFile(inputPath, buffer);
    try {
      await execFileAsync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-i', inputPath,
        '-map', '0:a:0', '-vn', '-c:a', 'libopus', '-b:a', '32k',
        '-f', 'segment', '-segment_time', String(SEGMENT_SECONDS),
        '-reset_timestamps', '1', outputPattern,
      ], { maxBuffer: 1024 * 1024 });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error('O servidor de transcrição não está preparado para processar gravações longas. Tente novamente em alguns minutos.');
      }
      throw new Error(`Não foi possível preparar o áudio para transcrição: ${error?.stderr || error?.message || error}`);
    }

    const parts = (await fs.readdir(temporaryDirectory))
      .filter(file => /^parte-\d+\.ogg$/.test(file))
      .sort();
    if (!parts.length) throw new Error('Não foi possível localizar áudio utilizável para transcrição.');

    const transcriptions = [];
    for (const part of parts) {
      const partBuffer = await fs.readFile(path.join(temporaryDirectory, part));
      if (!partBuffer.length) continue;
      transcriptions.push(await transcribeOneAudio(partBuffer, part, 'audio/ogg', language, prompt));
    }
    return transcriptions.filter(Boolean).join('\n\n').trim();
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function transcribeAudioBuffer(buffer, originalName, mimeType, language = 'pt', prompt = CLINICAL_PROMPT) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Arquivo de áudio vazio.');
  if (buffer.length > MAX_OPENAI_AUDIO_BYTES) {
    console.log(`[Whisper] Gravação longa (${buffer.length} bytes): preparando blocos menores.`);
    return splitAndTranscribe(buffer, originalName, mimeType, language, prompt);
  }
  return transcribeOneAudio(buffer, originalName, mimeType, language, prompt);
}

module.exports = { transcribeAudioBuffer };
