const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Helper: pack questions/interpretations/theme into the fields LONGTEXT column
function packFields(body) {
  const { questions, interpretations, theme, category, fields } = body;
  if (questions !== undefined) {
    return JSON.stringify({ 
      questions: questions || [], 
      interpretations: interpretations || [], 
      theme: theme || null,
      category: category || ''
    });
  }
  // legacy: fields array
  return fields ? JSON.stringify(fields) : '[]';
}

// Helper: unpack stored fields into questions/interpretations/theme
function unpackForm(form) {
  let parsed = null;
  try { parsed = JSON.parse(form.fields || '[]'); } catch {}

  const isNewFormat = parsed && !Array.isArray(parsed) && parsed.questions;
  
  if (isNewFormat) {
    form.questions = parsed.questions || [];
    form.interpretations = parsed.interpretations || [];
    form.theme = parsed.theme || null;
    form.category = form.category || parsed.category || '';
    form.fields = [];
  } else {
    form.questions = [];
    form.interpretations = [];
    form.theme = null;
    form.category = form.category || '';
    form.fields = Array.isArray(parsed) ? parsed : [];
  }
  return form;
}

// ---- CATEGORIES ----

// GET /forms/categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM form_categories WHERE tenant_id = ? ORDER BY name ASC',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /forms/categories
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    await db.query(
      'INSERT INTO form_categories (tenant_id, name, icon, color) VALUES (?, ?, ?, ?)',
      [req.user.tenant_id, name, icon || 'FileText', color || '#4f46e5']
    );
    res.status(201).json({ message: 'Categoria criada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// DELETE /forms/categories/:id
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM form_categories WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// GET /forms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.category, f.is_public, f.is_global, f.hash, f.created_at,
              u.name as created_by_name,
              COUNT(r.id) as response_count
       FROM forms f
       LEFT JOIN users u ON u.id = f.created_by
       LEFT JOIN form_responses r ON r.form_id = f.id
       WHERE f.tenant_id = ? OR f.is_global = true
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulários' });
  }
});

// GET /forms/responses?patient_id=X
router.get('/responses', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.json([]);
    const [rows] = await db.query(
      `SELECT r.id, r.form_id, r.created_at, f.title as form_title
       FROM form_responses r
       JOIN forms f ON f.id = r.form_id
       WHERE r.patient_id = ? AND f.tenant_id = ?
       ORDER BY r.created_at DESC`,
      [patient_id, req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

// ---- ROTAS PÚBLICAS ----

// GET /forms/public/:hash
router.get('/public/:hash', async (req, res) => {
  try {
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.fields, f.category, f.hash, f.is_global,
              u.name as professional_name, u.specialty as professional_specialty,
              u.crp as professional_crp, u.company_name, u.clinic_logo_url, u.avatar_url
       FROM forms f
       LEFT JOIN users u ON u.id = f.created_by
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const row = forms[0];
    const form = unpackForm(row);
    form.professional = {
      name: row.professional_name || '',
      specialty: row.professional_specialty || '',
      crp: row.professional_crp || '',
      company_name: row.company_name || '',
      clinic_logo_url: row.clinic_logo_url || '',
      avatar_url: row.avatar_url || '',
    };
    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário público' });
  }
});

// POST /forms/public/:hash/responses
router.post('/public/:hash/responses', async (req, res) => {
  try {
    const { respondent_name, respondent_email, respondent_phone, patient_id, answers, score } = req.body;

    const [forms] = await db.query(
      'SELECT id FROM forms WHERE hash = ? AND is_public = true',
      [req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const data = JSON.stringify({ answers: answers || {}, respondent_phone: respondent_phone || null });

    await db.query(
      'INSERT INTO form_responses (form_id, patient_id, respondent_name, respondent_email, data, score) VALUES (?, ?, ?, ?, ?, ?)',
      [forms[0].id, patient_id || null, respondent_name || null, respondent_email || null, data, score || 0]
    );

    res.json({ message: 'Resposta enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar resposta' });
  }
});

// GET /forms/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND (tenant_id = ? OR is_global = true)',
      [req.params.id, req.user.tenant_id]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const form = unpackForm(forms[0]);
    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
});

// POST /forms
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, is_public, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const hash = uuidv4().replace(/-/g, '').substring(0, 16);
    const fieldsJson = packFields(req.body);
    const publicFlag = is_public !== undefined ? (is_public ? 1 : 0) : 1;

    const [result] = await db.query(
      'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, title, description || null, category || '', fieldsJson, publicFlag, hash, req.user.id]
    );

    const [form] = await db.query('SELECT * FROM forms WHERE id = ?', [result.insertId]);
    res.status(201).json(unpackForm(form[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar formulário' });
  }
});

// PUT /forms/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, is_public, category } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const fieldsJson = packFields(req.body);
    const publicFlag = is_public !== undefined ? (is_public ? 1 : 0) : 1;

    await db.query(
      `UPDATE forms SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        fields = ?,
        is_public = ?
       WHERE id = ? AND tenant_id = ?`,
      [title, description, category, fieldsJson, publicFlag, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    res.json(unpackForm(updated[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar formulário' });
  }
});

// DELETE /forms/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formulário não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar formulário' });
  }
});

// POST /forms/:id/duplicate
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND (tenant_id = ? OR is_global = true)',
      [req.params.id, req.user.tenant_id]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const original = forms[0];
    const newHash = uuidv4().substring(0, 8);
    const newTitle = `${original.title} (Cópia)`;

    const [result] = await db.query(
      'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, newTitle, original.description, original.category, original.fields, original.is_public, false, newHash, req.user.id]
    );

    const [newForm] = await db.query('SELECT * FROM forms WHERE id = ?', [result.insertId]);
    res.status(201).json(unpackForm(newForm[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao duplicar formulário' });
  }
});

// GET /forms/:id/responses
router.get('/:id/responses', authMiddleware, async (req, res) => {
  try {
    const [responses] = await db.query(
      'SELECT * FROM form_responses WHERE form_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    for (const r of responses) {
      try { r.data = JSON.parse(r.data); } catch {}
    }

    res.json(responses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

module.exports = router;
