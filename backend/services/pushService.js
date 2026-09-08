const db = require('../db');
const webpush = require('web-push');

// Web Push (VAPID) — funciona em qualquer navegador/PWA (Android sempre; iOS
// só a partir do portal instalado na tela de início, limitação do próprio
// iOS Safari, não do código). Chaves geradas uma única vez e fixas no .env —
// trocar quebraria as subscriptions já registradas nos navegadores dos
// pacientes, que precisariam se inscrever de novo.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:suporte@plaelo.com.br';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Auto-migrate: tabela de subscriptions Web Push do paciente ──────────────
async function ensureWebPushTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_web_push_subscriptions (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      tenant_id  INT NOT NULL,
      endpoint   VARCHAR(700) NOT NULL,
      p256dh     VARCHAR(255) NOT NULL,
      auth       VARCHAR(255) NOT NULL,
      user_agent VARCHAR(255) NULL,
      created_at DATETIME DEFAULT NOW(),
      UNIQUE KEY uq_patient_endpoint (patient_id, endpoint(255)),
      INDEX (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
ensureWebPushTable();

async function sendPushToPatient(patientId, title, body, data = {}) {
  await Promise.allSettled([
    sendExpoPush(patientId, title, body, data),
    sendWebPush(patientId, title, body, data),
  ]);
}

async function sendExpoPush(patientId, title, body, data) {
  try {
    const [rows] = await db.query(
      `SELECT push_token FROM patient_push_tokens WHERE patient_id = ?`,
      [patientId]
    );
    if (!rows.length) return;

    const messages = rows.map(r => ({
      to: r.push_token,
      sound: 'default',
      title,
      body,
      data,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {}
}

async function sendWebPush(patientId, title, body, data) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const [rows] = await db.query(
      `SELECT id, endpoint, p256dh, auth FROM patient_web_push_subscriptions WHERE patient_id = ?`,
      [patientId]
    );
    if (!rows.length) return;

    const payload = JSON.stringify({ title, body, data });
    await Promise.all(rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Subscription expirada/revogada pelo navegador (410/404) — remove pra
        // não seguir tentando enviar pra um endpoint morto a cada notificação.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.query('DELETE FROM patient_web_push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
        }
      }
    }));
  } catch {}
}

module.exports = { sendPushToPatient, VAPID_PUBLIC_KEY };
