const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'psiflux-default-secret';

/**
 * Gera um token de compartilhamento seguro para um userId.
 * Formato: HMAC(userId)[0:16] + base64url(userId)
 * Exemplo para userId=3: "a4f2b8c1d9e0f124Mw"
 */
function generateShareToken(userId) {
  const idStr = String(userId);
  const hmac = crypto.createHmac('sha256', SECRET).update(idStr).digest('hex').slice(0, 16);
  const encodedId = Buffer.from(idStr).toString('base64url');
  return hmac + encodedId;
}

/**
 * Extrai e valida o userId de um share token.
 * Retorna o userId (número) se válido, ou null se inválido.
 */
function parseShareToken(token) {
  if (!token || typeof token !== 'string' || token.length < 5) return null;
  try {
    // Os primeiros 16 chars são o HMAC, o resto é o userId em base64url
    const hmacPart = token.slice(0, 16);
    const encodedId = token.slice(16);
    const idStr = Buffer.from(encodedId, 'base64url').toString('utf8');
    // Valida que o HMAC bate
    const expectedHmac = crypto.createHmac('sha256', SECRET).update(idStr).digest('hex').slice(0, 16);
    if (hmacPart !== expectedHmac) return null;
    const userId = parseInt(idStr, 10);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return userId;
  } catch {
    return null;
  }
}

module.exports = { generateShareToken, parseShareToken };
