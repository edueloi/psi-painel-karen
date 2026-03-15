const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authorize } = require('../middleware/auth');

// Todas as rotas exigem super_admin
router.use(authorize('super_admin'));

async function ensureProfileColumn() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN permission_profile_id INT NULL');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
}

// GET /master-users
router.get('/', async (req, res) => {
  try {
    await ensureProfileColumn();
    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at,
              u.permission_profile_id,
              p.name AS profile_name, p.role AS profile_role
       FROM users u
       LEFT JOIN master_permission_profiles p ON p.id = u.permission_profile_id
       WHERE u.role = 'super_admin'
       ORDER BY u.name`
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários master' });
  }
});

// POST /master-users
router.post('/', async (req, res) => {
  try {
    await ensureProfileColumn();
    const { name, email, password, phone, permission_profile_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (tenant_id, name, email, password, role, phone, permission_profile_id) VALUES (NULL, ?, ?, ?, 'super_admin', ?, ?)",
      [name, email, hashedPassword, phone || null, permission_profile_id || null]
    );

    const [newUser] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at,
              u.permission_profile_id,
              p.name AS profile_name, p.role AS profile_role
       FROM users u
       LEFT JOIN master_permission_profiles p ON p.id = u.permission_profile_id
       WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário master' });
  }
});

// PUT /master-users/:id/profile — atualiza perfil de permissão
router.put('/:id/profile', async (req, res) => {
  try {
    const { permission_profile_id } = req.body;
    await db.query(
      'UPDATE users SET permission_profile_id = ? WHERE id = ? AND role = ?',
      [permission_profile_id || null, req.params.id, 'super_admin']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// DELETE /master-users/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.id == req.params.id) {
      return res.status(400).json({ error: 'Você não pode remover sua própria conta' });
    }

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ? AND role = 'super_admin'",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover usuário master' });
  }
});

module.exports = router;
