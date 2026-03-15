const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /clinical-tools/:scopeKey/:toolCategory/:toolType
router.get('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;

    const [rows] = await db.query(
      'SELECT * FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, fullType, req.user.tenant_id]
    );

    if (rows.length === 0) return res.json(null);

    const tool = rows[0];
    try { tool.data = JSON.parse(tool.data); } catch {}
    res.json(tool);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar ferramenta clínica' });
  }
});

// PUT /clinical-tools/:scopeKey/:toolCategory/:toolType
router.put('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;
    const { patient_id, data } = req.body;

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    const [existing] = await db.query(
      'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, fullType, req.user.tenant_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
        [dataStr, scopeKey, fullType, req.user.tenant_id]
      );
    } else {
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.tenant_id, patient_id || 0, req.user.id, scopeKey, fullType, dataStr]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar ferramenta clínica' });
  }
});

// PATCH /clinical-tools/:scopeKey/:toolCategory/:toolType
router.patch('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;
    const { data } = req.body;

    const [existing] = await db.query(
      'SELECT id, data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, fullType, req.user.tenant_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Ferramenta não encontrada' });
    }

    let existingData = {};
    try { existingData = JSON.parse(existing[0].data); } catch {}

    const merged = { ...existingData, ...data };
    await db.query(
      'UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(merged), existing[0].id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar ferramenta clínica' });
  }
});

// POST /clinical-tools/:scopeKey/psycho/dreams - Adicionar entrada no diário
router.post('/:scopeKey/psycho/dreams', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const fullType = 'psycho/dreams';

    const [existing] = await db.query(
      'SELECT id, data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
      [scopeKey, fullType, req.user.tenant_id]
    );

    const newEntry = { id: Date.now(), ...req.body, created_at: new Date().toISOString() };
    let entries = [];

    if (existing.length > 0) {
      try { entries = JSON.parse(existing[0].data); } catch {}
      entries.push(newEntry);
      await db.query(
        'UPDATE clinical_tools SET data = ? WHERE id = ?',
        [JSON.stringify(entries), existing[0].id]
      );
    } else {
      entries = [newEntry];
      await db.query(
        'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.tenant_id, 0, req.user.id, scopeKey, fullType, JSON.stringify(entries)]
      );
    }

    res.status(201).json(newEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar entrada' });
  }
});

module.exports = router;
