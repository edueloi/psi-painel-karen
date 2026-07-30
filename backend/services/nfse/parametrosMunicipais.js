const { callNfseRest } = require('./restClient');

// Consulta a alíquota do ISS parametrizada pelo município para um código de serviço —
// dispensa o usuário de digitar a alíquota manualmente quando o município já aderiu
// ao Sistema Nacional NFS-e (caso da maioria dos municípios).
async function consultarAliquotaServico(environment, codigoMunicipio, codigoServico, pfxPath, pfxPassword, timeoutMs) {
  const result = await callNfseRest({
    environment,
    method: 'GET',
    path: `/parametros_municipais/${codigoMunicipio}/${codigoServico}`,
    pfxPath,
    pfxPassword,
    timeoutMs,
  });

  if (!result.ok || !result.data) {
    return { aliquota: null, encontrado: false };
  }

  const aliquota = result.data.aliquota;
  return {
    aliquota: typeof aliquota === 'number' ? aliquota : null,
    encontrado: true,
  };
}

module.exports = { consultarAliquotaServico };
