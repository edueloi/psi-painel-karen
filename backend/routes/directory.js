const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /directory — Lista psicólogos com perfil público habilitado
router.get('/', async (req, res) => {
  try {
    const { q, specialty } = req.query;

    let sql = `
      SELECT name, specialty, crp, bio, public_slug, avatar_url, clinic_logo_url,
             company_name, address, social_links, profile_theme, gender
      FROM users
      WHERE public_profile_enabled = true
        AND public_slug IS NOT NULL
        AND public_slug != ''
        AND role IN ('admin', 'professional')
    `;
    const params = [];

    if (q) {
      sql += ` AND (name LIKE ? OR specialty LIKE ? OR company_name LIKE ? OR bio LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    if (specialty) {
      sql += ` AND specialty LIKE ?`;
      params.push(`%${specialty}%`);
    }

    sql += ` ORDER BY name ASC LIMIT 200`;

    const [rows] = await db.query(sql, params);

    const result = rows.map(u => {
      let socialLinks = u.social_links;
      let profileTheme = u.profile_theme;
      if (socialLinks && typeof socialLinks === 'string') {
        try { socialLinks = JSON.parse(socialLinks); } catch { socialLinks = []; }
      }
      if (profileTheme && typeof profileTheme === 'string') {
        try { profileTheme = JSON.parse(profileTheme); } catch { profileTheme = null; }
      }
      return { ...u, social_links: socialLinks || [], profile_theme: profileTheme };
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao buscar diretório de psicólogos:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
