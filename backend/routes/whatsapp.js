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

    // Stats da fila de notificações
    const [[queuedRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM notification_queue WHERE tenant_id = ? AND status = 'pending'",
      [tenantId]
    );
    const [[sent24hRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM notification_queue WHERE tenant_id = ? AND status = 'sent' AND sent_at >= NOW() - INTERVAL 24 HOUR",
      [tenantId]
    );
    const stats = {
      queued: queuedRow?.total || 0,
      sent24h: sent24hRow?.total || 0,
    };

    res.json({ ...botStatus, preferences, stats });
  } catch(e) {
    res.json({ status: 'disconnected', preferences: {} });
  }
});

// GET /whatsapp/preferences - Retorna so as preferencias/mensagens do robo (sem
// consultar o status do bot na porta 3014, usado por telas que so precisam dos templates)
router.get('/preferences', async (req, res) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  try {
    const [rows] = await db.query('SELECT whatsapp_preferences FROM tenants WHERE id = ?', [req.user.tenant_id]);
    const prefsRaw = rows[0]?.whatsapp_preferences;
    const preferences = prefsRaw ? (typeof prefsRaw === 'string' ? JSON.parse(prefsRaw) : prefsRaw) : {};
    res.json({ preferences });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar preferências' });
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

// GET /whatsapp/master-preferences - Toggles globais do Master Bot (avisos a profissionais)
router.get('/master-preferences', async (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  try {
    const { getMasterWppPrefs } = require('../services/cronJobs');
    const prefs = await getMasterWppPrefs();
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar preferências do Master Bot' });
  }
});

// POST /whatsapp/master-preferences - Salva os toggles globais do Master Bot
router.post('/master-preferences', async (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  try {
    const { DEFAULT_MASTER_WPP_PREFS } = require('../services/cronJobs');
    const prefs = { ...DEFAULT_MASTER_WPP_PREFS, ...req.body };
    await db.query('UPDATE tenants SET master_whatsapp_preferences = ? WHERE id = ?', [JSON.stringify(prefs), req.user.tenant_id]);
    res.json({ success: true, ...prefs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar preferências do Master Bot' });
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

// ── Central de Conversas (bot master / super_admin) ─────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
};

// GET /whatsapp/conversations - Lista conversas do bot master, paginado
router.get('/conversations', requireSuperAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 30));
  const offset = (page - 1) * pageSize;
  const search = String(req.query.search || '').trim();

  try {
    const where = ['tenant_id = ?'];
    const params = [tenantId];
    if (search) {
      where.push('(contact_name LIKE ? OR contact_phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereSql = where.join(' AND ');

    const [rows] = await db.query(
      `SELECT * FROM whatsapp_conversations WHERE ${whereSql} ORDER BY last_message_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM whatsapp_conversations WHERE ${whereSql}`,
      params
    );
    res.json({ items: rows, total });
  } catch (err) {
    console.error('[Conversations] Erro ao listar:', err.message);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// GET /whatsapp/conversations/:id/messages - Histórico paginado por cursor
router.get('/conversations/:id/messages', requireSuperAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const before = req.query.before ? parseInt(req.query.before) : null;

  try {
    const [[conv]] = await db.query(
      'SELECT id FROM whatsapp_conversations WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

    const params = [conv.id];
    let cursorSql = '';
    if (before) {
      cursorSql = 'AND id < ?';
      params.push(before);
    }
    const [rows] = await db.query(
      `SELECT * FROM whatsapp_messages WHERE conversation_id = ? ${cursorSql} ORDER BY id DESC LIMIT ?`,
      [...params, limit]
    );

    if (!before) {
      await db.query('UPDATE whatsapp_conversations SET unread_count = 0 WHERE id = ?', [conv.id]);
    }

    res.json({ items: rows.reverse() });
  } catch (err) {
    console.error('[Conversations] Erro ao listar mensagens:', err.message);
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

// GET /whatsapp/contacts/search - Busca paciente/usuário cadastrado por nome ou telefone
router.get('/contacts/search', requireSuperAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ items: [] });

  try {
    const like = `%${q}%`;
    const [patients] = await db.query(
      `SELECT p.id, p.name, COALESCE(p.whatsapp, p.phone) AS phone, p.tenant_id, t.name AS tenant_name
       FROM patients p JOIN tenants t ON t.id = p.tenant_id
       WHERE p.name LIKE ? OR p.whatsapp LIKE ? OR p.phone LIKE ?
       LIMIT 20`,
      [like, like, like]
    );
    const [users] = await db.query(
      `SELECT u.id, u.name, u.phone, u.tenant_id, t.name AS tenant_name
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.role IN ('admin', 'professional') AND (u.name LIKE ? OR u.phone LIKE ?)
       LIMIT 20`,
      [like, like]
    );

    const items = [
      ...patients.map(p => ({ id: p.id, kind: 'patient', name: p.name, phone: p.phone, tenantId: p.tenant_id, tenantName: p.tenant_name })),
      ...users.map(u => ({ id: u.id, kind: 'user', name: u.name, phone: u.phone, tenantId: u.tenant_id, tenantName: u.tenant_name })),
    ].filter(item => item.phone);

    res.json({ items });
  } catch (err) {
    console.error('[Conversations] Erro ao buscar contatos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// POST /whatsapp/conversations - Cria/abre conversa (contato cadastrado ou telefone livre)
router.post('/conversations', requireSuperAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { phone, contactRef } = req.body;

  try {
    let rawPhone = phone;
    let contactName = null;

    if (contactRef) {
      const [kind, refId] = String(contactRef).split(':');
      if (kind === 'patient') {
        const [[p]] = await db.query('SELECT name, whatsapp, phone FROM patients WHERE id = ?', [refId]);
        if (!p) return res.status(404).json({ error: 'Paciente não encontrado' });
        rawPhone = p.whatsapp || p.phone;
        contactName = p.name;
      } else if (kind === 'user') {
        const [[u]] = await db.query('SELECT name, phone FROM users WHERE id = ?', [refId]);
        if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
        rawPhone = u.phone;
        contactName = u.name;
      } else {
        return res.status(400).json({ error: 'contactRef inválido' });
      }
    }

    if (!rawPhone) return res.status(400).json({ error: 'Telefone é obrigatório' });

    const wppService = require('../services/whatsappService');
    const convService = require('../services/whatsappConversationService');
    const phoneDigits = wppService.normalizePhoneDigits(rawPhone).replace(/\D/g, '');
    // Só aceita BR com DDI (12/13 dígitos) ou internacional explícito (rawPhone
    // começando com "+"), sempre com no máximo 15 dígitos (padrão E.164) — sem
    // isso, um número digitado errado (ex: com máscara colada) era aceito e a
    // mensagem saía para um destino que não existe.
    const looksInternational = String(rawPhone).trim().startsWith('+');
    const validLength = looksInternational
      ? phoneDigits.length >= 8 && phoneDigits.length <= 15
      : phoneDigits.length === 12 || phoneDigits.length === 13;
    if (!phoneDigits || !validLength) {
      return res.status(400).json({ error: `Telefone inválido: "${rawPhone}". Use o formato (DDD) 99999-9999.` });
    }

    const [[existing]] = await db.query(
      'SELECT * FROM whatsapp_conversations WHERE tenant_id = ? AND contact_phone = ?',
      [tenantId, phoneDigits]
    );
    if (existing) return res.json(existing);

    const conversation = await convService.upsertConversation(tenantId, {
      phoneDigits,
      jid: `${phoneDigits}@s.whatsapp.net`,
      previewText: null,
      direction: 'out',
      pushName: contactName,
    });
    // Conversa recém-criada sem mensagem ainda: zera o unread que upsertConversation
    // teria incrementado (direction 'out' não deveria contar como não lida, mas
    // como ainda não existe mensagem alguma, garante o estado inicial correto).
    await db.query('UPDATE whatsapp_conversations SET unread_count = 0, last_message_at = NOW() WHERE id = ?', [conversation.id]);
    const [[fresh]] = await db.query('SELECT * FROM whatsapp_conversations WHERE id = ?', [conversation.id]);
    res.status(201).json(fresh);
  } catch (err) {
    console.error('[Conversations] Erro ao criar conversa:', err.message);
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
});

// PATCH /whatsapp/conversations/:id - Edita nome do contato (útil para leads sem nome)
router.patch('/conversations/:id', requireSuperAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { contact_name } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE whatsapp_conversations SET contact_name = ? WHERE id = ? AND tenant_id = ?',
      [contact_name || null, req.params.id, tenantId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Conversa não encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conversa' });
  }
});

// POST /whatsapp/conversations/:id/messages - Envia resposta manual numa conversa
router.post('/conversations/:id/messages', requireSuperAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória' });

  try {
    const [[conv]] = await db.query(
      'SELECT * FROM whatsapp_conversations WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

    const resp = await axios.post(`${BOT_URL}/conversations/${tenantId}/send`, {
      conversationId: conv.id,
      phone: conv.contact_phone,
      message,
      sentByUserId: req.user.id,
    });
    res.json(resp.data);
  } catch (err) {
    console.error('[Conversations] Erro ao enviar mensagem:', err.message);
    res.status(500).json({ error: err.response?.data?.error || 'Erro ao enviar mensagem' });
  }
});

module.exports = router;
