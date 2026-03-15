const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /medical-records
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT r.*, p.name as patient_name, u.name as professional_name
      FROM medical_records r
      LEFT JOIN patients p ON p.id = r.patient_id
      LEFT JOIN users u ON u.id = r.professional_id
      WHERE r.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND r.patient_id = ?'; params.push(patient_id); }

    query += ' ORDER BY r.created_at DESC';

    const [records] = await db.query(query, params);
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuários' });
  }
});

// GET /medical-records/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ? AND r.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

// POST /medical-records
router.post('/', async (req, res) => {
  try {
    const { patient_id, appointment_id, content, type } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO medical_records (tenant_id, patient_id, professional_id, appointment_id, content, type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, patient_id, req.user.id, appointment_id || null, content || null, type || 'session']
    );

    const [record] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json(record[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar prontuário' });
  }
});

// PUT /medical-records/:id
router.put('/:id', async (req, res) => {
  try {
    const { content, type } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });

    await db.query(
      'UPDATE medical_records SET content = COALESCE(?, content), type = COALESCE(?, type) WHERE id = ?',
      [content, type, req.params.id]
    );

    const [updated] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ?`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

// DELETE /medical-records/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar prontuário' });
  }
});

module.exports = router;
