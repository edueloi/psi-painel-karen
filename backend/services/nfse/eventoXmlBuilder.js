const { create } = require('xmlbuilder2');
const { onlyDigits } = require('./dpsId');

// Monta "AAAA-MM-DDTHH:mm:ss±HH:mm" na hora LOCAL do processo — mesmo formato exigido
// para dhEmi da DPS (ver dpsXmlBuilder.js); o layout nacional rejeita UTC puro com "Z".
function formatDateTimeWithOffset(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const offsetStr = `${sign}${pad(Math.floor(absMin / 60))}:${pad(absMin % 60)}`;

  return `${y}-${mo}-${d}T${h}:${mi}:${s}${offsetStr}`;
}

// Id do pedido de registro de evento, layout nacional: "PDR" + chave de acesso (50) +
// tipo de evento (6) + sequencial do evento para essa chave (2), conforme o Anexo de
// Eventos do Sistema Nacional NFS-e.
function gerarIdPedidoEvento({ chaveAcesso, tipoEvento, sequencial = 1 }) {
  const chave = String(chaveAcesso || '').trim();
  const tpEvento = String(tipoEvento).padStart(6, '0');
  const nSeq = String(sequencial).padStart(2, '0');
  return `PDR${chave}${tpEvento}${nSeq}`;
}

/**
 * Monta o XML do pedido de registro de evento de Cancelamento de NFS-e (e101101).
 * @param {object} input
 * @param {object} input.emitter - dados fiscais do profissional emissor (users.*)
 * @param {string} input.chaveAcesso - chave de acesso da NFS-e a cancelar
 * @param {string} input.motivo - justificativa do cancelamento (texto livre)
 */
function buildCancelamentoXml({ emitter, chaveAcesso, motivo }) {
  const cnpjDigits = onlyDigits(emitter.nfse_cnpj_cpf || emitter.cnpj || '');
  const cpfDigits = onlyDigits(emitter.cpf || '');
  const isCnpj = cnpjDigits.length > 11;

  const idPedido = gerarIdPedidoEvento({ chaveAcesso, tipoEvento: 101101, sequencial: 1 });

  const now = new Date();
  const dhEvento = formatDateTimeWithOffset(now);

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('pedRegEvento', { xmlns: 'http://www.sped.fazenda.gov.br/nfse', versao: '1.00' });
  const infPedReg = doc.ele('infPedReg', { Id: idPedido });

  infPedReg.ele('tpAmb').txt(emitter.nfse_environment === 'producao' ? '1' : '2');
  infPedReg.ele('verAplic').txt('1.0.0');
  infPedReg.ele('dhEvento').txt(dhEvento);
  if (isCnpj) infPedReg.ele('CNPJ').txt(cnpjDigits);
  else infPedReg.ele('CPF').txt(cnpjDigits || cpfDigits);
  infPedReg.ele('chNFSe').txt(chaveAcesso);
  infPedReg.ele('nPedRegEvento').txt('1');

  const e101101 = infPedReg.ele('e101101');
  e101101.ele('xDesc').txt('Cancelamento de NFS-e');
  e101101.ele('cMotivo').txt('1'); // 1 = Erro na emissão
  e101101.ele('xMotivo').txt(String(motivo || 'Erro na emissão da NFS-e').slice(0, 255));

  return { idPedido, xml: doc.up().end() };
}

module.exports = { buildCancelamentoXml, gerarIdPedidoEvento };
