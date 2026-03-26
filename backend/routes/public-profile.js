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

// Resolve userId a partir de share token ou ID numérico puro (fallback retrocompatível)
function resolveUserId(uParam) {
  if (!uParam) return null;
  const { parseShareToken } = require('../utils/shareToken');
  const fromToken = parseShareToken(uParam);
  if (fromToken) return fromToken;
  const asInt = parseInt(uParam, 10);
  return Number.isFinite(asInt) && asInt > 0 ? asInt : null;
}

// GET /public-profile/dass-21/:patientId?u=TOKEN — Busca histórico DASS-21 do paciente (público)
router.get('/dass-21/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'dass-21', user.tenant_id]
    );

    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Erro ao buscar DASS-21 público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/dass-21/:patientId?u=TOKEN — Salva resultado DASS-21 (público)
router.post('/dass-21/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Dados inválidos.' });

    const patientId = req.params.patientId;
    const str = JSON.stringify(data);

    const [rows] = await db.query(
      'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [patientId, 'dass-21', user.tenant_id]
    );

    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'dass-21', str]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar DASS-21 público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /public-profile/disc-evaluative/:patientId?u=TOKEN — Busca histórico DISC do paciente (público)
router.get('/disc-evaluative/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'disc-evaluative', user.tenant_id]
    );

    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Erro ao buscar DISC público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/disc-evaluative/:patientId?u=TOKEN — Salva resultado DISC (público)
router.post('/disc-evaluative/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });

    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Dados inválidos.' });

    const patientId = req.params.patientId;
    const str = JSON.stringify(data);

    const [rows] = await db.query(
      'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [patientId, 'disc-evaluative', user.tenant_id]
    );

    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'disc-evaluative', str]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar DISC público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
