const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /forms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.is_public, f.hash, f.created_at,
              u.name as created_by_name,
              COUNT(r.id) as response_count
       FROM forms f
       LEFT JOIN users u ON u.id = f.created_by
       LEFT JOIN form_responses r ON r.form_id = f.id
       WHERE f.tenant_id = ?
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

// GET /forms/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const form = forms[0];
    try { form.fields = JSON.parse(form.fields); } catch { form.fields = []; }

    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
});

// POST /forms
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, fields, is_public } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const hash = uuidv4().replace(/-/g, '').substring(0, 16);

    const [result] = await db.query(
      'INSERT INTO forms (tenant_id, title, description, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.tenant_id, title, description || null,
        fields ? JSON.stringify(fields) : '[]',
        is_public ? 1 : 0, hash, req.user.id
      ]
    );

    const [form] = await db.query('SELECT * FROM forms WHERE id = ?', [result.insertId]);
    const f = form[0];
    try { f.fields = JSON.parse(f.fields); } catch {}
    res.status(201).json(f);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar formulário' });
  }
});

// PUT /forms/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, fields, is_public } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    await db.query(
      `UPDATE forms SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        fields = COALESCE(?, fields),
        is_public = COALESCE(?, is_public)
       WHERE id = ? AND tenant_id = ?`,
      [
        title, description,
        fields !== undefined ? JSON.stringify(fields) : undefined,
        is_public !== undefined ? (is_public ? 1 : 0) : undefined,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    const f = updated[0];
    try { f.fields = JSON.parse(f.fields); } catch {}
    res.json(f);
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

// ---- ROTA PÚBLICA - Formulário externo ----
// GET /forms/public/:hash - Dados do formulário público
router.get('/public/:hash', async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT id, title, description, fields FROM forms WHERE hash = ? AND is_public = true',
      [req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const form = forms[0];
    try { form.fields = JSON.parse(form.fields); } catch {}
    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
});

// POST /forms/public/:hash/respond - Resposta pública
router.post('/public/:hash/respond', async (req, res) => {
  try {
    const { respondent_name, respondent_email, data } = req.body;

    const [forms] = await db.query(
      'SELECT id FROM forms WHERE hash = ? AND is_public = true',
      [req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    await db.query(
      'INSERT INTO form_responses (form_id, respondent_name, respondent_email, data) VALUES (?, ?, ?, ?)',
      [forms[0].id, respondent_name || null, respondent_email || null, JSON.stringify(data || {})]
    );

    res.json({ message: 'Resposta enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar resposta' });
  }
});

module.exports = router;
