const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { buildDpsXml } = require('./dpsXmlBuilder');
const { loadPfx, assinarDPS } = require('./signer');
const { callNfseRest, gzipBase64, ungzipBase64 } = require('./restClient');
const { consultarAliquotaServico } = require('./parametrosMunicipais');
const { decryptCertPassword } = require('./certCrypto');
const { generateNfsePdf } = require('./pdf');
const { resolveTomador, extractTag, titleCase, extractEnderecoFromNfseXml } = require('./emitir');

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;
const NFSE_XML_DIR = process.env.NFSE_XML_DIR || path.join(__dirname, '../../private_storage/nfse_xml');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Códigos de justificativa válidos para o evento e105102 (Cancelamento de NFS-e por
// Substituição), confirmados no XSD oficial (enum TSCodJustSubst).
const CODIGOS_SUBSTITUICAO = ['01', '02', '03', '04', '05', '99'];

// Substitui uma NFS-e já autorizada por uma nova, corrigida. Diferente do cancelamento
// simples (e101101, evento avulso), a substituição é uma NOVA EMISSÃO (mesma rota POST
// /nfse que emitir.js já usa) com um grupo <subst> na DPS referenciando a chave da nota
// antiga — o próprio Sistema Nacional NFS-e cancela a original e autoriza a substituta
// numa única chamada. Prazo oficial: parametrizado por município (não fixo/nacional),
// mas tipicamente bem mais longo que o do cancelamento simples.
async function substituirNfse(invoiceId, { descricaoServico, valorServico, cMotivo, xMotivo }) {
  const codigo = String(cMotivo || '99').padStart(2, '0');
  if (!CODIGOS_SUBSTITUICAO.includes(codigo)) {
    throw new Error('Motivo de substituição inválido.');
  }

  const [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) throw new Error('NFS-e não encontrada.');
  if (invoice.status !== 'authorized') throw new Error('Só é possível substituir uma NFS-e autorizada.');
  if (!invoice.chave_acesso) throw new Error('NFS-e sem chave de acesso — não é possível substituir.');

  const [[emitter]] = await db.query('SELECT * FROM users WHERE id = ?', [invoice.user_id]);
  if (!emitter) throw new Error('Profissional emissor não encontrado.');
  if (!emitter.nfse_cert_path || !emitter.nfse_cert_password_enc) {
    throw new Error('Certificado digital A1 não configurado (Configurações > Dados Fiscais).');
  }
  if (!emitter.nfse_codigo_municipio) {
    throw new Error('Código do município (IBGE) não configurado (Configurações > Dados Fiscais).');
  }

  const [[transaction]] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [invoice.financial_transaction_id]);
  if (!transaction) throw new Error('Lançamento financeiro não encontrado.');

  const certPassword = decryptCertPassword(emitter.nfse_cert_password_enc);
  const environment = emitter.nfse_environment === 'producao' ? 'producao' : 'homologacao';

  const parametros = await consultarAliquotaServico(
    environment, emitter.nfse_codigo_municipio, invoice.codigo_tributacao_nacional,
    emitter.nfse_cert_path, certPassword, NFSE_TIMEOUT_MS,
  );
  const aliquotaIss = parametros.aliquota ?? 5; // fallback conservador (teto legal do ISS) se o município não parametrizar

  const tomador = await resolveTomador(transaction);

  // A nota substituta é uma emissão nova de verdade — usa o próximo número da sequência
  // do emissor, igual a qualquer NFS-e nova (o servidor rejeita número já utilizado).
  const novoNumero = emitter.nfse_next_number;

  // Para emissores optantes do Simples Nacional (ME/EPP), o próprio servidor rejeita a
  // substituição se a competência (dCompet) mudar em relação à nota original — reusamos
  // a data de autorização da nota antiga (mesmo dia em que o dCompet original foi gerado)
  // em vez de "hoje", que é o padrão de buildDpsXml para uma emissão nova.
  const dCompetOriginal = invoice.authorized_at || invoice.created_at;
  const pad2 = (n) => String(n).padStart(2, '0');
  const dOrig = new Date(dCompetOriginal);
  const dCompetOverride = `${dOrig.getFullYear()}-${pad2(dOrig.getMonth() + 1)}-${pad2(dOrig.getDate())}`;

  const { idDPS, xml } = buildDpsXml({
    emitter,
    serie: invoice.serie,
    numero: novoNumero,
    aliquotaIss,
    codigoTributacaoNacional: invoice.codigo_tributacao_nacional,
    descricaoServico,
    valorServico: Number(valorServico),
    tomador,
    subst: { chSubstda: invoice.chave_acesso, cMotivo: codigo, xMotivo },
    dCompetOverride,
  });

  const cert = loadPfx(emitter.nfse_cert_path, certPassword);

  // Mesma validação de titularidade do certificado que emitir.js já faz (erro E0718
  // do governo quando a assinatura não é do próprio emitente da DPS).
  const emitterCnpjDigits = (emitter.cnpj || '').replace(/\D/g, '');
  const emitterCpfDigits = (emitter.cpf || '').replace(/\D/g, '');
  const isEmitterCnpj = emitterCnpjDigits.length === 14;
  if (isEmitterCnpj && cert.titularCnpj && cert.titularCnpj !== emitterCnpjDigits) {
    throw new Error('O certificado digital enviado não corresponde ao CNPJ cadastrado como emitente. Para emitir em nome do CNPJ, é necessário um certificado e-CNPJ da empresa (o e-CPF pessoal não é aceito pelo Sistema Nacional NFS-e para assinar em nome do CNPJ).');
  }
  if (isEmitterCnpj && !cert.titularCnpj && cert.titularCpf) {
    throw new Error('O certificado enviado é um e-CPF (pessoa física), mas o emitente está cadastrado com CNPJ. É necessário um certificado e-CNPJ da empresa para emitir NFS-e em nome do CNPJ.');
  }
  if (!isEmitterCnpj && cert.titularCpf && cert.titularCpf !== emitterCpfDigits) {
    throw new Error('O certificado digital enviado não corresponde ao CPF cadastrado como emitente.');
  }

  const signedXml = assinarDPS(xml, idDPS, cert);

  const result = await callNfseRest({
    environment,
    method: 'POST',
    path: '/nfse',
    body: { dpsXmlGZipB64: gzipBase64(signedXml) },
    pfxPath: emitter.nfse_cert_path,
    pfxPassword: certPassword,
    timeoutMs: NFSE_TIMEOUT_MS,
  });

  if (!result.ok) {
    // Igual à emissão normal: a nota ORIGINAL não é tocada se a substituição falhar —
    // ela continua autorizada e válida, nada se perde.
    const data = result.data || {};
    const erros = Array.isArray(data.erros) ? data.erros : [];
    const primeiro = erros[0];
    const descricao = primeiro?.Descricao ?? primeiro?.descricao;
    const complemento = primeiro?.Complemento ?? primeiro?.complemento;
    console.error(`[NFS-e] Falha ao substituir (chave original ${invoice.chave_acesso}): status=${result.statusCode} raw=${result.raw}`);
    const mensagem = descricao
      ? [descricao, complemento].filter(Boolean).join(' — ')
      : (result.error || result.raw || 'Falha na comunicação com o Sistema Nacional NFS-e');
    throw new Error(mensagem);
  }

  const responseData = result.data || {};
  const chaveAcesso = responseData.chaveAcesso ?? null;
  const nfseXml = responseData.nfseXmlGZipB64 ? ungzipBase64(responseData.nfseXmlGZipB64) : result.raw;

  const monthDir = `${transaction.date ? new Date(transaction.date).getFullYear() : new Date().getFullYear()}${String((transaction.date ? new Date(transaction.date).getMonth() : new Date().getMonth()) + 1).padStart(2, '0')}`;
  const dir = path.join(NFSE_XML_DIR, String(invoice.tenant_id), monthDir);
  ensureDir(dir);

  const dpsPath = path.join(dir, `${idDPS}-dps.xml`);
  fs.writeFileSync(dpsPath, signedXml, 'utf-8');
  const nfsePath = path.join(dir, `${idDPS}-nfse.xml`);
  fs.writeFileSync(nfsePath, nfseXml, 'utf-8');

  let logoBuffer = null;
  if (emitter.clinic_logo_url) {
    try {
      const logoPath = path.join(__dirname, '../../public', emitter.clinic_logo_url.replace('/uploads-static/', 'uploads/'));
      if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath);
    } catch { /* segue sem logo */ }
  }

  const xTribNac = extractTag(nfseXml, 'xTribNac');
  const codigoVerificacao = extractTag(nfseXml, 'nDFSe');
  const emitterEnderecoNfse = extractEnderecoFromNfseXml(nfseXml);

  const pdfBuffer = await generateNfsePdf({
    logoBuffer,
    emitterName: emitter.nfse_razao_social || emitter.company_name || emitter.name,
    emitterDisplayName: emitter.company_name || emitter.nfse_razao_social || emitter.name,
    emitterDocument: emitter.cnpj || emitter.cpf || '',
    emitterIM: emitter.nfse_inscricao_municipal || null,
    emitterRegime: emitter.nfse_regime_tributario === 'simples_nacional' ? 'Simples Nacional (ME/EPP)' : 'Não optante do Simples Nacional',
    emitterAddress: emitterEnderecoNfse ? titleCase(emitterEnderecoNfse) : (emitter.address || ''),
    emitterEmail: emitter.email || null,
    emitterPhone: emitter.whatsapp || emitter.phone || null,
    tomadorNome: tomador?.nome,
    tomadorDocumento: tomador?.cpf || tomador?.cnpj,
    numero: novoNumero,
    serie: invoice.serie,
    environment,
    chaveAcesso,
    authorizedAt: new Date(),
    codigoVerificacao,
    codigoTributacao: invoice.codigo_tributacao_nacional,
    descricaoTributacao: xTribNac ? xTribNac.replace(/\.$/, '') : null,
    descricaoServico,
    valorServico: Number(valorServico),
    aliquotaIss: emitter.nfse_regime_tributario === 'simples_nacional' ? null : aliquotaIss,
    valorIss: null,
  });
  const pdfPath = path.join(dir, `${idDPS}-nfse.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  // A tabela nfse_invoices tem UNIQUE KEY em financial_transaction_id (um lançamento =
  // uma nota "corrente"): a substituição atualiza a MESMA linha para representar a nova
  // NFS-e autorizada, guardando a chave antiga para histórico/auditoria.
  await db.query(
    `UPDATE nfse_invoices
       SET numero = ?, valor_servico = ?, descricao_servico = ?,
           chave_acesso = ?, authorized_at = UTC_TIMESTAMP(),
           dps_xml_path = ?, nfse_xml_path = ?, nfse_pdf_path = ?,
           substituted_chave_acesso = ?, substitution_reason = ?,
           status = 'authorized', rejection_code = NULL, rejection_reason = NULL
     WHERE id = ?`,
    [
      novoNumero, valorServico, descricaoServico, chaveAcesso,
      dpsPath, nfsePath, pdfPath,
      invoice.chave_acesso, xMotivo || null,
      invoiceId,
    ]
  );
  await db.query('UPDATE users SET nfse_next_number = nfse_next_number + 1 WHERE id = ?', [emitter.id]);

  return true;
}

module.exports = { substituirNfse };
