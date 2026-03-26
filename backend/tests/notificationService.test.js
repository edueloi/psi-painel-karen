import { describe, it, expect, vi, beforeEach } from 'vitest';

// Estratégia de Mock Manual (Injectando Spies no módulo já carregado)
const db = require('../db');
const wppService = require('../services/whatsappService');

// Injeta espiões nas funções reais
db.query = vi.fn();
wppService.sendReminder = vi.fn();

const notificationService = require('../services/notificationService');

describe('NotificationService - Failure Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ajustado para retornar um objeto simples no primeiro item (comportamento do mysql2 para INSERT)
    db.query.mockResolvedValue([{ insertId: 999 }, []]); 
  });

  it('should mark status as "error" when max attempts are reached', async () => {
    // 1. Mensagem que já está na última tentativa (9/10)
    const mockPendingMessage = { 
        id: 1, 
        tenant_id: 1, 
        recipient_phone: '5511999999999', 
        content: 'Teste 10', 
        attempts: 9, 
        max_attempts: 10,
        expires_at: null 
    };
    
    // Mock para buscar mensagens pendentes
    db.query.mockResolvedValueOnce([[mockPendingMessage]]);
    
    // Mock para falha no envio do WhatsApp
    wppService.sendReminder.mockResolvedValueOnce('Erro: Bot desconectado');

    await notificationService.processQueue();

    // Verificamos se foi marcada como error por exceder tentativas
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notification_queue SET status = ?"),
      ['error', 1]
    );
  });

  it('should cancel the message if it has already expired', async () => {
    // 1. Mensagem com expires_at no passado
    const pastDate = new Date(Date.now() - 600000).toISOString(); // 10 min atrás
    const mockExpiredMessage = { 
        id: 2, 
        expires_at: pastDate,
        status: 'pending' 
    };
    
    db.query.mockResolvedValueOnce([[mockExpiredMessage]]);

    await notificationService.processQueue();

    // Verificar se ela foi cancelada automaticamente
    expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE notification_queue SET status = 'canceled'"),
        [2]
    );
    
    // O WhatsApp NUNCA deve ser chamado para mensagens expiradas
    expect(wppService.sendReminder).not.toHaveBeenCalled();
  });

  it('should retry messages if they fail but still have attempts left', async () => {
    const mockRetryMessage = { 
        id: 3, 
        tenant_id: 1, 
        recipient_phone: '123', 
        content: 'Retry', 
        attempts: 0, 
        max_attempts: 10,
        expires_at: null 
    };
    
    db.query.mockResolvedValueOnce([[mockRetryMessage]]);
    wppService.sendReminder.mockResolvedValueOnce('Falhou desta vez');

    await notificationService.processQueue();

    // Verificamos se incrementou o contador de tentativas sem mudar para error
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notification_queue SET attempts = attempts + 1"),
      ['Falhou desta vez', 3]
    );
    
    // Não deve ter chamado o update de status para 'error' ainda
    expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining("status = ?"),
        ['error', 3]
    );
  });

  it('should successfully enqueue a message', async () => {
    const data = {
      tenant_id: 1,
      recipient_phone: '123',
      content: 'Hello'
    };
    
    const id = await notificationService.enqueue(data);
    
    expect(id).toBe(999);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notification_queue'),
      expect.anything()
    );
  });
});
