const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');
const { authorize } = require('../middleware/auth');

const BOT_URL = 'http://127.0.0.1:3014/bot-api';

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
    
    // Pega o status do bot rodando na porta 3014
    let botStatus = { status: 'disconnected', reason: 'Bot offline' };
    try {
       const resp = await axios.get(`${BOT_URL}/status/${tenantId}`);
       botStatus = resp.data;
    } catch(err) {
       console.warn('Bot service unreachable:', err.message);
    }
    
    res.json({ ...botStatus, preferences });
  } catch(e) {
    res.json({ status: 'disconnected', preferences: {} });
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
    // Comunica com o bot localmente de forma fire-and-forget
    axios.post(`${BOT_URL}/connect/${tenantId}`).catch(err => console.error('Bot connect proxy err:', err.message));

    setTimeout(async () => {
        let botStatus = { status: 'connecting' };
        try {
           const resp = await axios.get(`${BOT_URL}/status/${tenantId}`);
           botStatus = resp.data;
        } catch(e) {}

        res.json({
          success: true,
          ...botStatus,
          message: 'Escaneie o QR Code para conectar'
        });
    }, 1500); // 1.5s delay pro bot subir

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao conectar ao serviço do bot' });
  }
});

// POST /whatsapp/disconnect - Desconecta a instância da clinica
router.post('/disconnect', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;

  try {
    await axios.post(`${BOT_URL}/disconnect/${tenantId}`);
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao desconectar no seviço do bot' });
  }
});

// POST /whatsapp/test - Envia mensagem de teste
router.post('/test', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  const tenantId = req.user.tenant_id;
  
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });

  try {
    const response = await axios.post(`${BOT_URL}/test/${tenantId}`, { phone, message });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.response?.data?.error || 'Erro interno de comunicação com o Bot' });
  }
});

module.exports = router;
