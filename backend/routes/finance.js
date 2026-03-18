const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

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
        receipt_code VARCHAR(100) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    if (!e.message.includes('already exists')) console.warn('comanda_payments table warning:', e.message);
  }
}
let schemaReady = false;
async function withSchema() {
  if (!schemaReady) { await ensureSchema(); schemaReady = true; }
}

// GET /finance/comandas/:id/payments - Histórico de pagamentos de uma comanda
router.get('/comandas/:id/payments', async (req, res) => {
  try {
    await withSchema();
    const [rows] = await db.query(
      `SELECT * FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ? ORDER BY payment_date DESC, created_at DESC`,
      [req.params.id, req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar pagamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar pagamentos', details: err.message });
  }
});

// POST /finance/comandas/:id/payments - Registrar novo pagamento
router.post('/comandas/:id/payments', async (req, res) => {
  try {
    await withSchema();
    const { amount, payment_date, payment_method, receipt_code, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Inserir pagamento individual
    const [result] = await db.query(
      `INSERT INTO comanda_payments (tenant_id, comanda_id, amount, payment_date, payment_method, receipt_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenant_id, req.params.id, parseFloat(amount),
       payment_date || new Date().toISOString().slice(0,10),
       payment_method || 'Pix', receipt_code || null, notes || null]
    );

    // Atualizar paid_value acumulado na comanda
    const [payments] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    const totalPaid = parseFloat(payments[0].total);

    const [comanda] = await db.query('SELECT total FROM comandas WHERE id = ?', [req.params.id]);
    const comandaTotal = parseFloat(comanda[0]?.total || 0);
    const newStatus = totalPaid >= comandaTotal ? 'closed' : 'open';

    await db.query(
      'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [totalPaid, newStatus, req.params.id, req.user.tenant_id]
    );

    res.status(201).json({ id: result.insertId, amount: parseFloat(amount), payment_date, payment_method, totalPaid, status: newStatus });
  } catch (err) {
    console.error('Erro ao registrar pagamento:', err);
    res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
  }
});

// DELETE /finance/comandas/:id/payments/:paymentId - Remover pagamento
router.delete('/comandas/:id/payments/:paymentId', async (req, res) => {
  try {
    await withSchema();
    await db.query(
      'DELETE FROM comanda_payments WHERE id = ? AND comanda_id = ? AND tenant_id = ?',
      [req.params.paymentId, req.params.id, req.user.tenant_id]
    );

    // Recalcular paid_value
    const [payments] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM comanda_payments WHERE comanda_id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    const totalPaid = parseFloat(payments[0].total);

    const [comanda] = await db.query('SELECT total FROM comandas WHERE id = ?', [req.params.id]);
    const comandaTotal = parseFloat(comanda[0]?.total || 0);
    const newStatus = totalPaid >= comandaTotal && totalPaid > 0 ? 'closed' : 'open';

    await db.query(
      'UPDATE comandas SET paid_value = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [totalPaid, newStatus, req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, totalPaid });
  } catch (err) {
    console.error('Erro ao remover pagamento:', err);
    res.status(500).json({ error: 'Erro ao remover pagamento' });
  }
});

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
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações', details: err.message });
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
    const { 
      type, category, description, amount, date, 
      patient_id, appointment_id, payment_method, status,
      payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation
    } = req.body;

    if (!type || !amount || !date) {
      return res.status(400).json({ error: 'Tipo, valor e data são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO financial_transactions
        (tenant_id, type, category, description, amount, date, patient_id, appointment_id, payment_method, status,
         payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, type, category || null, description || null,
        amount, date, patient_id || null, appointment_id || null,
        payment_method || null, status || 'paid',
        payer_name || null, beneficiary_name || null, payer_cpf || null, beneficiary_cpf || null, observation || null
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
    const { 
      type, category, description, amount, date, payment_method, status,
      payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation
    } = req.body;

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
        observation = COALESCE(?, observation)
       WHERE id = ? AND tenant_id = ?`,
      [
        type, category, description, amount, date, payment_method, status,
        payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation,
        req.params.id, req.user.tenant_id
      ]
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

// POST /finance/repeat/:id - Duplicar para o próximo mês
router.post('/repeat/:id', async (req, res) => {
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
         payer_name, beneficiary_name, payer_cpf, beneficiary_cpf, observation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        original.tenant_id, original.type, original.category, original.description, original.amount, 
        nextMonthDate, original.patient_id, original.payment_method, 'pending',
        original.payer_name, original.beneficiary_name, original.payer_cpf, original.beneficiary_cpf, original.observation
      ]
    );

    const [newTx] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(newTx[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao repetir lançamento' });
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
router.get('/comandas', async (req, res) => {
  try {
    await withSchema();
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
          `SELECT start_time, status, notes FROM appointments 
           WHERE comanda_id = ? ORDER BY start_time ASC`,
          [c.id]
        );
        c.appointments = aptData;

        // Histórico de sessões (contagem)
        const usedCount = aptData.filter(a => 
            ['confirmed', 'completed', 'no-show'].includes(a.status)
        ).length;
        
        c.sessions_used = usedCount;
        
        // Próxima sessão
        const nextApt = aptData.find(a => new Date(a.start_time) > new Date() && a.status === 'scheduled');
        c.next_appointment = nextApt ? nextApt.start_time : null;

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
router.get('/comandas/patient/:patientId', async (req, res) => {
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

// POST /finance/comandas
router.post('/comandas', async (req, res) => {
  try {
    await withSchema();
    const { 
      patient_id, professional_id, items, notes, 
      payment_method, discount, start_date, duration_minutes, receipt_code,
      discount_type, discount_value, sessions_total, package_id
    } = req.body;

    const itemsArr = items || [];
    const subtotal = itemsArr.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
    const dType = discount_type || 'fixed';
    const dValue = parseFloat(discount_value || 0);

    let total = subtotal;
    if (dType === 'percentage') {
       total = subtotal - (subtotal * (dValue / 100));
    } else {
       total = subtotal - dValue;
    }
    total = Math.max(0, total);

    // Sessions count calculation from items if sessions_total not explicitly provided
    const sessions_from_items = itemsArr.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);

    const [result] = await db.query(
      `INSERT INTO comandas (
        tenant_id, patient_id, professional_id, description, total, discount, 
        items, notes, payment_method, start_date, duration_minutes, status, 
        receipt_code, discount_type, discount_value, total_net, sessions_total, package_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, patient_id || null, professional_id || null, 
        req.body.description || 'Consulta/Serviço',
        total, dValue, JSON.stringify(itemsArr), notes || null, 
        payment_method || null, start_date || null, duration_minutes || 60,
        req.body.status || 'open', receipt_code || null, 
        dType, dValue, total, (sessions_total || sessions_from_items || 1),
        package_id || null
      ]
    );

    const comandaId = result.insertId;
    let appointment_id = null;

    // 2. Se tiver data, cria um agendamento automático na agenda (caso não tenha vindo da agenda)
    if (start_date && !req.body.skip_appointment) {
      try {
        const start = new Date(start_date);
        const end = new Date(start.getTime() + (duration_minutes || 60) * 60000);
        
        const [patients] = await db.query('SELECT name FROM patients WHERE id = ?', [patient_id]);
        const patientName = patients[0] ? patients[0].name : 'Paciente';
        const title = `Sessão: ${patientName} (via Comanda #${comandaId})`;

        const [aptResult] = await db.query(
          `INSERT INTO appointments (
            tenant_id, patient_id, professional_id, title, 
            start_time, end_time, status, notes, comanda_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id, patient_id || null, professional_id || null, 
            title, start, end, 'scheduled', notes || 'Gerado via comanda', comandaId
          ]
        );
        appointment_id = aptResult.insertId;

        await db.query('UPDATE comandas SET appointment_id = ? WHERE id = ?', [appointment_id, comandaId]);
      } catch (aptErr) {
        console.error('Erro ao gerar agendamento automático via comanda:', aptErr);
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
router.put('/comandas/:id', async (req, res) => {
    try {
        await withSchema();
        const { 
            patient_id, professional_id, description, status, items, 
            notes, payment_method, start_date, duration_minutes,
            sessions_total, sessions_used, paid_value, receipt_code,
            discount_type, discount_value, package_id
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

        await db.query(
            `UPDATE comandas SET 
                patient_id = ?, professional_id = ?, description = ?, status = ?, 
                total = ?, items = ?, notes = ?, payment_method = ?, 
                start_date = ?, duration_minutes = ? ,
                sessions_total = ?, sessions_used = ?, paid_value = ?, receipt_code = ?,
                discount_type = ?, discount_value = ?, total_net = ?, package_id = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                patient_id || null, professional_id || null, description || '', status || 'open',
                total, JSON.stringify(itemsArr), notes || null, payment_method || null,
                start_date || null, duration_minutes || 60,
                sessions_total || 0, sessions_used || 0,
                paid_value || 0, receipt_code || null,
                dType, dValue, total, package_id || null,
                req.params.id, req.user.tenant_id
            ]
        );

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

// DELETE /finance/comandas/:id
router.delete('/comandas/:id', async (req, res) => {
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
      'SELECT financial_transaction_id FROM comandas WHERE id = ? AND tenant_id = ?',
      [comandaId, tenantId]
    );

    if (comandas.length > 0 && comandas[0].financial_transaction_id) {
       // Deletar a transação financeira principal vinculada (gerada quando fechada)
       await db.query(
         'DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?',
         [comandas[0].financial_transaction_id, tenantId]
       );
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
    const [data] = await db.query(`
      SELECT 
        p.id, 
        p.name, 
        p.created_at as since,
        COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE patient_id = p.id AND type = 'income' AND tenant_id = ?), 0) as totalRevenue,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = p.id AND status = 'completed' AND tenant_id = ?) as appointmentCount,
        (SELECT MAX(start_time) FROM appointments WHERE patient_id = p.id AND tenant_id = ?) as lastVisit
      FROM patients p
      WHERE p.tenant_id = ?
      HAVING totalRevenue > 0 OR appointmentCount > 0
      ORDER BY totalRevenue DESC
      LIMIT 30
    `, [tenantId, tenantId, tenantId, tenantId]);
    
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
    
    let timeFormat = '%Y-%m-%d';
    if (period === 'year') timeFormat = '%Y-%m';

    // Finnacial Series
    const [series] = await db.query(`
      SELECT DATE_FORMAT(date, '${timeFormat}') as label, 
             SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM financial_transactions
      WHERE tenant_id = ?
      GROUP BY label
      ORDER BY MIN(date) ASC
    `, [tenantId]);

    // Totals and Operational Metrics
    const [totals] = await db.query(`
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
        COUNT(DISTINCT DATE(date)) as worked_days
      FROM financial_transactions
      WHERE tenant_id = ?
    `, [tenantId]);

    const [sessionsData] = await db.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(duration_minutes), 0) / 60 as total_hours
      FROM appointments 
      WHERE tenant_id = ? AND status = 'completed'
    `, [tenantId]);

    // Peak Days (Day of week distribution)
    const [peakDays] = await db.query(`
      SELECT 
        DAYOFWEEK(start_time) as day_index,
        COUNT(*) as count
      FROM appointments
      WHERE tenant_id = ? AND status = 'completed'
      GROUP BY day_index
      ORDER BY day_index ASC
    `, [tenantId]);

    // Peak Hours (Hour of day distribution)
    const [peakHours] = await db.query(`
      SELECT 
        HOUR(start_time) as hour,
        COUNT(*) as count
      FROM appointments
      WHERE tenant_id = ? AND status = 'completed'
      GROUP BY hour
      ORDER BY hour ASC
    `, [tenantId]);

    // Hours Distribution Series
    const [hoursSeries] = await db.query(`
      SELECT DATE_FORMAT(start_time, '${timeFormat}') as label,
             COALESCE(SUM(duration_minutes), 0) / 60 as hours
      FROM appointments
      WHERE tenant_id = ? AND status = 'completed'
      GROUP BY label
      ORDER BY MIN(start_time) ASC
    `, [tenantId]);

    res.json({
      series,
      hoursSeries,
      peakDays,
      peakHours,
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
