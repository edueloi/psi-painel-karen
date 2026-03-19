const express = require('express');
const router = express.Router();
const { sendMail, templates } = require('../services/emailService');
const { checkBirthdays, sendWeeklyReport, sendMonthlyReport } = require('../services/cronJobs');

// POST /notifications/test — envia email de teste
router.post('/test', async (req, res) => {
  const { email } = req.body;
  const target = email || req.user?.email;
  if (!target) return res.status(400).json({ error: 'Email não informado' });

  const html = `<div style="font-family:sans-serif;padding:32px;background:#f1f5f9;border-radius:16px;">
    <h2 style="color:#4f46e5;">✅ Email de teste do PsiFlux</h2>
    <p>Se você recebeu este email, o sistema de notificações está funcionando corretamente!</p>
    <p style="color:#94a3b8;font-size:12px;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
  </div>`;

  const ok = await sendMail(target, '✅ Teste de Email — PsiFlux', html);
  if (ok) return res.json({ message: `Email de teste enviado para ${target}` });
  return res.status(500).json({ error: 'Falha ao enviar email. Verifique as configurações no .env' });
});

// POST /notifications/trigger/birthdays — disparo manual de aniversariantes
router.post('/trigger/birthdays', async (req, res) => {
  await checkBirthdays();
  res.json({ message: 'Job de aniversariantes executado' });
});

// POST /notifications/trigger/weekly — disparo manual do relatório semanal
router.post('/trigger/weekly', async (req, res) => {
  await sendWeeklyReport();
  res.json({ message: 'Relatório semanal enviado' });
});

// POST /notifications/trigger/monthly — disparo manual do relatório mensal
router.post('/trigger/monthly', async (req, res) => {
  await sendMonthlyReport();
  res.json({ message: 'Relatório mensal enviado' });
});

module.exports = router;
