const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /doc-generator/doc-categories
router.get('/doc-categories', async (req, res) => {
  try {
    const [cats] = await db.query(
      'SELECT * FROM doc_categories WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /doc-generator/doc-categories
router.post('/doc-categories', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO doc_categories (tenant_id, name) VALUES (?, ?)',
      [req.user.tenant_id, name]
    );

    const [cat] = await db.query('SELECT * FROM doc_categories WHERE id = ?', [result.insertId]);
    res.status(201).json(cat[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// DELETE /doc-generator/doc-categories/:id
router.delete('/doc-categories/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM doc_categories WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// GET /doc-generator/doc-templates
router.get('/doc-templates', async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT t.*, c.name as category_name
      FROM doc_templates t
      LEFT JOIN doc_categories c ON c.id = t.category_id
      WHERE t.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
    query += ' ORDER BY t.title';

    const [templates] = await db.query(query, params);
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// GET /doc-generator/doc-templates/:id
router.get('/doc-templates/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM doc_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
});

// POST /doc-generator/doc-templates
router.post('/doc-templates', async (req, res) => {
  try {
    const { title, content, category_id, variables } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO doc_templates (tenant_id, title, content, category_id, variables) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.tenant_id, title, content || null,
        category_id || null,
        variables ? JSON.stringify(variables) : null
      ]
    );

    const [tpl] = await db.query('SELECT * FROM doc_templates WHERE id = ?', [result.insertId]);
    res.status(201).json(tpl[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /doc-generator/doc-templates/:id
router.put('/doc-templates/:id', async (req, res) => {
  try {
    const { title, content, category_id, variables } = req.body;

    await db.query(
      `UPDATE doc_templates SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        category_id = COALESCE(?, category_id),
        variables = COALESCE(?, variables)
       WHERE id = ? AND tenant_id = ?`,
      [
        title, content, category_id,
        variables !== undefined ? JSON.stringify(variables) : undefined,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM doc_templates WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// DELETE /doc-generator/doc-templates/:id
router.delete('/doc-templates/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM doc_templates WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

module.exports = router;
