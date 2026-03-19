const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// Rotas de bot so para admins (ou super_admin)
router.use(authorize('admin', 'super_admin'));

// GET /whatsapp/status - Retorna o status do bot para o tenant
router.get('/status', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT whatsapp_instance as instance, whatsapp_status as status, whatsapp_phone as phone FROM tenants WHERE id = ?',
      [req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar status do WhatsApp' });
  }
});

// POST /whatsapp/connect - Inicia conexão ou gera QR Code (Mock p/ agora)
router.post('/connect', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const [tenants] = await db.query('SELECT slug FROM tenants WHERE id = ?', [tenantId]);
    const slug = tenants[0].slug;

    // Se fosse real, chamaríamos a API externa de WPPConnect/Evolution aqui
    // Ex: await axios.post(`${API_WPP}/instance/create`, { name: slug });

    await db.query(
      'UPDATE tenants SET whatsapp_instance = ?, whatsapp_status = ? WHERE id = ?',
      [slug, 'connecting', tenantId]
    );

    res.json({
      success: true,
      instance: slug,
      qrcode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PSI_FLUX_BOT_WPP_CONNECT_' + slug, // Mock QR
      message: 'Escaneie o QR Code para conectar'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao iniciar conexão' });
  }
});

// POST /whatsapp/disconnect - Desconecta a instância
router.post('/disconnect', async (req, res) => {
  try {
    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?',
      ['disconnected', null, req.user.tenant_id]
    );
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

module.exports = router;
