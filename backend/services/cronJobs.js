const cron = require('node-cron');
const db = require('../db');
const { sendMail, templates } = require('./emailService');
const wppService = require('./whatsappService');
const notificationService = require('./notificationService');

// Guard: evita que crons sobreponham execuções caso demorem mais de 1 minuto
const _running = {};
async function withLock(name, fn) {
  if (_running[name]) return;
  _running[name] = true;
  try { await fn(); } finally { _running[name] = false; }
}

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

// A coluna shared_with agora é garantida por patch externo ou scripts de inicialização
// A função anterior causava Deadlocks e lentidões.
async function ensureSharedWith() {
  /* No-op — Garantido externamente */
}
ensureSharedWith();

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
         t.whatsapp_status, t.whatsapp_preferences, t.name as clinic_name,
         a.whatsapp_reminder_1h_sent, a.whatsapp_reminder_24h_sent, a.whatsapp_reminder_professional_sent
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN comandas c ON c.id = a.comanda_id
       LEFT JOIN tenants t ON t.id = a.tenant_id
       WHERE a.start_time >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) 
         AND a.start_time < DATE_ADD(NOW(), INTERVAL 26 HOUR)
         AND a.status IN ('scheduled','confirmed')
         AND (a.whatsapp_reminder_1h_sent = 0 OR a.whatsapp_reminder_24h_sent = 0 OR a.whatsapp_reminder_professional_sent = 0)
    `);

    if (appointments.length === 0) return;

    for (const apt of appointments) {
      const aptStart = new Date(apt.start_time);
      const diffMinutes = Math.round((aptStart.getTime() - now.getTime()) / 60000);

      // --- 1. NOTIFICAÇÃO DO PACIENTE (Via WhatsApp PRÓPRIO da Clínica) ---
      // Conforme solicitado: SÓ envia se a clínica tiver conectado o bot dela. O Master NÃO manda para pacientes.
      if (apt.whatsapp_status === 'connected' && apt.tenant_id != masterTenantId) {
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

          // Modificado: Janela de tolerância e controle para evitar duplicados ou faltas
          if (diffMinutes > 30 && diffMinutes <= 70 && !apt.whatsapp_reminder_1h_sent && prefs.reminder_1h_enabled !== false) {
            const msg = buildMsg(prefs.reminder_1h_msg, `🔔 *Lembrete de Atendimento*\n\nOlá, *{patient_name}*.\nSua sessão com {professional_name} é hoje às {time}.`);
            // Enqueue instead of direct send
            await notificationService.enqueue({
              tenant_id: apt.tenant_id,
              recipient_phone: targetPhone,
              content: msg,
              metadata: { apt_id: apt.id, type: '1h-reminder-patient' }
            });
            await db.query('UPDATE appointments SET whatsapp_reminder_1h_sent = 1 WHERE id = ?', [apt.id]);
            console.log(`[CRON-QUEUE Patient 1h] Agendado para Tenant ${apt.tenant_id}: ${apt.patient_name}`);
          }
          if (diffMinutes > 1400 && diffMinutes <= 1460 && !apt.whatsapp_reminder_24h_sent && prefs.reminder_24h_enabled !== false) {
            const msg = buildMsg(prefs.reminder_24h_msg, `🔔 *Aviso Antecipado*\n\nOlá, *{patient_name}*.\nConfirmamos sua consulta para amanhã ({date}) às {time}.`);
            // Enqueue instead of direct send
            await notificationService.enqueue({
              tenant_id: apt.tenant_id,
              recipient_phone: targetPhone,
              content: msg,
              metadata: { apt_id: apt.id, type: '24h-reminder-patient' }
            });
            await db.query('UPDATE appointments SET whatsapp_reminder_24h_sent = 1 WHERE id = ?', [apt.id]);
            console.log(`[CRON-QUEUE Patient 24h] Agendado para Tenant ${apt.tenant_id}: ${apt.patient_name}`);
          }
        }
      }

      // --- 2. NOTIFICAÇÃO DO PROFISSIONAL / PARCEIRO (Via WhatsApp Bot MASTER) ---
      // O Master Bot assiste os profissionais de todos os parceiros
      if (masterBotConnected && apt.professional_phone) {
        const profPrefs = getPrefs(apt);
        // Respeita se o profissional quer receber lembretes (intervalo padrão do perfil dele)
        const reminderMinutes = profPrefs.appointment_reminder_minutes || 60;

        // Modificado para janela de tolerância e flag persistente para profissionais
        if (diffMinutes >= reminderMinutes - 10 && diffMinutes <= reminderMinutes + 10 && !apt.whatsapp_reminder_professional_sent) {
          const timeStr = fmtTime(apt.start_time);
          const label = reminderMinutes === 30 ? '30min' : '1h';
          
          let sessaoInfo = '';
          if (apt.sessions_total > 1) {
             sessaoInfo = `\n📊 *Sessão:* ${(apt.sessions_used || 0) + 1}/${apt.sessions_total}`;
          }

          const icon = apt.type === 'consulta' ? '🩺' : '📅';
          const typeLabel = apt.type === 'consulta' ? 'Atendimento' : (apt.title || 'Evento');

          const phrase = getRandomPhrase();
          const wppMsg = `${icon} *${greeting}, ${apt.professional_name}!*\n\nPassando para lembrar do seu próximo ${typeLabel.toLowerCase()}:\n\n👤 *Paciente:* ${apt.patient_name || '—'}\n🕒 *Horário:* ${timeStr}\n🔹 *Serviço:* ${apt.service_name || 'Consulta'}${sessaoInfo}\n🏢 *Clínica:* ${apt.clinic_name || 'PsiFlux'}\n\n${phrase}\n\nBom trabalho! 🚀\n\n_⚠️ Esta é uma mensagem automática, favor não responder._`;
          
          await notificationService.enqueue({
             tenant_id: masterTenantId,
             recipient_phone: apt.professional_phone,
             content: wppMsg,
             metadata: { apt_id: apt.id, type: 'reminder-professional', professional_id: apt.professional_id }
          });
          await db.query('UPDATE appointments SET whatsapp_reminder_professional_sent = 1 WHERE id = ?', [apt.id]);
          console.log(`[CRON-QUEUE Professional ${label}] Agendado via MasterBot para Parceiro ${apt.professional_name}`);
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
    const [saRows] = await db.query(`SELECT tenant_id FROM users WHERE role = 'super_admin' LIMIT 1`);
    const masterTenantId = saRows[0]?.tenant_id;
    
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

          // --- WHATSAPP (SÓ SE O BOT DA CLÍNICA ESTIVER CONECTADO - O MASTER NÃO MANDA PARA PACIENTES) ---
          if (t.whatsapp_status === 'connected' && t.id != masterTenantId && prefs.birthday_enabled !== false) {
            for (const p of patients) {
              const targetPhone = p.whatsapp || p.phone;
              if (!targetPhone) continue;
              
              const defaultMsg = `🎂 *Feliz Aniversário!*\n\nOlá, *{patient_name}*!\nA equipe deseja a você um excelente dia repleto de alegrias e muita paz!`;
              let msg = prefs.birthday_msg || defaultMsg;
              msg = msg.replace(/\{patient_name\}/g, p.name || p.full_name || 'Paciente');

              await notificationService.enqueue({
                tenant_id: t.id,
                recipient_phone: targetPhone,
                content: msg,
                metadata: { patient_id: p.id, type: 'birthday' }
              });
              console.log(`[CRON-QUEUE Birthday] Agendado para Tenant ${t.id}: ${p.name}`);
            }
          }
        }
      }

      // 2. PAGAMENTOS VENCENDO HOJE
      if (currentHourStr === payTime) {
        if (t.whatsapp_status === 'connected' && t.id != masterTenantId && prefs.payment_enabled !== false) {
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

            await notificationService.enqueue({
              tenant_id: t.id,
              recipient_phone: targetPhone,
              content: msg,
              metadata: { payment_id: pay.id, type: 'payment-reminder' }
            });
            console.log(`[CRON-QUEUE Payment] Agendado para Tenant ${t.id}: ${pay.patient_name}`);
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
  cron.schedule('* * * * *', () => withLock('reminders', checkAppointmentReminders), { timezone: 'America/Sao_Paulo' });
  cron.schedule('* * * * *', () => withLock('dailyTasks', checkDailyTasks), { timezone: 'America/Sao_Paulo' });
  cron.schedule('* * * * *', () => withLock('processQueue', () => notificationService.processQueue()), { timezone: 'America/Sao_Paulo' });
  cron.schedule('*/30 * * * *', () => withLock('autoConfirm', autoConfirmAppointments), { timezone: 'America/Sao_Paulo' });
  
  notificationService.ensureSchema();
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


// --- Banco de Frases Motivacionais ---
const MOTIVATIONAL_PHRASES = [
  "Bom trabalho hoje. Siga com calma e foco.",
  "Que seu dia seja leve e produtivo.",
  "Um passo de cada vez também leva longe.",
  "Faça o possível de hoje com presença.",
  "Que seu trabalho renda com tranquilidade.",
  "Foque no que está ao seu alcance.",
  "O progresso também acontece aos poucos.",
  "Respire fundo e siga no seu ritmo.",
  "Pequenos avanços também são conquistas.",
  "Que hoje haja clareza nas suas decisões.",
  "Começar já é uma forma de vencer.",
  "Consistência vale mais que pressa.",
  "Um dia organizado começa com uma mente calma.",
  "Vá com foco, sem esquecer de respirar.",
  "O importante é seguir, mesmo devagar.",
  "Seu esforço de hoje importa.",
  "Que o dia seja produtivo e sereno.",
  "A constância constrói resultados.",
  "Mantenha o foco no que realmente importa.",
  "Trabalhe com atenção, não com tensão.",
  "Nem tudo precisa ser resolvido de uma vez.",
  "Fazer bem feito começa com presença.",
  "A calma também melhora a produtividade.",
  "Hoje pode ser um bom dia para avançar.",
  "A disciplina sustenta o que a motivação começa.",
  "Faça o melhor que puder com o que tem hoje.",
  "A clareza vem quando a mente desacelera.",
  "Produzir com equilíbrio vale mais.",
  "Cada tarefa concluída é um passo adiante.",
  "Que seu dia tenha mais leveza e menos pressão.",
  "O foco reduz o ruído e amplia os resultados.",
  "A mente descansada decide melhor.",
  "Um bom trabalho começa com atenção ao presente.",
  "Continue. A constância gera frutos.",
  "O ritmo certo é aquele que pode ser sustentado.",
  "Mais presença, menos pressa.",
  "O excesso de cobrança não melhora o resultado.",
  "Hoje é uma nova chance de fazer diferente.",
  "A serenidade também é uma forma de força.",
  "Bons resultados nascem de bons hábitos.",
  "O importante é avançar com consciência.",
  "Priorizar também é cuidar da mente.",
  "Faça uma coisa de cada vez.",
  "A produtividade saudável respeita limites.",
  "Um dia bem vivido não precisa ser perfeito.",
  "O foco no presente reduz a ansiedade.",
  "Que hoje não falte clareza nem equilíbrio.",
  "Comece pelo que é possível agora.",
  "A pausa certa também faz parte do processo.",
  "Organizar a mente ajuda a organizar o dia.",
  "A disciplina torna o caminho mais leve.",
  "Hoje vale a pena confiar no processo.",
  "Trabalhar bem também é saber dosar a energia.",
  "A atenção ao agora transforma o resultado.",
  "Pensamentos calmos ajudam escolhas melhores.",
  "A qualidade cresce quando a mente desacelera.",
  "Menos urgência, mais direção.",
  "Faça com presença aquilo que está diante de você.",
  "Todo progresso começa com continuidade.",
  "Que seu dia seja produtivo, leve e consciente.",
  "Seu ritmo merece respeito.",
  "Nem toda pausa é atraso.",
  "Cuidar da mente também é produtividade.",
  "A pressa nem sempre ajuda a chegar melhor.",
  "Fazer com presença vale mais do que fazer no automático.",
  "O excesso de cobrança pesa mais do que impulsiona.",
  "A constância fortalece o caminho.",
  "Sua energia também precisa de cuidado.",
  "Um dia de cada vez já é um bom começo.",
  "Pensar com calma ajuda a agir melhor.",
  "Nem tudo precisa ser resolvido agora.",
  "O equilíbrio sustenta resultados mais saudáveis.",
  "A mente sobrecarregada precisa de gentileza.",
  "Limites também são sinais de sabedoria.",
  "O foco cresce quando o ruído interno diminui.",
  "O autocuidado melhora a forma de produzir.",
  "Há força em seguir com consciência.",
  "Respeitar o próprio tempo também é maturidade.",
  "A organização externa começa na clareza interna. ",
  "Estar presente já muda muita coisa.",
  "Nem toda exigência leva ao melhor resultado.",
  "A serenidade melhora a percepção.",
  "Uma tarefa por vez já é avanço.",
  "Sua mente merece um ambiente mais leve.",
  "Clareza emocional favorece boas decisões.",
  "O corpo também fala quando o cansaço chega.",
  "Fazer menos, com qualidade, também é evoluir. ",
  "A ansiedade acelera, mas nem sempre direciona.",
  "O agora é o lugar possível de ação.",
  "Pequenas regulações fazem grande diferença.",
  "O descanso também participa do desempenho. ",
  "Sua atenção é um recurso valioso.",
  "Pensamentos mais calmos criam caminhos mais claros.",
  "Nem toda tensão é sinal de compromisso.",
  "O excesso de comparação enfraquece a percepção de valor.",
  "Respeitar limites reduz desgastes desnecessários.",
  "A autocrítica em excesso não melhora resultados.",
  "Há potência em uma mente mais organizada.",
  "Emoções reconhecidas pesam menos.",
  "A disciplina saudável não precisa vir com dureza.",
  "Fazer o que é possível hoje já importa.",
  "A presença reduz o impacto do automático.",
  "Um dia produtivo não precisa ser exaustivo.",
  "A forma como você se trata influencia seu rendimento.",
  "A leveza também favorece a eficiência.",
  "Toda escolha consciente fortalece o processo.",
  "Reduzir a pressão pode ampliar a clareza.",
  "O silêncio interno ajuda a priorizar.",
  "A mente precisa de pausas para reorganizar.",
  "O equilíbrio é parte do desempenho sustentável.",
  "Reconhecer o cansaço é um ato de consciência.",
  "Pensar demais pode afastar da ação simples.",
  "Boas decisões costumam nascer de mais presença.",
  "O foco se fortalece com direção.",
  "A produtividade saudável não ignora o emocional.",
  "Seu valor não depende apenas do quanto produz.",
  "Agir com consciência diminui o desgaste mental.",
  "A estabilidade emocional também apoia o trabalho.",
  "A gentileza consigo pode mudar o seu dia.",
  "Cuidar da mente é parte de qualquer bom processo.",
  "Hoje pode ser melhor do que parece.",
  "Coisas boas também começam aos poucos.",
  "Sempre existe uma nova chance de recomeçar.",
  "Um passo pequeno ainda é um passo.",
  "O dia pode surpreender de forma boa.",
  "Há força até nos avanços discretos.",
  "Nem tudo floresce no mesmo tempo.",
  "O que hoje parece lento ainda é progresso.",
  "A esperança também move caminhos.",
  "Um novo dia sempre traz novas possibilidades.",
  "A luz chega, mesmo depois de dias difíceis.",
  "Todo começo simples pode crescer.",
  "O melhor ainda pode estar em construção.",
  "Há beleza em continuar tentando.",
  "O amanhã não precisa repetir o hoje.",
  "Pequenas vitórias também transformam.",
  "O caminho melhora para quem continua.",
  "Sempre há algo bom a ser cultivado.",
  "Recomeçar também é sinal de força.",
  "Grandes mudanças nascem de pequenas decisões.",
  "Nem todo resultado aparece de imediato.",
  "O importante é não desistir de si.",
  "Dias leves também chegam.",
  "O bem também acontece em silêncio.",
  "Cada manhã renova possibilidades.",
  "O futuro pode guardar boas surpresas.",
  "A constância abre portas com o tempo.",
  "Sempre existe algo que pode dar certo.",
  "O progresso nem sempre é visível, mas existe.",
  "Continuar já é uma forma de acreditar.",
  "Há motivos para seguir em frente.",
  "A esperança cresce quando é alimentada.",
  "O que parece difícil hoje pode ficar mais leve amanhã.",
  "Tudo pode começar a mudar em um detalhe.",
  "Boas fases também encontram seu tempo.",
  "A vida também sabe se reorganizar.",
  "O melhor pode nascer do que parecia pequeno.",
  "Há força em quem segue com fé no processo.",
  "Nem todo dia é igual, e isso é uma boa notícia.",
  "O tempo também trabalha a favor de quem persiste.",
  "Sempre há espaço para algo novo florescer.",
  "Um pensamento bom pode mudar a direção do dia.",
  "As dificuldades não anulam as possibilidades.",
  "Toda caminhada tem momentos de sol.",
  "O coração também aprende a respirar melhor.",
  "Há futuro mesmo quando o presente pesa.",
  "Avançar devagar ainda é avançar.",
  "O bem pode estar mais perto do que parece.",
  "Toda fase difícil também passa.",
  "O dia de hoje pode abrir novas portas.",
  "Vale a pena continuar acreditando.",
  "A coragem cresce no movimento.",
  "Há mais saída do que a mente cansada enxerga.",
  "Coisas boas pedem tempo, mas chegam.",
  "Até os dias comuns podem trazer algo bonito.",
  "Sempre existe um ponto de luz.",
  "A vida pode melhorar em etapas.",
  "O que é bom também está a caminho.",
  "Manter a esperança já fortalece a alma.",
  "O melhor pode começar hoje.",
  "Há beleza em continuar, mesmo sem ver tudo claro.",
  "O bem também encontra caminhos discretos.",
  "A esperança pode nascer em dias comuns.",
  "Cada passo conta, mesmo os menores.",
  "Sempre existe espaço para recomeçar.",
  "A vida também muda em pequenos movimentos.",
  "O amanhã pode trazer respostas melhores.",
  "Há força em quem continua tentando.",
  "O que hoje pesa pode amanhã ensinar.",
  "Tudo o que cresce começa pequeno.",
  "Há dias que abrem portas sem avisar.",
  "Nem toda mudança chega com barulho.",
  "O simples também pode ser extraordinário.",
  "Toda fase passa, inclusive as mais difíceis.",
  "O caminho se revela para quem continua.",
  "Há luz mesmo quando o céu parece fechado.",
  "As possibilidades não acabam em um dia ruim.",
  "O futuro ainda guarda coisas boas.",
  "Recomeçar é uma forma bonita de coragem.",
  "O progresso também acontece em silêncio.",
  "Coisas boas podem surgir no inesperado.",
  "Sempre há algo novo para florescer.",
  "Até a calma pode ser um sinal de avanço.",
  "Um detalhe bom pode mudar um dia inteiro.",
  "Há esperança onde ainda existe movimento.",
  "O tempo também ajuda a organizar a vida.",
  "O que importa é não desistir de seguir.",
  "O melhor nem sempre demora tanto quanto parece.",
  "Há mais caminhos do que a pressa consegue ver.",
  "O dia pode trazer mais leveza do que ontem.",
  "Toda manhã renova alguma chance.",
  "A vida se reconstrói aos poucos.",
  "Sempre existe uma nova forma de olhar.",
  "O bem também amadurece com o tempo.",
  "O importante é manter o coração em movimento.",
  "Há conquistas que começam dentro.",
  "O que hoje é esforço pode amanhã ser colheita.",
  "Continuar é, muitas vezes, a maior vitória.",
  "Nem tudo precisa estar pronto para dar certo.",
  "A esperança se fortalece no caminho.",
  "A vida pode surpreender de maneira boa.",
  "Pequenas alegrias também sustentam grandes jornadas.",
  "Sempre há alguma semente de futuro no presente.",
  "O novo pode começar sem grandes sinais.",
  "Vale a pena continuar acreditando.",
  "A constância faz nascer o improvável.",
  "Há mais beleza no processo do que parece.",
  "Boas mudanças também precisam de tempo.",
  "Um dia melhor pode começar com um pensamento melhor.",
  "A alma também aprende a respirar de novo.",
  "O que parece distante pode estar se aproximando.",
  "Todo avanço merece ser reconhecido.",
  "Há força em manter a esperança viva.",
  "O presente ainda pode abrir bons caminhos.",
  "Mesmo devagar, muita coisa pode se transformar.",
  "O sol continua existindo, mesmo atrás das nuvens.",
  "A vida ainda pode surpreender com bondade.",
  "O melhor pode estar em preparação.",
  "Há sempre uma razão para seguir com esperança.",
  "Hoje pode nascer algo bom.",
  "Sempre existe um motivo para continuar.",
  "O melhor pode estar mais perto do que parece.",
  "Um novo começo pode surgir agora.",
  "Há esperança mesmo nos dias lentos.",
  "Pequenos avanços também mudam histórias.",
  "O futuro ainda pode surpreender.",
  "Toda manhã traz uma nova oportunidade.",
  "Há força em não desistir.",
  "Nem tudo precisa estar perfeito para melhorar.",
  "O bem também chega aos poucos.",
  "O caminho se constrói enquanto se anda.",
  "Dias melhores também fazem parte da vida.",
  "Recomeçar nunca é perda de tempo.",
  "Sempre há algo novo para florescer.",
  "A mudança pode começar em um detalhe.",
  "O importante é seguir em frente.",
  "O que hoje é difícil pode amanhã ser leve.",
  "A vida ainda pode trazer boas surpresas.",
  "Um passo simples já é movimento.",
  "A esperança é uma forma de força.",
  "Nem toda conquista aparece de imediato.",
  "O amanhã pode ser mais gentil.",
  "Há beleza em continuar acreditando.",
  "Toda fase difícil também passa.",
  "O bem pode nascer do improvável.",
  "Ainda há muito para viver e descobrir.",
  "A calma também abre caminhos.",
  "O tempo pode trazer clareza.",
  "A vida pode melhorar em etapas.",
  "Sempre existe uma chance de fazer diferente.",
  "O que importa é não parar.",
  "A luz volta a aparecer.",
  "Até um dia comum pode trazer algo bom.",
  "Há valor em cada pequeno progresso.",
  "As possibilidades continuam existindo.",
  "O coração também sabe se renovar.",
  "O melhor pode estar em construção.",
  "O esforço de hoje pode virar conquista amanhã.",
  "Continuar tentando já é coragem.",
  "Toda caminhada tem momentos de alívio.",
  "O presente ainda guarda possibilidades.",
  "Há mais saída do que parece.",
  "O novo pode começar devagar.",
  "Um dia melhor pode começar agora.",
  "A esperança se fortalece no movimento.",
  "Há sempre algo que pode dar certo.",
  "A vida se reorganiza com o tempo.",
  "Mesmo devagar, ainda é avanço.",
  "O caminho pode se abrir aos poucos.",
  "Sempre existe algo bom a caminho.",
  "O amanhã não precisa repetir o hoje.",
  "A constância transforma cenários.",
  "A vida também surpreende para o bem.",
  "Há paz possível depois do caos.",
  "Uma escolha de hoje pode mudar muito.",
  "O melhor ainda pode acontecer.",
  "Tudo pode começar a clarear.",
  "Seguir em frente já é vitória.",
  "Há esperança para o que ainda está por vir."
];

function getRandomPhrase() {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length);
  return `_"${MOTIVATIONAL_PHRASES[idx]}"_`;
}

module.exports = { startCronJobs, checkAppointmentReminders, checkDailyTasks, sendWeeklyReport, sendMonthlyReport, autoConfirmAppointments };
