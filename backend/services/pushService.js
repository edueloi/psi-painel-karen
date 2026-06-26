const db = require('../db');

async function sendPushToPatient(patientId, title, body, data = {}) {
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

module.exports = { sendPushToPatient };
