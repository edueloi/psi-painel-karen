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

const FROM = `"${process.env.EMAIL_FROM_NAME || 'Plaelo'}" <${process.env.EMAIL_USER}>`;

async function sendMail(to, subject, html, options = {}) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email não configurado. Adicione EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env');
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, ...options });
    console.log(`📧 Email enviado → ${to} | ${subject}`);
    return true;
  } catch (err) {
    console.error(`❌ Falha ao enviar email para ${to}:`, err.message);
    return false;
  }
}

// ─── Base template ───────────────────────────────────────────────────────────
const LOGO_URL = 'https://plaelo.com.br/images/logo-sistema/logo.png';

function baseTemplate(title, content, footerNote = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F1EFFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFFB;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(18,12,46,0.12);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(160deg,#150F2E 0%,#2A1F6B 55%,#6D42F5 100%);padding:36px 32px 32px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="width:56px;height:56px;background:#ffffff;border-radius:16px;padding:9px;">
              <img src="${LOGO_URL}" width="38" height="38" alt="Plaelo" style="display:block;width:38px;height:38px;object-fit:contain;"/>
            </td></tr>
          </table>
          <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">Plaelo</p>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;line-height:1.35;">${title}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#FAF9FF;border-top:1px solid #EDE9FB;padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" width="22" height="22" alt="" style="display:block;margin:0 auto 10px;width:22px;height:22px;object-fit:contain;opacity:0.85;"/>
          <p style="margin:0 0 4px;font-size:11px;color:#8B85A3;font-weight:700;">Este é um email automático do sistema Plaelo.</p>
          ${footerNote ? `<p style="margin:0 0 4px;font-size:11px;color:#8B85A3;">${footerNote}</p>` : ''}
          <p style="margin:10px 0 0;font-size:10px;color:#B4AECD;">contato@plaelo.com.br · Não responda este email · <a href="https://plaelo.com.br" style="color:#6D42F5;text-decoration:none;">plaelo.com.br</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function badge(text, color = '#6D42F5', bg = '#eef2ff') {
  return `<span style="display:inline-block;padding:3px 10px;background:${bg};color:${color};border-radius:999px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${text}</span>`;
}

function statBox(label, value, color = '#6D42F5') {
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
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Um novo atendimento foi <strong style="color:#6D42F5;">agendado</strong> no sistema.</p>
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
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Aqui está o resumo da sua semana no Plaelo.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Agendamentos', appointments, '#6D42F5')}
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
      <td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:900;color:#6D42F5;border-bottom:1px solid #f1f5f9;">${fmt(c.totalRevenue)}</td>
    </tr>`
  ).join('');

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Mês: <strong>${monthLabel}</strong></p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Relatório completo do mês encerrado.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statBox('Agendamentos', totalAppointments, '#6D42F5')}
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

/** 6. Boas-vindas (novo cadastro) */
function templateWelcome({ name, email, loginUrl }) {
  const content = `
    <p style="margin:0 0 8px;font-size:15px;color:#475569;">Olá, <strong>${name}</strong>! 🎉</p>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;">Sua conta no <strong style="color:#6D42F5;">Plaelo</strong> foi criada com sucesso. Estamos felizes em ter você aqui!</p>

    <!-- Card de destaque -->
    <div style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:20px;padding:28px;margin-bottom:28px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#6366f1;">Sua conta</p>
      <p style="margin:0 0 4px;font-size:20px;font-weight:900;color:#1e293b;">${name}</p>
      <p style="margin:0;font-size:13px;color:#64748b;">${email}</p>
    </div>

    <!-- Período de trial -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">🎁 14 dias grátis</p>
      <p style="margin:0;font-size:14px;color:#166534;">Aproveite todos os recursos do Plaelo sem pagar nada por 14 dias. Sem precisar de cartão.</p>
    </div>

    <!-- O que você pode fazer -->
    <p style="margin:0 0 16px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">O que você pode fazer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:0 8px 0 0;vertical-align:top;width:50%;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
            <p style="margin:0 0 6px;font-size:18px;">📅</p>
            <p style="margin:0 0 4px;font-size:12px;font-weight:900;color:#1e293b;">Agenda</p>
            <p style="margin:0;font-size:11px;color:#64748b;">Gerencie seus atendimentos com facilidade</p>
          </div>
        </td>
        <td style="padding:0 0 0 8px;vertical-align:top;width:50%;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
            <p style="margin:0 0 6px;font-size:18px;">👥</p>
            <p style="margin:0 0 4px;font-size:12px;font-weight:900;color:#1e293b;">Pacientes</p>
            <p style="margin:0;font-size:11px;color:#64748b;">Cadastro completo com prontuário digital</p>
          </div>
        </td>
      </tr>
      <tr style="margin-top:12px;">
        <td style="padding:12px 8px 0 0;vertical-align:top;width:50%;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
            <p style="margin:0 0 6px;font-size:18px;">💰</p>
            <p style="margin:0 0 4px;font-size:12px;font-weight:900;color:#1e293b;">Financeiro</p>
            <p style="margin:0;font-size:11px;color:#64748b;">Controle de cobranças, pacotes e fluxo de caixa</p>
          </div>
        </td>
        <td style="padding:12px 0 0 8px;vertical-align:top;width:50%;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
            <p style="margin:0 0 6px;font-size:18px;">🌐</p>
            <p style="margin:0 0 4px;font-size:12px;font-weight:900;color:#1e293b;">Portal do Paciente</p>
            <p style="margin:0;font-size:11px;color:#64748b;">Link exclusivo para seus pacientes acessarem</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin:8px 0 0;">
      <a href="${loginUrl || 'https://plaelo.com.br'}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 48px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">🚀 Acessar meu painel</a>
    </div>`;
  return baseTemplate('Bem-vindo ao Plaelo! 🎉', content, 'Você está recebendo este email porque criou uma conta no Plaelo.');
}

/** 7. Recuperação de senha */
function templatePasswordReset({ name, link }) {
  const content = `
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Olá, <strong>${name || 'usuário'}</strong> 👋</p>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Plaelo</strong>. Clique no botão abaixo para criar uma nova senha:</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 40px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">🔐 Redefinir Minha Senha</a>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-top:8px;">
      <p style="margin:0;font-size:12px;color:#c2410c;font-weight:700;">⚠️ Este link expira em 2 horas.</p>
      <p style="margin:6px 0 0;font-size:12px;color:#c2410c;">Se você não solicitou esta redefinição, ignore este email — sua senha permanece a mesma.</p>
    </div>

    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;">Se o botão não funcionar, copie e cole este link no navegador:<br>
    <span style="color:#6366f1;word-break:break-all;">${link}</span></p>`;
  return baseTemplate('🔐 Redefinir Senha', content, 'Solicitação de redefinição de senha.');
}

/** 8. Boas-vindas para conta criada pela clínica */
function templateTeamWelcome({ name, email, clinicName, loginUrl }) {
  const content = `
    <p style="margin:0 0 12px;font-size:16px;color:#475569;">Olá, <strong>${name}</strong>! 👋</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Uma conta foi criada para você no <strong style="color:#6D42F5;">Plaelo</strong>. Agora você já pode colaborar com <strong>${clinicName}</strong> em um só lugar.</p>
    <div style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:18px;padding:22px;margin-bottom:26px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">Seu acesso</p>
      <p style="margin:0;font-size:14px;font-weight:800;color:#1e293b;">${email}</p>
    </div>
    <p style="margin:0 0 14px;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">No portal você poderá</p>
    <ul style="margin:0 0 28px;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
      <li>Organizar atendimentos e agenda</li>
      <li>Acompanhar pacientes e informações clínicas</li>
      <li>Usar os recursos liberados para o seu perfil</li>
    </ul>
    <div style="text-align:center;"><a href="${loginUrl || 'https://painel.plaelo.com.br/login'}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 42px;border-radius:14px;text-decoration:none;">Acessar meu painel</a></div>`;
  return baseTemplate('Sua conta no Plaelo está pronta', content, 'Você está recebendo este e-mail porque uma conta foi criada para você.');
}

/** 9. Aviso de vencimento/assinatura vencida */
function templateSubscriptionReminder({ name, planName, expiresAt, daysLeft, renewalUrl }) {
  const expired = daysLeft <= 0;
  const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#475569;">Olá, <strong>${name}</strong>.</p>
    <div style="background:${expired ? '#fff1f2' : '#fff7ed'};border:1px solid ${expired ? '#fecdd3' : '#fed7aa'};border-radius:18px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${expired ? '#be123c' : '#c2410c'};">${expired ? 'Assinatura vencida' : 'Lembrete de renovação'}</p>
      <p style="margin:0;font-size:18px;font-weight:900;color:#1e293b;">${expired ? 'Seu acesso está limitado à renovação.' : `Sua assinatura vence em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}.`}</p>
      <p style="margin:10px 0 0;font-size:14px;color:#475569;">Plano: <strong>${planName || 'Plaelo'}</strong>${expiresAt ? ` · Vencimento: <strong>${expiresAt}</strong>` : ''}</p>
    </div>
    <p style="margin:0 0 26px;font-size:14px;color:#64748b;">Renove agora para continuar usando todos os recursos do seu painel sem interrupções.</p>
    <div style="text-align:center;"><a href="${renewalUrl || 'https://painel.plaelo.com.br/assinatura'}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 42px;border-radius:14px;text-decoration:none;">Renovar assinatura</a></div>`;
  return baseTemplate(expired ? 'Sua assinatura venceu' : 'Sua assinatura está perto de vencer', content, 'Lembrete automático de assinatura do Plaelo.');
}

/** 10. Aviso de fim do período de teste */
function templateTrialReminder({ name, endsAt, daysLeft, renewalUrl }) {
  const expired = daysLeft <= 0;
  const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#475569;">Olá, <strong>${name}</strong>.</p>
    <div style="background:${expired ? '#fff1f2' : '#fff7ed'};border:1px solid ${expired ? '#fecdd3' : '#fed7aa'};border-radius:18px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${expired ? '#be123c' : '#c2410c'};">${expired ? 'Período de teste encerrado' : 'Seu teste está terminando'}</p>
      <p style="margin:0;font-size:18px;font-weight:900;color:#1e293b;">${expired ? 'Seu acesso está limitado à escolha de um plano.' : `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para o fim do seu teste grátis.`}</p>
      ${endsAt ? `<p style="margin:10px 0 0;font-size:14px;color:#475569;">Data: <strong>${endsAt}</strong></p>` : ''}
    </div>
    <p style="margin:0 0 26px;font-size:14px;color:#64748b;">Escolha seu plano para continuar aproveitando todos os recursos do Plaelo.</p>
    <div style="text-align:center;"><a href="${renewalUrl || 'https://painel.plaelo.com.br/assinatura'}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 42px;border-radius:14px;text-decoration:none;">Escolher meu plano</a></div>`;
  return baseTemplate(expired ? 'Seu teste Plaelo terminou' : 'Seu teste Plaelo está perto do fim', content, 'Lembrete automático do seu período de teste no Plaelo.');
}

/** 11. Comunicados e novidades enviados pelo Super Admin */
function templatePlatformUpdate({ title, content, buttonText, buttonUrl }) {
  const safeContent = String(content || '').replace(/\n/g, '<br>');
  const contentHtml = `<p style="margin:0 0 26px;font-size:15px;line-height:1.75;color:#475569;">${safeContent}</p>`;
  const cta = buttonText && buttonUrl
    ? `<div style="text-align:center;"><a href="${buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:16px 42px;border-radius:14px;text-decoration:none;">${buttonText}</a></div>`
    : '';
  return baseTemplate(title, contentHtml + cta, 'Comunicado enviado pela equipe Plaelo.');
}

function templateNfseDelivered({ patientName, numero, verificationUrl }) {
  const content = `<p style="margin:0 0 18px;font-size:15px;color:#475569;">Olá, <strong>${patientName || 'paciente'}</strong>.</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475569;">Sua Nota Fiscal de Serviço Eletrônica${numero ? ` nº <strong>${numero}</strong>` : ''} está disponível. O PDF segue anexado a este e-mail.</p>
    ${verificationUrl ? `<div style="text-align:center;"><a href="${verificationUrl}" style="display:inline-block;background:linear-gradient(135deg,#150F2E,#6D42F5);color:#fff;font-weight:900;font-size:15px;padding:15px 34px;border-radius:14px;text-decoration:none;">Consultar nota fiscal</a></div>` : ''}`;
  return baseTemplate('Sua Nota Fiscal está disponível', content, 'Mensagem enviada pelo consultório através do Plaelo.');
}

/** 8. Pagamento recebido (Mercado Pago) */
function templatePaymentReceived({ patientName, amount, paymentMethod, comandaId }) {
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const methodLabel = { pix: 'Pix', credito: 'Cartão de Crédito', debito: 'Cartão de Débito' }[paymentMethod] || paymentMethod;
  const content = `
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Você recebeu um novo pagamento pelo <strong style="color:#6D42F5;">Portal do Paciente</strong>! 💰</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">✔️ Pagamento aprovado</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:900;color:#15803d;">${fmt(amount)}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#475569;">${patientName} · ${methodLabel}${comandaId ? ` · Comanda #${comandaId}` : ''}</p>
    </div>
    <p style="margin:0;font-size:12px;color:#94a3b8;">O valor já foi lançado automaticamente no seu Livro Caixa.</p>`;
  return baseTemplate('💰 Pagamento Recebido', content, 'Notificação automática do Mercado Pago.');
}

module.exports = {
  sendMail,
  templates: {
    appointmentReminder: templateAppointmentReminder,
    birthdayReminder: templateBirthdayReminder,
    newAppointment: templateNewAppointment,
    weeklyReport: templateWeeklyReport,
    monthlyReport: templateMonthlyReport,
    welcome: templateWelcome,
    passwordReset: templatePasswordReset,
    teamWelcome: templateTeamWelcome,
    subscriptionReminder: templateSubscriptionReminder,
    trialReminder: templateTrialReminder,
    platformUpdate: templatePlatformUpdate,
    nfseDelivered: templateNfseDelivered,
    paymentReceived: templatePaymentReceived,
  }
};
