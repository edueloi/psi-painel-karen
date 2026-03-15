const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authorize } = require('../middleware/auth');

// Auto-create table if not exists
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS master_permission_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role ENUM('super_admin','vendedor','suporte','visualizador','financeiro') NOT NULL DEFAULT 'suporte',
      description TEXT,
      permissions JSON NOT NULL DEFAULT ('{}'),
      access_token VARCHAR(64) UNIQUE NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// GET /master-permissions
router.get('/', authorize('super_admin'), async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query(
      'SELECT * FROM master_permission_profiles ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar perfis de permissão' });
  }
});

// POST /master-permissions
router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    await ensureTable();
    const { name, role, description, permissions, active } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Nome e role são obrigatórios' });
    }
    const token = generateToken();
    const [result] = await db.query(
      `INSERT INTO master_permission_profiles (name, role, description, permissions, access_token, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role, description || null, JSON.stringify(permissions || {}), token, active !== false ? 1 : 0]
    );
    const [rows] = await db.query('SELECT * FROM master_permission_profiles WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar perfil de permissão' });
  }
});

// PUT /master-permissions/:id
router.put('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const { name, role, description, permissions, active } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Nome e role são obrigatórios' });
    }
    await db.query(
      `UPDATE master_permission_profiles
       SET name=?, role=?, description=?, permissions=?, active=?
       WHERE id=?`,
      [name, role, description || null, JSON.stringify(permissions || {}), active !== false ? 1 : 0, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM master_permission_profiles WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// DELETE /master-permissions/:id
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM master_permission_profiles WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar perfil' });
  }
});

// POST /master-permissions/:id/regenerate-token
router.post('/:id/regenerate-token', authorize('super_admin'), async (req, res) => {
  try {
    const token = generateToken();
    const [result] = await db.query(
      'UPDATE master_permission_profiles SET access_token = ? WHERE id = ?',
      [token, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({ access_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao regenerar token' });
  }
});

module.exports = router;
