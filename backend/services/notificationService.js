const db = require('../db');
const wppService = require('./whatsappService');

/**
 * Serviço de Fila de Notificações
 * Gerencia o agendamento, envio e retentativa de mensagens via WhatsApp.
 */
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
  async enqueue({ tenant_id, recipient_phone, content, scheduled_at = null, metadata = null }) {
    try {
      if (!recipient_phone || !content) {
        throw new Error('Telefone e conteúdo são obrigatórios para enfileirar notificação.');
      }

      const [result] = await db.query(
        `INSERT INTO notification_queue (tenant_id, recipient_phone, content, scheduled_at, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [tenant_id, recipient_phone, content, scheduled_at, metadata ? JSON.stringify(metadata) : null]
      );

      return result.insertId;
    } catch (err) {
      console.error('❌ Erro ao enfileirar notificação:', err.message);
      throw err;
    }
  }

  /**
   * Processa as mensagens pendentes na fila
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Busca até 20 mensagens pendentes que já deveriam ter sido enviadas
      const [pending] = await db.query(
        `SELECT * FROM notification_queue 
         WHERE status = 'pending' 
           AND (scheduled_at IS NULL OR scheduled_at <= NOW())
           AND attempts < max_attempts
         LIMIT 20`
      );

      if (pending.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[NotificationQueue] Processando ${pending.length} mensagens...`);

      for (const item of pending) {
        try {
          // Tenta enviar via wppService
          const result = await wppService.sendReminder(item.tenant_id, item.recipient_phone, item.content);
          
          if (result === true) {
            // Sucesso
            await db.query(
              'UPDATE notification_queue SET status = ?, sent_at = NOW(), attempts = attempts + 1 WHERE id = ?',
              ['sent', item.id]
            );
          } else {
            // Erro retornado pelo serviço (ex: bot desconectado)
            const errorMsg = typeof result === 'string' ? result : 'Erro desconhecido no envio';
            await db.query(
              'UPDATE notification_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
              [errorMsg, item.id]
            );
            
            // Se excedeu o máximo de tentativas, marca como erro definitivo
            if (item.attempts + 1 >= item.max_attempts) {
              await db.query('UPDATE notification_queue SET status = ? WHERE id = ?', ['error', item.id]);
            }
          }
        } catch (err) {
          console.error(`[NotificationQueue] Erro crítico ao processar item ${item.id}:`, err.message);
          await db.query(
            'UPDATE notification_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
            [err.message, item.id]
          );
          if (item.attempts + 1 >= item.max_attempts) {
            await db.query('UPDATE notification_queue SET status = ? WHERE id = ?', ['error', item.id]);
          }
        }
      }
    } catch (err) {
      console.error('❌ Erro global no processamento da fila de notificações:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new NotificationService();
