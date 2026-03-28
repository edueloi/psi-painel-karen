const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

/* ─────────────────────────────────────────────────────────
   GET /patient-history/:patient_id
   Retorna timeline unificada de eventos do paciente
───────────────────────────────────────────────────────── */
router.get('/:patient_id', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.params;
    const tenant_id = req.user.tenant_id;

    const events = [];

    // 1. Registros clínicos (médicos)
    const [records] = await db.query(
      `SELECT r.id, r.record_type, r.title, r.status, r.created_at, r.updated_at, r.approved_at,
              u.name AS professional_name
       FROM medical_records r
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.patient_id = ? AND r.tenant_id = ?
       ORDER BY r.created_at DESC LIMIT 200`,
      [patient_id, tenant_id]
    );

    const typeIcon = {
      Evolucao: '📋', Anamnese: '📝', Avaliacao: '🔍',
      Plano: '🗺️', Relatorio: '📄', Encaminhamento: '🔄',
      Atestado: '📋', default: '📎'
    };
    const typeName = {
      Evolucao: 'Evolução Clínica', Anamnese: 'Anamnese',
      Avaliacao: 'Avaliação Clínica', Plano: 'Plano Terapêutico',
      Relatorio: 'Relatório / Laudo', Encaminhamento: 'Encaminhamento',
      Atestado: 'Atestado',
    };

    for (const r of records) {
      events.push({
        id: `rec-${r.id}`,
        type: 'record_created',
        category: r.record_type,
        title: `${typeName[r.record_type] || r.record_type} criado`,
        description: r.title,
        status: r.status,
        professional: r.professional_name,
        icon: typeIcon[r.record_type] || typeIcon.default,
        color: getRecordColor(r.record_type),
        timestamp: r.created_at,
        record_id: r.id,
      });

      if (r.approved_at && r.status === 'Aprovado') {
        events.push({
          id: `rec-app-${r.id}`,
          type: 'record_approved',
          category: r.record_type,
          title: `${typeName[r.record_type] || r.record_type} aprovado`,
          description: r.title,
          status: 'Aprovado',
          professional: r.professional_name,
          icon: '✅',
          color: 'emerald',
          timestamp: r.approved_at,
          record_id: r.id,
        });
      }
    }

    // 2. Envios de anamnese
    try {
      const [sends] = await db.query(
        `SELECT s.id, s.status, s.title, s.sent_at, s.completed_at, s.viewed_at,
                u.name AS professional_name
         FROM anamnesis_sends s
         LEFT JOIN users u ON u.id = s.professional_id
         WHERE s.patient_id = ? AND s.tenant_id = ?
         ORDER BY s.created_at DESC LIMIT 50`,
        [patient_id, tenant_id]
      );

      for (const s of sends) {
        if (s.sent_at) {
          events.push({
            id: `anm-sent-${s.id}`,
            type: 'anamnesis_sent',
            category: 'Anamnese',
            title: 'Anamnese enviada ao paciente',
            description: s.title,
            status: s.status,
            professional: s.professional_name,
            icon: '📤',
            color: 'violet',
            timestamp: s.sent_at,
          });
        }
        if (s.viewed_at) {
          events.push({
            id: `anm-view-${s.id}`,
            type: 'anamnesis_viewed',
            category: 'Anamnese',
            title: 'Paciente visualizou a anamnese',
            description: s.title,
            status: s.status,
            professional: s.professional_name,
            icon: '👁️',
            color: 'indigo',
            timestamp: s.viewed_at,
          });
        }
        if (s.completed_at) {
          events.push({
            id: `anm-done-${s.id}`,
            type: 'anamnesis_completed',
            category: 'Anamnese',
            title: 'Paciente respondeu a anamnese',
            description: s.title,
            status: 'answered',
            professional: s.professional_name,
            icon: '✍️',
            color: 'green',
            timestamp: s.completed_at,
          });
        }
      }
    } catch {}

    // 3. Consultas/Agendamentos
    try {
      const [apts] = await db.query(
        `SELECT a.id, a.title, a.start_time, a.end_time, a.status, a.modality,
                u.name AS professional_name
         FROM appointments a
         LEFT JOIN users u ON u.id = a.professional_id
         WHERE a.patient_id = ? AND a.tenant_id = ?
         ORDER BY a.start_time DESC LIMIT 100`,
        [patient_id, tenant_id]
      );

      const aptIcon = { scheduled: '📅', confirmed: '✅', completed: '✔️', cancelled: '❌', no_show: '⚠️' };
      const aptLabel = { scheduled: 'agendada', confirmed: 'confirmada', completed: 'realizada', cancelled: 'cancelada', no_show: 'faltou' };
      const aptColor = { scheduled: 'blue', confirmed: 'indigo', completed: 'emerald', cancelled: 'rose', no_show: 'amber' };

      for (const a of apts) {
        events.push({
          id: `apt-${a.id}`,
          type: 'appointment',
          category: 'Consulta',
          title: `Consulta ${aptLabel[a.status] || a.status}`,
          description: a.title || `Consulta ${a.modality || 'presencial'}`,
          status: a.status,
          professional: a.professional_name,
          icon: aptIcon[a.status] || '📅',
          color: aptColor[a.status] || 'blue',
          timestamp: a.start_time,
        });
      }
    } catch {}

    // 4. Auditoria de registros (IA, exportações, etc.)
    try {
      const [audits] = await db.query(
        `SELECT a.id, a.action, a.detail, a.created_at, a.record_id,
                u.name AS user_name, r.record_type, r.title AS record_title
         FROM medical_record_audit a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN medical_records r ON r.id = a.record_id
         WHERE r.patient_id = ? AND a.tenant_id = ?
           AND a.action IN ('ai_organized','exported')
         ORDER BY a.created_at DESC LIMIT 100`,
        [patient_id, tenant_id]
      );

      const auditMap = {
        ai_organized: { icon: '🤖', title: 'IA organizou registro', color: 'purple' },
        exported: { icon: '📥', title: 'Registro exportado', color: 'slate' },
      };

      for (const a of audits) {
        const info = auditMap[a.action];
        if (!info) continue;
        events.push({
          id: `aud-${a.id}`,
          type: `audit_${a.action}`,
          category: a.record_type || 'Sistema',
          title: info.title,
          description: a.record_title || '',
          professional: a.user_name,
          icon: info.icon,
          color: info.color,
          timestamp: a.created_at,
          record_id: a.record_id,
        });
      }
    } catch {}

    // Ordenar por timestamp decrescente
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ events, total: events.length });
  } catch (err) {
    console.error('[patient-history]', err);
    res.status(500).json({ error: 'Erro ao buscar histórico do paciente' });
  }
});

function getRecordColor(type) {
  const map = {
    Evolucao: 'indigo', Anamnese: 'violet', Avaliacao: 'cyan',
    Plano: 'emerald', Relatorio: 'blue', Encaminhamento: 'amber', Atestado: 'rose',
  };
  return map[type] || 'slate';
}

module.exports = router;
