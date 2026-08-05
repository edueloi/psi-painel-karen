const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /professional-areas - público, usado no wizard de cadastro
router.get('/', async (req, res) => {
  try {
    const [areas] = await db.query(
      'SELECT * FROM professional_areas WHERE active = true ORDER BY category, sort_order, name'
    );
    res.json(areas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar áreas de atuação' });
  }
});

// GET /professional-areas/all - todas incluindo inativas (só super_admin)
router.get('/all', authorize('super_admin'), async (req, res) => {
  try {
    const [areas] = await db.query('SELECT * FROM professional_areas ORDER BY category, sort_order, name');
    res.json(areas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar áreas de atuação' });
  }
});

// POST /professional-areas
router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const {
      name, slug, category, registry_label, registry_mask, description, icon, sort_order,
      can_prescribe_medication, does_psychotherapy, uses_clinical_instruments,
    } = req.body;
    if (!name || !slug || !category) {
      return res.status(400).json({ error: 'Nome, slug e categoria são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO professional_areas
         (name, slug, category, registry_label, registry_mask, description, icon, sort_order,
          can_prescribe_medication, does_psychotherapy, uses_clinical_instruments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, slug, category, registry_label || null, registry_mask || null, description || null, icon || null, sort_order || 0,
        !!can_prescribe_medication, !!does_psychotherapy, !!uses_clinical_instruments,
      ]
    );

    const [area] = await db.query('SELECT * FROM professional_areas WHERE id = ?', [result.insertId]);
    res.status(201).json(area[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma área com este slug.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar área de atuação' });
  }
});

// PUT /professional-areas/:id
router.put('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const {
      name, slug, category, registry_label, registry_mask, description, icon, active, sort_order,
      can_prescribe_medication, does_psychotherapy, uses_clinical_instruments,
    } = req.body;

    await db.query(
      `UPDATE professional_areas SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        category = COALESCE(?, category),
        registry_label = ?,
        registry_mask = ?,
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        active = COALESCE(?, active),
        sort_order = COALESCE(?, sort_order),
        can_prescribe_medication = COALESCE(?, can_prescribe_medication),
        does_psychotherapy = COALESCE(?, does_psychotherapy),
        uses_clinical_instruments = COALESCE(?, uses_clinical_instruments)
       WHERE id = ?`,
      [
        name, slug, category,
        registry_label !== undefined ? (registry_label || null) : undefined,
        registry_mask !== undefined ? (registry_mask || null) : undefined,
        description, icon,
        active !== undefined ? active : undefined,
        sort_order,
        can_prescribe_medication !== undefined ? !!can_prescribe_medication : undefined,
        does_psychotherapy !== undefined ? !!does_psychotherapy : undefined,
        uses_clinical_instruments !== undefined ? !!uses_clinical_instruments : undefined,
        req.params.id,
      ]
    );

    const [updated] = await db.query('SELECT * FROM professional_areas WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Área de atuação não encontrada' });
    res.json(updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma área com este slug.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar área de atuação' });
  }
});

// DELETE /professional-areas/:id
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const [users] = await db.query('SELECT id FROM users WHERE professional_area_id = ?', [req.params.id]);

    if (users.length > 0) {
      // Existem profissionais usando esta área — apenas desativa para preservar integridade
      await db.query('UPDATE professional_areas SET active = false WHERE id = ?', [req.params.id]);
      return res.status(200).json({ message: 'Área desativada (existem profissionais vinculados).' });
    }

    await db.query('DELETE FROM professional_areas WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover área de atuação' });
  }
});

module.exports = router;
