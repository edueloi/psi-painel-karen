const db = require('../db');
const notificationService = require('./notificationService');

const asPrefs = (raw) => {
  try { return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}; }
  catch { return {}; }
};

const brl = (value) => Number(value || 0).toFixed(2).replace('.', ',');

/**
 * Coloca uma única cobrança inicial na fila quando a agenda inaugura uma comanda
 * ou quando cria um atendimento avulso com serviço. A chave é o appointment_id:
 * editar, reagendar ou agendar a 2ª sessão da mesma comanda não duplica envio.
 */
async function enqueueInitialAppointmentCharge({ tenantId, appointmentId, patientId, comandaId = null, serviceId = null }) {
  const [[tenant]] = await db.query('SELECT name, whatsapp_preferences FROM tenants WHERE id = ? LIMIT 1', [tenantId]);
  const prefs = asPrefs(tenant?.whatsapp_preferences);
  if (prefs.payment_enabled === false || prefs.payment_on_schedule_enabled === false) return { queued: false, reason: 'disabled' };

  const [[patient]] = await db.query(
    'SELECT id, name, whatsapp, phone FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1',
    [patientId, tenantId]
  );
  const phone = patient?.whatsapp || patient?.phone;
  if (!patient || !phone) return { queued: false, reason: 'no_phone' };

  let amount = 0;
  let serviceName = 'atendimento';
  if (comandaId) {
    const [[comanda]] = await db.query(
      `SELECT c.total, c.sessions_total, COALESCE(c.paid_value, 0) AS paid_value,
              COALESCE(s.name, c.description, 'Pacote de atendimentos') AS description
       FROM comandas c LEFT JOIN services s ON s.id = c.service_id
       WHERE c.id = ? AND c.tenant_id = ? LIMIT 1`,
      [comandaId, tenantId]
    );
    if (!comanda) return { queued: false, reason: 'missing_comanda' };
    amount = Math.max(0, Number(comanda.total || 0) - Number(comanda.paid_value || 0));
    serviceName = comanda.description || serviceName;
    if (!(amount > 0)) return { queued: false, reason: 'already_paid' };
  } else if (serviceId) {
    const [[service]] = await db.query('SELECT name, price FROM services WHERE id = ? AND tenant_id = ? LIMIT 1', [serviceId, tenantId]);
    amount = Number(service?.price || 0);
    serviceName = service?.name || serviceName;
  }
  if (!(amount > 0)) return { queued: false, reason: 'no_amount' };

  const [[appointment]] = await db.query(
    `SELECT a.start_time, COALESCE(u.name, '') AS professional_name
     FROM appointments a LEFT JOIN users u ON u.id = a.professional_id
     WHERE a.id = ? AND a.tenant_id = ? LIMIT 1`,
    [appointmentId, tenantId]
  );
  const startsAt = appointment?.start_time ? new Date(appointment.start_time) : null;
  const date = startsAt ? startsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
  const time = startsAt ? startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';

  // Deduplicação persistente: inclusive após reinício do painel/bot.
  const [duplicate] = await db.query(
    `SELECT id FROM notification_queue
     WHERE tenant_id = ? AND status IN ('pending', 'sent')
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.type')) = 'appointment-payment-reminder'
       AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.appointment_id')) = ?
     LIMIT 1`,
    [tenantId, String(appointmentId)]
  );
  if (duplicate.length) return { queued: false, reason: 'duplicate' };

  const delay = Math.min(10080, Math.max(0, Number.parseInt(prefs.payment_on_schedule_delay_minutes, 10) || 15));
  const scheduledAt = new Date(Date.now() + delay * 60 * 1000);
  const defaultMessage = '💰 *Pagamento pendente*\n\nOlá, *{patient_name}*.\n\nSeu {service} foi agendado. O valor para pagamento é R$ {amount}. Em caso de dúvida, estamos à disposição.';
  const variables = {
    patient_name: patient.name || 'Paciente', amount: brl(amount), service: serviceName,
    session_info: comandaId ? 'primeiro atendimento da comanda' : 'atendimento avulso',
    package_name: serviceName, date, time, professional_name: appointment?.professional_name || '',
    clinic_name: tenant?.name || '',
  };
  const content = Object.entries(variables).reduce(
    (message, [key, value]) => message.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    String(prefs.payment_on_schedule_msg || prefs.payment_msg || defaultMessage)
  );

  const id = await notificationService.enqueue({
    tenant_id: tenantId,
    recipient_phone: phone,
    content,
    scheduled_at: scheduledAt,
    metadata: {
      type: 'appointment-payment-reminder',
      apt_id: appointmentId,
      appointment_id: appointmentId,
      patient_id: patientId,
      comanda_id: comandaId || null,
      service_id: serviceId || null,
      amount,
      initial_collection: true,
    },
  });
  return { queued: true, id, scheduled_at: scheduledAt };
}

module.exports = { enqueueInitialAppointmentCharge };
