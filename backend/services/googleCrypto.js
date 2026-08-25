const crypto = require('crypto');

// Criptografia dos tokens OAuth do Google (access/refresh token). O refresh
// token dá acesso de leitura/escrita à agenda pessoal da profissional —
// sensível como uma senha de certificado digital — então, igual a
// certCrypto.js, não há fallback hardcoded para a chave: preferimos falhar
// alto a rodar com uma chave fraca conhecida.
function getKey() {
  const raw = process.env.GOOGLE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('GOOGLE_ENCRYPTION_KEY não configurada no ambiente do backend.');
  }
  return Buffer.from(raw, 'utf8').slice(0, 32);
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(enc) {
  const key = getKey();
  const [ivHex, encHex] = enc.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
