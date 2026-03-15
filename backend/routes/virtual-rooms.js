const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Auto-migrate virtual_rooms table to full schema
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

// GET /virtual-rooms/:id
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
    // Run schema migration (silently, best-effort)
    try { await withSchema(); } catch (_) {}

    const {
      title, name,
      description, code,
      scheduled_start, scheduled_end,
      patient_id, professional_id, appointment_id,
      provider, link, expiration_date,
      max_participants
    } = req.body || {};

    const roomTitle = (title || name || '').trim();
    if (!roomTitle) return res.status(400).json({ error: 'Nome da sala é obrigatório' });

    const hash = uuidv4().replace(/-/g, '').substring(0, 20);
    const roomCode = (code || Math.random().toString(36).substr(2, 9)).toString().trim();

    // Get current columns to build a safe INSERT
    const [colRows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'virtual_rooms'`
    );
    const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME));

    const cols = ['tenant_id', 'name', 'host_id', 'max_participants', 'hash'];
    const vals = [req.user.tenant_id, roomTitle, req.user.id, max_participants || 10, hash];

    const optionals = [
      ['title', roomTitle],
      ['description', description || null],
      ['code', roomCode],
      ['scheduled_start', scheduled_start || null],
      ['scheduled_end', scheduled_end || null],
      ['patient_id', patient_id || null],
      ['professional_id', professional_id || null],
      ['appointment_id', appointment_id || null],
      ['provider', provider || 'jitsi'],
      ['link', link || null],
      ['expiration_date', expiration_date || null],
    ];

    for (const [col, val] of optionals) {
      if (existingCols.has(col)) { cols.push(col); vals.push(val); }
    }

    const placeholders = cols.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO virtual_rooms (${cols.join(', ')}) VALUES (${placeholders})`,
      vals
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
         name = COALESCE(?, name),
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         scheduled_start = ?,
         scheduled_end = ?,
         patient_id = ?,
         professional_id = ?,
         provider = COALESCE(?, provider),
         link = ?,
         expiration_date = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        roomTitle, roomTitle, description,
        scheduled_start || null, scheduled_end || null,
        patient_id || null, professional_id || null,
        provider, link || null, expiration_date || null,
        req.params.id, req.user.tenant_id
      ]
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

// ── In-memory store for real-time room state ─────────────────────────────────
// waitingMap: roomKey → Map(entryId → { id, guest_name, status, created_at })
// participantsMap: roomKey → Map(token → { name, joined_at })
const waitingMap = new Map();
const participantsMap = new Map();
let _waitingSeq = 1;

function getRoomKey(id) { return String(id).toLowerCase().trim(); }
function ensureRoom(map, key) { if (!map.has(key)) map.set(key, new Map()); return map.get(key); }

// POST /virtual-rooms/:id/events
router.post('/:id/events', async (req, res) => { res.json({ ok: true }); });

// POST /virtual-rooms/:id/messages
router.post('/:id/messages', async (req, res) => { res.json({ ok: true, timestamp: new Date().toISOString() }); });

// GET /virtual-rooms/:id/waiting — host polls who is waiting
router.get('/:id/waiting', async (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key) || new Map();
  res.json([...room.values()]);
});

// POST /virtual-rooms/:id/waiting/:entryId/approve
router.post('/:id/waiting/:entryId/approve', async (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key);
  if (room) {
    const entry = room.get(req.params.entryId);
    if (entry) entry.status = 'approved';
  }
  res.json({ ok: true });
});

// POST /virtual-rooms/:id/waiting/:entryId/deny
router.post('/:id/waiting/:entryId/deny', async (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = waitingMap.get(key);
  if (room) {
    const entry = room.get(req.params.entryId);
    if (entry) entry.status = 'denied';
  }
  res.json({ ok: true });
});

// GET /virtual-rooms/:id/participants — host polls who is connected
router.get('/:id/participants', async (req, res) => {
  const key = getRoomKey(req.params.id);
  const room = participantsMap.get(key) || new Map();
  res.json([...room.values()].map(p => ({ name: p.name, joined_at: p.joined_at })));
});

// ── Rotas públicas (sem auth) ─────────────────────────────────────────────────

// POST /virtual-rooms/public/:id/join — guest enters room after approval
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
      ensureRoom(participantsMap, key).set(token, { name, joined_at: new Date().toISOString() });
    }
    res.json({ room: rooms[0], participant_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar na sala' });
  }
});

// POST /virtual-rooms/public/:id/waiting — guest requests to join (enters waiting room)
router.post('/public/:id/waiting', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const token = uuidv4();
  const entryId = String(_waitingSeq++);
  const key = getRoomKey(req.params.id);
  const entry = { id: entryId, guest_name: name, status: 'waiting', token, created_at: new Date().toISOString() };
  ensureRoom(waitingMap, key).set(entryId, entry);
  res.json({ token, entry_id: entryId });
});

// GET /virtual-rooms/public/waiting/:token — guest polls approval status
router.get('/public/waiting/:token', async (req, res) => {
  for (const room of waitingMap.values()) {
    for (const entry of room.values()) {
      if (entry.token === req.params.token) {
        return res.json({ status: entry.status, entry_id: entry.id });
      }
    }
  }
  res.json({ status: 'waiting' });
});

router.post('/public/:id/events', async (req, res) => { res.json({ ok: true }); });
router.post('/public/:id/messages', async (req, res) => { res.json({ ok: true }); });

// POST /virtual-rooms/public/:id/leave — guest leaves
router.post('/public/:id/leave', async (req, res) => {
  const { token } = req.body || {};
  if (token) {
    const key = getRoomKey(req.params.id);
    const room = participantsMap.get(key);
    if (room) room.delete(token);
  }
  res.json({ ok: true });
});

module.exports = router;
