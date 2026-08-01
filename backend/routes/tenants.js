const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { DEFAULT_FORMS } = require('../default_forms_data');

async function createDefaultFormsForTenant(tenantId, adminUserId) {
  for (const form of DEFAULT_FORMS) {
    const fields = JSON.stringify({
      questions: form.questions,
      interpretations: form.interpretations || [],
      theme: null,
    });
    const hash = crypto.randomBytes(8).toString('hex');
    try {
      await db.query(
        'INSERT INTO forms (tenant_id, title, description, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, form.title, form.description || null, fields, 1, hash, adminUserId]
      );
    } catch (e) {
      // Ignora duplicata de hash — improvável mas seguro
    }
  }
}

async function ensureTenantSchema() {
  try {
    const [cols] = await db.query('DESCRIBE tenants');
    const hasCol = (name) => cols.find(c => c.Field === name);

    if (!hasCol('expires_at')) {
      await db.query('ALTER TABLE tenants ADD COLUMN expires_at DATETIME AFTER phone');
      await db.query('UPDATE tenants SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY) WHERE expires_at IS NULL');
    }
    if (!hasCol('status')) {
      await db.query("ALTER TABLE tenants ADD COLUMN status ENUM('active', 'blocked', 'expired') DEFAULT 'active' AFTER expires_at");
    }
    if (!hasCol('last_billing_at')) {
      await db.query('ALTER TABLE tenants ADD COLUMN last_billing_at DATETIME AFTER status');
    }
    if (!hasCol('billing_exempt')) {
      await db.query('ALTER TABLE tenants ADD COLUMN billing_exempt TINYINT(1) NOT NULL DEFAULT 0 AFTER last_billing_at');
    }
  } catch (err) {
    console.error('Error ensuring tenant schema:', err.message);
  }
}

router.use(authorize('super_admin'));

// GET /tenants
router.get('/', async (req, res) => {
  try {
    await ensureTenantSchema();
    const [tenants] = await db.query(`
      SELECT
        t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone,
        t.active, t.created_at, t.expires_at, t.status, t.last_billing_at, t.trial_ends_at, t.billing_exempt,
        p.id as plan_id, p.name as plan_name, p.price as plan_price,
        p.max_users, p.max_patients,
        COUNT(DISTINCT u.id) as user_count,
        MAX(CASE WHEN u.role = 'admin' THEN u.name END) as admin_name,
        MAX(CASE WHEN u.role = 'admin' THEN u.email END) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role != 'super_admin'
      WHERE t.id != 1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar tenants' });
  }
});

// GET /tenants/mrr-history?months=6 - evolução MRR nos últimos N meses (padrão 6)
// MRR real: soma das faturas de assinatura efetivamente pagas (subscription_invoices,
// status='approved'), não o preço cadastrado do plano — que pode estar com valor de
// teste/promocional e não reflete o que realmente entrou.
router.get('/mrr-history', async (req, res) => {
  try {
    const monthsCount = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(paid_at, '%Y-%m') as month,
        SUM(amount) as mrr
      FROM subscription_invoices
      WHERE status = 'approved' AND paid_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
      ORDER BY month ASC
    `, [monthsCount]);
    // Gera array dos últimos N meses com MRR real (0 nos meses sem fatura aprovada)
    const months = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${shortNames[d.getMonth()]}${monthsCount > 12 ? `/${String(d.getFullYear()).slice(2)}` : ''}`;
      const found = rows.find((r) => r.month === key);
      months.push({ month: label, mrr: found ? parseFloat(found.mrr) : 0 });
    }
    res.json(months);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico MRR' });
  }
});

// GET /tenants/stats?days=30 - métricas para dashboard (padrão: últimos 30 dias)
router.get('/stats', async (req, res) => {
  try {
    const daysCount = Math.min(730, Math.max(1, parseInt(req.query.days) || 30));

    // Contagem de tenants/usuários/pacientes separada da agregação de receita:
    // fazer LEFT JOIN com users E patients na mesma query gera produto cartesiano
    // (cada linha de tenants é multiplicada por usuários × pacientes), inflando
    // qualquer SUM/contagem não-DISTINCT sobre colunas de tenants (ex: t.active).
    const [[counts]] = await db.query(`
      SELECT
        COUNT(*) as total_tenants,
        SUM(active) as active_tenants
      FROM tenants
      WHERE id != 1
    `);
    const [[userCounts]] = await db.query(`
      SELECT COUNT(*) as total_users FROM users WHERE tenant_id != 1 AND role != 'super_admin'
    `);
    const [[patientCounts]] = await db.query(`
      SELECT COUNT(*) as total_patients FROM patients WHERE tenant_id != 1
    `);

    // MRR real: soma das faturas aprovadas no período (o que de fato entrou),
    // não o preço cadastrado do plano de cada tenant — que pode estar com
    // valor de teste/promocional e distorceria a receita mostrada aqui.
    const [[revenue]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as mrr
      FROM subscription_invoices
      WHERE status = 'approved' AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [daysCount]);

    // Contagem de clínicas por plano (quantidade atual, não é receita)
    const [byPlanCount] = await db.query(`
      SELECT p.id as plan_id, p.name as plan_name, COUNT(t.id) as count
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.id != 1 AND t.active = true AND t.billing_exempt = 0
      GROUP BY p.id
    `);

    // Receita real por plano no período (faturas aprovadas)
    const [revenueByPlan] = await db.query(`
      SELECT plan_id, COALESCE(SUM(amount), 0) as revenue
      FROM subscription_invoices
      WHERE status = 'approved' AND paid_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY plan_id
    `, [daysCount]);
    const revenueMap = Object.fromEntries(revenueByPlan.map(r => [r.plan_id, parseFloat(r.revenue)]));
    const byPlan = byPlanCount.map(p => ({ ...p, price: revenueMap[p.plan_id] || 0 }));

    res.json({
      ...counts,
      ...userCounts,
      ...patientCounts,
      mrr: parseFloat(revenue.mrr),
      by_plan: byPlan,
      period_days: daysCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET /tenants/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.id, t.name, t.slug, t.cnpj_cpf, t.phone, t.plan_id, t.active, t.created_at,
             t.expires_at, t.status, t.trial_ends_at, t.billing_exempt,
             p.name as plan_name, p.price as plan_price, p.max_users, p.max_patients,
             MAX(u.name) as admin_name, MAX(u.email) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id, t.name, t.slug, t.cnpj_cpf, t.phone, t.plan_id, t.active, t.created_at,
               t.expires_at, t.status, t.trial_ends_at, t.billing_exempt,
               p.name, p.price, p.max_users, p.max_patients
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar tenant' });
  }
});

// POST /tenants - Criar nova clínica
// Campos: company_name, cnpj_cpf, phone, admin_name, admin_email, password, plan_id
router.post('/', async (req, res) => {
  try {
    const { company_name, cnpj_cpf, phone, admin_name, admin_email, password, plan_id } = req.body;

    if (!company_name || !admin_email || !password) {
      return res.status(400).json({ error: 'Nome da clínica, email e senha são obrigatórios' });
    }

    // Gerar slug
    let slug = company_name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50) || 'clinica';

    const [existing] = await db.query('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const [tenantResult] = await db.query(
      'INSERT INTO tenants (name, slug, cnpj_cpf, phone, plan_id, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
      [company_name, slug, cnpj_cpf || null, phone || null, plan_id || null]
    );

    const tenantId = tenantResult.insertId;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await db.query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [tenantId, admin_name || 'Administrador', admin_email, hashedPassword, 'admin']
    );

    // Cria formulários psicológicos padrão para o novo tenant
    await createDefaultFormsForTenant(tenantId, userResult.insertId);

    const [tenant] = await db.query(`
      SELECT t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone, t.active,
             p.name as plan_name, p.price as plan_price,
             MAX(u.name) as admin_name, MAX(u.email) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id, t.name, t.slug, t.cnpj_cpf, t.phone, t.active, p.name, p.price
    `, [tenantId]);

    res.status(201).json(tenant[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tenant' });
  }
});

// PUT /tenants/:id
router.put('/:id', async (req, res) => {
  try {
    const { company_name, cnpj_cpf, phone, plan_id, active, admin_email, admin_name, expires_at, status, trial_ends_at, billing_exempt } = req.body;

    // Update tenant basic data
    // trial_ends_at é tratado à parte pois precisa suportar ser explicitamente
    // limpo (null) ao converter um trial em assinatura ativa — COALESCE não permite isso.
    await db.query(
      `UPDATE tenants SET
        name = COALESCE(?, name),
        cnpj_cpf = COALESCE(?, cnpj_cpf),
        phone = COALESCE(?, phone),
        plan_id = COALESCE(?, plan_id),
        active = COALESCE(?, active),
        expires_at = COALESCE(?, expires_at),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [company_name, cnpj_cpf, phone, plan_id, active !== undefined ? active : undefined, expires_at, status, req.params.id]
    );

    if (trial_ends_at !== undefined) {
      await db.query('UPDATE tenants SET trial_ends_at = ? WHERE id = ?', [trial_ends_at || null, req.params.id]);
    }

    if (billing_exempt !== undefined) {
      await db.query('UPDATE tenants SET billing_exempt = ? WHERE id = ?', [billing_exempt ? 1 : 0, req.params.id]);
    }

    // Update admin user if provided
    if (admin_email || admin_name) {
      await db.query(
        'UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name) WHERE tenant_id = ? AND role = "admin"',
        [admin_email, admin_name, req.params.id]
      );
    }

    const [updated] = await db.query(`
      SELECT t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone, t.active, t.expires_at, t.status, t.trial_ends_at, t.billing_exempt,
             p.name as plan_name, p.price as plan_price,
             MAX(u.name) as admin_name, MAX(u.email) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tenant' });
  }
});

// POST /tenants/:id/convert-trial — converte manualmente um tenant em trial para assinatura ativa
router.post('/:id/convert-trial', async (req, res) => {
  try {
    const { plan_id, months } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'Selecione um plano.' });

    const monthsToAdd = Math.max(1, parseInt(months) || 1);
    const [[tenant]] = await db.query('SELECT expires_at FROM tenants WHERE id = ?', [req.params.id]);
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    const baseDate = tenant.expires_at && new Date(tenant.expires_at) > new Date() ? new Date(tenant.expires_at) : new Date();
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsToAdd);

    await db.query(
      `UPDATE tenants SET
        plan_id = ?,
        trial_ends_at = NULL,
        status = 'active',
        expires_at = ?,
        last_billing_at = NOW()
       WHERE id = ?`,
      [plan_id, newExpiresAt, req.params.id]
    );

    const [updated] = await db.query(`
      SELECT t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone, t.active, t.expires_at, t.status, t.trial_ends_at, t.billing_exempt,
             p.name as plan_name, p.price as plan_price,
             MAX(u.name) as admin_name, MAX(u.email) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao converter trial em assinatura' });
  }
});

// DELETE /tenants/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM tenants WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar tenant' });
  }
});

module.exports = router;
