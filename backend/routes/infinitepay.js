const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// ── Auto-migrate: colunas InfinitePay na tabela users ────────────────────────
async function ensureInfinitePayColumns() {
  const stmts = [
    "ALTER TABLE users ADD COLUMN infinitepay_token TEXT NULL",
    "ALTER TABLE users ADD COLUMN infinitepay_enabled TINYINT(1) DEFAULT 0",
    "ALTER TABLE financial_transactions ADD COLUMN infinitepay_charge_id VARCHAR(255) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN infinitepay_status VARCHAR(50) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN infinitepay_payment_url TEXT NULL",
    "ALTER TABLE comanda_payments ADD COLUMN infinitepay_charge_id VARCHAR(255) NULL",
    "ALTER TABLE comanda_payments ADD COLUMN infinitepay_status VARCHAR(50) NULL",
    "ALTER TABLE comanda_payments ADD COLUMN infinitepay_payment_url TEXT NULL",
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { /* coluna já existe */ }
  }
}
ensureInfinitePayColumns();

// ── Helpers ───────────────────────────────────────────────────────────────────

function encryptToken(token) {
  const key = Buffer.from(process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptToken(encrypted) {
  const key = Buffer.from(process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

async function getUserToken(userId) {
  const [rows] = await db.query(
    'SELECT infinitepay_token, infinitepay_enabled FROM users WHERE id = ?',
    [userId]
  );
  if (!rows.length || !rows[0].infinitepay_enabled || !rows[0].infinitepay_token) return null;
  try { return decryptToken(rows[0].infinitepay_token); } catch { return null; }
}

// ── GET /infinitepay/config — Retorna se está configurado (sem expor o token) ─
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT infinitepay_enabled, infinitepay_token FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.json({ configured: false, enabled: false });
    const { infinitepay_enabled, infinitepay_token } = rows[0];
    res.json({
      configured: !!infinitepay_token,
      enabled: !!infinitepay_enabled,
    });
  } catch (err) {
    console.error('[InfinitePay] Erro ao buscar config:', err);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// ── POST /infinitepay/config — Salva/atualiza o token do psicólogo ────────────
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { token, enabled } = req.body;
    if (token === undefined && enabled === undefined) {
      return res.status(400).json({ error: 'Envie token ou enabled' });
    }

    const updates = [];
    const values = [];

    if (token !== undefined) {
      if (token === '') {
        updates.push('infinitepay_token = NULL', 'infinitepay_enabled = 0');
      } else {
        const encrypted = encryptToken(token.trim());
        updates.push('infinitepay_token = ?', 'infinitepay_enabled = 1');
        values.push(encrypted);
      }
    }

    if (enabled !== undefined && token === undefined) {
      updates.push('infinitepay_enabled = ?');
      values.push(enabled ? 1 : 0);
    }

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ ok: true, message: 'Configuração salva com sucesso!' });
  } catch (err) {
    console.error('[InfinitePay] Erro ao salvar config:', err);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// ── POST /infinitepay/config/test — Testa se o token é válido ────────────────
router.post('/config/test', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });

    // Testa criando uma cobrança de R$ 0,01 (mínimo) e depois cancela
    // A InfinitePay retorna 401 se o token for inválido
    const testResp = await fetch('https://api.infinitepay.io/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        capture_method: 'link',
        description: 'Teste de integração PsiFlux',
      }),
    });

    if (testResp.status === 401) {
      return res.status(401).json({ valid: false, error: 'Token inválido ou sem permissão' });
    }

    res.json({ valid: true, message: 'Token válido!' });
  } catch (err) {
    console.error('[InfinitePay] Erro ao testar token:', err);
    res.status(500).json({ error: 'Erro ao testar conexão com InfinitePay' });
  }
});

// ── POST /infinitepay/charge — Cria cobrança (link de pagamento) ──────────────
router.post('/charge', authMiddleware, async (req, res) => {
  try {
    const token = await getUserToken(req.user.id);
    if (!token) {
      return res.status(400).json({ error: 'InfinitePay não configurada para este usuário. Configure nas Configurações.' });
    }

    const { amount, description, patient_name, comanda_id, appointment_id, installments } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor inválido' });

    const amountInCents = Math.round(amount * 100);
    const baseUrl = process.env.APP_BASE_URL || 'https://app.psiflux.com.br';

    const payload = {
      amount: amountInCents,
      capture_method: 'link',
      description: description || `Consulta - ${patient_name || 'Paciente'}`,
      installments: installments || 1,
      webhook_url: `${baseUrl}/api/infinitepay/webhook`,
      metadata: {
        user_id: String(req.user.id),
        tenant_id: String(req.user.tenant_id),
        comanda_id: comanda_id ? String(comanda_id) : null,
        appointment_id: appointment_id ? String(appointment_id) : null,
        patient_name: patient_name || null,
      },
    };

    const ipRes = await fetch('https://api.infinitepay.io/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ipData = await ipRes.json();

    if (!ipRes.ok) {
      console.error('[InfinitePay] Erro ao criar cobrança:', ipData);
      return res.status(ipRes.status).json({ error: ipData.message || 'Erro ao criar cobrança na InfinitePay' });
    }

    res.json({
      charge_id: ipData.id,
      payment_url: ipData.payment_url || ipData.checkout_url,
      pix_qr_code: ipData.pix?.qr_code || null,
      pix_qr_code_base64: ipData.pix?.qr_code_base64 || null,
      status: ipData.status,
      amount: amount,
    });
  } catch (err) {
    console.error('[InfinitePay] Erro ao criar cobrança:', err);
    res.status(500).json({ error: 'Erro interno ao criar cobrança' });
  }
});

// ── GET /infinitepay/charge/:id — Consulta status de uma cobrança ─────────────
router.get('/charge/:chargeId', authMiddleware, async (req, res) => {
  try {
    const token = await getUserToken(req.user.id);
    if (!token) return res.status(400).json({ error: 'InfinitePay não configurada' });

    const ipRes = await fetch(`https://api.infinitepay.io/v2/charges/${req.params.chargeId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const ipData = await ipRes.json();

    if (!ipRes.ok) return res.status(ipRes.status).json({ error: 'Erro ao consultar cobrança' });

    res.json({ charge_id: ipData.id, status: ipData.status, amount: ipData.amount / 100 });
  } catch (err) {
    console.error('[InfinitePay] Erro ao consultar cobrança:', err);
    res.status(500).json({ error: 'Erro ao consultar cobrança' });
  }
});

// ── POST /infinitepay/webhook — Recebe confirmação de pagamento ───────────────
// Rota pública (sem authMiddleware) — chamada pela InfinitePay
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log('[InfinitePay Webhook] Evento recebido:', JSON.stringify(event));

    // Só processa eventos de pagamento aprovado
    const status = event.status || event.event_type || '';
    const isApproved = ['approved', 'paid', 'captured', 'succeeded'].includes(status.toLowerCase());

    if (!isApproved) {
      return res.status(200).json({ received: true, action: 'ignored', status });
    }

    const meta = event.metadata || {};
    const userId = meta.user_id ? parseInt(meta.user_id) : null;
    const tenantId = meta.tenant_id ? parseInt(meta.tenant_id) : null;
    const comandaId = meta.comanda_id ? parseInt(meta.comanda_id) : null;
    const appointmentId = meta.appointment_id ? parseInt(meta.appointment_id) : null;
    const patientName = meta.patient_name || 'Paciente';
    const chargeId = event.id || event.charge_id;
    const amountCents = event.amount || 0;
    const amountBRL = amountCents / 100;
    const paymentMethod = detectPaymentMethod(event);
    const paidAt = event.paid_at || event.created_at || new Date().toISOString();
    const paidDate = paidAt.substring(0, 10);

    if (!userId || !tenantId || amountBRL <= 0) {
      console.warn('[InfinitePay Webhook] Dados insuficientes:', { userId, tenantId, amountBRL });
      return res.status(200).json({ received: true, action: 'skipped', reason: 'missing metadata' });
    }

    // Verifica se já foi processado (idempotência)
    const [existing] = await db.query(
      'SELECT id FROM financial_transactions WHERE infinitepay_charge_id = ? LIMIT 1',
      [chargeId]
    );
    if (existing.length > 0) {
      return res.status(200).json({ received: true, action: 'duplicate', charge_id: chargeId });
    }

    // ── Lança no Livro Caixa (financial_transactions) ─────────────────────────
    let description = `Pagamento via InfinitePay — ${patientName}`;
    if (comandaId) description += ` (Comanda #${comandaId})`;

    const [txResult] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, amount, date, description, payment_method, status, source,
         origin_module, origin_id, created_by, infinitepay_charge_id, infinitepay_status,
         payer_name, appointment_id)
       VALUES (?, 'income', ?, ?, ?, ?, 'paid', 'infinitepay', 'INFINITEPAY', ?, ?, ?, 'paid', ?, ?)`,
      [
        tenantId,
        amountBRL,
        paidDate,
        description,
        paymentMethod,
        comandaId || null,
        userId,
        chargeId,
        patientName,
        appointmentId || null,
      ]
    );

    // ── Atualiza comanda se existir ───────────────────────────────────────────
    if (comandaId) {
      try {
        // Registra em comanda_payments
        await db.query(
          `INSERT INTO comanda_payments
            (tenant_id, comanda_id, amount, payment_date, payment_method, status, payer_id,
             infinitepay_charge_id, infinitepay_status)
           VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 'paid')`,
          [tenantId, comandaId, amountBRL, paidDate, paymentMethod, userId, chargeId]
        );

        // Atualiza valor pago na comanda
        await db.query(
          `UPDATE comandas SET paid_value = COALESCE(paid_value, 0) + ?,
            livrocaixa_tx_id = ?, livrocaixa_date = ?, sync_to_livrocaixa = 1
           WHERE id = ? AND tenant_id = ?`,
          [amountBRL, txResult.insertId, paidDate, comandaId, tenantId]
        );
      } catch (e) {
        console.warn('[InfinitePay Webhook] Erro ao atualizar comanda:', e.message);
      }
    }

    console.log(`[InfinitePay Webhook] Lançado no Livro Caixa: R$ ${amountBRL} | TX #${txResult.insertId} | Comanda: ${comandaId}`);
    res.status(200).json({ received: true, action: 'processed', transaction_id: txResult.insertId });
  } catch (err) {
    console.error('[InfinitePay Webhook] Erro:', err);
    // Retorna 200 para evitar retentativas desnecessárias
    res.status(200).json({ received: true, action: 'error', message: err.message });
  }
});

function detectPaymentMethod(event) {
  const method = (event.payment_method || event.capture_method || '').toLowerCase();
  if (method.includes('pix')) return 'pix';
  if (method.includes('debit')) return 'debito';
  if (method.includes('credit') || method.includes('card')) return 'credito';
  if (method.includes('link')) {
    // Tenta inferir pelo tipo de transação
    const type = (event.transaction_type || '').toLowerCase();
    if (type.includes('pix')) return 'pix';
  }
  return 'cartao';
}

module.exports = router;
