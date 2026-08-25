const OpenAI = require('openai');

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

async function transcribeAudioBuffer(buffer, originalName, mimeType, language = 'pt') {
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
    prompt: CLINICAL_PROMPT,
  });
  return String(result || '').trim();
}

module.exports = { transcribeAudioBuffer };
