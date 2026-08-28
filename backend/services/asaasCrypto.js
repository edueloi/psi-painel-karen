const crypto = require('crypto');

// A API Key de uma subconta Asaas dá controle financeiro real sobre o saldo
// do profissional — mais sensível que um token de pagamento avulso. Por isso,
// diferente de mercadopago.js/infinitepay.js, não há fallback fraco aqui:
// preferimos falhar alto a rodar com uma chave conhecida (mesmo padrão de
// backend/services/nfse/certCrypto.js).
function getKey() {
  const raw = process.env.ASAAS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ASAAS_ENCRYPTION_KEY não configurada no ambiente do backend.');
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
