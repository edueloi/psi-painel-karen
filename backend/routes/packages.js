const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /packages
router.get('/', async (req, res) => {
  try {
    const [packages] = await db.query(
      'SELECT * FROM packages WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    
    // Para cada pacote, buscar seus itens
    const fullPackages = await Promise.all(packages.map(async (pkg) => {
      const [items] = await db.query(
        'SELECT service_id as serviceId, quantity FROM package_items WHERE package_id = ?',
        [pkg.id]
      );
      return { ...pkg, items };
    }));

    res.json(fullPackages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacotes' });
  }
});

// POST /packages
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, description, discountType, discountValue, totalPrice, items } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await connection.query(
      'INSERT INTO packages (tenant_id, name, description, discountType, discountValue, totalPrice) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, description || null, discountType || 'percentage', discountValue || 0, totalPrice || 0]
    );

    const packageId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.query(
          'INSERT INTO package_items (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [packageId, item.serviceId, item.quantity]
        );
      }
    }

    await connection.commit();

    const [newPkg] = await db.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    res.status(201).json({ ...newPkg[0], items: items || [] });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pacote' });
  } finally {
    connection.release();
  }
});

// PUT /packages/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, description, discountType, discountValue, totalPrice, items, active } = req.body;

    await connection.query(
      `UPDATE packages SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        discountType = COALESCE(?, discountType),
        discountValue = COALESCE(?, discountValue),
        totalPrice = COALESCE(?, totalPrice),
        active = COALESCE(?, active)
       WHERE id = ? AND tenant_id = ?`,
      [name, description, discountType, discountValue, totalPrice, active !== undefined ? active : undefined, req.params.id, req.user.tenant_id]
    );

    if (items) {
      // Remover itens antigos e inserir novos
      await connection.query('DELETE FROM package_items WHERE package_id = ?', [req.params.id]);
      for (const item of items) {
        await connection.query(
          'INSERT INTO package_items (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [req.params.id, item.serviceId, item.quantity]
        );
      }
    }

    await connection.commit();

    const [updated] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    res.json({ ...updated[0], items: items || [] });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pacote' });
  } finally {
    connection.release();
  }
});

// DELETE /packages/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM packages WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pacote não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar pacote' });
  }
});

module.exports = router;
