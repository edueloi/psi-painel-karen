const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /documents?patient_id=X
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;

    let query = 'SELECT * FROM uploads WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (patient_id) {
      query += ' AND patient_id = ?';
      params.push(patient_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar documentos' });
  }
});

// POST /documents
router.post('/', async (req, res) => {
  res.status(501).json({ error: 'Use /uploads para anexar arquivos' });
});

module.exports = router;
