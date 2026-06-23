const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const db = require('../db');
const { sendMail, templates } = require('../services/emailService');
const rateLimit = require('express-rate-limit');

// Bloqueio de Força Bruta (Rate Limiters)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 tentativas por IP por janela
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verify2faLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10,
  message: { error: 'Muitas tentativas de 2FA. Tente novamente em 10 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo de 3 pedidos de reset por hora por IP
  message: { error: 'Muitos pedidos de recuperação de senha. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Garante colunas de reset na tabela users e trial na tenants
(async () => {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires DATETIME NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL`);
    await db.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL`);
  } catch {
    try { await db.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL`); } catch (_) {}
    try { await db.query(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL`); } catch (_) {}
    try { await db.query(`ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL`); } catch (_) {}
    try { await db.query(`ALTER TABLE users ADD COLUMN bio TEXT NULL`); } catch (_) {}
    try { await db.query(`ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME NULL`); } catch (_) {}
  }
})();

// POST /auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const [users] = await db.query(
      `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.active as tenant_active, t.trial_ends_at
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE (u.email = ? OR u.name = ?) AND u.active = true`,
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = users[0];

    // Só bloqueia por tenant inativo se o usuário pertencer a um tenant (super_admin não pertence)
    if (user.tenant_id && !user.tenant_active) {
      return res.status(403).json({ error: 'Esta clínica está desativada' });
    }

    // Bloqueia se trial expirou (só para não-super_admin)
    if (user.role !== 'super_admin' && user.trial_ends_at) {
      const trialExpired = new Date(user.trial_ends_at) < new Date();
      if (trialExpired) {
        return res.status(403).json({
          error: 'Seu período de teste gratuito de 14 dias expirou. Entre em contato para continuar usando o PsiFlux.',
          trial_expired: true,
        });
      }
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Se o 2FA estiver ativo, não entrega o token ainda
    if (user.two_factor_enabled) {
        return res.json({ 
            requires_2fa: true, 
            userId: user.id,
            message: 'Autenticação de dois fatores necessária.' 
        });
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

    // Record session
    const tokenId = crypto.randomBytes(16).toString('hex');
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      `INSERT INTO user_sessions (user_id, token_id, user_agent, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, tokenId, userAgent, ipAddress, expiresAt]
    );

    // Update payload with tokenId
    const tokenWithId = jwt.sign({...payload, tokenId}, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token: tokenWithId });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /auth/verify-2fa
 * Verifica o código 2FA e emite o token final
 */
router.post('/verify-2fa', verify2faLimiter, async (req, res) => {
  try {
    const { userId, token: totpToken } = req.body;

    const [users] = await db.query(
      'SELECT id, tenant_id, role, email, name, two_factor_secret FROM users WHERE id = ? AND active = true',
      [userId]
    );

    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = users[0];

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: totpToken
    });

    if (!verified) {
      return res.status(401).json({ error: 'Código 2FA inválido ou expirado' });
    }

    const payload = {
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    // Record session
    const tokenId = crypto.randomBytes(16).toString('hex');
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      `INSERT INTO user_sessions (user_id, token_id, user_agent, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, tokenId, userAgent, ipAddress, expiresAt]
    );

    const jwtToken = jwt.sign({...payload, tokenId}, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token: jwtToken });
  } catch (err) {
    console.error('Erro na verificação 2FA:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /auth/sessions
 * List active sessions for the current user
 */
const { authMiddleware } = require('../middleware/auth');
router.get('/sessions', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, token_id, user_agent, ip_address, created_at, last_active 
             FROM user_sessions 
             WHERE user_id = ? AND (expires_at > NOW() OR expires_at IS NULL)
             ORDER BY last_active DESC`,
            [req.user.id]
        );

        // Map session info to be more readable
        const sessions = rows.map(s => {
            const ua = s.user_agent.toLowerCase();
            let device = 'monitor';
            if (ua.includes('mobi') || ua.includes('android')) device = 'smartphone';
            else if (ua.includes('tablet') || ua.includes('ipad')) device = 'tablet';
            else if (ua.includes('mac') || ua.includes('windows')) device = 'laptop';

            return {
                id: s.id,
                tokenId: s.token_id,
                device,
                name: s.user_agent.split(') ')[0].split(' (')[1] || s.user_agent.slice(0, 30),
                location: s.ip_address,
                status: s.token_id === req.user.tokenId ? 'online' : 'offline',
                lastAccess: new Date(s.last_active).toLocaleString('pt-BR')
            };
        });

        res.json(sessions);
    } catch (err) {
        console.error('Erro ao buscar sessões:', err);
        res.status(500).json({ error: 'Erro interno ao buscar sessões.' });
    }
});

/**
 * DELETE /auth/sessions/:id
 * Revoke a specific session
 */
router.delete('/sessions/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        res.json({ success: true, message: 'Sessão revogada com sucesso.' });
    } catch (err) {
        console.error('Erro ao revogar sessão:', err);
        res.status(500).json({ error: 'Erro ao revogar sessão.' });
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
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
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

    const frontendUrl = process.env.FRONTEND_URL || 'https://psiflux.com.br';
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

// POST /auth/register — Cadastro público de psicólogo (cria tenant + usuário admin)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { error: 'Muitos cadastros deste IP. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, async (req, res) => {
  const {
    name, email, password, phone, specialty, crp, company_name,
    gender, bio, abordagens, disponibilidade, modalidade,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const [[defaultPlan]] = await conn.query(
      'SELECT id FROM plans WHERE active = true ORDER BY price ASC LIMIT 1'
    );
    const planId = defaultPlan?.id || null;

    const baseSlug = (company_name || name)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const uniqueSuffix = crypto.randomBytes(3).toString('hex');
    const tenantSlug = `${baseSlug}-${uniqueSuffix}`;

    // trial_ends_at = agora + 14 dias
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [tenantResult] = await conn.query(
      `INSERT INTO tenants (name, slug, phone, plan_id, active, trial_ends_at)
       VALUES (?, ?, ?, ?, true, ?)`,
      [company_name || name, tenantSlug, phone || null, planId, trialEndsAt]
    );
    const tenantId = tenantResult.insertId;

    const hashedPassword = await bcrypt.hash(password, 12);
    const profSlug = baseSlug + '-' + crypto.randomBytes(4).toString('hex');

    // Montar profile_theme com especialidades, abordagens, disponibilidade e modalidade
    let abordagensArr = [];
    let disponibilidadeArr = [];
    let modalidadeVal = null;
    try { abordagensArr = abordagens ? JSON.parse(abordagens) : []; } catch { abordagensArr = []; }
    try { disponibilidadeArr = disponibilidade ? JSON.parse(disponibilidade) : []; } catch { disponibilidadeArr = []; }
    try { modalidadeVal = modalidade ? JSON.parse(modalidade) : null; } catch { modalidadeVal = null; }

    const specialtiesList = specialty
      ? specialty.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const profileTheme = JSON.stringify({
      specialties_list: specialtiesList,
      abordagens: abordagensArr,
      disponibilidade: disponibilidadeArr,
      modalidade: Array.isArray(modalidadeVal) ? modalidadeVal : (modalidadeVal ? [modalidadeVal] : []),
    });

    await conn.query(
      `INSERT INTO users
         (tenant_id, name, email, password, role, specialty, crp, phone,
          company_name, gender, bio, public_slug, profile_theme, active)
       VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        tenantId, name, email, hashedPassword,
        specialtiesList[0] || null,
        crp || null, phone || null, company_name || null,
        gender || null, bio || null, profSlug, profileTheme,
      ]
    );

    await conn.commit();

    res.status(201).json({ message: 'Cadastro realizado! Faça login para acessar seu painel.' });
  } catch (err) {
    await conn.rollback();
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta. Tente novamente.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
