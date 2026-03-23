const wppconnect = require('@wppconnect-team/wppconnect');
const db = require('../db');
const path = require('path');
const fs = require('fs');

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
    this.isInitializing = false;
    // Movemos a pasta de tokens para 'backend/tokens' para centralizar
    this.tokensPath = path.join(__dirname, '../tokens'); 
  }

  getStatus() {
    return {
      status: this.status,
      qrcode: this.qrcode,
      phone: this.phone,
    };
  }

  async connect() {
    console.log('🚀 Recebida solicitação de conexão WhatsApp Global...');

    if (this.status === 'connected') return;

    // Se já estiver tentando, vamos encerrar a instância anterior se possível
    if (this.client) {
      console.log('[WPP] Encerrando instância anterior...');
      try { await this.client.close(); } catch(e) {}
      this.client = null;
    }

    // LIMPEZA CRÍTICA: Se não está conectado, apaga a pasta da sessão para forçar QR Code novo
    const sessionFolder = path.join(this.tokensPath, this.instanceName);
    if (fs.existsSync(sessionFolder)) {
      console.log('[WPP] Removendo arquivos de sessão antigos...');
      try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch(e) {}
    }
    
    this.status = 'connecting';
    this.qrcode = null;
    this.createClient();
  }
  async createClient() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    console.log('🚀 Iniciando conexão WhatsApp Global...');
    this.status = 'connecting';

    try {
      this.client = await wppconnect.create({
        session: this.instanceName,
        catchQR: (base64Qr, asciiQR, attempts) => {
          this.qrcode = base64Qr;
          this.status = 'connecting';
          console.log(`[WPP] QR Code recebido (Tentativa ${attempts})`);
          if (base64Qr) console.log(`[WPP] QR Base64 (início): ${base64Qr.substring(0, 50)}...`);
        },
        statusFind: (statusSession) => {
          console.log(`[WPP] Status da Sessão: ${statusSession}`);
          if (['isLogged', 'qrReadSuccess', 'chatsAvailable'].includes(statusSession)) {
            this.status = 'connected';
            this.qrcode = null;
            this.isInitializing = false;
          }
          if (['desloged', 'notLogged'].includes(statusSession)) {
            this.status = 'disconnected';
            this.phone = null;
            this.isInitializing = false;
          }
        },
        mkdirFolder: this.tokensPath,
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        browserArgs: process.platform === 'linux' 
          ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--disable-gpu']
          : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        autoClose: 0,
        tokenStore: 'file',
      });

      this.status = 'connected';
      this.qrcode = null;
      this.isInitializing = false;

      try {
        const hostDevice = await this.client.getHostDevice();
        this.phone = hostDevice?.wid?.user || hostDevice?.wid?._serialized?.split('@')[0] || 'Conectado';
      } catch (e) {
        console.warn('⚠️ Não foi possível obter o número do bot imediatamente:', e.message);
        this.phone = 'Conectado';
      }

      await db.query(
        'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ?, whatsapp_instance = ? WHERE id = 1',
        ['connected', this.phone, this.instanceName]
      );

      console.log(`✅ WhatsApp Global Conectado: ${this.phone}`);
      this.setupListeners();

    } catch (err) {
      this.isInitializing = false;
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
