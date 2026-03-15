const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /patients
router.get('/', async (req, res) => {
  try {
    const { search, status, professional_id } = req.query;

    let query = 'SELECT * FROM patients WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (professional_id) {
      query += ' AND responsible_professional_id = ?';
      params.push(professional_id);
    }

    query += ' ORDER BY name';

    const [patients] = await db.query(query, params);
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// GET /patients/:id
router.get('/:id', async (req, res) => {
  try {
    const [patients] = await db.query(
      'SELECT * FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (patients.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(patients[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// POST /patients
router.post('/', async (req, res) => {
  try {
    const {
      name, email, phone, birth_date, cpf, rg, gender,
      address, city, state, zip_code, notes, status,
      responsible_professional_id, responsible_name,
      responsible_phone, health_plan, diagnosis
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      `INSERT INTO patients (
        tenant_id, name, email, phone, birth_date, cpf, rg, gender,
        address, city, state, zip_code, notes, status,
        responsible_professional_id, responsible_name,
        responsible_phone, health_plan, diagnosis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, name, email || null, phone || null,
        birth_date || null, cpf || null, rg || null, gender || null,
        address || null, city || null, state || null, zip_code || null,
        notes || null, status || 'active',
        responsible_professional_id || null, responsible_name || null,
        responsible_phone || null, health_plan || null, diagnosis || null
      ]
    );

    const [patient] = await db.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);
    res.status(201).json(patient[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

// PUT /patients/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      name, email, phone, birth_date, cpf, rg, gender,
      address, city, state, zip_code, notes, status,
      responsible_professional_id, responsible_name,
      responsible_phone, health_plan, diagnosis
    } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });

    await db.query(
      `UPDATE patients SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        birth_date = COALESCE(?, birth_date),
        cpf = COALESCE(?, cpf),
        rg = COALESCE(?, rg),
        gender = COALESCE(?, gender),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip_code = COALESCE(?, zip_code),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        responsible_professional_id = COALESCE(?, responsible_professional_id),
        responsible_name = COALESCE(?, responsible_name),
        responsible_phone = COALESCE(?, responsible_phone),
        health_plan = COALESCE(?, health_plan),
        diagnosis = COALESCE(?, diagnosis)
      WHERE id = ? AND tenant_id = ?`,
      [
        name, email, phone, birth_date, cpf, rg, gender,
        address, city, state, zip_code, notes, status,
        responsible_professional_id, responsible_name,
        responsible_phone, health_plan, diagnosis,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// DELETE /patients/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar paciente' });
  }
});

module.exports = router;
