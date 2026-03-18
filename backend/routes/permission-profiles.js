const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /permission-profiles
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM tenant_permission_profiles WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar perfis' });
  }
});

// POST /permission-profiles
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, permissions, is_default, slug } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO tenant_permission_profiles (tenant_id, name, permissions, is_default, slug) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, JSON.stringify(permissions || {}), is_default ? 1 : 0, slug || null]
    );

    const [rows] = await db.query('SELECT * FROM tenant_permission_profiles WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar perfil' });
  }
});

// PUT /permission-profiles/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, permissions, is_default, slug } = req.body;
    
    await db.query(
      `UPDATE tenant_permission_profiles SET name=?, permissions=?, is_default=?, slug=? 
       WHERE id=? AND tenant_id=?`,
      [name, JSON.stringify(permissions || {}), is_default ? 1 : 0, slug || null, req.params.id, req.user.tenant_id]
    );

    const [rows] = await db.query('SELECT * FROM tenant_permission_profiles WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// DELETE /permission-profiles/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM tenant_permission_profiles WHERE id = ? AND tenant_id = ? AND (is_default = 0 OR is_default IS NULL)',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil não encontrado ou não pode ser removido' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar perfil' });
  }
});

module.exports = router;
