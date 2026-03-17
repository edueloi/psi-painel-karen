const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /appointments
router.get('/', async (req, res) => {
  try {
    const { patient_id, professional_id, start, end, status } = req.query;

    let query = `
      SELECT a.*,
        p.name as patient_name,
        u.name as professional_name,
        s.name as service_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND a.patient_id = ?'; params.push(patient_id); }
    if (professional_id) { query += ' AND a.professional_id = ?'; params.push(professional_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (start) { query += ' AND a.start_time >= ?'; params.push(start); }
    if (end) { query += ' AND a.start_time <= ?'; params.push(end); }

    query += ' ORDER BY a.start_time';

    const [appointments] = await db.query(query, params);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// GET /appointments/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
});

// POST /appointments
router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, service_id, title, start_time, end_time, notes, color, duration_minutes } = req.body;

    if (!start_time) {
      return res.status(400).json({ error: 'Data de início é obrigatória' });
    }

    let finalEndTime = end_time;
    if (!finalEndTime && start_time) {
      const duration = duration_minutes || 50;
      const start = new Date(start_time);
      finalEndTime = new Date(start.getTime() + duration * 60000).toISOString();
    }

    if (!finalEndTime) {
      return res.status(400).json({ error: 'Data de início e duração são necessários para calcular o fim.' });
    }

    const [result] = await db.query(
      `INSERT INTO appointments (tenant_id, patient_id, professional_id, service_id, title, start_time, end_time, notes, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenant_id, patient_id || null, professional_id || null, service_id || null,
       title || null, start_time, finalEndTime, notes || null, color || null]
    );

    const [created] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /appointments/:id
router.put('/:id', async (req, res) => {
  try {
    const { patient_id, professional_id, service_id, title, start_time, end_time, status, notes, color } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await db.query(
      `UPDATE appointments SET
        patient_id = COALESCE(?, patient_id),
        professional_id = COALESCE(?, professional_id),
        service_id = COALESCE(?, service_id),
        title = COALESCE(?, title),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        color = COALESCE(?, color)
       WHERE id = ? AND tenant_id = ?`,
      [patient_id, professional_id, service_id, title, start_time, end_time, status, notes, color,
       req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ?`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// DELETE /appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

// POST /appointments/import
router.post('/import', async (req, res) => {
  try {
    const { appointments } = req.body;
    if (!appointments || !Array.isArray(appointments)) {
      return res.status(400).json({ error: 'Lista de agendamentos é obrigatória' });
    }

    const tenant_id = req.user.tenant_id;
    const values = appointments.map(a => [
      tenant_id,
      a.patient_id || null,
      a.professional_id || null,
      a.service_id || null,
      a.title || null,
      a.start_time,
      a.end_time || a.start_time, // Fallback if end_time not provided
      a.status || 'scheduled',
      a.notes || null,
      a.color || null
    ]);

    await db.query(
      `INSERT INTO appointments (tenant_id, patient_id, professional_id, service_id, title, start_time, end_time, status, notes, color)
       VALUES ?`,
      [values]
    );

    res.status(201).json({ message: `${appointments.length} agendamentos importados com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar agendamentos' });
  }
});

module.exports = router;
