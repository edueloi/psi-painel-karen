const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/googleCrypto');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureGoogleColumns() {
  const stmts = [
    'ALTER TABLE users ADD COLUMN google_access_token TEXT NULL',
    'ALTER TABLE users ADD COLUMN google_refresh_token TEXT NULL',
    'ALTER TABLE users ADD COLUMN google_token_expiry DATETIME NULL',
    'ALTER TABLE users ADD COLUMN google_email VARCHAR(255) NULL',
    'ALTER TABLE users ADD COLUMN google_calendar_enabled TINYINT(1) DEFAULT 0',
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { /* coluna já existe */ }
  }
}
ensureGoogleColumns();

function getOAuthClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('Integração com Google não configurada no servidor (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI ausentes).');
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Monta um client OAuth já autenticado (com refresh automático) para o
// profissional, ou null se ele não tiver conectado/ativado a integração.
async function getAuthorizedClientForUser(userId) {
  const [[row]] = await db.query(
    'SELECT google_refresh_token, google_calendar_enabled FROM users WHERE id = ?',
    [userId]
  );
  if (!row || !row.google_refresh_token || !row.google_calendar_enabled) return null;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: decrypt(row.google_refresh_token) });

  // googleapis renova o access_token sozinho quando expirado; persistimos o
  // novo token quando isso acontece, pra não precisar renovar de novo à toa.
  oauth2Client.on('tokens', (tokens) => {
    if (!tokens.access_token) return;
    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    db.query(
      'UPDATE users SET google_access_token = ?, google_token_expiry = ? WHERE id = ?',
      [encrypt(tokens.access_token), expiry, userId]
    ).catch((e) => console.warn('[Google] Falha ao persistir token renovado:', e.message));
  });

  return oauth2Client;
}

// Cria um evento no Google Calendar da profissional com um link do Google
// Meet gerado automaticamente. Usado por POST /generate-meet-link.
async function createMeetLink({ userId, title, startISO, endISO, patientEmail }) {
  const oauth2Client = await getAuthorizedClientForUser(userId);
  if (!oauth2Client) {
    const err = new Error('Google Calendar não conectado ou desativado para este profissional.');
    err.code = 'GOOGLE_NOT_CONNECTED';
    throw err;
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const requestId = crypto.randomUUID();

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: patientEmail ? 'all' : 'none',
    requestBody: {
      summary: title || 'Sessão online',
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      conferenceData: {
        createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
      ...(patientEmail ? { attendees: [{ email: patientEmail }] } : {}),
    },
  });

  return { meetLink: data.hangoutLink, eventId: data.id };
}

// ── GET /google/connect — gera a URL de consentimento do Google ─────────────
router.get('/connect', authMiddleware, async (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    // "state" identifica o usuário na volta do callback (que não carrega o
    // header Authorization, pois é o navegador que navega direto pra lá).
    const state = jwt.sign({ uid: req.user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      // Força o Google a reemitir o refresh_token mesmo numa reconexão
      // (por padrão ele só vem no primeiro consentimento de cada usuário).
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
    res.json({ url });
  } catch (err) {
    console.error('[Google] Erro ao gerar URL de conexão:', err.message);
    res.status(500).json({ error: err.message || 'Erro ao gerar URL de conexão com o Google' });
  }
});

// ── GET /google/callback — o Google redireciona o navegador pra cá ──────────
router.get('/callback', async (req, res) => {
  const frontendBase = process.env.APP_BASE_URL || 'https://painel.psiflux.com.br';
  const fail = () => res.redirect(`${frontendBase}/configuracoes?tab=integracoes&google=error`);

  try {
    const { code, state, error } = req.query;
    if (error || !code || !state) return fail();

    let uid;
    try {
      ({ uid } = jwt.verify(state, process.env.JWT_SECRET));
    } catch {
      return fail();
    }

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // refresh_token só vem no primeiro consentimento (mesmo com prompt=consent
    // é sempre reenviado, mas por segurança preservamos o antigo se ausente).
    const updates = ['google_email = ?', 'google_calendar_enabled = 1'];
    const values = [userInfo.email || null];
    if (tokens.access_token) {
      updates.push('google_access_token = ?', 'google_token_expiry = ?');
      values.push(encrypt(tokens.access_token), tokens.expiry_date ? new Date(tokens.expiry_date) : null);
    }
    if (tokens.refresh_token) {
      updates.push('google_refresh_token = ?');
      values.push(encrypt(tokens.refresh_token));
    }
    values.push(uid);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.redirect(`${frontendBase}/configuracoes?tab=integracoes&google=success`);
  } catch (err) {
    console.error('[Google] Erro no callback OAuth:', err?.response?.data || err.message);
    fail();
  }
});

// ── GET /google/status ───────────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT google_email, google_calendar_enabled, google_refresh_token FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({
      connected: !!(row && row.google_refresh_token),
      email: row?.google_email || null,
      enabled: !!row?.google_calendar_enabled,
    });
  } catch (err) {
    console.error('[Google] Erro ao buscar status:', err.message);
    res.status(500).json({ error: 'Erro ao verificar status da conexão Google' });
  }
});

// ── POST /google/toggle — liga/desliga sem desconectar ──────────────────────
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    await db.query('UPDATE users SET google_calendar_enabled = ? WHERE id = ?', [enabled ? 1 : 0, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Google] Erro ao atualizar preferência:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar preferência' });
  }
});

// ── POST /google/disconnect ──────────────────────────────────────────────────
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT google_access_token FROM users WHERE id = ?', [req.user.id]);
    if (row?.google_access_token) {
      try {
        const token = decrypt(row.google_access_token);
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
      } catch (e) { /* best-effort — segue desconectando localmente mesmo se a revogação falhar */ }
    }
    await db.query(
      `UPDATE users SET google_access_token = NULL, google_refresh_token = NULL,
        google_token_expiry = NULL, google_email = NULL, google_calendar_enabled = 0
       WHERE id = ?`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Google] Erro ao desconectar:', err.message);
    res.status(500).json({ error: 'Erro ao desconectar conta Google' });
  }
});

// ── POST /google/generate-meet-link ──────────────────────────────────────────
router.post('/generate-meet-link', authMiddleware, async (req, res) => {
  try {
    const { title, start_time, end_time, patient_id } = req.body;
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time e end_time são obrigatórios' });
    }

    let patientEmail = null;
    if (patient_id) {
      const [[patient]] = await db.query(
        'SELECT email FROM patients WHERE id = ? AND tenant_id = ?',
        [patient_id, req.user.tenant_id]
      );
      patientEmail = patient?.email || null;
    }

    const { meetLink } = await createMeetLink({
      userId: req.user.id,
      title,
      startISO: new Date(start_time).toISOString(),
      endISO: new Date(end_time).toISOString(),
      patientEmail,
    });

    res.json({ meeting_url: meetLink });
  } catch (err) {
    if (err.code === 'GOOGLE_NOT_CONNECTED') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[Google] Erro ao gerar link do Meet:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao gerar link do Google Meet. Verifique se a conexão com o Google ainda está ativa.' });
  }
});

module.exports = router;
