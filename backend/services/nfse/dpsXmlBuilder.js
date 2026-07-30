const { create } = require('xmlbuilder2');
const { gerarIdDPS, onlyDigits } = require('./dpsId');

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
 */
function buildDpsXml({ emitter, serie, numero, aliquotaIss, codigoTributacaoNacional, descricaoServico, valorServico, tomador }) {
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
  const dhEmi = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const dCompet = now.toISOString().slice(0, 10);

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('DPS', { xmlns: 'http://www.sped.fazenda.gov.br/nfse' });
  const infDPS = doc.ele('infDPS', { Id: idDPS, versao: '1.00' });

  infDPS.ele('tpAmb').txt(emitter.nfse_environment === 'producao' ? '1' : '2');
  infDPS.ele('dhEmi').txt(dhEmi);
  infDPS.ele('verAplic').txt('1.0.0');
  infDPS.ele('serie').txt(String(serie).padStart(5, '0'));
  infDPS.ele('nDPS').txt(String(numero));
  infDPS.ele('dCompet').txt(dCompet);
  infDPS.ele('tpEmit').txt('1'); // 1 = prestador do serviço
  infDPS.ele('cLocEmi').txt(onlyDigits(emitter.nfse_codigo_municipio));

  const prest = infDPS.ele('prest');
  if (isCnpj) prest.ele('CNPJ').txt(cnpjDigits);
  else prest.ele('CPF').txt(cnpjDigits || cpfDigits);
  if (emitter.nfse_inscricao_municipal) prest.ele('IM').txt(emitter.nfse_inscricao_municipal);
  prest.ele('xNome').txt(emitter.nfse_razao_social || emitter.company_name || emitter.name);

  if (emitter.address) {
    prest.ele('end').ele('xLgr').txt(emitter.address);
  }

  const regTrib = prest.ele('regTrib');
  // opSimpNac: 1 Não Optante | 2 MEI | 3 ME/EPP
  const opSimpNac = emitter.nfse_regime_tributario === 'simples_nacional' ? 3 : 1;
  regTrib.ele('opSimpNac').txt(String(opSimpNac));
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
  cServ.ele('cTribNac').txt(codigoTributacaoNacional);
  cServ.ele('xDescServ').txt(descricaoServico.slice(0, 1000));

  const valores = infDPS.ele('valores');
  const vServPrest = valores.ele('vServPrest');
  vServPrest.ele('vServ').txt(valorServico.toFixed(2));

  const trib = valores.ele('trib');
  const tribMun = trib.ele('tribMun');
  tribMun.ele('tribISSQN').txt('1'); // 1 = Operação tributável
  tribMun.ele('tpRetISSQN').txt('1'); // 1 = Não retido
  tribMun.ele('pAliq').txt(aliquotaIss.toFixed(2));

  return { idDPS, xml: doc.up().end() };
}

module.exports = { buildDpsXml };
