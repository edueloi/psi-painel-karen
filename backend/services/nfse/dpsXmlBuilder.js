const { create } = require('xmlbuilder2');
const { gerarIdDPS, onlyDigits } = require('./dpsId');

// Monta "AAAA-MM-DDTHH:mm:ss±HH:mm" na hora LOCAL do processo (America/Sao_Paulo em
// produção), exigido pelo tipo TSDateTimeUTC do layout nacional — que, apesar do nome,
// rejeita timestamps em UTC puro com sufixo "Z".
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

// Campos mínimos obrigatórios do layout nacional da DPS (AnexoI-SEFIN_ADN-DPS_NFSe-SNNFSe).
// Grupos opcionais fora do escopo de um consultório comum (comExt, obra, intermediário,
// deduções) não são emitidos — servem só para cenários que não se aplicam a serviço de
// psicologia (exportação de serviço, construção civil, etc).

/**
 * @param {object} input
 * @param {object} input.emitter - dados fiscais do profissional emissor (users.*)
 * @param {number} input.serie
 * @param {number} input.numero
 * @param {number} input.aliquotaIss - alíquota do ISS (%) já resolvida
 * @param {string} input.codigoTributacaoNacional - subitem da lista de serviços (LC 116/03)
 * @param {string} input.descricaoServico
 * @param {number} input.valorServico
 * @param {object|null} input.tomador - { nome, cpf, cnpj } de quem contratou o serviço (paciente/pagador)
 * @param {object|null} input.subst - { chSubstda, cMotivo, xMotivo } quando esta DPS substitui uma NFS-e
 *   já autorizada (fluxo de correção oficial do Sistema Nacional NFS-e — o governo cancela a
 *   NFS-e referenciada em chSubstda e emite esta como a substituta, tudo na mesma emissão).
 * @param {string|null} input.dCompetOverride - "AAAA-MM-DD" para reusar a MESMA competência da
 *   nota original em vez de "hoje". Obrigatório ao substituir quando o emitente é optante do
 *   Simples Nacional: o próprio servidor rejeita (erro E0xxx) se dCompet, o tomador (CPF/CNPJ) ou
 *   vServ mudarem entre a nota original e a substituta nesse regime.
 */
function buildDpsXml({ emitter, serie, numero, aliquotaIss, codigoTributacaoNacional, descricaoServico, valorServico, tomador, subst, dCompetOverride }) {
  if (!emitter.nfse_codigo_municipio) {
    throw new Error('Código do município (IBGE) não configurado (Configurações > Dados Fiscais).');
  }

  const cnpjDigits = onlyDigits(emitter.nfse_cnpj_cpf || emitter.cnpj || '');
  const cpfDigits = onlyDigits(emitter.cpf || '');
  const isCnpj = cnpjDigits.length > 11;

  const { id: idDPS } = gerarIdDPS({
    codigoMunicipio: emitter.nfse_codigo_municipio,
    cnpj: isCnpj ? cnpjDigits : undefined,
    cpf: isCnpj ? undefined : (cnpjDigits || cpfDigits),
    serie,
    numero,
  });

  const now = new Date();
  // dhEmi exige data/hora LOCAL com offset de fuso explícito (ex: -03:00), não UTC
  // com "Z" — o layout nacional rejeita UTC puro apesar do nome do tipo TSDateTimeUTC.
  const dhEmi = formatDateTimeWithOffset(now);
  // dCompet precisa usar a mesma data LOCAL de dhEmi (não UTC) — perto da meia-noite,
  // a data UTC pode cair um dia à frente da local e o servidor rejeita "competência
  // posterior à emissão".
  const pad2 = (n) => String(n).padStart(2, '0');
  const dCompet = dCompetOverride || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('DPS', { xmlns: 'http://www.sped.fazenda.gov.br/nfse', versao: '1.00' });
  const infDPS = doc.ele('infDPS', { Id: idDPS });

  infDPS.ele('tpAmb').txt(emitter.nfse_environment === 'producao' ? '1' : '2');
  infDPS.ele('dhEmi').txt(dhEmi);
  infDPS.ele('verAplic').txt('1.0.0');
  infDPS.ele('serie').txt(String(serie).padStart(5, '0'));
  infDPS.ele('nDPS').txt(String(numero));
  infDPS.ele('dCompet').txt(dCompet);
  infDPS.ele('tpEmit').txt('1'); // 1 = prestador do serviço
  infDPS.ele('cLocEmi').txt(onlyDigits(emitter.nfse_codigo_municipio));

  // <subst> fica entre cLocEmi e prest — posição confirmada no XSD oficial
  // (TCInfDPS, tiposComplexos_v1.01.xsd): tpAmb..cLocEmi, subst (minOccurs=0), prest, toma...
  if (subst && subst.chSubstda) {
    const substEl = infDPS.ele('subst');
    substEl.ele('chSubstda').txt(subst.chSubstda);
    substEl.ele('cMotivo').txt(String(subst.cMotivo).padStart(2, '0'));
    if (subst.xMotivo) substEl.ele('xMotivo').txt(String(subst.xMotivo).slice(0, 255));
  }

  const prest = infDPS.ele('prest');
  if (isCnpj) prest.ele('CNPJ').txt(cnpjDigits);
  else prest.ele('CPF').txt(cnpjDigits || cpfDigits);
  // <IM> só pode ser enviado se o município tiver informações complementares
  // registradas no CNC NFS-e (confirmado via erro E0120 do próprio servidor) — como
  // não consultamos o CNC hoje, omitimos por padrão para não quebrar a emissão.
  // <xNome> também é omitido quando o emitente é o próprio prestador (tpEmit=1,
  // caso comum aqui) — o servidor rejeita com E0121 porque o nome já vem do CNC.

  // Grupo <end> é opcional no layout nacional e exige estrutura (endNac com cMun/CEP)
  // que o psi-painel não coleta hoje (só um campo de endereço livre em texto) — omitido
  // de propósito em vez de enviar malformado.

  const regTrib = prest.ele('regTrib');
  // opSimpNac: 1 Não Optante | 2 MEI | 3 ME/EPP
  const opSimpNac = emitter.nfse_regime_tributario === 'simples_nacional' ? 3 : 1;
  regTrib.ele('opSimpNac').txt(String(opSimpNac));
  // regApTribSN é obrigatório quando opSimpNac=3 (erro E0166 do próprio servidor):
  // 1 = tributos federais e municipal apurados pelo SN (caso padrão, sem retenção/
  // substituição tributária de ISS por fora do Simples).
  if (opSimpNac === 3) regTrib.ele('regApTribSN').txt('1');
  regTrib.ele('regEspTrib').txt('0'); // 0 = Nenhum regime especial

  if (tomador && (tomador.nome || tomador.cpf || tomador.cnpj)) {
    const toma = infDPS.ele('toma');
    const tomCpf = onlyDigits(tomador.cpf);
    const tomCnpj = onlyDigits(tomador.cnpj);
    if (tomCnpj) toma.ele('CNPJ').txt(tomCnpj);
    else if (tomCpf) toma.ele('CPF').txt(tomCpf);
    toma.ele('xNome').txt(tomador.nome || 'Consumidor Final');
  }

  const serv = infDPS.ele('serv');
  const locPrest = serv.ele('locPrest');
  locPrest.ele('cLocPrestacao').txt(onlyDigits(emitter.nfse_codigo_municipio));
  const cServ = serv.ele('cServ');
  cServ.ele('cTribNac').txt(String(codigoTributacaoNacional).trim());
  cServ.ele('xDescServ').txt(descricaoServico.slice(0, 1000));

  const valores = infDPS.ele('valores');
  const vServPrest = valores.ele('vServPrest');
  vServPrest.ele('vServ').txt(valorServico.toFixed(2));

  const trib = valores.ele('trib');
  const tribMun = trib.ele('tribMun');
  tribMun.ele('tribISSQN').txt('1'); // 1 = Operação tributável
  tribMun.ele('tpRetISSQN').txt('1'); // 1 = Não retido
  // pAliq não pode ser informado quando o prestador apura o ISSQN pelo próprio Simples
  // Nacional (regApTribSN=1) — o servidor calcula a alíquota pela tabela do SN (erro
  // E0625 do próprio servidor real quando enviado nesse cenário).
  if (opSimpNac !== 3) tribMun.ele('pAliq').txt(aliquotaIss.toFixed(2));

  // tribFed é opcional (sem retenção de PIS/COFINS/INSS/IRRF/CSLL para autônomo) — omitido.
  // totTrib é obrigatório (XSD TCInfoTributacao). Para ME/EPP (opSimpNac=3) o servidor
  // exige pTotTribSN (percentual aprox. da alíquota do Simples Nacional) em vez de
  // indTotTrib=0 (erro E0712 do próprio servidor quando indTotTrib é usado por ME/EPP).
  if (opSimpNac === 3) {
    trib.ele('totTrib').ele('pTotTribSN').txt(aliquotaIss.toFixed(2));
  } else {
    trib.ele('totTrib').ele('indTotTrib').txt('0');
  }

  return { idDPS, xml: doc.up().end() };
}

module.exports = { buildDpsXml };
