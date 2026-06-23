const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /directory — Lista psicólogos com perfil público habilitado
// Query params: q, specialty, abordagem, disponibilidade, modalidade
router.get('/', async (req, res) => {
  try {
    const { q, specialty, abordagem, disponibilidade, modalidade } = req.query;

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
      sql += ` AND (specialty LIKE ? OR JSON_SEARCH(profile_theme, 'one', ?, NULL, '$.specialties_list') IS NOT NULL)`;
      params.push(`%${specialty}%`, specialty);
    }

    // Filtro de abordagem — busca no profile_theme.abordagens
    if (abordagem) {
      const abordagens = abordagem.split(',').map(a => a.trim()).filter(Boolean);
      if (abordagens.length > 0) {
        const clauses = abordagens.map(() =>
          `JSON_SEARCH(profile_theme, 'one', ?, NULL, '$.abordagens') IS NOT NULL`
        );
        sql += ` AND (${clauses.join(' OR ')})`;
        abordagens.forEach(a => params.push(a));
      }
    }

    // Filtro de disponibilidade — busca no profile_theme ou schedule
    if (disponibilidade) {
      const disp = disponibilidade.split(',').map(d => d.trim()).filter(Boolean);
      if (disp.length > 0) {
        const clauses = disp.map(() =>
          `JSON_SEARCH(profile_theme, 'one', ?, NULL, '$.disponibilidade') IS NOT NULL`
        );
        sql += ` AND (${clauses.join(' OR ')})`;
        disp.forEach(d => params.push(d));
      }
    }

    // Filtro de modalidade — busca no profile_theme
    if (modalidade) {
      sql += ` AND JSON_SEARCH(profile_theme, 'one', ?, NULL, '$.modalidade') IS NOT NULL`;
      params.push(modalidade);
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
