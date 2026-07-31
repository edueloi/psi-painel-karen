const { callNfseRest } = require('./restClient');

// Consulta a alíquota do ISS parametrizada pelo município para um código de serviço —
// dispensa o usuário de digitar a alíquota manualmente quando o município já aderiu
// ao Sistema Nacional NFS-e. Serviço de parametrização foi migrado para um host próprio
// (ver comentário em restClient.js), path real confirmado via swagger:
// GET /{codigoMunicipio}/{codigoServico}/{competencia}/aliquota (competencia = data ISO).
async function consultarAliquotaServico(environment, codigoMunicipio, codigoServico, pfxPath, pfxPassword, timeoutMs) {
  const competencia = new Date().toISOString();
  const result = await callNfseRest({
    environment,
    method: 'GET',
    service: 'parametrizacao',
    path: `/${codigoMunicipio}/${codigoServico}/${encodeURIComponent(competencia)}/aliquota`,
    pfxPath,
    pfxPassword,
    timeoutMs,
  });

  if (!result.ok || !result.data?.aliquotas) {
    return { aliquota: null, encontrado: false };
  }

  // "aliquotas" é um objeto cuja(s) chave(s) representa(m) o tipo de incidência;
  // pegamos o primeiro item vigente (sem DtFim ou DtFim no futuro) da primeira chave.
  const grupos = Object.values(result.data.aliquotas);
  const primeiro = grupos[0]?.[0];
  const aliquota = primeiro?.Aliq;

  return {
    aliquota: typeof aliquota === 'number' ? aliquota : null,
    encontrado: typeof aliquota === 'number',
  };
}

module.exports = { consultarAliquotaServico };
