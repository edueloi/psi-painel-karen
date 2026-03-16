const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');

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
  ];
  for (const sql of extras) {
    try { 
      await db.query(sql); 
    } catch (err) { 
      // Ignora erro 1060 (coluna já existe)
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
      'SELECT id, tenant_id, name, email, role, specialty, crp, phone, avatar_url, bio, company_name, address, clinic_logo_url, cover_url, schedule, active FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    const u = rows[0];
    if (u.schedule && typeof u.schedule === 'string') {
      try { u.schedule = JSON.parse(u.schedule); } catch { u.schedule = null; }
    }
    res.json(u);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /profile/me
router.put('/me', async (req, res) => {
  try {
    const { name, email, phone, crp, specialty, company_name, address, bio, avatar_url, clinic_logo_url, cover_url, schedule } = req.body;
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
        schedule = ?
       WHERE id = ?`,
      [name, email, phone, crp, specialty, company_name || null, address || null, bio || null,
       avatar_url, clinic_logo_url || null, cover_url || null,
       schedule ? JSON.stringify(schedule) : null,
       req.user.id]
    );
    const [rows] = await db.query(
      'SELECT id, name, email, role, phone, crp, specialty, avatar_url, bio, company_name, address, clinic_logo_url, cover_url, schedule FROM users WHERE id = ?',
      [req.user.id]
    );
    const u = rows[0];
    if (u.schedule && typeof u.schedule === 'string') {
      try { u.schedule = JSON.parse(u.schedule); } catch { u.schedule = null; }
    }
    res.json(u);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar perfil' });
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

module.exports = router;
