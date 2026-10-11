/**
 * Inventários de Esquemas (Terapia do Esquema): YSQ-S3, Estilos Parentais (YPI), YAMI, YCI, YRAI e RNE.
 *
 * Modelo:
 *  - schema_inventory_applications: uma "aplicação" = um instrumento de um paciente, com respostas PARCIAIS
 *    (JSON), progresso, status (pending | in_progress | completed) e quem respondeu (patient | professional).
 *  - schema_inventory_links: link seguro (token aleatório de 256 bits, validade em dias, revogável) que dá ao
 *    paciente acesso SOMENTE às aplicações criadas junto com ele. Sem login.
 *
 * A pontuação (médias, ATIVADO >= 3,5, resultado geral) é calculada no front a partir das respostas
 * (pages/clinical-tools/schema/scoring.ts), fonte única de regras. O servidor valida o formato das respostas,
 * mantém o progresso e só aceita "concluir" com todos os itens respondidos.
 *
 * Rotas públicas (token): /public/:token ...    Rotas do profissional: autenticadas e filtradas por tenant.
 */
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db');
const { authMiddleware, checkPermission } = require('../middleware/auth');
const { ensureStatements, toDbDateTime } = require('../utils/schemaMigrate');
const { getFrontendUrl } = require('../utils/publicUrl');

/* ───────────── Catálogo mínimo (contagens e faixas; o texto dos itens fica no front) ───────────── */
const INSTRUMENTS = {
  ysq: { type: 'scale', items: 90, min: 1, max: 6 },
  ypi: { type: 'parents', items: 72, min: 1, max: 6 },
  yami: { type: 'scale', items: 186, min: 1, max: 6 },
  yci: { type: 'scale', items: 48, min: 1, max: 6 },
  yrai: { type: 'scale', items: 40, min: 1, max: 6 },
  rne: { type: 'needs', items: 18 },
};
const INSTRUMENT_IDS = Object.keys(INSTRUMENTS);
const FIGURES = ['mae', 'pai', 'ter'];

/* ───────────── Tabelas ───────────── */
const ready = ensureStatements([
  `CREATE TABLE IF NOT EXISTS schema_inventory_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    instruments VARCHAR(255) NOT NULL,
    message TEXT NULL,
    expires_at DATETIME NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    opened_at DATETIME NULL,
    last_activity_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sil_token (token),
    INDEX idx_sil_patient (tenant_id, patient_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS schema_inventory_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    patient_id INT NOT NULL,
    instrument_id VARCHAR(16) NOT NULL,
    link_id INT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    answers LONGTEXT NULL,
    answered_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    answered_by VARCHAR(16) NULL,
    last_saved_by VARCHAR(16) NULL,
    created_by INT NULL,
    attached_record_id INT NULL,
    started_at DATETIME NULL,
    last_saved_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sia_patient (tenant_id, patient_id),
    INDEX idx_sia_link (link_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
], 'schema-inventories');

/* ───────────── Validação / progresso ───────────── */
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** Valida o patch e devolve { set, del } (chaves a gravar / remover). Lança Error com mensagem amigável. */
function sanitizePatch(instrumentId, patch) {
  const meta = INSTRUMENTS[instrumentId];
  if (!meta) throw new Error('Instrumento inválido');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Respostas inválidas');
  const entries = Object.entries(patch);
  if (entries.length > 600) throw new Error('Muitas respostas em uma única requisição');
  const set = {}; const del = [];
  for (const [key, raw] of entries) {
    const empty = raw === null || raw === '' || raw === 0 || raw === undefined;
    let m;
    if (meta.type === 'scale' && /^\d{1,3}$/.test(key)) {
      const n = Number(key);
      if (!isInt(n, 1, meta.items)) throw new Error('Item inválido');
      if (empty) { del.push(key); continue; }
      const v = Number(raw);
      if (!isInt(v, meta.min, meta.max)) throw new Error('Resposta fora da escala');
      set[key] = v;
    } else if (meta.type === 'parents' && (m = /^([mp])(\d{1,3})$/.exec(key))) {
      if (!isInt(Number(m[2]), 1, meta.items)) throw new Error('Item inválido');
      if (empty) { del.push(key); continue; }
      const v = Number(raw);
      if (!isInt(v, meta.min, meta.max)) throw new Error('Resposta fora da escala');
      set[key] = v;
    } else if (meta.type === 'parents' && /^[mp]_na$/.test(key)) {
      if (empty) del.push(key); else set[key] = 1;
    } else if (meta.type === 'needs' && (m = /^n(\d{1,2})_(mae|pai|ter|none)$/.exec(key))) {
      if (!isInt(Number(m[1]), 1, meta.items)) throw new Error('Item inválido');
      if (empty) del.push(key); else set[key] = 1;
    } else if (meta.type === 'needs' && /^person[1-3]_(name|age|scene)$/.test(key)) {
      const s = typeof raw === 'string' ? raw.trim().slice(0, 2000) : '';
      if (!s) del.push(key); else set[key] = s;
    } else {
      throw new Error('Chave de resposta inválida');
    }
  }
  return { set, del };
}

function applyPatch(current, { set, del }) {
  const next = { ...current, ...set };
  del.forEach(k => { delete next[k]; });
  return next;
}

/** Espelha getProgress() do front (scoring.ts). */
function computeProgress(instrumentId, a) {
  const meta = INSTRUMENTS[instrumentId];
  const has = (k) => Number.isInteger(Number(a[k])) && Number(a[k]) >= (meta.min || 1) && Number(a[k]) <= (meta.max || 6);
  if (meta.type === 'scale') {
    let answered = 0;
    for (let n = 1; n <= meta.items; n++) if (a[String(n)] !== undefined && has(String(n))) answered++;
    return { answered, total: meta.items, complete: answered >= meta.items };
  }
  if (meta.type === 'parents') {
    const sides = ['m', 'p'].filter(s => Number(a[`${s}_na`]) !== 1);
    let answered = 0;
    sides.forEach(s => { for (let n = 1; n <= meta.items; n++) if (a[`${s}${n}`] !== undefined && has(`${s}${n}`)) answered++; });
    const total = sides.length * meta.items;
    return { answered, total, complete: sides.length > 0 && answered >= total };
  }
  let answered = 0;
  for (let n = 1; n <= meta.items; n++) {
    if (Number(a[`n${n}_none`]) === 1 || FIGURES.some(f => Number(a[`n${n}_${f}`]) === 1)) answered++;
  }
  return { answered, total: meta.items, complete: answered >= meta.items };
}

const parseAnswers = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { const o = JSON.parse(raw); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; }
};

const publicApp = (r) => ({
  id: r.id,
  patient_id: r.patient_id,
  instrument_id: r.instrument_id,
  link_id: r.link_id,
  status: r.status,
  answers: parseAnswers(r.answers),
  answered_count: r.answered_count,
  total_count: r.total_count,
  answered_by: r.answered_by,
  last_saved_by: r.last_saved_by,
  attached_record_id: r.attached_record_id,
  started_at: r.started_at,
  last_saved_at: r.last_saved_at,
  completed_at: r.completed_at,
  created_at: r.created_at,
});

const linkState = (l) => {
  if (l.revoked) return 'revoked';
  if (l.completed_at) return 'completed';
  if (l.expires_at && new Date(l.expires_at) < new Date()) return 'expired';
  return 'active';
};
const linkUrl = (req, token) => `${getFrontendUrl(req)}/f/inventarios-esquemas?t=${token}`;
const newToken = () => crypto.randomBytes(32).toString('base64url');
const now = () => toDbDateTime(new Date());

/* ═════════════════════════════════════════════════════════════
   ROTAS PÚBLICAS (paciente, sem login, acesso por token)
   ═════════════════════════════════════════════════════════════ */
// Limite geral por IP (autosave a cada resposta) e limite de tentativas inválidas (token errado/expirado).
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 240, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um instante e tente novamente.' },
});
const failLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas com link inválido. Tente novamente em alguns minutos.' },
});

/** Carrega e valida o link; responde com erro e devolve null se inválido. */
async function loadActiveLink(req, res) {
  const token = String(req.params.token || '');
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) { res.status(404).json({ error: 'Link não encontrado ou inválido.' }); return null; }
  const [[link]] = await db.query('SELECT * FROM schema_inventory_links WHERE token = ?', [token]);
  if (!link) { res.status(404).json({ error: 'Link não encontrado ou inválido.' }); return null; }
  if (link.revoked) { res.status(410).json({ error: 'Este link foi cancelado pelo(a) profissional.', code: 'revoked' }); return null; }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    res.status(410).json({ error: 'Este link expirou. Entre em contato com seu(sua) psicólogo(a).', code: 'expired' }); return null;
  }
  return link;
}

const publicRouter = express.Router({ mergeParams: true });
publicRouter.use(generalLimiter, failLimiter);

// GET /schema-inventories/public/:token — dados para abrir/retomar
publicRouter.get('/:token', async (req, res) => {
  try {
    await ready;
    const link = await loadActiveLink(req, res);
    if (!link) return;
    const [[prof]] = await db.query(
      'SELECT name, specialty, crp, company_name, clinic_logo_url FROM users WHERE id = ? AND tenant_id = ?',
      [link.professional_id, link.tenant_id]
    );
    const [[patient]] = await db.query('SELECT name FROM patients WHERE id = ? AND tenant_id = ?', [link.patient_id, link.tenant_id]);
    const [apps] = await db.query(
      'SELECT * FROM schema_inventory_applications WHERE link_id = ? AND tenant_id = ?', [link.id, link.tenant_id]
    );
    const order = String(link.instruments).split(',').filter(Boolean);
    const instruments = order
      .map(id => apps.find(a => a.instrument_id === id))
      .filter(Boolean)
      .map(a => ({
        instrument_id: a.instrument_id, status: a.status, answers: parseAnswers(a.answers),
        answered_count: a.answered_count, total_count: a.total_count, completed_at: a.completed_at,
      }));
    if (!link.opened_at) await db.query('UPDATE schema_inventory_links SET opened_at = ? WHERE id = ?', [now(), link.id]);
    res.json({
      message: link.message || null,
      expires_at: link.expires_at,
      professional: prof ? { name: prof.name, specialty: prof.specialty, crp: prof.crp, clinic_name: prof.company_name, clinic_logo_url: prof.clinic_logo_url } : null,
      // só o primeiro nome: o link não expõe dados cadastrais do paciente
      patient_first_name: patient?.name ? String(patient.name).trim().split(/\s+/)[0] : null,
      instruments,
      all_completed: instruments.length > 0 && instruments.every(i => i.status === 'completed'),
    });
  } catch (err) {
    console.error('[schema-inventories public GET]', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// PUT /schema-inventories/public/:token/:instrumentId/answers — autosave parcial (merge)
publicRouter.put('/:token/:instrumentId/answers', async (req, res) => {
  const instrumentId = String(req.params.instrumentId);
  if (!INSTRUMENTS[instrumentId]) return res.status(400).json({ error: 'Instrumento inválido' });
  let conn;
  try {
    await ready;
    const link = await loadActiveLink(req, res);
    if (!link) return;
    let patch;
    try { patch = sanitizePatch(instrumentId, req.body?.answers); } catch (e) { return res.status(400).json({ error: e.message }); }

    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[app]] = await conn.query(
      'SELECT * FROM schema_inventory_applications WHERE link_id = ? AND instrument_id = ? AND tenant_id = ? FOR UPDATE',
      [link.id, instrumentId, link.tenant_id]
    );
    if (!app) { await conn.rollback(); return res.status(404).json({ error: 'Inventário não encontrado neste link.' }); }
    if (app.status === 'completed') { await conn.rollback(); return res.status(409).json({ error: 'Este inventário já foi concluído.', code: 'completed' }); }
    const next = applyPatch(parseAnswers(app.answers), patch);
    const p = computeProgress(instrumentId, next);
    const ts = now();
    await conn.query(
      `UPDATE schema_inventory_applications
         SET answers = ?, answered_count = ?, total_count = ?, status = 'in_progress', last_saved_by = 'patient',
             started_at = COALESCE(started_at, ?), last_saved_at = ?
       WHERE id = ?`,
      [JSON.stringify(next), p.answered, p.total, ts, ts, app.id]
    );
    await conn.query('UPDATE schema_inventory_links SET last_activity_at = ? WHERE id = ?', [ts, link.id]);
    await conn.commit();
    res.json({ ok: true, answered_count: p.answered, total_count: p.total, complete: p.complete });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('[schema-inventories public PUT answers]', err);
    res.status(500).json({ error: 'Erro ao salvar. Suas respostas anteriores continuam salvas.' });
  } finally {
    if (conn) conn.release();
  }
});

// POST /schema-inventories/public/:token/:instrumentId/complete
publicRouter.post('/:token/:instrumentId/complete', async (req, res) => {
  const instrumentId = String(req.params.instrumentId);
  if (!INSTRUMENTS[instrumentId]) return res.status(400).json({ error: 'Instrumento inválido' });
  try {
    await ready;
    const link = await loadActiveLink(req, res);
    if (!link) return;
    const [[app]] = await db.query(
      'SELECT * FROM schema_inventory_applications WHERE link_id = ? AND instrument_id = ? AND tenant_id = ?',
      [link.id, instrumentId, link.tenant_id]
    );
    if (!app) return res.status(404).json({ error: 'Inventário não encontrado neste link.' });
    if (app.status === 'completed') return res.json({ ok: true, already: true });
    const p = computeProgress(instrumentId, parseAnswers(app.answers));
    if (!p.complete) return res.status(400).json({ error: `Faltam ${p.total - p.answered} item(ns) para concluir.`, answered_count: p.answered, total_count: p.total });
    const ts = now();
    await db.query(
      `UPDATE schema_inventory_applications SET status = 'completed', answered_by = 'patient', last_saved_by = 'patient',
         answered_count = ?, total_count = ?, completed_at = ?, last_saved_at = ? WHERE id = ?`,
      [p.answered, p.total, ts, ts, app.id]
    );
    const [[{ pending }]] = await db.query(
      "SELECT COUNT(*) AS pending FROM schema_inventory_applications WHERE link_id = ? AND status <> 'completed'", [link.id]
    );
    await db.query('UPDATE schema_inventory_links SET last_activity_at = ?, completed_at = ? WHERE id = ?', [ts, pending === 0 ? ts : null, link.id]);
    res.json({ ok: true, all_completed: pending === 0 });
  } catch (err) {
    console.error('[schema-inventories public complete]', err);
    res.status(500).json({ error: 'Erro ao concluir.' });
  }
});

router.use('/public', publicRouter);

/* ═════════════════════════════════════════════════════════════
   ROTAS DO PROFISSIONAL (autenticadas, filtradas por tenant)
   ═════════════════════════════════════════════════════════════ */
const parseId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

async function patientOfTenant(req, patientId) {
  const [[p]] = await db.query('SELECT id, name FROM patients WHERE id = ? AND tenant_id = ?', [patientId, req.user.tenant_id]);
  return p || null;
}
async function loadApp(req, id) {
  const [[a]] = await db.query('SELECT * FROM schema_inventory_applications WHERE id = ? AND tenant_id = ?', [id, req.user.tenant_id]);
  return a || null;
}

// GET /schema-inventories/patient/:patientId → aplicações (com respostas) e links do paciente
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    await ready;
    const patientId = parseId(req.params.patientId);
    if (!patientId || !(await patientOfTenant(req, patientId))) return res.status(404).json({ error: 'Paciente não encontrado' });
    const [apps] = await db.query(
      'SELECT * FROM schema_inventory_applications WHERE tenant_id = ? AND patient_id = ? ORDER BY COALESCE(completed_at, last_saved_at, created_at) DESC, id DESC',
      [req.user.tenant_id, patientId]
    );
    const [links] = await db.query(
      'SELECT * FROM schema_inventory_links WHERE tenant_id = ? AND patient_id = ? ORDER BY id DESC', [req.user.tenant_id, patientId]
    );
    res.json({
      applications: apps.map(publicApp),
      links: links.map(l => ({
        id: l.id, instruments: String(l.instruments).split(',').filter(Boolean), message: l.message, expires_at: l.expires_at,
        state: linkState(l), opened_at: l.opened_at, last_activity_at: l.last_activity_at, completed_at: l.completed_at,
        created_at: l.created_at, url: linkState(l) === 'revoked' ? null : linkUrl(req, l.token),
      })),
    });
  } catch (err) {
    console.error('[schema-inventories GET patient]', err);
    res.status(500).json({ error: 'Erro ao carregar inventários' });
  }
});

// POST /schema-inventories/applications { patient_id, instrument_id } — o profissional responde na tela
router.post('/applications', authMiddleware, async (req, res) => {
  try {
    await ready;
    const patientId = parseId(req.body?.patient_id);
    const instrumentId = String(req.body?.instrument_id || '');
    if (!patientId || !INSTRUMENTS[instrumentId]) return res.status(400).json({ error: 'Paciente e instrumento são obrigatórios' });
    if (!(await patientOfTenant(req, patientId))) return res.status(403).json({ error: 'Paciente não encontrado ou sem permissão' });
    const total = computeProgress(instrumentId, {}).total || INSTRUMENTS[instrumentId].items;
    const [r] = await db.query(
      `INSERT INTO schema_inventory_applications (tenant_id, patient_id, instrument_id, status, answers, total_count, created_by)
       VALUES (?, ?, ?, 'pending', '{}', ?, ?)`,
      [req.user.tenant_id, patientId, instrumentId, total, req.user.id]
    );
    const app = await loadApp(req, r.insertId);
    res.status(201).json(publicApp(app));
  } catch (err) {
    console.error('[schema-inventories POST application]', err);
    res.status(500).json({ error: 'Erro ao criar aplicação' });
  }
});

router.get('/applications/:id', authMiddleware, async (req, res) => {
  try {
    await ready;
    const app = await loadApp(req, parseId(req.params.id));
    if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });
    res.json(publicApp(app));
  } catch (err) {
    console.error('[schema-inventories GET application]', err);
    res.status(500).json({ error: 'Erro ao carregar aplicação' });
  }
});

// PUT /schema-inventories/applications/:id/answers { answers: patch } — salvar parcial (profissional)
router.put('/applications/:id/answers', authMiddleware, async (req, res) => {
  let conn;
  try {
    await ready;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Aplicação inválida' });
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[app]] = await conn.query('SELECT * FROM schema_inventory_applications WHERE id = ? AND tenant_id = ? FOR UPDATE', [id, req.user.tenant_id]);
    if (!app) { await conn.rollback(); return res.status(404).json({ error: 'Aplicação não encontrada' }); }
    if (app.status === 'completed') { await conn.rollback(); return res.status(409).json({ error: 'Aplicação concluída. Reabra para editar.', code: 'completed' }); }
    let patch;
    try { patch = sanitizePatch(app.instrument_id, req.body?.answers); } catch (e) { await conn.rollback(); return res.status(400).json({ error: e.message }); }
    const next = applyPatch(parseAnswers(app.answers), patch);
    const p = computeProgress(app.instrument_id, next);
    const ts = now();
    await conn.query(
      `UPDATE schema_inventory_applications
         SET answers = ?, answered_count = ?, total_count = ?, status = 'in_progress', last_saved_by = 'professional',
             started_at = COALESCE(started_at, ?), last_saved_at = ? WHERE id = ?`,
      [JSON.stringify(next), p.answered, p.total, ts, ts, id]
    );
    await conn.commit();
    res.json({ ok: true, answered_count: p.answered, total_count: p.total, complete: p.complete });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('[schema-inventories PUT answers]', err);
    res.status(500).json({ error: 'Erro ao salvar respostas' });
  } finally {
    if (conn) conn.release();
  }
});

// POST /schema-inventories/applications/:id/complete — concluir (exige todos os itens)
router.post('/applications/:id/complete', authMiddleware, async (req, res) => {
  try {
    await ready;
    const app = await loadApp(req, parseId(req.params.id));
    if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });
    if (app.status === 'completed') return res.json({ ok: true, already: true });
    const p = computeProgress(app.instrument_id, parseAnswers(app.answers));
    if (!p.complete) return res.status(400).json({ error: `Faltam ${p.total - p.answered} item(ns) para concluir.` });
    const ts = now();
    await db.query(
      `UPDATE schema_inventory_applications SET status = 'completed', answered_by = COALESCE(last_saved_by, 'professional'),
         answered_count = ?, total_count = ?, completed_at = ?, last_saved_at = ? WHERE id = ?`,
      [p.answered, p.total, ts, ts, app.id]
    );
    if (app.link_id) {
      const [[{ pending }]] = await db.query("SELECT COUNT(*) AS pending FROM schema_inventory_applications WHERE link_id = ? AND status <> 'completed'", [app.link_id]);
      if (pending === 0) await db.query('UPDATE schema_inventory_links SET completed_at = ? WHERE id = ?', [ts, app.link_id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[schema-inventories complete]', err);
    res.status(500).json({ error: 'Erro ao concluir' });
  }
});

// POST /schema-inventories/applications/:id/reopen — reabre uma aplicação concluída (mantém respostas)
router.post('/applications/:id/reopen', authMiddleware, async (req, res) => {
  try {
    await ready;
    const app = await loadApp(req, parseId(req.params.id));
    if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });
    await db.query("UPDATE schema_inventory_applications SET status = 'in_progress', completed_at = NULL WHERE id = ?", [app.id]);
    if (app.link_id) await db.query('UPDATE schema_inventory_links SET completed_at = NULL WHERE id = ?', [app.link_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[schema-inventories reopen]', err);
    res.status(500).json({ error: 'Erro ao reabrir' });
  }
});

router.delete('/applications/:id', authMiddleware, async (req, res) => {
  try {
    await ready;
    const app = await loadApp(req, parseId(req.params.id));
    if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });
    await db.query('DELETE FROM schema_inventory_applications WHERE id = ? AND tenant_id = ?', [app.id, req.user.tenant_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[schema-inventories DELETE application]', err);
    res.status(500).json({ error: 'Erro ao excluir' });
  }
});

// POST /schema-inventories/applications/:id/attach-record { title, content } — anexa o resultado ao prontuário
router.post('/applications/:id/attach-record', authMiddleware, checkPermission('create_medical_record'), async (req, res) => {
  try {
    await ready;
    const app = await loadApp(req, parseId(req.params.id));
    if (!app) return res.status(404).json({ error: 'Aplicação não encontrada' });
    if (app.status !== 'completed') return res.status(400).json({ error: 'Conclua o inventário antes de anexar ao prontuário' });
    const content = String(req.body?.content || '').slice(0, 60000);
    const title = String(req.body?.title || 'Inventário de Esquemas').slice(0, 250);
    if (!content.trim()) return res.status(400).json({ error: 'Conteúdo vazio' });
    const [r] = await db.query(
      `INSERT INTO medical_records (tenant_id, patient_id, professional_id, content, draft_content, record_type, title, status, ai_status, appointment_type)
       VALUES (?, ?, ?, ?, ?, 'Avaliacao', ?, 'Rascunho', 'pending', 'individual')`,
      [req.user.tenant_id, app.patient_id, req.user.id, content, content, title]
    );
    await db.query('UPDATE schema_inventory_applications SET attached_record_id = ? WHERE id = ?', [r.insertId, app.id]);
    res.json({ ok: true, record_id: r.insertId });
  } catch (err) {
    console.error('[schema-inventories attach-record]', err);
    res.status(500).json({ error: 'Erro ao anexar ao prontuário' });
  }
});

// POST /schema-inventories/links { patient_id, instruments: [ids em ordem], expires_days, message }
router.post('/links', authMiddleware, async (req, res) => {
  let conn;
  try {
    await ready;
    const patientId = parseId(req.body?.patient_id);
    const ids = Array.isArray(req.body?.instruments) ? [...new Set(req.body.instruments.map(String))].filter(i => INSTRUMENTS[i]) : [];
    if (!patientId || ids.length === 0) return res.status(400).json({ error: 'Selecione o paciente e ao menos um inventário' });
    const patient = await patientOfTenant(req, patientId);
    if (!patient) return res.status(403).json({ error: 'Paciente não encontrado ou sem permissão' });
    const days = Math.max(1, Math.min(90, parseInt(req.body?.expires_days, 10) || 15));
    const expiresAt = toDbDateTime(new Date(Date.now() + days * 86400000));
    const message = req.body?.message ? String(req.body.message).trim().slice(0, 1000) : null;
    const token = newToken();

    conn = await db.getConnection();
    await conn.beginTransaction();
    const [lr] = await conn.query(
      'INSERT INTO schema_inventory_links (tenant_id, patient_id, professional_id, token, instruments, message, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, patientId, req.user.id, token, ids.join(','), message, expiresAt]
    );
    for (const id of ids) {
      await conn.query(
        `INSERT INTO schema_inventory_applications (tenant_id, patient_id, instrument_id, link_id, status, answers, total_count, created_by)
         VALUES (?, ?, ?, ?, 'pending', '{}', ?, ?)`,
        [req.user.tenant_id, patientId, id, lr.insertId, computeProgress(id, {}).total || INSTRUMENTS[id].items, req.user.id]
      );
    }
    await conn.commit();
    res.status(201).json({ id: lr.insertId, instruments: ids, expires_at: expiresAt, url: linkUrl(req, token) });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error('[schema-inventories POST link]', err);
    res.status(500).json({ error: 'Erro ao gerar link' });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/links/:id/revoke', authMiddleware, async (req, res) => {
  try {
    await ready;
    const [r] = await db.query('UPDATE schema_inventory_links SET revoked = 1 WHERE id = ? AND tenant_id = ?', [parseId(req.params.id), req.user.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[schema-inventories revoke]', err);
    res.status(500).json({ error: 'Erro ao revogar link' });
  }
});

router.post('/links/:id/extend', authMiddleware, async (req, res) => {
  try {
    await ready;
    const days = Math.max(1, Math.min(90, parseInt(req.body?.days, 10) || 7));
    const expiresAt = toDbDateTime(new Date(Date.now() + days * 86400000));
    const [r] = await db.query('UPDATE schema_inventory_links SET expires_at = ?, revoked = 0 WHERE id = ? AND tenant_id = ?', [expiresAt, parseId(req.params.id), req.user.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Link não encontrado' });
    res.json({ ok: true, expires_at: expiresAt });
  } catch (err) {
    console.error('[schema-inventories extend]', err);
    res.status(500).json({ error: 'Erro ao prorrogar link' });
  }
});

module.exports = router;
