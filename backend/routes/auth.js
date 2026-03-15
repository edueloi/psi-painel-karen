const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const [users] = await db.query(
      `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.active as tenant_active
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.active = true`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = users[0];

    if (!user.tenant_active) {
      return res.status(403).json({ error: 'Esta clínica está desativada' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const payload = {
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /auth/me - Retorna dados do usuário logado
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autenticado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      'SELECT id, name, email, role, specialty, crp, phone, avatar_url, tenant_id FROM users WHERE id = ? AND active = true',
      [decoded.id]
    );

    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json(users[0]);
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
