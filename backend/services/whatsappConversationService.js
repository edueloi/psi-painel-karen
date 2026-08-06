const db = require('../db');
const wppService = require('./whatsappService');
const { brazilJidCandidates } = wppService;

/**
 * Persistência do histórico de conversas do bot WhatsApp master (super_admin).
 * Usado tanto pelo processo bot (backend/bot.js, recebe/envia via Baileys)
 * quanto pelo backend principal (backend/routes/whatsapp.js, lê para exibir
 * na Central de Conversas) — ambos compartilham o mesmo pool MySQL.
 */

async function ensureSchema() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        contact_jid VARCHAR(50) NOT NULL,
        contact_name VARCHAR(150) NULL,
        contact_kind ENUM('patient','user','lead') NOT NULL DEFAULT 'lead',
        patient_id INT NULL,
        matched_user_id INT NULL,
        matched_tenant_id INT NULL,
        last_message_at DATETIME NOT NULL,
        last_message_preview VARCHAR(180) NULL,
        last_direction ENUM('in','out') NULL,
        unread_count INT NOT NULL DEFAULT 0,
        bot_paused_until DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_tenant_phone (tenant_id, contact_phone),
        KEY idx_tenant_last_message (tenant_id, last_message_at),
        KEY idx_patient (patient_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        conversation_id BIGINT NOT NULL,
        direction ENUM('in','out') NOT NULL,
        body TEXT NOT NULL,
        status ENUM('sent','delivered','read','failed','received') NOT NULL DEFAULT 'sent',
        wa_message_id VARCHAR(80) NULL,
        sent_by_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_conversation_created (conversation_id, created_at),
        CONSTRAINT fk_wmsg_conversation FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tabelas whatsapp_conversations / whatsapp_messages garantidas');
  } catch (err) {
    console.error('❌ Erro ao garantir schema de conversas do WhatsApp:', err.message);
  }
}

// Compara o telefone (já normalizado, só dígitos) contra patients/users
// tentando as variantes com/sem o 9º dígito, igual à lógica de envio.
async function findContactMatch(phoneDigits) {
  const candidates = brazilJidCandidates(phoneDigits);
  if (!candidates.length) return null;

  const placeholders = candidates.map(() => '?').join(',');

  try {
    const [patientRows] = await db.query(
      `SELECT id, name, tenant_id FROM patients
       WHERE whatsapp IN (${placeholders}) OR phone IN (${placeholders}) OR phone2 IN (${placeholders})
       LIMIT 1`,
      [...candidates, ...candidates, ...candidates]
    );
    if (patientRows[0]) {
      return {
        kind: 'patient',
        patientId: patientRows[0].id,
        matchedUserId: null,
        matchedTenantId: patientRows[0].tenant_id,
        name: patientRows[0].name,
      };
    }
  } catch (e) {
    console.error('[WhatsAppConv] Erro ao buscar paciente por telefone:', e.message);
  }

  try {
    const [userRows] = await db.query(
      `SELECT id, name, tenant_id FROM users
       WHERE phone IN (${placeholders}) AND role IN ('admin', 'professional')
       LIMIT 1`,
      candidates
    );
    if (userRows[0]) {
      return {
        kind: 'user',
        patientId: null,
        matchedUserId: userRows[0].id,
        matchedTenantId: userRows[0].tenant_id,
        name: userRows[0].name,
      };
    }
  } catch (e) {
    console.error('[WhatsAppConv] Erro ao buscar usuário por telefone:', e.message);
  }

  return null;
}

async function upsertConversation(tenantId, { phoneDigits, jid, previewText, direction, pushName }) {
  const [[existing]] = await db.query(
    'SELECT * FROM whatsapp_conversations WHERE tenant_id = ? AND contact_phone = ? LIMIT 1',
    [tenantId, phoneDigits]
  );

  let match = null;
  if (!existing || (!existing.patient_id && !existing.matched_user_id)) {
    match = await findContactMatch(phoneDigits);
  }

  if (!existing) {
    const kind = match?.kind || 'lead';
    const name = match?.name || pushName || null;
    await db.query(
      `INSERT INTO whatsapp_conversations
         (tenant_id, contact_phone, contact_jid, contact_name, contact_kind,
          patient_id, matched_user_id, matched_tenant_id,
          last_message_at, last_message_preview, last_direction, unread_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        tenantId, phoneDigits, jid, name, kind,
        match?.patientId || null, match?.matchedUserId || null, match?.matchedTenantId || null,
        previewText || null, direction, direction === 'in' ? 1 : 0,
      ]
    );
  } else {
    const nextUnread = direction === 'in' ? existing.unread_count + 1 : existing.unread_count;
    const patientId = existing.patient_id || match?.patientId || null;
    const matchedUserId = existing.matched_user_id || match?.matchedUserId || null;
    const matchedTenantId = existing.matched_tenant_id || match?.matchedTenantId || null;
    const contactKind = existing.contact_kind !== 'lead' ? existing.contact_kind : (match?.kind || existing.contact_kind);
    const contactName = existing.contact_name || match?.name || pushName || null;

    await db.query(
      `UPDATE whatsapp_conversations SET
         contact_jid = ?, contact_name = ?, contact_kind = ?,
         patient_id = ?, matched_user_id = ?, matched_tenant_id = ?,
         last_message_at = NOW(), last_message_preview = ?, last_direction = ?, unread_count = ?
       WHERE id = ?`,
      [jid, contactName, contactKind, patientId, matchedUserId, matchedTenantId, previewText || null, direction, nextUnread, existing.id]
    );
  }

  const [[conversation]] = await db.query(
    'SELECT * FROM whatsapp_conversations WHERE tenant_id = ? AND contact_phone = ? LIMIT 1',
    [tenantId, phoneDigits]
  );
  return conversation;
}

async function insertMessage(conversationId, { direction, body, waMessageId = null, sentByUserId = null, status = 'sent' }) {
  const [result] = await db.query(
    `INSERT INTO whatsapp_messages (conversation_id, direction, body, status, wa_message_id, sent_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [conversationId, direction, body, status, waMessageId, sentByUserId]
  );
  const [[message]] = await db.query('SELECT * FROM whatsapp_messages WHERE id = ?', [result.insertId]);
  return message;
}

async function touchConversation(conversationId, { previewText, direction }) {
  await db.query(
    `UPDATE whatsapp_conversations SET
       last_message_at = NOW(), last_message_preview = ?, last_direction = ?,
       unread_count = IF(? = 'in', unread_count + 1, unread_count)
     WHERE id = ?`,
    [previewText || null, direction, direction, conversationId]
  );
}

async function pauseBotFor(conversationId, minutes = 30) {
  await db.query(
    'UPDATE whatsapp_conversations SET bot_paused_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
    [minutes, conversationId]
  );
}

async function isBotPaused(conversationId) {
  const [[row]] = await db.query(
    'SELECT bot_paused_until FROM whatsapp_conversations WHERE id = ?',
    [conversationId]
  );
  if (!row?.bot_paused_until) return false;
  return new Date(row.bot_paused_until).getTime() > Date.now();
}

// Fire-and-forget: avisa o backend principal (porta 3013) para repassar via
// WebSocket (/ws/sync). Nunca deve travar o listener do Baileys — por isso
// não é aguardado por quem chama e qualquer falha só é logada.
function notifyBackend(tenantId, event) {
  const port = process.env.PORT || 3013;
  fetch(`http://127.0.0.1:${port}/api/internal/whatsapp-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: String(tenantId), ...event }),
  }).catch((e) => console.error('[WhatsAppConv] Falha ao notificar backend:', e.message));
}

module.exports = {
  ensureSchema,
  findContactMatch,
  upsertConversation,
  insertMessage,
  touchConversation,
  pauseBotFor,
  isBotPaused,
  notifyBackend,
};
