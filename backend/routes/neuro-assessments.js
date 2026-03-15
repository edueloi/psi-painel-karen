const express = require('express');
const router = express.Router();
const db = require('../db');

// Avaliações neuropsicológicas pré-definidas (templates fixos)
const ASSESSMENT_TEMPLATES = [
  { id: 1, name: 'CARS-2', description: 'Childhood Autism Rating Scale', category: 'autism' },
  { id: 2, name: 'ADOS-2', description: 'Autism Diagnostic Observation Schedule', category: 'autism' },
  { id: 3, name: 'Vineland-3', description: 'Vineland Adaptive Behavior Scales', category: 'adaptive' },
  { id: 4, name: 'WISC-V', description: 'Escala de Inteligência Wechsler para Crianças', category: 'intelligence' },
  { id: 5, name: 'SNAP-IV', description: 'Swanson, Nolan e Pelham - TDAH', category: 'adhd' },
  { id: 6, name: 'SDQ', description: 'Questionário de Capacidades e Dificuldades', category: 'behavior' },
];

// GET /neuro-assessments - Lista instrumentos disponíveis
router.get('/', async (req, res) => {
  res.json(ASSESSMENT_TEMPLATES);
});

// GET /neuro-assessments/:id/results - Resultados de um paciente
router.get('/:id/results', async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id é obrigatório' });

    const scopeKey = `neuro_${req.params.id}_${patient_id}`;

    const [rows] = await db.query(
      'SELECT data, created_at, updated_at FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, 'neuro/assessment', req.user.tenant_id]
    );

    if (rows.length === 0) return res.json(null);

    const result = rows[0];
    try { result.data = JSON.parse(result.data); } catch {}
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resultados' });
  }
});

// POST /neuro-assessments/:id/results - Salvar resultado
router.post('/:id/results', async (req, res) => {
  try {
    const { patient_id, data } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id é obrigatório' });

    const scopeKey = `neuro_${req.params.id}_${patient_id}`;
    const fullType = 'neuro/assessment';
    const dataStr = JSON.stringify(data || {});

    const [existing] = await db.query(
      'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, fullType, req.user.tenant_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?',
        [dataStr, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.tenant_id, patient_id, req.user.id, scopeKey, fullType, dataStr]
      );
    }

    res.json({ ok: true, assessment_id: req.params.id, patient_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar resultado' });
  }
});

module.exports = router;
