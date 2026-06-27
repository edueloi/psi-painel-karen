const express = require('express');
const { sendPushToPatient } = require('../services/pushService');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// ─── Fuso de Brasília (UTC-3) ─────────────────────────────────────────────────
// O servidor roda em UTC. Para agendamentos do portal usamos o horário civil de
// Brasília: construímos um Date que, ao ser salvo como string "YYYY-MM-DD HH:MM:SS",
// represente o horário local do Brasil corretamente (sem o deslocamento de 3h).
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3

// Monta a string "YYYY-MM-DD HH:MM:SS" para um horário civil de Brasília.
function brtDateTimeStr(yyyy, mm, dd, h, min) {
  const p = (n) => String(n).padStart(2, '0');
  return `${yyyy}-${p(mm)}-${p(dd)} ${p(h)}:${p(min)}:00`;
}

// "Agora" em horário de Brasília, como objeto Date cujos getters (getHours etc.)
// retornam o horário civil do Brasil.
function nowBRT() {
  return new Date(Date.now() - BRT_OFFSET_MS);
}

// ─── Auto-migrate: garante colunas do portal na tabela patients ──────────────
let portalSchemaReady = false;
async function ensurePortalPatientColumns() {
  if (portalSchemaReady) return;
  const cols = [
    "ALTER TABLE patients ADD COLUMN street VARCHAR(255) NULL",
    "ALTER TABLE patients ADD COLUMN house_number VARCHAR(20) NULL",
    "ALTER TABLE patients ADD COLUMN neighborhood VARCHAR(100) NULL",
    "ALTER TABLE patients ADD COLUMN spouse_phone VARCHAR(20) NULL",
    "ALTER TABLE patients ADD COLUMN emergency_contacts TEXT NULL",
    "ALTER TABLE patients ADD COLUMN portal_email VARCHAR(255) NULL",
    "ALTER TABLE patients ADD COLUMN portal_password_hash VARCHAR(255) NULL",
    "ALTER TABLE patients ADD COLUMN portal_password_set TINYINT(1) DEFAULT 0",
  ];
  for (const sql of cols) {
    try { await db.query(sql); } catch (e) { /* coluna já existe, ignorar */ }
  }
  portalSchemaReady = true;
}

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
  await ensurePortalPatientColumns();
  const sessionToken = req.headers['x-portal-token'] || req.query.session;
  if (!sessionToken) return null;
  const [rows] = await db.query(
    `SELECT pps.*, p.name AS full_name, p.email, p.phone AS whatsapp, p.tenant_id, p.responsible_professional_id AS psychologist_id,
            pps.token_id
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
              ten.name AS company_name,
              p.name AS patient_name, p.email AS patient_email,
              p.portal_password_set
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
    // Bloqueia apenas se é self_register já usado OU se paciente já configurou senha (usa email+senha daqui em diante)
    if (tk.is_used && tk.portal_password_set && !tk.self_register)
      return res.status(410).json({ error: 'Você já possui acesso configurado. Faça login com seu email e senha.' });

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
    console.error('[portal GET invite]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.', detail: e?.message });
  }
});

// POST /patient-portal/invite/:token/login — autentica paciente via token de convite
router.post('/invite/:token/login', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ppt.*, p.id AS pid, p.name AS full_name, p.email, p.tenant_id,
              p.portal_password_set
       FROM patient_portal_tokens ppt
       JOIN patients p ON p.id = ppt.patient_id
       WHERE ppt.token = ? AND (ppt.expires_at IS NULL OR ppt.expires_at > NOW())`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Link inválido ou expirado.' });
    const row = rows[0];

    // Marcar como usado apenas quando paciente já tem senha configurada
    // (nesse caso o link virou desnecessário — paciente usa email+senha)
    if (row.is_used && row.portal_password_set) {
      return res.status(410).json({ error: 'Este link já foi utilizado. Faça login com seu email e senha.' });
    }
    if (!row.is_used) {
      await db.query(`UPDATE patient_portal_tokens SET is_used = 1 WHERE id = ?`, [row.id]);
      db.query(`UPDATE patient_portal_tokens SET used_at = NOW() WHERE id = ?`, [row.id]).catch(() => {});
    }

    const sessionToken = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // sessão válida por 30 dias
    await db.query(
      `INSERT INTO patient_portal_sessions (tenant_id, patient_id, session_token, expires_at, token_id)
       VALUES (?, ?, ?, ?, ?)`,
      [row.tenant_id, row.pid, sessionToken, expiresAt, row.id]
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
      `INSERT INTO patients (tenant_id, name, email, phone, birth_date, cpf,
        responsible_professional_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Ativo', NOW())`,
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

// POST /patient-portal/auth/set-password — define senha após primeiro acesso via link
router.post('/auth/set-password', async (req, res) => {
  try {
    const sessionToken = req.headers['x-portal-token'];
    if (!sessionToken) return res.status(401).json({ error: 'Sessão inválida.' });

    const [rows] = await db.query(
      `SELECT pps.*, p.id AS pid, p.tenant_id
       FROM patient_portal_sessions pps
       JOIN patients p ON p.id = pps.patient_id
       WHERE pps.session_token = ? AND pps.expires_at > NOW()`,
      [sessionToken]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });

    const { email, password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });

    const hash = await bcrypt.hash(password, 10);
    const updates = { portal_password_hash: hash, portal_password_set: 1 };
    if (email && email.trim()) updates.portal_email = email.trim().toLowerCase();

    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE patients SET ${sets} WHERE id = ?`,
      [...Object.values(updates), rows[0].patient_id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[portal set-password]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/auth/login — login com email + senha
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });

    const [rows] = await db.query(
      `SELECT id, name AS full_name, tenant_id, portal_password_hash, portal_password_set
       FROM patients
       WHERE (portal_email = ? OR email = ?) AND portal_password_set = 1
       LIMIT 1`,
      [email.trim().toLowerCase(), email.trim().toLowerCase()]
    );

    if (!rows[0]) return res.status(401).json({ error: 'Email ou senha incorretos.' });
    const patient = rows[0];

    const valid = await bcrypt.compare(password, patient.portal_password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos.' });

    const sessionToken = genToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO patient_portal_sessions (tenant_id, patient_id, session_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [patient.tenant_id, patient.id, sessionToken, expiresAt]
    );

    res.json({
      session_token: sessionToken,
      patient_id: patient.id,
      patient_name: patient.full_name,
      tenant_id: patient.tenant_id,
    });
  } catch (e) {
    console.error('[portal login]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/auth/change-password — alterar senha
router.post('/auth/change-password', async (req, res) => {
  try {
    const sessionToken = req.headers['x-portal-token'];
    if (!sessionToken) return res.status(401).json({ error: 'Sessão inválida.' });

    const [rows] = await db.query(
      `SELECT pps.patient_id, p.portal_password_hash, p.portal_password_set
       FROM patient_portal_sessions pps
       JOIN patients p ON p.id = pps.patient_id
       WHERE pps.session_token = ? AND pps.expires_at > NOW()`,
      [sessionToken]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Sessão inválida.' });

    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });

    if (rows[0].portal_password_set) {
      const valid = await bcrypt.compare(current_password || '', rows[0].portal_password_hash);
      if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.query(
      `UPDATE patients SET portal_password_hash = ?, portal_password_set = 1, updated_at = NOW() WHERE id = ?`,
      [hash, rows[0].patient_id]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/auth/forgot-password — solicita reset de senha
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

    const [rows] = await db.query(
      `SELECT id, name, tenant_id FROM patients
       WHERE (portal_email = ? OR email = ?) AND portal_password_set = 1
       LIMIT 1`,
      [email.trim().toLowerCase(), email.trim().toLowerCase()]
    );

    // Responde sempre com sucesso (não revela se email existe)
    if (!rows[0]) return res.json({ ok: true });

    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

    // Garante coluna portal_reset_token na tabela patients
    try {
      await db.query(`ALTER TABLE patients ADD COLUMN portal_reset_token VARCHAR(64) NULL`);
      await db.query(`ALTER TABLE patients ADD COLUMN portal_reset_expires DATETIME NULL`);
    } catch {}

    await db.query(
      `UPDATE patients SET portal_reset_token = ?, portal_reset_expires = ? WHERE id = ?`,
      [token, expiresAt, rows[0].id]
    );

    const appUrl = process.env.APP_URL || 'https://psiflux.com.br';
    const resetLink = `${appUrl}/portal/reset-password/${token}`;
    const { sendMail, templates } = require('../services/emailService');
    const html = templates.passwordReset({ name: rows[0].name, link: resetLink });
    await sendMail(email.trim(), 'Redefinição de senha — Portal do Paciente', html).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    console.error('[portal forgot-password]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/auth/reset-password — redefine senha com token
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha obrigatórios.' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });

    const [rows] = await db.query(
      `SELECT id FROM patients
       WHERE portal_reset_token = ? AND portal_reset_expires > NOW()
       LIMIT 1`,
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Link inválido ou expirado.' });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `UPDATE patients SET portal_password_hash = ?, portal_password_set = 1,
       portal_reset_token = NULL, portal_reset_expires = NULL, updated_at = NOW()
       WHERE id = ?`,
      [hash, rows[0].id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[portal reset-password]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── Middleware de sessão para rotas autenticadas do portal ───────────────────
async function portalAuth(req, res, next) {
  const session = await resolveSession(req, res);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  req.portalSession = session;
  next();
}

// ─── CONFIGURAÇÕES DO PORTAL (leitura pública via token do paciente) ──────────
// GET /patient-portal/portal-settings
router.get('/portal-settings', portalAuth, async (req, res) => {
  try {
    const { tenant_id } = req.portalSession;
    const [rows] = await db.query('SELECT portal_settings FROM tenants WHERE id = ? LIMIT 1', [tenant_id]);
    const raw = rows[0]?.portal_settings;
    const settings = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    // Expõe apenas campos relevantes ao paciente (sem dados sensíveis de admin)
    res.json({
      pix_key: settings.pix_key || null,
      pix_key_type: settings.pix_key_type || null,
      pix_owner_name: settings.pix_owner_name || null,
      pix_instructions: settings.pix_instructions || null,
      payment_pix_enabled: settings.payment_pix_enabled,
      payment_credit_enabled: settings.payment_credit_enabled,
      payment_debit_enabled: settings.payment_debit_enabled,
      payment_transfer_enabled: settings.payment_transfer_enabled,
      require_payment_before_session: settings.require_payment_before_session,
    });
  } catch (e) {
    res.json({});
  }
});

// ─── PERFIL DO PACIENTE ───────────────────────────────────────────────────────
// GET /patient-portal/me
router.get('/me', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT p.id, p.name AS full_name, p.email,
              p.phone AS whatsapp, p.phone_country,
              p.phone2, p.phone2_country,
              p.birth_date, p.gender,
              p.cpf AS cpf_cnpj,
              p.address,
              COALESCE(p.street, '') AS street,
              COALESCE(p.house_number, '') AS house_number,
              COALESCE(p.neighborhood, '') AS neighborhood,
              p.city, p.state, p.zip_code AS address_zip,
              p.health_plan, p.notes,
              p.marital_status, p.education, p.profession, p.nationality,
              p.has_children, p.children_count, p.minor_children_count,
              p.spouse_name,
              COALESCE(p.spouse_phone, '') AS spouse_phone,
              COALESCE(p.emergency_contacts, '[]') AS emergency_contacts,
              p.status, p.photo_url AS avatar_url,
              COALESCE(p.portal_password_set, 0) AS portal_password_set,
              p.portal_email,
              p.responsible_professional_id AS psychologist_id,
              u.name AS professional_name, u.specialty, u.crp, u.avatar_url AS prof_avatar,
              ten.name AS company_name
       FROM patients p
       LEFT JOIN users u ON u.id = p.responsible_professional_id
       LEFT JOIN tenants ten ON ten.id = p.tenant_id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [patient_id, tenant_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });
    const p = rows[0];
    if (p.emergency_contacts && typeof p.emergency_contacts === 'string') {
      try { p.emergency_contacts = JSON.parse(p.emergency_contacts); } catch { p.emergency_contacts = []; }
    }
    p.has_children = Boolean(p.has_children);
    // fallback: se responsible_professional_id não estiver setado, usa o profissional do último agendamento
    if (!p.psychologist_id) {
      try {
        const [apRows] = await db.query(
          `SELECT a.professional_id, u.name AS professional_name, u.specialty, u.crp, u.avatar_url AS prof_avatar
           FROM appointments a
           JOIN users u ON u.id = a.professional_id
           WHERE a.patient_id = ? AND a.tenant_id = ? AND a.status != 'cancelled'
           ORDER BY a.start_time DESC LIMIT 1`,
          [patient_id, tenant_id]
        );
        if (apRows[0]) {
          p.psychologist_id   = apRows[0].professional_id;
          p.professional_name = apRows[0].professional_name;
          p.specialty         = apRows[0].specialty;
          p.crp               = apRows[0].crp;
          p.prof_avatar       = apRows[0].prof_avatar;
        }
      } catch {}
    }
    res.json(p);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PATCH /patient-portal/me — atualizar dados do paciente
router.patch('/me', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const allowed = [
      'name', 'email', 'phone', 'phone_country', 'phone2', 'phone2_country',
      'birth_date', 'gender', 'cpf',
      'address', 'street', 'house_number', 'neighborhood', 'city', 'state', 'zip_code',
      'health_plan', 'notes',
      'marital_status', 'education', 'profession', 'nationality',
      'has_children', 'children_count', 'minor_children_count',
      'spouse_name', 'spouse_phone', 'emergency_contacts',
    ];
    // Filtra apenas colunas que existem no banco (evita erro se migração ainda não rodou)
    const safeAllowed = allowed.filter(c => !['street','house_number','neighborhood','spouse_phone'].includes(c) || portalSchemaReady);
    const fieldMap = { cpf: 'cpf', address_zip: 'zip_code' };
    const body = req.body;
    const updates = {};
    for (const k of safeAllowed) {
      const bodyKey = Object.keys(fieldMap).find(fk => fieldMap[fk] === k) || k;
      if (body[bodyKey] !== undefined) updates[k] = body[bodyKey];
      else if (body[k] !== undefined) updates[k] = body[k];
    }
    // cpf_cnpj → cpf
    if (body.cpf_cnpj !== undefined) updates['cpf'] = body.cpf_cnpj;
    // address_zip → zip_code
    if (body.address_zip !== undefined) updates['zip_code'] = body.address_zip;
    if (updates.emergency_contacts && typeof updates.emergency_contacts !== 'string') {
      updates.emergency_contacts = JSON.stringify(updates.emergency_contacts);
    }
    if (!Object.keys(updates).length) return res.json({ ok: true });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.query(
      `UPDATE patients SET ${sets} WHERE id = ? AND tenant_id = ?`,
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
      `SELECT a.id,
              a.start_time AS start_date, a.end_time AS end_date,
              a.status, a.type, a.modality,
              a.meeting_url, a.notes, a.duration_minutes,
              u.name AS professional_name, u.specialty, u.avatar_url AS prof_avatar,
              s.name AS service_name, s.price AS service_price
       FROM appointments a
       LEFT JOIN users u ON u.id = a.professional_id
       LEFT JOIN services s ON s.id = a.service_id
       WHERE a.patient_id = ? AND a.tenant_id = ?
         AND a.type != 'bloqueio' AND a.type != 'pessoal'
       ORDER BY a.start_time DESC
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
      `SELECT id, status, start_time FROM appointments WHERE id = ? AND patient_id = ? AND tenant_id = ?`,
      [req.params.id, patient_id, tenant_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Consulta não encontrada.' });
    const appt = rows[0];
    if (!['scheduled', 'confirmed'].includes(appt.status))
      return res.status(409).json({ error: 'Esta consulta não pode ser cancelada.' });
    // Só pode cancelar com pelo menos 2h de antecedência
    const start = new Date(appt.start_time);
    const now = new Date();
    const diffHours = (start - now) / 3600000;
    if (diffHours < 2)
      return res.status(409).json({ error: 'Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.' });

    await db.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = ?`,
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
      `SELECT p.*, a.start_time AS appointment_date, a.status AS appointment_status
       FROM patient_portal_payments p
       LEFT JOIN appointments a ON a.id = p.appointment_id
       WHERE p.patient_id = ? AND p.tenant_id = ?
       ORDER BY p.created_at DESC`,
      [patient_id, tenant_id]
    );
    // Busca attachments separado (evita JSON_ARRAYAGG — não disponível MySQL < 8)
    const paymentIds = rows.map(r => r.id);
    let attachMap = {};
    if (paymentIds.length > 0) {
      const [atts] = await db.query(
        `SELECT payment_id, id, file_name, file_url, file_type FROM patient_portal_payment_attachments WHERE payment_id IN (?)`,
        [paymentIds]
      );
      for (const att of atts) {
        if (!attachMap[att.payment_id]) attachMap[att.payment_id] = [];
        attachMap[att.payment_id].push(att);
      }
    }
    res.json(rows.map(r => ({ ...r, attachments: attachMap[r.id] || [] })));
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/payments — declarar pagamento
router.post('/payments', portalAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const { appointment_id, comanda_id, amount, payment_method, payment_date, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ error: 'Valor e data são obrigatórios.' });

    const [ins] = await db.query(
      `INSERT INTO patient_portal_payments
       (tenant_id, patient_id, appointment_id, comanda_id, amount, payment_method, payment_date, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [tenant_id, patient_id, appointment_id || null, comanda_id || null, parseFloat(amount),
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

    // Cria alerta para notificar a psicóloga do novo pagamento declarado
    try {
      const [patRows] = await db.query(
        `SELECT name FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [patient_id, tenant_id]
      );
      const patientName = patRows[0]?.name || 'Paciente';
      const fmtAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(amount));
      await db.query(
        `INSERT INTO system_alerts (tenant_id, title, message, type, link)
         VALUES (?, ?, ?, 'info', '/financeiro')`,
        [tenant_id,
         `💰 ${patientName} declarou um pagamento`,
         `Valor: ${fmtAmount} · Aguardando revisão no Portal`]
      );
    } catch (alertErr) {
      console.error('[portal] falha ao criar alerta de pagamento:', alertErr.message);
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
// Regra: o paciente agenda com SEU profissional responsável. Se ele tem um
// responsável definido, retorna apenas ele. Caso contrário, retorna todos os
// profissionais ativos do consultório (admin/professional).
router.get('/professionals', portalAuth, async (req, res) => {
  try {
    const { tenant_id, patient_id } = req.portalSession;
    const PROF_ROLES = "('professional','admin','super_admin')";

    // 1) Profissional responsável pelo paciente (preferência)
    const [pat] = await db.query(
      `SELECT responsible_professional_id FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [patient_id, tenant_id]
    );
    const respId = pat[0]?.responsible_professional_id;

    if (respId) {
      const [resp] = await db.query(
        `SELECT id, name, specialty, crp, avatar_url FROM users
         WHERE id = ? AND tenant_id = ? AND (active = 1 OR active IS NULL) LIMIT 1`,
        [respId, tenant_id]
      );
      if (resp.length > 0) return res.json(resp);
    }

    // 2) Fallback: todos os profissionais ativos do consultório
    const [rows] = await db.query(
      `SELECT id, name, specialty, crp, avatar_url FROM users
       WHERE tenant_id = ? AND role IN ${PROF_ROLES} AND (active = 1 OR active IS NULL)
       ORDER BY name`,
      [tenant_id]
    );
    res.json(rows);
  } catch (e) {
    console.error('[portal professionals]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /patient-portal/professionals/:id/slots?date=YYYY-MM-DD
// Retorna horários disponíveis de um profissional em um dia específico
router.get('/professionals/:id/slots', portalAuth, async (req, res) => {
  try {
    const { tenant_id } = req.portalSession;
    const profId = parseInt(req.params.id);
    const date = req.query.date; // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ error: 'Parâmetro date obrigatório (YYYY-MM-DD).' });

    const parseJson = (val) => {
      if (!val) return null;
      try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return null; }
    };

    // Busca schedule do profissional. closed_dates e duration_minutes são opcionais:
    // buscamos numa query tolerante para não quebrar se a coluna não existir em prod.
    const [users] = await db.query(
      `SELECT id, name, schedule FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [profId, tenant_id]
    );
    if (!users[0]) return res.status(404).json({ error: 'Profissional não encontrado.' });

    let closedDates = null;
    let durationMinutes = null;
    try {
      const [extra] = await db.query(
        `SELECT closed_dates, duration_minutes FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [profId, tenant_id]
      );
      closedDates = parseJson(extra[0]?.closed_dates);
      durationMinutes = extra[0]?.duration_minutes ?? null;
    } catch (e) {
      console.error('[portal slots] colunas opcionais ausentes:', e.message);
    }

    const schedule = parseJson(users[0].schedule);

    // Mapeia o dia da semana para a chave usada no schedule salvo pelo Perfil
    // (array de { dayKey, active, start, end, breaks })
    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const DAY_KEYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    // Calcula dia da semana sem problemas de timezone (usa meia-dia UTC para não cruzar fronteira)
    const [yyyy, mm, dd] = date.split('-').map(Number);
    const dayIndex = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0)).getUTCDay();
    const dayKey = DAY_KEYS[dayIndex];
    const dayKeyPt = DAY_KEYS_PT[dayIndex];

    // Localiza a config do dia aceitando vários formatos de schedule salvos
    // (array com dayKey em inglês, dayKey em pt, índice numérico, ou objeto indexado).
    const findDayConfig = () => {
      if (Array.isArray(schedule)) {
        return schedule.find(d => d && (
          d.dayKey === dayKey || d.dayKey === dayKeyPt ||
          d.day === dayKey || d.day === dayKeyPt ||
          d.dayKey === dayIndex || d.day === dayIndex ||
          d.weekday === dayIndex
        )) || null;
      }
      if (schedule && typeof schedule === 'object') {
        // Objeto indexado: { monday: {...} } ou { seg: [...] }
        return schedule[dayKey] || schedule[dayKeyPt] || schedule[String(dayIndex)] || null;
      }
      return null;
    };
    const dayConfig = findDayConfig();

    // Debug: ?debug=1 retorna o que o backend enxerga (sem dados sensíveis)
    if (req.query.debug === '1') {
      return res.json({
        date, dayIndex, dayKey, dayKeyPt,
        schedule_type: Array.isArray(schedule) ? 'array' : typeof schedule,
        schedule_raw: schedule,
        closed_dates_raw: closedDates,
        dayConfig,
        duration_minutes: durationMinutes,
      });
    }

    // Dia bloqueado (feriado/férias) → sem horários
    const isClosed = Array.isArray(closedDates) && closedDates.some(c => c && (c.date === date || c === date));
    if (isClosed) return res.json({ slots: [], date, day_key: dayKey });

    // Normaliza a config do dia (suporta { active, start, end, breaks } e variações)
    const active = dayConfig && (dayConfig.active !== false) && (dayConfig.enabled !== false);
    const start = dayConfig && (dayConfig.start || dayConfig.startTime || dayConfig.from);
    const end = dayConfig && (dayConfig.end || dayConfig.endTime || dayConfig.to);

    if (!dayConfig || !active || !start || !end)
      return res.json({ slots: [], date, day_key: dayKey });

    const toMin = (hhmm) => {
      const [h, m] = String(hhmm).split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const fmt = (totalMin) =>
      `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

    const dayStart = toMin(dayConfig.start);
    const dayEnd   = toMin(dayConfig.end);
    const breaks = Array.isArray(dayConfig.breaks)
      ? dayConfig.breaks.filter(b => b && b.start && b.end).map(b => ({ start: toMin(b.start), end: toMin(b.end) }))
      : [];

    const duration = durationMinutes || 50;
    const STEP = 60; // horários de 1 em 1 hora

    // Gera os horários base do dia (início → fim), pulando intervalos
    const baseSlots = [];
    for (let t = dayStart; t + duration <= dayEnd; t += STEP) {
      const slotEnd = t + duration;
      const overlapsBreak = breaks.some(b => t < b.end && slotEnd > b.start);
      if (!overlapsBreak) baseSlots.push(t);
    }

    if (baseSlots.length === 0) return res.json({ slots: [], date, day_key: dayKey, duration });

    // Busca appointments já ocupados nesse dia (start_time em UTC, converte para SP para comparar)
    const [occupied] = await db.query(
      `SELECT start_time, end_time FROM appointments
       WHERE professional_id = ? AND tenant_id = ?
         AND DATE(CONVERT_TZ(start_time, '+00:00', '-03:00')) = ? AND status NOT IN ('cancelled')`,
      [profId, tenant_id, date]
    );

    // "Agora" no horário civil de Brasília (para comparar com slots do dia escolhido).
    const now = nowBRT();
    const nowY = now.getUTCFullYear(), nowMo = now.getUTCMonth() + 1, nowD = now.getUTCDate();
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const isToday = (yyyy === nowY && mm === nowMo && dd === nowD);

    const slots = baseSlots.map(t => {
      // start_time no banco é UTC. Converte o slot (horário SP = UTC-3) para UTC somando 3h.
      const slotStartStr = brtDateTimeStr(yyyy, mm, dd, Math.floor(t / 60), t % 60);
      const slotStartUTC = new Date(slotStartStr.replace(' ', 'T') + 'Z').getTime() + BRT_OFFSET_MS;
      const slotEndUTC   = slotStartUTC + duration * 60000;
      const toMs = (v) => {
        if (!v) return NaN;
        const s = String(v);
        // MySQL pode retornar ISO com Z já incluído ou sem — normaliza nos dois casos
        return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').getTime();
      };
      const busy = occupied.some(apt => {
        const aptStart = toMs(apt.start_time);
        const aptEnd   = apt.end_time ? toMs(apt.end_time) : aptStart + duration * 60000;
        if (isNaN(aptStart)) return false;
        return slotStartUTC < aptEnd && slotEndUTC > aptStart;
      });
      // Horários que já passaram hoje ficam indisponíveis (com 30min de antecedência mínima)
      const isPast = isToday && t <= nowMinutes + 30;
      return { time: fmt(t), available: !busy && !isPast };
    });

    res.json({ slots, date, day_key: dayKey, duration });
  } catch (e) {
    console.error('[portal slots]', e?.message || e);
    // Com ?debug=1 retorna a mensagem real do erro para diagnóstico rápido
    if (req.query.debug === '1')
      return res.status(500).json({ error: 'Erro interno.', detail: e?.message || String(e) });
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Frequências de recorrência suportadas pelo portal
const PORTAL_RECURRENCE_FREQS = ['WEEKLY', 'TWICE_WEEKLY', 'THREE_WEEKLY', 'BIWEEKLY', 'MONTHLY'];

// Gera as datas das ocorrências a partir da data-base (horário civil de Brasília).
// Retorna array de { yyyy, mm, dd, h, min } — uma por sessão.
function buildOccurrences({ yyyy, mm, dd, h, min, freq, count }) {
  const occ = [];
  // Base como UTC para fazer aritmética de calendário sem influência de fuso do servidor.
  const base = new Date(Date.UTC(yyyy, mm - 1, dd, h, min, 0));
  const total = freq ? Math.max(1, Math.min(parseInt(count) || 1, 52)) : 1;

  for (let i = 0; i < total; i++) {
    const d = new Date(base.getTime());
    if (!freq || freq === 'NONE') {
      if (i > 0) break;
    } else if (freq === 'WEEKLY') {
      d.setUTCDate(base.getUTCDate() + i * 7);
    } else if (freq === 'BIWEEKLY') {
      d.setUTCDate(base.getUTCDate() + i * 14);
    } else if (freq === 'MONTHLY') {
      d.setUTCMonth(base.getUTCMonth() + i);
    } else if (freq === 'TWICE_WEEKLY') {
      const weekIdx = Math.floor(i / 2);
      const dayOffset = i % 2 === 0 ? 0 : 3;
      d.setUTCDate(base.getUTCDate() + weekIdx * 7 + dayOffset);
    } else if (freq === 'THREE_WEEKLY') {
      const weekIdx = Math.floor(i / 3);
      const dayOffsets = [0, 2, 4];
      d.setUTCDate(base.getUTCDate() + weekIdx * 7 + dayOffsets[i % 3]);
    } else {
      if (i > 0) break;
    }
    occ.push({
      yyyy: d.getUTCFullYear(), mm: d.getUTCMonth() + 1, dd: d.getUTCDate(),
      h: d.getUTCHours(), min: d.getUTCMinutes(),
    });
  }
  return occ;
}

// POST /patient-portal/preview-occurrences — retorna as datas geradas com status de disponibilidade
router.post('/preview-occurrences', portalAuth, async (req, res) => {
  try {
    const { tenant_id } = req.portalSession;
    const { professional_id, date, time, recurrence_freq, recurrence_count } = req.body;
    if (!professional_id || !date || !time)
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

    const [yyyy, mm, dd] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);

    const freq = PORTAL_RECURRENCE_FREQS.includes(recurrence_freq) ? recurrence_freq : null;
    const occurrences = buildOccurrences({ yyyy, mm, dd, h, min, freq, count: recurrence_count });

    // Busca duração do profissional via schedule (duration_minutes não existe na tabela users)
    let duration = 50;
    try {
      const [uRows] = await db.query('SELECT schedule FROM users WHERE id = ? AND tenant_id = ? LIMIT 1', [professional_id, tenant_id]);
      const sch = uRows[0]?.schedule;
      const schParsed = sch ? (typeof sch === 'string' ? JSON.parse(sch) : sch) : null;
      if (schParsed?.duration_minutes) duration = parseInt(schParsed.duration_minutes) || 50;
      else if (Array.isArray(schParsed) && schParsed[0]?.duration_minutes) duration = parseInt(schParsed[0].duration_minutes) || 50;
    } catch (e) { /* usa 50 */ }

    const result = [];
    for (const o of occurrences) {
      const sStr = brtDateTimeStr(o.yyyy, o.mm, o.dd, o.h, o.min);
      // sStr é horário SP. Para comparar com start_time UTC no banco: sStr+'Z' trata como UTC,
      // então precisamos somar BRT_OFFSET_MS para obter o UTC real (SP = UTC+3h)
      const sUTC = new Date(sStr.replace(' ', 'T') + 'Z').getTime() + BRT_OFFSET_MS;
      const eUTC = sUTC + duration * 60000;
      const eStr = new Date(eUTC).toISOString().slice(0, 19).replace('T', ' ');
      const sUtcStr = new Date(sUTC).toISOString().slice(0, 19).replace('T', ' ');
      const [conflict] = await db.query(
        `SELECT id FROM appointments WHERE professional_id = ? AND tenant_id = ?
           AND status NOT IN ('cancelled') AND start_time < ? AND end_time > ?`,
        [professional_id, tenant_id, eStr, sUtcStr]
      );
      result.push({
        date: `${o.yyyy}-${String(o.mm).padStart(2,'0')}-${String(o.dd).padStart(2,'0')}`,
        time,
        conflict: conflict.length > 0,
      });
    }
    res.json({ occurrences: result, duration });
  } catch (e) {
    console.error('[portal preview-occurrences]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/appointments — agendar diretamente (se allow_self_schedule)
// Suporta repetição (recurrence_freq + recurrence_count) e cria uma comanda/pacote
// automaticamente, vinculando todas as sessões a ela. Nenhum valor é exposto/cobrado.
router.post('/appointments', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const {
      professional_id, date, time, modality, notes,
      recurrence_freq, recurrence_count, skip_comanda,
      comanda_id: provided_comanda_id, // comanda existente para vincular quando skip_comanda=true
      custom_dates, // array opcional [{date:'YYYY-MM-DD', time:'HH:MM'}, ...] para datas customizadas
    } = req.body;
    if (!professional_id || !date || !time)
      return res.status(400).json({ error: 'Profissional, data e horário são obrigatórios.' });

    // Verifica se o paciente tem permissão de auto-agendamento
    const [tokens] = await db.query(
      `SELECT allow_self_schedule FROM patient_portal_tokens
       WHERE patient_id = ? AND tenant_id = ? AND is_used = 1
       ORDER BY created_at DESC LIMIT 1`,
      [patient_id, tenant_id]
    );
    if (!tokens[0] || !tokens[0].allow_self_schedule)
      return res.status(403).json({ error: 'Auto-agendamento não permitido.' });

    // Busca dados do profissional e do paciente (nome p/ descrição da comanda)
    const [profRows] = await db.query(
      `SELECT id, schedule FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [professional_id, tenant_id]
    );
    if (!profRows[0]) return res.status(404).json({ error: 'Profissional não encontrado.' });
    // duration_minutes fica dentro do JSON schedule
    let duration = 50;
    try {
      const sch = profRows[0].schedule;
      const schParsed = sch ? (typeof sch === 'string' ? JSON.parse(sch) : sch) : null;
      if (schParsed?.duration_minutes) duration = parseInt(schParsed.duration_minutes) || 50;
      else if (Array.isArray(schParsed) && schParsed[0]?.duration_minutes) duration = parseInt(schParsed[0].duration_minutes) || 50;
    } catch (e) { /* usa 50 */ }

    const [patRows] = await db.query(
      `SELECT name FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [patient_id, tenant_id]
    );
    const patientName = patRows[0]?.name || 'Paciente';

    const [yyyy, mm, dd] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);

    // Normaliza recorrência
    const freq = PORTAL_RECURRENCE_FREQS.includes(recurrence_freq) ? recurrence_freq : null;
    let occurrences = buildOccurrences({ yyyy, mm, dd, h, min, freq, count: recurrence_count });
    if (occurrences.length === 0)
      return res.status(400).json({ error: 'Data inválida.' });

    // Se o paciente escolheu datas customizadas (substituiu alguma com conflito), usa elas
    if (Array.isArray(custom_dates) && custom_dates.length === occurrences.length) {
      occurrences = custom_dates.map(cd => {
        const [y2, m2, d2] = cd.date.split('-').map(Number);
        const [h2, min2] = cd.time.split(':').map(Number);
        return { yyyy: y2, mm: m2, dd: d2, h: h2, min: min2 };
      });
    }

    // Verifica conflito de cada ocorrência antes de criar qualquer coisa
    // brtDateTimeStr produz "YYYY-MM-DD HH:MM:SS" no horário de Brasília.
    // O banco armazena UTC → precisamos somar BRT_OFFSET_MS (3h) para converter BRT→UTC.
    for (const o of occurrences) {
      const brtStr = brtDateTimeStr(o.yyyy, o.mm, o.dd, o.h, o.min);
      const sMs  = new Date(brtStr.replace(' ', 'T') + 'Z').getTime() + BRT_OFFSET_MS;
      const eMs  = sMs + duration * 60000;
      const sStr = new Date(sMs).toISOString().slice(0, 19).replace('T', ' ');
      const eStr = new Date(eMs).toISOString().slice(0, 19).replace('T', ' ');
      const [conflict] = await db.query(
        `SELECT id FROM appointments
         WHERE professional_id = ? AND tenant_id = ?
           AND status NOT IN ('cancelled')
           AND start_time < ? AND end_time > ?`,
        [professional_id, tenant_id, eStr, sStr]
      );
      if (conflict.length > 0)
        return res.status(409).json({
          error: occurrences.length > 1
            ? `Conflito de horário em ${o.dd}/${o.mm}. Escolha outra data/horário ou reduza a repetição.`
            : 'Este horário não está mais disponível.',
        });
    }

    // Cria a comanda/pacote automaticamente (sem valor) e vincula todas as sessões.
    const sessionsTotal = occurrences.length;
    const description = sessionsTotal > 1
      ? `Pacote de ${sessionsTotal} sessões — ${patientName}`
      : `Consulta — ${patientName}`;
    let comandaId = provided_comanda_id ? parseInt(provided_comanda_id) : null;
    // No reagendamento (skip_comanda) ou quando já existe comanda ativa, não cria nova.
    if (!skip_comanda && !comandaId) {
      try {
        const firstStr = brtDateTimeStr(occurrences[0].yyyy, occurrences[0].mm, occurrences[0].dd, occurrences[0].h, occurrences[0].min);
        const [comandaIns] = await db.query(
          `INSERT INTO comandas
           (tenant_id, patient_id, professional_id, description, total, total_net, discount,
            sessions_total, sessions_used, status, start_date, duration_minutes, source, created_at)
           VALUES (?, ?, ?, ?, 0, 0, 0, ?, 0, 'open', ?, ?, 'portal', NOW())`,
          [tenant_id, patient_id, professional_id, description, sessionsTotal, firstStr, duration]
        );
        comandaId = comandaIns.insertId;
      } catch (e) {
        // Se a tabela comandas não tiver alguma coluna, segue sem comanda (não bloqueia o agendamento)
        console.error('[portal] falha ao criar comanda automática:', e.message);
        comandaId = null;
      }
    }

    const recurrenceRule = freq
      ? JSON.stringify({ freq, count: sessionsTotal, source: 'portal' })
      : null;

    // Insere todas as ocorrências — start_time e end_time em UTC
    const created = [];
    for (const o of occurrences) {
      const brtStr = brtDateTimeStr(o.yyyy, o.mm, o.dd, o.h, o.min);
      const sMs  = new Date(brtStr.replace(' ', 'T') + 'Z').getTime() + BRT_OFFSET_MS;
      const eMs  = sMs + duration * 60000;
      const sStr = new Date(sMs).toISOString().slice(0, 19).replace('T', ' ');
      const eStr = new Date(eMs).toISOString().slice(0, 19).replace('T', ' ');
      const [ins] = await db.query(
        `INSERT INTO appointments
         (tenant_id, patient_id, professional_id, start_time, end_time, duration_minutes,
          status, modality, notes, type, comanda_id, recurrence_rule, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, 'sessao', ?, ?, NOW())`,
        [tenant_id, patient_id, professional_id, sStr, eStr, duration,
         modality || 'online', notes || null, comandaId, recurrenceRule]
      );
      created.push({ id: ins.insertId, start_time: sStr });
    }

    // Cria alerta no sistema para notificar a psicóloga do novo agendamento
    try {
      const firstAppt = created[0];
      const apptDate = new Date(firstAppt.start_time + 'Z');
      const dateBRT = apptDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const alertTitle = created.length > 1
        ? `📅 ${patientName} agendou ${created.length} sessões pelo portal`
        : `📅 ${patientName} agendou uma consulta pelo portal`;
      const alertMsg = created.length > 1
        ? `Primeira sessão: ${dateBRT}`
        : `Data: ${dateBRT}`;
      await db.query(
        `INSERT INTO system_alerts (tenant_id, title, message, type, link)
         VALUES (?, ?, ?, 'info', '/agenda')`,
        [tenant_id, alertTitle, alertMsg]
      );
    } catch (alertErr) {
      console.error('[portal] falha ao criar alerta de agendamento:', alertErr.message);
    }

    res.json({
      ok: true,
      status: 'scheduled',
      comanda_id: comandaId,
      sessions: created.length,
      appointments: created,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao agendar consulta.' });
  }
});

// ─── DOCUMENTOS DO PACIENTE ───────────────────────────────────────────────────
// GET /patient-portal/documents — documentos gerados e uploads enviados ao paciente
router.get('/documents', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;

    // Documentos gerados (atestados, declarações, receitas)
    const [docs] = await db.query(
      `SELECT id, title, rendered_html, created_at, 'document' AS source_type
       FROM doc_instances
       WHERE patient_id = ? AND tenant_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [patient_id, tenant_id]
    ).catch(() => [[]]);

    // Uploads/arquivos enviados ao paciente
    const [uploads] = await db.query(
      `SELECT id,
              COALESCE(title, original_name, file_name, filename) AS title,
              COALESCE(file_url, url) AS file_url,
              COALESCE(file_type, mime_type) AS file_type,
              created_at, 'upload' AS source_type
       FROM uploads
       WHERE patient_id = ? AND tenant_id = ?
         AND COALESCE(file_url, url) IS NOT NULL
         AND COALESCE(file_url, url) != ''
       ORDER BY created_at DESC LIMIT 50`,
      [patient_id, tenant_id]
    ).catch(() => [[]]);

    res.json({ documents: docs, uploads });
  } catch (e) {
    console.error('[portal documents]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── COMANDAS DO PACIENTE ─────────────────────────────────────────────────────

// GET /patient-portal/comandas — lista comandas abertas do paciente com sessões restantes
router.get('/comandas', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const [rows] = await db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM appointments a
         WHERE a.comanda_id = c.id AND a.status IN ('scheduled','confirmed')) AS sessions_scheduled,
        (SELECT COUNT(*) FROM appointments a
         WHERE a.comanda_id = c.id AND a.status IN ('completed','no_show')) AS sessions_done,
        (SELECT COUNT(*) FROM appointments a
         WHERE a.comanda_id = c.id AND a.status NOT IN ('cancelled')) AS sessions_active
       FROM comandas c
       WHERE c.patient_id = ? AND c.tenant_id = ? AND c.status = 'open'
       ORDER BY c.created_at DESC`,
      [patient_id, tenant_id]
    );
    // Para cada comanda, busca as próximas sessões agendadas
    const result = [];
    for (const c of rows) {
      const [appts] = await db.query(
        `SELECT id, start_time, end_time, status, modality
         FROM appointments
         WHERE comanda_id = ? AND status IN ('scheduled','confirmed')
         ORDER BY start_time ASC LIMIT 20`,
        [c.id]
      );
      result.push({
        id: c.id,
        description: c.description,
        sessions_total: c.sessions_total || 0,
        sessions_done: Number(c.sessions_done) || 0,
        sessions_scheduled: Number(c.sessions_scheduled) || 0,
        sessions_remaining: Math.max(0, (c.sessions_total || 0) - (Number(c.sessions_done) || 0)),
        status: c.status,
        start_date: c.start_date,
        total: Number(c.total) || 0,
        received: Number(c.total_received) || 0,
        upcoming_appointments: appts,
      });
    }
    res.json(result);
  } catch (e) {
    console.error('[portal comandas]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /patient-portal/packages — lista pacotes disponíveis para o paciente
// Se o token tem pacotes configurados, retorna apenas esses com preço customizado
// Caso contrário retorna todos os ativos do tenant
// Nunca expõe desconto/acréscimo — apenas o preço final (display_price)
router.get('/packages', portalAuth, async (req, res) => {
  try {
    const { tenant_id, token_id } = req.portalSession;

    // Verifica se o token tem pacotes configurados individualmente
    let tokenPackages = [];
    if (token_id) {
      const [tp] = await db.query(
        `SELECT ptp.package_id, ptp.custom_price, ptp.active,
                pkg.name, pkg.description, pkg.sessions_count, pkg.totalPrice
         FROM portal_token_packages ptp
         JOIN packages pkg ON pkg.id = ptp.package_id
         WHERE ptp.token_id = ? AND ptp.tenant_id = ?`,
        [token_id, tenant_id]
      );
      tokenPackages = tp;
    }

    if (tokenPackages.length > 0) {
      // Usa configuração individual: só pacotes ativos no token
      const rows = tokenPackages
        .filter(r => r.active)
        .map(r => ({
          id: r.package_id,
          name: r.name,
          description: r.description,
          sessions_count: r.sessions_count,
          // Preço final: custom_price se definido, senão totalPrice do pacote
          display_price: r.custom_price !== null ? parseFloat(r.custom_price) : parseFloat(r.totalPrice || 0),
        }));
      return res.json(rows);
    }

    // Sem configuração individual: todos os pacotes ativos, preço padrão
    const [rows] = await db.query(
      `SELECT id, name, description, sessions_count,
              totalPrice AS display_price
       FROM packages WHERE tenant_id = ? AND active = 1 ORDER BY sessions_count ASC, totalPrice ASC`,
      [tenant_id]
    );
    res.json(rows);
  } catch (e) {
    console.error('[portal packages]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/comandas — paciente cria nova comanda/pacote
router.post('/comandas', portalAuth, async (req, res) => {
  try {
    const { patient_id, tenant_id } = req.portalSession;
    const { professional_id, sessions_total, description } = req.body;
    if (!sessions_total || sessions_total < 1 || sessions_total > 50)
      return res.status(400).json({ error: 'Número de sessões inválido (1-50).' });

    // Verifica se o profissional pertence ao tenant
    const [profRows] = await db.query(
      'SELECT id, schedule FROM users WHERE id = ? AND tenant_id = ? LIMIT 1',
      [professional_id, tenant_id]
    );
    if (!profRows[0]) return res.status(404).json({ error: 'Profissional não encontrado.' });

    // duration_minutes fica dentro do JSON schedule
    let duration = 50;
    try {
      const sch = profRows[0].schedule;
      const schParsed = sch ? (typeof sch === 'string' ? JSON.parse(sch) : sch) : null;
      if (schParsed?.duration_minutes) duration = parseInt(schParsed.duration_minutes) || 50;
      else if (Array.isArray(schParsed) && schParsed[0]?.duration_minutes) duration = parseInt(schParsed[0].duration_minutes) || 50;
    } catch (e) { /* usa 50 */ }

    const [patRows] = await db.query(
      'SELECT name FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1',
      [patient_id, tenant_id]
    );
    const patientName = patRows[0]?.name || 'Paciente';
    const desc = description || `Pacote de ${sessions_total} sessões — ${patientName}`;

    const [ins] = await db.query(
      `INSERT INTO comandas
       (tenant_id, patient_id, professional_id, description, total, total_net, discount,
        sessions_total, sessions_used, status, start_date, duration_minutes, package_id, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', NOW(), ?, ?, 'portal', NOW())`,
      [tenant_id, patient_id, professional_id, desc,
       req.body.total || 0, req.body.total_net || req.body.total || 0,
       req.body.discount || 0, sessions_total, duration, req.body.package_id || null]
    );
    res.json({ ok: true, comanda_id: ins.insertId, description: desc, sessions_total });
  } catch (e) {
    console.error('[portal new comanda]', e?.message);
    res.status(500).json({ error: 'Erro ao criar pacote.' });
  }
});

// ─── ADMIN: configurações do portal (portal_settings no tenant) ──────────────

// GET /patient-portal/settings — lê configurações do portal do tenant
router.get('/settings', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    // Auto-migra coluna se não existir
    try {
      await db.query("ALTER TABLE tenants ADD COLUMN portal_settings JSON NULL");
    } catch (e) { /* já existe */ }
    const [rows] = await db.query('SELECT portal_settings FROM tenants WHERE id = ?', [req.user.tenant_id]);
    const raw = rows[0]?.portal_settings;
    const settings = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/settings — salva configurações do portal do tenant
router.post('/settings', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    await db.query('UPDATE tenants SET portal_settings = ? WHERE id = ?', [JSON.stringify(req.body), req.user.tenant_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /patient-portal/tokens/all — listar TODOS os tokens do tenant (admin)
router.get('/tokens/all', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const [rows] = await db.query(
      `SELECT ppt.*, p.name as patient_name, p.phone as patient_phone
       FROM patient_portal_tokens ppt
       LEFT JOIN patients p ON p.id = ppt.patient_id
       WHERE ppt.tenant_id = ?
       ORDER BY ppt.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── ADMIN: pacotes por token ─────────────────────────────────────────────────

// GET /patient-portal/token-packages/:tokenId — lê config de pacotes do token
router.get('/token-packages/:tokenId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { tokenId } = req.params;
    const tenant_id = req.user.tenant_id;
    // Todos os pacotes ativos do tenant
    const [allPkgs] = await db.query(
      `SELECT id, name, sessions_count, totalPrice FROM packages WHERE tenant_id = ? AND active = 1 ORDER BY sessions_count ASC`,
      [tenant_id]
    );
    // Config existente para este token
    const [existing] = await db.query(
      `SELECT package_id, custom_price, active FROM portal_token_packages WHERE token_id = ? AND tenant_id = ?`,
      [tokenId, tenant_id]
    );
    const map = {};
    existing.forEach(r => { map[r.package_id] = r; });
    const result = allPkgs.map(p => ({
      package_id: p.id,
      name: p.name,
      sessions_count: p.sessions_count,
      default_price: parseFloat(p.totalPrice || 0),
      custom_price: map[p.id]?.custom_price !== undefined ? parseFloat(map[p.id].custom_price) : null,
      active: map[p.id] ? (map[p.id].active ? true : false) : true, // default: todos ativos
      configured: !!map[p.id],
    }));
    res.json(result);
  } catch (e) {
    console.error('[token-packages GET]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /patient-portal/token-packages/:tokenId — salva config de pacotes do token
// body: [{ package_id, active, custom_price }]
router.post('/token-packages/:tokenId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { tokenId } = req.params;
    const tenant_id = req.user.tenant_id;
    const items = Array.isArray(req.body) ? req.body : [];

    // Verifica que o token pertence ao tenant
    const [tkRows] = await db.query(`SELECT id FROM patient_portal_tokens WHERE id = ? AND tenant_id = ?`, [tokenId, tenant_id]);
    if (!tkRows.length) return res.status(404).json({ error: 'Token não encontrado.' });

    for (const item of items) {
      const { package_id, active, custom_price } = item;
      const customVal = (custom_price !== null && custom_price !== '' && !isNaN(parseFloat(custom_price)))
        ? parseFloat(custom_price) : null;
      await db.query(
        `INSERT INTO portal_token_packages (tenant_id, token_id, package_id, custom_price, active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE custom_price = VALUES(custom_price), active = VALUES(active)`,
        [tenant_id, tokenId, package_id, customVal, active ? 1 : 0]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[token-packages POST]', e?.message);
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
    const [result] = await db.query(
      `DELETE FROM patient_portal_tokens WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Link não encontrado.' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[portal DELETE token]', e?.message || e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── ADMIN: ver solicitações de agendamento ───────────────────────────────────
// GET /patient-portal/admin/schedule-requests
router.get('/admin/schedule-requests', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const [rows] = await db.query(
      `SELECT r.*, p.name AS patient_name, p.phone AS patient_whatsapp,
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
      `SELECT pp.*, pat.name AS patient_name,
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

    // Busca o pagamento antes de atualizar
    const [[payment]] = await db.query(
      `SELECT pp.*, pat.name AS patient_name, pat.cpf AS patient_cpf
       FROM patient_portal_payments pp
       JOIN patients pat ON pat.id = pp.patient_id
       WHERE pp.id = ? AND pp.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    await db.query(
      `UPDATE patient_portal_payments SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [status, req.user.id, req.params.id, req.user.tenant_id]
    );

    // Ao confirmar: cria lançamento no Livro Caixa automaticamente
    if (status === 'confirmed' && !payment.finance_transaction_id) {
      const paymentDate = payment.payment_date
        ? new Date(payment.payment_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const description = `Pagamento Portal - ${payment.patient_name}${payment.notes ? ` (${payment.notes})` : ''}`;

      const [txRes] = await db.query(
        `INSERT INTO financial_transactions
           (tenant_id, type, category, description, amount, date, patient_id,
            payment_method, status, payer_name, payer_cpf, created_by, source, origin_module, origin_payment_id)
         VALUES (?, 'income', 'Sessão Individual', ?, ?, ?, ?, ?, 'paid', ?, ?, ?, 'Portal', 'PORTAL_PAYMENT', ?)`,
        [
          req.user.tenant_id,
          description,
          payment.amount,
          paymentDate,
          payment.patient_id,
          payment.payment_method || 'pix',
          payment.patient_name || '',
          payment.patient_cpf || '',
          req.user.id,
          payment.id,
        ]
      );

      // Salva referência cruzada para evitar duplicata
      await db.query(
        `UPDATE patient_portal_payments SET finance_transaction_id = ? WHERE id = ?`,
        [txRes.insertId, payment.id]
      ).catch(() => {}); // coluna pode não existir ainda, ignora silenciosamente
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao revisar pagamento portal:', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// DELETE /patient-portal/admin/payments/:id — remover declaração de pagamento
router.delete('/admin/payments/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const [[payment]] = await db.query(
      `SELECT id, finance_transaction_id, tenant_id FROM patient_portal_payments WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    // Remove anexos
    await db.query(`DELETE FROM patient_portal_payment_attachments WHERE payment_id = ?`, [payment.id]);

    // Remove lançamento no Livro Caixa se foi criado
    if (payment.finance_transaction_id) {
      await db.query(`DELETE FROM financial_transactions WHERE id = ? AND tenant_id = ?`,
        [payment.finance_transaction_id, req.user.tenant_id]).catch(() => {});
    }

    await db.query(`DELETE FROM patient_portal_payments WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]);

    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao deletar pagamento portal:', e);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// TAREFAS DO PACIENTE — criadas pelo psicólogo, lidas pelo paciente
// ═══════════════════════════════════════════════════════════════════

// Garante tabela patient_tasks
async function ensureTasksTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_tasks (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      patient_id    INT NOT NULL,
      created_by    INT NOT NULL,
      title         VARCHAR(255) NOT NULL,
      description   TEXT NULL,
      category      VARCHAR(50) DEFAULT 'geral',
      priority      VARCHAR(20) DEFAULT 'media',
      due_date      DATE NULL,
      status        VARCHAR(20) DEFAULT 'pendente',
      completed_at  DATETIME NULL,
      created_at    DATETIME DEFAULT NOW(),
      updated_at    DATETIME DEFAULT NOW() ON UPDATE NOW(),
      INDEX (patient_id),
      INDEX (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
ensureTasksTable();

// ── ADMIN: Criar tarefa para paciente ──────────────────────────────
router.post('/admin/tasks', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { patient_id, title, description, category, priority, due_date } = req.body;
    if (!patient_id || !title?.trim()) return res.status(400).json({ error: 'patient_id e title são obrigatórios.' });

    // Verifica se paciente pertence ao tenant
    const [[pat]] = await db.query(
      `SELECT id, name FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1`,
      [patient_id, req.user.tenant_id]
    );
    if (!pat) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const [result] = await db.query(
      `INSERT INTO patient_tasks (tenant_id, patient_id, created_by, title, description, category, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenant_id, patient_id, req.user.id, title.trim(),
       description || null, category || 'geral', priority || 'media', due_date || null]
    );

    // Alerta no sino do sistema
    try {
      await db.query(
        `INSERT INTO system_alerts (tenant_id, type, title, message, link, created_at)
         VALUES (?, 'task', ?, ?, ?, NOW())`,
        [req.user.tenant_id,
         `Nova tarefa para ${pat.name}`,
         `"${title.trim()}" foi atribuída ao paciente ${pat.name}`,
         `/pacientes/${patient_id}`]
      );
    } catch {}

    // Push notification para o app do paciente
    sendPushToPatient(patient_id,
      '📋 Nova tarefa do seu profissional',
      title.trim()
    ).catch(() => {});

    res.json({ id: result.insertId, ok: true });
  } catch (e) {
    console.error('[tasks create]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── ADMIN: Listar tarefas de um paciente ───────────────────────────
router.get('/admin/tasks', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'patient_id é obrigatório.' });

    const [tasks] = await db.query(
      `SELECT t.*, u.name AS created_by_name
       FROM patient_tasks t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.tenant_id = ? AND t.patient_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.tenant_id, patient_id]
    );
    res.json({ tasks });
  } catch (e) {
    console.error('[tasks list admin]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── ADMIN: Atualizar tarefa ────────────────────────────────────────
router.put('/admin/tasks/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const { title, description, category, priority, due_date, status } = req.body;
    const completedAt = status === 'concluida' ? new Date() : null;

    await db.query(
      `UPDATE patient_tasks SET
         title = COALESCE(?, title),
         description = ?,
         category = COALESCE(?, category),
         priority = COALESCE(?, priority),
         due_date = ?,
         status = COALESCE(?, status),
         completed_at = ?
       WHERE id = ? AND tenant_id = ?`,
      [title || null, description ?? null, category || null, priority || null,
       due_date ?? null, status || null, completedAt, req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[tasks update]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── ADMIN: Deletar tarefa ──────────────────────────────────────────
router.delete('/admin/tasks/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    await db.query(
      `DELETE FROM patient_tasks WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── PORTAL PACIENTE: Listar tarefas ───────────────────────────────
router.get('/tasks', portalAuth, async (req, res) => {
  try {
    const session = req.portalSession;
    const [tasks] = await db.query(
      `SELECT t.id, t.title, t.description, t.category, t.priority,
              t.due_date, t.status, t.completed_at, t.created_at,
              u.name AS assigned_by
       FROM patient_tasks t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.patient_id = ? AND t.tenant_id = ?
       ORDER BY FIELD(t.status,'pendente','em_progresso','concluida'), t.priority DESC, t.created_at DESC`,
      [session.patient_id, session.tenant_id]
    );
    res.json({ tasks });
  } catch (e) {
    console.error('[portal tasks]', e?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── PORTAL PACIENTE: Marcar tarefa como concluída ─────────────────
router.post('/tasks/:id/complete', portalAuth, async (req, res) => {
  try {
    const session = req.portalSession;
    await db.query(
      `UPDATE patient_tasks SET status = 'concluida', completed_at = NOW()
       WHERE id = ? AND patient_id = ? AND tenant_id = ?`,
      [req.params.id, session.patient_id, session.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── PORTAL PACIENTE: Desfazer conclusão ───────────────────────────
router.post('/tasks/:id/undo', portalAuth, async (req, res) => {
  try {
    const session = req.portalSession;
    await db.query(
      `UPDATE patient_tasks SET status = 'pendente', completed_at = NULL
       WHERE id = ? AND patient_id = ? AND tenant_id = ?`,
      [req.params.id, session.patient_id, session.tenant_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── Tabela push tokens ────────────────────────────────────────────────
async function ensurePushTokensTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_push_tokens (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      tenant_id  INT NOT NULL,
      push_token VARCHAR(512) NOT NULL,
      updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
      UNIQUE KEY uq_patient_token (patient_id, push_token),
      INDEX (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `).catch(() => {});
}
ensurePushTokensTable();

// POST /patient-portal/auth/push-token — registra token do device
router.post('/auth/push-token', portalAuth, async (req, res) => {
  try {
    const { push_token } = req.body;
    if (!push_token) return res.json({ ok: true });
    const session = req.portalSession;
    await db.query(
      `INSERT INTO patient_push_tokens (patient_id, tenant_id, push_token)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [session.patient_id, session.tenant_id, push_token]
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false });
  }
});

module.exports = router;
