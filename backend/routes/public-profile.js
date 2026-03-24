const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /public-profile/:slug — Busca dados públicos do profissional
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT name, specialty, crp, bio, phone, email, public_slug,
              avatar_url, cover_url, clinic_logo_url, company_name, 
              social_links, profile_theme, schedule
       FROM users 
       WHERE public_slug = ? AND public_profile_enabled = true`,
       [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado ou desativado.' });
    }

    const u = rows[0];

    // Parse JSON fields
    const jsonFields = ['social_links', 'profile_theme', 'schedule'];
    jsonFields.forEach(f => {
      if (u[f] && typeof u[f] === 'string') {
        try { u[f] = JSON.parse(u[f]); } catch { u[f] = null; }
      }
    });

    res.json(u);
  } catch (err) {
    console.error('Erro ao buscar perfil público:', err);
    res.status(500).json({ error: 'Erro interno ao carregar perfil.' });
  }
});

module.exports = router;
