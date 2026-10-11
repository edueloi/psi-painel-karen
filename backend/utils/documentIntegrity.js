// Integridade, tokens de entrega e regras de documentos emitidos (sem dependência de banco: testável isolado).
const crypto = require('crypto');

const RETENTION_YEARS = 5;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const DEFAULT_TOKEN_DAYS = 30;
const MAX_TOKEN_DAYS = 90;

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** Token imprevisível de 256 bits (hex). Só o hash vai para o banco. */
function newDeliveryToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: sha256(token) };
}
const isValidTokenFormat = (t) => typeof t === 'string' && /^[a-f0-9]{64}$/.test(t);
const hashToken = (t) => sha256(String(t || ''));

function tokenExpiry(days, now = new Date()) {
  let n = parseInt(days, 10);
  if (!Number.isFinite(n) || n < 1) n = DEFAULT_TOKEN_DAYS;
  if (n > MAX_TOKEN_DAYS) n = MAX_TOKEN_DAYS;
  return new Date(now.getTime() + n * 86400000);
}
const isExpired = (expiresAt, now = new Date()) => !expiresAt || new Date(expiresAt).getTime() <= now.getTime();

/** Hash curto (não reversível) de IP; evita guardar o IP em claro. */
function hashIp(ip) {
  return sha256(`${process.env.JWT_SECRET || 'doc'}|${ip || ''}`).slice(0, 24);
}
const summarizeUa = (ua) => String(ua || '').replace(/[^\x20-\x7e]/g, '').slice(0, 120);

/** Fim do período de guarda (5 anos a partir da emissão). */
function retentionUntil(issuedAt) {
  const d = new Date(issuedAt);
  d.setFullYear(d.getFullYear() + RETENTION_YEARS);
  return d;
}
const isRetained = (issuedAt, now = new Date()) => retentionUntil(issuedAt).getTime() > now.getTime();

/** Aceita somente PDF de verdade (assinatura %PDF-) e dentro do limite. Retorna Buffer ou lança Error. */
function decodePdfBase64(b64) {
  if (typeof b64 !== 'string' || !b64) throw new Error('Arquivo PDF ausente.');
  const raw = b64.replace(/^data:application\/pdf;base64,/i, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw new Error('Arquivo inválido.');
  const buf = Buffer.from(raw, 'base64');
  if (!buf.length) throw new Error('Arquivo PDF vazio.');
  if (buf.length > MAX_PDF_BYTES) throw new Error('O PDF excede o limite de 5 MB.');
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('O arquivo enviado não é um PDF válido.');
  return buf;
}

/**
 * Regra do CID/DSM no atestado: só consta com autorização formal do paciente ou dever legal.
 * Retorna { ok, error?, cid?, basis? }.
 */
function validateCidAuthorization(input) {
  const i = input || {};
  if (!i.includeCid) return { ok: true, cid: '', basis: '' };
  const cid = String(i.cid || '').trim().slice(0, 40);
  if (!cid) return { ok: false, error: 'Informe o código CID/DSM.' };
  if (i.authorized !== true) return { ok: false, error: 'Confirme a autorização formal do paciente ou o dever legal para informar o CID/DSM.' };
  const basis = i.basis === 'dever_legal' ? 'dever_legal' : i.basis === 'autorizacao_paciente' ? 'autorizacao_paciente' : '';
  if (!basis) return { ok: false, error: 'Informe o fundamento (autorização do paciente ou dever legal).' };
  return { ok: true, cid, basis };
}

/** Sanitiza HTML guardado (defesa em profundidade para exibir na página pública). */
function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form|base)[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, '$1="#"');
}

module.exports = {
  RETENTION_YEARS, MAX_PDF_BYTES, DEFAULT_TOKEN_DAYS, MAX_TOKEN_DAYS,
  sha256, newDeliveryToken, isValidTokenFormat, hashToken, tokenExpiry, isExpired,
  hashIp, summarizeUa, retentionUntil, isRetained, decodePdfBase64, validateCidAuthorization, sanitizeHtml,
};
