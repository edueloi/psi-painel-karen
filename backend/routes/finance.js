const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /finance - Transações com filtros
router.get('/', async (req, res) => {
  try {
    const { start, end, type, category } = req.query;

    let query = `
      SELECT t.*, p.name as patient_name
      FROM financial_transactions t
      LEFT JOIN patients p ON p.id = t.patient_id
      WHERE t.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (type) { query += ' AND t.type = ?'; params.push(type); }
    if (category) { query += ' AND t.category = ?'; params.push(category); }
    if (start) { query += ' AND t.date >= ?'; params.push(start); }
    if (end) { query += ' AND t.date <= ?'; params.push(end); }

    query += ' ORDER BY t.date DESC';

    const [transactions] = await db.query(query, params);
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// GET /finance/summary - Resumo financeiro
router.get('/summary', async (req, res) => {
  try {
    const { month, year } = req.query;

    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();

    const [income] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM financial_transactions
       WHERE tenant_id = ? AND type = 'income' AND MONTH(date) = ? AND YEAR(date) = ?`,
      [req.user.tenant_id, m, y]
    );

    const [expense] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM financial_transactions
       WHERE tenant_id = ? AND type = 'expense' AND MONTH(date) = ? AND YEAR(date) = ?`,
      [req.user.tenant_id, m, y]
    );

    const totalIncome = parseFloat(income[0].total);
    const totalExpense = parseFloat(expense[0].total);

    res.json({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      month: m,
      year: y,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

// POST /finance
router.post('/', async (req, res) => {
  try {
    const { type, category, description, amount, date, patient_id, appointment_id, payment_method, status } = req.body;

    if (!type || !amount || !date) {
      return res.status(400).json({ error: 'Tipo, valor e data são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, category, description, amount, date, patient_id, appointment_id, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, type, category || null, description || null,
        amount, date, patient_id || null, appointment_id || null,
        payment_method || null, status || 'paid'
      ]
    );

    const [tx] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(tx[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// PUT /finance/:id
router.put('/:id', async (req, res) => {
  try {
    const { type, category, description, amount, date, payment_method, status } = req.body;

    await db.query(
      `UPDATE financial_transactions SET
        type = COALESCE(?, type),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        payment_method = COALESCE(?, payment_method),
        status = COALESCE(?, status)
       WHERE id = ? AND tenant_id = ?`,
      [type, category, description, amount, date, payment_method, status, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// DELETE /finance/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Transação não encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar transação' });
  }
});

// GET /finance/comandas
router.get('/comandas', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT c.*, p.name as patient_name, u.name as professional_name
      FROM comandas c
      LEFT JOIN patients p ON p.id = c.patient_id
      LEFT JOIN users u ON u.id = c.professional_id
      WHERE c.tenant_id = ?
    `;
    const params = [req.user.tenant_id];
    if (status) { query += ' AND c.status = ?'; params.push(status); }
    query += ' ORDER BY c.created_at DESC';

    const [comandas] = await db.query(query, params);
    for (const c of comandas) {
      try { c.items = JSON.parse(c.items); } catch { c.items = []; }
    }
    res.json(comandas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar comandas' });
  }
});

// POST /finance/comandas
router.post('/comandas', async (req, res) => {
  try {
    const { patient_id, professional_id, items, notes, payment_method, discount } = req.body;

    const itemsArr = items || [];
    const total = itemsArr.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);

    const [result] = await db.query(
      'INSERT INTO comandas (tenant_id, patient_id, professional_id, total, discount, items, notes, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.tenant_id, patient_id || null, professional_id || null,
        total, discount || 0, JSON.stringify(itemsArr), notes || null, payment_method || null
      ]
    );

    const [comanda] = await db.query('SELECT * FROM comandas WHERE id = ?', [result.insertId]);
    const c = comanda[0];
    try { c.items = JSON.parse(c.items); } catch {}
    res.status(201).json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar comanda' });
  }
});

module.exports = router;
