const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /messages/templates
router.get('/templates', async (req, res) => {
  try {
    const { channel } = req.query;
    let query = 'SELECT * FROM message_templates WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (channel) { query += ' AND channel = ?'; params.push(channel); }
    query += ' ORDER BY name';

    const [templates] = await db.query(query, params);
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// POST /messages/templates
router.post('/templates', async (req, res) => {
  try {
    const { name, content, channel } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });

    const [result] = await db.query(
      'INSERT INTO message_templates (tenant_id, name, content, channel) VALUES (?, ?, ?, ?)',
      [req.user.tenant_id, name, content, channel || 'whatsapp']
    );

    const [tpl] = await db.query('SELECT * FROM message_templates WHERE id = ?', [result.insertId]);
    res.status(201).json(tpl[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /messages/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, content, channel } = req.body;

    await db.query(
      `UPDATE message_templates SET
        name = COALESCE(?, name),
        content = COALESCE(?, content),
        channel = COALESCE(?, channel)
       WHERE id = ? AND tenant_id = ?`,
      [name, content, channel, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM message_templates WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// DELETE /messages/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM message_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

module.exports = router;
