const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const wppService = require('../services/whatsappService');

// Restrição para Admins da Clínica (Tenant) e Super Admin
const isTenantAdmin = (user) => user && ['admin', 'super_admin'].includes(user.role);

// Rotas de bot so para admins
router.use(authorize('admin', 'super_admin'));

// GET /whatsapp/status - Retorna o status do bot para a clinica do usuario
router.get('/status', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;

  try {
    const [rows] = await db.query('SELECT whatsapp_preferences FROM tenants WHERE id = ?', [tenantId]);
    const prefsRaw = rows[0]?.whatsapp_preferences;
    const preferences = prefsRaw ? (typeof prefsRaw === 'string' ? JSON.parse(prefsRaw) : prefsRaw) : {};
    res.json({ ...wppService.getStatus(tenantId), preferences });
  } catch(e) {
    res.json({ ...wppService.getStatus(tenantId), preferences: {} });
  }
});

// POST /whatsapp/preferences - Salva as configuracoes e mensagens do robo
router.post('/preferences', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  try {
    await db.query('UPDATE tenants SET whatsapp_preferences = ? WHERE id = ?', [JSON.stringify(req.body), req.user.tenant_id]);
    res.json({ success: true, message: 'Preferências salvas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
});

// POST /whatsapp/connect - Inicia conexão ou gera QR Code (Real)
router.post('/connect', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;

  try {
    // Inicia conexão de forma assíncrona
    // forceNew = true: apaga a sessão antiga e gera um novo QR code limpo
    wppService.connect(tenantId, true).catch(err => console.error('WPP Connect Error:', err.message));

    // Retorna status imediato (provavelmente connecting)
    setTimeout(() => {
        res.json({
          success: true,
          ...wppService.getStatus(tenantId),
          message: 'Escaneie o QR Code para conectar'
        });
    }, 500); // pequeno delay para dar tempo do QR ser gerado se for rápido

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao iniciar conexão' });
  }
});

// POST /whatsapp/disconnect - Desconecta a instância da clinica
router.post('/disconnect', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;

  try {
    await wppService.disconnect(tenantId);
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// POST /whatsapp/test - Envia mensagem de teste
router.post('/test', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;
  
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });

  try {
    const success = await wppService.sendReminder(tenantId, phone, message);
    if (success) res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    else res.status(500).json({ error: 'Falha ao enviar mensagem. Entre em contato com o suporte.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
});

module.exports = router;
