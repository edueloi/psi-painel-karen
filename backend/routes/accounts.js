// Contas a Receber (avulsas + visão por paciente) e Contas a Pagar do Financeiro.
//
// Montado em /finance/accounts (ver finance.js). Tudo filtra por tenant_id e respeita as permissões
// financeiras existentes: leitura = view_financial_reports, escrita/baixa = manage_payments.
//
// Fonte dos dados:
//  - "A receber de pacientes" NÃO tem tabela própria: é derivado de comandas (total x paid_value, pagamentos em
//    comanda_payments) e de lançamentos manuais de entrada vinculados a paciente no Livro Caixa. A baixa de
//    comanda continua usando POST /finance/comandas/:id/payments (mesma regra e mesma sincronização com o Livro Caixa).
//  - Contas avulsas a receber e contas a pagar ficam em finance_accounts (kind = receivable | payable). A baixa gera
//    UM lançamento no Livro Caixa (origin_module = 'ACCOUNT', origin_id = id da conta), e o estorno o remove.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, checkPermission } = require('../middleware/auth');
const { ensureStatements } = require('../utils/schemaMigrate');

const canView = checkPermission('view_financial_reports');
const canManage = checkPermission('manage_payments');

let schemaReady = null;
function withSchema() {
  if (!schemaReady) {
    schemaReady = ensureStatements([
      `CREATE TABLE IF NOT EXISTS finance_account_series (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        kind VARCHAR(12) NOT NULL,
        mode VARCHAR(16) NOT NULL DEFAULT 'recurrence',
        description VARCHAR(255) NOT NULL,
        party_name VARCHAR(255) NULL,
        patient_id INT NULL,
        category VARCHAR(100) NULL,
        payment_method VARCHAR(50) NULL,
        notes TEXT NULL,
        amount_each DECIMAL(12,2) NOT NULL DEFAULT 0,
        interval_unit VARCHAR(10) NOT NULL DEFAULT 'month',
        interval_count INT NOT NULL DEFAULT 1,
        occurrences INT NULL,
        start_date DATE NOT NULL,
        generated_count INT NOT NULL DEFAULT 0,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_series_tenant (tenant_id, kind)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS finance_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        kind VARCHAR(12) NOT NULL,
        description VARCHAR(255) NOT NULL,
        party_name VARCHAR(255) NULL,
        patient_id INT NULL,
        category VARCHAR(100) NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        due_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        paid_date DATE NULL,
        paid_amount DECIMAL(12,2) NULL,
        interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) NULL,
        notes TEXT NULL,
        series_id INT NULL,
        installment_number INT NULL,
        installments_total INT NULL,
        ledger_tx_id INT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_acc_tenant_due (tenant_id, kind, due_date),
        KEY idx_acc_series (series_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS finance_account_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        kind VARCHAR(12) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_account_category (tenant_id, kind, name),
        KEY idx_account_category_tenant (tenant_id, kind)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS finance_account_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        account_id INT NOT NULL,
        upload_id INT NOT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_account_attachment (account_id, upload_id),
        KEY idx_account_attachment_tenant (tenant_id, account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    ], 'accounts', { strict: true }).catch((err) => {
      schemaReady = null; // tenta de novo na próxima requisição
      throw err;
    });
  }
  return schemaReady;
}

const wrap = (fn) => async (req, res) => {
  try {
    await withSchema();
    await fn(req, res);
  } catch (err) {
    console.error('[accounts]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro ao processar contas', details: err.message });
  }
};

// ── Datas (strings YYYY-MM-DD, sem fuso) ─────────────────────────────────────
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDate = (v) => (v && ISO_RE.test(String(v).slice(0, 10)) ? String(v).slice(0, 10) : null);
const fmt = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// i-ésima ocorrência a partir de start (sempre calculada a partir da data inicial: 31/01 -> 28/02 -> 31/03).
function nthDate(startISO, unit, count, i) {
  const [y, m, d] = startISO.split('-').map(Number);
  if (unit === 'day' || unit === 'week') {
    const dt = new Date(Date.UTC(y, m - 1, d + i * count * (unit === 'week' ? 7 : 1)));
    return dt.toISOString().slice(0, 10);
  }
  const monthsToAdd = i * count * (unit === 'year' ? 12 : 1);
  const total = (m - 1) + monthsToAdd;
  const ty = y + Math.floor(total / 12);
  const tm = (total % 12) + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return fmt(ty, tm, Math.min(d, last));
}

const UNITS = new Set(['day', 'week', 'month', 'year']);
const MAX_ROWS = 240;
const AHEAD_MONTHS = 12;

function money(v) {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

const SELECT_ACCOUNT = `SELECT a.id, a.kind, a.description, a.party_name, a.patient_id, p.name AS patient_name, a.category,
  a.amount, DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date, a.status,
  DATE_FORMAT(a.paid_date, '%Y-%m-%d') AS paid_date, a.paid_amount, a.interest_amount, a.discount_amount,
  a.payment_method, a.notes, a.series_id, a.installment_number, a.installments_total, a.ledger_tx_id,
  s.mode AS series_mode, s.occurrences AS series_occurrences
  FROM finance_accounts a
  LEFT JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
  LEFT JOIN finance_account_series s ON s.id = a.series_id AND s.tenant_id = a.tenant_id`;

function decorate(row, today) {
  const amount = Number(row.amount);
  const paidAmount = row.paid_amount === null ? null : Number(row.paid_amount);
  const overdue = row.status === 'pending' && row.due_date < today;
  return {
    ...row,
    amount,
    paid_amount: paidAmount,
    interest_amount: Number(row.interest_amount || 0),
    discount_amount: Number(row.discount_amount || 0),
    display_status: overdue ? 'overdue' : row.status,
  };
}

// Recorrências sem fim: mantém sempre ~12 meses de contas geradas à frente.
async function topUpSeries(tenantId) {
  const horizon = nthDate(todayISO(), 'month', 1, AHEAD_MONTHS);
  const [seriesRows] = await db.query(
    `SELECT s.*, DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_iso FROM finance_account_series s
     WHERE s.tenant_id = ? AND s.mode = 'recurrence' AND s.occurrences IS NULL`,
    [tenantId]
  );
  for (const s of seriesRows) {
    let n = s.generated_count;
    const inserts = [];
    while (n < MAX_ROWS * 4) {
      const due = nthDate(s.start_iso, s.interval_unit, s.interval_count, n);
      if (due > horizon) break;
      inserts.push([tenantId, s.kind, s.description, s.party_name, s.patient_id, s.category, s.amount_each, due,
        s.payment_method, s.notes, s.id, n + 1, null, s.created_by]);
      n++;
    }
    if (inserts.length) {
      await db.query(
        `INSERT INTO finance_accounts (tenant_id, kind, description, party_name, patient_id, category, amount, due_date,
          payment_method, notes, series_id, installment_number, installments_total, created_by) VALUES ?`,
        [inserts]
      );
      await db.query('UPDATE finance_account_series SET generated_count = ? WHERE id = ?', [n, s.id]);
    }
  }
}

// ── Listagem ─────────────────────────────────────────────────────────────────
// GET /accounts?kind=payable|receivable&from=&to=&status=&category=&party=&q=
router.get('/', authMiddleware, canView, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const kind = req.query.kind === 'receivable' ? 'receivable' : 'payable';
  await topUpSeries(tenantId);
  const where = ['a.tenant_id = ?', 'a.kind = ?'];
  const params = [tenantId, kind];
  const from = isoDate(req.query.from);
  const to = isoDate(req.query.to);
  if (from) { where.push('a.due_date >= ?'); params.push(from); }
  if (to) { where.push('a.due_date <= ?'); params.push(to); }
  if (req.query.category) { where.push('a.category = ?'); params.push(String(req.query.category)); }
  if (req.query.party) { where.push('a.party_name LIKE ?'); params.push(`%${String(req.query.party)}%`); }
  if (req.query.q) {
    where.push('(a.description LIKE ? OR a.party_name LIKE ? OR p.name LIKE ?)');
    const q = `%${String(req.query.q)}%`;
    params.push(q, q, q);
  }
  const [rows] = await db.query(`${SELECT_ACCOUNT} WHERE ${where.join(' AND ')} ORDER BY a.due_date ASC, a.id ASC LIMIT 2000`, params);
  const today = todayISO();
  let items = rows.map((r) => decorate(r, today));
  const status = String(req.query.status || '');
  if (status && status !== 'all') items = items.filter((r) => r.display_status === status);
  res.json(items);
}));

// GET /accounts/due-soon?days=7 — alerta da Visão geral (a pagar vencidas e próximas)
router.get('/due-soon', authMiddleware, canView, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const days = Math.min(60, Math.max(1, parseInt(req.query.days, 10) || 7));
  await topUpSeries(tenantId);
  const today = todayISO();
  const limit = nthDate(today, 'day', 1, days);
  const [rows] = await db.query(
    `${SELECT_ACCOUNT} WHERE a.tenant_id = ? AND a.kind = 'payable' AND a.status = 'pending' AND a.due_date <= ?
     ORDER BY a.due_date ASC LIMIT 200`,
    [tenantId, limit]
  );
  const items = rows.map((r) => decorate(r, today));
  const overdue = items.filter((r) => r.due_date < today);
  const soon = items.filter((r) => r.due_date >= today);
  const sum = (arr) => arr.reduce((s, r) => s + r.amount, 0);
  res.json({
    days,
    overdue_count: overdue.length, overdue_total: sum(overdue),
    soon_count: soon.length, soon_total: sum(soon),
    items: items.slice(0, 5).map((r) => ({ id: r.id, description: r.description, party_name: r.party_name, amount: r.amount, due_date: r.due_date })),
  });
}));

// ── Categorias e centros de custo ──────────────────────────────────────────
router.get('/categories', authMiddleware, canView, wrap(async (req, res) => {
  const kind = req.query.kind === 'receivable' ? 'receivable' : 'payable';
  const [rows] = await db.query(
    `SELECT id, name FROM finance_account_categories
     WHERE tenant_id = ? AND kind = ? ORDER BY name ASC`,
    [req.user.tenant_id, kind]
  );
  res.json(rows);
}));

router.post('/categories', authMiddleware, canManage, wrap(async (req, res) => {
  const kind = req.body?.kind === 'receivable' ? 'receivable' : 'payable';
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: 'Informe o nome da categoria ou centro de custo' });
  const [result] = await db.query(
    `INSERT INTO finance_account_categories (tenant_id, kind, name) VALUES (?, ?, ?)`,
    [req.user.tenant_id, kind, name]
  );
  res.status(201).json({ id: result.insertId, name });
}));

router.put('/categories/:id', authMiddleware, canManage, wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: 'Informe o nome da categoria ou centro de custo' });
  const [result] = await db.query(
    `UPDATE finance_account_categories SET name = ? WHERE id = ? AND tenant_id = ?`,
    [name, req.params.id, req.user.tenant_id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json({ success: true, name });
}));

router.delete('/categories/:id', authMiddleware, canManage, wrap(async (req, res) => {
  const [result] = await db.query(
    `DELETE FROM finance_account_categories WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json({ success: true });
}));

// ── Criação (conta única, parcelamento ou recorrência) ───────────────────────
// body: { kind, description, party_name, patient_id, category, amount, due_date, payment_method, notes,
//         repeat: { mode: 'installments'|'recurrence', unit, interval, count|null, amount_mode: 'each'|'total' } }
router.post('/', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const b = req.body || {};
  const kind = b.kind === 'receivable' ? 'receivable' : 'payable';
  const description = String(b.description || '').trim().slice(0, 255);
  const amount = money(b.amount);
  const due = isoDate(b.due_date);
  if (!description) return res.status(400).json({ error: 'Informe a descrição' });
  if (!(amount > 0)) return res.status(400).json({ error: 'Informe um valor maior que zero' });
  if (!due) return res.status(400).json({ error: 'Informe o vencimento' });

  let patientId = null;
  if (kind === 'receivable' && b.patient_id) {
    const [pr] = await db.query('SELECT id, name FROM patients WHERE id = ? AND tenant_id = ?', [b.patient_id, tenantId]);
    if (!pr[0]) return res.status(400).json({ error: 'Paciente inválido' });
    patientId = pr[0].id;
    if (!b.party_name) b.party_name = pr[0].name;
  }
  const base = {
    party_name: b.party_name ? String(b.party_name).trim().slice(0, 255) : null,
    category: b.category ? String(b.category).trim().slice(0, 100) : null,
    payment_method: b.payment_method ? String(b.payment_method).slice(0, 50) : null,
    notes: b.notes ? String(b.notes) : null,
  };

  const rep = b.repeat && (b.repeat.mode === 'installments' || b.repeat.mode === 'recurrence') ? b.repeat : null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const insertRow = (row) => conn.query(
      `INSERT INTO finance_accounts (tenant_id, kind, description, party_name, patient_id, category, amount, due_date,
        payment_method, notes, series_id, installment_number, installments_total, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, kind, row.description, base.party_name, patientId, base.category, row.amount, row.due,
        base.payment_method, base.notes, row.seriesId || null, row.n || null, row.total || null, req.user.id]
    );

    if (!rep) {
      const [r] = await insertRow({ description, amount, due });
      await conn.commit();
      return res.status(201).json({ created: 1, id: r.insertId });
    }

    const unit = UNITS.has(rep.unit) ? rep.unit : 'month';
    const interval = Math.min(52, Math.max(1, parseInt(rep.interval, 10) || 1));
    const isInstallments = rep.mode === 'installments';
    const infinite = !isInstallments && (rep.count === null || rep.count === '' || rep.count === undefined);
    const count = infinite ? null : Math.min(MAX_ROWS, Math.max(2, parseInt(rep.count, 10) || 2));
    if (isInstallments && !count) { await conn.rollback(); return res.status(400).json({ error: 'Informe o número de parcelas' }); }

    let amounts = [];
    let amountEach = amount;
    if (isInstallments) {
      const total = rep.amount_mode === 'each' ? Math.round(amount * count * 100) / 100 : amount;
      const cents = Math.round(total * 100);
      const each = Math.floor(cents / count);
      amounts = Array.from({ length: count }, (_, i) => (i === count - 1 ? cents - each * (count - 1) : each) / 100);
      amountEach = each / 100;
    }

    const [sr] = await conn.query(
      `INSERT INTO finance_account_series (tenant_id, kind, mode, description, party_name, patient_id, category, payment_method,
        notes, amount_each, interval_unit, interval_count, occurrences, start_date, generated_count, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      [tenantId, kind, isInstallments ? 'installments' : 'recurrence', description, base.party_name, patientId, base.category,
        base.payment_method, base.notes, amountEach, unit, interval, count, due, req.user.id]
    );
    const seriesId = sr.insertId;
    const horizon = nthDate(todayISO(), 'month', 1, AHEAD_MONTHS);
    let generated = 0;
    const target = count || MAX_ROWS;
    for (let i = 0; i < target; i++) {
      const d = nthDate(due, unit, interval, i);
      if (infinite && d > horizon) break;
      await insertRow({
        description: isInstallments ? `${description} (${i + 1}/${count})` : description,
        amount: isInstallments ? amounts[i] : amount,
        due: d, seriesId, n: i + 1, total: count,
      });
      generated++;
    }
    await conn.query('UPDATE finance_account_series SET generated_count = ? WHERE id = ?', [generated, seriesId]);
    await conn.commit();
    res.status(201).json({ created: generated, series_id: seriesId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

// ── Edição: scope = one | following | all ────────────────────────────────────
router.put('/:id', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const [rows] = await db.query("SELECT *, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_iso FROM finance_accounts WHERE id = ? AND tenant_id = ?", [req.params.id, tenantId]);
  const acc = rows[0];
  if (!acc) return res.status(404).json({ error: 'Conta não encontrada' });
  const b = req.body || {};
  const scope = acc.series_id && ['following', 'all'].includes(b.scope) ? b.scope : 'one';

  const sets = [];
  const params = [];
  const put = (col, val) => { sets.push(`${col} = ?`); params.push(val); };
  if (b.description !== undefined) {
    const d = String(b.description).trim().slice(0, 255);
    if (!d) return res.status(400).json({ error: 'Informe a descrição' });
    put('description', d);
  }
  if (b.party_name !== undefined) put('party_name', b.party_name ? String(b.party_name).trim().slice(0, 255) : null);
  if (b.category !== undefined) put('category', b.category ? String(b.category).trim().slice(0, 100) : null);
  if (b.payment_method !== undefined) put('payment_method', b.payment_method ? String(b.payment_method).slice(0, 50) : null);
  if (b.notes !== undefined) put('notes', b.notes ? String(b.notes) : null);
  if (b.amount !== undefined) {
    const a = money(b.amount);
    if (!(a > 0)) return res.status(400).json({ error: 'Valor inválido' });
    put('amount', a);
  }
  if (scope === 'one' && b.due_date !== undefined) {
    const d = isoDate(b.due_date);
    if (!d) return res.status(400).json({ error: 'Vencimento inválido' });
    put('due_date', d);
  }
  if (!sets.length) return res.json({ updated: 0 });

  let where = 'id = ? AND tenant_id = ?';
  const wParams = [acc.id, tenantId];
  if (scope !== 'one') {
    where = `series_id = ? AND tenant_id = ? AND status = 'pending'`;
    wParams.splice(0, 2, acc.series_id, tenantId);
    if (scope === 'following') { where += ' AND due_date >= ?'; wParams.push(acc.due_iso); }
  } else if (acc.status === 'paid' && (b.amount !== undefined)) {
    return res.status(409).json({ error: 'Conta já paga: estorne a baixa antes de alterar o valor' });
  }
  const [r] = await db.query(`UPDATE finance_accounts SET ${sets.join(', ')} WHERE ${where}`, [...params, ...wParams]);
  res.json({ updated: r.affectedRows });
}));

// ── Baixa / estorno ──────────────────────────────────────────────────────────
async function settle(conn, tenantId, userId, id, opts) {
  const [rows] = await conn.query('SELECT * FROM finance_accounts WHERE id = ? AND tenant_id = ? FOR UPDATE', [id, tenantId]);
  const acc = rows[0];
  if (!acc) return { ok: false, status: 404, error: 'Conta não encontrada' };
  if (acc.status === 'paid') return { ok: false, status: 409, error: 'Conta já está baixada' };
  if (acc.status === 'cancelled') return { ok: false, status: 409, error: 'Conta cancelada' };

  const interest = Math.max(0, money(opts.interest) || 0);
  const discount = Math.max(0, money(opts.discount) || 0);
  let paidAmount = opts.paid_amount !== undefined && opts.paid_amount !== '' ? money(opts.paid_amount) : money(Number(acc.amount) + interest - discount);
  if (!(paidAmount > 0)) return { ok: false, status: 400, error: 'Valor pago inválido' };
  const paidDate = isoDate(opts.paid_date) || todayISO();
  const method = opts.payment_method ? String(opts.payment_method).slice(0, 50) : acc.payment_method;
  const type = acc.kind === 'payable' ? 'expense' : 'income';

  // Um único lançamento por conta (origin_module = 'ACCOUNT'): se já existir um por falha anterior, atualiza em vez de duplicar.
  const [exist] = await conn.query(
    `SELECT id FROM financial_transactions WHERE tenant_id = ? AND origin_module = 'ACCOUNT' AND origin_id = ? LIMIT 1`,
    [tenantId, acc.id]
  );
  const desc = acc.description;
  let txId;
  if (exist[0]) {
    txId = exist[0].id;
    await conn.query(
      `UPDATE financial_transactions SET amount = ?, date = ?, payment_method = ?, status = 'paid', description = ? WHERE id = ? AND tenant_id = ?`,
      [paidAmount, paidDate, method, desc, txId, tenantId]
    );
  } else {
    const [ins] = await conn.query(
      `INSERT INTO financial_transactions (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
        origin_module, origin_id, source, observation, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'ACCOUNT', ?, ?, ?, ?)`,
      [tenantId, type, acc.category || (type === 'expense' ? 'Outros' : 'Outros'), desc, paidAmount, paidDate, acc.patient_id || null, method,
        acc.id, `account_${acc.kind}`, acc.party_name ? `${type === 'expense' ? 'Fornecedor' : 'Cliente'}: ${acc.party_name}` : null, userId]
    );
    txId = ins.insertId;
  }
  await conn.query(
    `UPDATE finance_accounts SET status = 'paid', paid_date = ?, paid_amount = ?, interest_amount = ?, discount_amount = ?,
      payment_method = ?, ledger_tx_id = ? WHERE id = ? AND tenant_id = ?`,
    [paidDate, paidAmount, interest, discount, method, txId, acc.id, tenantId]
  );
  return { ok: true };
}

function broadcast(tenantId, type) {
  try { require('../services/realtimeService').broadcast(tenantId, { type }); } catch (_) { /* opcional */ }
}

router.post('/:id/pay', authMiddleware, canManage, wrap(async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const r = await settle(conn, req.user.tenant_id, req.user.id, req.params.id, req.body || {});
    if (!r.ok) { await conn.rollback(); return res.status(r.status).json({ error: r.error }); }
    await conn.commit();
    broadcast(req.user.tenant_id, 'finance.created');
    res.json({ success: true });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

// ── Anexos de contas ───────────────────────────────────────────────────────
// O arquivo é armazenado no repositório seguro de uploads; aqui guardamos só o
// vínculo com a conta. Assim, download e permissão continuam centralizados.
router.get('/:id/attachments', authMiddleware, canView, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const [account] = await db.query('SELECT id FROM finance_accounts WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  if (!account[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  const [rows] = await db.query(
    `SELECT aa.id, aa.upload_id, aa.created_at,
            COALESCE(u.title, u.original_name, u.file_name, 'Arquivo') AS title,
            COALESCE(u.original_name, u.file_name, u.filename) AS file_name,
            COALESCE(u.mime_type, u.file_type, '') AS mime_type,
            COALESCE(u.size, u.file_size, 0) AS file_size
     FROM finance_account_attachments aa
     INNER JOIN uploads u ON u.id = aa.upload_id AND u.tenant_id = aa.tenant_id
     WHERE aa.tenant_id = ? AND aa.account_id = ?
     ORDER BY aa.created_at DESC`,
    [tenantId, req.params.id]
  );
  res.json(rows);
}));

router.post('/:id/attachments', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const uploadId = Number(req.body?.upload_id);
  if (!uploadId) return res.status(400).json({ error: 'Arquivo inválido' });
  const [account] = await db.query('SELECT id FROM finance_accounts WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  if (!account[0]) return res.status(404).json({ error: 'Conta não encontrada' });
  const [upload] = await db.query('SELECT id FROM uploads WHERE id = ? AND tenant_id = ?', [uploadId, tenantId]);
  if (!upload[0]) return res.status(404).json({ error: 'Arquivo não encontrado' });
  const [result] = await db.query(
    `INSERT INTO finance_account_attachments (tenant_id, account_id, upload_id, created_by)
     VALUES (?, ?, ?, ?)`,
    [tenantId, req.params.id, uploadId, req.user.id]
  );
  res.status(201).json({ id: result.insertId, upload_id: uploadId });
}));

router.delete('/:id/attachments/:attachmentId', authMiddleware, canManage, wrap(async (req, res) => {
  const [result] = await db.query(
    `DELETE FROM finance_account_attachments
     WHERE id = ? AND account_id = ? AND tenant_id = ?`,
    [req.params.attachmentId, req.params.id, req.user.tenant_id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Anexo não encontrado' });
  res.json({ success: true });
}));

router.post('/:id/unpay', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id, status FROM finance_accounts WHERE id = ? AND tenant_id = ? FOR UPDATE', [req.params.id, tenantId]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'Conta não encontrada' }); }
    if (rows[0].status !== 'paid') { await conn.rollback(); return res.status(409).json({ error: 'Conta não está baixada' }); }
    await conn.query(`DELETE FROM financial_transactions WHERE tenant_id = ? AND origin_module = 'ACCOUNT' AND origin_id = ?`, [tenantId, rows[0].id]);
    await conn.query(
      `UPDATE finance_accounts SET status = 'pending', paid_date = NULL, paid_amount = NULL, interest_amount = 0, discount_amount = 0, ledger_tx_id = NULL
       WHERE id = ? AND tenant_id = ?`, [rows[0].id, tenantId]
    );
    await conn.commit();
    broadcast(tenantId, 'finance.deleted');
    res.json({ success: true });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

router.post('/:id/cancel', authMiddleware, canManage, wrap(async (req, res) => {
  const [r] = await db.query(
    `UPDATE finance_accounts SET status = 'cancelled' WHERE id = ? AND tenant_id = ? AND status = 'pending'`,
    [req.params.id, req.user.tenant_id]
  );
  if (!r.affectedRows) return res.status(409).json({ error: 'Só contas pendentes podem ser canceladas' });
  res.json({ success: true });
}));

router.post('/bulk-pay', authMiddleware, canManage, wrap(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 500) : [];
  if (!ids.length) return res.status(400).json({ error: 'Selecione ao menos uma conta' });
  let done = 0;
  const errors = [];
  for (const id of ids) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const r = await settle(conn, req.user.tenant_id, req.user.id, id, { paid_date: req.body.paid_date, payment_method: req.body.payment_method });
      if (r.ok) { await conn.commit(); done++; } else { await conn.rollback(); errors.push({ id, error: r.error }); }
    } catch (err) { await conn.rollback(); errors.push({ id, error: err.message }); } finally { conn.release(); }
  }
  if (done) broadcast(req.user.tenant_id, 'finance.created');
  res.json({ success: true, count: done, errors });
}));

// ── Exclusão: scope = one | following | all (somente pendentes na série; estorna lançamento se a conta única estava paga)
async function deleteAccounts(conn, tenantId, rows) {
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  await conn.query(`DELETE FROM financial_transactions WHERE tenant_id = ? AND origin_module = 'ACCOUNT' AND origin_id IN (?)`, [tenantId, ids]);
  await conn.query(`DELETE FROM finance_account_attachments WHERE tenant_id = ? AND account_id IN (?)`, [tenantId, ids]);
  const [r] = await conn.query('DELETE FROM finance_accounts WHERE tenant_id = ? AND id IN (?)', [tenantId, ids]);
  return r.affectedRows;
}

router.post('/bulk-delete', authMiddleware, canManage, wrap(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean).slice(0, 500) : [];
  if (!ids.length) return res.status(400).json({ error: 'Selecione ao menos uma conta' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id FROM finance_accounts WHERE tenant_id = ? AND id IN (?)', [req.user.tenant_id, ids]);
    const n = await deleteAccounts(conn, req.user.tenant_id, rows);
    await conn.commit();
    broadcast(req.user.tenant_id, 'finance.deleted');
    res.json({ success: true, count: n });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

router.delete('/:id', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const [rows] = await db.query(
    `SELECT id, series_id, status, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM finance_accounts WHERE id = ? AND tenant_id = ?`,
    [req.params.id, tenantId]
  );
  const acc = rows[0];
  if (!acc) return res.status(404).json({ error: 'Conta não encontrada' });
  const scope = acc.series_id && ['following', 'all'].includes(req.query.scope) ? req.query.scope : 'one';
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let targets = [acc];
    if (scope !== 'one') {
      const [t] = await conn.query(
        `SELECT id FROM finance_accounts WHERE tenant_id = ? AND series_id = ? AND status = 'pending'
         ${scope === 'following' ? 'AND due_date >= ?' : ''}`,
        scope === 'following' ? [tenantId, acc.series_id, acc.due_date] : [tenantId, acc.series_id]
      );
      targets = t;
      await deleteAccounts(conn, tenantId, targets);
      // a série "sem fim" deixa de gerar novas contas (vira finita) ou some se não sobrou nada
      const [[left]] = await conn.query('SELECT COUNT(*) AS n FROM finance_accounts WHERE series_id = ? AND tenant_id = ?', [acc.series_id, tenantId]);
      if (!left.n) await conn.query('DELETE FROM finance_account_series WHERE id = ? AND tenant_id = ?', [acc.series_id, tenantId]);
      else await conn.query('UPDATE finance_account_series SET occurrences = ? WHERE id = ? AND tenant_id = ? AND occurrences IS NULL', [left.n, acc.series_id, tenantId]);
      await conn.commit();
      broadcast(tenantId, 'finance.deleted');
      return res.json({ success: true, count: targets.length });
    }
    const n = await deleteAccounts(conn, tenantId, targets);
    await conn.commit();
    broadcast(tenantId, 'finance.deleted');
    res.json({ success: true, count: n });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

// ── A receber de pacientes (derivado; sem tabela própria) ────────────────────
// GET /accounts/patient-receivables/annual?year=YYYY
// Visão estilo planilha: todos os pacientes do tenant em linhas e os pagamentos
// efetivamente recebidos em cada mês nas colunas. O valor vem de pagamentos de
// comandas e de entradas manuais no Livro Caixa, sem somar a previsão da comanda.
router.get('/patient-receivables/annual', authMiddleware, canView, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const currentYear = new Date().getFullYear();
  const requestedYear = Number(req.query.year);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear + 10
    ? requestedYear
    : currentYear;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [patients] = await db.query(
    `SELECT id, name, status
     FROM patients
     WHERE tenant_id = ?
     ORDER BY name ASC`,
    [tenantId]
  );

  const [comandaPayments] = await db.query(
    `SELECT cp.id, c.patient_id, c.id AS comanda_id, cp.amount,
            DATE_FORMAT(cp.payment_date, '%Y-%m-%d') AS payment_date,
            DATE_FORMAT(cp.created_at, '%Y-%m-%d %H:%i:%s') AS registered_at,
            cp.payment_method, COALESCE(c.description, 'Comanda') AS description
     FROM comanda_payments cp
     JOIN comandas c ON c.id = cp.comanda_id AND c.tenant_id = cp.tenant_id
     WHERE cp.tenant_id = ? AND cp.status != 'cancelled'
       AND cp.payment_date BETWEEN ? AND ?`,
    [tenantId, from, to]
  );

  const [ledgerPayments] = await db.query(
    `SELECT t.id, t.patient_id, t.amount,
            DATE_FORMAT(t.date, '%Y-%m-%d') AS payment_date,
            DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS registered_at,
            t.payment_method, COALESCE(t.description, t.category, 'Lançamento no Livro Caixa') AS description
     FROM financial_transactions t
     WHERE t.tenant_id = ? AND t.type = 'income' AND t.patient_id IS NOT NULL
       AND t.comanda_id IS NULL AND COALESCE(t.origin_module, '') != 'COMANDA'
       AND COALESCE(t.source, '') != 'comanda_forecast'
       AND COALESCE(t.status, 'paid') IN ('paid', 'confirmed')
       AND DATE(t.date) BETWEEN ? AND ?`,
    [tenantId, from, to]
  );

  const byPatient = new Map();
  for (const patient of patients) {
    byPatient.set(patient.id, {
      patient_id: patient.id,
      patient_name: patient.name || 'Paciente sem nome',
      status: patient.status === 'active' ? 'active' : 'inactive',
      months: Array.from({ length: 12 }, () => ({ amount: 0, payments: [] })),
      total_paid: 0,
    });
  }

  const addPayment = (payment, source) => {
    const patient = byPatient.get(payment.patient_id);
    const date = String(payment.payment_date || '');
    const month = Number(date.slice(5, 7));
    const amount = Number(payment.amount || 0);
    if (!patient || month < 1 || month > 12 || !(amount > 0)) return;
    const detail = {
      id: payment.id,
      source,
      amount,
      payment_date: date,
      registered_at: payment.registered_at || null,
      payment_method: payment.payment_method || null,
      description: payment.description || (source === 'comanda' ? 'Comanda' : 'Lançamento no Livro Caixa'),
      comanda_id: payment.comanda_id || null,
    };
    patient.months[month - 1].amount = Math.round((patient.months[month - 1].amount + amount) * 100) / 100;
    patient.months[month - 1].payments.push(detail);
    patient.total_paid = Math.round((patient.total_paid + amount) * 100) / 100;
  };

  comandaPayments.forEach(payment => addPayment(payment, 'comanda'));
  ledgerPayments.forEach(payment => addPayment(payment, 'livro_caixa'));

  const [paymentYears] = await db.query(
    `SELECT DISTINCT year_value FROM (
       SELECT YEAR(payment_date) AS year_value
       FROM comanda_payments
       WHERE tenant_id = ? AND payment_date IS NOT NULL AND status != 'cancelled'
       UNION
       SELECT YEAR(date) AS year_value
       FROM financial_transactions
       WHERE tenant_id = ? AND type = 'income' AND patient_id IS NOT NULL
         AND comanda_id IS NULL AND COALESCE(origin_module, '') != 'COMANDA'
         AND COALESCE(source, '') != 'comanda_forecast'
         AND COALESCE(status, 'paid') IN ('paid', 'confirmed')
     ) years
     WHERE year_value IS NOT NULL
     ORDER BY year_value DESC`,
    [tenantId, tenantId]
  );
  const years = Array.from(new Set([currentYear, year, ...paymentYears.map(item => Number(item.year_value))])).sort((a, b) => b - a);

  res.json({ year, years, patients: Array.from(byPatient.values()) });
}));

// GET /accounts/patient-receivables?month=YYYY-MM&from=YYYY-MM-DD&to=YYYY-MM-DD
// Linhas: (a) comandas cujo vencimento (livrocaixa_date > data da sessão > criação) cai no mês; (b) lançamentos manuais
// de entrada de paciente no Livro Caixa sem comanda. Só expõe nome, serviço/descrição, datas, valores e status.
router.get('/patient-receivables', authMiddleware, canView, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ''));
  const now = new Date();
  const year = m ? Number(m[1]) : now.getFullYear();
  const mon = m ? Number(m[2]) : now.getMonth() + 1;
  const monthFrom = fmt(year, mon, 1);
  const monthTo = fmt(year, mon, new Date(Date.UTC(year, mon, 0)).getUTCDate());
  const requestedFrom = isoDate(req.query.from);
  const requestedTo = isoDate(req.query.to);
  const from = requestedFrom || monthFrom;
  const to = requestedTo || monthTo;
  const today = todayISO();

  const [comandas] = await db.query(
    `SELECT c.id, c.patient_id, p.name AS patient_name, c.professional_id, u.name AS professional_name, c.description,
            c.total, c.paid_value, c.payment_method, c.sessions_total, c.sessions_used, c.status AS comanda_status, c.sync_to_livrocaixa,
            DATE_FORMAT(COALESCE(c.livrocaixa_date, DATE(c.start_date), DATE(c.created_at)), '%Y-%m-%d') AS due_date
     FROM comandas c
     LEFT JOIN patients p ON p.id = c.patient_id AND p.tenant_id = c.tenant_id
     LEFT JOIN users u ON u.id = c.professional_id
     WHERE c.tenant_id = ? AND c.patient_id IS NOT NULL AND COALESCE(c.total, 0) > 0
       AND COALESCE(c.status, 'open') NOT IN ('cancelled', 'canceled')
       AND COALESCE(c.livrocaixa_date, DATE(c.start_date), DATE(c.created_at)) BETWEEN ? AND ?`,
    [tenantId, from, to]
  );

  const ids = comandas.map((c) => c.id);
  const payMap = new Map();
  const aptMap = new Map();
  if (ids.length) {
    const [pays] = await db.query(
      `SELECT id, comanda_id, amount, DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date, payment_method
       FROM comanda_payments WHERE tenant_id = ? AND comanda_id IN (?) AND status != 'cancelled' ORDER BY payment_date ASC, id ASC`,
      [tenantId, ids]
    );
    for (const p of pays) {
      if (!payMap.has(p.comanda_id)) payMap.set(p.comanda_id, []);
      payMap.get(p.comanda_id).push({ id: p.id, amount: Number(p.amount), date: p.payment_date, method: p.payment_method });
    }
    const [apts] = await db.query(
      `SELECT comanda_id, DATE_FORMAT(start_time, '%Y-%m-%d') AS d, status FROM appointments
       WHERE tenant_id = ? AND comanda_id IN (?) AND status != 'cancelled' ORDER BY start_time ASC`,
      [tenantId, ids]
    );
    for (const a of apts) {
      if (!aptMap.has(a.comanda_id)) aptMap.set(a.comanda_id, []);
      aptMap.get(a.comanda_id).push({ date: a.d, status: a.status });
    }
  }

  const rows = comandas.map((c) => {
    const total = Number(c.total);
    const paid = Math.min(Number(c.paid_value || 0), total);
    const payments = payMap.get(c.id) || [];
    return {
      key: `c-${c.id}`, source: 'comanda', source_id: c.id,
      patient_id: c.patient_id, patient_name: c.patient_name || 'Paciente',
      professional_id: c.professional_id, professional_name: c.professional_name || null,
      description: c.description || 'Consulta/Serviço', due_date: c.due_date,
      total, paid, balance: Math.max(0, Math.round((total - paid) * 100) / 100),
      payment_method: payments.length ? payments[payments.length - 1].method : c.payment_method,
      sessions_total: c.sessions_total, sessions_used: c.sessions_used,
      cash_book: !!c.sync_to_livrocaixa, payments, sessions: aptMap.get(c.id) || [],
    };
  });

  const [ledger] = await db.query(
    `SELECT t.id, t.patient_id, p.name AS patient_name, t.description, t.category, t.amount, t.status, t.payment_method,
            DATE_FORMAT(COALESCE(t.due_date, t.date), '%Y-%m-%d') AS due_date, DATE_FORMAT(t.date, '%Y-%m-%d') AS tx_date
     FROM financial_transactions t
     JOIN patients p ON p.id = t.patient_id AND p.tenant_id = t.tenant_id
     WHERE t.tenant_id = ? AND t.type = 'income' AND t.patient_id IS NOT NULL AND t.comanda_id IS NULL
       AND COALESCE(t.origin_module, '') NOT IN ('COMANDA')
       AND COALESCE(t.source, '') != 'comanda_forecast'
       AND COALESCE(t.status, 'paid') NOT IN ('cancelled', 'canceled')
       AND COALESCE(t.due_date, t.date) BETWEEN ? AND ?`,
    [tenantId, from, to]
  );
  for (const t of ledger) {
    const total = Number(t.amount);
    const isPaid = ['paid', 'confirmed'].includes(String(t.status));
    rows.push({
      key: `t-${t.id}`, source: 'ledger', source_id: t.id,
      patient_id: t.patient_id, patient_name: t.patient_name, professional_id: null, professional_name: null,
      description: t.description || t.category || 'Lançamento', due_date: t.due_date,
      total, paid: isPaid ? total : 0, balance: isPaid ? 0 : total,
      payment_method: t.payment_method, sessions_total: null, sessions_used: null,
      cash_book: true, payments: isPaid ? [{ id: t.id, amount: total, date: t.tx_date, method: t.payment_method }] : [], sessions: [],
    });
  }

  for (const r of rows) {
    r.status = r.balance <= 0.004 ? 'paid' : r.due_date < today ? 'overdue' : r.paid > 0 ? 'partial' : 'pending';
  }
  rows.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.patient_name.localeCompare(b.patient_name, 'pt-BR'));
  res.json({ month: `${year}-${String(mon).padStart(2, '0')}`, from, to, rows });
}));

// POST /accounts/patient-receivables/ledger/:id/settle — baixa de lançamento manual pendente de paciente.
// Total: marca o lançamento como pago. Parcial: cria um lançamento pago com o valor recebido e reduz o pendente.
router.post('/patient-receivables/ledger/:id/settle', authMiddleware, canManage, wrap(async (req, res) => {
  const tenantId = req.user.tenant_id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT * FROM financial_transactions WHERE id = ? AND tenant_id = ? AND type = 'income' AND comanda_id IS NULL
         AND COALESCE(origin_module, '') != 'COMANDA' FOR UPDATE`, [req.params.id, tenantId]);
    const tx = rows[0];
    if (!tx) { await conn.rollback(); return res.status(404).json({ error: 'Lançamento não encontrado' }); }
    if (['paid', 'confirmed'].includes(String(tx.status))) { await conn.rollback(); return res.status(409).json({ error: 'Lançamento já está pago' }); }
    const total = Number(tx.amount);
    const amount = req.body?.amount !== undefined ? money(req.body.amount) : total;
    if (!(amount > 0)) { await conn.rollback(); return res.status(400).json({ error: 'Valor inválido' }); }
    const date = isoDate(req.body?.payment_date) || todayISO();
    const method = req.body?.payment_method ? String(req.body.payment_method).slice(0, 50) : tx.payment_method;
    const notes = req.body?.notes ? String(req.body.notes) : null;
    if (amount >= total - 0.004) {
      await conn.query(
        `UPDATE financial_transactions SET status = 'paid', date = ?, payment_method = ?, observation = COALESCE(?, observation) WHERE id = ? AND tenant_id = ?`,
        [date, method, notes, tx.id, tenantId]
      );
    } else {
      await conn.query(
        `INSERT INTO financial_transactions (tenant_id, type, category, description, amount, date, patient_id, payment_method, status,
           payer_name, payer_cpf, beneficiary_name, beneficiary_cpf, observation, due_date, source, created_by)
         VALUES (?, 'income', ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, tx.category, tx.description, amount, date, tx.patient_id, method, tx.payer_name, tx.payer_cpf, tx.beneficiary_name,
          tx.beneficiary_cpf, notes, tx.due_date || tx.date, tx.source || 'direct', req.user.id]
      );
      await conn.query('UPDATE financial_transactions SET amount = ? WHERE id = ? AND tenant_id = ?',
        [Math.round((total - amount) * 100) / 100, tx.id, tenantId]);
    }
    await conn.commit();
    broadcast(tenantId, 'finance.updated');
    res.json({ success: true });
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

module.exports = router;
