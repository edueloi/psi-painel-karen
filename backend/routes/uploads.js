const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /uploads
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;

    let query = 'SELECT * FROM uploads WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND patient_id = ?'; params.push(patient_id); }
    query += ' ORDER BY created_at DESC';

    const [uploads] = await db.query(query, params);
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar uploads' });
  }
});

// DELETE /uploads/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM uploads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Arquivo não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

module.exports = router;
