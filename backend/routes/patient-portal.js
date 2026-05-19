const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Upload de comprovantes ───────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../public/uploads/portal-receipts');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

async function resolveSession(req, res) {
  const sessionToken = req.headers['x-portal-token'] || req.query.session;
  if (!sessionToken) return null;
  const [rows] = await db.query(
    `SELECT pps.*, p.full_name, p.email, p.whatsapp, p.tenant_id, p.psychologist_id
     FROM patient_portal_sessions pps
     JOIN patients p ON p.id = pps.patient_id
     WHERE pps.session_token = ? AND pps.expires_at > NOW()`,
    [sessionToken]
  );
  return rows[0] || null;
}

// ─── AUTH: validar token de convite / auto-cadastro ──────────────────────────
// GET /patient-portal/invite/:token
router.get('/invite/:token', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ppt.*,
              u.name AS professional_name, u.specialty, u.crp, u.avatar_url,
              ten.company_name,
              p.full_name AS patient_name, p.email AS patient_email
       FROM patient_portal_tokens ppt
       LEFT JOIN users u ON u.id = ppt.professional_id
       LEFT JOIN tenants ten ON ten.id = ppt.tenant_id
       LEFT JOIN patients p ON p.id = ppt.patient_id
       WHERE ppt.token = ?`,
      [req.params.token]
    );
    const tk = rows[0];
    if (!tk) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    if (tk.expires_at && new Date(tk.expires_at) < new Date())
      return res.status(410).json({ error: 'Este link expirou.' });

    res.json({
      valid: true,
      self_register: Boolean(tk.self_register),
      allow_self_schedule: Boolean(tk.allow_self_schedule),
      require_approval: Boolean(tk.require_approval),
      professional_name: tk.professional_name,
      specialty: tk.specialty,
      crp: tk.crp,
      company_name: tk.company_name,
      avatar_url: tk.avatar_url,
      patient_name: tk.patient_name,
      patient_email: tk.patient_email,
      tenant_id: tk.tenant_id,
      label: tk.label,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/invite/:token/login — autentica paciente via token de convite
router.post('/invite/:token/login', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ppt.*, p.id AS pid, p.full_name, p.email, p.tenant_id
       FROM patient_portal_tokens ppt
       JOIN patients p ON p.id = ppt.patient_id
       WHERE ppt.token = ? AND (ppt.expires_at IS NULL OR ppt.expires_at > NOW())`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Link inválido ou expirado.' });
    const row = rows[0];

    const sessionToken = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    await db.query(
      `INSERT INTO patient_portal_sessions (tenant_id, patient_id, session_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [row.tenant_id, row.pid, sessionToken, expiresAt]
    );

    res.json({
      session_token: sessionToken,
      patient_id: row.pid,
      patient_name: row.full_name,
      tenant_id: row.tenant_id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/invite/:token/register — auto-cadastro via link
router.post('/invite/:token/register', async (req, res) => {
  try {
    const [tkRows] = await db.query(
      `SELECT * FROM patient_portal_tokens WHERE token = ? AND self_register = 1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [req.params.token]
    );
    if (!tkRows[0]) return res.status(404).json({ error: 'Link inválido.' });
    const tk = tkRows[0];

    const { full_name, email, whatsapp, birth_date, cpf } = req.body;
    if (!full_name) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const [ins] = await db.query(
      `INSERT INTO patients (tenant_id, full_name, email, whatsapp, birth_date, cpf_cnpj,
        psychologist_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [tk.tenant_id, full_name, email || null, whatsapp || null,
       birth_date || null, cpf || null, tk.professional_id || null]
    );
    const patientId = ins.insertId;

    await db.query(
      `UPDATE patient_portal_tokens SET patient_id = ?, is_used = 1 WHERE id = ?`,
      [patientId, tk.id]
    );

    const sessionToken = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO patient_portal_sessions (tenant_id, patient_id, session_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [tk.tenant_id, patientId, sessionToken, expiresAt]
    );

    res.json({ session_token: sessionToken, patient_id: patientId, patient_name: full_name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao registrar.' });
  }
});

// ─── Middleware de sessão para rotas autenticadas do portal ───────────────────
async function portalAuth(req, res, next) {
  const session = await resolveSession(req, res);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  req.portalSession = session;
  next();
}

// ─── PERFIL DO PACIENTE ───────────────────────────────────────────────────────
// GET /patient-portal/me
router.get('/me', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT p.id, p.full_name, p.email, p.whatsapp, p.phone, p.birth_date, p.gender,
              p.cpf_cnpj, p.street, p.house_number, p.neighborhood, p.city, p.state,
              p.address_zip, p.health_plan, p.emergency_contacts, p.status, p.avatar_url,
              u.name AS professional_name, u.specialty, u.crp, u.avatar_url AS prof_avatar,
              ten.company_name
       FROM patients p
       LEFT JOIN users u ON u.id = p.psychologist_id
       LEFT JOIN tenants ten ON ten.id = p.tenant_id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [patient_id, tenant_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });
    const p = rows[0];
    if (p.emergency_contacts && typeof p.emergency_contacts === 'string') {
      try { p.emergency_contacts = JSON.parse(p.emergency_contacts); } catch { p.emergency_contacts = []; }
    }
    res.json(p);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PATCH /patient-portal/me — atualizar dados básicos
router.patch('/me', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const allowed = ['full_name', 'email', 'whatsapp', 'phone', 'birth_date', 'gender',
                     'street', 'house_number', 'neighborhood', 'city', 'state',
                     'address_zip', 'health_plan', 'emergency_contacts'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (updates.emergency_contacts && typeof updates.emergency_contacts !== 'string') {
      updates.emergency_contacts = JSON.stringify(updates.emergency_contacts);
    }
    if (!Object.keys(updates).length) return res.json({ ok: true });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE patients SET ${sets}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [...Object.values(updates), patient_id, tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

// ─── CONSULTAS DO PACIENTE ────────────────────────────────────────────────────
// GET /patient-portal/appointments
router.get('/appointments', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT a.id, a.start_date, a.end_date, a.status, a.type, a.modality,
              a.meeting_url, a.notes, a.duration_minutes,
              u.name AS professional_name, u.specialty, u.avatar_url AS prof_avatar,
              s.name AS service_name, s.price AS service_price
       FROM appointments a
       LEFT JOIN users u ON u.id = a.professional_id
       LEFT JOIN services s ON s.id = a.service_id
       WHERE a.patient_id = ? AND a.tenant_id = ?
         AND a.type != 'bloqueio' AND a.type != 'pessoal'
       ORDER BY a.start_date DESC
       LIMIT 100`,
      [patient_id, tenant_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/schedule-requests — solicitar agendamento
router.post('/schedule-requests', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const { professional_id, preferred_date, preferred_time, preferred_modality, notes } = req.body;
    if (!preferred_date) return res.status(400).json({ error: 'Data preferida obrigatória.' });

    const [ins] = await db.query(
      `INSERT INTO patient_portal_schedule_requests
       (tenant_id, patient_id, professional_id, preferred_date, preferred_time,
        preferred_modality, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [tenant_id, patient_id, professional_id || null, preferred_date,
       preferred_time || null, preferred_modality || 'online', notes || null]
    );
    res.json({ id: ins.insertId, status: 'pending' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao solicitar agendamento.' });
  }
});

// GET /patient-portal/schedule-requests
router.get('/schedule-requests', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT r.*, u.name AS professional_name, u.specialty
       FROM patient_portal_schedule_requests r
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.patient_id = ? AND r.tenant_id = ?
       ORDER BY r.created_at DESC LIMIT 30`,
      [patient_id, tenant_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /patient-portal/schedule-requests/:id — cancelar solicitação pendente
router.delete('/schedule-requests/:id', portalAuth, async (req, res) => {
  try {
    const { patient_id } = req.portalSession;
    const [r] = await db.query(
      `SELECT id, status FROM patient_portal_schedule_requests WHERE id = ? AND patient_id = ?`,
      [req.params.id, patient_id]
    );
    if (!r[0]) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    if (r[0].status !== 'pending') return res.status(409).json({ error: 'Não é possível cancelar esta solicitação.' });
    await db.query(`DELETE FROM patient_portal_schedule_requests WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PATCH /patient-portal/appointments/:id/cancel — cancelar consulta agendada
router.patch('/appointments/:id/cancel', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT id, status, start_date FROM appointments WHERE id = ? AND patient_id = ? AND tenant_id = ?`,
      [req.params.id, patient_id, tenant_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Consulta não encontrada.' });
    const appt = rows[0];
    if (!['scheduled', 'confirmed'].includes(appt.status))
      return res.status(409).json({ error: 'Esta consulta não pode ser cancelada.' });
    // Só pode cancelar com pelo menos 2h de antecedência
    const start = new Date(appt.start_date);
    const now = new Date();
    const diffHours = (start - now) / 3600000;
    if (diffHours < 2)
      return res.status(409).json({ error: 'Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.' });

    await db.query(
      `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────
// GET /patient-portal/payments
router.get('/payments', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT p.*,
              a.start_date AS appointment_date, a.status AS appointment_status,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', att.id, 'file_name', att.file_name, 'file_url', att.file_url, 'file_type', att.file_type))
               FROM patient_portal_payment_attachments att WHERE att.payment_id = p.id) AS attachments
       FROM patient_portal_payments p
       LEFT JOIN appointments a ON a.id = p.appointment_id
       WHERE p.patient_id = ? AND p.tenant_id = ?
       ORDER BY p.created_at DESC`,
      [patient_id, tenant_id]
    );
    res.json(rows.map(r => ({
      ...r,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
    })));
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/payments — declarar pagamento
router.post('/payments', portalAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const { appointment_id, amount, payment_method, payment_date, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'Valor e data são obrigatórios.' });

    const [ins] = await db.query(
      `INSERT INTO patient_portal_payments
       (tenant_id, patient_id, appointment_id, amount, payment_method, payment_date, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [tenant_id, patient_id, appointment_id || null, parseFloat(amount),
       payment_method || 'pix', payment_date, notes || null]
    );
    const paymentId = ins.insertId;

    if (req.files && req.files.length) {
      for (const file of req.files) {
        const fileUrl = `/uploads/portal-receipts/${file.filename}`;
        await db.query(
          `INSERT INTO patient_portal_payment_attachments (payment_id, file_name, file_url, file_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [paymentId, file.originalname, fileUrl, file.mimetype, file.size]
        );
      }
    }

    res.json({ id: paymentId, status: 'pending' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao registrar pagamento.' });
  }
});

// POST /patient-portal/payments/:id/attachments — adicionar comprovante
router.post('/payments/:id/attachments', portalAuth, upload.array('files', 5), async (req, res) => {
  try {
    const { patient_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT id FROM patient_portal_payments WHERE id = ? AND patient_id = ?`,
      [req.params.id, patient_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    const inserted = [];
    for (const file of (req.files || [])) {
      const fileUrl = `/uploads/portal-receipts/${file.filename}`;
      const [r] = await db.query(
        `INSERT INTO patient_portal_payment_attachments (payment_id, file_name, file_url, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, file.originalname, fileUrl, file.mimetype, file.size]
      );
      inserted.push({ id: r.insertId, file_name: file.originalname, file_url: fileUrl });
    }
    res.json(inserted);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao anexar.' });
  }
});

// ─── PROFISSIONAIS DISPONÍVEIS ────────────────────────────────────────────────
// GET /patient-portal/professionals
router.get('/professionals', portalAuth, async (req, res) => {
  try {
    const { tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT id, name, specialty, crp, avatar_url FROM users
       WHERE tenant_id = ? AND role = 'profissional' AND active = 1 ORDER BY name`,
      [tenant_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── ADMIN: gerar token de convite (rota protegida pelo auth principal) ───────
// Todas as rotas abaixo exigem o JWT do profissional (authMiddleware já aplicado antes de /patient-portal)

// POST /patient-portal/tokens — gerar link de convite para paciente
router.post('/tokens', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { patient_id, label, expires_in_days, self_register,
            allow_self_schedule, require_approval } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id obrigatório.' });

    const token = genToken();
    let expiresAt = null;
    if (expires_in_days && expires_in_days > 0) {
      expiresAt = new Date(Date.now() + parseInt(expires_in_days) * 24 * 60 * 60 * 1000);
    }

    await db.query(
      `INSERT INTO patient_portal_tokens
       (tenant_id, patient_id, professional_id, token, label, expires_at,
        self_register, allow_self_schedule, require_approval, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.tenant_id, patient_id, req.user.id, token,
       label || 'Portal do Paciente',
       expiresAt, self_register ? 1 : 0,
       allow_self_schedule !== false ? 1 : 0,
       require_approval !== false ? 1 : 0,
       req.user.id]
    );

    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/entrar/${token}`;
    res.json({ token, url: portalUrl, expires_at: expiresAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao gerar token.' });
  }
});

// GET /patient-portal/tokens — listar tokens do paciente
router.get('/tokens', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id obrigatório.' });
    const [rows] = await db.query(
      `SELECT id, token, label, expires_at, is_used, self_register,
              allow_self_schedule, require_approval, created_at
       FROM patient_portal_tokens
       WHERE patient_id = ? AND tenant_id = ?
       ORDER BY created_at DESC`,
      [patient_id, req.user.tenant_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /patient-portal/tokens/:id — revogar token
router.delete('/tokens/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    await db.query(
      `DELETE FROM patient_portal_tokens WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── ADMIN: ver solicitações de agendamento ───────────────────────────────────
// GET /patient-portal/admin/schedule-requests
router.get('/admin/schedule-requests', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const [rows] = await db.query(
      `SELECT r.*, p.full_name AS patient_name, p.whatsapp AS patient_whatsapp,
              u.name AS professional_name
       FROM patient_portal_schedule_requests r
       JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.tenant_id = ?
       ORDER BY r.created_at DESC LIMIT 100`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PATCH /patient-portal/admin/schedule-requests/:id
router.patch('/admin/schedule-requests/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { status, appointment_id } = req.body;
    await db.query(
      `UPDATE patient_portal_schedule_requests SET status = ?, appointment_id = ?,
       reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [status, appointment_id || null, req.user.id, req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── ADMIN: ver pagamentos declarados pelo paciente ───────────────────────────
// GET /patient-portal/admin/payments
router.get('/admin/payments', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const [rows] = await db.query(
      `SELECT pp.*, pat.full_name AS patient_name,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'file_name', a.file_name, 'file_url', a.file_url, 'file_type', a.file_type))
               FROM patient_portal_payment_attachments a WHERE a.payment_id = pp.id) AS attachments
       FROM patient_portal_payments pp
       JOIN patients pat ON pat.id = pp.patient_id
       WHERE pp.tenant_id = ?
       ORDER BY pp.created_at DESC LIMIT 200`,
      [req.user.tenant_id]
    );
    res.json(rows.map(r => ({
      ...r,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
    })));
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PATCH /patient-portal/admin/payments/:id — confirmar/rejeitar pagamento
router.patch('/admin/payments/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { status } = req.body;
    if (!['confirmed', 'rejected'].includes(status))
      return res.status(400).json({ error: 'Status inválido.' });
    await db.query(
      `UPDATE patient_portal_payments SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [status, req.user.id, req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
