const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail, templates } = require('../services/emailService');
const { checkBirthdays, sendWeeklyReport, sendMonthlyReport } = require('../services/cronJobs');

// Garante coluna email_preferences na tabela users
async function ensureEmailPrefsColumn() {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences JSON NULL`);
  } catch (e) {
    // MySQL < 8 não tem IF NOT EXISTS — tenta sem
    try { await db.query(`ALTER TABLE users ADD COLUMN email_preferences JSON NULL`); } catch (_) {}
  }
}
ensureEmailPrefsColumn();

const DEFAULT_PREFS = {
  enabled: false,
  new_appointment: false,
  appointment_reminder_professional: false,
  appointment_reminder_patient: false,
  appointment_reminder_minutes: 60,
  birthday_reminder: false,
  weekly_report: false,
  monthly_report: false,
};

// GET /notifications/preferences — preferências do usuário logado
router.get('/preferences', async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT email_preferences FROM users WHERE id = ?', [req.user.id]);
    const prefs = user?.email_preferences ? (typeof user.email_preferences === 'string' ? JSON.parse(user.email_preferences) : user.email_preferences) : DEFAULT_PREFS;
    res.json({ ...DEFAULT_PREFS, ...prefs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar preferências' });
  }
});

// PUT /notifications/preferences — salva preferências
router.put('/preferences', async (req, res) => {
  try {
    const prefs = { ...DEFAULT_PREFS, ...req.body };
    await db.query('UPDATE users SET email_preferences = ? WHERE id = ?', [JSON.stringify(prefs), req.user.id]);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
});

// POST /notifications/test — envia email de teste para o usuário logado
router.post('/test', async (req, res) => {
  const { email } = req.body;
  const target = email || req.user?.email;
  if (!target) return res.status(400).json({ error: 'Email não informado' });

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:3px;color:rgba(255,255,255,0.6);text-transform:uppercase;">PsiFlux Sistema</p>
      <h1 style="margin:0;font-size:20px;font-weight:900;color:#fff;">✅ Email de Teste</h1>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
      <p style="margin:0 0 12px;font-size:15px;color:#475569;">Olá! Se você recebeu este email, o sistema de notificações do <strong>PsiFlux</strong> está funcionando perfeitamente.</p>
      <p style="margin:0;font-size:12px;color:#94a3b8;">Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Este é um email automático — por favor, não responda.</p>
      <p style="margin:4px 0 0;font-size:10px;color:#cbd5e1;">sistema@psiflux.com.br · PsiFlux © ${new Date().getFullYear()}</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const ok = await sendMail(target, '✅ Teste de Email — PsiFlux Sistema', html);
  if (ok) return res.json({ message: `Email de teste enviado para ${target}` });
  return res.status(500).json({ error: 'Falha ao enviar email. Verifique as configurações no .env' });
});

// POST /notifications/trigger/birthdays
router.post('/trigger/birthdays', async (req, res) => {
  await checkBirthdays();
  res.json({ message: 'Job de aniversariantes executado' });
});

// POST /notifications/trigger/weekly
router.post('/trigger/weekly', async (req, res) => {
  await sendWeeklyReport();
  res.json({ message: 'Relatório semanal enviado' });
});

// POST /notifications/trigger/monthly
router.post('/trigger/monthly', async (req, res) => {
  await sendMonthlyReport();
  res.json({ message: 'Relatório mensal enviado' });
});

module.exports = router;
