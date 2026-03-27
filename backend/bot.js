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

  // Iniciar Cron da Fila de Notificacoes (transferido do cronJobs.js principal)
  notificationService.ensureSchema();
  cron.schedule('* * * * *', () => withLock('processQueue', () => notificationService.processQueue()), { timezone: 'America/Sao_Paulo' });
  console.log('✅ Cron de Processamento da Fila (WhatsApp) iniciado.');
});
