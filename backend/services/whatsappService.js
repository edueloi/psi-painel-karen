const wppconnect = require('@wppconnect-team/wppconnect');
const db = require('../db');
const path = require('path');
const fs = require('fs');

class WhatsAppManager {
  constructor() {
    this.instances = new Map(); // tenant_id -> { client, status, qrcode, phone, initializing, instanceName }
    this.tokensPath = path.join(__dirname, '../tokens'); 
    
    // Garante que a pasta de tokens existee
    if (!fs.existsSync(this.tokensPath)) {
      try { fs.mkdirSync(this.tokensPath, { recursive: true }); } catch (e) {
         console.error('❌ Erro ao criar pasta de tokens:', e.message);
      }
    }
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
      initializing: data.initializing,
    };
  }

  async connect(tenantId, forceNew = false) {
    console.log(`🚀 Recebida solicitação de conexão WhatsApp para Tenant ${tenantId}...`);
    const data = this.getTenantData(tenantId);

    if (data.status === 'connected') {
      console.log(`[WPP] Tenant ${tenantId} já está conectado.`);
      return;
    }

    if (data.client) {
      console.log(`[WPP] Encerrando instância anterior do Tenant ${tenantId}...`);
      try {
        if (typeof data.client.removeAllListeners === 'function') data.client.removeAllListeners();
        await data.client.close();
      } catch(e) {}
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
    if (data.initializing) {
      console.log(`[WPP] Inicialização já em curso para Tenant ${tenantId}. Ignorando duplicata.`);
      return;
    }
    data.initializing = true;
    
    console.log(`🚀 [Passo 1/3] Iniciando WPPConnect para Tenant ${tenantId}...`);
    data.status = 'connecting';

    try {
      data.client = await wppconnect.create({
        session: data.instanceName,
        catchQR: (base64Qr, asciiQR, attempts) => {
          data.qrcode = base64Qr;
          data.status = 'connecting';
          if (attempts === 1) console.log(`🚀 [Passo 2/3] QR Code pronto para Tenant ${tenantId}!`);
        },
        statusFind: (statusSession) => {
          console.log(`[WPP Tenant ${tenantId}] Status da Sessão: ${statusSession}`);
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
            // Auto-reconexão: aguarda 35 segundos e tenta reconectar sem forçar novo QR
            console.log(`[WPP] Tenant ${tenantId} desconectado — agendando reconexão automática em 35s...`);
            setTimeout(() => {
              if (data.status === 'disconnected' && !data.initializing) {
                console.log(`[WPP] Tentando reconectar automaticamente Tenant ${tenantId}...`);
                this.connect(tenantId, false).catch(e => console.error(`[WPP] Auto-reconnect Tenant ${tenantId}:`, e.message));
              }
            }, 35000);
          }
          // Telefone desvinculou da sessão WA Web — precisa novo QR Code
          if (statusSession === 'disconnectedMobile') {
            data.status = 'disconnected';
            data.phone = null;
            data.initializing = false;
            data.qrcode = null;
            db.query('UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?', ['disconnected', null, tenantId]).catch(()=>{});
            console.log(`[WPP] Tenant ${tenantId} — telefone desvinculou (disconnectedMobile). Necessário novo QR Code.`);
          }
        },
        mkdirFolder: this.tokensPath,
        puppeteerOptions: {
          userDataDir: path.join(this.tokensPath, data.instanceName),
        },
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        browserArgs: [
          `--user-data-dir=${path.join(this.tokensPath, data.instanceName)}`,
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-features=site-per-process',
          '--single-process'
        ],
        autoClose: 0,
        tokenStore: 'file',
      });

      console.log(`🚀 [Passo 3/3] Cliente WPP instanciado com sucesso para Tenant ${tenantId}`);
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

      // Identifica se este é o master bot (tenant do super_admin)
      let isMasterBot = false;
      try {
        const [saRows] = await db.query(`SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1`);
        isMasterBot = saRows[0]?.tenant_id == tenantId;
      } catch(e) {}

      // Garante que não acumula listeners em reconexões
      if (typeof data.client.removeAllListeners === 'function') data.client.removeAllListeners('message');
      data.client.onMessage((message) => {
        // Ping-pong de diagnóstico
        if (message.body === 'ping') {
          data.client.sendText(message.from, 'pong');
          return;
        }
        // Bot conversacional: só no master bot, só mensagens individuais (não grupos/broadcast)
        if (isMasterBot && !message.isGroupMsg && message.from !== 'status@broadcast') {
          const { handleMessage } = require('./botConversation');
          handleMessage(tenantId, message, data.client).catch(e => console.error('[MasterBot]', e.message));
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
        if (typeof data.client.removeAllListeners === 'function') data.client.removeAllListeners();
        await data.client.logout();
        await data.client.close();
      } catch (e) {
        console.error('Erro ao fechar cliente WPP:', e.message);
      }
    }
    // Remove completamente do Map para liberar memória
    this.instances.delete(tenantId);

    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?',
      ['disconnected', null, tenantId]
    );
  }

  async sendReminder(tenantId, to, text) {
    const data = this.getTenantData(tenantId);
    if (data.status !== 'connected' || !data.client) {
      const msg = `⚠️ Tentativa de envio para Tenant ${tenantId} paralisada: Bot ${data.status || 'desconectado'}.`;
      console.warn(msg);
      return msg;
    }

    try {
      let clean = to.replace(/\D/g, '');
      
      // Formatação para Brasil (DDI 55)
      if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
      }
      
      // WhatsApp ID
      const formattedTo = clean.includes('@c.us') ? clean : `${clean}@c.us`;
      
      console.log(`📤 Enviando via WhatsApp (Tenant ${tenantId}) para: ${formattedTo}...`);
      await data.client.sendText(formattedTo, text);
      return true;
    } catch (err) {
      console.error(`❌ Erro WPPTenant ${tenantId} -> ${to}:`, err.message);
      return `Erro ao enviar via WhatsApp: ${err.message}`;
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
