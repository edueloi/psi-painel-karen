const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /pei
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT p.*, pt.name as patient_name, u.name as professional_name
      FROM pei p
      LEFT JOIN patients pt ON pt.id = p.patient_id
      LEFT JOIN users u ON u.id = p.professional_id
      WHERE p.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND p.patient_id = ?'; params.push(patient_id); }
    query += ' ORDER BY p.created_at DESC';

    const [peis] = await db.query(query, params);
    res.json(peis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar PEIs' });
  }
});

// GET /pei/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, pt.name as patient_name, u.name as professional_name
       FROM pei p
       LEFT JOIN patients pt ON pt.id = p.patient_id
       LEFT JOIN users u ON u.id = p.professional_id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PEI não encontrado' });

    const pei = rows[0];

    // Buscar metas
    const [goals] = await db.query(
      'SELECT * FROM pei_goals WHERE pei_id = ? ORDER BY created_at',
      [pei.id]
    );

    // Para cada meta, buscar histórico
    for (const goal of goals) {
      const [history] = await db.query(
        'SELECT * FROM pei_goal_history WHERE goal_id = ? ORDER BY date DESC',
        [goal.id]
      );
      goal.history = history;
    }

    pei.goals = goals;

    // ABC
    const [abc] = await db.query('SELECT * FROM pei_abc WHERE pei_id = ? ORDER BY date DESC', [pei.id]);
    pei.abc = abc;

    res.json(pei);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar PEI' });
  }
});

// POST /pei
router.post('/', async (req, res) => {
  try {
    const { patient_id, title, description, start_date, end_date } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO pei (tenant_id, patient_id, professional_id, title, description, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, patient_id, req.user.id, title || null, description || null, start_date || null, end_date || null]
    );

    const [pei] = await db.query('SELECT * FROM pei WHERE id = ?', [result.insertId]);
    res.status(201).json(pei[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar PEI' });
  }
});

// POST /pei/:id/goals - Adicionar meta
router.post('/:id/goals', async (req, res) => {
  try {
    const { title, description, target_date, area } = req.body;
    if (!title) return res.status(400).json({ error: 'Título da meta é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO pei_goals (pei_id, title, description, target_date, area) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, title, description || null, target_date || null, area || null]
    );

    const [goal] = await db.query('SELECT * FROM pei_goals WHERE id = ?', [result.insertId]);
    res.status(201).json(goal[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// PUT /pei/:id/goals/:goalId - Atualizar meta
router.put('/:id/goals/:goalId', async (req, res) => {
  try {
    const { title, description, status, target_date, area } = req.body;

    await db.query(
      `UPDATE pei_goals SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        target_date = COALESCE(?, target_date),
        area = COALESCE(?, area)
       WHERE id = ? AND pei_id = ?`,
      [title, description, status, target_date, area, req.params.goalId, req.params.id]
    );

    const [goal] = await db.query('SELECT * FROM pei_goals WHERE id = ?', [req.params.goalId]);
    res.json(goal[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// POST /pei/:id/goals/:goalId/history - Registrar evolução
router.post('/:id/goals/:goalId/history', async (req, res) => {
  try {
    const { date, result, notes } = req.body;

    const [hist] = await db.query(
      'INSERT INTO pei_goal_history (goal_id, date, result, notes, created_by) VALUES (?, ?, ?, ?, ?)',
      [req.params.goalId, date || new Date(), result || null, notes || null, req.user.id]
    );

    const [entry] = await db.query('SELECT * FROM pei_goal_history WHERE id = ?', [hist.insertId]);
    res.status(201).json(entry[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar histórico' });
  }
});

// POST /pei/:id/abc - Registrar análise ABC
router.post('/:id/abc', async (req, res) => {
  try {
    const { antecedent, behavior, consequence, date } = req.body;

    const [result] = await db.query(
      'INSERT INTO pei_abc (pei_id, antecedent, behavior, consequence, date) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, antecedent || null, behavior || null, consequence || null, date || new Date()]
    );

    const [entry] = await db.query('SELECT * FROM pei_abc WHERE id = ?', [result.insertId]);
    res.status(201).json(entry[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar análise ABC' });
  }
});

module.exports = router;
