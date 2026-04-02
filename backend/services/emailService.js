const nodemailer = require('nodemailer');
require('dotenv').config();

// ─── Transporter ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const FROM = `"${process.env.EMAIL_FROM_NAME || 'PsiFlux'}" <${process.env.EMAIL_USER}>`;

async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email não configurado. Adicione EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env');
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`📧 Email enviado → ${to} | ${subject}`);
    return true;
  } catch (err) {
    console.error(`❌ Falha ao enviar email para ${to}:`, err.message);
    return false;
  }
}

// ─── Base template ───────────────────────────────────────────────────────────
function baseTemplate(title, content, footerNote = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px 20px 0 0;padding:32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);">PsiFlux</p>
          <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;line-height:1.3;">${title}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:24px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;">Este é um email automático do sistema PsiFlux.</p>
          ${footerNote ? `<p style="margin:0;font-size:11px;color:#94a3b8;">${footerNote}</p>` : ''}
          <p style="margin:8px 0 0;font-size:10px;color:#cbd5e1;">sistema@psiflux.com.br · Não responda este email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function badge(text, color = '#4f46e5', bg = '#eef2ff') {
  return `<span style="display:inline-block;padding:3px 10px;background:${bg};color:${color};border-radius:999px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${text}</span>`;
}

function statBox(label, value, color = '#4f46e5') {
  return `<td style="text-align:center;padding:0 8px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px 12px;min-width:90px;">
      <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:${color};">${value}</p>
      <p style="margin:0;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">${label}</p>
    </div>
  </td>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

/** 1. Lembrete de atendimento (1h antes) */
function templateAppointmentReminder({ patientName, time, date, type, modality, professional }) {
  const content = `
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Olá, <strong>${professional || 'Doutor(a)'}</strong> 👋</p>
    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">⏰ Atendimento em 1 hora</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:900;color:#1e293b;">${patientName}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#475569;"><strong>${date}</strong> às <strong>${time}</strong></p>
      <p style="margin:12px 0 0;">${badge(type || 'Consulta')} ${badge(modality || 'Presencial', '#059669', '#d1fae5')}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#64748b;">Certifique-se de que a sala está pronta e os materiais necessários separados.</p>`;
  return baseTemplate('Atendimento em 1 hora', content, 'Lembrete automático gerado pelo agendamento.');
}

/** 2. Aniversariantes do dia */
function templateBirthdayReminder(patients) {
  const rows = patients.map(p => {
    const phone = (p.whatsapp || p.phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${p.name}, parabéns pelo seu aniversário! 🎉 Desejo muita saúde e realizações. Um grande abraço!`);
    const waLink = phone ? `<a href="https://wa.me/${phone}?text=${msg}" style="display:inline-block;padding:6px 14px;background:#22c55e;color:#fff;border-radius:8px;font-size:11px;font-weight:900;text-decoration:none;">WhatsApp</a>` : '';
    const age = p.birth_date ? (new Date().getFullYear() - new Date(p.birth_date).getFullYear()) : '';
    return `<tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;">🎂 ${p.name}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${age ? age + ' anos' : ''}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;">${waLink}</td>
    </tr>`;
  }).join('');

  const content = `
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Hoje é aniversário de <strong>${patients.length} paciente${patients.length > 1 ? 's' : ''}</strong>! 🎉</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead><tr>
        <th style="padding:8px;text-align:left;font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Paciente</th>
        <th style="padding:8px;text-align:left;font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Idade</th>
        <th style="padding:8px;border-bottom:2px solid #e2e8f0;"></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return baseTemplate('🎂 Aniversariantes de Hoje', content);
}

/** 3. Novo agendamento confirmado */
function templateNewAppointment({ patientName, date, time, type, modality, professional, notes }) {
  const content = `
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Um novo atendimento foi <strong style="color:#4f46e5;">agendado</strong> no sistema.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:0;margin-bottom:24px;border-collapse:separate;">
      ${row('Paciente', patientName)}
      ${row('Data', date)}
      ${row('Horário', time)}
      ${row('Tipo', type || 'Consulta')}
      ${row('Modalidade', modality || 'Presencial')}
      ${professional ? row('Profissional', professional) : ''}
      ${notes ? row('Observações', notes) : ''}
    </table>
    <p style="margin:0;font-size:12px;color:#94a3b8;">Acesse o sistema para mais detalhes.</p>`;
  return baseTemplate('Novo Agendamento', content);
}

function row(label, value) {
  return `<tr>
    <td style="padding:12px 16px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;width:35%;border-bottom:1px solid #e2e8f0;">${label}</td>
    <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;">${value}</td>
  </tr>`;
}

/** 4. Relatório semanal */
function templateWeeklyReport({ weekLabel, appointments, completedCount, cancelledCount, newPatients, revenue, topPatient }) {
  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Semana: <strong>${weekLabel}</strong></p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Aqui está o resumo da sua semana no PsiFlux.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Agendamentos', appointments, '#4f46e5')}
        ${statBox('Realizados', completedCount, '#059669')}
        ${statBox('Cancelados', cancelledCount, '#ef4444')}
        ${statBox('Novos Pac.', newPatients, '#f59e0b')}
      </tr>
    </table>

    ${revenue > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;">💰 Receita da semana</p>
      <p style="margin:0;font-size:24px;font-weight:900;color:#15803d;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}</p>
    </div>` : ''}

    ${topPatient ? `<p style="margin:0 0 4px;font-size:12px;color:#64748b;">⭐ Paciente com mais atendimentos: <strong>${topPatient}</strong></p>` : ''}
    `;
  return baseTemplate('📊 Relatório Semanal', content, 'Enviado automaticamente toda segunda-feira.');
}

/** 5. Relatório mensal */
function templateMonthlyReport({ monthLabel, totalAppointments, completedCount, cancelledCount, newPatients, revenue, expense, profit, topClients, avgTicket }) {
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const topRows = (topClients || []).slice(0, 5).map((c, i) =>
    `<tr>
      <td style="padding:10px 8px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">${i + 1}. ${c.name}</td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:900;color:#4f46e5;border-bottom:1px solid #f1f5f9;">${fmt(c.totalRevenue)}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Mês: <strong>${monthLabel}</strong></p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Relatório completo do mês encerrado.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Agendamentos', totalAppointments, '#4f46e5')}
        ${statBox('Realizados', completedCount, '#059669')}
        ${statBox('Cancelados', cancelledCount, '#ef4444')}
        ${statBox('Novos Pac.', newPatients, '#f59e0b')}
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:0 4px 0 0;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
            <p style="margin:0 0 2px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;">Receita</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#15803d;">${fmt(revenue)}</p>
          </div>
        </td>
        <td style="padding:0 4px;">
          <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;">
            <p style="margin:0 0 2px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#e11d48;">Despesas</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#be123c;">${fmt(expense)}</p>
          </div>
        </td>
        <td style="padding:0 0 0 4px;">
          <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;">
            <p style="margin:0 0 2px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#4338ca;">Lucro</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#4338ca;">${fmt(profit)}</p>
          </div>
        </td>
      </tr>
    </table>

    ${avgTicket > 0 ? `<p style="margin:0 0 20px;font-size:12px;color:#64748b;">🎫 Ticket médio: <strong>${fmt(avgTicket)}</strong></p>` : ''}

    ${topRows ? `
    <p style="margin:0 0 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">🏆 Top Clientes</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tbody>${topRows}</tbody>
    </table>` : ''}
  `;
  return baseTemplate('📅 Relatório Mensal', content, 'Enviado automaticamente no primeiro dia de cada mês.');
}

/** 6. Recuperação de senha */
function templatePasswordReset({ name, link }) {
  const content = `
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Olá, <strong>${name || 'usuário'}</strong> 👋</p>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>PsiFlux</strong>. Clique no botão abaixo para criar uma nova senha:</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:900;font-size:15px;padding:16px 40px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">🔐 Redefinir Minha Senha</a>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-top:8px;">
      <p style="margin:0;font-size:12px;color:#c2410c;font-weight:700;">⚠️ Este link expira em 2 horas.</p>
      <p style="margin:6px 0 0;font-size:12px;color:#c2410c;">Se você não solicitou esta redefinição, ignore este email — sua senha permanece a mesma.</p>
    </div>

    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;">Se o botão não funcionar, copie e cole este link no navegador:<br>
    <span style="color:#6366f1;word-break:break-all;">${link}</span></p>`;
  return baseTemplate('🔐 Redefinir Senha', content, 'Solicitação de redefinição de senha.');
}

module.exports = {
  sendMail,
  templates: {
    appointmentReminder: templateAppointmentReminder,
    birthdayReminder: templateBirthdayReminder,
    newAppointment: templateNewAppointment,
    weeklyReport: templateWeeklyReport,
    monthlyReport: templateMonthlyReport,
    passwordReset: templatePasswordReset,
  }
};
