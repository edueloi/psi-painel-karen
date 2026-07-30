const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const axios = require('axios');

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

  let pfx;
  try {
    pfx = fs.readFileSync(pfxPath);
  } catch {
    return { ok: false, statusCode: 0, data: null, raw: '', error: `Certificado não encontrado: ${pfxPath}` };
  }

  // mTLS: o certificado do contribuinte autentica a própria conexão TLS, exigido
  // pelo Sistema Nacional NFS-e além da assinatura do XML.
  const httpsAgent = new https.Agent({
    pfx,
    passphrase: pfxPassword,
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
