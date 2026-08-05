const db = require('../db');

/**
 * Mantém o login válido mesmo quando a assinatura vence, mas protege todos os
 * recursos do consultório. As rotas de /subscription são montadas antes deste
 * middleware para que a renovação continue disponível.
 */
async function subscriptionAccessMiddleware(req, res, next) {
  try {
    if (!req.user?.tenant_id || req.user.role === 'super_admin') return next();

    const [[tenant]] = await db.query(
      'SELECT billing_exempt, expires_at, trial_ends_at FROM tenants WHERE id = ?',
      [req.user.tenant_id]
    );
    if (!tenant || tenant.billing_exempt) return next();

    const now = new Date();
    const expiredSubscription = tenant.expires_at && new Date(tenant.expires_at) <= now;
    const expiredTrial = !tenant.expires_at && tenant.trial_ends_at && new Date(tenant.trial_ends_at) <= now;

    if (expiredSubscription || expiredTrial) {
      return res.status(402).json({
        error: 'Assinatura vencida. Renove para acessar o painel.',
        code: 'SUBSCRIPTION_REQUIRED',
        subscription_required: true,
      });
    }
    next();
  } catch (err) {
    console.error('[SubscriptionAccess] Erro ao validar assinatura:', err.message);
    res.status(500).json({ error: 'Não foi possível validar a assinatura.' });
  }
}

module.exports = { subscriptionAccessMiddleware };
