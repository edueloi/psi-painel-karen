const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authorize } = require('../middleware/auth');

// Todas as rotas exigem super_admin
router.use(authorize('super_admin'));

async function ensureProfileColumn() {
  // Adiciona colunas se não existirem
  const addColumn = async (col, type) => {
    try {
      await db.query(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  };

  await addColumn('permission_profile_id', 'INT NULL');
  await addColumn('cargo', 'VARCHAR(100) NULL');
  await addColumn('departamento', 'VARCHAR(100) NULL');
  await addColumn('avatar_url', 'VARCHAR(255) NULL');

  // Permite tenant_id NULL para usuários super_admin (sem tenant)
  try {
    await db.query('ALTER TABLE users MODIFY COLUMN tenant_id INT NULL');
  } catch (err) { /* ignora se já for NULL */ }

  // Garante tabela de perfis para o JOIN não quebrar
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

// GET /master-users
router.get('/', async (req, res) => {
  try {
    await ensureProfileColumn();
    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at,
              u.permission_profile_id, u.cargo, u.departamento, u.avatar_url,
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
    const { name, email, password, phone, permission_profile_id, cargo, departamento, avatar_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (tenant_id, name, email, password, role, phone, permission_profile_id, cargo, departamento, avatar_url) VALUES (NULL, ?, ?, ?, 'super_admin', ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, phone || null, permission_profile_id || null, cargo || null, departamento || null, avatar_url || null]
    );

    const [newUser] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at,
              u.permission_profile_id, u.cargo, u.departamento, u.avatar_url,
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

// PUT /master-users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, cargo, departamento, avatar_url, permission_profile_id, password } = req.body;
    
    let query = 'UPDATE users SET name = ?, email = ?, phone = ?, cargo = ?, departamento = ?, avatar_url = ?, permission_profile_id = ?';
    let params = [name, email, phone || null, cargo || null, departamento || null, avatar_url || null, permission_profile_id || null];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashed);
    }

    query += " WHERE id = ? AND role = 'super_admin'";
    params.push(req.params.id);

    await db.query(query, params);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário master' });
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
