const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

// GET /products
router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// POST /products
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { 
      name, category, price, cost, stock, minStock, 
      brand, type, imageUrl, expirationDate, barcode 
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      `INSERT INTO products (
        tenant_id, name, category, price, cost, stock, minStock, 
        brand, type, imageUrl, expirationDate, barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, name, category || 'Geral', price || 0, cost || 0, 
        stock || 0, minStock || 0, brand || null, type || 'physical', 
        imageUrl || null, expirationDate || null, barcode || null
      ]
    );

    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(product[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// PUT /products/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { 
      name, category, price, cost, stock, minStock, 
      brand, type, imageUrl, expirationDate, barcode, active 
    } = req.body;

    await db.query(
      `UPDATE products SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        cost = COALESCE(?, cost),
        stock = COALESCE(?, stock),
        minStock = COALESCE(?, minStock),
        brand = COALESCE(?, brand),
        type = COALESCE(?, type),
        imageUrl = COALESCE(?, imageUrl),
        expirationDate = COALESCE(?, expirationDate),
        barcode = COALESCE(?, barcode),
        active = COALESCE(?, active)
       WHERE id = ? AND tenant_id = ?`,
      [
        name, category, price, cost, stock, minStock, 
        brand, type, imageUrl, expirationDate, barcode, 
        active !== undefined ? active : undefined,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /products/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM products WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

module.exports = router;
