const express = require('express');
const router = express.Router();
const db = require('../db');

// Add extra profile columns if they don't exist (safe migration)
const ensureColumns = async () => {
  const extras = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_logo_url VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS schedule JSON NULL",
  ];
  for (const sql of extras) {
    try { await db.query(sql); } catch { /* column already exists */ }
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
      await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, req.user.id]);
      res.json({ avatar_url });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
  }
});

module.exports = router;
