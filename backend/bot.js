require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const wppService = require('./services/whatsappService');
const notificationService = require('./services/notificationService');

const app = express();
app.use(express.json());

const PORT = process.env.BOT_PORT || 3014;

// Guard: evita que a fila se sobreponha se o disparo demorar mais de 1 minuto
const _running = {};
async function withLock(name, fn) {
  if (_running[name]) return;
  _running[name] = true;
  try { await fn(); } finally { _running[name] = false; }
}

// ─── API PRIVADA DO BOT (Somente acessível via localhost pelo backend principal) ───

app.get('/bot-api/status/:tenantId', (req, res) => {
  res.json(wppService.getStatus(req.params.tenantId));
});

app.post('/bot-api/connect/:tenantId', async (req, res) => {
  wppService.connect(req.params.tenantId, true).catch(err => console.error('WPP Connect Error:', err.message));
  res.json({ success: true, message: 'Processando conexão...' });
});

app.post('/bot-api/disconnect/:tenantId', async (req, res) => {
  await wppService.disconnect(req.params.tenantId);
  res.json({ success: true });
});

app.post('/bot-api/test/:tenantId', async (req, res) => {
  const { phone, message } = req.body;
  try {
    const result = await wppService.sendReminder(req.params.tenantId, phone, message);
    if (result === true) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: typeof result === 'string' ? result : 'Falha no envio' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STARTUP ───

app.listen(PORT, () => {
  console.log(`🤖 PsiFlux-Bot (WPPConnect) rodando na porta ${PORT}`);

  // Recupera conexões do WhatsApp de todos os tenants ativos
  console.log('🔄 Verificando sessões do WhatsApp para recuperar...');
  wppService.recoverActiveSessions();

  // Iniciar Cron da Fila de Notificacoes
  notificationService.ensureSchema();
  cron.schedule('* * * * *', () => withLock('processQueue', () => notificationService.processQueue()), { timezone: 'America/Sao_Paulo' });
  console.log('✅ Cron de Processamento da Fila (WhatsApp) iniciado.');

  // Health-check a cada 5 minutos: tenta reconectar tenants que deveriam estar conectados mas caíram silenciosamente
  cron.schedule('*/5 * * * *', async () => {
    try {
      const db = require('./db');
      const [rows] = await db.query("SELECT id FROM tenants WHERE whatsapp_status = 'connected'");
      for (const row of rows) {
        const s = wppService.getStatus(row.id);
        if (s.status !== 'connected' && !s.initializing) {
          console.log(`[HealthCheck] Tenant ${row.id} deveria estar conectado mas está ${s.status}. Reconectando...`);
          wppService.connect(row.id, false).catch(e => console.error(`[HealthCheck] Erro reconect Tenant ${row.id}:`, e.message));
        }
      }
    } catch(e) {
      console.error('[HealthCheck] Erro:', e.message);
    }
  }, { timezone: 'America/Sao_Paulo' });
  console.log('✅ Health-check de reconexão WhatsApp iniciado (a cada 5min).');
});
