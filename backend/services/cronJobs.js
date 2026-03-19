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

// Busca admins/usuários com email de um tenant
async function getTenantAdminEmails(tenantId) {
  const [rows] = await db.query(
    `SELECT email FROM users WHERE tenant_id = ? AND email IS NOT NULL AND email != '' AND status != 'inativo' LIMIT 10`,
    [tenantId]
  );
  return rows.map(r => r.email).filter(Boolean);
}

// Busca todos os tenants ativos
async function getActiveTenants() {
  const [rows] = await db.query(
    `SELECT DISTINCT tenant_id FROM users WHERE status != 'inativo' AND tenant_id IS NOT NULL`
  );
  return rows.map(r => r.tenant_id);
}

// ─── JOB 1: Lembrete de atendimento (1 hora antes) ────────────────────────
// Roda a cada minuto, busca atendimentos que começam entre 55 e 65 min
async function checkAppointmentReminders() {
  try {
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
    const toStr = to.toISOString().slice(0, 19).replace('T', ' ');

    const [appointments] = await db.query(`
      SELECT a.*, p.name as patient_name, u.name as professional_name, u.email as professional_email
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      WHERE a.start_time >= ? AND a.start_time < ?
        AND a.status IN ('scheduled', 'confirmed')
        AND a.type = 'consulta'
    `, [fromStr, toStr]);

    for (const apt of appointments) {
      const emails = [];

      // Email do profissional
      if (apt.professional_email) emails.push(apt.professional_email);

      // Fallback: admins do tenant
      if (emails.length === 0 && apt.tenant_id) {
        const adminEmails = await getTenantAdminEmails(apt.tenant_id);
        emails.push(...adminEmails);
      }

      if (emails.length === 0) continue;

      const html = templates.appointmentReminder({
        patientName: apt.patient_name || 'Paciente',
        date: fmtDate(apt.start_time),
        time: fmtTime(apt.start_time),
        type: apt.type,
        modality: apt.modality,
        professional: apt.professional_name,
      });

      for (const email of emails) {
        await sendMail(email, `⏰ Atendimento em 1h — ${apt.patient_name}`, html);
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
    const day = today.getDate();

    for (const tenantId of tenants) {
      const [patients] = await db.query(`
        SELECT id, name, full_name, birth_date, whatsapp, phone
        FROM patients
        WHERE tenant_id = ?
          AND MONTH(birth_date) = ?
          AND DAY(birth_date) = ?
          AND status = 'ativo'
      `, [tenantId, month, day]);

      if (patients.length === 0) continue;

      const emails = await getTenantAdminEmails(tenantId);
      if (emails.length === 0) continue;

      const html = templates.birthdayReminder(patients);

      for (const email of emails) {
        await sendMail(email, `🎂 ${patients.length} aniversariante(s) hoje!`, html);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de aniversariantes:', err.message);
  }
}

// ─── JOB 3: Relatório semanal (toda segunda-feira, 7h) ────────────────────
async function sendWeeklyReport() {
  try {
    const tenants = await getActiveTenants();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = now.toISOString().slice(0, 10);

    for (const tenantId of tenants) {
      const emails = await getTenantAdminEmails(tenantId);
      if (emails.length === 0) continue;

      // Contagens de atendimentos
      const [[aptStats]] = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(status = 'completed' OR status = 'confirmed') as completed,
          SUM(status = 'cancelled') as cancelled
        FROM appointments
        WHERE tenant_id = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?
          AND type = 'consulta'
      `, [tenantId, startStr, endStr]);

      // Novos pacientes
      const [[{ newPatients }]] = await db.query(`
        SELECT COUNT(*) as newPatients FROM patients
        WHERE tenant_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?
      `, [tenantId, startStr, endStr]);

      // Receita
      const [[{ revenue }]] = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as revenue FROM financial_transactions
        WHERE tenant_id = ? AND type = 'income' AND date >= ? AND date <= ?
      `, [tenantId, startStr, endStr]);

      // Paciente com mais atendimentos na semana
      const [[topPat]] = await db.query(`
        SELECT p.name as name, COUNT(*) as cnt
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.tenant_id = ? AND DATE(a.start_time) >= ? AND DATE(a.start_time) <= ?
          AND a.type = 'consulta'
        GROUP BY a.patient_id ORDER BY cnt DESC LIMIT 1
      `, [tenantId, startStr, endStr]).catch(() => [[null]]);

      const html = templates.weeklyReport({
        weekLabel: fmtWeek(weekStart, now),
        appointments: aptStats.total || 0,
        completedCount: aptStats.completed || 0,
        cancelledCount: aptStats.cancelled || 0,
        newPatients: newPatients || 0,
        revenue: Number(revenue) || 0,
        topPatient: topPat?.name || null,
      });

      for (const email of emails) {
        await sendMail(email, `📊 Relatório Semanal — ${fmtWeek(weekStart, now)}`, html);
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de relatório semanal:', err.message);
  }
}

// ─── JOB 4: Relatório mensal (dia 1 de cada mês, 7h) ─────────────────────
async function sendMonthlyReport() {
  try {
    const tenants = await getActiveTenants();
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = prevMonth.toISOString().slice(0, 10);
    const endStr = prevMonthEnd.toISOString().slice(0, 10);

    for (const tenantId of tenants) {
      const emails = await getTenantAdminEmails(tenantId);
      if (emails.length === 0) continue;

      // Atendimentos
      const [[aptStats]] = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(status = 'completed' OR status = 'confirmed') as completed,
          SUM(status = 'cancelled') as cancelled
        FROM appointments
        WHERE tenant_id = ? AND DATE(start_time) >= ? AND DATE(start_time) <= ?
          AND type = 'consulta'
      `, [tenantId, startStr, endStr]);

      // Novos pacientes
      const [[{ newPatients }]] = await db.query(`
        SELECT COUNT(*) as newPatients FROM patients
        WHERE tenant_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?
      `, [tenantId, startStr, endStr]);

      // Financeiro
      const [[finStats]] = await db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
        FROM financial_transactions
        WHERE tenant_id = ? AND date >= ? AND date <= ?
      `, [tenantId, startStr, endStr]);

      const revenue = Number(finStats.revenue) || 0;
      const expense = Number(finStats.expense) || 0;

      // Top 5 clientes
      const [topClients] = await db.query(`
        SELECT p.name, COALESCE(SUM(ft.amount), 0) as totalRevenue
        FROM financial_transactions ft
        LEFT JOIN patients p ON p.id = ft.patient_id
        WHERE ft.tenant_id = ? AND ft.type = 'income' AND ft.date >= ? AND ft.date <= ?
          AND p.name IS NOT NULL
        GROUP BY ft.patient_id
        ORDER BY totalRevenue DESC LIMIT 5
      `, [tenantId, startStr, endStr]);

      // Ticket médio
      const sessionsCount = Number(aptStats.completed) || 0;
      const avgTicket = sessionsCount > 0 ? revenue / sessionsCount : 0;

      const html = templates.monthlyReport({
        monthLabel: fmtMonth(prevMonth),
        totalAppointments: aptStats.total || 0,
        completedCount: aptStats.completed || 0,
        cancelledCount: aptStats.cancelled || 0,
        newPatients: newPatients || 0,
        revenue,
        expense,
        profit: revenue - expense,
        topClients,
        avgTicket,
      });

      for (const email of emails) {
        await sendMail(email, `📅 Relatório Mensal — ${fmtMonth(prevMonth)}`, html);
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
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('⚠️  Cron de emails desativado (EMAIL_HOST/EMAIL_USER não configurados)');
    return;
  }

  // A cada minuto: lembrete de atendimento (1h antes)
  cron.schedule('* * * * *', checkAppointmentReminders, { timezone: 'America/Sao_Paulo' });

  // Todo dia às 8h: aniversariantes
  cron.schedule('0 8 * * *', checkBirthdays, { timezone: 'America/Sao_Paulo' });

  // Toda segunda às 7h: relatório semanal
  cron.schedule('0 7 * * 1', sendWeeklyReport, { timezone: 'America/Sao_Paulo' });

  // Todo dia 1 às 7h: relatório mensal
  cron.schedule('0 7 1 * *', sendMonthlyReport, { timezone: 'America/Sao_Paulo' });

  // A cada 30 minutos: confirmação de atendimentos passados
  cron.schedule('*/30 * * * *', autoConfirmAppointments, { timezone: 'America/Sao_Paulo' });
  
  // Executa uma vez no início
  autoConfirmAppointments();

  console.log('✅ Cron jobs de email e automação iniciados');
}

module.exports = { startCronJobs, checkAppointmentReminders, checkBirthdays, sendWeeklyReport, sendMonthlyReport, autoConfirmAppointments };
