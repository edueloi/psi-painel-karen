const cron = require('node-cron');
const db = require('../db');
const { sendMail, templates } = require('./emailService');

// Helper: formata data pt-BR
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtMonth(d) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function fmtWeek(start, end) {
  return `${fmtDate(start)} a ${fmtDate(end)}`;
}

const DEFAULT_PREFS = {
  enabled: false,
  new_appointment: false,
  appointment_reminder_professional: false,
  appointment_reminder_patient: false,
  appointment_reminder_minutes: 60,
  birthday_reminder: false,
  weekly_report: false,
  monthly_report: false,
  form_response: false,
};

function getPrefs(user) {
  try {
    const raw = user.email_preferences;
    const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    return { ...DEFAULT_PREFS, ...parsed };
  } catch { return DEFAULT_PREFS; }
}

// Busca usuários ativos com email de um tenant (com preferências)
async function getTenantUsers(tenantId) {
  const [rows] = await db.query(
    `SELECT id, email, name, email_preferences FROM users
     WHERE tenant_id = ? AND email IS NOT NULL AND email != '' LIMIT 20`,
    [tenantId]
  );
  return rows.filter(r => r.email);
}

// Busca todos os tenants ativos
async function getActiveTenants() {
  const [rows] = await db.query(
    `SELECT DISTINCT tenant_id FROM users WHERE tenant_id IS NOT NULL`
  );
  return rows.map(r => r.tenant_id);
}

// ─── JOB 1: Lembrete de atendimento ──────────────────────────────────────
// Roda a cada minuto, respeita preferência de antecedência de cada profissional
async function checkAppointmentReminders() {
  try {
    const now = new Date();

    // Busca atendimentos nas próximas 25–95 min (cobre 30 e 60 min com margem)
    const from = new Date(now.getTime() + 25 * 60 * 1000);
    const to   = new Date(now.getTime() + 95 * 60 * 1000);
    const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
    const toStr   = to.toISOString().slice(0, 19).replace('T', ' ');

    const [appointments] = await db.query(`
      SELECT a.*,
        p.name as patient_name, p.email as patient_email,
        u.name as professional_name, u.email as professional_email,
        u.email_preferences
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      WHERE a.start_time >= ? AND a.start_time < ?
        AND a.status IN ('scheduled','confirmed')
        AND a.type = 'consulta'
    `, [fromStr, toStr]);

    for (const apt of appointments) {
      const prefs = getPrefs(apt);
      if (!prefs.enabled) continue;
      if (!prefs.appointment_reminder_professional && !prefs.appointment_reminder_patient) continue;

      const minutes = prefs.appointment_reminder_minutes || 60;
      const targetTime = new Date(now.getTime() + minutes * 60 * 1000);
      const aptStart   = new Date(apt.start_time);
      const diff = Math.abs(aptStart - targetTime) / 60000;
      if (diff > 5) continue; // só dispara se estiver na janela certa

      const label = minutes === 30 ? '30min' : '1h';

      // Envia para o profissional
      if (prefs.appointment_reminder_professional && apt.professional_email) {
        const html = templates.appointmentReminder({
          patientName:  apt.patient_name || 'Paciente',
          date:         fmtDate(apt.start_time),
          time:         fmtTime(apt.start_time),
          type:         apt.type,
          modality:     apt.modality,
          professional: apt.professional_name,
        });
        await sendMail(apt.professional_email, `⏰ Atendimento em ${label} — ${apt.patient_name}`, html);
      }

      // Envia para o paciente (se tiver email e profissional habilitou)
      if (prefs.appointment_reminder_patient && apt.patient_email) {
        const patHtml = templates.appointmentReminder({
          patientName:  apt.patient_name || 'Você',
          date:         fmtDate(apt.start_time),
          time:         fmtTime(apt.start_time),
          type:         apt.type,
          modality:     apt.modality,
          professional: apt.professional_name,
        });
        await sendMail(apt.patient_email, `⏰ Lembrete de consulta em ${label}`, patHtml);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de lembrete de atendimento:', err.message);
  }
}

// ─── JOB 2: Aniversariantes do dia (diário, 8h) ───────────────────────────
async function checkBirthdays() {
  try {
    const tenants = await getActiveTenants();
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();

    for (const tenantId of tenants) {
      const [patients] = await db.query(`
        SELECT id, name, full_name, birth_date, whatsapp, phone
        FROM patients
        WHERE tenant_id = ? AND MONTH(birth_date) = ? AND DAY(birth_date) = ? AND status = 'ativo'
      `, [tenantId, month, day]);

      if (patients.length === 0) continue;

      const users = await getTenantUsers(tenantId);
      const html  = templates.birthdayReminder(patients);
      const names = patients.map(p => p.name || p.full_name).filter(Boolean).join(', ');

      // Cria alerta no sistema para o tenant (independente de preferência de email)
      await db.query(
        'INSERT INTO system_alerts (tenant_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [
          tenantId,
          `🎂 ${patients.length} aniversariante(s) hoje`,
          `Paciente(s) fazendo aniversário hoje: ${names}.`,
          'info',
          '/prontuarios'
        ]
      ).catch(() => {});

      for (const user of users) {
        const prefs = getPrefs(user);
        if (!prefs.enabled || !prefs.birthday_reminder) continue;
        await sendMail(user.email, `🎂 ${patients.length} aniversariante(s) hoje!`, html);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de aniversariantes:', err.message);
  }
}

// ─── JOB 3: Relatório semanal (toda segunda-feira, 7h) ────────────────────
async function sendWeeklyReport() {
  try {
    const tenants  = await getActiveTenants();
    const now      = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr   = now.toISOString().slice(0, 10);

    for (const tenantId of tenants) {
      const users = await getTenantUsers(tenantId);
      if (users.length === 0) continue;

      const [[aptStats]] = await db.query(`
        SELECT COUNT(*) as total,
          SUM(status='completed' OR status='confirmed') as completed,
          SUM(status='cancelled') as cancelled
        FROM appointments
        WHERE tenant_id=? AND DATE(start_time)>=? AND DATE(start_time)<=? AND type='consulta'
      `, [tenantId, startStr, endStr]);

      const [[{ newPatients }]] = await db.query(
        `SELECT COUNT(*) as newPatients FROM patients WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?`,
        [tenantId, startStr, endStr]
      );

      const [[{ revenue }]] = await db.query(
        `SELECT COALESCE(SUM(amount),0) as revenue FROM financial_transactions WHERE tenant_id=? AND type='income' AND date>=? AND date<=?`,
        [tenantId, startStr, endStr]
      );

      const [[topPat]] = await db.query(`
        SELECT p.name, COUNT(*) as cnt FROM appointments a
        LEFT JOIN patients p ON p.id=a.patient_id
        WHERE a.tenant_id=? AND DATE(a.start_time)>=? AND DATE(a.start_time)<=? AND a.type='consulta'
        GROUP BY a.patient_id ORDER BY cnt DESC LIMIT 1
      `, [tenantId, startStr, endStr]).catch(() => [[null]]);

      const html = templates.weeklyReport({
        weekLabel:      fmtWeek(weekStart, now),
        appointments:   aptStats.total || 0,
        completedCount: aptStats.completed || 0,
        cancelledCount: aptStats.cancelled || 0,
        newPatients:    newPatients || 0,
        revenue:        Number(revenue) || 0,
        topPatient:     topPat?.name || null,
      });

      for (const user of users) {
        const prefs = getPrefs(user);
        if (!prefs.enabled || !prefs.weekly_report) continue;
        await sendMail(user.email, `📊 Relatório Semanal — ${fmtWeek(weekStart, now)}`, html);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de relatório semanal:', err.message);
  }
}

// ─── JOB 4: Relatório mensal (dia 1, 7h) ─────────────────────────────────
async function sendMonthlyReport() {
  try {
    const tenants      = await getActiveTenants();
    const now          = new Date();
    const prevMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr     = prevMonth.toISOString().slice(0, 10);
    const endStr       = prevMonthEnd.toISOString().slice(0, 10);

    for (const tenantId of tenants) {
      const users = await getTenantUsers(tenantId);
      if (users.length === 0) continue;

      const [[aptStats]] = await db.query(`
        SELECT COUNT(*) as total,
          SUM(status='completed' OR status='confirmed') as completed,
          SUM(status='cancelled') as cancelled
        FROM appointments
        WHERE tenant_id=? AND DATE(start_time)>=? AND DATE(start_time)<=? AND type='consulta'
      `, [tenantId, startStr, endStr]);

      const [[{ newPatients }]] = await db.query(
        `SELECT COUNT(*) as newPatients FROM patients WHERE tenant_id=? AND DATE(created_at)>=? AND DATE(created_at)<=?`,
        [tenantId, startStr, endStr]
      );

      const [[finStats]] = await db.query(`
        SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as revenue,
               COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense
        FROM financial_transactions WHERE tenant_id=? AND date>=? AND date<=?
      `, [tenantId, startStr, endStr]);

      const revenue = Number(finStats.revenue) || 0;
      const expense = Number(finStats.expense) || 0;

      const [topClients] = await db.query(`
        SELECT p.name, COALESCE(SUM(ft.amount),0) as totalRevenue
        FROM financial_transactions ft LEFT JOIN patients p ON p.id=ft.patient_id
        WHERE ft.tenant_id=? AND ft.type='income' AND ft.date>=? AND ft.date<=? AND p.name IS NOT NULL
        GROUP BY ft.patient_id ORDER BY totalRevenue DESC LIMIT 5
      `, [tenantId, startStr, endStr]);

      const sessionsCount = Number(aptStats.completed) || 0;
      const avgTicket     = sessionsCount > 0 ? revenue / sessionsCount : 0;

      const html = templates.monthlyReport({
        monthLabel:        fmtMonth(prevMonth),
        totalAppointments: aptStats.total || 0,
        completedCount:    aptStats.completed || 0,
        cancelledCount:    aptStats.cancelled || 0,
        newPatients:       newPatients || 0,
        revenue, expense, profit: revenue - expense, topClients, avgTicket,
      });

      for (const user of users) {
        const prefs = getPrefs(user);
        if (!prefs.enabled || !prefs.monthly_report) continue;
        await sendMail(user.email, `📅 Relatório Mensal — ${fmtMonth(prevMonth)}`, html);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de relatório mensal:', err.message);
  }
}

// ─── JOB 5: Confirmação automática de atendimentos passados ──────────────
async function autoConfirmAppointments() {
  try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await db.query(`
          UPDATE appointments 
          SET status = 'confirmed' 
          WHERE status = 'scheduled' AND start_time < ?
      `, [now]);
      if (result.affectedRows > 0) {
          console.log(`✅ [Cron] ${result.affectedRows} agendamentos passados marcados como confirmados.`);
      }
  } catch (err) {
      console.error('❌ Erro no job de confirmação automática:', err.message);
  }
}

// ─── Inicializar todos os cron jobs ──────────────────────────────────────────
function startCronJobs() {
  // Jobs que NÃO dependem de email sempre rodam
  cron.schedule('0 8 * * *', checkBirthdays, { timezone: 'America/Sao_Paulo' });
  cron.schedule('*/30 * * * *', autoConfirmAppointments, { timezone: 'America/Sao_Paulo' });
  autoConfirmAppointments(); // roda uma vez na inicialização

  // Jobs de email só rodam se as variáveis de ambiente estiverem configuradas
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('⚠️  Cron de emails desativado (EMAIL_HOST/EMAIL_USER não configurados)');
    console.log('✅ Cron jobs de automação iniciados (sem email)');
    return;
  }

  cron.schedule('* * * * *', checkAppointmentReminders, { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 7 * * 1', sendWeeklyReport, { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 7 1 * *', sendMonthlyReport, { timezone: 'America/Sao_Paulo' });

  console.log('✅ Cron jobs de email e automação iniciados');
}

module.exports = { startCronJobs, checkAppointmentReminders, checkBirthdays, sendWeeklyReport, sendMonthlyReport, autoConfirmAppointments };
