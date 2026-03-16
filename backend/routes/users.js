const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /users/me - Perfil do usuário autenticado (sem filtro de tenant)
router.get('/me', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, tenant_id, name, email, role, specialty, crp, phone, avatar_url, active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(users[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// GET /users - Lista profissionais do tenant
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, specialty, crp, phone, avatar_url, active, created_at FROM users WHERE tenant_id = ? AND role != 'super_admin' ORDER BY name",
      [req.user.tenant_id]
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, specialty, crp, phone, avatar_url, active, created_at FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(users[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// POST /users - Criar usuário (admin+)
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, email, password, role, specialty, crp, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (tenant_id, name, email, password, role, specialty, crp, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, email, hashedPassword, role || 'professional', specialty || null, crp || null, phone || null]
    );

    const [newUser] = await db.query(
      'SELECT id, name, email, role, specialty, crp, phone, active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email já cadastrado nesta clínica' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /users/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, specialty, crp, phone, avatar_url, active } = req.body;

    // Só admin pode mudar role ou desativar outros
    const isSelf = req.user.id == req.params.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para editar outro usuário' });
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    await db.query(
      `UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        specialty = COALESCE(?, specialty),
        crp = COALESCE(?, crp),
        phone = COALESCE(?, phone),
        avatar_url = COALESCE(?, avatar_url),
        active = COALESCE(?, active)
       WHERE id = ? AND tenant_id = ?`,
      [name, email, isAdmin ? role : undefined, specialty, crp, phone, avatar_url, isAdmin ? active : undefined,
       req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query(
      'SELECT id, name, email, role, specialty, crp, phone, avatar_url, active FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// PUT /users/:id/password - Trocar senha
router.put('/:id/password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (req.user.id != req.params.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (req.user.id == req.params.id) {
      const match = await bcrypt.compare(current_password, users[0].password);
      if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao trocar senha' });
  }
});

// DELETE /users/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    if (req.user.id == req.params.id) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    const [result] = await db.query(
      'DELETE FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// POST /users/:id/avatar — Upload avatar do usuário
router.post('/:id/avatar', async (req, res) => {
  try {
    const isSelf = req.user.id == req.params.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Sem permissão' });

    const multerAvatar = require('multer')({
      storage: require('multer').diskStorage({
        destination: (req2, file, cb) => {
          const dir = require('path').join(__dirname, '../public/uploads/avatars');
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req2, file, cb) => {
          cb(null, `avatar-${req.params.id}-${Date.now()}${require('path').extname(file.originalname)}`);
        }
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (req2, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'));
      }
    }).single('avatar');

    multerAvatar(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      const avatar_url = `/uploads-static/avatars/${req.file.filename}`;
      await db.query('UPDATE users SET avatar_url = ? WHERE id = ? AND tenant_id = ?',
        [avatar_url, req.params.id, req.user.tenant_id]);

      res.json({ avatar_url });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
  }
});

module.exports = router;
