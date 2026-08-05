const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { sendMail, templates } = require('../services/emailService');

router.use(authorize('super_admin'));

async function ensureSchema() {
  await db.query(`CREATE TABLE IF NOT EXISTS email_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(180) NOT NULL,
    title VARCHAR(180) NOT NULL,
    content TEXT NOT NULL,
    button_text VARCHAR(80) NULL,
    button_url VARCHAR(500) NULL,
    audience VARCHAR(40) NOT NULL DEFAULT 'active_users',
    sent_by INT NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('sent','failed') NOT NULL,
    error_message VARCHAR(255) NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_campaign_user (campaign_id, user_id),
    INDEX idx_campaign (campaign_id)
  )`);
}

router.get('/summary', async (req, res) => {
  try {
    await ensureSchema();
    const [[audience]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE active = true AND role != 'super_admin' AND email IS NOT NULL AND email <> ''");
    const [campaigns] = await db.query(`SELECT id, subject, title, audience, recipient_count, delivered_count, failed_count, sent_at, created_at FROM email_campaigns ORDER BY created_at DESC LIMIT 30`);
    res.json({ active_recipients: audience.total, campaigns });
  } catch (err) { res.status(500).json({ error: 'Erro ao carregar central de e-mails.' }); }
});

router.post('/send', async (req, res) => {
  try {
    await ensureSchema();
    const { subject, title, content, button_text, button_url } = req.body;
    if (!subject || !title || !content) return res.status(400).json({ error: 'Assunto, título e mensagem são obrigatórios.' });
    if (String(subject).length > 180 || String(title).length > 180) return res.status(400).json({ error: 'Assunto ou título muito longo.' });
    if (button_url && !/^https?:\/\//i.test(button_url)) return res.status(400).json({ error: 'O link do botão deve começar com http:// ou https://.' });

    const [users] = await db.query(`SELECT id, name, email FROM users WHERE active = true AND role != 'super_admin' AND email IS NOT NULL AND email <> '' ORDER BY id`);
    const [created] = await db.query(`INSERT INTO email_campaigns (subject, title, content, button_text, button_url, sent_by, recipient_count) VALUES (?, ?, ?, ?, ?, ?, ?)`, [subject, title, content, button_text || null, button_url || null, req.user.id, users.length]);
    const campaignId = created.insertId;
    const html = templates.platformUpdate({ title, content, buttonText: button_text, buttonUrl: button_url });
    let delivered = 0;
    let failed = 0;

    // Envio sequencial reduz risco de bloqueio pelo provedor SMTP e mantém o
    // histórico individual de cada disparo.
    for (const user of users) {
      const sent = await sendMail(user.email, subject, html);
      if (sent) delivered += 1; else failed += 1;
      await db.query(`INSERT INTO email_campaign_recipients (campaign_id, user_id, email, status) VALUES (?, ?, ?, ?)`, [campaignId, user.id, user.email, sent ? 'sent' : 'failed']);
    }
    await db.query('UPDATE email_campaigns SET delivered_count = ?, failed_count = ?, sent_at = NOW() WHERE id = ?', [delivered, failed, campaignId]);
    res.json({ id: campaignId, recipients: users.length, delivered, failed });
  } catch (err) {
    console.error('[EmailCampaigns] Erro:', err);
    res.status(500).json({ error: 'Não foi possível enviar a campanha.' });
  }
});

module.exports = router;
