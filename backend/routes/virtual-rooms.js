const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ── Auto-migrate virtual_rooms table ─────────────────────────────────────────
async function ensureSchema() {
  const cols = [
    'ALTER TABLE virtual_rooms ADD COLUMN title VARCHAR(200) NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN description TEXT NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN code VARCHAR(64) NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN scheduled_start DATETIME NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN scheduled_end DATETIME NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN patient_id INT NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN professional_id INT NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN appointment_id INT NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN provider VARCHAR(32) NULL DEFAULT "jitsi"',
    'ALTER TABLE virtual_rooms ADD COLUMN link VARCHAR(512) NULL',
    'ALTER TABLE virtual_rooms ADD COLUMN expiration_date DATETIME NULL',
  ];
  for (const sql of cols) {
    try { await db.query(sql); } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  }
}
let schemaReady = false;
async function withSchema() {
  if (!schemaReady) { await ensureSchema(); schemaReady = true; }
}

// ── In-memory real-time stores ────────────────────────────────────────────────
// Each store: roomKey → Array of items with auto-increment id
const eventsMap      = new Map(); // { id, event_type, payload_json, created_at }
const messagesMap    = new Map(); // { id, sender_name, content, created_at }
const assessmentsMap = new Map(); // { id, event_type, assessment_id, question_id, payload_json, created_at }
const transcriptsMap = new Map(); // { id, speaker_name, text, created_at }
const waitingMap     = new Map(); // { id(string), guest_name, status, token, created_at }
const participantsMap = new Map();

let _seq = 1;
const nextId = () => _seq++;

function getRoomKey(id) { return String(id).toLowerCase().trim(); }
function getList(map, key) {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
}
function pushItem(map, key, item) {
  getList(map, key).push(item);
  return item;
}
function sinceItems(map, key, since) {
  const n = Number(since) || 0;
  return getList(map, key).filter(i => i.id > n);
}

// ── CRUD Routes (auth required via index.js) ──────────────────────────────────

// GET /virtual-rooms
router.get('/', async (req, res) => {
  try {
    await withSchema();
    const [rooms] = await db.query(
      `SELECT r.*, u.name as host_name
       FROM virtual_rooms r
       LEFT JOIN users u ON u.id = r.host_id
       WHERE r.tenant_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
});

// GET /virtual-rooms/:id  (must come before sub-routes that use /:id/xxx)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as host_name
       FROM virtual_rooms r
       LEFT JOIN users u ON u.id = r.host_id
       WHERE (r.id = ? OR r.code = ? OR r.hash = ?) AND r.tenant_id = ?`,
      [req.params.id, req.params.id, req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Sala não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
});

// POST /virtual-rooms
router.post('/', async (req, res) => {
  try {
    try { await withSchema(); } catch (_) {}
    const {
      title, name, description, code,
      scheduled_start, scheduled_end,
      patient_id, professional_id, appointment_id,
      provider, link, expiration_date, max_participants
    } = req.body || {};

    const roomTitle = (title || name || '').trim();
    if (!roomTitle) return res.status(400).json({ error: 'Nome da sala é obrigatório' });

    const hash = uuidv4().replace(/-/g, '').substring(0, 20);
    const roomCode = (code || Math.random().toString(36).substr(2, 9)).toString().trim();

    const [colRows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'virtual_rooms'`
    );
    const existingCols = new Set(colRows.map(r => r.COLUMN_NAME));

    const cols = ['tenant_id', 'name', 'host_id', 'max_participants', 'hash'];
    const vals = [req.user.tenant_id, roomTitle, req.user.id, max_participants || 10, hash];

    const optionals = [
      ['title', roomTitle], ['description', description || null],
      ['code', roomCode], ['scheduled_start', scheduled_start || null],
      ['scheduled_end', scheduled_end || null], ['patient_id', patient_id || null],
      ['professional_id', professional_id || null], ['appointment_id', appointment_id || null],
      ['provider', provider || 'jitsi'], ['link', link || null],
      ['expiration_date', expiration_date || null],
    ];
    for (const [col, val] of optionals) {
      if (existingCols.has(col)) { cols.push(col); vals.push(val); }
    }

    const placeholders = cols.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO virtual_rooms (${cols.join(', ')}) VALUES (${placeholders})`, vals
    );
    const [room] = await db.query('SELECT * FROM virtual_rooms WHERE id = ?', [result.insertId]);
    res.status(201).json(room[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

// PUT /virtual-rooms/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, name, description, scheduled_start, scheduled_end, patient_id, professional_id, provider, link, expiration_date } = req.body;
    const roomTitle = title || name;
    await db.query(
      `UPDATE virtual_rooms SET
         name = COALESCE(?, name), title = COALESCE(?, title),
         description = COALESCE(?, description),
         scheduled_start = ?, scheduled_end = ?,
         patient_id = ?, professional_id = ?,
         provider = COALESCE(?, provider),
         link = ?, expiration_date = ?
       WHERE id = ? AND tenant_id = ?`,
      [roomTitle, roomTitle, description,
       scheduled_start || null, scheduled_end || null,
       patient_id || null, professional_id || null,
       provider, link || null, expiration_date || null,
       req.params.id, req.user.tenant_id]
    );
    const [rows] = await db.query('SELECT * FROM virtual_rooms WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sala não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar sala' });
  }
});

// DELETE /virtual-rooms/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM virtual_rooms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sala não encontrada' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar sala' });
  }
});

// ── Real-time: Events ─────────────────────────────────────────────────────────

// GET /virtual-rooms/:id/events?since=0
router.get('/:id/events', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(eventsMap, key, req.query.since));
});

// POST /virtual-rooms/:id/events
router.post('/:id/events', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { event_type, payload } = req.body || {};
  if (!event_type) return res.json({ ok: true });
  const item = pushItem(eventsMap, key, {
    id: nextId(),
    event_type,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// ── Real-time: Messages ───────────────────────────────────────────────────────

// GET /virtual-rooms/:id/messages?since=0
router.get('/:id/messages', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(messagesMap, key, req.query.since));
});

// POST /virtual-rooms/:id/messages
router.post('/:id/messages', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { sender_name, message } = req.body || {};
  const item = pushItem(messagesMap, key, {
    id: nextId(),
    sender_name: sender_name || 'Profissional',
    content: message || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id, timestamp: item.created_at });
});

// ── Real-time: Assessments ────────────────────────────────────────────────────

// GET /virtual-rooms/:id/assessments?since=0
router.get('/:id/assessments', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(assessmentsMap, key, req.query.since));
});

// POST /virtual-rooms/:id/assessments
router.post('/:id/assessments', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { event_type, assessment_id, question_id, payload } = req.body || {};
  const item = pushItem(assessmentsMap, key, {
    id: nextId(),
    event_type: event_type || '',
    assessment_id: assessment_id || '',
    question_id: question_id || null,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// ── Real-time: Transcripts ────────────────────────────────────────────────────

// GET /virtual-rooms/:id/transcripts?since=0
router.get('/:id/transcripts', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(transcriptsMap, key, req.query.since));
});

// POST /virtual-rooms/:id/transcripts
router.post('/:id/transcripts', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { speaker_name, text } = req.body || {};
  const item = pushItem(transcriptsMap, key, {
    id: nextId(),
    speaker_name: speaker_name || '',
    text: text || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// ── Waiting room ──────────────────────────────────────────────────────────────

let _waitingSeq = 1;

// GET /virtual-rooms/:id/waiting
router.get('/:id/waiting', (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key) || new Map();
  res.json([...room.values()]);
});

// GET /virtual-rooms/:id/participants
router.get('/:id/participants', (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = participantsMap.get(key) || new Map();
  res.json([...room.values()].map(p => ({ name: p.name, joined_at: p.joined_at })));
});

// POST /virtual-rooms/:id/waiting/:entryId/approve
router.post('/:id/waiting/:entryId/approve', (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key);
  if (room) {
    const entry = room.get(req.params.entryId);
    if (entry) entry.status = 'approved';
  }
  res.json({ ok: true });
});

// POST /virtual-rooms/:id/waiting/:entryId/deny
router.post('/:id/waiting/:entryId/deny', (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key);
  if (room) {
    const entry = room.get(req.params.entryId);
    if (entry) entry.status = 'denied';
  }
  res.json({ ok: true });
});

// ── Public routes (no auth) ───────────────────────────────────────────────────

// POST /virtual-rooms/public/:id/join
router.post('/public/:id/join', async (req, res) => {
  try {
    const [rooms] = await db.query(
      'SELECT id, name, title, status, code, hash FROM virtual_rooms WHERE hash = ? OR code = ? OR id = ?',
      [req.params.id, req.params.id, req.params.id]
    );
    if (rooms.length === 0) return res.status(404).json({ error: 'Sala não encontrada' });
    if (rooms[0].status === 'ended') return res.status(410).json({ error: 'Esta sala já foi encerrada' });

    const token = uuidv4();
    const { name } = req.body || {};
    if (name) {
      const key = getRoomKey(req.params.id);
      if (!participantsMap.has(key)) participantsMap.set(key, new Map());
      participantsMap.get(key).set(token, { name, joined_at: new Date().toISOString() });
    }
    res.json({ room: rooms[0], participant_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar na sala' });
  }
});

// POST /virtual-rooms/public/:id/waiting
router.post('/public/:id/waiting', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const token = uuidv4();
  const entryId = String(_waitingSeq++);
  const key = getRoomKey(req.params.id);
  if (!waitingMap.has(key)) waitingMap.set(key, new Map());
  const entry = { id: entryId, guest_name: name, status: 'waiting', token, created_at: new Date().toISOString() };
  waitingMap.get(key).set(entryId, entry);
  res.json({ token, entry_id: entryId });
});

// GET /virtual-rooms/public/waiting/:token
router.get('/public/waiting/:token', (req, res) => {
  for (const room of waitingMap.values()) {
    for (const entry of room.values()) {
      if (entry.token === req.params.token) {
        return res.json({ status: entry.status, entry_id: entry.id });
      }
    }
  }
  res.json({ status: 'waiting' });
});

// GET /virtual-rooms/public/:id/events?since=0
router.get('/public/:id/events', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(eventsMap, key, req.query.since));
});

// POST /virtual-rooms/public/:id/events
router.post('/public/:id/events', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { event_type, payload } = req.body || {};
  if (!event_type) return res.json({ ok: true });
  const item = pushItem(eventsMap, key, {
    id: nextId(),
    event_type,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// GET /virtual-rooms/public/:id/messages?since=0
router.get('/public/:id/messages', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(messagesMap, key, req.query.since));
});

// POST /virtual-rooms/public/:id/messages
router.post('/public/:id/messages', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { sender_name, message } = req.body || {};
  const item = pushItem(messagesMap, key, {
    id: nextId(),
    sender_name: sender_name || 'Paciente',
    content: message || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id, timestamp: item.created_at });
});

// GET /virtual-rooms/public/:id/assessments?since=0
router.get('/public/:id/assessments', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(assessmentsMap, key, req.query.since));
});

// POST /virtual-rooms/public/:id/assessments
router.post('/public/:id/assessments', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { event_type, assessment_id, question_id, payload } = req.body || {};
  const item = pushItem(assessmentsMap, key, {
    id: nextId(),
    event_type: event_type || '',
    assessment_id: assessment_id || '',
    question_id: question_id || null,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// GET /virtual-rooms/public/:id/transcripts?since=0
router.get('/public/:id/transcripts', (req, res) => {
  const key = getRoomKey(req.params.id);
  res.json(sinceItems(transcriptsMap, key, req.query.since));
});

// POST /virtual-rooms/public/:id/transcripts
router.post('/public/:id/transcripts', (req, res) => {
  const key = getRoomKey(req.params.id);
  const { speaker_name, text } = req.body || {};
  const item = pushItem(transcriptsMap, key, {
    id: nextId(),
    speaker_name: speaker_name || '',
    text: text || '',
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true, id: item.id });
});

// POST /virtual-rooms/public/:id/leave
router.post('/public/:id/leave', (req, res) => {
  const { token } = req.body || {};
  if (token) {
    const key = getRoomKey(req.params.id);
    const room = participantsMap.get(key);
    if (room) room.delete(token);
  }
  res.json({ ok: true });
});

module.exports = router;
