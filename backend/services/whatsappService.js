const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../db');

function jidToPhone(jid) {
  return String(jid || '').replace(/@.*/, '').replace(/:[0-9]+$/, '');
}

function normalizePhoneDigits(phone) {
  let clean = String(phone || '').replace(/\D/g, '');

  // Já tem código do país
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    return clean;
  }
  // Número brasileiro sem código: 10 dígitos (fixo) ou 11 dígitos (celular com 9)
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }
  // 9 dígitos: celular sem DDD — não há como normalizar, retorna como está
  return clean;
}

function normalizeDestination(dest) {
  const raw = String(dest || '').trim();
  if (!raw) return null;

  if (raw.includes('@')) {
    if (raw.endsWith('@c.us')) {
      const digits = raw.replace('@c.us', '').replace(/\D/g, '');
      return `${digits}@s.whatsapp.net`;
    }
    return raw;
  }

  const digits = normalizePhoneDigits(raw);
  return digits ? `${digits}@s.whatsapp.net` : null;
}

function extractMessageText(msg) {
  const text =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.templateButtonReplyMessage?.selectedId ||
    '';

  return String(text || '').trim();
}

function makeSilentLogger() {
  const noop = () => {};
  const logger = {
    level: 'silent',
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
  logger.child = () => makeSilentLogger();
  return logger;
}

class WhatsAppManager {
  constructor() {
    this.instances = new Map();
    this.sendingLocks = new Map();
    this.tokensPath = path.join(__dirname, '../tokens');

    if (!fs.existsSync(this.tokensPath)) {
      try {
        fs.mkdirSync(this.tokensPath, { recursive: true });
      } catch (e) {
        console.error('❌ Erro ao criar pasta de sessões do WhatsApp:', e.message);
      }
    }
  }

  getTenantData(tenantId) {
    const key = String(tenantId);

    if (!this.instances.has(key)) {
      this.instances.set(key, {
        client: null,
        sock: null,
        status: 'disconnected',
        qrcode: null,
        phone: null,
        initializing: false,
        manualDisconnect: false,
        reconnectTimer: null,
        sessionToken: null,
        instanceName: `psiflux-bot-tenant-${key}`,
      });
    }

    return this.instances.get(key);
  }

  getStatus(tenantId) {
    const data = this.getTenantData(tenantId);
    const status = data.status === 'qr_pending' ? 'connecting' : data.status;

    return {
      status,
      qrcode: data.qrcode,
      phone: data.phone,
      initializing: data.initializing,
    };
  }

  getSessionFolder(data) {
    return path.join(this.tokensPath, data.instanceName);
  }

  clearReconnectTimer(data) {
    if (data.reconnectTimer) {
      clearTimeout(data.reconnectTimer);
      data.reconnectTimer = null;
    }
  }

  buildClientWrapper(data) {
    return {
      sendText: async (dest, text) => {
        await this.sendTextInternal(data, dest, text);
      },
      logout: async () => {
        if (data.sock?.logout) {
          await data.sock.logout();
        }
      },
      close: async () => {
        try {
          if (data.sock?.end) {
            data.sock.end(new Error('Socket fechado'));
          } else if (data.sock?.ws?.close) {
            data.sock.ws.close();
          }
        } catch {}
      },
      removeAllListeners: () => {
        try {
          data.sock?.ev?.removeAllListeners?.();
        } catch {}
      },
    };
  }

  async sendTextInternal(data, dest, text) {
    if (!data.sock || data.status !== 'connected') {
      throw new Error('WhatsApp não está conectado');
    }

    const jid = normalizeDestination(dest);
    if (!jid) {
      throw new Error('Destino inválido');
    }

    const lockKey = data.instanceName;
    const previous = this.sendingLocks.get(lockKey) || Promise.resolve();

    const current = previous.then(async () => {
      await data.sock.sendMessage(jid, { text: String(text || '') });
    });

    this.sendingLocks.set(lockKey, current);

    try {
      await current;
    } finally {
      if (this.sendingLocks.get(lockKey) === current) {
        this.sendingLocks.delete(lockKey);
      }
    }
  }

  async updateTenantConnected(tenantId, data) {
    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ?, whatsapp_instance = ? WHERE id = ?',
      ['connected', data.phone, data.instanceName, tenantId]
    );
  }

  async updateTenantDisconnected(tenantId) {
    await db.query(
      'UPDATE tenants SET whatsapp_status = ?, whatsapp_phone = ? WHERE id = ?',
      ['disconnected', null, tenantId]
    );
  }

  async connect(tenantId, forceNew = false) {
    const key = String(tenantId);
    const data = this.getTenantData(key);

    console.log(`🚀 Solicitação de conexão Baileys para o tenant ${key}...`);

    if (data.status === 'connected' && !forceNew) {
      console.log(`[Baileys] Tenant ${key} já está conectado.`);
      return;
    }

    this.clearReconnectTimer(data);
    data.manualDisconnect = false;
    data.sessionToken = Symbol(`restarting-${key}`);

    if (forceNew) {
      const sessionFolder = this.getSessionFolder(data);
      if (fs.existsSync(sessionFolder)) {
        console.log(`[Baileys] Removendo credenciais antigas do tenant ${key}...`);
        try {
          fs.rmSync(sessionFolder, { recursive: true, force: true });
        } catch (e) {
          console.warn(`[Baileys] Não foi possível limpar a sessão do tenant ${key}:`, e.message);
        }
      }
    }

    if (data.client) {
      try {
        data.client.removeAllListeners?.();
      } catch {}
      try {
        await data.client.close?.();
      } catch {}
    }

    data.client = null;
    data.sock = null;
    data.phone = null;
    data.qrcode = null;
    data.status = 'connecting';
    data.initializing = true;

    this.createClient(key, data).catch((err) => {
      console.error(`[Baileys] Erro ao iniciar tenant ${key}:`, err.message);
    });
  }

  async createClient(tenantId, data) {
    const sessionToken = Symbol(`tenant-${tenantId}`);
    data.sessionToken = sessionToken;

    let makeWASocket;
    let useMultiFileAuthState;
    let fetchLatestBaileysVersion;
    let DisconnectReason;

    try {
      let baileys;
      try {
        baileys = await import('@whiskeysockets/baileys');
      } catch {
        baileys = await import('@adiwajshing/baileys');
      }
      makeWASocket = baileys.makeWASocket || baileys.default;
      useMultiFileAuthState = baileys.useMultiFileAuthState;
      fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
      DisconnectReason = baileys.DisconnectReason;

      if (!makeWASocket || !useMultiFileAuthState) {
        throw new Error('Exports do Baileys não encontrados');
      }
    } catch (err) {
      data.initializing = false;
      data.status = 'disconnected';
      data.qrcode = null;
      console.error('[Baileys] Biblioteca não disponível:', err.message);
      return;
    }

    const sessionDir = this.getSessionFolder(data);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    let waVersion = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion?.();
      if (latest?.version) {
        waVersion = latest.version;
      }
    } catch {}

    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      browser: ['Chrome (Linux)', 'PsiFlux', '1.0.0'],
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
      logger: makeSilentLogger(),
    });

    data.sock = sock;
    data.client = this.buildClientWrapper(data);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      if (data.sessionToken !== sessionToken) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        data.status = 'connecting';
        data.initializing = false;
        try {
          data.qrcode = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        } catch (e) {
          console.warn(`[Baileys] Falha ao gerar QR do tenant ${tenantId}:`, e.message);
          data.qrcode = null;
        }
        console.log(`[Baileys] QR Code pronto para o tenant ${tenantId}.`);
      }

      if (connection === 'open') {
        data.status = 'connected';
        data.initializing = false;
        data.qrcode = null;
        data.phone = jidToPhone(sock.user?.id || '') || 'Conectado';

        try {
          await this.updateTenantConnected(tenantId, data);
        } catch (e) {
          console.warn(`[Baileys] Falha ao persistir conexão do tenant ${tenantId}:`, e.message);
        }

        try {
          const [saRows] = await db.query('SELECT tenant_id FROM users WHERE role = ? LIMIT 1', ['super_admin']);
          data.isMasterBot = String(saRows[0]?.tenant_id || '') === String(tenantId);
        } catch (e) {
          data.isMasterBot = false;
          console.warn('[Baileys] Não foi possível validar master bot:', e.message);
        }

        console.log(`✅ WhatsApp tenant ${tenantId} conectado via Baileys: ${data.phone}`);
      }

      if (connection === 'close') {
        data.initializing = false;
        data.status = 'disconnected';
        data.qrcode = null;
        data.phone = null;

        try {
          await this.updateTenantDisconnected(tenantId);
        } catch (e) {
          console.warn(`[Baileys] Falha ao persistir desconexão do tenant ${tenantId}:`, e.message);
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason?.loggedOut;

        if (data.manualDisconnect || loggedOut) {
          if (loggedOut) {
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {}
          }
          return;
        }

        console.log(`[Baileys] Tenant ${tenantId} desconectado. Tentando reconectar em 5s...`);
        this.clearReconnectTimer(data);
        data.reconnectTimer = setTimeout(() => {
          data.reconnectTimer = null;
          if (data.sessionToken === sessionToken && !data.manualDisconnect) {
            this.connect(tenantId, false).catch((err) => {
              console.error(`[Baileys] Auto-reconnect tenant ${tenantId}:`, err.message);
            });
          }
        }, 5000);
      }
    });

    sock.ev.on('messages.upsert', async (payload) => {
      if (data.sessionToken !== sessionToken) return;
      if (!data.isMasterBot) return;
      if (payload?.type !== 'notify') return;

      for (const msg of payload.messages || []) {
        try {
          if (!msg?.message || msg?.key?.fromMe) continue;

          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.includes('@g.us')) {
            continue;
          }

          const text = extractMessageText(msg);
          if (!text) continue;

          if (text.toLowerCase() === 'ping') {
            await data.client.sendText(remoteJid, 'pong');
            continue;
          }

          const { handleMessage } = require('./botConversation');
          await handleMessage(tenantId, {
            body: text,
            from: remoteJid,
            isGroupMsg: false,
            broadcast: false,
            type: 'chat',
          });
        } catch (e) {
          console.error('[MasterBot] Erro ao processar mensagem:', e.message);
        }
      }
    });
  }

  async disconnect(tenantId) {
    const key = String(tenantId);
    const data = this.getTenantData(key);
    const sessionDir = this.getSessionFolder(data);

    this.clearReconnectTimer(data);
    data.manualDisconnect = true;
    data.sessionToken = Symbol(`manual-disconnect-${key}`);

    if (data.client) {
      try {
        data.client.removeAllListeners?.();
      } catch {}
      try {
        await data.client.logout?.();
      } catch {}
      try {
        await data.client.close?.();
      } catch {}
    }

    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}

    this.instances.delete(key);

    await this.updateTenantDisconnected(key);
  }

  async sendReminder(tenantId, to, text) {
    const data = this.getTenantData(tenantId);

    if (data.status !== 'connected' || !data.sock) {
      const msg = `⚠️ Bot tenant ${tenantId} não conectado (status: ${data.status || 'desconectado'}).`;
      console.warn(msg);
      return msg;
    }

    try {
      const formattedTo = normalizeDestination(to);
      if (!formattedTo) {
        console.warn(`[sendReminder] Número inválido ignorado: "${to}" (tenant ${tenantId})`);
        return 'Erro ao enviar via WhatsApp: destino inválido';
      }

      console.log(`📤 Enviando via Baileys (tenant ${tenantId}) para: ${formattedTo} (original: ${to})`);
      await data.sock.sendMessage(formattedTo, { text: String(text || '') });
      return true;
    } catch (err) {
      console.error(`❌ Erro Baileys tenant ${tenantId} -> ${to} (${normalizeDestination(to)}):`, err.message);
      return `Erro ao enviar via WhatsApp: ${err.message}`;
    }
  }

  async recoverActiveSessions() {
    try {
      const [rows] = await db.query("SELECT id FROM tenants WHERE whatsapp_status = 'connected'");
      for (const row of rows) {
        console.log(`🔄 Restaurando conexão WhatsApp do tenant ${row.id}...`);
        this.connect(row.id, false).catch((e) => console.error(e));
      }
    } catch (e) {
      console.error('Erro ao recuperar sessões do WhatsApp:', e.message);
    }
  }
}

module.exports = new WhatsAppManager();
