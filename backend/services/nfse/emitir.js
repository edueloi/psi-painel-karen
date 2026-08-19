const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { buildDpsXml } = require('./dpsXmlBuilder');
const { loadPfx, assinarDPS } = require('./signer');
const { callNfseRest, gzipBase64, ungzipBase64 } = require('./restClient');
const { consultarAliquotaServico } = require('./parametrosMunicipais');
const { decryptCertPassword } = require('./certCrypto');
const { generateNfsePdf } = require('./pdf');

// Extrai um valor simples de tag XML sem depender de parser completo (o XML de
// retorno do governo é bem estruturado e sem CDATA nesses campos).
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

// O XML de retorno do governo traz nome/endereço em CAIXA ALTA — deixamos em Title
// Case para o PDF ficar mais legível, preservando siglas curtas (LTDA, ME/EPP, UF...).
function titleCase(v) {
  if (!v) return v;
  return v.toLowerCase().replace(/\b([a-zà-ú])/gi, (c) => c.toUpperCase())
    .replace(/\b(Ltda|Me|Epp|Sp|Rj|Mg|Pr|Rs|Sc|Ba|Pe|Ce|Go|Df|Es)\b/gi, (m) => m.toUpperCase());
}

// Monta o endereço legível do prestador a partir do grupo <enderNac> do XML de
// retorno da NFS-e — mais confiável que o campo livre users.address, pois é
// exatamente o endereço que consta no certificado/CNC usado para emitir.
function extractEnderecoFromNfseXml(nfseXml) {
  const xLgr = extractTag(nfseXml, 'xLgr');
  if (!xLgr) return null;
  const nro = extractTag(nfseXml, 'nro');
  const xBairro = extractTag(nfseXml, 'xBairro');
  const uf = extractTag(nfseXml, 'UF');
  const cep = extractTag(nfseXml, 'CEP');
  const xLocEmi = extractTag(nfseXml, 'xLocEmi');
  const cepFmt = cep ? cep.replace(/(\d{5})(\d{3})/, '$1-$2') : null;
  return [
    [xLgr, nro].filter(Boolean).join(', '),
    xBairro,
    [xLocEmi, uf].filter(Boolean).join('/'),
    cepFmt ? `CEP ${cepFmt}` : null,
  ].filter(Boolean).join(' — ');
}

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;
const NFSE_XML_DIR = process.env.NFSE_XML_DIR || path.join(__dirname, '../../private_storage/nfse_xml');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Resolve nome/CPF de quem contratou o serviço a partir do lançamento financeiro,
// priorizando o pagador avulso (payer_name/payer_cpf) e caindo para o paciente
// vinculado quando ele mesmo é quem paga (patients.is_payer).
async function resolveTomador(transaction) {
  if (transaction.payer_name || transaction.payer_cpf) {
    return { nome: transaction.payer_name, cpf: transaction.payer_cpf };
  }
  if (transaction.beneficiary_name || transaction.beneficiary_cpf) {
    return { nome: transaction.beneficiary_name, cpf: transaction.beneficiary_cpf };
  }
  if (transaction.patient_id) {
    const [[patient]] = await db.query(
      'SELECT name, cpf, is_payer, payer_name, payer_cpf FROM patients WHERE id = ?',
      [transaction.patient_id]
    );
    if (patient) {
      if (!patient.is_payer && (patient.payer_name || patient.payer_cpf)) {
        return { nome: patient.payer_name, cpf: patient.payer_cpf };
      }
      return { nome: patient.name, cpf: patient.cpf };
    }
  }
  return null;
}

async function emitirNfse(invoiceId) {
  const [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) return;

  await db.query(
    "UPDATE nfse_invoices SET status = 'processing', attempts = attempts + 1, last_attempt_at = UTC_TIMESTAMP() WHERE id = ?",
    [invoiceId]
  );

  try {
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

    const { idDPS, xml } = buildDpsXml({
      emitter,
      serie: invoice.serie,
      numero: invoice.numero,
      aliquotaIss,
      codigoTributacaoNacional: invoice.codigo_tributacao_nacional,
      descricaoServico: invoice.descricao_servico,
      valorServico: Number(invoice.valor_servico),
      tomador,
    });

    const cert = loadPfx(emitter.nfse_cert_path, certPassword);

    // O Sistema Nacional NFS-e exige que a assinatura seja feita com o certificado do
    // próprio emitente da DPS (erro E0718 quando não bate) — validamos aqui para dar
    // uma mensagem clara em vez do erro genérico do governo.
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
      // Schema real (NFSePostResponseErro): { erros: [{ Codigo, Descricao, Complemento }] }
      // (a resposta real vem com maiúscula inicial, diferente do swagger documentado em minúsculo)
      const data = result.data || {};
      const erros = Array.isArray(data.erros) ? data.erros : [];
      const primeiro = erros[0];
      const codigo = primeiro?.Codigo ?? primeiro?.codigo;
      const descricao = primeiro?.Descricao ?? primeiro?.descricao;
      const complemento = primeiro?.Complemento ?? primeiro?.complemento;
      await db.query(
        `UPDATE nfse_invoices SET status = 'rejected', rejection_code = ?, rejection_reason = ? WHERE id = ?`,
        [
          codigo ? String(codigo) : String(result.statusCode),
          codigo ? [descricao, complemento].filter(Boolean).join(' — ') : (result.error || result.raw || 'Falha na comunicação com o Sistema Nacional NFS-e'),
          invoiceId,
        ]
      );
      return;
    }

    // Schema real (NFSePostResponseSucesso): { chaveAcesso, idDps, nfseXmlGZipB64, ... }
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

    const xTribNac = extractTag(nfseXml, 'xTribNac'); // descrição oficial do código de tributação, vinda do governo
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
      numero: invoice.numero,
      serie: invoice.serie,
      environment,
      chaveAcesso,
      authorizedAt: new Date(),
      codigoVerificacao,
      codigoTributacao: invoice.codigo_tributacao_nacional,
      descricaoTributacao: xTribNac ? xTribNac.replace(/\.$/, '') : null,
      descricaoServico: invoice.descricao_servico,
      valorServico: Number(invoice.valor_servico),
      // Alíquota só é exibida como percentual do ISS quando o regime não é Simples
      // Nacional — para opSimpNac=3, o mesmo número é só a estimativa usada em
      // pTotTribSN (não é a alíquota do ISS em si, que é apurada pelo SN).
      aliquotaIss: emitter.nfse_regime_tributario === 'simples_nacional' ? null : aliquotaIss,
      valorIss: null,
    });
    const pdfPath = path.join(dir, `${idDPS}-nfse.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    await db.query(
      `UPDATE nfse_invoices
         SET status = 'authorized', chave_acesso = ?, authorized_at = UTC_TIMESTAMP(),
             dps_xml_path = ?, nfse_xml_path = ?, nfse_pdf_path = ?, rejection_code = NULL, rejection_reason = NULL
       WHERE id = ?`,
      [chaveAcesso, dpsPath, nfsePath, pdfPath, invoiceId]
    );

    await db.query('UPDATE users SET nfse_next_number = nfse_next_number + 1 WHERE id = ?', [emitter.id]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.query(
      "UPDATE nfse_invoices SET status = 'error', rejection_reason = ? WHERE id = ?",
      [message, invoiceId]
    );
  }
}

module.exports = {
  emitirNfse,
  // Exportados também para reuso em substituir.js (mesmas regras de resolução de
  // tomador/PDF que a emissão normal já usa) — nenhuma mudança de comportamento aqui.
  resolveTomador, extractTag, titleCase, extractEnderecoFromNfseXml,
};
