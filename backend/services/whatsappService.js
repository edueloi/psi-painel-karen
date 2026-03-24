const wppconnect = require('@wppconnect-team/wppconnect');
const db = require('../db');
const path = require('path');
const fs = require('fs');

class WhatsAppManager {
  constructor() {
    this.instances = new Map(); // tenant_id -> { client, status, qrcode, phone, initializing, instanceName }
    this.tokensPath = path.join(__dirname, '../tokens'); 
  }

  // Ensures we have an entry for the tenant
  getTenantData(tenantId) {
    if (!this.instances.has(tenantId)) {
      this.instances.set(tenantId, {
        client: null,
        status: 'disconnected',
        qrcode: null,
        phone: null,
        initializing: false,
        instanceName: `psiflux-bot-tenant-${tenantId}`
      });
    }
    return this.instances.get(tenantId);
  }

  getStatus(tenantId) {
    const data = this.getTenantData(tenantId);
    return {
      status: data.status,
      qrcode: data.qrcode,
      phone: data.phone,
    };
  }

  async connect(tenantId, forceNew = false) {
    console.log(`🚀 Recebida solicitação de conexão WhatsApp para Tenant ${tenantId}...`);
    const data = this.getTenantData(tenantId);

    if (data.status === 'connected') return;

    if (data.client) {
      console.log(`[WPP] Encerrando instância anterior do Tenant ${tenantId}...`);
      try { await data.client.close(); } catch(e) {}
      data.client = null;
    }

    if (forceNew) {
      const sessionFolder = path.join(this.tokensPath, data.instanceName);
      if (fs.existsSync(sessionFolder)) {
        console.log(`[WPP] Removendo arquivos de sessão antigos do Tenant ${tenantId}...`);
        try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch(e) {}
      }
    }
    
    data.status = 'connecting';
    data.qrcode = null;
    this.createClient(tenantId, data);
  }

  async createClient(tenantId, data) {
    if (data.initializing) return;
    data.initializing = true;
    
    console.log(`🚀 Iniciando conexão WhatsApp Tenant ${tenantId}...`);
    data.status = 'connecting';

    try {
      data.client = await wppconnect.create({
        session: data.instanceName,
        catchQR: (base64Qr, asciiQR, attempts) => {
          data.qrcode = base64Qr;
          data.status = 'connecting';
          console.log(`[WPP Tenant ${tenantId}] QR Code recebido (Tentativa ${attempts})`);
        },
        statusFind: (statusSession) => {
          console.log(`[WPP Tenant ${tenantId}] Status: ${statusSession}`);
          if (['isLogged', 'qrReadSuccess', 'chatsAvailable'].includes(statusSession)) {
            data.status = 'connected';
            data.qrcode = null;
            data.initializing = false;
          }
          if (statusSession === 'notLogged') {
            data.status = 'connecting';
          }
          if (statusSession === 'desloged') {
            data.status = 'disconnected';
            data.phone = null;
            data.initializing = false;
            db.query('UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?', ['disconnected', null, tenantId]).catch(()=>{});
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

      data.status = 'connected';
      data.qrcode = null;
      data.initializing = false;

      try {
        const hostDevice = await data.client.getHostDevice();
        data.phone = hostDevice?.wid?.user || hostDevice?.wid?._serialized?.split('@')[0] || 'Conectado';
      } catch (e) {
        console.warn(`⚠️ Não foi possível obter o número do bot Tenant ${tenantId}:`, e.message);
        data.phone = 'Conectado';
      }

      await db.query(
        'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ?, whatsapp_instance = ? WHERE id = ?',
        ['connected', data.phone, data.instanceName, tenantId]
      );

      console.log(`✅ WhatsApp Tenant ${tenantId} Conectado: ${data.phone}`);
      
      // Ping pong setup
      data.client.onMessage((message) => {
        if (message.body === 'ping') {
          data.client.sendText(message.from, 'pong');
        }
      });

    } catch (err) {
      data.initializing = false;
      console.error(`❌ Erro ao inicializar WPPConnect Tenant ${tenantId}:`, err.message);
      data.status = 'disconnected';
      data.qrcode = null;
    }
  }

  async disconnect(tenantId) {
    const data = this.getTenantData(tenantId);
    if (data.client) {
      try {
        await data.client.logout();
        await data.client.close();
      } catch (e) {
        console.error('Erro ao fechar cliente WPP:', e.message);
      }
    }
    data.client = null;
    data.status = 'disconnected';
    data.qrcode = null;
    data.phone = null;

    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?',
      ['disconnected', null, tenantId]
    );
  }

  async sendReminder(tenantId, to, text) {
    const data = this.getTenantData(tenantId);
    if (data.status !== 'connected' || !data.client) {
      console.warn(`⚠️ Tentativa de envio s/ WhatsApp conectado para Tenant ${tenantId}. Status:`, data.status);
      return false;
    }

    try {
      let clean = to.replace(/\D/g, '');
      if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
      }
      const formattedTo = clean.includes('@c.us') ? clean : `${clean}@c.us`;
      
      console.log(`📤 Enviando via WhatsApp (Tenant ${tenantId}) para: ${formattedTo}...`);
      await data.client.sendText(formattedTo, text);
      return true;
    } catch (err) {
      console.error(`❌ Erro Real ao enviar para ${to} (Tenant ${tenantId}):`, err.message);
      return false;
    }
  }

  async recoverActiveSessions() {
    try {
      const [rows] = await db.query("SELECT id FROM tenants WHERE whatsapp_status = 'connected'");
      for (const row of rows) {
        console.log(`🔄 Recuperando conexão WhatsApp do Tenant ${row.id}...`);
        this.connect(row.id, false).catch(e => console.error(e));
      }
    } catch(e) {
      console.error('Erro ao recuperar sessoes', e);
    }
  }
}

// Singleton
const service = new WhatsAppManager();
module.exports = service;
