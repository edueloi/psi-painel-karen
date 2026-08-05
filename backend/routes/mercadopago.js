const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const { sendMail } = require('../services/emailService');

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureMPColumns() {
  const stmts = [
    "ALTER TABLE users ADD COLUMN mercadopago_token TEXT NULL",
    "ALTER TABLE users ADD COLUMN mercadopago_enabled TINYINT(1) DEFAULT 0",
    "ALTER TABLE users ADD COLUMN mercadopago_interest_rate DECIMAL(5,2) DEFAULT 0",
    "ALTER TABLE financial_transactions ADD COLUMN mp_payment_id VARCHAR(255) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN mp_status VARCHAR(50) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN mp_payment_url TEXT NULL",
    "ALTER TABLE comanda_payments ADD COLUMN mp_payment_id VARCHAR(255) NULL",
    "ALTER TABLE comanda_payments ADD COLUMN mp_status VARCHAR(50) NULL",
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { /* coluna já existe */ }
  }
}
ensureMPColumns();

// Monta o filtro de métodos de pagamento excluídos para a preference do MP,
// a partir das flags configuradas em tenants.portal_settings
function buildExcludedPaymentTypes(portalSettings) {
  const excluded = [];
  if (portalSettings?.payment_pix_enabled === false) excluded.push({ id: 'bank_transfer' });
  if (portalSettings?.payment_credit_enabled === false) excluded.push({ id: 'credit_card' });
  if (portalSettings?.payment_debit_enabled === false) excluded.push({ id: 'debit_card' });
  return excluded;
}

// ── Cripto ────────────────────────────────────────────────────────────────────
function encrypt(text) {
  const key = Buffer.from(process.env.MP_ENCRYPTION_KEY || process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(enc) {
  const key = Buffer.from(process.env.MP_ENCRYPTION_KEY || process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const [ivHex, encHex] = enc.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

async function getUserToken(userId) {
  const [rows] = await db.query('SELECT mercadopago_token, mercadopago_enabled FROM users WHERE id = ?', [userId]);
  if (!rows.length || !rows[0].mercadopago_enabled || !rows[0].mercadopago_token) return null;
  try { return decrypt(rows[0].mercadopago_token); } catch { return null; }
}

// ── GET /mercadopago/config ───────────────────────────────────────────────────
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT mercadopago_enabled, mercadopago_token, mercadopago_interest_rate FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.json({ configured: false, enabled: false, interest_rate: 0 });
    res.json({
      configured: !!rows[0].mercadopago_token,
      enabled: !!rows[0].mercadopago_enabled,
      interest_rate: Number(rows[0].mercadopago_interest_rate) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// ── POST /mercadopago/config — Salva o Access Token ──────────────────────────
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { token, enabled, interest_rate } = req.body;
    const updates = [];
    const values = [];

    if (token !== undefined) {
      if (token === '') {
        updates.push('mercadopago_token = NULL', 'mercadopago_enabled = 0');
      } else {
        updates.push('mercadopago_token = ?', 'mercadopago_enabled = 1');
        values.push(encrypt(token.trim()));
      }
    }
    if (enabled !== undefined && token === undefined) {
      updates.push('mercadopago_enabled = ?');
      values.push(enabled ? 1 : 0);
    }
    if (interest_rate !== undefined) {
      const rate = Math.max(0, Math.min(100, Number(interest_rate) || 0));
      updates.push('mercadopago_interest_rate = ?');
      values.push(rate);
    }
    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' });

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error('[MP] Erro ao salvar config:', err);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// ── POST /mercadopago/config/test — Valida o token ───────────────────────────
router.post('/config/test', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });

    const r = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { 'Authorization': `Bearer ${token.trim()}` },
    });
    if (r.status === 401) return res.status(401).json({ valid: false, error: 'Token inválido' });
    res.json({ valid: true, message: 'Token válido!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao testar token' });
  }
});

// ── POST /mercadopago/charge — Cria cobrança PIX ou link ─────────────────────
router.post('/charge', authMiddleware, async (req, res) => {
  try {
    const token = await getUserToken(req.user.id);
    if (!token) return res.status(400).json({ error: 'Mercado Pago não configurado. Vá em Configurações → Integrações.' });

    const { amount, patient_name, patient_email, patient_cpf, comanda_id, appointment_id, installments, payment_type } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor inválido' });

    const baseUrl = process.env.APP_BASE_URL || 'https://painel.psiflux.com.br';
    const external_reference = JSON.stringify({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      comanda_id: comanda_id || null,
      appointment_id: appointment_id || null,
      patient_name: patient_name || 'Paciente',
    });

    // Preference para link de pagamento (suporta PIX + cartão)
    const prefPayload = {
      items: [{
        title: `Consulta psicológica — ${patient_name || 'Paciente'}`,
        quantity: 1,
        unit_price: Number(amount),
        currency_id: 'BRL',
      }],
      payer: patient_email ? { email: patient_email } : { email: 'pagamento@psiflux.com.br' },
      external_reference,
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${baseUrl}/portal`,
        failure: `${baseUrl}/portal`,
        pending: `${baseUrl}/portal`,
      },
      auto_return: 'approved',
      payment_methods: {
        installments: installments || 1,
      },
    };

    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(prefPayload),
    });
    const prefData = await prefRes.json();

    if (!prefRes.ok) {
      console.error('[MP] Erro ao criar preferência:', prefData);
      return res.status(prefRes.status).json({ error: prefData.message || 'Erro ao criar cobrança' });
    }

    // Gera PIX separadamente
    let pixData = null;
    try {
      const pixPayload = {
        transaction_amount: Number(amount),
        description: `Consulta — ${patient_name || 'Paciente'}`,
        payment_method_id: 'pix',
        payer: { email: patient_email || 'pagamento@psiflux.com.br' },
        external_reference,
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
      };
      const pixRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-${req.user.id}-${Date.now()}`,
        },
        body: JSON.stringify(pixPayload),
      });
      const pd = await pixRes.json();
      if (pixRes.ok && pd.point_of_interaction?.transaction_data) {
        pixData = {
          payment_id: pd.id,
          qr_code: pd.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: pd.point_of_interaction.transaction_data.qr_code_base64,
        };
      }
    } catch (e) {
      console.warn('[MP] PIX não gerado:', e.message);
    }

    res.json({
      preference_id: prefData.id,
      payment_url: prefData.init_point,
      pix_qr_code: pixData?.qr_code || null,
      pix_qr_code_base64: pixData ? `data:image/png;base64,${pixData.qr_code_base64}` : null,
      pix_payment_id: pixData?.payment_id || null,
      status: 'pending',
      amount,
    });
  } catch (err) {
    console.error('[MP] Erro ao criar cobrança:', err);
    res.status(500).json({ error: 'Erro interno ao criar cobrança' });
  }
});

// ── GET /mercadopago/charge/:id — Consulta status ────────────────────────────
router.get('/charge/:paymentId', authMiddleware, async (req, res) => {
  try {
    const token = await getUserToken(req.user.id);
    if (!token) return res.status(400).json({ error: 'Mercado Pago não configurado' });

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${req.params.paymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: 'Erro ao consultar pagamento' });

    res.json({ payment_id: data.id, status: data.status, amount: data.transaction_amount });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar pagamento' });
  }
});

// ── POST /mercadopago/webhook — Notificação automática do MP ─────────────────
// Rota pública — chamada pelo Mercado Pago
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const { type, data, action } = req.body;
    console.log('[MP Webhook] Evento:', type, action, JSON.stringify(data));

    // Só processa notificações de pagamento aprovado
    if (type !== 'payment' && action !== 'payment.updated') {
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true, action: 'no_id' });

    // Busca detalhes do pagamento — precisa do token do psicólogo
    // Identifica pelo external_reference salvo no pagamento
    // Primeiro busca sem auth para pegar o external_reference
    // MP exige token para buscar — vamos buscar da forma indireta via external_reference no banco

    // Verifica idempotência
    const [existing] = await db.query(
      'SELECT id FROM financial_transactions WHERE mp_payment_id = ? LIMIT 1',
      [String(paymentId)]
    );
    if (existing.length > 0) {
      return res.status(200).json({ received: true, action: 'duplicate' });
    }

    // Busca token de algum usuário que tenha MP configurado para consultar o pagamento
    // O external_reference contém user_id — buscamos o token desse user
    // Tentamos via query string que o MP envia
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;

    // Estratégia: tenta buscar com token do user_id se vier na query, senão tenta todos configurados
    let paymentData = null;
    let resolvedUserId = userId;
    let resolvedTenantId = null;

    // Busca todos users com MP configurado
    const [mpUsers] = await db.query(
      'SELECT id, tenant_id, mercadopago_token FROM users WHERE mercadopago_enabled = 1 AND mercadopago_token IS NOT NULL'
    );

    for (const u of mpUsers) {
      try {
        const tk = decrypt(u.mercadopago_token);
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${tk}` },
        });
        if (r.ok) {
          paymentData = await r.json();
          resolvedUserId = u.id;
          resolvedTenantId = u.tenant_id;
          break;
        }
      } catch { /* tenta próximo */ }
    }

    if (!paymentData) {
      console.warn('[MP Webhook] Não encontrou token para buscar pagamento', paymentId);
      return res.status(200).json({ received: true, action: 'token_not_found' });
    }

    // Só processa aprovados
    if (paymentData.status !== 'approved') {
      return res.status(200).json({ received: true, action: 'not_approved', status: paymentData.status });
    }

    // Extrai metadados do external_reference
    let meta = {};
    try { meta = JSON.parse(paymentData.external_reference || '{}'); } catch {}

    const finalUserId = meta.user_id || resolvedUserId;
    const finalTenantId = meta.tenant_id || resolvedTenantId;
    const comandaId = meta.comanda_id ? parseInt(meta.comanda_id) : null;
    const appointmentId = meta.appointment_id ? parseInt(meta.appointment_id) : null;
    const patientName = meta.patient_name || 'Paciente';
    const amountBRL = paymentData.transaction_amount || 0;
    const paymentMethod = paymentData.payment_method_id === 'pix' ? 'pix'
      : paymentData.payment_type_id === 'debit_card' ? 'debito' : 'credito';
    const paidDate = (paymentData.date_approved || new Date().toISOString()).substring(0, 10);

    if (!finalTenantId || amountBRL <= 0) {
      return res.status(200).json({ received: true, action: 'skipped', reason: 'missing data' });
    }

    let description = `Pagamento via Mercado Pago — ${patientName}`;
    if (comandaId) description += ` (Comanda #${comandaId})`;

    // ── Lança no Livro Caixa ──────────────────────────────────────────────────
    const [txResult] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, amount, date, description, payment_method, status, source,
         origin_module, origin_id, created_by, mp_payment_id, mp_status, payer_name, appointment_id)
       VALUES (?, 'income', ?, ?, ?, ?, 'paid', 'mercadopago', 'MERCADOPAGO', ?, ?, ?, 'paid', ?, ?)`,
      [finalTenantId, amountBRL, paidDate, description, paymentMethod,
       comandaId || null, finalUserId, String(paymentId), patientName, appointmentId || null]
    );

    // ── Atualiza comanda ──────────────────────────────────────────────────────
    if (comandaId) {
      try {
        await db.query(
          `INSERT INTO comanda_payments
            (tenant_id, comanda_id, amount, payment_date, payment_method, status, payer_id, mp_payment_id, mp_status)
           VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 'approved')`,
          [finalTenantId, comandaId, amountBRL, paidDate, paymentMethod, finalUserId, String(paymentId)]
        );
        await db.query(
          `UPDATE comandas SET paid_value = COALESCE(paid_value, 0) + ?,
            livrocaixa_tx_id = ?, livrocaixa_date = ?, sync_to_livrocaixa = 1
           WHERE id = ? AND tenant_id = ?`,
          [amountBRL, txResult.insertId, paidDate, comandaId, finalTenantId]
        );
      } catch (e) {
        console.warn('[MP Webhook] Erro ao atualizar comanda:', e.message);
      }
    }

    console.log(`[MP Webhook] ✅ R$ ${amountBRL} | TX #${txResult.insertId} | Comanda: ${comandaId} | Método: ${paymentMethod}`);

    // ── Notifica o psicólogo: sino in-app + e-mail ─────────────────────────────
    try {
      const methodLabel = { pix: 'Pix', credito: 'cartão de crédito', debito: 'cartão de débito' }[paymentMethod] || paymentMethod;
      const amountFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountBRL);
      await db.query(
        `INSERT INTO system_alerts (tenant_id, title, message, type, link)
         VALUES (?, ?, ?, 'success', ?)`,
        [finalTenantId, 'Pagamento recebido 💰',
         `${patientName} pagou ${amountFmt} via ${methodLabel} pelo Portal do Paciente.`,
         comandaId ? '/financeiro' : '/financeiro']
      );

      if (finalUserId) {
        const [[professional]] = await db.query('SELECT email, name FROM users WHERE id = ?', [finalUserId]);
        if (professional?.email) {
          const { templates } = require('../services/emailService');
          await sendMail(
            professional.email,
            '💰 Pagamento Recebido — PsiFlux',
            templates.paymentReceived({ patientName, amount: amountBRL, paymentMethod, comandaId })
          );
        }
      }
    } catch (notifyErr) {
      console.warn('[MP Webhook] Erro ao notificar psicólogo:', notifyErr.message);
    }

    res.status(200).json({ received: true, action: 'processed', transaction_id: txResult.insertId });
  } catch (err) {
    console.error('[MP Webhook] Erro:', err);
    res.status(200).json({ received: true, action: 'error', message: err.message });
  }
});

module.exports = router;
