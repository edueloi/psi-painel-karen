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
    const { title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp } = req.body;
    if (!title || !template_body) return res.status(400).json({ error: 'Título e corpo são obrigatórios' });

    const [result] = await db.query(
      'INSERT INTO doc_templates (tenant_id, title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.tenant_id, title, doc_type || 'outros', template_body,
        category_id || null, header_logo_url || null, footer_logo_url || null,
        signature_name || null, signature_crp || null
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
    const { title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp } = req.body;

    await db.query(
      `UPDATE doc_templates SET
        title = COALESCE(?, title),
        doc_type = ?,
        template_body = ?,
        category_id = ?,
        header_logo_url = ?,
        footer_logo_url = ?,
        signature_name = ?,
        signature_crp = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        title, doc_type || 'outros', template_body,
        category_id || null, 
        header_logo_url || null, footer_logo_url || null,
        signature_name || null, signature_crp || null,
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

// POST /doc-generator/doc-templates/:id/render
router.post('/doc-templates/:id/render', async (req, res) => {
  try {
    const { patient_id, data } = req.body;
    const [templates] = await db.query(
      'SELECT * FROM doc_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!templates.length) return res.status(404).json({ error: 'Template não encontrado' });
    const tpl = templates[0];

    let rendered = tpl.template_body;

    // Se houver paciente, busca dados reais para garantir placeholders
    let patientData = {};
    if (patient_id) {
      const [p] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, req.user.tenant_id]);
      if (p.length) patientData = p[0];
    }

    const replacements = {
      '{{patient_name}}': data.patient_name || patientData.full_name || '',
      '{{nome_paciente}}': data.patient_name || patientData.full_name || '',
      '{{cpf_paciente}}': patientData.cpf || '',
      '{{patient_cpf}}': patientData.cpf || '',
      '{{date}}': data.date || '',
      '{{data}}': data.date || '',
      '{{city}}': data.city || '',
      '{{cidade}}': data.city || '',
      '{{professional_name}}': data.professional_name || '',
      '{{nome_profissional}}': data.professional_name || '',
      '{{professional_crp}}': data.professional_crp || '',
      '{{crp_profissional}}': data.professional_crp || '',
      '{{hora_inicio}}': data.time_start || '',
      '{{time_start}}': data.time_start || '',
      '{{hora_fim}}': data.time_end || '',
      '{{time_end}}': data.time_end || '',
      '{{valor}}': data.amount || '',
      '{{amount}}': data.amount || '',
      '{{servico}}': data.service_name || '',
      '{{service_name}}': data.service_name || '',
      '{{ano}}': data.year || '',
      '{{year}}': data.year || '',
      '{{mes_nome}}': data.month_name || '',
      '{{month_name}}': data.month_name || ''
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key, 'g');
      rendered = rendered.replace(regex, replacements[key]);
    });

    res.json({ rendered_html: rendered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao renderizar documento' });
  }
});

// POST /doc-generator/doc-instances
router.post('/doc-instances', async (req, res) => {
  try {
    const { template_id, patient_id, title, rendered_html, data_json } = req.body;
    const [result] = await db.query(
      'INSERT INTO doc_instances (tenant_id, patient_id, template_id, title, rendered_html) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, patient_id || null, template_id || null, title, rendered_html]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar histórico de documento' });
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
