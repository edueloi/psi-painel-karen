const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, authorize } = require('../middleware/auth');
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

  // Histórico de faturas de assinatura (uma linha por cobrança gerada) —
  // tenants.subscription_mp_payment_id só guarda a última, sem histórico.
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        plan_id INT NULL,
        plan_name VARCHAR(100) NULL,
        period ENUM('monthly','annual') NOT NULL DEFAULT 'monthly',
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('pix','card') NULL,
        status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
        mp_payment_id VARCHAR(255) NULL,
        mp_preference_id VARCHAR(255) NULL,
        paid_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_mp_payment (mp_payment_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
  } catch { /* tabela já existe */ }
}
ensureSubscriptionSchema();

// ── Helpers de criptografia (reutiliza a mesma chave do MP) ───────────────────
function decrypt(encrypted) {
  const key = Buffer.from(process.env.MP_ENCRYPTION_KEY || process.env.INFINITEPAY_ENCRYPTION_KEY || 'psiflux-default-key-32chars!!!!!!', 'utf8').slice(0, 32);
  const [ivHex, encHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

// Busca o token MP do super_admin para cobrar assinaturas dos consultórios.
// O super_admin tem role='super_admin' e tenant_id IS NULL.
// Prioridade: variável de ambiente MP_PLATFORM_TOKEN > token cadastrado no usuário super_admin.
async function getPlatformToken() {
  if (process.env.MP_PLATFORM_TOKEN) return process.env.MP_PLATFORM_TOKEN;

  const [rows] = await db.query(
    `SELECT mercadopago_token FROM users
     WHERE role = 'super_admin' AND mercadopago_enabled = 1 AND mercadopago_token IS NOT NULL
     ORDER BY id ASC LIMIT 1`
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
      `SELECT t.id, t.name, t.trial_ends_at, t.expires_at, t.status, t.last_billing_at, t.billing_exempt,
              t.plan_id, p.name as plan_name, p.price as plan_price, p.features as plan_features
       FROM tenants t
       LEFT JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });

    const t = rows[0];
    try { t.plan_features = typeof t.plan_features === 'string' ? JSON.parse(t.plan_features) : t.plan_features || []; } catch { t.plan_features = []; }

    // O "valor" exibido deve ser o que a clínica realmente pagou na última
    // fatura aprovada, não o preço ATUAL do plano — que pode ter mudado
    // (ex: promoção/teste) depois do pagamento já ter sido feito.
    // Só cai para o preço do plano quando não há nenhuma fatura paga ainda
    // (ex: clínica só em trial, nunca pagou nada).
    const [[lastPaidInvoice]] = await db.query(
      `SELECT amount FROM subscription_invoices
       WHERE tenant_id = ? AND status = 'approved'
       ORDER BY paid_at DESC LIMIT 1`,
      [req.user.tenant_id]
    );
    if (lastPaidInvoice) t.plan_price = parseFloat(lastPaidInvoice.amount);

    // Clínica isenta de cobrança: sempre ativa, independente de trial/vencimento
    if (t.billing_exempt) {
      return res.json({
        subscription_type: 'exempt',
        is_active: true,
        days_left: null,
        total_days: null,
        trial_ends_at: t.trial_ends_at,
        expires_at: t.expires_at,
        last_billing_at: t.last_billing_at,
        plan_id: t.plan_id,
        plan_name: t.plan_name,
        plan_price: t.plan_price,
        plan_features: t.plan_features,
        has_payment_configured: false,
        billing_exempt: true,
      });
    }

    const now = new Date();
    const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
    const expiresAt = t.expires_at ? new Date(t.expires_at) : null;
    let subscriptionType = 'free';
    let daysLeft = null;
    let totalDays = null;
    let isActive = true;
    let isInGrace = false;
    let graceDaysLeft = null;

    if (expiresAt && expiresAt > now) {
      // Tem assinatura ativa paga
      subscriptionType = 'paid';
      daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      totalDays = 30; // mês corrente
      isActive = true;
    } else if (expiresAt) {
      // Assinatura vencida: o login continua disponível, mas o sistema fica
      // limitado à renovação até que um novo pagamento seja confirmado.
      subscriptionType = 'paid';
      daysLeft = 0;
      totalDays = 30;
      isActive = false;
    } else if (trialEndsAt) {
      // Está no trial ou trial expirou (sem carência — trial já é gratuito)
      subscriptionType = 'trial';
      const trialStart = new Date(trialEndsAt);
      trialStart.setDate(trialStart.getDate() - 14);
      totalDays = 14;
      daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
      isActive = trialEndsAt > now;
    }

    // Verifica se super_admin tem MP configurado para cobrar assinaturas
    const [mpRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'super_admin' AND mercadopago_enabled = 1 AND mercadopago_token IS NOT NULL`
    );
    const hasPlatformToken = !!(process.env.MP_PLATFORM_TOKEN || mpRows[0]?.cnt > 0);

    res.json({
      subscription_type: subscriptionType,
      is_active: isActive,
      days_left: daysLeft,
      total_days: totalDays,
      is_in_grace: isInGrace,
      grace_days_left: graceDaysLeft,
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

    const [[exemptCheck]] = await db.query('SELECT billing_exempt FROM tenants WHERE id = ?', [req.user.tenant_id]);
    if (exemptCheck?.billing_exempt) {
      return res.status(400).json({ error: 'Esta clínica está isenta de cobrança e não precisa assinar um plano.' });
    }

    const token = await getPlatformToken();
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

    // Registra a fatura no histórico (pendente até o webhook confirmar).
    // Uma linha por checkout gerado — se o tenant gerar Pix e depois pagar
    // pelo link de cartão (ou vice-versa), o webhook casa pelo mp_payment_id
    // do que for efetivamente pago; a(s) outra(s) linha(s) pendente(s) desse
    // checkout ficam como estão (não há retry automático de reconciliação).
    await db.query(
      `INSERT INTO subscription_invoices
        (tenant_id, plan_id, plan_name, period, amount, method, status, mp_payment_id, mp_preference_id)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [req.user.tenant_id, plan_id, plan.name, isAnnual ? 'annual' : 'monthly', amount,
       pixData ? 'pix' : 'card', pixData?.payment_id ? String(pixData.payment_id) : null, prefData.id]
    );

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

// ── GET /subscription/my-invoices — Extrato de faturas do próprio tenant ─────
router.get('/my-invoices', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, plan_id, plan_name, period, amount, method, status,
              mp_payment_id, paid_at, created_at
       FROM subscription_invoices
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Sub] Erro ao buscar extrato:', err);
    res.status(500).json({ error: 'Erro ao buscar extrato' });
  }
});

// ── GET /subscription/invoices/:id/receipt — PDF de comprovante de pagamento ──
router.get('/invoices/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const [[invoice]] = await db.query(
      `SELECT si.*, t.name as tenant_name, t.cnpj_cpf as tenant_document
       FROM subscription_invoices si
       JOIN tenants t ON t.id = si.tenant_id
       WHERE si.id = ? AND si.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });
    if (invoice.status !== 'approved') return res.status(400).json({ error: 'Comprovante disponível apenas para faturas pagas' });

    const { generateReceiptPdf } = require('../services/subscriptionReceipt');
    const pdfBuffer = await generateReceiptPdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprovante-${invoice.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[Sub] Erro ao gerar comprovante:', err);
    res.status(500).json({ error: 'Erro ao gerar comprovante' });
  }
});

// ── GET /subscription/check-payment/:paymentId — Verifica status do PIX ──────
// Ativa a assinatura na hora se o pagamento já estiver aprovado, sem esperar
// o webhook do Mercado Pago (que pode demorar ou, em ambientes com proxy/CDN,
// falhar em chegar) — o frontend faz polling nessa rota a cada poucos segundos
// enquanto o QR code está na tela.
router.get('/check-payment/:paymentId', authMiddleware, async (req, res) => {
  try {
    const token = await getPlatformToken();
    if (!token) return res.status(400).json({ error: 'Sem token configurado' });

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${req.params.paymentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: 'Erro ao consultar pagamento' });

    if (data.status === 'approved') {
      try { await activateFromPayment(data); } catch (e) { console.error('[Sub] Erro ao ativar via check-payment:', e.message); }
    }

    res.json({ payment_id: data.id, status: data.status, amount: data.transaction_amount });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar pagamento' });
  }
});

// ── GET /subscription/admin/invoices — histórico de faturas (Super Admin) ────
router.get('/admin/invoices', authMiddleware, authorize('super_admin'), async (req, res) => {
  try {
    const { tenant_id, status, page = 1, limit = 30 } = req.query;
    const conditions = [];
    const params = [];

    if (tenant_id) { conditions.push('si.tenant_id = ?'); params.push(tenant_id); }
    if (status) { conditions.push('si.status = ?'); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await db.query(
      `SELECT si.id, si.tenant_id, t.name as tenant_name, si.plan_id, si.plan_name,
              si.period, si.amount, si.method, si.status,
              si.mp_payment_id, si.mp_preference_id, si.paid_at, si.created_at
       FROM subscription_invoices si
       LEFT JOIN tenants t ON t.id = si.tenant_id
       ${where}
       ORDER BY si.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM subscription_invoices si ${where}`,
      params
    );

    const [[summary]] = await db.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as count_approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as count_pending
       FROM subscription_invoices si ${where}`,
      params
    );

    res.json({ invoices: rows, total, page: parseInt(page), limit: parseInt(limit), summary });
  } catch (err) {
    console.error('[Sub] Erro ao listar faturas:', err);
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

// Ativa a assinatura do tenant a partir de um pagamento já confirmado como
// aprovado na API do Mercado Pago. Usada tanto pelo webhook quanto pelo
// polling de check-payment (Pix) — idempotente via subscription_mp_payment_id,
// então pode ser chamada mais de uma vez pro mesmo pagamento sem duplicar.
async function activateFromPayment(paymentData) {
  const paymentId = paymentData.id;
  let meta = {};
  try { meta = JSON.parse(paymentData.external_reference || '{}'); } catch {}

  if (meta.type !== 'subscription') return { action: 'not_subscription' };

  const { tenant_id, plan_id, months } = meta;
  if (!tenant_id || !months) return { action: 'missing_meta' };

  // Idempotência
  const [existing] = await db.query(
    'SELECT id FROM tenants WHERE id = ? AND subscription_mp_payment_id = ?',
    [tenant_id, String(paymentId)]
  );
  if (existing.length > 0) return { action: 'duplicate' };

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

  // Marca a fatura correspondente como aprovada. O checkout grava o
  // payment_id do PIX (se gerado); pagamentos por link de cartão chegam
  // aqui com um payment_id novo que não bate com nenhuma linha — nesse
  // caso insere a fatura diretamente como aprovada (não dá pra saber o
  // amount original com certeza, então usa o valor do próprio pagamento).
  const [invoiceUpdate] = await db.query(
    `UPDATE subscription_invoices SET status = 'approved', paid_at = NOW(), mp_payment_id = ?
     WHERE tenant_id = ? AND status = 'pending' AND (mp_payment_id = ? OR mp_preference_id IS NOT NULL)
     ORDER BY created_at DESC LIMIT 1`,
    [String(paymentId), tenant_id, String(paymentId)]
  );
  if (!invoiceUpdate.affectedRows) {
    const [planRow] = await db.query('SELECT name FROM plans WHERE id = ?', [plan_id || tenantRows[0]?.plan_id]);
    await db.query(
      `INSERT INTO subscription_invoices
        (tenant_id, plan_id, plan_name, period, amount, method, status, mp_payment_id, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, NOW())`,
      [tenant_id, plan_id || tenantRows[0]?.plan_id, planRow[0]?.name || null,
       months == 12 ? 'annual' : 'monthly', paymentData.transaction_amount || 0,
       paymentData.payment_method_id === 'pix' ? 'pix' : 'card', String(paymentId)]
    );
  }

  console.log(`[Sub] ✅ Tenant #${tenant_id} assinatura ativa até ${newExpiresAt} | Plano #${plan_id} | Payment #${paymentId}`);
  return { action: 'activated', expires_at: newExpiresAt };
}

// ── POST /subscription/webhook — MP notifica pagamento aprovado ───────────────
// Rota PÚBLICA — chamada pelo Mercado Pago. Serve de reforço/backup: a
// ativação "no calor da hora" acontece via check-payment (polling do Pix na
// tela), então esse webhook é redundante-idempotente, não o único caminho.
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const { type, data, action } = req.body;
    if (type !== 'payment' && action !== 'payment.updated') {
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true, action: 'no_id' });

    const token = await getPlatformToken();
    let paymentData = null;
    if (token) {
      try {
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (r.ok) paymentData = await r.json();
      } catch {}
    }

    if (!paymentData || paymentData.status !== 'approved') {
      return res.status(200).json({ received: true, action: paymentData ? 'not_approved' : 'token_not_found' });
    }

    const result = await activateFromPayment(paymentData);
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    console.error('[Sub Webhook] Erro:', err);
    res.status(200).json({ received: true, action: 'error', message: err.message });
  }
});

module.exports = router;
