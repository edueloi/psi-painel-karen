const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/asaasCrypto');

// Sandbox por padrão — troque ASAAS_ENV=production no .env quando for pra valer.
const ASAAS_BASE = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureAsaasColumns() {
  const stmts = [
    "ALTER TABLE users ADD COLUMN asaas_account_id VARCHAR(64) NULL",
    "ALTER TABLE users ADD COLUMN asaas_api_key TEXT NULL",
    "ALTER TABLE users ADD COLUMN asaas_wallet_id VARCHAR(64) NULL",
    "ALTER TABLE users ADD COLUMN asaas_enabled TINYINT(1) DEFAULT 0",
    "ALTER TABLE users ADD COLUMN asaas_customer_id VARCHAR(64) NULL",
    "ALTER TABLE comanda_payments ADD COLUMN asaas_payment_id VARCHAR(64) NULL",
    "ALTER TABLE comanda_payments ADD COLUMN asaas_status VARCHAR(50) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN asaas_payment_id VARCHAR(64) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN asaas_status VARCHAR(50) NULL",
    // Cliente Asaas (o paciente) criado sob a subconta do profissional — cacheado
    // pra nao recriar toda hora que a mesma pessoa e cobrada de novo.
    "ALTER TABLE patients ADD COLUMN asaas_customer_id VARCHAR(64) NULL",
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { /* coluna já existe */ }
  }
}
ensureAsaasColumns();

function getPlatformApiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY não configurada no ambiente do backend.');
  return key;
}

async function asaasRequest(apiKey, method, path, body) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || 'Erro na API do Asaas';
    const err = new Error(msg);
    err.asaasResponse = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

async function getUserAsaasKey(userId) {
  const [rows] = await db.query(
    'SELECT asaas_api_key, asaas_enabled FROM users WHERE id = ?',
    [userId]
  );
  if (!rows.length || !rows[0].asaas_enabled || !rows[0].asaas_api_key) return null;
  try { return decrypt(rows[0].asaas_api_key); } catch { return null; }
}

// ── GET /asaas/status — subconta ativa? saldo? ───────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT asaas_enabled, asaas_account_id, asaas_wallet_id, asaas_api_key FROM users WHERE id = ?',
      [req.user.id]
    );
    const row = rows[0];
    if (!row || !row.asaas_enabled || !row.asaas_api_key) {
      return res.json({ enabled: false });
    }
    const apiKey = decrypt(row.asaas_api_key);
    let balance = null;
    try {
      const bal = await asaasRequest(apiKey, 'GET', '/finance/balance');
      balance = bal?.balance ?? null;
    } catch (e) {
      console.warn('[Asaas] Falha ao buscar saldo:', e.message);
    }
    res.json({ enabled: true, accountId: row.asaas_account_id, walletId: row.asaas_wallet_id, balance });
  } catch (err) {
    console.error('[Asaas] Erro ao buscar status:', err);
    res.status(500).json({ error: 'Erro ao buscar status da conta Asaas' });
  }
});

// ── POST /asaas/account — cria a subconta do profissional ────────────────────
// IMPORTANTE: a Asaas so retorna a apiKey da subconta UMA VEZ, na criacao —
// por isso ja criptografamos e salvamos imediatamente na resposta.
router.post('/account', authMiddleware, async (req, res) => {
  try {
    const { name, cpfCnpj, email, mobilePhone, address, addressNumber, province, postalCode, birthDate, companyType } = req.body;
    if (!name || !cpfCnpj || !email) {
      return res.status(400).json({ error: 'Nome, CPF/CNPJ e e-mail são obrigatórios' });
    }

    const platformKey = getPlatformApiKey();
    const payload = {
      name,
      email,
      cpfCnpj: String(cpfCnpj).replace(/\D/g, ''),
      mobilePhone: mobilePhone ? String(mobilePhone).replace(/\D/g, '') : undefined,
      address: address || undefined,
      addressNumber: addressNumber || undefined,
      province: province || undefined,
      postalCode: postalCode ? String(postalCode).replace(/\D/g, '') : undefined,
      birthDate: birthDate || undefined,
      companyType: companyType || undefined,
    };

    const account = await asaasRequest(platformKey, 'POST', '/accounts', payload);
    // Nomes de campo conforme documentacao publica da Asaas — confirmar contra
    // uma chamada real em sandbox antes de liberar em producao.
    const subAccountApiKey = account?.apiKey;
    const walletId = account?.walletId;
    const accountId = account?.id;

    if (!subAccountApiKey) {
      return res.status(502).json({ error: 'Asaas não retornou a chave da subconta. Verifique manualmente no painel.' });
    }

    await db.query(
      `UPDATE users SET asaas_account_id = ?, asaas_api_key = ?, asaas_wallet_id = ?, asaas_enabled = 1 WHERE id = ?`,
      [accountId || null, encrypt(subAccountApiKey), walletId || null, req.user.id]
    );

    res.status(201).json({ ok: true, accountId, walletId });
  } catch (err) {
    console.error('[Asaas] Erro ao criar subconta:', err.asaasResponse || err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erro ao criar subconta Asaas' });
  }
});

// ── POST /asaas/disable — desativa a integracao (mantem a subconta na Asaas) ─
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE users SET asaas_enabled = 0 WHERE id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar Asaas' });
  }
});

// ── Helper: garante um customer Asaas para o paciente (cacheado) ─────────────
async function ensureAsaasCustomer(apiKey, patient) {
  if (patient.asaas_customer_id) return patient.asaas_customer_id;
  const customer = await asaasRequest(apiKey, 'POST', '/customers', {
    name: patient.name,
    cpfCnpj: patient.cpf ? String(patient.cpf).replace(/\D/g, '') : undefined,
    email: patient.email || undefined,
    mobilePhone: patient.phone ? String(patient.phone).replace(/\D/g, '') : undefined,
  });
  await db.query('UPDATE patients SET asaas_customer_id = ? WHERE id = ?', [customer.id, patient.id]);
  return customer.id;
}

// ── POST /asaas/charge — profissional gera cobranca pro paciente ────────────
router.post('/charge', authMiddleware, async (req, res) => {
  try {
    const apiKey = await getUserAsaasKey(req.user.id);
    if (!apiKey) return res.status(400).json({ error: 'Asaas não configurado. Vá em Configurações → Integrações.' });

    const { amount, patient_id, comanda_id, appointment_id, billing_type, due_date } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor inválido' });
    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    const [[patient]] = await db.query(
      'SELECT id, name, cpf, email, phone, asaas_customer_id FROM patients WHERE id = ? AND tenant_id = ?',
      [patient_id, req.user.tenant_id]
    );
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const customerId = await ensureAsaasCustomer(apiKey, patient);

    const externalReference = JSON.stringify({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      comanda_id: comanda_id || null,
      appointment_id: appointment_id || null,
      patient_name: patient.name,
    });

    const payment = await asaasRequest(apiKey, 'POST', '/payments', {
      customer: customerId,
      billingType: billing_type || 'PIX', // PIX | BOLETO | CREDIT_CARD
      value: Number(amount),
      dueDate: due_date || new Date().toISOString().slice(0, 10),
      description: `Consulta — ${patient.name}`,
      externalReference,
    });

    let pix = null;
    if ((billing_type || 'PIX') === 'PIX') {
      try {
        const pixData = await asaasRequest(apiKey, 'GET', `/payments/${payment.id}/pixQrCode`);
        pix = { qrCodeImage: pixData?.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : null, copyPaste: pixData?.payload || null };
      } catch (e) {
        console.warn('[Asaas] Falha ao gerar QR Pix:', e.message);
      }
    }

    res.status(201).json({
      payment_id: payment.id,
      status: payment.status,
      invoice_url: payment.invoiceUrl,
      pix_qr_code_base64: pix?.qrCodeImage || null,
      pix_copy_paste: pix?.copyPaste || null,
      amount,
    });
  } catch (err) {
    console.error('[Asaas] Erro ao criar cobrança:', err.asaasResponse || err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erro ao criar cobrança' });
  }
});

// ── GET /asaas/charge/:paymentId — consulta status (polling) ────────────────
router.get('/charge/:paymentId', authMiddleware, async (req, res) => {
  try {
    const apiKey = await getUserAsaasKey(req.user.id);
    if (!apiKey) return res.status(400).json({ error: 'Asaas não configurado' });
    const payment = await asaasRequest(apiKey, 'GET', `/payments/${req.params.paymentId}`);
    res.json({ payment_id: payment.id, status: payment.status, amount: payment.value });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Erro ao consultar pagamento' });
  }
});

// ── POST /asaas/webhook — notificacao automatica do Asaas ───────────────────
// Rota publica — chamada pelo Asaas. Mesma logica do webhook do Mercado Pago
// (backend/routes/mercadopago.js) para manter os dois provedores consistentes.
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const { event, payment } = req.body || {};
    console.log('[Asaas Webhook] Evento:', event, payment?.id);

    if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) || !payment) {
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    // Idempotencia
    const [existing] = await db.query(
      'SELECT id FROM financial_transactions WHERE asaas_payment_id = ? LIMIT 1',
      [String(payment.id)]
    );
    if (existing.length > 0) {
      return res.status(200).json({ received: true, action: 'duplicate' });
    }

    let meta = {};
    try { meta = JSON.parse(payment.externalReference || '{}'); } catch {}

    const finalUserId = meta.user_id || null;
    const finalTenantId = meta.tenant_id || null;
    const comandaId = meta.comanda_id ? parseInt(meta.comanda_id) : null;
    const appointmentId = meta.appointment_id ? parseInt(meta.appointment_id) : null;
    const patientName = meta.patient_name || 'Paciente';
    const amountBRL = Number(payment.value) || 0;
    const paymentMethod = (payment.billingType || 'PIX').toLowerCase() === 'pix' ? 'pix'
      : payment.billingType === 'CREDIT_CARD' ? 'credito' : 'boleto';
    const paidDate = new Date().toISOString().slice(0, 10);

    if (!finalTenantId || amountBRL <= 0) {
      return res.status(200).json({ received: true, action: 'skipped', reason: 'missing data' });
    }

    let description = `Pagamento via Asaas — ${patientName}`;
    if (comandaId) description += ` (Comanda #${comandaId})`;

    const [txResult] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, amount, date, description, payment_method, status, source,
         origin_module, origin_id, created_by, asaas_payment_id, asaas_status, payer_name, appointment_id)
       VALUES (?, 'income', ?, ?, ?, ?, 'paid', 'asaas', 'ASAAS', ?, ?, ?, 'paid', ?, ?)`,
      [finalTenantId, amountBRL, paidDate, description, paymentMethod,
       comandaId || null, finalUserId, String(payment.id), patientName, appointmentId || null]
    );

    if (comandaId) {
      try {
        await db.query(
          `INSERT INTO comanda_payments
            (tenant_id, comanda_id, amount, payment_date, payment_method, status, payer_id, asaas_payment_id, asaas_status)
           VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 'confirmed')`,
          [finalTenantId, comandaId, amountBRL, paidDate, paymentMethod, finalUserId, String(payment.id)]
        );
        await db.query(
          `UPDATE comandas SET paid_value = COALESCE(paid_value, 0) + ?,
            livrocaixa_tx_id = ?, livrocaixa_date = ?, sync_to_livrocaixa = 1
           WHERE id = ? AND tenant_id = ?`,
          [amountBRL, txResult.insertId, paidDate, comandaId, finalTenantId]
        );
      } catch (e) {
        console.warn('[Asaas Webhook] Erro ao atualizar comanda:', e.message);
      }
    }

    console.log(`[Asaas Webhook] ✅ R$ ${amountBRL} | TX #${txResult.insertId} | Comanda: ${comandaId} | Método: ${paymentMethod}`);

    try {
      const methodLabel = { pix: 'Pix', credito: 'cartão de crédito', boleto: 'boleto' }[paymentMethod] || paymentMethod;
      const amountFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountBRL);
      await db.query(
        `INSERT INTO system_alerts (tenant_id, title, message, type, link)
         VALUES (?, ?, ?, 'success', ?)`,
        [finalTenantId, 'Pagamento recebido 💰',
         `${patientName} pagou ${amountFmt} via ${methodLabel} (Asaas).`, '/financeiro']
      );
    } catch (notifyErr) {
      console.warn('[Asaas Webhook] Erro ao notificar:', notifyErr.message);
    }

    res.status(200).json({ received: true, action: 'processed', transaction_id: txResult.insertId });
  } catch (err) {
    console.error('[Asaas Webhook] Erro:', err);
    res.status(200).json({ received: true, action: 'error', message: err.message });
  }
});

module.exports = router;
