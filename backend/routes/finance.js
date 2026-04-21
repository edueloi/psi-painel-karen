const { authMiddleware, checkPermission } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Auto-migrate financial_transactions ───────────────────────────────────────
async function ensureFinanceColumns() {
  const cols = [
    "ALTER TABLE financial_transactions ADD COLUMN payer_name VARCHAR(255) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN payer_cpf VARCHAR(20) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN beneficiary_name VARCHAR(255) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN beneficiary_cpf VARCHAR(20) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN observation TEXT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN due_date DATE NULL",
    "ALTER TABLE financial_transactions ADD COLUMN receipt_status ENUM('pending','issued') DEFAULT 'pending'",
    "ALTER TABLE financial_transactions ADD COLUMN receipt_code VARCHAR(100) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN comanda_id INT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN appointment_id INT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN created_by INT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN source VARCHAR(50) DEFAULT 'direct'",
    "ALTER TABLE financial_transactions MODIFY COLUMN status VARCHAR(50) DEFAULT 'paid'",
    "ALTER TABLE financial_transactions ADD COLUMN origin_module VARCHAR(50) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN origin_id INT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN origin_payment_id INT NULL",
    // ── Receita Saúde receipt control ──
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued_at TIMESTAMP NULL",
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued_by INT NULL",
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_note VARCHAR(255) NULL",
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_file VARCHAR(500) NULL",
    `CREATE TABLE IF NOT EXISTS session_types (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      default_value DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS finance_locked_months (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      month_key VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tenant_month (tenant_id, month_key),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];
  for (const sql of cols) {
    try { await db.query(sql); } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate column') && !e.message.includes('already exists')) console.warn('Finance schema warning:', e.message); }
  }
}
let financeSchemaReady = false;
async function withFinanceSchema() {
  if (!financeSchemaReady) { await ensureFinanceColumns(); financeSchemaReady = true; }
}

// ── Auto-migrate comandas table ──────────────────────────────────────────────
async function ensureSchema() {
  const cols = [
    'ALTER TABLE comandas ADD COLUMN start_date DATETIME NULL',
    'ALTER TABLE comandas ADD COLUMN duration_minutes INT NULL DEFAULT 60',
    'ALTER TABLE comandas ADD COLUMN appointment_id INT NULL',
    'ALTER TABLE comandas ADD COLUMN financial_transaction_id INT NULL',
    'ALTER TABLE comandas ADD COLUMN sessions_total INT NULL DEFAULT 1',
    'ALTER TABLE comandas ADD COLUMN sessions_used INT NULL DEFAULT 0',
    'ALTER TABLE comandas ADD COLUMN total DECIMAL(10,2) NULL',
    'ALTER TABLE comandas ADD COLUMN receipt_code VARCHAR(50) NULL',
    'ALTER TABLE comandas ADD COLUMN paid_value DECIMAL(10,2) NULL DEFAULT 0',
    'ALTER TABLE comandas ADD COLUMN items LONGTEXT NULL',
    'ALTER TABLE comandas ADD COLUMN notes TEXT NULL',
    'ALTER TABLE comandas ADD COLUMN sync_to_livrocaixa TINYINT(1) DEFAULT 0',
    'ALTER TABLE comandas ADD COLUMN livrocaixa_tx_id INT NULL',
    'ALTER TABLE comandas ADD COLUMN livrocaixa_date DATE NULL',
  ];
  for (const sql of cols) {
    try { await db.query(sql); } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate column')) console.warn('Schema Warning:', e.message); }
  }

  // Criar tabela de histórico de pagamentos por comanda
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS comanda_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        comanda_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Pix',
        status VARCHAR(50) DEFAULT 'paid',
        payer_id INT NULL,
        receipt_code VARCHAR(100) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Garantir que status e payer_id existam em comanda_payments
    try { await db.query('ALTER TABLE comanda_payments ADD COLUMN status VARCHAR(50) DEFAULT "paid"'); } catch (e) {}
    try { await db.query('ALTER TABLE comanda_payments ADD COLUMN payer_id INT NULL'); } catch (e) {}
  } catch (e) {
    if (!e.message.includes('already exists')) console.warn('comanda_payments table warning:', e.message);
  }
}
let schemaReady = false;
async function withSchema() {
  if (!schemaReady) { await ensureSchema(); schemaReady = true; }
}

// GET /finance/comandas/:id/payments - Histórico de pagamentos de uma comanda
router.get('/comandas/:id/payments', authMiddleware, async (req, res) => {
  try {
    await withSchema();
    // Busca primeiro de comanda_payments (fonte primária após refatoração)
    const [cpRows] = await db.query(
      `SELECT cp.id, cp.amount, cp.payment_date, cp.payment_method, cp.notes, cp.created_at, cp.status, cp.payer_id,
              t.id as financial_transaction_id, NULL as source, NULL as created_by_name
       FROM comanda_payments cp
       LEFT JOIN financial_transactions t ON (t.origin_payment_id = cp.id AND t.origin_module = 'COMANDA')
       WHERE cp.comanda_id = ? AND cp.tenant_id = ?
       ORDER BY cp.created_at DESC`,
      [req.params.id, req.user.tenant_id]
    );

    // Se não houver registros em comanda_payments, faz fallback para financial_transactions (dados legados)
    if (cpRows.length > 0) {
      return res.json(cpRows);
    }

    const [rows] = await db.query(
      `SELECT t.id, t.amount, t.date as payment_date, t.payment_method, t.observation as notes,
              t.created_at, t.source, u.name as created_by_name
       FROM financial_transactions t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.comanda_id = ? AND t.tenant_id = ? AND t.type = 'income' AND t.status != 'cancelled'
         AND t.id != COALESCE((SELECT livrocaixa_tx_id FROM comandas WHERE id = ? AND tenant_id = ? LIMIT 1), -1)
       ORDER BY t.created_at DESC`,
      [req.params.id, req.user.tenant_id, req.params.id, req.user.tenant_id]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar pagamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// POST /finance/comandas/:id/payments - Registrar novo pagamento
router.post('/comandas/:id/payments', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await withSchema();
    const { amount, payment_date, payment_method, receipt_code, notes, status, payer_id } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const payDate = payment_date || new Date().toISOString().slice(0, 10);
    const payMethod = payment_method || 'Pix';
    const payStatus = status || 'paid';

    // 1. Inserir pagamento individual
    const [result] = await conn.query(
      `INSERT INTO comanda_payments (tenant_id, comanda_id, amount, payment_date, payment_method, status, payer_id, receipt_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenant_id, req.params.id, parseFloat(amount), payDate, payMethod, payStatus, payer_id || null, receipt_code || null, notes || null]
    );
    const paymentId = result.insertId;

    // 2. Buscar dados da comanda
    const [comandaRows] = await conn.query(
      'SELECT total, patient_id, professional_id, sessions_total, sessions_used, sync_to_livrocaixa, livrocaixa_tx_id, description FROM comandas WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (comandaRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Comanda não encontrada' });
    }
    const comanda = comandaRows[0];

    // 3. Calcular paid_value acumulado
    const [payments] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ? AND status != 'cancelled'`,
      [req.params.id, req.user.tenant_id]
    );
    const totalPaid = parseFloat(payments[0].total);

    const comandaTotal = parseFloat(comanda.total || 0);
    const sessionsTotal = parseInt(comanda.sessions_total || 1);
    const sessionsUsed = parseInt(comanda.sessions_used || 0);
    const newStatus = (totalPaid >= comandaTotal && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';

    await conn.query(
      'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [totalPaid, newStatus, req.params.id, req.user.tenant_id]
    );

    // 4. Sincronização com Livro Caixa
    if (comanda.sync_to_livrocaixa) {
      // 4.1 Criar lançamento individual para este pagamento
      const txDescription = `Pagamento Comanda #${req.params.id} - ${comanda.description || 'Consulta'}`;
      
      // Buscar dados do paciente para o lançamento financeiro
      let pName = null, pCpf = null, payName = null, payCpf = null;
      if (comanda.patient_id) {
        const [pRows] = await conn.query('SELECT name, cpf, is_payer, payer_name, payer_cpf FROM patients WHERE id = ?', [comanda.patient_id]);
        if (pRows.length > 0) {
          const p = pRows[0];
          pName = p.name;
          pCpf = p.cpf;
          if (p.is_payer === 0) {
            payName = p.payer_name || p.name;
            payCpf = p.payer_cpf || p.cpf;
          } else {
            payName = p.name;
            payCpf = p.cpf;
          }
        }
      }

      await conn.query(
        `INSERT INTO financial_transactions
           (tenant_id, type, category, description, amount, date, patient_id, payment_method, status, 
            origin_module, origin_id, origin_payment_id, source, payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, created_by)
         VALUES (?, 'income', 'Consulta', ?, ?, ?, ?, ?, ?, 'COMANDA', ?, ?, 'comanda_payment', ?, ?, ?, ?, ?)`,
        [
          req.user.tenant_id, txDescription, parseFloat(amount), payDate, comanda.patient_id || null, payMethod, 
          payStatus === 'paid' ? 'paid' : 'pending',
          req.params.id, paymentId, payName, payCpf, pName, pCpf, req.user.id
        ]
      );

      // 4.2 Atualizar lançamento principal (Previsão do Saldo Devedor)
      const remainingBalance = Math.max(0, comandaTotal - totalPaid);
      const mainTxId = comanda.livrocaixa_tx_id;

      if (mainTxId) {
        if (remainingBalance > 0) {
          await conn.query(
            `UPDATE financial_transactions SET amount = ?, status = 'pending' WHERE id = ? AND tenant_id = ?`,
            [remainingBalance, mainTxId, req.user.tenant_id]
          );
        } else {
          // Se não há mais saldo devedor, podemos ou zerar ou deletar o lançamento de previsão
          // Deletar parece mais limpo para o livro caixa não ficar cheio de zeros
          await conn.query(`DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?`, [mainTxId, req.user.tenant_id]);
          await conn.query(`UPDATE comandas SET livrocaixa_tx_id = NULL WHERE id = ?`, [req.params.id]);
        }
      }
    }

    await conn.commit();
    res.status(201).json({ id: paymentId, amount: parseFloat(amount), payment_date: payDate, payment_method: payMethod, totalPaid, status: newStatus });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
  } finally {
    conn.release();
  }
});

// PUT /finance/comandas/:id/payments/:paymentId - Atualizar pagamento
router.put('/comandas/:id/payments/:paymentId', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await withSchema();
    const { amount, payment_date, payment_method, receipt_code, notes, status, payer_id } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const payDate = payment_date || new Date().toISOString().slice(0, 10);
    const payMethod = payment_method || 'Pix';
    const payStatus = status || 'paid';

    // 1. Atualizar pagamento individual
    await conn.query(
      `UPDATE comanda_payments
       SET amount = ?, payment_date = ?, payment_method = ?, notes = ?, status = ?, payer_id = ?
       WHERE id = ? AND comanda_id = ? AND tenant_id = ?`,
      [parseFloat(amount), payDate, payMethod, notes || null, payStatus, payer_id || null, req.params.paymentId, req.params.id, req.user.tenant_id]
    );

    // 2. Recalcular paid_value
    const [payments] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ? AND status != 'cancelled'`,
      [req.params.id, req.user.tenant_id]
    );
    const totalPaid = parseFloat(payments[0].total);

    const [comandaRows] = await conn.query('SELECT total, sessions_total, sessions_used, sync_to_livrocaixa, livrocaixa_tx_id, description, patient_id FROM comandas WHERE id = ?', [req.params.id]);
    const comanda = comandaRows[0];
    if (!comanda) {
        await conn.rollback();
        return res.status(404).json({ error: 'Comanda não encontrada' });
    }
    
    const comandaTotal = parseFloat(comanda.total || 0);
    const sessionsTotal = parseInt(comanda.sessions_total || 1);
    const sessionsUsed = parseInt(comanda.sessions_used || 0);
    const newStatus = (totalPaid >= comandaTotal && totalPaid > 0 && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';

    await conn.query(
      'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [totalPaid, newStatus, req.params.id, req.user.tenant_id]
    );

    // 3. Atualizar lançamento no livro caixa
    if (comanda.sync_to_livrocaixa) {
      // 3.1 Atualizar o lançamento vinculado a este pagamento
      await conn.query(
        `UPDATE financial_transactions 
         SET amount = ?, date = ?, payment_method = ?, status = ? 
         WHERE origin_module = 'COMANDA' AND origin_payment_id = ? AND tenant_id = ?`,
        [parseFloat(amount), payDate, payMethod, payStatus === 'paid' ? 'paid' : 'pending', req.params.paymentId, req.user.tenant_id]
      );

      // 3.2 Atualizar o lançamento principal (forecast)
      const remainingBalance = Math.max(0, comandaTotal - totalPaid);
      const mainTxId = comanda.livrocaixa_tx_id;

      if (mainTxId) {
        if (remainingBalance > 0) {
          await conn.query(
            `UPDATE financial_transactions SET amount = ?, status = 'pending' WHERE id = ? AND tenant_id = ?`,
            [remainingBalance, mainTxId, req.user.tenant_id]
          );
        } else {
          await conn.query(`DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?`, [mainTxId, req.user.tenant_id]);
          await conn.query(`UPDATE comandas SET livrocaixa_tx_id = NULL WHERE id = ?`, [req.params.id]);
        }
      } else if (remainingBalance > 0) {
        // Se não tinha lançamento principal mas agora tem saldo devedor, cria
        const txDescription = `Saldo Comanda #${req.params.id} - ${comanda.description || 'Consulta'}`;
        const [txResult] = await conn.query(
            `INSERT INTO financial_transactions
               (tenant_id, type, category, description, amount, date, patient_id, payment_method, status, origin_module, origin_id, source, created_by)
             VALUES (?, 'income', 'Consulta', ?, ?, ?, ?, 'Pix', 'pending', 'COMANDA', ?, 'comanda_forecast', ?)`,
            [req.user.tenant_id, txDescription, remainingBalance, comanda.livrocaixa_date || payDate, comanda.patient_id, req.params.id, req.user.id]
        );
        await conn.query('UPDATE comandas SET livrocaixa_tx_id = ? WHERE id = ?', [txResult.insertId, req.params.id]);
      }
    }

    await conn.commit();
    res.json({ success: true, totalPaid, status: newStatus });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao atualizar pagamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  } finally {
    conn.release();
  }
});

// DELETE /finance/comandas/:id/payments/:paymentId - Remover pagamento
router.delete('/comandas/:id/payments/:paymentId', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await withSchema();

    // 1. Excluir o pagamento individual
    await conn.query(
      `DELETE FROM comanda_payments WHERE id = ? AND comanda_id = ? AND tenant_id = ?`,
      [req.params.paymentId, req.params.id, req.user.tenant_id]
    );

    // 2. Excluir o lançamento vinculado no livro caixa
    await conn.query(
      `DELETE FROM financial_transactions 
       WHERE origin_module = 'COMANDA' AND origin_payment_id = ? AND tenant_id = ?`,
      [req.params.paymentId, req.user.tenant_id]
    );

    // 3. Recalcular paid_value
    const [cpPayments] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ? AND status != 'cancelled'`,
      [req.params.id, req.user.tenant_id]
    );
    let totalPaid = parseFloat(cpPayments[0].total);

    const [comandaRows] = await conn.query('SELECT total, sessions_total, sessions_used, sync_to_livrocaixa, livrocaixa_tx_id, description, patient_id, livrocaixa_date FROM comandas WHERE id = ?', [req.params.id]);
    const comanda = comandaRows[0];
    if (!comanda) {
        await conn.rollback();
        return res.status(404).json({ error: 'Comanda não encontrada' });
    }

    const comandaTotal = parseFloat(comanda.total || 0);
    const sessionsTotal = parseInt(comanda.sessions_total || 1);
    const sessionsUsed = parseInt(comanda.sessions_used || 0);
    const newStatus = (totalPaid >= comandaTotal && totalPaid > 0 && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';

    await conn.query(
      'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [totalPaid, newStatus, req.params.id, req.user.tenant_id]
    );

    // 4. Atualizar lançamento principal (forecast)
    if (comanda.sync_to_livrocaixa) {
      const remainingBalance = Math.max(0, comandaTotal - totalPaid);
      const mainTxId = comanda.livrocaixa_tx_id;

      if (mainTxId) {
        if (remainingBalance > 0) {
          await conn.query(
            `UPDATE financial_transactions SET amount = ?, status = 'pending' WHERE id = ? AND tenant_id = ?`,
            [remainingBalance, mainTxId, req.user.tenant_id]
          );
        } else {
          await conn.query(`DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?`, [mainTxId, req.user.tenant_id]);
          await conn.query(`UPDATE comandas SET livrocaixa_tx_id = NULL WHERE id = ?`, [req.params.id]);
        }
      } else if (remainingBalance > 0) {
        // Criar previsão se não houver
        const txDescription = `Saldo Comanda #${req.params.id} - ${comanda.description || 'Consulta'}`;
        const [txResult] = await conn.query(
            `INSERT INTO financial_transactions
               (tenant_id, type, category, description, amount, date, patient_id, payment_method, status, origin_module, origin_id, source, created_by)
             VALUES (?, 'income', 'Consulta', ?, ?, ?, ?, 'Pix', 'pending', 'COMANDA', ?, 'comanda_forecast', ?)`,
            [req.user.tenant_id, txDescription, remainingBalance, comanda.livrocaixa_date || new Date().toISOString().slice(0, 10), comanda.patient_id, req.params.id, req.user.id]
        );
        await conn.query('UPDATE comandas SET livrocaixa_tx_id = ? WHERE id = ?', [txResult.insertId, req.params.id]);
      }
    }

    await conn.commit();
    res.json({ success: true, totalPaid });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao remover pagamento:', err);
    res.status(500).json({ error: 'Erro ao remover pagamento' });
  } finally {
    conn.release();
  }
});

// GET /finance - Transações com filtros
router.get('/', authMiddleware, checkPermission('view_financial_reports'), async (req, res) => {
  try {
    await withFinanceSchema();
    const { start, end, type, category, comanda_id } = req.query;

    let query = `
      SELECT t.*, p.name as patient_name,
             COALESCE(t.comanda_id, t.origin_id, c.id) as comanda_id,
             c.total as comanda_total, c.paid_value as comanda_paid_value, c.status as comanda_status,
             t.rs_receipt_issued, t.rs_receipt_issued_at, t.rs_receipt_issued_by, t.rs_receipt_note, t.rs_receipt_file
      FROM financial_transactions t
      LEFT JOIN patients p ON p.id = t.patient_id
      LEFT JOIN comandas c ON (c.id = t.comanda_id OR c.id = t.origin_id OR c.livrocaixa_tx_id = t.id)
      WHERE t.tenant_id = ?
        AND (
          t.origin_module IS NOT NULL
          OR t.comanda_id IS NULL
          OR c.livrocaixa_tx_id = t.id
          OR t.source = 'livrocaixa'
        )
    `;
    const params = [req.user.tenant_id];

    if (type) { query += ' AND t.type = ?'; params.push(type); }
    if (category) { query += ' AND t.category = ?'; params.push(category); }
    if (start) { query += ' AND t.date >= ?'; params.push(start); }
    if (end) { query += ' AND t.date <= ?'; params.push(end); }
    if (comanda_id) { query += ' AND (t.comanda_id = ? OR t.origin_id = ?)'; params.push(comanda_id, comanda_id); }

    // Ordenação conforme regra do Livro Caixa:
    // 1. payment_date (t.date) quando houver
    // 2. due_date
    // 3. created_at como desempate
    query += ' ORDER BY COALESCE(t.date, t.due_date, t.created_at) DESC, t.id DESC';

    const [transactions] = await db.query(query, params);
    res.json(transactions);
  } catch (err) {
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações', details: err.message });
  }
});

// GET /finance/summary - Resumo financeiro
router.get('/summary', authMiddleware, checkPermission('view_financial_reports'), async (req, res) => {
  try {
    const { month, year } = req.query;

    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();

    const [incomeData] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN t.status IN ('paid', 'confirmed') THEN t.amount ELSE 0 END), 0) as paid,
         COALESCE(SUM(CASE WHEN t.status IN ('pending', 'waiting', 'overdue') THEN t.amount ELSE 0 END), 0) as pending
        FROM financial_transactions t
        LEFT JOIN comandas c ON c.livrocaixa_tx_id = t.id
        WHERE t.tenant_id = ? AND t.type = 'income' 
          AND (t.comanda_id IS NULL OR c.livrocaixa_tx_id = t.id)
          AND MONTH(t.date) = ? AND YEAR(t.date) = ?`,
       [req.user.tenant_id, m, y]
    );

    const [expenseData] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN t.status IN ('paid', 'confirmed') THEN t.amount ELSE 0 END), 0) as paid,
         COALESCE(SUM(CASE WHEN t.status IN ('pending', 'waiting', 'overdue') THEN t.amount ELSE 0 END), 0) as pending
        FROM financial_transactions t
        LEFT JOIN comandas c ON c.livrocaixa_tx_id = t.id
        WHERE t.tenant_id = ? AND t.type = 'expense' 
          AND (t.comanda_id IS NULL OR c.livrocaixa_tx_id = t.id)
          AND MONTH(t.date) = ? AND YEAR(t.date) = ?`,
       [req.user.tenant_id, m, y]
    );

    const [counts] = await db.query(
       `SELECT COUNT(*) as total FROM financial_transactions t
        LEFT JOIN comandas c ON c.livrocaixa_tx_id = t.id
        WHERE t.tenant_id = ? 
          AND (t.comanda_id IS NULL OR c.livrocaixa_tx_id = t.id)
          AND MONTH(t.date) = ? AND YEAR(t.date) = ?`,
       [req.user.tenant_id, m, y]
    );

    const totalIncome = parseFloat(incomeData[0].paid);
    const totalExpense = parseFloat(expenseData[0].paid);
    const pendingIncome = parseFloat(incomeData[0].pending);
    const pendingExpense = parseFloat(expenseData[0].pending);
    const totalCount = counts[0].total;

    res.json({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      pending: pendingIncome - pendingExpense,
      count: totalCount,
      month: m,
      year: y,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

// GET /finance/locked-months - Listar meses fechados
router.get('/locked-months', authMiddleware, async (req, res) => {
  try {
    await withFinanceSchema();
    const [rows] = await db.query(
      'SELECT month_key FROM finance_locked_months WHERE tenant_id = ?',
      [req.user.tenant_id]
    );
    res.json(rows.map(r => r.month_key));
  } catch (err) {
    console.error('Erro ao buscar meses fechados:', err);
    res.status(500).json({ error: 'Erro ao buscar meses fechados' });
  }
});

// POST /finance/locked-months/toggle - Alternar fechamento de mês
router.post('/locked-months/toggle', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    await withFinanceSchema();
    const { month_key } = req.body;
    if (!month_key) return res.status(400).json({ error: 'Chave do mês é obrigatória' });

    const [existing] = await db.query(
      'SELECT id FROM finance_locked_months WHERE tenant_id = ? AND month_key = ?',
      [req.user.tenant_id, month_key]
    );

    if (existing.length > 0) {
      await db.query(
        'DELETE FROM finance_locked_months WHERE tenant_id = ? AND month_key = ?',
        [req.user.tenant_id, month_key]
      );
      res.json({ locked: false, month_key });
    } else {
      await db.query(
        'INSERT INTO finance_locked_months (tenant_id, month_key) VALUES (?, ?)',
        [req.user.tenant_id, month_key]
      );
      res.json({ locked: true, month_key });
    }
  } catch (err) {
    console.error('Erro ao alternar fechamento de mês:', err);
    res.status(500).json({ error: 'Erro ao alternar fechamento de mês' });
  }
});

// POST /finance
router.post('/', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    await withFinanceSchema();
    const {
      type, category, description, amount, date,
      patient_id, appointment_id, payment_method, status,
      payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation, comanda_id
    } = req.body;

    if (!type || !amount || !date) {
      return res.status(400).json({ error: 'Tipo, valor e data são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, category, description, amount, date, patient_id, appointment_id, payment_method, status,
         payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation, comanda_id, due_date, created_by, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, type, category || null, description || null,
        amount, date, patient_id || null, appointment_id || null,
        payment_method || null, status || 'paid',
        payer_name || null, beneficiary_name || null, payer_cpf || null, beneficiary_cpf || null, observation || null,
        comanda_id || null, req.body.due_date || null, req.user.id, req.body.source || 'direct'
      ]
    );

    // Se vinculado a uma comanda, seta livrocaixa_tx_id e recalcula paid_value
    if (comanda_id && type === 'income') {
      const txId = result.insertId;

      // Verifica se a comanda já tem livrocaixa_tx_id; se não, seta este lançamento
      const [cmdCheck] = await db.query(
        'SELECT livrocaixa_tx_id, total, sessions_total, sessions_used, sync_to_livrocaixa FROM comandas WHERE id = ? AND tenant_id = ?',
        [comanda_id, req.user.tenant_id]
      );
      if (cmdCheck.length > 0 && !cmdCheck[0].livrocaixa_tx_id) {
        await db.query(
          'UPDATE comandas SET livrocaixa_tx_id = ?, sync_to_livrocaixa = 1 WHERE id = ? AND tenant_id = ?',
          [txId, comanda_id, req.user.tenant_id]
        );
      }

      // Recalcula paid_value: soma comanda_payments + financial_transactions legados (sem origin_payment_id)
      const [sumRes] = await db.query(
        `SELECT (
          SELECT COALESCE(SUM(amount), 0) FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?
        ) + (
          SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
          WHERE comanda_id = ? AND origin_payment_id IS NULL AND type = 'income' AND status != 'cancelled' AND tenant_id = ?
        ) as total`,
        [comanda_id, req.user.tenant_id, comanda_id, req.user.tenant_id]
      );
      const totalPaid = parseFloat(sumRes[0].total);

      if (cmdCheck.length > 0) {
        const comandaTotal = parseFloat(cmdCheck[0].total || 0);
        const sessionsTotal = parseInt(cmdCheck[0].sessions_total || 1);
        const sessionsUsed = parseInt(cmdCheck[0].sessions_used || 0);
        const newStatus = (totalPaid >= comandaTotal && totalPaid > 0 && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';
        await db.query(
          'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
          [totalPaid, newStatus, comanda_id, req.user.tenant_id]
        );
      }
    }

    const [tx] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(tx[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// PUT /finance/:id
router.put('/:id', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const { 
      type, category, description, amount, date, payment_method, status,
      payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation, comanda_id
    } = req.body;

    const [existing] = await db.query('SELECT comanda_id FROM financial_transactions WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    const oldComandaId = existing[0]?.comanda_id;
    const newComandaId = comanda_id !== undefined ? comanda_id : oldComandaId;

    await db.query(
      `UPDATE financial_transactions SET
        type = COALESCE(?, type),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        payment_method = COALESCE(?, payment_method),
        status = COALESCE(?, status),
        payer_name = COALESCE(?, payer_name),
        beneficiary_name = COALESCE(?, beneficiary_name),
        payer_cpf = COALESCE(?, payer_cpf),
        beneficiary_cpf = COALESCE(?, beneficiary_cpf),
        observation = COALESCE(?, observation),
        due_date = ?,
        comanda_id = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        type, category, description, amount, date, payment_method, status,
        payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation,
        req.body.due_date,
        newComandaId,
        req.params.id, req.user.tenant_id
      ]
    );

    const updateComanda = async (cid, txId) => {
      let finalCid = cid;
      if (!finalCid) {
        const [linkedCmd] = await db.query('SELECT id FROM comandas WHERE livrocaixa_tx_id = ? AND tenant_id = ?', [txId || req.params.id, req.user.tenant_id]);
        if (linkedCmd.length > 0) finalCid = linkedCmd[0].id;
      }
      if (!finalCid) return;

      // Seta livrocaixa_tx_id se a comanda ainda não tem
      const [cmdCheck] = await db.query(
        'SELECT livrocaixa_tx_id, total, sessions_total, sessions_used FROM comandas WHERE id = ? AND tenant_id = ?',
        [finalCid, req.user.tenant_id]
      );
      if (cmdCheck.length > 0 && !cmdCheck[0].livrocaixa_tx_id && txId) {
        await db.query(
          'UPDATE comandas SET livrocaixa_tx_id = ?, sync_to_livrocaixa = 1 WHERE id = ? AND tenant_id = ?',
          [txId, finalCid, req.user.tenant_id]
        );
      }

      // Recalcula paid_value: comanda_payments + financial_transactions legados (sem origin_payment_id)
      const [sumRes] = await db.query(
        `SELECT (
          SELECT COALESCE(SUM(amount), 0) FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?
        ) + (
          SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
          WHERE comanda_id = ? AND origin_payment_id IS NULL AND type = 'income' AND status != 'cancelled' AND tenant_id = ?
        ) as total`,
        [finalCid, req.user.tenant_id, finalCid, req.user.tenant_id]
      );
      const totalPaid = parseFloat(sumRes[0].total);

      const rowData = cmdCheck.length > 0 ? cmdCheck[0] : null;
      if (rowData) {
        const comandaTotal = parseFloat(rowData.total || 0);
        const sessionsTotal = parseInt(rowData.sessions_total || 1);
        const sessionsUsed = parseInt(rowData.sessions_used || 0);
        const newStatus = (totalPaid >= comandaTotal && totalPaid > 0 && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';
        await db.query('UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?', [totalPaid, newStatus, finalCid, req.user.tenant_id]);
      }
    };

    if (oldComandaId && oldComandaId !== newComandaId) await updateComanda(oldComandaId, null);
    if (newComandaId) await updateComanda(newComandaId, parseInt(req.params.id));

    const [updated] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// DELETE /finance/month/:year/:month - Deletar todos os lançamentos de um mês
router.delete('/month/:year/:month', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end   = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    const [result] = await db.query(
      'DELETE FROM financial_transactions WHERE tenant_id = ? AND date >= ? AND date <= ?',
      [req.user.tenant_id, start, end]
    );
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar lançamentos do mês' });
  }
});

// DELETE /finance/:id
router.delete('/:id', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const [existing] = await db.query('SELECT comanda_id FROM financial_transactions WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    const comandaId = existing[0]?.comanda_id;

    const [result] = await db.query(
      'DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Transação não encontrada' });

    let finalCid = comandaId;
    if (!finalCid) {
      const [linkedCmd] = await db.query('SELECT id FROM comandas WHERE livrocaixa_tx_id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
      if (linkedCmd.length > 0) finalCid = linkedCmd[0].id;
    }

    if (finalCid) {
      const [sumRes] = await db.query(
        `SELECT (
          SELECT COALESCE(SUM(amount), 0) FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?
        ) + (
          SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
          WHERE comanda_id = ? AND origin_payment_id IS NULL AND type = 'income' AND status != 'cancelled' AND tenant_id = ?
        ) as total`,
        [finalCid, req.user.tenant_id, finalCid, req.user.tenant_id]
      );
      const totalPaid = parseFloat(sumRes[0].total);
      
      const [comandaRow] = await db.query('SELECT total, sessions_total, sessions_used FROM comandas WHERE id = ? AND tenant_id = ?', [finalCid, req.user.tenant_id]);
      if (comandaRow.length > 0) {
        const comandaTotal = parseFloat(comandaRow[0].total || 0);
        const sessionsTotal = parseInt(comandaRow[0].sessions_total || 1);
        const sessionsUsed = parseInt(comandaRow[0].sessions_used || 0);
        const newStatus = (totalPaid >= comandaTotal && totalPaid > 0 && sessionsUsed >= sessionsTotal) ? 'closed' : 'open';
        await db.query('UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?', [totalPaid, newStatus, finalCid, req.user.tenant_id]);
      }
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar transação' });
  }
});

// POST /finance/repeat/:id - Duplicar para o próximo mês
router.post('/repeat/:id', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const original = rows[0];
    const dt = new Date(original.date);
    dt.setMonth(dt.getMonth() + 1);
    
    const nextMonthDate = dt.toISOString().split('T')[0];

    const [result] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, category, description, amount, date, patient_id, payment_method, status, 
         payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        original.tenant_id, original.type, original.category, original.description, original.amount, 
        nextMonthDate, original.patient_id, original.payment_method, 'pending',
        original.payer_name, original.beneficiary_name, original.payer_cpf, original.beneficiary_cpf, original.observation,
        original.due_date
      ]
    );

    const [newTx] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(newTx[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao repetir lançamento' });
  }
});

// GET /finance/:id/package-sessions - Sessões realizadas do pacote vinculado ao lançamento
router.get('/:id/package-sessions', authMiddleware, async (req, res) => {
  try {
    await withFinanceSchema();
    const tid = req.user.tenant_id;
    const { id } = req.params;

    // Busca o lançamento e o comanda_id vinculado
    const [txRows] = await db.query(
      `SELECT t.id, t.type, t.category, t.patient_id, t.comanda_id,
              COALESCE(c2.id, t.comanda_id) as resolved_comanda_id,
              c2.sessions_total, c2.sessions_used, c2.description as comanda_description,
              c2.patient_id as comanda_patient_id
       FROM financial_transactions t
       LEFT JOIN comandas c ON c.livrocaixa_tx_id = t.id
       LEFT JOIN comandas c2 ON c2.id = COALESCE(t.comanda_id, c.id)
       WHERE t.id = ? AND t.tenant_id = ?`,
      [id, tid]
    );

    if (!txRows.length) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const tx = txRows[0];
    const comandaId = tx.resolved_comanda_id;

    if (!comandaId) {
      return res.json({ eligible: false, reason: 'no_comanda' });
    }

    // Categoria elegível para pacote de sessões
    const PKG_CATEGORIES = ['Pacote de Sessões', 'Sessão Individual', 'Geral', 'Avaliação'];
    if (tx.type !== 'income' || !PKG_CATEGORIES.includes(tx.category)) {
      return res.json({ eligible: false, reason: 'not_package' });
    }

    // Busca agendamentos vinculados a esta comanda
    const [appointments] = await db.query(
      `SELECT a.id, a.start_time, a.status, a.notes, a.modality,
              u.name as professional_name
       FROM appointments a
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.comanda_id = ? AND a.tenant_id = ?
       ORDER BY a.start_time ASC`,
      [comandaId, tid]
    );

    const completed   = appointments.filter(a => a.status === 'completed');
    const upcoming    = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status));
    const noShow      = appointments.filter(a => a.status === 'no_show');
    const cancelled   = appointments.filter(a => a.status === 'cancelled');

    const fmt = (a) => ({
      id: a.id,
      date: a.start_time ? new Date(a.start_time).toISOString().split('T')[0] : null,
      time: a.start_time ? new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null,
      status: a.status,
      notes: a.notes || null,
      modality: a.modality || null,
      professional_name: a.professional_name || null,
    });

    res.json({
      eligible: true,
      comanda: {
        id: comandaId,
        description: tx.comanda_description || null,
        sessions_total: tx.sessions_total || null,
        sessions_used: tx.sessions_used || null,
      },
      completed:  completed.map(fmt),
      upcoming:   upcoming.map(fmt),
      no_show:    noShow.map(fmt),
      cancelled:  cancelled.map(fmt),
    });
  } catch (err) {
    console.error('Erro ao buscar sessões do pacote:', err);
    res.status(500).json({ error: 'Erro ao buscar sessões do pacote' });
  }
});

// PATCH /finance/:id/rs-receipt - Marca/desmarca recibo Receita Saúde
router.patch('/:id/rs-receipt', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    await withFinanceSchema();
    const tid = req.user.tenant_id;
    const { id } = req.params;
    const { issued, note } = req.body;

    const [rows] = await db.query(
      'SELECT id, type, patient_id, rs_receipt_file FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const tx = rows[0];
    if (tx.type !== 'income' || !tx.patient_id) {
      return res.status(400).json({ error: 'Este lançamento não é elegível para recibo Receita Saúde' });
    }

    const issuedBool = issued ? 1 : 0;
    const issuedAt   = issued ? new Date() : null;
    const issuedBy   = issued ? (req.user.id || null) : null;
    const receiptNote = note || null;

    // Se desmarcando, remove arquivo se existir
    let fileToKeep = tx.rs_receipt_file;
    if (!issued && tx.rs_receipt_file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/uploads', tx.rs_receipt_file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fileToKeep = null;
    }

    await db.query(
      `UPDATE financial_transactions
         SET rs_receipt_issued = ?, rs_receipt_issued_at = ?, rs_receipt_issued_by = ?, rs_receipt_note = ?, rs_receipt_file = ?
       WHERE id = ? AND tenant_id = ?`,
      [issuedBool, issuedAt, issuedBy, receiptNote, fileToKeep, id, tid]
    );

    const [updated] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao atualizar recibo RS:', err);
    res.status(500).json({ error: 'Erro ao atualizar status do recibo' });
  }
});

// POST /finance/:id/rs-receipt/upload - Upload do arquivo do recibo
router.post('/:id/rs-receipt/upload', authMiddleware, checkPermission('manage_payments'), uploadMemory.single('file'), async (req, res) => {
  try {
    await withFinanceSchema();
    const { id } = req.params;
    const tid = req.user.tenant_id;

    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const [rows] = await db.query(
      'SELECT id, rs_receipt_file FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Remove arquivo anterior se existir
    if (rows[0].rs_receipt_file) {
      const oldPath = path.join(uploadDir, rows[0].rs_receipt_file);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const ext = req.file.originalname.split('.').pop() || 'pdf';
    const filename = `rs_receipt_${id}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);

    await db.query(
      'UPDATE financial_transactions SET rs_receipt_file = ? WHERE id = ? AND tenant_id = ?',
      [filename, id, tid]
    );

    const [updated] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao fazer upload do recibo:', err);
    res.status(500).json({ error: 'Erro ao fazer upload do recibo' });
  }
});

// DELETE /finance/:id/rs-receipt/file - Remove arquivo do recibo
router.delete('/:id/rs-receipt/file', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    await withFinanceSchema();
    const { id } = req.params;
    const tid = req.user.tenant_id;

    const [rows] = await db.query(
      'SELECT rs_receipt_file FROM financial_transactions WHERE id = ? AND tenant_id = ?',
      [id, tid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lançamento não encontrado' });

    if (rows[0].rs_receipt_file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../public/uploads', rows[0].rs_receipt_file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query(
      'UPDATE financial_transactions SET rs_receipt_file = NULL WHERE id = ? AND tenant_id = ?',
      [id, tid]
    );

    const [updated] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao remover arquivo do recibo:', err);
    res.status(500).json({ error: 'Erro ao remover arquivo do recibo' });
  }
});

// ── Session Types ────────────────────────────────────────────────────────────
router.get('/session-types', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM session_types WHERE tenant_id = ? ORDER BY name ASC', [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tipos de sessão' });
  }
});

router.post('/session-types', async (req, res) => {
  try {
    const { id, name, default_value } = req.body;
    const finalId = id || uuidv4();
    await db.query(
      'REPLACE INTO session_types (id, tenant_id, name, default_value) VALUES (?, ?, ?, ?)',
      [finalId, req.user.tenant_id, name, default_value]
    );
    res.json({ id: finalId, name, default_value });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar tipo de sessão' });
  }
});

router.delete('/session-types/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM session_types WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar tipo de sessão' });
  }
});

// GET /finance/comandas
router.get('/comandas', authMiddleware, async (req, res) => {
  try {
    await withSchema();
    await withFinanceSchema();
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
    
    // Processamento rico
    for (const c of comandas) {
      try {
        // IDs inconsistentes no frontend vs backend (totalValue vs total)
        c.totalValue = c.total;
        
        // Atendimentos vinculados
        const [aptData] = await db.query(
          `SELECT id, start_time, status, notes FROM appointments
           WHERE comanda_id = ? ORDER BY start_time ASC`,
          [c.id]
        );
        c.appointments = aptData;

        // Histórico de sessões (contagem)
        const usedCount = aptData.filter(a =>
            ['confirmed', 'completed', 'no_show'].includes(a.status)
        ).length;
        
        c.sessions_used = usedCount;
        
        // Pagamentos vinculados — fonte primária: comanda_payments
        const [cpData] = await db.query(
          `SELECT cp.id, cp.amount, cp.payment_date, cp.payment_method, cp.notes, cp.receipt_code, cp.status, cp.payer_id,
                  t.id as financial_transaction_id
           FROM comanda_payments cp
           LEFT JOIN financial_transactions t ON (t.origin_payment_id = cp.id AND t.origin_module = 'COMANDA')
           WHERE cp.comanda_id = ? AND cp.tenant_id = ?
           ORDER BY cp.created_at DESC`,
          [c.id, req.user.tenant_id]
        );

        if (cpData.length > 0) {
          c.payments = cpData;
        } else {
          // Fallback: dados legados em financial_transactions
          const [pymtData] = await db.query(
            `SELECT id, amount, date as payment_date, payment_method, observation as notes, receipt_code, status
             FROM financial_transactions
             WHERE comanda_id = ? AND tenant_id = ? AND type = 'income' AND status != 'cancelled'
             ORDER BY date DESC, created_at DESC`,
            [c.id, req.user.tenant_id]
          );
          c.payments = pymtData;
        }
        c.paidValue = parseFloat(c.paid_value || 0);

        // Sincroniza sessions_used no banco
        await db.query('UPDATE comandas SET sessions_used = ? WHERE id = ?', [c.sessions_used, c.id]);
        
        // Parse Items
        if (typeof c.items === 'string') {
          try { c.items = JSON.parse(c.items); } catch { c.items = []; }
        }
      } catch (err) {
        c.items = [];
        console.error('Erro ao processar comanda:', err.message);
      }
    }
    res.json(comandas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar comandas', details: err.message });
  }
});

// GET /finance/comandas/patient/:patientId - Busca comandas abertas de um paciente específico
router.get('/comandas/patient/:patientId', authMiddleware, async (req, res) => {
    try {
        await withSchema();
        const { patientId } = req.params;
        const [comandas] = await db.query(
            `SELECT c.*, p.name as patient_name, u.name as professional_name
             FROM comandas c 
             LEFT JOIN patients p ON p.id = c.patient_id
             LEFT JOIN users u ON u.id = c.professional_id
             WHERE c.tenant_id = ? AND c.patient_id = ? AND c.status = 'open'
             ORDER BY c.created_at DESC`,
            [req.user.tenant_id, patientId]
        );

        for (const c of comandas) {
            try {
                const [aptData] = await db.query(
                    'SELECT id, start_time, status FROM appointments WHERE comanda_id = ?',
                    [c.id]
                );
                
                const usedCount = aptData.filter(a => 
                    ['confirmed', 'completed', 'no-show'].includes(a.status)
                ).length;
                
                c.sessions_used = usedCount;
                const [pymtData] = await db.query(
                    `SELECT id, amount, date as payment_date, payment_method, observation as notes, receipt_code
                     FROM financial_transactions 
                     WHERE comanda_id = ? AND tenant_id = ? AND type = 'income' AND status != 'cancelled'
                     ORDER BY date DESC, created_at DESC`,
                    [c.id, req.user.tenant_id]
                );
                c.payments = pymtData;
                c.paidValue = parseFloat(c.paid_value || 0);

                if (typeof c.items === 'string') {
                    try { c.items = JSON.parse(c.items); } catch { c.items = []; }
                }
            } catch (err) {
                c.items = [];
            }
        }
        res.json(comandas);
    } catch (err) {
        console.error('Erro ao buscar comandas do paciente:', err);
        res.status(500).json({ error: 'Erro ao buscar comandas do paciente', details: err.message });
    }
});

// POST /finance/comandas/parse-xlsx - Lê XLSX e retorna linhas parseadas
router.post('/comandas/parse-xlsx', uploadMemory.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // primeira linha = cabeçalho, ignorar
    const parseMoney = (s) => parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    const fmtDate = (v) => {
      if (!v) return '';
      if (v instanceof Date) return v.toLocaleDateString('pt-BR');
      return String(v);
    };

    const rows = raw.slice(1).map(cols => {
      const sessStr = String(cols[3] || '');
      const sessMatch = sessStr.match(/(\d+)\s+de\s+(\d+)/i);
      return {
        description:    String(cols[0] || '').trim(),
        client_name:    String(cols[1] || '').trim(),
        date:           fmtDate(cols[2]),
        sessions_used:  sessMatch ? parseInt(sessMatch[1]) : 0,
        sessions_total: sessMatch ? parseInt(sessMatch[2]) : 1,
        total:          parseMoney(cols[4]),
        paid:           parseMoney(cols[5]),
      };
    }).filter(r => r.client_name);

    res.json({ rows });
  } catch (err) {
    console.error('Erro ao parsear XLSX:', err);
    res.status(500).json({ error: 'Erro ao ler arquivo', details: err.message });
  }
});

// POST /finance/comandas/export-xlsx - Gera planilha formatada
router.post('/comandas/export-xlsx', async (req, res) => {
  try {
    const { rows = [], filterLabel = 'Comandas' } = req.body;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PsiFlux';
    const ws = wb.addWorksheet('Comandas');

    // Larguras das colunas
    ws.columns = [
      { header: 'ID',             key: 'id',          width: 8  },
      { header: 'Descrição',      key: 'desc',        width: 22 },
      { header: 'Paciente',       key: 'patient',     width: 32 },
      { header: 'Data',           key: 'date',        width: 14 },
      { header: 'N. Atendimentos',key: 'sessions',    width: 20 },
      { header: 'Total',          key: 'total',       width: 14 },
      { header: 'Recebido',       key: 'paid',        width: 14 },
      { header: 'Pendente',       key: 'pending',     width: 14 },
      { header: 'Status',         key: 'status',      width: 14 },
    ];

    // Estilo do cabeçalho
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } };
    });
    headerRow.height = 26;

    const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; } catch { return '-'; } };
    const moneyFmt = '#,##0.00';

    rows.forEach((r, i) => {
      const row = ws.addRow({
        id:       r.id,
        desc:     r.description || '',
        patient:  r.client_name || '',
        date:     fmtDate(r.date),
        sessions: `${r.sessions_used} de ${r.sessions_total} atendimentos`,
        total:    parseFloat(r.total) || 0,
        paid:     parseFloat(r.paid)  || 0,
        pending:  parseFloat(r.pending) || 0,
        status:   r.status || '',
      });

      const bg = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle' };
      });

      // Moeda
      ['F', 'G', 'H'].forEach(col => {
        const cell = row.getCell(col);
        cell.numFmt = `"R$ "${moneyFmt}`;
        cell.alignment = { horizontal: 'right' };
      });

      // Status colorido
      const statusCell = row.getCell('I');
      statusCell.alignment = { horizontal: 'center' };
      if (r.status === 'Finalizada') {
        statusCell.font = { color: { argb: 'FF059669' }, bold: true, size: 10 };
      } else {
        statusCell.font = { color: { argb: 'FFD97706' }, bold: true, size: 10 };
      }
    });

    // Linha de totais
    if (rows.length > 0) {
      ws.addRow({});
      const totRow = ws.addRow({
        desc:    'TOTAL',
        total:   rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0),
        paid:    rows.reduce((s, r) => s + (parseFloat(r.paid)  || 0), 0),
        pending: rows.reduce((s, r) => s + (parseFloat(r.pending) || 0), 0),
      });
      totRow.eachCell(cell => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      });
      ['F', 'G', 'H'].forEach(col => { totRow.getCell(col).numFmt = `"R$ "${moneyFmt}`; });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="comandas_${filterLabel}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Erro ao exportar XLSX:', err);
    res.status(500).json({ error: 'Erro ao gerar Excel', details: err.message });
  }
});

// POST /finance/comandas/import - Importação em lote via CSV
router.post('/comandas/import', authMiddleware, checkPermission('manage_payments'), async (req, res) => {
  try {
    await withSchema();
    const { rows } = req.body; // [{ description, client_name, date, sessions_used, sessions_total, total, paid }]
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Nenhuma linha para importar' });
    }

    const tenantId = req.user.tenant_id;
    const results = { created: 0, errors: [] };

    for (const row of rows) {
      try {
        const { description, client_name, date, sessions_used, sessions_total, total, paid } = row;
        const sessUsed = parseInt(sessions_used) || 0;
        const sessTotal = parseInt(sessions_total) || 1;
        const totalVal = parseFloat(total) || 0;
        const paidVal = parseFloat(paid) || 0;
        const statusVal = sessUsed >= sessTotal ? 'closed' : 'open';

        // Normaliza a data para YYYY-MM-DD
        let parsedDate = null;
        if (date) {
          const parts = String(date).split('/');
          if (parts.length === 3) {
            parsedDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          } else {
            parsedDate = date;
          }
        }

        // Busca ou cria paciente pelo nome
        let patientId = null;
        if (client_name) {
          const name = String(client_name).trim();
          const [found] = await db.query(
            'SELECT id FROM patients WHERE tenant_id = ? AND name = ? LIMIT 1',
            [tenantId, name]
          );
          if (found.length > 0) {
            patientId = found[0].id;
          } else {
            const [ins] = await db.query(
              'INSERT INTO patients (tenant_id, name, status) VALUES (?, ?, ?)',
              [tenantId, name, 'active']
            );
            patientId = ins.insertId;
          }
        }

        const items = JSON.stringify([{ name: description || 'Importado', qty: sessTotal, price: sessTotal > 0 ? totalVal / sessTotal : totalVal }]);

        const [cmdResult] = await db.query(
          `INSERT INTO comandas
             (tenant_id, patient_id, description, total, paid_value, items, start_date,
              status, discount_type, discount_value, total_net, sessions_total, sessions_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'fixed', 0, ?, ?, ?)`,
          [tenantId, patientId, description || 'Importado', totalVal, paidVal, items,
           parsedDate, statusVal, totalVal, sessTotal, sessUsed]
        );
        const comandaId = cmdResult.insertId;

        // Se há valor pago, cria pagamento e lançamento financeiro
        if (paidVal > 0) {
          const [payResult] = await db.query(
            `INSERT INTO comanda_payments (tenant_id, comanda_id, amount, payment_date, payment_method, status, notes)
             VALUES (?, ?, ?, ?, 'Importado', 'paid', 'Importado via planilha')`,
            [tenantId, comandaId, paidVal, parsedDate || new Date().toISOString().slice(0,10)]
          );
          await db.query(
            `INSERT INTO financial_transactions
               (tenant_id, type, category, description, amount, date, patient_id, origin_id, origin_payment_id, origin_module, payment_method, status, source)
             VALUES (?, 'income', 'Consulta', ?, ?, ?, ?, ?, ?, 'COMANDA', 'Importado', 'paid', 'comanda_payment')`,
            [tenantId, `Pagamento comanda importada - ${client_name}`,
             paidVal,
             parsedDate || new Date().toISOString().slice(0,10),
             patientId, comandaId, payResult.insertId]
          );
        }

        // Se houver saldo devedor e sync ativo, criar previsão
        const remaining = totalVal - paidVal;
        if (remaining > 0) {
            const [txRes] = await db.query(
                `INSERT INTO financial_transactions
                   (tenant_id, type, category, description, amount, date, patient_id, origin_id, origin_module, payment_method, status, source)
                 VALUES (?, 'income', 'Consulta', ?, ?, ?, ?, ?, 'COMANDA', 'Importado', 'pending', 'comanda_forecast')`,
                [tenantId, `Saldo comanda importada - ${client_name}`, remaining, parsedDate || new Date().toISOString().slice(0,10), patientId, comandaId]
            );
            await db.query('UPDATE comandas SET livrocaixa_tx_id = ? WHERE id = ?', [txRes.insertId, comandaId]);
        }

        results.created++;
      } catch (rowErr) {
        results.errors.push({ row: row.client_name || '?', error: rowErr.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Erro ao importar comandas:', err);
    res.status(500).json({ error: 'Erro ao importar comandas', details: err.message });
  }
});

// POST /finance/comandas
router.post('/comandas', async (req, res) => {
  try {
    await withSchema();
    const {
      patient_id, professional_id, items, notes,
      payment_method, discount, start_date, duration_minutes, receipt_code,
      discount_type, discount_value, sessions_total, package_id, sync_to_livrocaixa,
      total_value, gross_total_value, paid_value: bodyPaidValue, livrocaixa_date
    } = req.body;

    const itemsArr = items || [];
    const subtotal = itemsArr.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.qty || 1)), 0);
    const dType = discount_type || 'fixed';
    const dValue = parseFloat(discount_value || 0);

    let total = subtotal;
    if (dType === 'percentage') {
       total = subtotal - (subtotal * (dValue / 100));
    } else {
       total = subtotal - dValue;
    }
    total = Math.max(0, total);

    // Se o cálculo por items resultou em 0 mas o frontend enviou total_value, usa-o como fallback
    if (total === 0 && total_value && Number(total_value) > 0) {
      total = Number(total_value);
    }

    // Sessions count calculation from items if sessions_total not explicitly provided
    const sessions_from_items = itemsArr.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);

    const syncLC = sync_to_livrocaixa ? 1 : 0;

    const lcDate = livrocaixa_date || start_date || new Date().toISOString().slice(0, 10);

    const [result] = await db.query(
      `INSERT INTO comandas (
        tenant_id, patient_id, professional_id, description, total, discount,
        items, notes, payment_method, start_date, duration_minutes, status,
        receipt_code, discount_type, discount_value, total_net, sessions_total, package_id,
        sync_to_livrocaixa, livrocaixa_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, patient_id || null, professional_id || null,
        req.body.description || 'Consulta/Serviço',
        total, dValue, JSON.stringify(itemsArr), notes || null,
        payment_method || null, start_date || null, duration_minutes || 60,
        req.body.status || 'open', receipt_code || null,
        dType, dValue, total, (sessions_total || sessions_from_items || 1),
        package_id || null, syncLC, syncLC ? lcDate : null
      ]
    );

    const comandaId = result.insertId;

    // Se sync_to_livrocaixa, criar lançamento pendente no livro caixa
    if (syncLC) {
      const desc = req.body.description || 'Consulta/Serviço';
      const txDate = lcDate;
      const [pRowsName] = patient_id ? await db.query('SELECT name FROM patients WHERE id = ?', [patient_id]) : [[]];
      const patientName = pRowsName[0]?.name || '';
      const txDescription = (req.body.description || 'Comanda') + (patientName ? ` - ${patientName}` : '');
      
      // Buscar dados do paciente para popular pagador/beneficiário
      let pName = null, pCpf = null, payName = null, payCpf = null, isPayPatient = 1;
      if (patient_id) {
        const [pRows] = await db.query('SELECT name, cpf, is_payer, payer_name, payer_cpf FROM patients WHERE id = ?', [patient_id]);
        if (pRows.length > 0) {
          const p = pRows[0];
          pName = p.name;
          pCpf = p.cpf;
          isPayPatient = p.is_payer !== 0 ? 1 : 0;
          if (!isPayPatient) {
            payName = p.payer_name || p.name;
            payCpf = p.payer_cpf || p.cpf;
          } else {
            payName = p.name;
            payCpf = p.cpf;
          }
        }
      }

      // Se já veio com paid_value, usa como amount e marca como pago
      const initialPaid = parseFloat(bodyPaidValue || 0);
      const txStatus  = 'pending'; // Comanda forecast é sempre pendente (o saldo devedor)
      const txAmount  = Math.max(0, total - initialPaid);
      const txCategory = req.body.category || 'Pacote de Sessões';

      if (initialPaid > 0) {
        // Criar o registro de pagamento inicial se houver
        const [payRes] = await db.query(
          `INSERT INTO comanda_payments (tenant_id, comanda_id, amount, payment_date, payment_method, status)
           VALUES (?, ?, ?, ?, ?, 'paid')`,
          [req.user.tenant_id, comandaId, initialPaid, lcDate, payment_method || 'Pix']
        );
        // Criar lançamento realizado no livro caixa
        await db.query(
          `INSERT INTO financial_transactions
             (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
              payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, origin_module, origin_id, origin_payment_id, source, created_by)
           VALUES (?, 'income', ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, 'COMANDA', ?, ?, 'comanda_payment', ?)`,
          [
            req.user.tenant_id, txCategory, txDescription + ' (Pagamento Inicial)', initialPaid, lcDate,
            patient_id || null, payment_method || 'Pix',
            payName, payCpf, isPayPatient ? null : pName, isPayPatient ? null : pCpf,
            comandaId, payRes.insertId, req.user.id
          ]
        );
      }

      if (txAmount > 0) {
        // Criar lançamento de previsão (forecast) no livro caixa
        const [txResult] = await db.query(
          `INSERT INTO financial_transactions
             (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
              payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, origin_module, origin_id, source, created_by)
           VALUES (?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMANDA', ?, 'comanda_forecast', ?)`,
          [
            req.user.tenant_id, txCategory, txDescription, txAmount, txDate,
            patient_id || null, payment_method || 'Pix', txStatus,
            payName, payCpf, isPayPatient ? null : pName, isPayPatient ? null : pCpf,
            comandaId, req.user.id
          ]
        );
        await db.query('UPDATE comandas SET livrocaixa_tx_id = ? WHERE id = ?', [txResult.insertId, comandaId]);
      }
    }

    const [comanda] = await db.query('SELECT * FROM comandas WHERE id = ?', [comandaId]);
    const c = comanda[0];
    try { c.items = JSON.parse(c.items); } catch {}
    res.status(201).json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar comanda' });
  }
});

// PUT /finance/comandas/:id
router.put('/comandas/:id', authMiddleware, async (req, res) => {
    try {
        await withSchema();
        const {
            patient_id, professional_id, description, status, items,
            notes, payment_method, start_date, duration_minutes,
            sessions_total, sessions_used, paid_value, receipt_code,
            discount_type, discount_value, package_id, sync_to_livrocaixa, livrocaixa_date
        } = req.body;

        const itemsArr = items || [];
        const subtotal = itemsArr.reduce((sum, item) => sum + (parseFloat(item.price || item.value || 0) * (item.qty || item.quantity || 1)), 0);
        const dType = discount_type || 'fixed';
        const dValue = parseFloat(discount_value || 0);

        let total = subtotal;
        if (dType === 'percentage') {
           total = subtotal - (subtotal * (dValue / 100));
        } else {
           total = subtotal - dValue;
        }
        total = Math.max(0, total);

        // Fallback: se items zerados mas frontend enviou total_value, usa-o
        const bodyTotalValue = req.body.total_value;
        if (total === 0 && bodyTotalValue && Number(bodyTotalValue) > 0) {
          total = Number(bodyTotalValue);
        }
        const sTotal = Number(sessions_total || 0);
        const sUsed = Number(sessions_used || 0);
        const pValue = parseFloat(paid_value || 0);

        // Ler estado atual da comanda para gerenciar sync
        const [currentCmd] = await db.query(
            'SELECT sync_to_livrocaixa, livrocaixa_tx_id, paid_value as current_paid FROM comandas WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.user.tenant_id]
        );
        const currentSync = currentCmd[0]?.sync_to_livrocaixa;
        const currentLcTxId = currentCmd[0]?.livrocaixa_tx_id;
        const newSync = sync_to_livrocaixa !== undefined ? (sync_to_livrocaixa ? 1 : 0) : currentSync;

        const lcDatePut = livrocaixa_date || start_date || new Date().toISOString().slice(0, 10);

        await db.query(
            `UPDATE comandas SET
                patient_id = ?, professional_id = ?, description = ?, status = ?,
                total = ?, items = ?, notes = ?, payment_method = ?,
                start_date = ?, duration_minutes = ?,
                sessions_total = ?, sessions_used = ?, paid_value = ?, receipt_code = ?,
                discount_type = ?, discount_value = ?, total_net = ?, package_id = ?,
                sync_to_livrocaixa = ?, livrocaixa_date = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                patient_id || null, professional_id || null, description || '',
                status || ( (pValue >= total && pValue > 0 && sUsed >= sTotal) ? 'closed' : 'open' ),
                total, JSON.stringify(itemsArr), notes || null, payment_method || null,
                start_date || null, duration_minutes || 60,
                sTotal, sUsed,
                pValue, receipt_code || null,
                dType, dValue, total, package_id || null,
                newSync, newSync ? lcDatePut : null,
                req.params.id, req.user.tenant_id
            ]
        );

        // Gerenciar lançamento no livro caixa
        const currentPaid = parseFloat(paid_value || 0);
        if (newSync && !currentLcTxId) {
            // Ativar sync: criar lançamento pendente para o saldo e realizados para os pagamentos
            const txDate = lcDatePut;
            const [pRowsName2] = patient_id ? await db.query('SELECT name FROM patients WHERE id = ?', [patient_id]) : [[]];
            const patientName2 = pRowsName2[0]?.name || '';
            const txDescriptionNew = (description || 'Comanda') + (patientName2 ? ` - ${patientName2}` : '');

            // Buscar dados do paciente para popular pagador/beneficiário
            let pName = null, pCpf = null, payName = null, payCpf = null, isPayPatient = 1;
            if (patient_id) {
                const [pRows] = await db.query('SELECT name, cpf, is_payer, payer_name, payer_cpf FROM patients WHERE id = ?', [patient_id]);
                if (pRows.length > 0) {
                    const p = pRows[0];
                    pName = p.name;
                    pCpf = p.cpf;
                    isPayPatient = p.is_payer !== 0 ? 1 : 0;
                    if (!isPayPatient) {
                        payName = p.payer_name || p.name;
                        payCpf = p.payer_cpf || p.cpf;
                    } else {
                        payName = p.name;
                        payCpf = p.cpf;
                    }
                }
            }

            const txCategoryNew = req.body.category || (package_id ? 'Pacote de Sessões' : 'Sessão Individual');
            
            // 1. Criar transações para os pagamentos já existentes na comanda_payments
            const [existingPayments] = await db.query('SELECT * FROM comanda_payments WHERE comanda_id = ? AND status != "cancelled"', [req.params.id]);
            for (const pay of existingPayments) {
                await db.query(
                    `INSERT INTO financial_transactions
                       (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
                        payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, origin_module, origin_id, origin_payment_id, source)
                     VALUES (?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMANDA', ?, ?, 'comanda_payment')`,
                    [
                        req.user.tenant_id, txCategoryNew, txDescriptionNew + ' (Pagamento)', pay.amount, pay.payment_date, patient_id || null, pay.payment_method || 'Pix', pay.status === 'paid' ? 'paid' : 'pending',
                        payName, payCpf, isPayPatient ? null : pName, isPayPatient ? null : pCpf, req.params.id, pay.id
                    ]
                );
            }

            // 2. Criar previsão (forecast) para o saldo restante
            const remaining = Math.max(0, total - currentPaid);
            if (remaining > 0) {
                const [newTx] = await db.query(
                    `INSERT INTO financial_transactions
                       (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
                        payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, origin_module, origin_id, source)
                     VALUES (?, 'income', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'COMANDA', ?, 'comanda_forecast')`,
                    [
                        req.user.tenant_id, txCategoryNew, txDescriptionNew, remaining, txDate, patient_id || null, payment_method || 'Pix',
                        payName, payCpf, isPayPatient ? null : pName, isPayPatient ? null : pCpf, req.params.id
                    ]
                );
                await db.query('UPDATE comandas SET livrocaixa_tx_id = ? WHERE id = ?', [newTx.insertId, req.params.id]);
            }
        } else if (!newSync && currentLcTxId) {
            // Desativar sync: remover lançamentos do livro caixa vinculados a esta comanda
            await db.query('DELETE FROM financial_transactions WHERE origin_id = ? AND origin_module = "COMANDA" AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
            await db.query('DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?', [currentLcTxId, req.user.tenant_id]);
            await db.query('UPDATE comandas SET livrocaixa_tx_id = NULL WHERE id = ?', [req.params.id]);
        } else if (newSync && currentLcTxId) {
            // Sync ativo: atualizar o lançamento de previsão
            const remaining = Math.max(0, total - currentPaid);
            if (remaining > 0) {
                await db.query(
                    `UPDATE financial_transactions SET amount = ?, date = ?, status = 'pending' WHERE id = ? AND tenant_id = ?`,
                    [remaining, lcDatePut, currentLcTxId, req.user.tenant_id]
                );
            } else {
                await db.query('DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?', [currentLcTxId, req.user.tenant_id]);
                await db.query('UPDATE comandas SET livrocaixa_tx_id = NULL WHERE id = ?', [req.params.id]);
            }
        }

        // Se o status mudou para 'closed', gera lançamento financeiro
        if (status === 'closed') {
            const [existing] = await db.query(
                'SELECT financial_transaction_id FROM comandas WHERE id = ?',
                [req.params.id]
            );
            
            if (!existing[0]?.financial_transaction_id) {
                const [ftResult] = await db.query(
                    `INSERT INTO financial_transactions 
                        (tenant_id, type, category, description, amount, date, patient_id, payment_method, status)
                    VALUES (?, 'income', 'Atendimento', ?, ?, NOW(), ?, ?, 'paid')`,
                    [
                        req.user.tenant_id,
                        description || 'Pagamento de Comanda',
                        total,
                        patient_id || null,
                        payment_method || 'pending'
                    ]
                );
                
                await db.query(
                    'UPDATE comandas SET financial_transaction_id = ? WHERE id = ?',
                    [ftResult.insertId, req.params.id]
                );
            }
        }

        res.json({ id: req.params.id, success: true });
    } catch (err) {
        console.error('Erro ao atualizar comanda:', err);
        res.status(500).json({ error: 'Erro ao atualizar comanda', details: err.message });
    }
});

// PUT /finance/comandas/:id/force-close
router.put('/comandas/:id/force-close', authMiddleware, async (req, res) => {
    try {
        await withSchema();
        const { id } = req.params;
        const tenant_id = req.user.tenant_id;
        
        await db.query(
            'UPDATE comandas SET status = ? WHERE id = ? AND tenant_id = ?',
            ['closed', id, tenant_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao forçar fechamento da comanda:', err);
        res.status(500).json({ error: 'Erro ao forçar fechamento da comanda', details: err.message });
    }
});

// DELETE /finance/comandas/:id
router.delete('/comandas/:id', authMiddleware, async (req, res) => {
  try {
    await withSchema();
    const comandaId = req.params.id;
    const tenantId = req.user.tenant_id;

    // 1. Remover vínculos na agenda
    await db.query(
      'UPDATE appointments SET comanda_id = NULL WHERE comanda_id = ? AND tenant_id = ?',
      [comandaId, tenantId]
    );

    // 2. Buscar transação financeira vinculada antes de deletar a comanda
    const [comandas] = await db.query(
      'SELECT financial_transaction_id, livrocaixa_tx_id FROM comandas WHERE id = ? AND tenant_id = ?',
      [comandaId, tenantId]
    );

    if (comandas.length > 0) {
      if (comandas[0].financial_transaction_id) {
        await db.query(
          'DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?',
          [comandas[0].financial_transaction_id, tenantId]
        );
      }
      // Deletar lançamento do livro caixa vinculado (sync_to_livrocaixa)
      if (comandas[0].livrocaixa_tx_id) {
        await db.query(
          'DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?',
          [comandas[0].livrocaixa_tx_id, tenantId]
        );
      }
    }

    // 3. Deletar todos os pagamentos parciais vinculados a esta comanda
    await db.query(
      'DELETE FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?',
      [comandaId, tenantId]
    );

    // 4. Deletar a comanda propriamente dita
    const [result] = await db.query(
      'DELETE FROM comandas WHERE id = ? AND tenant_id = ?',
      [comandaId, tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comanda não encontrada' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar comanda:', err);
    res.status(500).json({ error: 'Erro ao deletar comanda', details: err.message });
  }
});

// GET /finance/analytics/best-clients
router.get('/analytics/best-clients', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Receita: soma de financial_transactions (pagamentos registrados)
    // mais fallback para comanda_payments caso não haja lançamentos ainda
    const [data] = await db.query(`
      SELECT
        p.id,
        p.name,
        p.created_at as since,
        COALESCE(
          (SELECT SUM(ft.amount) FROM financial_transactions ft
           WHERE ft.patient_id = p.id AND ft.type = 'income' AND ft.tenant_id = ?),
          0
        ) +
        COALESCE(
          (SELECT SUM(cp.amount) FROM comanda_payments cp
           INNER JOIN comandas cmd ON cmd.id = cp.comanda_id
           WHERE cmd.patient_id = p.id AND cp.tenant_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM financial_transactions ft2
               WHERE ft2.patient_id = p.id AND ft2.type = 'income' AND ft2.tenant_id = ?
             )),
          0
        ) as totalRevenue,
        (SELECT COUNT(*) FROM appointments
         WHERE patient_id = p.id
           AND status IN ('completed', 'no_show', 'confirmed')
           AND tenant_id = ?) as appointmentCount,
        (SELECT MAX(start_time) FROM appointments WHERE patient_id = p.id AND tenant_id = ?) as lastVisit
      FROM patients p
      WHERE p.tenant_id = ?
      HAVING appointmentCount > 0 OR totalRevenue > 0
      ORDER BY totalRevenue DESC
      LIMIT 30
    `, [tenantId, tenantId, tenantId, tenantId, tenantId, tenantId]);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar melhores clientes' });
  }
});

// GET /finance/analytics/performance
router.get('/analytics/performance', async (req, res) => {
  try {
    const { period } = req.query;
    const tenantId = req.user.tenant_id;

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      // Default: current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    let timeFormat = '%Y-%m-%d';
    if (period === 'year') timeFormat = '%Y-%m';

    // Financial Series filtered by period
    const [series] = await db.query(`
      SELECT DATE_FORMAT(date, '${timeFormat}') as label,
             SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM financial_transactions
      WHERE tenant_id = ? AND date >= ? AND date <= ?
      GROUP BY label
      ORDER BY MIN(date) ASC
    `, [tenantId, startStr, endStr]);

    // Totals filtered by period
    const [totals] = await db.query(`
      SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
        COUNT(DISTINCT DATE(date)) as worked_days
      FROM financial_transactions
      WHERE tenant_id = ? AND date >= ? AND date <= ?
    `, [tenantId, startStr, endStr]);

    const [sessionsData] = await db.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(duration_minutes), 0) / 60 as total_hours
      FROM appointments
      WHERE tenant_id = ? AND (status = 'completed' OR status = 'confirmed')
        AND DATE(start_time) >= ? AND DATE(start_time) <= ?
    `, [tenantId, startStr, endStr]);

    // Peak Days filtered by period
    const [peakDays] = await db.query(`
      SELECT
        DAYOFWEEK(start_time) as day_index,
        COUNT(*) as count
      FROM appointments
      WHERE tenant_id = ? AND (status = 'completed' OR status = 'confirmed')
        AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      GROUP BY day_index
      ORDER BY day_index ASC
    `, [tenantId, startStr, endStr]);

    // Peak Hours filtered by period
    const [peakHours] = await db.query(`
      SELECT
        HOUR(start_time) as hour,
        COUNT(*) as count
      FROM appointments
      WHERE tenant_id = ? AND (status = 'completed' OR status = 'confirmed')
        AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      GROUP BY hour
      ORDER BY hour ASC
    `, [tenantId, startStr, endStr]);

    // Hours Distribution Series filtered by period
    const [hoursSeries] = await db.query(`
      SELECT DATE_FORMAT(start_time, '${timeFormat}') as label,
             COALESCE(SUM(duration_minutes), 0) / 60 as hours
      FROM appointments
      WHERE tenant_id = ? AND (status = 'completed' OR status = 'confirmed')
        AND DATE(start_time) >= ? AND DATE(start_time) <= ?
      GROUP BY label
      ORDER BY MIN(start_time) ASC
    `, [tenantId, startStr, endStr]);

    res.json({
      series,
      hoursSeries,
      peakDays,
      peakHours,
      period: { start: startStr, end: endStr },
      totals: {
        income: parseFloat(totals[0].income || 0),
        expense: parseFloat(totals[0].expense || 0),
        profit: parseFloat((totals[0].income || 0) - (totals[0].expense || 0)),
        worked_days: totals[0].worked_days || 0,
        sessions: sessionsData[0].count || 0,
        total_hours: parseFloat(sessionsData[0].total_hours || 0)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar performance' });
  }
});

module.exports = router;
