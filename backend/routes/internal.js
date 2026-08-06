const express = require('express');
const router = express.Router();

/**
 * Rotas internas, chamadas apenas pelo processo do bot (backend/bot.js, porta
 * 3014) via localhost — nunca expostas a usuários finais, por isso não usam
 * o authMiddleware baseado em JWT.
 */
function onlyLocalhost(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// POST /internal/whatsapp-events — o processo bot chama isso após persistir
// uma mensagem (recebida ou enviada) para repassar em tempo real ao painel
// via WebSocket (/ws/sync), usando o RealtimeService já existente.
router.post('/whatsapp-events', onlyLocalhost, (req, res) => {
  const { tenantId, ...event } = req.body || {};
  if (!tenantId) return res.status(400).json({ error: 'tenantId obrigatório' });

  const realtimeService = require('../services/realtimeService');
  realtimeService.broadcast(String(tenantId), event);
  res.json({ success: true });
});

module.exports = router;
