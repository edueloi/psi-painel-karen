const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /directory/cities — cidades disponíveis (sem auth)
router.get('/cities', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT
        TRIM(SUBSTRING_INDEX(address, ',', -2)) as city_raw,
        address
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.public_profile_enabled = true
        AND u.public_slug IS NOT NULL AND u.public_slug != ''
        AND u.role IN ('admin','professional')
        AND u.active = true
        AND (t.id IS NULL OR (
          (t.status IS NULL OR t.status != 'blocked')
          AND (t.expires_at IS NULL OR t.expires_at > NOW())
        ))
        AND address IS NOT NULL AND address != ''
      LIMIT 500
    `);
    // Extrai cidade/estado do endereço
    const cities = [...new Set(
      rows.map(r => {
        const parts = (r.address || '').split(',').map(s => s.trim()).filter(Boolean);
        return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1];
      }).filter(Boolean)
    )].sort();
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /directory — Lista psicólogos com perfil público habilitado
// Query params: q, specialty, abordagem, disponibilidade, modalidade, cidade, page, limit
router.get('/', async (req, res) => {
  try {
    const { q, specialty, abordagem, disponibilidade, modalidade, cidade } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    let where = `
      u.public_profile_enabled = true
      AND u.public_slug IS NOT NULL AND u.public_slug != ''
      AND u.role IN ('admin','professional')
      AND u.active = true
      AND (t.id IS NULL OR (
        (t.status IS NULL OR t.status != 'blocked')
        AND (t.expires_at IS NULL OR t.expires_at > NOW())
      ))
    `;
    const params = [];

    if (q) {
      where += ` AND (u.name LIKE ? OR u.specialty LIKE ? OR u.company_name LIKE ? OR u.bio LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (specialty) {
      where += ` AND (u.specialty LIKE ? OR JSON_SEARCH(u.profile_theme,'one',?,NULL,'$.specialties_list') IS NOT NULL)`;
      params.push(`%${specialty}%`, specialty);
    }
    if (abordagem) {
      const abs = abordagem.split(',').map(a => a.trim()).filter(Boolean);
      if (abs.length) {
        where += ` AND (${abs.map(() => `JSON_SEARCH(u.profile_theme,'one',?,NULL,'$.abordagens') IS NOT NULL`).join(' OR ')})`;
        abs.forEach(a => params.push(a));
      }
    }
    if (disponibilidade) {
      const disp = disponibilidade.split(',').map(d => d.trim()).filter(Boolean);
      if (disp.length) {
        where += ` AND (${disp.map(() => `JSON_SEARCH(u.profile_theme,'one',?,NULL,'$.disponibilidade') IS NOT NULL`).join(' OR ')})`;
        disp.forEach(d => params.push(d));
      }
    }
    if (modalidade) {
      where += ` AND JSON_SEARCH(u.profile_theme,'one',?,NULL,'$.modalidade') IS NOT NULL`;
      params.push(modalidade);
    }
    if (cidade) {
      where += ` AND u.address LIKE ?`;
      params.push(`%${cidade}%`);
    }

    const baseSql = `
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE ${where}
    `;

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total ${baseSql}`, params);

    const [rows] = await db.query(
      `SELECT u.name, u.specialty, u.crp, u.bio, u.public_slug, u.avatar_url,
              u.clinic_logo_url, u.company_name, u.address, u.social_links,
              u.profile_theme, u.gender
       ${baseSql} ORDER BY u.name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const result = rows.map(u => {
      let socialLinks = u.social_links;
      let profileTheme = u.profile_theme;
      if (typeof socialLinks === 'string') { try { socialLinks = JSON.parse(socialLinks); } catch { socialLinks = []; } }
      if (typeof profileTheme === 'string') { try { profileTheme = JSON.parse(profileTheme); } catch { profileTheme = null; } }
      return { ...u, social_links: socialLinks || [], profile_theme: profileTheme };
    });

    res.json({ data: result, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Erro ao buscar diretório de psicólogos:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
