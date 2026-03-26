const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /public-profile/:slug — Busca dados públicos do profissional
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT name, specialty, crp, bio, phone, email, public_slug,
              avatar_url, cover_url, clinic_logo_url, company_name, 
              social_links, profile_theme, schedule, gender
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

// GET /public-profile/token/:token — Busca dados públicos do profissional via Share Token
router.get('/token/:token', async (req, res) => {
  try {
    const { parseShareToken } = require('../utils/shareToken');
    const userId = parseShareToken(req.params.token);
    
    if (!userId) {
      return res.status(400).json({ error: 'Token inválido.' });
    }

    const [rows] = await db.query(
      `SELECT name, specialty, crp, company_name, avatar_url, clinic_logo_url
       FROM users 
       WHERE id = ?`,
       [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil via token:', err);
    res.status(500).json({ error: 'Erro interno ao carregar dados.' });
  }
});

module.exports = router;
