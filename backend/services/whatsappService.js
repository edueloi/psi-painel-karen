const wppconnect = require('@wppconnect-team/wppconnect');
const db = require('../db');
const path = require('path');

/**
 * WhatsAppService - Serviço Global para o Bot do Super Admin
 * Gerencia a conexão com o WPPConnect para envio de lembretes do sistema.
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'disconnected';
    this.qrcode = null;
    this.instanceName = 'psiflux-system-bot';
    this.phone = null;
    // Movemos a pasta de tokens para fora para evitar o --watch do node reiniciar o servidor em loop
    this.tokensPath = path.join(__dirname, '../../whatsapp_tokens'); 
  }

  getStatus() {
    return {
      status: this.status,
      qrcode: this.qrcode,
      phone: this.phone,
    };
  }

  async connect() {
    if (this.status === 'connected') return;

    console.log('🚀 Iniciando conexão WhatsApp Global...');
    this.status = 'connecting';

    try {
      this.client = await wppconnect.create({
        session: this.instanceName,
        mkdirFolder: this.tokensPath, // Define caminho customizado para os tokens
        catchQR: (base64Qr) => {
          this.qrcode = base64Qr;
          this.status = 'connecting';
        },
        statusFind: (statusSession) => {
          console.log(`[WPP] Status da Sessão: ${statusSession}`);
          if (['isLogged', 'qrReadSuccess', 'chatsAvailable'].includes(statusSession)) {
            this.status = 'connected';
            this.qrcode = null;
          }
          if (['desloged', 'notLogged'].includes(statusSession)) {
            this.status = 'disconnected';
            this.phone = null;
          }
        },
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        autoClose: 0, 
      });

      this.status = 'connected';
      this.qrcode = null;

      try {
        const hostDevice = await this.client.getHostDevice();
        this.phone = hostDevice?.wid?.user || hostDevice?.wid?._serialized?.split('@')[0] || 'Conectado';
      } catch (e) {
        console.warn('⚠️ Não foi possível obter o número do bot imediatamente:', e.message);
        this.phone = 'Conectado';
      }

      // Salva no banco para persistência (Tenant 1 é o Master/Global)
      await db.query(
        'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ?, whatsapp_instance = ? WHERE id = 1',
        ['connected', this.phone, this.instanceName]
      );

      console.log(`✅ WhatsApp Global Conectado: ${this.phone}`);

      // Setup listeners (opcional)
      this.setupListeners();

    } catch (err) {
      console.error('❌ Erro ao inicializar WPPConnect:', err.message);
      this.status = 'disconnected';
      this.qrcode = null;
      throw err;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.logout();
        await this.client.close();
      } catch (e) {
        console.error('Erro ao fechar cliente WPP:', e.message);
      }
    }
    this.client = null;
    this.status = 'disconnected';
    this.qrcode = null;
    this.phone = null;

    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = 1',
      ['disconnected', null]
    );
  }

  setupListeners() {
    if (!this.client) return;
    
    // Podemos ouvir mensagens aqui se precisarmos de comandos
    this.client.onMessage((message) => {
      if (message.body === 'ping') {
        this.client.sendText(message.from, 'pong');
      }
    });
  }

  async sendReminder(to, text) {
    if (this.status !== 'connected' || !this.client) {
      console.warn('⚠️ Tentativa de envio s/ WhatsApp conectado. Status:', this.status);
      return false;
    }

    try {
      // Formata número (ex: 5515999998888@c.us)
      let clean = to.replace(/\D/g, '');
      
      // Se tiver 10 ou 11 dígitos, provavelmente é Brasil sem o código do país prefixado
      if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
      }
      
      const formattedTo = clean.includes('@c.us') ? clean : `${clean}@c.us`;
      
      console.log(`📤 Enviando via WhatsApp para: ${formattedTo}...`);
      await this.client.sendText(formattedTo, text);
      return true;
    } catch (err) {
      console.error(`❌ Erro Real ao enviar para ${to}:`, err.message);
      return false;
    }
  }
}

// Singleton
const service = new WhatsAppService();
module.exports = service;
