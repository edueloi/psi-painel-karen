const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { sendMail, templates } = require('../services/emailService');

// Garante colunas de reset na tabela users
(async () => {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires DATETIME NULL`);
  } catch {
    try { await db.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL`); } catch (_) {}
    try { await db.query(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL`); } catch (_) {}
  }
})();

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
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.active = true`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = users[0];

    // Só bloqueia por tenant inativo se o usuário pertencer a um tenant (super_admin não pertence)
    if (user.tenant_id && !user.tenant_active) {
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

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    // Responde sempre com sucesso para não revelar se o email existe
    res.json({ message: 'Se este email estiver cadastrado, você receberá um link de recuperação em breve.' });

    const [users] = await db.query(
      'SELECT id, name, email FROM users WHERE email = ? AND active = true LIMIT 1',
      [email]
    );
    if (users.length === 0) return;

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const expiresStr = expires.toISOString().slice(0, 19).replace('T', ' ');

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expiresStr, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/redefinir-senha?token=${token}`;
    const html = templates.passwordReset({ name: user.name, link });
    await sendMail(user.email, '🔐 Redefinir Senha — PsiFlux', html);
    console.log(`🔑 Link de recuperação enviado para ${user.email}`);
  } catch (err) {
    console.error('Erro no forgot-password:', err.message);
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [users] = await db.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ? LIMIT 1',
      [token, now]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo link de recuperação.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashed, users[0].id]
    );

    res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (err) {
    console.error('Erro no reset-password:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
