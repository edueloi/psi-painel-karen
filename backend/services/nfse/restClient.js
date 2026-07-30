const https = require('https');
const zlib = require('zlib');
const axios = require('axios');
const { loadPfx } = require('./signer');

// Sistema Nacional NFS-e (Sefin Nacional) — comunicação REST+JSON, autenticação mTLS
// (o certificado do contribuinte identifica quem está conectando na própria camada TLS).
const BASE_URLS = {
  homologacao: 'https://adn.producaorestrita.nfse.gov.br',
  producao: 'https://adn.nfse.gov.br',
};

// Compacta o XML da DPS em GZip e codifica em base64, formato exigido pelo corpo da mensagem
function gzipBase64(xml) {
  return zlib.gzipSync(Buffer.from(xml, 'utf-8')).toString('base64');
}

function ungzipBase64(gzipB64) {
  return zlib.gunzipSync(Buffer.from(gzipB64, 'base64')).toString('utf-8');
}

async function callNfseRest({ environment, method, path, body, pfxPath, pfxPassword, timeoutMs }) {
  const url = `${BASE_URLS[environment]}${path}`;

  // mTLS: o certificado do contribuinte autentica a própria conexão TLS, exigido
  // pelo Sistema Nacional NFS-e além da assinatura do XML. Extraímos chave/cert em
  // PEM via node-forge (em vez de passar pfx/passphrase brutos ao https.Agent) porque
  // o parser PKCS12 nativo do OpenSSL do Node rejeita alguns certificados A1 emitidos
  // com PBES2/AES-256 ("Unsupported PKCS12 PFX data"), que o node-forge lê sem problema.
  let cert;
  try {
    cert = loadPfx(pfxPath, pfxPassword);
  } catch (e) {
    return { ok: false, statusCode: 0, data: null, raw: '', error: `Certificado inválido: ${e.message}` };
  }

  const httpsAgent = new https.Agent({
    key: cert.privateKeyPem,
    cert: cert.certificatePem,
    rejectUnauthorized: true,
  });

  try {
    const response = await axios.request({
      url,
      method,
      data: body,
      httpsAgent,
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });

    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      data: typeof response.data === 'object' ? response.data : null,
      raw,
    };
  } catch (err) {
    return { ok: false, statusCode: 0, data: null, raw: '', error: err.message };
  }
}

module.exports = { callNfseRest, gzipBase64, ungzipBase64, BASE_URLS };
