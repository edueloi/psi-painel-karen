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

// ─── BDI-II ──────────────────────────────────────────────────────────────────
router.get('/bdi-ii/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });
    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });
    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'bdi-ii', user.tenant_id]
    );
    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) { console.error('Erro BDI-II GET:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/bdi-ii/:patientId', async (req, res) => {
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
      [patientId, 'bdi-ii', user.tenant_id]
    );
    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'bdi-ii', str]
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error('Erro BDI-II POST:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

// ─── BAI ─────────────────────────────────────────────────────────────────────
router.get('/bai/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });
    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });
    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'bai', user.tenant_id]
    );
    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) { console.error('Erro BAI GET:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/bai/:patientId', async (req, res) => {
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
      [patientId, 'bai', user.tenant_id]
    );
    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'bai', str]
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error('Erro BAI POST:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

// ─── SNAP-IV ──────────────────────────────────────────────────────────────────
router.get('/snap-iv/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });
    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });
    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'snap-iv', user.tenant_id]
    );
    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) { console.error('Erro SNAP-IV GET:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/snap-iv/:patientId', async (req, res) => {
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
      [patientId, 'snap-iv', user.tenant_id]
    );
    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'snap-iv', str]
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error('Erro SNAP-IV POST:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

// ─── M-CHAT-R ─────────────────────────────────────────────────────────────────
router.get('/m-chat-r/:patientId', async (req, res) => {
  try {
    const userId = resolveUserId(req.query.u);
    if (!userId) return res.status(400).json({ error: 'Token inválido.' });
    const [[user]] = await db.query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });
    const [rows] = await db.query(
      'SELECT data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [req.params.patientId, 'm-chat-r', user.tenant_id]
    );
    if (rows.length === 0) return res.json([]);
    let data = rows[0].data;
    try { data = JSON.parse(data); } catch {}
    res.json(Array.isArray(data) ? data : []);
  } catch (err) { console.error('Erro M-CHAT-R GET:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/m-chat-r/:patientId', async (req, res) => {
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
      [patientId, 'm-chat-r', user.tenant_id]
    );
    if (rows.length > 0) {
      await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [user.tenant_id, patientId, userId, patientId, 'm-chat-r', str]
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error('Erro M-CHAT-R POST:', err); res.status(500).json({ error: 'Erro interno.' }); }
});

// ─── ANAMNESE — Rotas Públicas (acesso via token seguro do paciente) ──────────────

// GET /public-profile/anamnese/validate?t=TOKEN
// Valida o token e retorna dados do formulário + profissional (sem dados sensíveis)
router.get('/anamnese/validate', async (req, res) => {
  try {
    const { t: token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token obrigatório.' });

    const [[link]] = await db.query(
      `SELECT l.*, s.title, s.custom_message, s.template_type, s.approach,
              s.allow_resume, s.allow_edit_after_submit, s.consent_required,
              s.fields_config, s.status AS send_status, s.expires_at AS send_expires,
              p.name AS patient_name
       FROM anamnesis_secure_links l
       JOIN anamnesis_sends s ON s.id = l.send_id
       JOIN patients p ON p.id = l.patient_id
       WHERE l.token = ?`,
      [token]
    );

    if (!link) return res.status(404).json({ error: 'Link não encontrado ou inválido.' });
    if (link.is_revoked) return res.status(410).json({ error: 'Este link foi revogado pelo(a) profissional.' });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Este link expirou. Entre em contato com seu(sua) psicólogo(a).' });
    }
    if (['cancelled', 'expired'].includes(link.send_status)) {
      return res.status(410).json({ error: 'Este formulário foi cancelado ou expirou.' });
    }

    // Buscar profissional (dados públicos)
    const [[prof]] = await db.query(
      'SELECT name, specialty, crp, company_name, avatar_url, clinic_logo_url FROM users WHERE id = ?',
      [link.professional_id]
    );

    // Verificar se já há resposta salva (para "continuar depois")
    const [[existingResponse]] = await db.query(
      'SELECT id, progress_data, submitted_at FROM anamnesis_patient_responses WHERE send_id = ?',
      [link.send_id]
    );

    // Registrar primeira abertura
    if (!link.opened_at) {
      await db.query(
        'UPDATE anamnesis_secure_links SET opened_at = NOW(), ip_first_open = ? WHERE token = ?',
        [req.ip || null, token]
      );
      // Atualizar status do envio para 'viewed'
      await db.query(
        "UPDATE anamnesis_sends SET status = 'viewed', viewed_at = NOW() WHERE id = ? AND status = 'sent'",
        [link.send_id]
      );
    }

    let fieldsConfig = null;
    try { fieldsConfig = link.fields_config ? JSON.parse(link.fields_config) : null; } catch {}

    let progressData = null;
    try { progressData = existingResponse?.progress_data ? JSON.parse(existingResponse.progress_data) : null; } catch {}

    res.json({
      send_id: link.send_id,
      title: link.title,
      custom_message: link.custom_message,
      template_type: link.template_type,
      approach: link.approach,
      allow_resume: !!link.allow_resume,
      allow_edit_after_submit: !!link.allow_edit_after_submit,
      consent_required: !!link.consent_required,
      fields_config: fieldsConfig,
      patient_name: link.patient_name,
      professional: prof,
      already_submitted: !!existingResponse?.submitted_at,
      can_edit: !!link.allow_edit_after_submit,
      has_progress: !!progressData,
      progress_data: progressData,
    });
  } catch (err) {
    console.error('Erro validar anamnese token:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/anamnese/consent?t=TOKEN
// Registra aceite do termo de consentimento
router.post('/anamnese/consent', async (req, res) => {
  try {
    const { t: token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token obrigatório.' });

    const [[link]] = await db.query(
      'SELECT l.*, s.status AS send_status FROM anamnesis_secure_links l JOIN anamnesis_sends s ON s.id = l.send_id WHERE l.token = ? AND l.is_revoked = 0',
      [token]
    );
    if (!link) return res.status(404).json({ error: 'Link inválido.' });

    await db.query(
      `INSERT INTO patient_consent_logs (send_id, patient_id, tenant_id, term_version, accepted, ip_address, user_agent, accepted_at)
       VALUES (?, ?, ?, '1.0', 1, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE accepted_at = NOW()`,
      [link.send_id, link.patient_id, link.tenant_id, req.ip || null, req.headers['user-agent'] || null]
    );

    // Garantir linha de resposta com consent
    await db.query(
      `INSERT INTO anamnesis_patient_responses (send_id, patient_id, professional_id, tenant_id, consent_accepted_at, consent_ip)
       VALUES (?, ?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE consent_accepted_at = NOW(), consent_ip = ?`,
      [link.send_id, link.patient_id, link.professional_id, link.tenant_id, req.ip || null, req.ip || null]
    );

    // Atualizar status para 'filling'
    await db.query(
      "UPDATE anamnesis_sends SET status = 'filling', started_at = COALESCE(started_at, NOW()) WHERE id = ?",
      [link.send_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro registrar consentimento anamnese:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/anamnese/progress?t=TOKEN
// Salva progresso parcial (continuar depois)
router.post('/anamnese/progress', async (req, res) => {
  try {
    const { t: token } = req.query;
    const { progress_data } = req.body;
    if (!token) return res.status(400).json({ error: 'Token obrigatório.' });

    const [[link]] = await db.query(
      'SELECT * FROM anamnesis_secure_links WHERE token = ? AND is_revoked = 0',
      [token]
    );
    if (!link) return res.status(404).json({ error: 'Link inválido.' });

    await db.query(
      `UPDATE anamnesis_patient_responses
       SET progress_data = ?, last_saved_at = NOW()
       WHERE send_id = ?`,
      [JSON.stringify(progress_data), link.send_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro salvar progresso anamnese:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /public-profile/anamnese/submit?t=TOKEN
// Submete respostas finais
router.post('/anamnese/submit', async (req, res) => {
  try {
    const { t: token } = req.query;
    const { answers } = req.body;
    if (!token) return res.status(400).json({ error: 'Token obrigatório.' });
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Respostas inválidas.' });

    const [[link]] = await db.query(
      'SELECT l.*, s.allow_edit_after_submit FROM anamnesis_secure_links l JOIN anamnesis_sends s ON s.id = l.send_id WHERE l.token = ? AND l.is_revoked = 0',
      [token]
    );
    if (!link) return res.status(404).json({ error: 'Link inválido.' });

    // Verificar se já foi submetido e se pode editar
    const [[existing]] = await db.query(
      'SELECT submitted_at FROM anamnesis_patient_responses WHERE send_id = ?',
      [link.send_id]
    );
    if (existing?.submitted_at && !link.allow_edit_after_submit) {
      return res.status(409).json({ error: 'Você já respondeu este formulário.' });
    }

    // Detectar alertas clínicos nas respostas
    const answersStr = JSON.stringify(answers).toLowerCase();
    const CRITICAL_KEYWORDS = ['suicid', 'autoagressão', 'me machucar', 'quero morrer', 'violência', 'abuso', 'risco iminente', 'pensamento de morte'];
    const clinicalAlerts = CRITICAL_KEYWORDS.filter(kw => answersStr.includes(kw));
    const hasCritical = clinicalAlerts.length > 0;

    await db.query(
      `UPDATE anamnesis_patient_responses
       SET answers = ?, clinical_alerts = ?, has_critical_content = ?,
           submitted_at = NOW(), last_saved_at = NOW(), progress_data = NULL
       WHERE send_id = ?`,
      [JSON.stringify(answers), JSON.stringify(clinicalAlerts), hasCritical ? 1 : 0, link.send_id]
    );

    // Atualizar status do envio
    await db.query(
      "UPDATE anamnesis_sends SET status = 'answered', completed_at = NOW() WHERE id = ?",
      [link.send_id]
    );

    res.json({ ok: true, has_critical_content: hasCritical });
  } catch (err) {
    console.error('Erro submeter anamnese:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;

