const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { buildDpsXml } = require('./dpsXmlBuilder');
const { loadPfx, assinarDPS } = require('./signer');
const { callNfseRest, gzipBase64 } = require('./restClient');
const { consultarAliquotaServico } = require('./parametrosMunicipais');
const { decryptCertPassword } = require('./certCrypto');
const { generateNfsePdf } = require('./pdf');

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
    "UPDATE nfse_invoices SET status = 'processing', attempts = attempts + 1, last_attempt_at = NOW() WHERE id = ?",
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
      const data = result.data || {};
      const mensagens = Array.isArray(data.mensagens) ? data.mensagens : [];
      const primeira = mensagens[0];
      await db.query(
        `UPDATE nfse_invoices SET status = 'rejected', rejection_code = ?, rejection_reason = ? WHERE id = ?`,
        [
          primeira ? String(primeira.codigo ?? 'sem-codigo') : String(result.statusCode),
          primeira ? String(primeira.descricao ?? '') : (result.error || result.raw || 'Falha na comunicação com o Sistema Nacional NFS-e'),
          invoiceId,
        ]
      );
      return;
    }

    const responseData = result.data || {};
    const chaveAcesso = responseData.chaveAcesso ?? null;

    const monthDir = `${transaction.date ? new Date(transaction.date).getFullYear() : new Date().getFullYear()}${String((transaction.date ? new Date(transaction.date).getMonth() : new Date().getMonth()) + 1).padStart(2, '0')}`;
    const dir = path.join(NFSE_XML_DIR, String(invoice.tenant_id), monthDir);
    ensureDir(dir);

    const dpsPath = path.join(dir, `${idDPS}-dps.xml`);
    fs.writeFileSync(dpsPath, signedXml, 'utf-8');

    const nfsePath = path.join(dir, `${idDPS}-nfse.xml`);
    fs.writeFileSync(nfsePath, result.raw, 'utf-8');

    const pdfBuffer = await generateNfsePdf({
      emitterName: emitter.nfse_razao_social || emitter.company_name || emitter.name,
      emitterDocument: emitter.cnpj || emitter.cpf || '',
      emitterAddress: emitter.address || '',
      tomadorNome: tomador?.nome,
      tomadorDocumento: tomador?.cpf || tomador?.cnpj,
      numero: invoice.numero,
      serie: invoice.serie,
      environment,
      chaveAcesso,
      authorizedAt: new Date(),
      descricaoServico: invoice.descricao_servico,
      valorServico: Number(invoice.valor_servico),
      aliquotaIss,
    });
    const pdfPath = path.join(dir, `${idDPS}-nfse.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    await db.query(
      `UPDATE nfse_invoices
         SET status = 'authorized', chave_acesso = ?, authorized_at = NOW(),
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

module.exports = { emitirNfse };
