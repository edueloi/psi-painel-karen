const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /plans - público para listagem no login/cadastro
router.get('/', async (req, res) => {
  try {
    const [plans] = await db.query(
      'SELECT * FROM plans WHERE active = true ORDER BY price'
    );
    for (const p of plans) {
      try { p.features = JSON.parse(p.features); } catch { p.features = []; }
    }
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

// GET /plans/all - todos incluindo inativos (só super_admin)
router.get('/all', authorize('super_admin'), async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM plans ORDER BY price');
    for (const p of plans) {
      try { p.features = JSON.parse(p.features); } catch { p.features = []; }
    }
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

// POST /plans
router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const { name, price, max_users, max_patients, features, description } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

    const [result] = await db.query(
      'INSERT INTO plans (name, description, price, max_users, max_patients, features) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || null, price, max_users || 5, max_patients || 100, JSON.stringify(features || [])]
    );

    const [plan] = await db.query('SELECT * FROM plans WHERE id = ?', [result.insertId]);
    const p = plan[0];
    try { p.features = JSON.parse(p.features); } catch {}
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar plano' });
  }
});

// PUT /plans/:id
router.put('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const { name, description, price, max_users, max_patients, features, active } = req.body;

    await db.query(
      `UPDATE plans SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        max_users = COALESCE(?, max_users),
        max_patients = COALESCE(?, max_patients),
        features = COALESCE(?, features),
        active = COALESCE(?, active)
       WHERE id = ?`,
      [
        name, description, price, max_users, max_patients,
        features !== undefined ? JSON.stringify(features) : undefined,
        active !== undefined ? active : undefined,
        req.params.id
      ]
    );

    const [updated] = await db.query('SELECT * FROM plans WHERE id = ?', [req.params.id]);
    const p = updated[0];
    try { p.features = JSON.parse(p.features); } catch {}
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

// DELETE /plans/:id
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    // 1. Verificar se existem clínicas usando este plano
    const [tenants] = await db.query('SELECT id FROM tenants WHERE plan_id = ?', [req.params.id]);
    
    if (tenants.length > 0) {
      // Se houver clínicas, apenas desativa para manter integridade histórica
      await db.query('UPDATE plans SET active = false WHERE id = ?', [req.params.id]);
      return res.status(200).json({ message: 'Plano desativado (existem clínicas vinculadas).' });
    }

    // 2. Se não houver vínculos, deleta permanentemente
    await db.query('DELETE FROM plans WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover plano do sistema' });
  }
});

module.exports = router;
