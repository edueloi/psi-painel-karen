const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authorize } = require('../middleware/auth');

router.use(authorize('super_admin'));

// GET /tenants
router.get('/', async (req, res) => {
  try {
    const [tenants] = await db.query(`
      SELECT
        t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone,
        t.active, t.created_at,
        p.id as plan_id, p.name as plan_name, p.price as plan_price,
        p.max_users, p.max_patients,
        COUNT(DISTINCT u.id) as user_count,
        MAX(CASE WHEN u.role = 'admin' THEN u.name END) as admin_name,
        MAX(CASE WHEN u.role = 'admin' THEN u.email END) as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role != 'super_admin'
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar tenants' });
  }
});

// GET /tenants/mrr-history - evolução MRR últimos 6 meses
router.get('/mrr-history', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(t.created_at, '%Y-%m') as month,
        SUM(p.price) as mrr
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
      ORDER BY month ASC
    `);
    // Gera array dos últimos 6 meses com MRR acumulado
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const label = `${shortNames[d.getMonth()]}`;
      const found = rows.find((r) => r.month === key);
      months.push({ month: label, mrr: found ? parseFloat(found.mrr) : 0 });
    }
    res.json(months);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico MRR' });
  }
});

// GET /tenants/stats - métricas para dashboard
router.get('/stats', async (req, res) => {
  try {
    const [[counts]] = await db.query(`
      SELECT
        COUNT(DISTINCT t.id) as total_tenants,
        SUM(t.active) as active_tenants,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT pt.id) as total_patients
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role != 'super_admin'
      LEFT JOIN patients pt ON pt.tenant_id = t.id
    `);

    const [[revenue]] = await db.query(`
      SELECT COALESCE(SUM(p.price), 0) as mrr
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.active = true
    `);

    const [byPlan] = await db.query(`
      SELECT p.name as plan_name, COUNT(t.id) as count, p.price
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      WHERE t.active = true
      GROUP BY p.id
    `);

    res.json({
      ...counts,
      mrr: parseFloat(revenue.mrr),
      by_plan: byPlan,
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
      SELECT t.*, p.name as plan_name, p.price as plan_price, p.max_users, p.max_patients,
             u.name as admin_name, u.email as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id
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
      'INSERT INTO tenants (name, slug, cnpj_cpf, phone, plan_id) VALUES (?, ?, ?, ?, ?)',
      [company_name, slug, cnpj_cpf || null, phone || null, plan_id || null]
    );

    const tenantId = tenantResult.insertId;
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [tenantId, admin_name || 'Administrador', admin_email, hashedPassword, 'admin']
    );

    const [tenant] = await db.query(`
      SELECT t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone, t.active,
             p.name as plan_name, p.price as plan_price,
             u.name as admin_name, u.email as admin_email
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      WHERE t.id = ?
      GROUP BY t.id
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
    const { company_name, cnpj_cpf, phone, plan_id, active } = req.body;

    await db.query(
      `UPDATE tenants SET
        name = COALESCE(?, name),
        cnpj_cpf = COALESCE(?, cnpj_cpf),
        phone = COALESCE(?, phone),
        plan_id = COALESCE(?, plan_id),
        active = COALESCE(?, active)
       WHERE id = ?`,
      [company_name, cnpj_cpf, phone, plan_id, active !== undefined ? active : undefined, req.params.id]
    );

    const [updated] = await db.query(`
      SELECT t.id, t.name as company_name, t.slug, t.cnpj_cpf, t.phone, t.active,
             p.name as plan_name, p.price as plan_price
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tenant' });
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
