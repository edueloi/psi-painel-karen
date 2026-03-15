const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /services
router.get('/', async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// GET /services/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM services WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar serviço' });
  }
});

// POST /services
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, price, duration } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO services (tenant_id, name, description, price, duration) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, description || null, price || 0, duration || 60]
    );

    const [service] = await db.query('SELECT * FROM services WHERE id = ?', [result.insertId]);
    res.status(201).json(service[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// PUT /services/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, price, duration, active } = req.body;

    await db.query(
      `UPDATE services SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        duration = COALESCE(?, duration),
        active = COALESCE(?, active)
       WHERE id = ? AND tenant_id = ?`,
      [name, description, price, duration, active !== undefined ? active : undefined, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// DELETE /services/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM services WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
});

module.exports = router;
