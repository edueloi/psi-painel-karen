const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// ── Auto-migrate: colunas de assinatura ──────────────────────────────────────
async function ensureSubscriptionSchema() {
  const stmts = [
    "ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME NULL",
    "ALTER TABLE tenants ADD COLUMN expires_at DATETIME NULL",
    "ALTER TABLE tenants ADD COLUMN status ENUM('active','blocked','expired') DEFAULT 'active'",
    "ALTER TABLE tenants ADD COLUMN last_billing_at DATETIME NULL",
    "ALTER TABLE tenants ADD COLUMN plan_id INT NULL",
    "ALTER TABLE tenants ADD COLUMN subscription_mp_preference_id VARCHAR(255) NULL",
    "ALTER TABLE tenants ADD COLUMN subscription_mp_payment_id VARCHAR(255) NULL",
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch { /* coluna já existe */ }
  }
}
ensureSubscriptionSchema();

// ── Helpers de criptografia (reutiliza a mesma chave do MP) ───────────────────
function decrypt(encrypted) {
  const key = Buffer.from(process.env.MP_ENCRYPTION_KEY || process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const [ivHex, encHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

// Busca o token MP do admin do tenant (quem configurou o MP para cobranças do sistema)
// OU usa o token global de cobrança da plataforma definido em MP_PLATFORM_TOKEN
async function getPlatformToken(tenantId) {
  // Prioridade 1: token global da plataforma (dono do SaaS)
  if (process.env.MP_PLATFORM_TOKEN) return process.env.MP_PLATFORM_TOKEN;

  // Prioridade 2: token do admin do tenant (self-payment)
  const [rows] = await db.query(
    `SELECT u.mercadopago_token FROM users u
     WHERE u.tenant_id = ? AND u.role = 'admin' AND u.mercadopago_enabled = 1 AND u.mercadopago_token IS NOT NULL
     LIMIT 1`,
    [tenantId]
  );
  if (rows.length && rows[0].mercadopago_token) {
    try { return decrypt(rows[0].mercadopago_token); } catch { return null; }
  }
  return null;
}

// ── GET /subscription/status ─────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.trial_ends_at, t.expires_at, t.status, t.last_billing_at,
              t.plan_id, p.name as plan_name, p.price as plan_price, p.features as plan_features
       FROM tenants t
       LEFT JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });

    const t = rows[0];
    try { t.plan_features = typeof t.plan_features === 'string' ? JSON.parse(t.plan_features) : t.plan_features || []; } catch { t.plan_features = []; }

    const now = new Date();
    const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
    const expiresAt = t.expires_at ? new Date(t.expires_at) : null;

    let subscriptionType = 'free';
    let daysLeft = null;
    let totalDays = null;
    let isActive = true;

    if (expiresAt && expiresAt > now) {
      // Tem assinatura ativa paga
      subscriptionType = 'paid';
      daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      totalDays = 30; // mês corrente
      isActive = true;
    } else if (trialEndsAt) {
      // Está no trial ou trial expirou
      subscriptionType = 'trial';
      const trialStart = new Date(trialEndsAt);
      trialStart.setDate(trialStart.getDate() - 14);
      totalDays = 14;
      daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
      isActive = trialEndsAt > now;
    }

    // Verifica se MP está configurado para o admin do tenant
    const [mpRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ? AND role = 'admin' AND mercadopago_enabled = 1 AND mercadopago_token IS NOT NULL`,
      [req.user.tenant_id]
    );
    const hasPlatformToken = !!(process.env.MP_PLATFORM_TOKEN || mpRows[0]?.cnt > 0);

    res.json({
      subscription_type: subscriptionType,
      is_active: isActive,
      days_left: daysLeft,
      total_days: totalDays,
      trial_ends_at: t.trial_ends_at,
      expires_at: t.expires_at,
      last_billing_at: t.last_billing_at,
      plan_id: t.plan_id,
      plan_name: t.plan_name,
      plan_price: t.plan_price,
      plan_features: t.plan_features,
      has_payment_configured: hasPlatformToken,
    });
  } catch (err) {
    console.error('[Sub] Erro ao buscar status:', err);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// ── POST /subscription/checkout — Gera cobrança para assinar ─────────────────
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { plan_id, period } = req.body; // period: 'monthly' | 'annual'
    if (!plan_id) return res.status(400).json({ error: 'Plano obrigatório' });

    const token = await getPlatformToken(req.user.tenant_id);
    if (!token) {
      return res.status(400).json({
        error: 'Pagamento online não configurado. Configure o Mercado Pago em Configurações → Integrações, ou entre em contato com o suporte.',
        no_payment: true,
      });
    }

    const [planRows] = await db.query('SELECT * FROM plans WHERE id = ? AND active = 1', [plan_id]);
    if (!planRows.length) return res.status(404).json({ error: 'Plano não encontrado' });

    const plan = planRows[0];
    const isAnnual = period === 'annual';
    const months = isAnnual ? 12 : 1;
    const discount = isAnnual ? 0.15 : 0; // 15% desconto anual
    const amount = parseFloat((plan.price * months * (1 - discount)).toFixed(2));
    const description = `PsiFlux — ${plan.name} (${isAnnual ? 'Anual' : 'Mensal'})`;

    const [tenantRows] = await db.query('SELECT * FROM tenants WHERE id = ?', [req.user.tenant_id]);
    const tenant = tenantRows[0];

    const baseUrl = process.env.APP_BASE_URL || 'https://app.psiflux.com.br';
    const external_reference = JSON.stringify({
      type: 'subscription',
      tenant_id: req.user.tenant_id,
      plan_id,
      period: isAnnual ? 'annual' : 'monthly',
      months,
    });

    // Gera PIX
    let pixData = null;
    try {
      const pixRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `sub-pix-${req.user.tenant_id}-${plan_id}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description,
          payment_method_id: 'pix',
          payer: { email: req.user.email || 'assinatura@psiflux.com.br' },
          external_reference,
          notification_url: `${baseUrl}/api/subscription/webhook`,
        }),
      });
      const pd = await pixRes.json();
      if (pixRes.ok && pd.point_of_interaction?.transaction_data) {
        pixData = {
          payment_id: pd.id,
          qr_code: pd.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: pd.point_of_interaction.transaction_data.qr_code_base64,
        };
      }
    } catch (e) { console.warn('[Sub] PIX não gerado:', e.message); }

    // Gera link de pagamento (cartão + outros)
    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ title: description, quantity: 1, unit_price: amount, currency_id: 'BRL' }],
        payer: { email: req.user.email || 'assinatura@psiflux.com.br' },
        external_reference,
        notification_url: `${baseUrl}/api/subscription/webhook`,
        back_urls: {
          success: `${baseUrl}/assinatura?status=success`,
          failure: `${baseUrl}/assinatura?status=failure`,
          pending: `${baseUrl}/assinatura?status=pending`,
        },
        auto_return: 'approved',
      }),
    });
    const prefData = await prefRes.json();
    if (!prefRes.ok) return res.status(prefRes.status).json({ error: prefData.message || 'Erro ao gerar cobrança' });

    // Salva preference_id no tenant para rastreamento
    await db.query('UPDATE tenants SET subscription_mp_preference_id = ? WHERE id = ?', [prefData.id, req.user.tenant_id]);

    res.json({
      preference_id: prefData.id,
      payment_url: prefData.init_point,
      pix_qr_code: pixData?.qr_code || null,
      pix_qr_code_base64: pixData ? `data:image/png;base64,${pixData.qr_code_base64}` : null,
      pix_payment_id: pixData?.payment_id || null,
      amount,
      plan_name: plan.name,
      description,
    });
  } catch (err) {
    console.error('[Sub] Erro ao criar checkout:', err);
    res.status(500).json({ error: 'Erro interno ao gerar cobrança' });
  }
});

// ── GET /subscription/check-payment/:paymentId — Verifica status do PIX ──────
router.get('/check-payment/:paymentId', authMiddleware, async (req, res) => {
  try {
    const token = await getPlatformToken(req.user.tenant_id);
    if (!token) return res.status(400).json({ error: 'Sem token configurado' });

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

// ── POST /subscription/webhook — MP notifica pagamento aprovado ───────────────
// Rota PÚBLICA — chamada pelo Mercado Pago
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const { type, data, action } = req.body;
    if (type !== 'payment' && action !== 'payment.updated') {
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true, action: 'no_id' });

    // Busca token de qualquer admin com MP configurado para consultar o pagamento
    const [mpUsers] = await db.query(
      `SELECT u.id, u.tenant_id, u.mercadopago_token
       FROM users u
       WHERE u.mercadopago_enabled = 1 AND u.mercadopago_token IS NOT NULL AND u.role = 'admin'`
    );

    let paymentData = null;
    for (const u of mpUsers) {
      try {
        const tk = process.env.MP_PLATFORM_TOKEN || decrypt(u.mercadopago_token);
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${tk}` },
        });
        if (r.ok) { paymentData = await r.json(); break; }
      } catch { /* tenta próximo */ }
    }

    // Se tiver token de plataforma, tenta com ele também
    if (!paymentData && process.env.MP_PLATFORM_TOKEN) {
      try {
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${process.env.MP_PLATFORM_TOKEN}` },
        });
        if (r.ok) paymentData = await r.json();
      } catch {}
    }

    if (!paymentData || paymentData.status !== 'approved') {
      return res.status(200).json({ received: true, action: paymentData ? 'not_approved' : 'token_not_found' });
    }

    let meta = {};
    try { meta = JSON.parse(paymentData.external_reference || '{}'); } catch {}

    if (meta.type !== 'subscription') {
      return res.status(200).json({ received: true, action: 'not_subscription' });
    }

    const { tenant_id, plan_id, months } = meta;
    if (!tenant_id || !months) {
      return res.status(200).json({ received: true, action: 'missing_meta' });
    }

    // Idempotência
    const [existing] = await db.query(
      'SELECT id FROM tenants WHERE id = ? AND subscription_mp_payment_id = ?',
      [tenant_id, String(paymentId)]
    );
    if (existing.length > 0) return res.status(200).json({ received: true, action: 'duplicate' });

    // Calcula nova data de expiração
    const [tenantRows] = await db.query('SELECT expires_at FROM tenants WHERE id = ?', [tenant_id]);
    const currentExpires = tenantRows[0]?.expires_at ? new Date(tenantRows[0].expires_at) : new Date();
    const base = currentExpires > new Date() ? currentExpires : new Date();
    base.setMonth(base.getMonth() + parseInt(months));
    const newExpiresAt = base.toISOString().slice(0, 19).replace('T', ' ');

    // Ativa assinatura
    await db.query(
      `UPDATE tenants SET
        expires_at = ?,
        trial_ends_at = NULL,
        status = 'active',
        plan_id = ?,
        last_billing_at = NOW(),
        subscription_mp_payment_id = ?
       WHERE id = ?`,
      [newExpiresAt, plan_id || tenantRows[0]?.plan_id, String(paymentId), tenant_id]
    );

    console.log(`[Sub Webhook] ✅ Tenant #${tenant_id} assinatura ativa até ${newExpiresAt} | Plano #${plan_id} | Payment #${paymentId}`);
    res.status(200).json({ received: true, action: 'activated', expires_at: newExpiresAt });
  } catch (err) {
    console.error('[Sub Webhook] Erro:', err);
    res.status(200).json({ received: true, action: 'error', message: err.message });
  }
});

module.exports = router;
