const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { authorize } = require('../middleware/auth');
const { getFrontendUrl, getPortalUrl } = require('../utils/publicUrl');

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

// ── Central de Conversas da clínica ─────────────────────────────────────────
const requireConversationAccess = (req, res, next) => {
  if (!isTenantAdmin(req.user)) return res.status(403).json({ error: 'Acesso negado' });
  next();
};

// GET /whatsapp/conversations - Lista conversas do WhatsApp da própria clínica
router.get('/conversations', requireConversationAccess, async (req, res) => {
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
router.get('/conversations/:id/messages', requireConversationAccess, async (req, res) => {
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
router.get('/contacts/search', requireConversationAccess, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ items: [] });

  try {
    const like = `%${q}%`;
    const [patients] = await db.query(
      `SELECT p.id, p.name, COALESCE(p.whatsapp, p.phone) AS phone, p.tenant_id, t.name AS tenant_name
       FROM patients p JOIN tenants t ON t.id = p.tenant_id
       WHERE p.tenant_id = ? AND (p.name LIKE ? OR p.whatsapp LIKE ? OR p.phone LIKE ?)
       LIMIT 20`,
      [req.user.tenant_id, like, like, like]
    );
    const [users] = await db.query(
      `SELECT u.id, u.name, u.phone, u.tenant_id, t.name AS tenant_name
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.tenant_id = ? AND u.role IN ('admin', 'professional') AND (u.name LIKE ? OR u.phone LIKE ?)
       LIMIT 20`,
      [req.user.tenant_id, like, like]
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
router.post('/conversations', requireConversationAccess, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { phone, contactRef } = req.body;

  try {
    let rawPhone = phone;
    let contactName = null;

    if (contactRef) {
      const [kind, refId] = String(contactRef).split(':');
      if (kind === 'patient') {
        const [[p]] = await db.query('SELECT id, name, whatsapp, phone FROM patients WHERE id = ? AND tenant_id = ?', [refId, tenantId]);
        if (!p) return res.status(404).json({ error: 'Paciente não encontrado' });
        rawPhone = p.whatsapp || p.phone;
        contactName = p.name;
      } else if (kind === 'user') {
        const [[u]] = await db.query('SELECT name, phone FROM users WHERE id = ? AND tenant_id = ?', [refId, tenantId]);
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
    if (existing) {
      if (contactRef?.startsWith('patient:')) {
        await db.query(
          `UPDATE whatsapp_conversations
           SET patient_id = ?, contact_kind = 'patient', contact_name = ?, matched_tenant_id = ?
           WHERE id = ? AND tenant_id = ?`,
          [String(contactRef).split(':')[1], contactName, tenantId, existing.id, tenantId]
        );
        const [[updated]] = await db.query('SELECT * FROM whatsapp_conversations WHERE id = ? AND tenant_id = ?', [existing.id, tenantId]);
        return res.json(updated);
      }
      return res.json(existing);
    }

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
    if (contactRef?.startsWith('patient:')) {
      await db.query(
        `UPDATE whatsapp_conversations
         SET patient_id = ?, contact_kind = 'patient', contact_name = ?, matched_tenant_id = ?
         WHERE id = ? AND tenant_id = ?`,
        [String(contactRef).split(':')[1], contactName, tenantId, conversation.id, tenantId]
      );
    }
    const [[fresh]] = await db.query('SELECT * FROM whatsapp_conversations WHERE id = ?', [conversation.id]);
    res.status(201).json(fresh);
  } catch (err) {
    console.error('[Conversations] Erro ao criar conversa:', err.message);
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
});

// PATCH /whatsapp/conversations/:id - Edita nome do contato (útil para leads sem nome)
router.patch('/conversations/:id', requireConversationAccess, async (req, res) => {
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
router.post('/conversations/:id/messages', requireConversationAccess, async (req, res) => {
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

// GET /whatsapp/conversations/:id/documents - anexos já vinculados ao paciente
// da conversa. O tenant e o vínculo com o paciente são validados no servidor.
router.get('/conversations/:id/documents', requireConversationAccess, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [[conversation]] = await db.query(
      'SELECT patient_id FROM whatsapp_conversations WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    if (!conversation.patient_id) return res.json({ items: [] });

    const [uploads, receipts, invoices, anamneses, portalDocuments] = await Promise.all([
      db.query(
      `SELECT id, COALESCE(title, original_name, file_name, filename) AS title,
              COALESCE(original_name, file_name, filename) AS file_name,
              COALESCE(mime_type, file_type, 'application/octet-stream') AS mime_type,
              category, created_at
       FROM uploads
       WHERE tenant_id = ? AND patient_id = ? AND filename IS NOT NULL AND filename <> ''
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, conversation.patient_id]
      ),
      db.query(
        `SELECT id, rs_receipt_file, rs_receipt_issued_at AS created_at
         FROM financial_transactions
         WHERE tenant_id = ? AND patient_id = ? AND rs_receipt_file IS NOT NULL AND rs_receipt_file <> ''
         ORDER BY rs_receipt_issued_at DESC LIMIT 30`,
        [tenantId, conversation.patient_id]
      ),
      db.query(
        `SELECT ni.id, ni.numero, ni.chave_acesso, ni.nfse_pdf_path, ni.authorized_at AS created_at
         FROM nfse_invoices ni
         JOIN financial_transactions ft ON ft.id = ni.financial_transaction_id AND ft.tenant_id = ni.tenant_id
         WHERE ni.tenant_id = ? AND ft.patient_id = ? AND ni.status = 'authorized'
           AND ni.nfse_pdf_path IS NOT NULL AND ni.nfse_pdf_path <> ''
         ORDER BY ni.authorized_at DESC LIMIT 30`,
        [tenantId, conversation.patient_id]
      ),
      db.query(
        `SELECT s.id, s.title, s.status, s.created_at
         FROM anamnesis_sends s
         JOIN anamnesis_secure_links l ON l.send_id = s.id
           AND l.tenant_id = s.tenant_id AND l.patient_id = s.patient_id AND l.is_revoked = 0
         WHERE s.tenant_id = ? AND s.patient_id = ?
           AND s.status IN ('draft', 'sent', 'viewed', 'filling')
           AND (l.expires_at IS NULL OR l.expires_at > NOW())
         ORDER BY s.created_at DESC LIMIT 30`,
        [tenantId, conversation.patient_id]
      ),
      db.query(
        `SELECT id, title, created_at
         FROM doc_instances
         WHERE tenant_id = ? AND patient_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [tenantId, conversation.patient_id]
      ).catch(() => [[]]),
    ]);
    const items = [
      ...(uploads[0] || []).map(row => ({ ...row, id: `upload:${row.id}`, source: 'upload', kind: 'Anexo do paciente' })),
      ...(receipts[0] || []).filter(row => fs.existsSync(path.join(__dirname, '../public/uploads', path.basename(row.rs_receipt_file)))).map(row => ({
        id: `receipt:${row.id}`, title: 'Recibo Receita Saúde', file_name: path.basename(row.rs_receipt_file), mime_type: 'application/pdf', category: 'Financeiro', kind: 'Recibo', created_at: row.created_at, source: 'receipt',
      })),
      ...(invoices[0] || []).filter(row => fs.existsSync(row.nfse_pdf_path)).map(row => ({
        id: `nfse:${row.id}`, title: `NFS-e${row.numero ? ` nº ${row.numero}` : ''}`, file_name: `nota-fiscal-${row.chave_acesso || row.numero || row.id}.pdf`, mime_type: 'application/pdf', category: 'Financeiro', kind: 'Nota fiscal', created_at: row.created_at, source: 'nfse',
      })),
      ...(anamneses[0] || []).map(row => ({
        id: `anamnesis:${row.id}`, title: row.title, file_name: 'link-seguro-anamnese', mime_type: 'text/uri-list', category: 'Clínico', kind: 'Anamnese (link seguro)', created_at: row.created_at, source: 'anamnesis',
      })),
      ...(portalDocuments[0] || []).map(row => ({
        id: `portal-document:${row.id}`, title: row.title, file_name: 'documento-no-portal', mime_type: 'text/uri-list', category: 'Clínico', kind: 'Documento no Portal', created_at: row.created_at, source: 'portal-document',
      })),
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    res.json({ items });
  } catch (err) {
    console.error('[Conversations] Erro ao listar documentos:', err.message);
    res.status(500).json({ error: 'Erro ao listar documentos do paciente' });
  }
});

// POST /whatsapp/conversations/:id/documents/:documentId - envia um anexo,
// recibo ou NFS-e pertencente ao mesmo paciente da conversa.
router.post('/conversations/:id/documents/:documentId', requireConversationAccess, async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [source, rawId] = String(req.params.documentId).split(':');
    const documentId = Number(rawId);
    if (!['upload', 'receipt', 'nfse', 'anamnesis', 'portal-document'].includes(source) || !Number.isInteger(documentId)) {
      return res.status(400).json({ error: 'Documento inválido' });
    }

    let row;
    if (source === 'portal-document') {
      [[row]] = await db.query(
        `SELECT c.id AS conversation_id, c.contact_phone, c.patient_id, p.name AS patient_name, d.title
         FROM whatsapp_conversations c
         JOIN patients p ON p.id = c.patient_id AND p.tenant_id = c.tenant_id
         JOIN doc_instances d ON d.patient_id = c.patient_id AND d.tenant_id = c.tenant_id
         WHERE c.id = ? AND c.tenant_id = ? AND d.id = ?`,
        [req.params.id, tenantId, documentId]
      ).catch(() => [[]]);
      if (!row?.patient_id) return res.status(404).json({ error: 'Documento ou conversa não encontrados' });

      const intro = String(req.body?.caption || '').trim().slice(0, 700)
        || `Olá, ${row.patient_name || ''}! O documento "${row.title}" está disponível para você.`;
      const response = await axios.post(`${BOT_URL}/conversations/${tenantId}/send`, {
        conversationId: row.conversation_id,
        phone: row.contact_phone,
        message: `${intro}\n\nAcesse com segurança pelo Portal do Paciente:\n${getPortalUrl(req)}`,
        sentByUserId: req.user.id,
      });
      return res.json(response.data);
    } else if (source === 'anamnesis') {
      [[row]] = await db.query(
        `SELECT c.id AS conversation_id, c.contact_phone, c.patient_id,
                p.name AS patient_name, s.title, l.token AS secure_token
         FROM whatsapp_conversations c
         JOIN patients p ON p.id = c.patient_id AND p.tenant_id = c.tenant_id
         JOIN anamnesis_sends s ON s.patient_id = c.patient_id AND s.tenant_id = c.tenant_id
         JOIN anamnesis_secure_links l ON l.send_id = s.id
           AND l.tenant_id = s.tenant_id AND l.patient_id = s.patient_id AND l.is_revoked = 0
         WHERE c.id = ? AND c.tenant_id = ? AND s.id = ?
           AND s.status IN ('draft', 'sent', 'viewed', 'filling')
           AND (l.expires_at IS NULL OR l.expires_at > NOW())`,
        [req.params.id, tenantId, documentId]
      );
      if (!row?.secure_token) return res.status(404).json({ error: 'Link seguro não está mais disponível' });

      const link = `${getFrontendUrl(req)}/f/anamnese?t=${row.secure_token}`;
      const intro = String(req.body?.caption || '').trim().slice(0, 700)
        || `Olá, ${row.patient_name || ''}! Segue a anamnese "${row.title}" para preenchimento.`;
      const response = await axios.post(`${BOT_URL}/conversations/${tenantId}/send`, {
        conversationId: row.conversation_id,
        phone: row.contact_phone,
        message: `${intro}\n\n${link}\n\nSuas respostas são confidenciais.`,
        sentByUserId: req.user.id,
      });
      return res.json(response.data);
    } else if (source === 'upload') {
      [[row]] = await db.query(
        `SELECT c.id AS conversation_id, c.contact_phone, c.patient_id,
                u.filename, COALESCE(u.original_name, u.file_name, u.filename) AS file_name,
                COALESCE(u.mime_type, u.file_type, 'application/octet-stream') AS mime_type
         FROM whatsapp_conversations c
         JOIN uploads u ON u.patient_id = c.patient_id AND u.tenant_id = c.tenant_id
         WHERE c.id = ? AND c.tenant_id = ? AND u.id = ?`,
        [req.params.id, tenantId, documentId]
      );
      if (row) row.file_path = path.join(__dirname, '../public/uploads', path.basename(row.filename));
    } else if (source === 'receipt') {
      [[row]] = await db.query(
        `SELECT c.id AS conversation_id, c.contact_phone, c.patient_id,
                t.rs_receipt_file AS filename, CONCAT('recibo-receita-saude-', t.id, '.pdf') AS file_name,
                'application/pdf' AS mime_type
         FROM whatsapp_conversations c
         JOIN financial_transactions t ON t.patient_id = c.patient_id AND t.tenant_id = c.tenant_id
         WHERE c.id = ? AND c.tenant_id = ? AND t.id = ? AND t.rs_receipt_file IS NOT NULL`,
        [req.params.id, tenantId, documentId]
      );
      if (row) row.file_path = path.join(__dirname, '../public/uploads', path.basename(row.filename));
    } else {
      [[row]] = await db.query(
        `SELECT c.id AS conversation_id, c.contact_phone, c.patient_id,
                ni.nfse_pdf_path AS file_path,
                CONCAT('nota-fiscal-', COALESCE(ni.chave_acesso, ni.numero, ni.id), '.pdf') AS file_name,
                'application/pdf' AS mime_type
         FROM whatsapp_conversations c
         JOIN financial_transactions t ON t.patient_id = c.patient_id AND t.tenant_id = c.tenant_id
         JOIN nfse_invoices ni ON ni.financial_transaction_id = t.id AND ni.tenant_id = t.tenant_id
         WHERE c.id = ? AND c.tenant_id = ? AND ni.id = ? AND ni.status = 'authorized'`,
        [req.params.id, tenantId, documentId]
      );
    }
    if (!row?.patient_id) return res.status(404).json({ error: 'Documento ou conversa não encontrados' });
    if (!row.file_path || !fs.existsSync(row.file_path)) return res.status(404).json({ error: 'Arquivo não está mais disponível no servidor' });

    const caption = String(req.body?.caption || '').trim().slice(0, 1000);
    const response = await axios.post(`${BOT_URL}/conversations/${tenantId}/send-document`, {
      conversationId: row.conversation_id,
      phone: row.contact_phone,
      filePath: row.file_path,
      fileName: row.file_name,
      caption,
      mimeType: row.mime_type,
      sentByUserId: req.user.id,
    }, { timeout: 45000 });
    res.json(response.data);
  } catch (err) {
    console.error('[Conversations] Erro ao enviar documento:', err.message);
    res.status(500).json({ error: err.response?.data?.error || 'Erro ao enviar documento pelo WhatsApp' });
  }
});

module.exports = router;
