/**
 * Evolução automática de falta.
 * Quando um agendamento vira falta (no_show / falta_justificada) é criada (ou marcada) a evolução da data
 * da consulta com ocorrência de falta e "motivo pendente". Regra: uma evolução por paciente por data de consulta.
 * Idempotente; nunca apaga registros; não altera evoluções já aprovadas/finalizadas.
 */
const db = require('../db');
const history = require('./recordHistory');

const ABSENCE_STATUS = { no_show: 'Falta do paciente', falta_justificada: 'Falta justificada' };
const SYSTEM_USER = (tenantId) => ({ id: null, name: 'Sistema (falta)', tenant_id: tenantId });

const brDate = (ymd) => String(ymd).slice(0, 10).split('-').reverse().join('/');
const parseJson = (raw) => { try { const o = raw ? JSON.parse(raw) : null; return o && typeof o === 'object' ? o : null; } catch { return null; } };
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => { const x = new Date(d); return isNaN(x.getTime()) ? null : `${pad(x.getHours())}:${pad(x.getMinutes())}:00`; };

function buildPayload(prev, { occurrence, appointmentId, duration }) {
  const base = prev && prev._estruturado ? prev : { ...(prev || {}), _estruturado: null };
  const est = base._estruturado || { v: 1, kind: 'Evolucao', template: 'psicologia', values: {}, updated_at: new Date().toISOString() };
  est.values = { ...(est.values || {}) };
  if (!est.values.ocorrencia || est.values.ocorrencia === 'Sessão realizada') est.values.ocorrencia = occurrence;
  est.meta = { ...(est.meta || {}), ocorrencia: est.values.ocorrencia };
  if (appointmentId) est.meta.agendamento_id = String(appointmentId);
  if (duration && !est.meta.duracao_min) est.meta.duracao_min = Number(duration);
  est.meta.falta_pendente = !est.values.falta_motivo;
  est.meta.falta_automatica = true;
  est.updated_at = new Date().toISOString();
  base._estruturado = est;
  return base;
}

/** Cria/marca a evolução de falta do agendamento. Retorna { action: 'created'|'marked'|'skipped', record_id? }. */
async function ensureAbsenceRecord(tenantId, appointmentId) {
  try {
    const [[apt]] = await db.query(
      `SELECT id, patient_id, professional_id, status, start_time, end_time, duration_minutes,
              DATE_FORMAT(start_time, '%Y-%m-%d') AS day
       FROM appointments WHERE id = ? AND tenant_id = ?`, [appointmentId, tenantId]);
    if (!apt || !apt.patient_id || !ABSENCE_STATUS[apt.status]) return { action: 'skipped' };
    const occurrence = ABSENCE_STATUS[apt.status];
    const user = SYSTEM_USER(tenantId);

    const [rows] = await db.query(
      `SELECT * FROM medical_records WHERE tenant_id = ? AND patient_id = ? AND record_type = 'Evolucao' AND DATE(created_at) = ?
       ORDER BY created_at DESC, id DESC`, [tenantId, apt.patient_id, apt.day]);

    if (rows.length) {
      const rec = rows[0];
      if (rec.status === 'Aprovado' || rec.status === 'Finalizado') return { action: 'skipped', record_id: rec.id };
      const prev = parseJson(rec.ai_organized_content);
      const prevOc = prev && prev._estruturado && prev._estruturado.values && prev._estruturado.values.ocorrencia;
      if (prevOc && prevOc !== 'Sessão realizada') return { action: 'skipped', record_id: rec.id };
      const payload = buildPayload(prev, { occurrence, appointmentId: apt.id, duration: apt.duration_minutes });
      let tags = []; try { tags = Array.isArray(rec.tags) ? rec.tags : JSON.parse(rec.tags || '[]'); } catch { tags = []; }
      if (!tags.includes('falta')) tags.push('falta');
      await db.query(
        'UPDATE medical_records SET ai_organized_content = ?, tags = ?, appointment_id = COALESCE(appointment_id, ?), updated_at = NOW() WHERE id = ?',
        [JSON.stringify(payload), JSON.stringify(tags), apt.id, rec.id]);
      await history.recordVersion(user, rec.id, { event: 'editado', beforeRow: rec, summaryExtra: 'Falta registrada a partir da agenda' });
      return { action: 'marked', record_id: rec.id };
    }

    if (!apt.professional_id) return { action: 'skipped' };
    const payload = buildPayload(null, { occurrence, appointmentId: apt.id, duration: apt.duration_minutes });
    const text = `${occurrence} registrada automaticamente a partir da agenda (${brDate(apt.day)}). Motivo da falta pendente de preenchimento.`;
    const [result] = await db.query(
      `INSERT INTO medical_records
        (tenant_id, patient_id, professional_id, appointment_id, content, draft_content, ai_organized_content,
         record_type, title, status, ai_status, tags, start_time, end_time, appointment_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Evolucao', ?, 'Rascunho', 'pending', ?, ?, ?, 'individual', ?)`,
      [tenantId, apt.patient_id, apt.professional_id, apt.id, text, text, JSON.stringify(payload),
        `Falta — ${brDate(apt.day)}`, JSON.stringify(['falta']), hhmm(apt.start_time), hhmm(apt.end_time), `${apt.day} 12:00:00`]);
    const recordId = result.insertId;
    await db.query(
      'INSERT INTO medical_record_versions (record_id, version_number, content, status, created_by) VALUES (?, 1, ?, ?, ?)',
      [recordId, text, 'Rascunho', apt.professional_id]).catch(() => {});
    await db.query(
      'INSERT INTO medical_record_audit (record_id, user_id, tenant_id, action, detail) VALUES (?, ?, ?, ?, ?)',
      [recordId, apt.professional_id, tenantId, 'created', JSON.stringify({ generated: 'falta', appointment_id: apt.id })]).catch(() => {});
    await history.recordVersion(user, recordId, { event: 'criado' });
    return { action: 'created', record_id: recordId };
  } catch (e) {
    console.error('[absenceRecords] falha:', e.message);
    return { action: 'skipped' };
  }
}

/** Agendamentos passados (faltas ou realizados) do paciente sem evolução na data. */
async function pendingByDate(user, patientId) {
  const isAdmin = ['admin', 'super_admin'].includes(user.role);
  const params = [user.tenant_id, patientId];
  let own = '';
  if (!isAdmin) { own = ' AND a.professional_id = ?'; params.push(user.id); }
  const [rows] = await db.query(
    `SELECT a.id, a.status, a.title, a.professional_id, a.duration_minutes,
            DATE_FORMAT(a.start_time, '%Y-%m-%d') AS day, DATE_FORMAT(a.start_time, '%H:%i') AS start_hm, DATE_FORMAT(a.end_time, '%H:%i') AS end_hm
     FROM appointments a
     WHERE a.tenant_id = ? AND a.patient_id = ? AND a.start_time < NOW()
       AND a.status IN ('completed', 'no_show', 'falta_justificada')${own}
       AND NOT EXISTS (SELECT 1 FROM medical_records r WHERE r.tenant_id = a.tenant_id AND r.patient_id = a.patient_id
                       AND r.record_type = 'Evolucao' AND DATE(r.created_at) = DATE(a.start_time))
     ORDER BY a.start_time DESC LIMIT 200`, params);
  return {
    sessions: rows.filter((r) => r.status === 'completed'),
    absences: rows.filter((r) => r.status !== 'completed'),
  };
}

module.exports = { ensureAbsenceRecord, pendingByDate, ABSENCE_STATUS };
