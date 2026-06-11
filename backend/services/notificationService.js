const db = require('../db');
const wppService = require('./whatsappService');

/**
 * Serviço de Fila de Notificações
 * Gerencia o agendamento, envio e retentativa de mensagens via WhatsApp.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mapeia o type do metadata para a coluna de tracking em appointments.
// Quando uma mensagem morre na fila (erro definitivo/expirada), a flag é zerada
// para o cron poder reenfileirar se o agendamento ainda estiver na janela de lembrete.
const APPOINTMENT_FLAG_BY_TYPE = {
  '1h-reminder-patient':   'whatsapp_reminder_1h_sent',
  '24h-reminder-patient':  'whatsapp_reminder_24h_sent',
  'reminder-professional': 'whatsapp_reminder_professional_sent',
  'personal-event-1h':     'whatsapp_reminder_personal_1h_sent',
  'personal-event-24h':    'whatsapp_reminder_personal_24h_sent',
};

class NotificationService {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Garante que a tabela de fila existe
   */
  async ensureSchema() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS notification_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL,
          recipient_phone VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          status ENUM('pending', 'sent', 'error', 'canceled') DEFAULT 'pending',
          attempts INT DEFAULT 0,
          max_attempts INT DEFAULT 10,
          last_error TEXT,
          scheduled_at TIMESTAMP NULL,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sent_at TIMESTAMP NULL,
          metadata JSON NULL,
          INDEX idx_status_scheduled (status, scheduled_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ Tabela notification_queue garantida');
    } catch (err) {
      console.error('❌ Erro ao garantir schema de notificações:', err.message);
    }
  }

  /**
   * Adiciona uma mensagem à fila
   */
  async enqueue({ tenant_id, recipient_phone, content, scheduled_at = null, expires_at = null, metadata = null }) {
    try {
      if (!recipient_phone || !content) {
        throw new Error('Telefone e conteúdo são obrigatórios para enfileirar notificação.');
      }

      const [result] = await db.query(
        `INSERT INTO notification_queue (tenant_id, recipient_phone, content, scheduled_at, expires_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenant_id, recipient_phone, content, scheduled_at, expires_at, metadata ? JSON.stringify(metadata) : null]
      );

      return result.insertId;
    } catch (err) {
      console.error('❌ Erro ao enfileirar notificação:', err.message);
      throw err;
    }
  }

  /**
   * Processa as mensagens pendentes na fila, agrupadas por tenant.
   * Cada tenant é processado em paralelo — um tenant com bot offline não bloqueia os outros.
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Busca até 50 mensagens pendentes por vez, agrupadas por tenant
      const [pending] = await db.query(
        `SELECT * FROM notification_queue
         WHERE status = 'pending'
           AND (scheduled_at IS NULL OR scheduled_at <= NOW())
           AND attempts < max_attempts
         ORDER BY tenant_id ASC, created_at ASC
         LIMIT 50`
      );

      if (pending.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Agrupa mensagens por tenant
      const byTenant = {};
      for (const item of pending) {
        if (!byTenant[item.tenant_id]) byTenant[item.tenant_id] = [];
        byTenant[item.tenant_id].push(item);
      }

      const tenantIds = Object.keys(byTenant);
      console.log(`[NotificationQueue] ${pending.length} mensagens em ${tenantIds.length} tenant(s)...`);

      // Processa cada tenant em paralelo (sem bloquear uns aos outros)
      await Promise.all(tenantIds.map(tenantId => this._processTenantQueue(byTenant[tenantId])));

    } catch (err) {
      console.error('❌ Erro global no processamento da fila de notificações:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processa a sub-fila de um único tenant em sequência (com delay entre envios)
   */
  async _processTenantQueue(items) {
    for (const item of items) {
      try {
        // CANCELAMENTO AUTOMÁTICO SE EXPIRADO
        if (item.expires_at && new Date(item.expires_at) < new Date()) {
          await db.query("UPDATE notification_queue SET status = 'canceled', last_error = 'Expirada' WHERE id = ?", [item.id]);
          console.log(`[NotificationQueue] Mensagem ${item.id} (tenant ${item.tenant_id}) expirada e cancelada.`);
          await this._releaseAppointmentFlag(item);
          continue;
        }

        const result = await wppService.sendReminder(item.tenant_id, item.recipient_phone, item.content);

        if (result === true) {
          await db.query(
            'UPDATE notification_queue SET status = ?, sent_at = NOW(), attempts = attempts + 1 WHERE id = ?',
            ['sent', item.id]
          );
          console.log(`[NotificationQueue] ✅ Enviado id=${item.id} tenant=${item.tenant_id}`);
        } else {
          const errorMsg = typeof result === 'string' ? result : 'Erro desconhecido no envio';
          // Erro permanente (número sem WhatsApp / inválido): retry não resolve — falha imediata
          // e a flag NÃO é liberada, senão o cron reenfileira em loop até a janela passar.
          const isPermanent = /não possui WhatsApp|destino inválido/i.test(errorMsg);
          const newAttempts = item.attempts + 1;
          const newStatus = (isPermanent || newAttempts >= item.max_attempts) ? 'error' : 'pending';
          await db.query(
            'UPDATE notification_queue SET status = ?, attempts = ?, last_error = ? WHERE id = ?',
            [newStatus, newAttempts, errorMsg, item.id]
          );
          if (newStatus === 'error') {
            console.log(`[NotificationQueue] ❌ Falha definitiva id=${item.id} tenant=${item.tenant_id}: ${errorMsg}`);
            if (!isPermanent) await this._releaseAppointmentFlag(item);
          }
        }

        // Delay entre envios do mesmo tenant para não sobrecarregar o WhatsApp
        await sleep(3000);

      } catch (err) {
        console.error(`[NotificationQueue] Erro crítico ao processar item ${item.id}:`, err.message);
        const newAttempts = item.attempts + 1;
        const newStatus = newAttempts >= item.max_attempts ? 'error' : 'pending';
        await db.query(
          'UPDATE notification_queue SET status = ?, attempts = ?, last_error = ? WHERE id = ?',
          [newStatus, newAttempts, err.message, item.id]
        );
        if (newStatus === 'error') {
          await this._releaseAppointmentFlag(item);
        }
      }
    }
  }

  /**
   * Zera a flag de "já enviado" do agendamento quando a mensagem morre na fila.
   * Assim o cron reenfileira automaticamente se ainda estiver dentro da janela do lembrete.
   */
  async _releaseAppointmentFlag(item) {
    try {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
      const column = APPOINTMENT_FLAG_BY_TYPE[meta.type];
      if (!column || !meta.apt_id) return;
      await db.query(`UPDATE appointments SET \`${column}\` = 0 WHERE id = ?`, [meta.apt_id]);
      console.log(`[NotificationQueue] Flag ${column} liberada para reenvio (apt ${meta.apt_id}).`);
    } catch (err) {
      console.error(`[NotificationQueue] Erro ao liberar flag do item ${item.id}:`, err.message);
    }
  }
}

module.exports = new NotificationService();
