const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { generateShareToken } = require('../utils/shareToken');

// Add extra profile columns if they don't exist (safe migration)
const ensureColumns = async () => {
  const extras = [
    "ALTER TABLE users ADD COLUMN bio TEXT NULL",
    "ALTER TABLE users ADD COLUMN company_name VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN address VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN clinic_logo_url VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN cover_url VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN schedule JSON NULL",
    "ALTER TABLE users ADD COLUMN specialty VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN crp VARCHAR(50) NULL",
    "ALTER TABLE users ADD COLUMN phone VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN ui_preferences JSON NULL",
    "ALTER TABLE users ADD COLUMN forms_archived JSON NULL",
    "ALTER TABLE users ADD COLUMN forms_favorites JSON NULL",
    "ALTER TABLE users ADD COLUMN public_slug VARCHAR(255) NULL UNIQUE",
    "ALTER TABLE users ADD COLUMN social_links JSON NULL",
    "ALTER TABLE users ADD COLUMN public_profile_enabled BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN profile_theme JSON NULL",
    "ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL",
  ];
  for (const sql of extras) {
    try { 
      await db.query(sql); 
    } catch (err) { 
      if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') {
        console.error(`Erro ao adicionar coluna: ${sql}`, err.message);
      }
    }
  }
};
ensureColumns();

// GET /profile/me
router.get('/me', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.specialty, u.crp, u.phone, 
              u.avatar_url, u.bio, u.company_name, u.address, u.clinic_logo_url, u.cover_url, 
              u.schedule, u.active, u.permissions as user_permissions,
              u.ui_preferences, u.forms_archived, u.forms_favorites,
              u.two_factor_enabled, u.public_slug, u.social_links, u.public_profile_enabled, u.profile_theme,
              u.gender,
              p.permissions as profile_permissions, p.slug as profile_slug,
              pl.features as plan_features
       FROM users u 
       LEFT JOIN tenant_permission_profiles p ON u.tenant_profile_id = p.id
       LEFT JOIN tenants t ON u.tenant_id = t.id
       LEFT JOIN plans pl ON t.plan_id = pl.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    const u = rows[0];
    
    // Parse JSON fields
    const jsonFields = ['schedule', 'ui_preferences', 'forms_archived', 'forms_favorites', 'social_links', 'profile_theme'];
    jsonFields.forEach(f => {
      if (u[f] && typeof u[f] === 'string') {
        try { u[f] = JSON.parse(u[f]); } catch { u[f] = f.includes('forms') ? [] : null; }
      }
    });

    let userPerms = typeof u.user_permissions === 'string' ? JSON.parse(u.user_permissions) : u.user_permissions || {};
    let profPerms = typeof u.profile_permissions === 'string' ? JSON.parse(u.profile_permissions) : u.profile_permissions || {};
    
    if (u.profile_slug === 'admin' || u.role === 'admin' || u.role === 'super_admin') {
        u.permissions = { _full_access: true }; 
    } else {
        u.permissions = { ...profPerms, ...userPerms };
    }

    // Processar features do plano
    try {
      u.plan_features = typeof u.plan_features === 'string' ? JSON.parse(u.plan_features) : u.plan_features || [];
    } catch {
      u.plan_features = [];
    }

    delete u.user_permissions;
    delete u.profile_permissions;
    delete u.profile_slug;

    u.share_token = generateShareToken(u.id);

    res.json(u);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /profile/me
router.put('/me', async (req, res) => {
  try {
    const { 
      name, email, phone, crp, specialty, company_name, address, bio, 
      avatar_url, clinic_logo_url, cover_url, schedule,
      public_slug, social_links, public_profile_enabled, profile_theme,
      gender
    } = req.body;

    await db.query(
      `UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        crp = COALESCE(?, crp),
        specialty = COALESCE(?, specialty),
        company_name = ?,
        address = ?,
        bio = ?,
        avatar_url = COALESCE(?, avatar_url),
        clinic_logo_url = ?,
        cover_url = ?,
        schedule = ?,
        public_slug = ?,
        social_links = ?,
        public_profile_enabled = ?,
        profile_theme = ?,
        gender = ?
       WHERE id = ?`,
      [
        name, email, phone, crp, specialty, company_name || null, address || null, bio || null,
        avatar_url, clinic_logo_url || null, cover_url || null,
        schedule ? JSON.stringify(schedule) : null,
        public_slug || null,
        social_links ? JSON.stringify(social_links) : null,
        public_profile_enabled || false,
        profile_theme ? JSON.stringify(profile_theme) : null,
        gender || 'other',
        req.user.id
      ]
    );

    const [rows] = await db.query(
      `SELECT id, name, email, role, phone, crp, specialty, avatar_url, bio, 
              company_name, address, clinic_logo_url, cover_url, schedule,
              public_slug, social_links, public_profile_enabled, profile_theme, gender
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    const u = rows[0];

    const jsonFields = ['schedule', 'social_links', 'profile_theme'];
    jsonFields.forEach(f => {
      if (u[f] && typeof u[f] === 'string') {
        try { u[f] = JSON.parse(u[f]); } catch { u[f] = null; }
      }
    });

    res.json(u);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este link personalizado já está em uso.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

// PUT /profile/password — Alterar senha com validação da atual
router.put('/password', async (req, res) => {
    try {
        const { current, new: newPass } = req.body;
        if (!current || !newPass) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

        const [user] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        const match = await bcrypt.compare(current, user[0].password);

        if (!match) {
            return res.status(401).json({ error: 'Senha atual incorreta.' });
        }

        const hashed = await bcrypt.hash(newPass, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        
        res.json({ success: true, message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error('Erro ao trocar senha:', err);
        res.status(500).json({ error: 'Erro interno ao trocar senha.' });
    }
});

// PATCH /profile/preferences — salva ui_preferences e/ou forms_archived sem tocar no perfil
router.patch('/preferences', async (req, res) => {
  try {
    const { ui_preferences, forms_archived, forms_favorites } = req.body;
    const updates = [];
    const values = [];

    if (ui_preferences !== undefined) {
      updates.push('ui_preferences = ?');
      values.push(JSON.stringify(ui_preferences));
    }
    if (forms_archived !== undefined) {
      updates.push('forms_archived = ?');
      values.push(JSON.stringify(forms_archived));
    }
    if (forms_favorites !== undefined) {
      updates.push('forms_favorites = ?');
      values.push(JSON.stringify(forms_favorites));
    }

    if (updates.length === 0) return res.json({ ok: true });

    values.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar preferências' });
  }
});

// POST /profile/avatar — Upload do avatar do usuário autenticado
router.post('/avatar', async (req, res) => {
  try {
    const multerAvatar = require('multer')({
      storage: require('multer').diskStorage({
        destination: (req2, file, cb) => {
          const dir = require('path').join(__dirname, '../public/uploads/avatars');
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req2, file, cb) => {
          cb(null, `avatar-${req.user.id}-${Date.now()}${require('path').extname(file.originalname)}`);
        }
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req2, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'));
      }
    }).single('avatar');

    multerAvatar(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      // Deletar antigo
      const [old] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
      if (old.length && old[0].avatar_url && old[0].avatar_url.startsWith('/uploads-static/')) {
        const oldFile = path.join(__dirname, '../public', old[0].avatar_url.replace('/uploads-static/', 'uploads/'));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      const avatar_url = `/uploads-static/avatars/${req.file.filename}`;
      await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, req.user.id]);
      res.json({ avatar_url });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
  }
});

// POST /profile/logo — Upload da logo da clínica
router.post('/logo', async (req, res) => {
  try {
    const multerLogo = require('multer')({
      storage: require('multer').diskStorage({
        destination: (req2, file, cb) => {
          const dir = require('path').join(__dirname, '../public/uploads/logos');
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req2, file, cb) => {
          cb(null, `logo-${req.user.id}-${Date.now()}${require('path').extname(file.originalname)}`);
        }
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req2, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'));
      }
    }).single('logo');

    multerLogo(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      // Deletar antigo
      const [old] = await db.query('SELECT clinic_logo_url FROM users WHERE id = ?', [req.user.id]);
      if (old.length && old[0].clinic_logo_url && old[0].clinic_logo_url.startsWith('/uploads-static/')) {
        const oldFile = path.join(__dirname, '../public', old[0].clinic_logo_url.replace('/uploads-static/', 'uploads/'));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      const logo_url = `/uploads-static/logos/${req.file.filename}`;
      await db.query('UPDATE users SET clinic_logo_url = ? WHERE id = ?', [logo_url, req.user.id]);
      res.json({ logo_url });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload da logo' });
  }
});

// POST /profile/cover — Upload da capa do perfil
router.post('/cover', async (req, res) => {
  try {
    const multerCover = require('multer')({
      storage: require('multer').diskStorage({
        destination: (req2, file, cb) => {
          const dir = require('path').join(__dirname, '../public/uploads/covers');
          require('fs').mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req2, file, cb) => {
          cb(null, `cover-${req.user.id}-${Date.now()}${require('path').extname(file.originalname)}`);
        }
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req2, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'));
      }
    }).single('cover');

    multerCover(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

      // Deletar antigo
      const [old] = await db.query('SELECT cover_url FROM users WHERE id = ?', [req.user.id]);
      if (old.length && old[0].cover_url && old[0].cover_url.startsWith('/uploads-static/')) {
        const oldFile = path.join(__dirname, '../public', old[0].cover_url.replace('/uploads-static/', 'uploads/'));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      const cover_url = `/uploads-static/covers/${req.file.filename}`;
      await db.query('UPDATE users SET cover_url = ? WHERE id = ?', [cover_url, req.user.id]);
      res.json({ cover_url });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload da capa' });
  }
});

// ── TWO FACTOR AUTHENTICATION (2FA) ──────────────────────────────────────────

// POST /profile/2fa/setup — Gera o segredo e o QR Code
router.post('/2fa/setup', async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `PsiFlux: ${req.user.email}`,
      issuer: 'PsiFlux'
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (err) {
    console.error('Erro ao configurar 2FA:', err);
    res.status(500).json({ error: 'Erro ao configurar 2FA' });
  }
});

// POST /profile/2fa/verify — Valida o código e ativa o 2FA permanentemente
router.post('/2fa/verify', async (req, res) => {
  try {
    const { token, secret } = req.body;
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      await db.query(
        'UPDATE users SET two_factor_enabled = true, two_factor_secret = ? WHERE id = ?',
        [secret, req.user.id]
      );
      res.json({ success: true, message: '2FA ativado com sucesso!' });
    } else {
      res.status(400).json({ error: 'Código de verificação inválido' });
    }
  } catch (err) {
    console.error('Erro ao verificar 2FA:', err);
    res.status(500).json({ error: 'Erro ao verificar 2FA' });
  }
});

// POST /profile/2fa/disable — Desativa o 2FA
router.post('/2fa/disable', async (req, res) => {
  try {
    const { password } = req.body;
    const [user] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(password, user[0].password);

    if (!match) {
        return res.status(401).json({ error: 'Senha incorreta!' });
    }

    await db.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: '2FA desativado com sucesso.' });
  } catch (err) {
    console.error('Erro ao desativar 2FA:', err);
    res.status(500).json({ error: 'Erro ao desativar 2FA' });
  }
});

module.exports = router;
