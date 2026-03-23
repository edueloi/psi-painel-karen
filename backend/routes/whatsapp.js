const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const wppService = require('../services/whatsappService');

// Restrição para Super Admins - Somente super@psiflux e admin@psiflux podem acessar as funções globais
const isBotManager = (user) => user && (user.email === 'super@psiflux.com' || user.email === 'admin@psiflux.com');

// Rotas de bot so para admins (ou super_admin)
router.use(authorize('admin', 'super_admin'));

// GET /whatsapp/status - Retorna o status do bot master para o Super Admin
router.get('/status', async (req, res) => {
  if (!isBotManager(req.user)) {
    return res.status(403).json({ error: 'Acesso negado — somente gestores globais' });
  }

  res.json(wppService.getStatus());
});

// POST /whatsapp/connect - Inicia conexão ou gera QR Code (Real)
router.post('/connect', async (req, res) => {
  if (!isBotManager(req.user)) {
    return res.status(403).json({ error: 'Acesso negado — somente gestores globais' });
  }

  try {
    // Inicia conexão de forma assíncrona — o status mudará conforme o processo avança
    wppService.connect().catch(err => console.error('WPP Connect Error:', err.message));

    // Retorna status imediato (provavelmente connecting)
    setTimeout(() => {
        res.json({
          success: true,
          ...wppService.getStatus(),
          message: 'Escaneie o QR Code para conectar'
        });
    }, 500); // pequeno delay para dar tempo do QR ser gerado se for rápido

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao iniciar conexão' });
  }
});

// POST /whatsapp/disconnect - Desconecta a instância global
router.post('/disconnect', async (req, res) => {
  if (!isBotManager(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    await wppService.disconnect();
    res.json({ success: true, message: 'Desconectado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// POST /whatsapp/test - Envia mensagem de teste
router.post('/test', async (req, res) => {
  if (!isBotManager(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });

  try {
    const success = await wppService.sendReminder(phone, message);
    if (success) res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
    else res.status(500).json({ error: 'Falha ao enviar mensagem. Entre em contato com o suporte.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
});

module.exports = router;
