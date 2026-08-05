const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const archiver = require('archiver');
const db = require('../db');
const { authMiddleware, checkPermission } = require('../middleware/auth');
const { emitirNfse } = require('../services/nfse/emitir');
const { parsePfx } = require('../services/nfse/signer');
const { encryptCertPassword } = require('../services/nfse/certCrypto');
const { sendMail, templates } = require('../services/emailService');
const axios = require('axios');

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Diretório privado — NUNCA dentro de backend/public (que é servido via express.static).
const CERTS_DIR = process.env.NFSE_CERTS_DIR || path.join(__dirname, '../private_storage/nfse_certs');
const BOT_URL = 'http://127.0.0.1:3014/bot-api';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Bloqueia emissão/retry quando a clínica desativou a NFS-e em Configurações — a
// tela já esconde os botões, isso é a garantia de servidor caso a rota seja chamada
// diretamente (ex: request antiga em cache, chamada manual).
async function requireNfseEnabled(req, res, next) {
  try {
    const [[tenant]] = await db.query('SELECT nfse_enabled FROM tenants WHERE id = ?', [req.user.tenant_id]);
    if (!tenant?.nfse_enabled) {
      return res.status(403).json({ error: 'A emissão de NFS-e não está ativada para esta clínica (Configurações > Dados Fiscais).' });
    }
    next();
  } catch (err) {
    console.error('[NFS-e] Erro ao verificar toggle:', err);
    res.status(500).json({ error: 'Erro ao verificar configuração da clínica' });
  }
}

// ── GET /nfse/config — configuração fiscal do profissional logado ───────────
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT nfse_razao_social, nfse_inscricao_municipal, nfse_codigo_municipio,
              nfse_codigo_tributacao_nacional, nfse_regime_tributario, nfse_environment,
              nfse_serie, nfse_next_number, nfse_cert_path, nfse_cert_uploaded_at,
              cnpj, cpf, name, company_name
         FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const [[tenant]] = await db.query(
      'SELECT nfse_enabled, rs_receipt_enabled FROM tenants WHERE id = ?',
      [req.user.tenant_id]
    );

    res.json({
      razao_social: user.nfse_razao_social,
      cnpj_cpf: user.cnpj || user.cpf || null,
      inscricao_municipal: user.nfse_inscricao_municipal,
      codigo_municipio: user.nfse_codigo_municipio,
      codigo_tributacao_nacional: user.nfse_codigo_tributacao_nacional,
      regime_tributario: user.nfse_regime_tributario,
      environment: user.nfse_environment,
      serie: user.nfse_serie,
      next_number: user.nfse_next_number,
      certificate_configured: !!user.nfse_cert_path,
      certificate_uploaded_at: user.nfse_cert_uploaded_at,
      nfse_enabled: !!tenant?.nfse_enabled,
      rs_receipt_enabled: !!tenant?.rs_receipt_enabled,
    });
  } catch (err) {
    console.error('[NFS-e] Erro ao buscar config:', err);
    res.status(500).json({ error: 'Erro ao buscar configuração fiscal' });
  }
});

// ── POST /nfse/toggles — liga/desliga NFS-e e Recibo RS para a clínica ──────
router.post('/toggles', authMiddleware, checkPermission('manage_clinic_settings'), async (req, res) => {
  try {
    const { nfse_enabled, rs_receipt_enabled } = req.body;
    const updates = [];
    const values = [];
    if (nfse_enabled !== undefined) { updates.push('nfse_enabled = ?'); values.push(nfse_enabled ? 1 : 0); }
    if (rs_receipt_enabled !== undefined) { updates.push('rs_receipt_enabled = ?'); values.push(rs_receipt_enabled ? 1 : 0); }
    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' });

    values.push(req.user.tenant_id);
    await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values);

    const [[tenant]] = await db.query('SELECT nfse_enabled, rs_receipt_enabled FROM tenants WHERE id = ?', [req.user.tenant_id]);
    res.json({ nfse_enabled: !!tenant.nfse_enabled, rs_receipt_enabled: !!tenant.rs_receipt_enabled });
  } catch (err) {
    console.error('[NFS-e] Erro ao atualizar toggles:', err);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

// ── POST /nfse/config — salva dados fiscais (sem certificado) ───────────────
router.post('/config', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const {
      razao_social, inscricao_municipal, codigo_municipio,
      codigo_tributacao_nacional, regime_tributario, environment,
    } = req.body;

    // trim() em todos os campos de texto — espaços extras (comuns em copy-paste de
    // PDF/planilha) quebram a validação de schema do governo (ex: cTribNac com espaço
    // à direita é rejeitado com "Pattern constraint failed").
    const trimOrNull = (v) => (typeof v === 'string' && v.trim()) || null;

    await db.query(
      `UPDATE users SET
         nfse_razao_social = ?,
         nfse_inscricao_municipal = ?,
         nfse_codigo_municipio = ?,
         nfse_codigo_tributacao_nacional = ?,
         nfse_regime_tributario = ?,
         nfse_environment = ?
       WHERE id = ?`,
      [
        trimOrNull(razao_social),
        trimOrNull(inscricao_municipal),
        trimOrNull(codigo_municipio),
        trimOrNull(codigo_tributacao_nacional),
        regime_tributario || 'simples_nacional',
        environment === 'producao' ? 'producao' : 'homologacao',
        req.user.id,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[NFS-e] Erro ao salvar config:', err);
    res.status(500).json({ error: 'Erro ao salvar configuração fiscal' });
  }
});

// ── POST /nfse/config/certificate — upload do certificado A1 (.pfx/.p12) ────
router.post('/config/certificate', authMiddleware, checkPermission('manage_payments'), uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha do certificado é obrigatória' });

    // Valida o certificado antes de gravar qualquer coisa em disco/banco.
    let certInfo;
    try {
      certInfo = parsePfx(req.file.buffer.toString('binary'), password);
    } catch (e) {
      return res.status(422).json({ error: `Certificado inválido: ${e.message}` });
    }

    // Avisa já no upload se o certificado não bate com o CNPJ/CPF cadastrado do
    // profissional — evita descobrir isso só na hora de emitir (erro E0718 do governo).
    const [[user]] = await db.query('SELECT cnpj, cpf FROM users WHERE id = ?', [req.user.id]);
    const userCnpjDigits = (user?.cnpj || '').replace(/\D/g, '');
    const isUserCnpj = userCnpjDigits.length === 14;
    if (isUserCnpj && certInfo.titularCpf && !certInfo.titularCnpj) {
      return res.status(422).json({
        error: 'Este é um certificado e-CPF (pessoa física), mas seu cadastro usa CNPJ. Para emitir NFS-e em nome do CNPJ, é necessário um certificado e-CNPJ da empresa.',
      });
    }
    if (isUserCnpj && certInfo.titularCnpj && certInfo.titularCnpj !== userCnpjDigits) {
      return res.status(422).json({ error: 'O CNPJ do certificado não corresponde ao CNPJ cadastrado no seu perfil.' });
    }

    const userDir = path.join(CERTS_DIR, `user_${req.user.id}`);
    ensureDir(userDir);

    const [[current]] = await db.query('SELECT nfse_cert_path FROM users WHERE id = ?', [req.user.id]);
    if (current?.nfse_cert_path && fs.existsSync(current.nfse_cert_path)) {
      fs.unlinkSync(current.nfse_cert_path);
    }

    const certPath = path.join(userDir, `certificado_${Date.now()}.pfx`);
    fs.writeFileSync(certPath, req.file.buffer);

    await db.query(
      `UPDATE users SET nfse_cert_path = ?, nfse_cert_password_enc = ?, nfse_cert_uploaded_at = UTC_TIMESTAMP() WHERE id = ?`,
      [certPath, encryptCertPassword(password), req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[NFS-e] Erro ao salvar certificado:', err);
    res.status(500).json({ error: 'Erro ao salvar certificado' });
  }
});

// ── POST /nfse/config/test — emite uma NFS-e de teste em homologação ────────
// Usa o próprio lançamento de teste (não grava financial_transactions real) para
// validar de ponta a ponta: certificado, município, alíquota e comunicação com o ADN.
router.post('/config/test', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT id, tenant_id, nfse_environment, nfse_serie, nfse_next_number, nfse_cert_path,
              nfse_codigo_municipio, nfse_codigo_tributacao_nacional
         FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.nfse_cert_path) return res.status(422).json({ error: 'Envie o certificado digital antes de testar.' });
    if (!user.nfse_codigo_municipio) return res.status(422).json({ error: 'Informe o código do município (IBGE) antes de testar.' });

    // Lançamento fictício apenas para ancorar a invoice de teste (obrigatório por FK).
    const [txResult] = await db.query(
      `INSERT INTO financial_transactions (tenant_id, type, amount, date, description, status, source, created_by)
       VALUES (?, 'income', 1.00, CURDATE(), 'Teste de emissão NFS-e (homologação)', 'paid', 'nfse_test', ?)`,
      [req.user.tenant_id, req.user.id]
    );

    const [invoiceResult] = await db.query(
      `INSERT INTO nfse_invoices
         (tenant_id, user_id, financial_transaction_id, status, environment, serie, numero,
          valor_servico, descricao_servico, codigo_tributacao_nacional)
       VALUES (?, ?, ?, 'pending', 'homologacao', ?, ?, 1.00, 'Teste de emissão NFS-e', ?)`,
      [req.user.tenant_id, req.user.id, txResult.insertId, user.nfse_serie, user.nfse_next_number,
       user.nfse_codigo_tributacao_nacional || '1401']
    );
    await db.query('UPDATE users SET nfse_next_number = nfse_next_number + 1 WHERE id = ?', [req.user.id]);

    await emitirNfse(invoiceResult.insertId);

    const [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoiceResult.insertId]);
    res.json({
      success: invoice.status === 'authorized',
      status: invoice.status,
      rejection_reason: invoice.rejection_reason,
      chave_acesso: invoice.chave_acesso,
    });
  } catch (err) {
    console.error('[NFS-e] Erro ao testar emissão:', err);
    res.status(500).json({ error: 'Erro ao testar emissão em homologação' });
  }
});

// ── POST /nfse/batch/retry — reenvia várias notas (erro/rejeitada) de uma vez ─
router.post('/batch/retry', authMiddleware, checkPermission('manage_payments'), requireNfseEnabled, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: 'Informe ao menos uma nota' });

    const [invoices] = await db.query(
      `SELECT id, status FROM nfse_invoices WHERE tenant_id = ? AND id IN (?)`,
      [tenantId, ids]
    );

    const retried = [];
    const skipped = [];
    for (const invoice of invoices) {
      if (invoice.status === 'authorized') { skipped.push(invoice.id); continue; }
      await db.query("UPDATE nfse_invoices SET status = 'pending' WHERE id = ?", [invoice.id]);
      emitirNfse(invoice.id).catch((e) => console.error('[NFS-e] Erro ao tentar novamente (lote):', e));
      retried.push(invoice.id);
    }

    res.json({ retried, skipped });
  } catch (err) {
    console.error('[NFS-e] Erro no retry em lote:', err);
    res.status(500).json({ error: 'Falha ao tentar emitir novamente em lote' });
  }
});

// ── POST /nfse/batch/xml.zip — baixa os XMLs de várias notas em um .zip ─────
router.post('/batch/xml.zip', authMiddleware, async (req, res) => {
  await downloadBatchZip(req, res, 'nfse_xml_path', 'xml');
});

// ── POST /nfse/batch/pdf.zip — baixa os PDFs de várias notas em um .zip ─────
router.post('/batch/pdf.zip', authMiddleware, async (req, res) => {
  await downloadBatchZip(req, res, 'nfse_pdf_path', 'pdf');
});

async function downloadBatchZip(req, res, column, ext) {
  try {
    const tenantId = req.user.tenant_id;
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: 'Informe ao menos uma nota' });

    const [invoices] = await db.query(
      `SELECT id, chave_acesso, numero, ${column} AS file_path FROM nfse_invoices WHERE tenant_id = ? AND id IN (?)`,
      [tenantId, ids]
    );
    const available = invoices.filter((inv) => inv.file_path && fs.existsSync(inv.file_path));
    if (!available.length) return res.status(404).json({ error: `Nenhum arquivo ${ext.toUpperCase()} disponível para as notas selecionadas` });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="nfse-${ext}-lote.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { console.error('[NFS-e] Erro ao gerar zip:', err); res.status(500).end(); });
    archive.pipe(res);
    for (const inv of available) {
      archive.file(inv.file_path, { name: `nfse-${inv.chave_acesso || inv.numero || inv.id}.${ext}` });
    }
    await archive.finalize();
  } catch (err) {
    console.error('[NFS-e] Erro no download em lote:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Falha ao gerar arquivo em lote' });
  }
}

// ── POST /nfse/:transactionId/emit — cria/reaproveita e dispara emissão ─────
router.post('/:transactionId/emit', authMiddleware, checkPermission('manage_payments'), requireNfseEnabled, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const transactionId = Number(req.params.transactionId);
    const { codigo_tributacao_nacional, descricao_servico, valor_servico } = req.body;

    const [[transaction]] = await db.query(
      'SELECT id, amount, description FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (!transaction) return res.status(404).json({ error: 'Lançamento financeiro não encontrado' });

    const valorServico = valor_servico ?? Number(transaction.amount);
    if (!valorServico || valorServico <= 0) {
      return res.status(422).json({ error: 'Informe um valor de serviço maior que zero para emitir a NFS-e' });
    }

    const codigoTributacao = codigo_tributacao_nacional;
    if (!codigoTributacao) {
      return res.status(422).json({ error: 'Informe o código de tributação nacional do serviço (subitem da lista LC 116/03)' });
    }

    let [[invoice]] = await db.query(
      'SELECT * FROM nfse_invoices WHERE financial_transaction_id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (invoice?.status === 'authorized') {
      return res.status(409).json({ error: 'NFS-e já autorizada para este lançamento' });
    }

    const [[user]] = await db.query('SELECT nfse_environment, nfse_serie, nfse_next_number FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const descricao = descricao_servico || transaction.description || 'Sessão de psicologia';

    if (!invoice) {
      const [result] = await db.query(
        `INSERT INTO nfse_invoices
           (tenant_id, user_id, financial_transaction_id, status, environment, serie, numero,
            valor_servico, descricao_servico, codigo_tributacao_nacional)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
        [tenantId, req.user.id, transactionId, user.nfse_environment, user.nfse_serie, user.nfse_next_number,
         valorServico, descricao, codigoTributacao]
      );
      await db.query('UPDATE users SET nfse_next_number = nfse_next_number + 1 WHERE id = ?', [req.user.id]);
      [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [result.insertId]);
    } else {
      await db.query(
        `UPDATE nfse_invoices SET status = 'pending', valor_servico = ?, descricao_servico = ?, codigo_tributacao_nacional = ? WHERE id = ?`,
        [valorServico, descricao, codigoTributacao, invoice.id]
      );
      [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoice.id]);
    }

    // Emite de forma assíncrona (fire-and-forget) — o operador acompanha o status via GET.
    emitirNfse(invoice.id).catch((error) => console.error('[NFS-e] Erro ao emitir:', error));

    res.json(invoice);
  } catch (err) {
    console.error('[NFS-e] Erro ao iniciar emissão:', err);
    res.status(500).json({ error: 'Não foi possível iniciar a emissão da NFS-e' });
  }
});

// ── POST /nfse/:transactionId/retry ──────────────────────────────────────────
router.post('/:transactionId/retry', authMiddleware, checkPermission('manage_payments'), requireNfseEnabled, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const transactionId = Number(req.params.transactionId);

    const [[invoice]] = await db.query(
      'SELECT * FROM nfse_invoices WHERE financial_transaction_id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (!invoice) return res.status(404).json({ error: 'NFS-e não encontrada' });
    if (invoice.status === 'authorized') return res.status(409).json({ error: 'NFS-e já autorizada' });

    await db.query("UPDATE nfse_invoices SET status = 'pending' WHERE id = ?", [invoice.id]);
    emitirNfse(invoice.id).catch((e) => console.error('[NFS-e] Erro ao tentar novamente:', e));

    res.json({ success: true });
  } catch (err) {
    console.error('[NFS-e] Erro ao tentar novamente:', err);
    res.status(500).json({ error: 'Falha ao tentar emitir novamente' });
  }
});

async function getAuthorizedInvoiceForDelivery(tenantId, transactionId) {
  const [[invoice]] = await db.query(
    `SELECT ni.*, p.name AS patient_name, p.email AS patient_email,
            COALESCE(p.whatsapp, p.phone) AS patient_whatsapp
       FROM nfse_invoices ni
       LEFT JOIN financial_transactions ft ON ft.id = ni.financial_transaction_id
       LEFT JOIN patients p ON p.id = ft.patient_id
      WHERE ni.financial_transaction_id = ? AND ni.tenant_id = ?`,
    [transactionId, tenantId]
  );
  return invoice;
}

function nfsePublicUrl(invoice) {
  return invoice?.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(invoice.chave_acesso)}` : null;
}

// Envia o PDF autorizado por e-mail. Só existe ação quando o paciente possui
// e-mail cadastrado; o servidor reforça essa regra para evitar envio indevido.
router.post('/:transactionId/send-email', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const invoice = await getAuthorizedInvoiceForDelivery(req.user.tenant_id, Number(req.params.transactionId));
    if (!invoice || invoice.status !== 'authorized' || !invoice.nfse_pdf_path || !fs.existsSync(invoice.nfse_pdf_path)) return res.status(404).json({ error: 'PDF da NFS-e autorizada não está disponível.' });
    if (!invoice.patient_email) return res.status(422).json({ error: 'Este paciente não possui e-mail cadastrado.' });

    const sent = await sendMail(
      invoice.patient_email,
      `Nota Fiscal de Serviço${invoice.numero ? ` nº ${invoice.numero}` : ''}`,
      templates.nfseDelivered({ patientName: invoice.patient_name, numero: invoice.numero, verificationUrl: nfsePublicUrl(invoice) }),
      { attachments: [{ filename: `nfse-${invoice.chave_acesso || invoice.numero}.pdf`, path: invoice.nfse_pdf_path, contentType: 'application/pdf' }] }
    );
    if (!sent) return res.status(502).json({ error: 'Não foi possível enviar o e-mail. Verifique a configuração de e-mail.' });
    res.json({ success: true, email: invoice.patient_email });
  } catch (err) { console.error('[NFS-e] Erro ao enviar por e-mail:', err); res.status(500).json({ error: 'Erro ao enviar nota por e-mail.' }); }
});

// Envia o PDF pelo WhatsApp; a mensagem também inclui o link oficial de consulta.
router.post('/:transactionId/send-whatsapp', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const invoice = await getAuthorizedInvoiceForDelivery(req.user.tenant_id, Number(req.params.transactionId));
    if (!invoice || invoice.status !== 'authorized' || !invoice.nfse_pdf_path || !fs.existsSync(invoice.nfse_pdf_path)) return res.status(404).json({ error: 'PDF da NFS-e autorizada não está disponível.' });
    if (!invoice.patient_whatsapp) return res.status(422).json({ error: 'Este paciente não possui WhatsApp cadastrado.' });
    const url = nfsePublicUrl(invoice);
    const message = `Olá, ${invoice.patient_name || ''}! Sua Nota Fiscal de Serviço${invoice.numero ? ` nº ${invoice.numero}` : ''} está disponível.${url ? `\n\nConsulte a nota oficial: ${url}` : ''}`.trim();
    const response = await axios.post(`${BOT_URL}/document/${req.user.tenant_id}`, {
      phone: invoice.patient_whatsapp,
      filePath: invoice.nfse_pdf_path,
      fileName: `nota-fiscal-${invoice.chave_acesso || invoice.numero}.pdf`,
      caption: message,
    }, { timeout: 30000 });
    if (response.data?.success === false) throw new Error(response.data?.error || 'Falha no WhatsApp');
    res.json({ success: true, whatsapp: invoice.patient_whatsapp });
  } catch (err) { console.error('[NFS-e] Erro ao enviar por WhatsApp:', err.message); res.status(502).json({ error: err.response?.data?.error || err.message || 'Erro ao enviar nota por WhatsApp.' }); }
});

// ── GET /nfse/:transactionId — status da NFS-e de um lançamento ─────────────
router.get('/:transactionId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const transactionId = Number(req.params.transactionId);
    const [[invoice]] = await db.query(
      'SELECT * FROM nfse_invoices WHERE financial_transaction_id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (!invoice) return res.status(404).json({ error: 'NFS-e não encontrada para este lançamento' });
    res.json(invoice);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar NFS-e' });
  }
});

// ── GET /nfse/:transactionId/xml — download do XML autorizado ───────────────
router.get('/:transactionId/xml', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const transactionId = Number(req.params.transactionId);
    const [[invoice]] = await db.query(
      'SELECT * FROM nfse_invoices WHERE financial_transaction_id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (!invoice?.nfse_xml_path || !fs.existsSync(invoice.nfse_xml_path)) {
      return res.status(404).json({ error: 'XML não disponível' });
    }
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="nfse-${invoice.chave_acesso || transactionId}.xml"`);
    fs.createReadStream(invoice.nfse_xml_path).pipe(res);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar XML da NFS-e' });
  }
});

// ── GET /nfse/:transactionId/pdf — download do PDF de representação da NFS-e ─
router.get('/:transactionId/pdf', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const transactionId = Number(req.params.transactionId);
    const [[invoice]] = await db.query(
      'SELECT * FROM nfse_invoices WHERE financial_transaction_id = ? AND tenant_id = ?',
      [transactionId, tenantId]
    );
    if (!invoice?.nfse_pdf_path || !fs.existsSync(invoice.nfse_pdf_path)) {
      return res.status(404).json({ error: 'PDF não disponível' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="nfse-${invoice.chave_acesso || transactionId}.pdf"`);
    fs.createReadStream(invoice.nfse_pdf_path).pipe(res);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar PDF da NFS-e' });
  }
});

// ── GET /nfse — lista paginada, com filtros por status e período (dia/mês/ano) ─
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 50));
    const { status, date_from, date_to } = req.query;

    const where = ['ni.tenant_id = ?'];
    const params = [tenantId];
    if (status) { where.push('ni.status = ?'); params.push(status); }
    if (date_from) { where.push('DATE(ni.created_at) >= ?'); params.push(date_from); }
    if (date_to) { where.push('DATE(ni.created_at) <= ?'); params.push(date_to); }
    const whereSql = where.join(' AND ');

    const [invoices] = await db.query(
      `SELECT ni.*, ft.description AS transaction_description, ft.date AS transaction_date,
              COALESCE(p.name, ft.beneficiary_name, ft.payer_name) AS patient_name,
              p.email AS patient_email, COALESCE(p.whatsapp, p.phone) AS patient_whatsapp
         FROM nfse_invoices ni
         LEFT JOIN financial_transactions ft ON ft.id = ni.financial_transaction_id
         LEFT JOIN patients p ON p.id = ft.patient_id
        WHERE ${whereSql}
        ORDER BY ni.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM nfse_invoices ni WHERE ${whereSql}`,
      params
    );

    res.json({ invoices, total, page, pageSize });
  } catch (err) {
    console.error('[NFS-e] Erro ao listar:', err);
    res.status(500).json({ error: 'Erro ao listar notas fiscais' });
  }
});

module.exports = router;
