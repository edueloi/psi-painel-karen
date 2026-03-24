const cron = require('node-cron');
const db = require('../db');
const { sendMail, templates } = require('./emailService');
const wppService = require('./whatsappService');

// Helper: formata data pt-BR
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
function fmtMonth(d) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
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
    // Padrão: enabled: true se não existir nada salvo (para novos profissionais)
    return { ...DEFAULT_PREFS, enabled: true, ...parsed };
  } catch { return { ...DEFAULT_PREFS, enabled: true }; }
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
    // Pega a hora exata em São Paulo
    const curHour = parseInt(now.toLocaleString('pt-BR', { 
        hour: 'numeric', 
        hour12: false, 
        timeZone: 'America/Sao_Paulo' 
    }));

    let greeting = 'Boa noite'; 
    if (curHour >= 5 && curHour < 12) greeting = 'Bom dia';
    else if (curHour >= 12 && curHour < 18) greeting = 'Boa tarde';

    // Identifica o Master Bot para notificações aos profissionais de toda a rede
    const [saRows] = await db.query(`SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1`);
    const masterTenantId = saRows[0]?.tenant_id;
    let masterBotConnected = false;

    if (masterTenantId) {
       const status = wppService.getStatus(masterTenantId);
       masterBotConnected = status.status === 'connected';
    }

    // Busca agendamentos próximos (24h e 1h)
    const [appointments] = await db.query(`
       SELECT a.*,
         p.name as patient_name, p.phone as patient_phone,
         u.name as professional_name, u.phone as professional_phone, u.email as professional_email,
         u.email_preferences,
         s.name as service_name,
         c.sessions_total, c.sessions_used, c.description as package_name,
         t.whatsapp_status, t.whatsapp_preferences, t.name as clinic_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN comandas c ON c.id = a.comanda_id
       LEFT JOIN tenants t ON t.id = a.tenant_id
       WHERE a.start_time >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
         AND a.start_time < DATE_ADD(NOW(), INTERVAL 25 HOUR)
         AND a.status IN ('scheduled','confirmed')
    `);

    if (appointments.length === 0) return;

    for (const apt of appointments) {
      const aptStart = new Date(apt.start_time);
      const diffMinutes = Math.round((aptStart.getTime() - now.getTime()) / 60000);

      // --- 1. NOTIFICAÇÃO DO PACIENTE (Via WhatsApp PRÓPRIO da Clínica) ---
      // Conforme solicitado: SÓ envia se a clínica tiver conectado o bot dela. O Master NÃO manda para pacientes.
      if (apt.whatsapp_status === 'connected') {
        const prefs = typeof apt.whatsapp_preferences === 'string' ? JSON.parse(apt.whatsapp_preferences || '{}') : (apt.whatsapp_preferences || {});
        const targetPhone = apt.patient_phone;

        if (targetPhone && apt.type === 'consulta') {
          const timeStr = fmtTime(apt.start_time);
          const dateStr = fmtDate(apt.start_time);

          const buildMsg = (template, defaultMsg) => {
             let msg = template || defaultMsg;
             return msg.replace(/\{patient_name\}/g, apt.patient_name || 'Paciente')
                       .replace(/\{professional_name\}/g, apt.professional_name || 'Profissional')
                       .replace(/\{time\}/g, timeStr)
                       .replace(/\{date\}/g, dateStr);
          };

          if (diffMinutes === 60 && prefs.reminder_1h_enabled !== false) {
            const msg = buildMsg(prefs.reminder_1h_msg, `🔔 *Lembrete de Atendimento*\n\nOlá, *{patient_name}*.\nSua sessão com {professional_name} é hoje às {time}.`);
            await wppService.sendReminder(apt.tenant_id, targetPhone, msg);
          }
          if (diffMinutes === 1440 && prefs.reminder_24h_enabled !== false) {
            const msg = buildMsg(prefs.reminder_24h_msg, `🔔 *Aviso Antecipado*\n\nOlá, *{patient_name}*.\nConfirmamos sua consulta para amanhã ({date}) às {time}.`);
            await wppService.sendReminder(apt.tenant_id, targetPhone, msg);
          }
        }
      }

      // --- 2. NOTIFICAÇÃO DO PROFISSIONAL / PARCEIRO (Via WhatsApp Bot MASTER) ---
      // O Master Bot assiste os profissionais de todos os parceiros
      if (masterBotConnected && apt.professional_phone) {
        const profPrefs = getPrefs(apt);
        // Respeita se o profissional quer receber lembretes (intervalo padrão do perfil dele)
        const reminderMinutes = profPrefs.appointment_reminder_minutes || 60;

        if (diffMinutes === reminderMinutes) {
          const timeStr = fmtTime(apt.start_time);
          const label = reminderMinutes === 30 ? '30min' : '1h';
          
          let sessaoInfo = '';
          if (apt.sessions_total > 1) {
             sessaoInfo = `\n📊 *Sessão:* ${(apt.sessions_used || 0) + 1}/${apt.sessions_total}`;
          }

          const icon = apt.type === 'consulta' ? '🩺' : '📅';
          const typeLabel = apt.type === 'consulta' ? 'Atendimento' : (apt.title || 'Evento');

          const wppMsg = `${icon} *${greeting}, ${apt.professional_name}!*\n\nPassando para lembrar do seu próximo ${typeLabel.toLowerCase()}:\n\n👤 *Paciente:* ${apt.patient_name || '—'}\n🕒 *Horário:* ${timeStr}\n🔹 *Serviço:* ${apt.service_name || 'Consulta'}${sessaoInfo}\n🏢 *Clínica:* ${apt.clinic_name || 'PsiFlux'}\n\nBom trabalho! 🚀\n\n_⚠️ Esta é uma mensagem automática, favor não responder._`;
          
          await wppService.sendReminder(masterTenantId, apt.professional_phone, wppMsg);
          console.log(`[CRON-MasterBot] Aviso ${label} enviado para Parceiro ${apt.professional_name} (${apt.clinic_name})`);
        }
      }

      // --- 3. NOTIFICAÇÃO E-MAIL (Fallback padrão) ---
      const profPrefs = getPrefs(apt);
      if (profPrefs.enabled && profPrefs.appointment_reminder_professional && apt.professional_email) {
        const minutes = profPrefs.appointment_reminder_minutes || 60;
        if (diffMinutes === minutes) {
          const html = templates.appointmentReminder({
             patientName: apt.patient_name, date: fmtDate(apt.start_time), time: fmtTime(apt.start_time),
             type: apt.type, modality: apt.modality, professional: apt.professional_name
          });
          await sendMail(apt.professional_email, `⏰ Próximo atendimento: ${apt.patient_name}`, html);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de lembrete profissional:', err.message);
  }
}
async function checkDailyTasks() {
  try {
    const now = new Date();
    const currentHourStr = fmtTime(now); 

    const [tenants] = await db.query(`SELECT id, whatsapp_status, whatsapp_preferences FROM tenants WHERE active = 1`);
    
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();
    const todayStr = now.toISOString().slice(0, 10);

    for (const t of tenants) {
      const prefs = typeof t.whatsapp_preferences === 'string' ? JSON.parse(t.whatsapp_preferences || '{}') : (t.whatsapp_preferences || {});
      const bdayTime = prefs.birthday_time || "10:00";
      const payTime = prefs.payment_time || "10:00";

      // 1. ANIVERSARIANTES
      if (currentHourStr === bdayTime) {
        const [patients] = await db.query(`
          SELECT id, name, full_name, birth_date, whatsapp, phone
          FROM patients
          WHERE tenant_id = ? AND MONTH(birth_date) = ? AND DAY(birth_date) = ? AND status = 'ativo'
        `, [t.id, month, day]);

        if (patients.length > 0) {
          // --- ALERTA SISTEMA E E-MAIL ---
          const users = await getTenantUsers(t.id);
          const html  = templates.birthdayReminder(patients);
          const names = patients.map(p => p.name || p.full_name).filter(Boolean).join(', ');

          await db.query(
            'INSERT INTO system_alerts (tenant_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
            [t.id, `🎂 ${patients.length} aniversariante(s) hoje`, `Paciente(s) fazendo aniversário hoje: ${names}.`, 'info', '/prontuarios']
          ).catch(() => {});

          for (const user of users) {
             const uprefs = getPrefs(user);
             if (uprefs.enabled && uprefs.birthday_reminder) {
               await sendMail(user.email, `🎂 ${patients.length} aniversariante(s) hoje!`, html);
             }
          }

          // --- WHATSAPP (SÓ SE O BOT DA CLÍNICA ESTIVER CONECTADO) ---
          if (t.whatsapp_status === 'connected' && prefs.birthday_enabled !== false) {
            for (const p of patients) {
              const targetPhone = p.whatsapp || p.phone;
              if (!targetPhone) continue;
              
              const defaultMsg = `🎂 *Feliz Aniversário!*\n\nOlá, *{patient_name}*!\nA equipe deseja a você um excelente dia repleto de alegrias e muita paz!`;
              let msg = prefs.birthday_msg || defaultMsg;
              msg = msg.replace(/\{patient_name\}/g, p.name || p.full_name || 'Paciente');

              await wppService.sendReminder(t.id, targetPhone, msg);
              console.log(`[CRON-WPP Tenant ${t.id}] Bday enviado para ${p.name}`);
            }
          }
        }
      }

      // 2. PAGAMENTOS VENCENDO HOJE
      if (currentHourStr === payTime) {
        if (t.whatsapp_status === 'connected' && prefs.payment_enabled !== false) {
          const [payments] = await db.query(`
            SELECT f.id, f.amount, p.name as patient_name, p.whatsapp, p.phone
            FROM financial_transactions f
            JOIN patients p ON p.id = f.patient_id
            WHERE f.tenant_id = ? AND f.due_date = ? AND f.status = 'pending' AND f.type = 'income'
          `, [t.id, todayStr]);

          for (const pay of payments) {
            const targetPhone = pay.whatsapp || pay.phone;
            if (!targetPhone) continue;

            const defaultMsg = `💰 *Lembrete de Pagamento*\n\nOlá, *{patient_name}*.\nLembramos que o vencimento da sua parcela no valor de R$ {amount} é hoje. Qualquer dúvida, estamos à disposição.`;
            let msg = prefs.payment_msg || defaultMsg;
            msg = msg.replace(/\{patient_name\}/g, pay.patient_name || 'Paciente')
                     .replace(/\{amount\}/g, Number(pay.amount).toFixed(2).replace('.', ','));

            await wppService.sendReminder(t.id, targetPhone, msg);
            console.log(`[CRON-WPP Tenant ${t.id}] Pgto enviado para ${pay.patient_name}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro no job de Tarefas Diárias:', err.message);
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
  cron.schedule('* * * * *', checkAppointmentReminders, { timezone: 'America/Sao_Paulo' });
  cron.schedule('* * * * *', checkDailyTasks, { timezone: 'America/Sao_Paulo' });
  cron.schedule('*/30 * * * *', autoConfirmAppointments, { timezone: 'America/Sao_Paulo' });
  autoConfirmAppointments(); // roda uma vez na inicialização

  // Jobs de email só rodam se as variáveis de ambiente estiverem configuradas
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('⚠️  Cron de emails desativado (EMAIL_HOST/EMAIL_USER não configurados)');
    console.log('✅ Cron jobs de automação e WhatsApp iniciados');
    return;
  }

  cron.schedule('0 7 * * 1', sendWeeklyReport, { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 7 1 * *', sendMonthlyReport, { timezone: 'America/Sao_Paulo' });

  console.log('✅ Cron jobs de email, automação e WhatsApp iniciados');
}

module.exports = { startCronJobs, checkAppointmentReminders, checkDailyTasks, sendWeeklyReport, sendMonthlyReport, autoConfirmAppointments };
