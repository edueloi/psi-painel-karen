const express = require('express');
const router = express.Router();
const db = require('../db');

/* ─── helpers ─────────────────────────────────────────────── */
const getJson = async (tenantId, scopeKey, toolType) => {
  const [rows] = await db.query(
    'SELECT id, data FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
    [scopeKey, toolType, tenantId]
  );
  if (rows.length === 0) return { rowId: null, data: null };
  let data = rows[0].data;
  try { data = JSON.parse(data); } catch {}
  return { rowId: rows[0].id, data };
};

const saveJson = async (tenantId, patientId, userId, scopeKey, toolType, data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const [rows] = await db.query(
    'SELECT id FROM clinical_tools WHERE scope_key = ? AND tool_type = ? AND tenant_id = ?',
    [scopeKey, toolType, tenantId]
  );
  if (rows.length > 0) {
    await db.query('UPDATE clinical_tools SET data = ?, updated_at = NOW() WHERE id = ?', [str, rows[0].id]);
  } else {
    await db.query(
      'INSERT INTO clinical_tools (tenant_id, patient_id, professional_id, scope_key, tool_type, data) VALUES (?, ?, ?, ?, ?, ?)',
      [tenantId, patientId || 0, userId, scopeKey, toolType, str]
    );
  }
};

const getArray = async (tenantId, scopeKey, toolType) => {
  const { data } = await getJson(tenantId, scopeKey, toolType);
  return Array.isArray(data) ? data : [];
};

/* ═══════════════════════════════════════════════════════════
   TCC – Registro de Pensamentos Disfuncionais (RPD) + Cartões
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/tcc → { records, cards }
router.get('/:scopeKey/tcc', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [records, cards] = await Promise.all([
      getArray(tid, scopeKey, 'tcc/rpd'),
      getArray(tid, scopeKey, 'tcc/cards'),
    ]);
    res.json({ records, cards });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar TCC' }); }
});

// POST /clinical-tools/:scopeKey/tcc/rpd → add record
router.post('/:scopeKey/tcc/rpd', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { situation, thought, emotion, intensity } = req.body;
    const records = await getArray(req.user.tenant_id, scopeKey, 'tcc/rpd');
    const entry = { id: Date.now(), situation, thought, emotion: emotion || '', intensity: intensity ?? 5, created_at: new Date().toISOString() };
    records.push(entry);
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/rpd', records);
    res.status(201).json(entry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar RPD' }); }
});

// PUT /clinical-tools/:scopeKey/tcc/rpd/:id → update record
router.put('/:scopeKey/tcc/rpd/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    const { situation, thought, emotion, intensity } = req.body;
    const records = await getArray(req.user.tenant_id, scopeKey, 'tcc/rpd');
    const idx = records.findIndex(r => String(r.id) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado' });
    records[idx] = { ...records[idx], situation, thought, emotion: emotion || '', intensity: intensity ?? records[idx].intensity };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/rpd', records);
    res.json(records[idx]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar RPD' }); }
});

// PATCH /clinical-tools/:scopeKey/tcc/rpd/:id → partial update
router.patch('/:scopeKey/tcc/rpd/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    const records = await getArray(req.user.tenant_id, scopeKey, 'tcc/rpd');
    const idx = records.findIndex(r => String(r.id) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: 'Registro não encontrado' });
    records[idx] = { ...records[idx], ...req.body };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/rpd', records);
    res.json(records[idx]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar RPD' }); }
});

// DELETE /clinical-tools/:scopeKey/tcc/rpd/:id
router.delete('/:scopeKey/tcc/rpd/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    let records = await getArray(req.user.tenant_id, scopeKey, 'tcc/rpd');
    records = records.filter(r => String(r.id) !== String(itemId));
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/rpd', records);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao excluir RPD' }); }
});

// POST /clinical-tools/:scopeKey/tcc/cards → add card
router.post('/:scopeKey/tcc/cards', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { front, back } = req.body;
    const cards = await getArray(req.user.tenant_id, scopeKey, 'tcc/cards');
    const entry = { id: Date.now(), front, back, created_at: new Date().toISOString() };
    cards.push(entry);
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/cards', cards);
    res.status(201).json(entry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar cartão' }); }
});

// PUT /clinical-tools/:scopeKey/tcc/cards/:id
router.put('/:scopeKey/tcc/cards/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    const { front, back } = req.body;
    const cards = await getArray(req.user.tenant_id, scopeKey, 'tcc/cards');
    const idx = cards.findIndex(c => String(c.id) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: 'Cartão não encontrado' });
    cards[idx] = { ...cards[idx], front, back };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/cards', cards);
    res.json(cards[idx]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar cartão' }); }
});

// DELETE /clinical-tools/:scopeKey/tcc/cards/:id
router.delete('/:scopeKey/tcc/cards/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    let cards = await getArray(req.user.tenant_id, scopeKey, 'tcc/cards');
    cards = cards.filter(c => String(c.id) !== String(itemId));
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'tcc/cards', cards);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao excluir cartão' }); }
});

/* ═══════════════════════════════════════════════════════════
   TERAPIA DO ESQUEMA
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/schema/latest
router.get('/:scopeKey/schema/latest', async (req, res) => {
  try {
    const { data } = await getJson(req.user.tenant_id, req.params.scopeKey, 'schema/latest');
    res.json(data || null);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar esquema' }); }
});

// POST /clinical-tools/:scopeKey/schema/snapshot → save schema state
router.post('/:scopeKey/schema/snapshot', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { active_schemas, modes } = req.body;
    const payload = { active_schemas: active_schemas || [], modes: modes || [], updated_at: new Date().toISOString() };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'schema/latest', payload);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar esquema' }); }
});

/* ═══════════════════════════════════════════════════════════
   PSICOTERAPIA (sonhos, texto livre, significantes)
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/psycho → { dreams, freeText, signifiers }
router.get('/:scopeKey/psycho', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [dreams, freeRaw, signifiers] = await Promise.all([
      getArray(tid, scopeKey, 'psycho/dreams'),
      getJson(tid, scopeKey, 'psycho/free'),
      getArray(tid, scopeKey, 'psycho/signifiers'),
    ]);
    const freeText = typeof freeRaw.data === 'string' ? freeRaw.data :
      (freeRaw.data?.content ?? '');
    res.json({ dreams, freeText, signifiers });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar psico' }); }
});

// POST /clinical-tools/:scopeKey/psycho/dreams → add dream
router.post('/:scopeKey/psycho/dreams', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const dreams = await getArray(req.user.tenant_id, scopeKey, 'psycho/dreams');
    const entry = { id: Date.now(), ...req.body, created_at: new Date().toISOString() };
    dreams.push(entry);
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/dreams', dreams);
    res.status(201).json(entry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar sonho' }); }
});

// PUT /clinical-tools/:scopeKey/psycho/dreams/:id
router.put('/:scopeKey/psycho/dreams/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    const dreams = await getArray(req.user.tenant_id, scopeKey, 'psycho/dreams');
    const idx = dreams.findIndex(d => String(d.id) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: 'Sonho não encontrado' });
    dreams[idx] = { ...dreams[idx], ...req.body };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/dreams', dreams);
    res.json(dreams[idx]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar sonho' }); }
});

// DELETE /clinical-tools/:scopeKey/psycho/dreams/:id
router.delete('/:scopeKey/psycho/dreams/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    let dreams = await getArray(req.user.tenant_id, scopeKey, 'psycho/dreams');
    dreams = dreams.filter(d => String(d.id) !== String(itemId));
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/dreams', dreams);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao excluir sonho' }); }
});

// PUT /clinical-tools/:scopeKey/psycho/free → save free text
router.put('/:scopeKey/psycho/free', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { content } = req.body;
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/free', content ?? '');
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar texto livre' }); }
});

// PATCH /clinical-tools/:scopeKey/psycho/free
router.patch('/:scopeKey/psycho/free', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { content } = req.body;
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/free', content ?? '');
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar texto livre' }); }
});

// POST /clinical-tools/:scopeKey/psycho/signifiers → add signifier
router.post('/:scopeKey/psycho/signifiers', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { term } = req.body;
    const list = await getArray(req.user.tenant_id, scopeKey, 'psycho/signifiers');
    const entry = { id: Date.now(), term, created_at: new Date().toISOString() };
    list.push(entry);
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/signifiers', list);
    res.status(201).json(entry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar significante' }); }
});

// DELETE /clinical-tools/:scopeKey/psycho/signifiers/:id
router.delete('/:scopeKey/psycho/signifiers/:itemId', async (req, res) => {
  try {
    const { scopeKey, itemId } = req.params;
    let list = await getArray(req.user.tenant_id, scopeKey, 'psycho/signifiers');
    list = list.filter(s => String(s.id) !== String(itemId));
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, 'psycho/signifiers', list);
    res.status(204).send();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao excluir significante' }); }
});

/* ═══════════════════════════════════════════════════════════
   GET /clinical-tools/summary?patient_id=X (para Patients.tsx)
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   INSTRUMENTS SUMMARY — lista todos DASS-21 do tenant
   ═══════════════════════════════════════════════════════════ */
// GET /clinical-tools/:toolType/all → busca todos os registros de um tipo para o tenant
router.get('/:toolType/all', async (req, res) => {
  try {
    const { toolType } = req.params;
    const tid = req.user.tenant_id;
    const [rows] = await db.query(
      `SELECT ct.scope_key, ct.data, ct.updated_at,
              p.id as patient_id, p.name as patient_name
       FROM clinical_tools ct
       LEFT JOIN patients p ON p.id = ct.patient_id AND p.tenant_id = ?
       WHERE ct.tenant_id = ? AND ct.tool_type = ?
       ORDER BY ct.updated_at DESC`,
      [tid, tid, toolType]
    );
    const result = rows.map(r => {
      let history = [];
      try { history = JSON.parse(r.data || '[]'); } catch {}
      const last = Array.isArray(history) ? history[history.length - 1] : (typeof history === 'object' ? history : null);
      return {
        patient_id: r.patient_id || r.scope_key,
        patient_name: r.patient_name || `Paciente ${r.scope_key}`,
        updated_at: r.updated_at,
        sessions: Array.isArray(history) ? history.length : (history ? 1 : 0),
        last_scores: last?.scores || last?.score || null,
        last_date: last?.date || last?.created_at || r.updated_at,
        history: Array.isArray(history) ? history : [history].filter(Boolean),
      };
    });
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: `Erro ao buscar dados de ${req.params.toolType}` }); }
});

router.get('/dass-all', async (req, res) => {
  res.redirect(307, `./dass-21/all`);
});

router.get('/summary', async (req, res) => {
  try {
    const { patient_id } = req.query;
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) as count FROM clinical_tools WHERE tenant_id = ? AND (patient_id = ? OR scope_key = ?)',
      [req.user.tenant_id, patient_id || 0, String(patient_id || '')]
    );
    res.json({ count: Number(count) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar resumo' }); }
});

/* ═══════════════════════════════════════════════════════════
   FAP — Psicoterapia Analítica Funcional
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/fap → { crbs, five_rules, session_notes }
router.get('/:scopeKey/fap', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [crbsRaw, fiveRulesRaw, notesRaw] = await Promise.all([
      getArray(tid, scopeKey, 'fap/crbs'),
      getJson(tid, scopeKey, 'fap/five_rules'),
      getArray(tid, scopeKey, 'fap/session_notes'),
    ]);
    res.json({
      crbs: crbsRaw,
      five_rules: fiveRulesRaw.data || {},
      session_notes: notesRaw,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar FAP' }); }
});

// PUT /clinical-tools/:scopeKey/fap
router.put('/:scopeKey/fap', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { crbs, five_rules, session_notes } = req.body;
    const pid = req.body.patient_id || null;
    const uid = req.user.id;
    const tid = req.user.tenant_id;
    await Promise.all([
      crbs !== undefined ? saveJson(tid, pid, uid, scopeKey, 'fap/crbs', crbs) : Promise.resolve(),
      five_rules !== undefined ? saveJson(tid, pid, uid, scopeKey, 'fap/five_rules', five_rules) : Promise.resolve(),
      session_notes !== undefined ? saveJson(tid, pid, uid, scopeKey, 'fap/session_notes', session_notes) : Promise.resolve(),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar FAP' }); }
});

/* ═══════════════════════════════════════════════════════════
   MINDFULNESS — Atenção Plena
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/mindfulness → { practices, bodyscans, anchors }
router.get('/:scopeKey/mindfulness', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [practices, bodyscans, anchors] = await Promise.all([
      getArray(tid, scopeKey, 'mindfulness/practices'),
      getArray(tid, scopeKey, 'mindfulness/bodyscans'),
      getArray(tid, scopeKey, 'mindfulness/anchors'),
    ]);
    res.json({ practices, bodyscans, anchors });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar Mindfulness' }); }
});

// PUT /clinical-tools/:scopeKey/mindfulness
router.put('/:scopeKey/mindfulness', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { practices, bodyscans, anchors } = req.body;
    const pid = req.body.patient_id || null;
    const uid = req.user.id;
    const tid = req.user.tenant_id;
    await Promise.all([
      practices !== undefined ? saveJson(tid, pid, uid, scopeKey, 'mindfulness/practices', practices) : Promise.resolve(),
      bodyscans !== undefined ? saveJson(tid, pid, uid, scopeKey, 'mindfulness/bodyscans', bodyscans) : Promise.resolve(),
      anchors !== undefined ? saveJson(tid, pid, uid, scopeKey, 'mindfulness/anchors', anchors) : Promise.resolve(),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar Mindfulness' }); }
});

/* ═══════════════════════════════════════════════════════════
   PSICOLOGIA POSITIVA — VIA / Gratidão / PERMA
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/positivepsych → { strengths, gratitude_entries, wellbeing }
router.get('/:scopeKey/positivepsych', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [strengths, gratitudeEntries, wellbeingRaw] = await Promise.all([
      getArray(tid, scopeKey, 'positivepsych/strengths'),
      getArray(tid, scopeKey, 'positivepsych/gratitude'),
      getJson(tid, scopeKey, 'positivepsych/wellbeing'),
    ]);
    res.json({
      strengths,
      gratitude_entries: gratitudeEntries,
      wellbeing: wellbeingRaw.data || {},
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar Psicologia Positiva' }); }
});

// PUT /clinical-tools/:scopeKey/positivepsych
router.put('/:scopeKey/positivepsych', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { strengths, gratitude_entries, wellbeing } = req.body;
    const pid = req.body.patient_id || null;
    const uid = req.user.id;
    const tid = req.user.tenant_id;
    await Promise.all([
      strengths !== undefined ? saveJson(tid, pid, uid, scopeKey, 'positivepsych/strengths', strengths) : Promise.resolve(),
      gratitude_entries !== undefined ? saveJson(tid, pid, uid, scopeKey, 'positivepsych/gratitude', gratitude_entries) : Promise.resolve(),
      wellbeing !== undefined ? saveJson(tid, pid, uid, scopeKey, 'positivepsych/wellbeing', wellbeing) : Promise.resolve(),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar Psicologia Positiva' }); }
});

/* ═══════════════════════════════════════════════════════════
   ACT — Aceitação e Compromisso (dados completos)
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/act → { values, defusions, matrix }
router.get('/:scopeKey/act', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const tid = req.user.tenant_id;
    const [values, defusions, matrixRaw] = await Promise.all([
      getArray(tid, scopeKey, 'act/values'),
      getArray(tid, scopeKey, 'act/defusions'),
      getJson(tid, scopeKey, 'act/matrix'),
    ]);
    res.json({ values, defusions, matrix: matrixRaw.data || {} });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar ACT' }); }
});

// PUT /clinical-tools/:scopeKey/act
router.put('/:scopeKey/act', async (req, res) => {
  try {
    const { scopeKey } = req.params;
    const { values, defusions, matrix } = req.body;
    const pid = req.body.patient_id || null;
    const uid = req.user.id;
    const tid = req.user.tenant_id;
    await Promise.all([
      values !== undefined ? saveJson(tid, pid, uid, scopeKey, 'act/values', values) : Promise.resolve(),
      defusions !== undefined ? saveJson(tid, pid, uid, scopeKey, 'act/defusions', defusions) : Promise.resolve(),
      matrix !== undefined ? saveJson(tid, pid, uid, scopeKey, 'act/matrix', matrix) : Promise.resolve(),
    ]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar ACT' }); }
});

/* ═══════════════════════════════════════════════════════════
   Rotas genéricas paramétricas (2 parâmetros: toolType)
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/:toolType
router.get('/:scopeKey/:toolType', async (req, res, next) => {
  // Ignora se 'summary' passar por aqui indevidamente
  if (req.params.scopeKey === 'summary') return next();
  try {
    const { scopeKey, toolType } = req.params;
    const { data } = await getJson(req.user.tenant_id, scopeKey, toolType);
    res.json(data !== null ? data : null);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar ferramenta' }); }
});

// PUT /clinical-tools/:scopeKey/:toolType
router.put('/:scopeKey/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolType } = req.params;
    await saveJson(req.user.tenant_id, req.body.patient_id, req.user.id, scopeKey, toolType, req.body.data ?? req.body);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar ferramenta' }); }
});

// PATCH /clinical-tools/:scopeKey/:toolType
router.patch('/:scopeKey/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolType } = req.params;
    const { data: existing } = await getJson(req.user.tenant_id, scopeKey, toolType);
    const merged = { ...(typeof existing === 'object' && existing !== null ? existing : {}), ...req.body };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, toolType, merged);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar ferramenta' }); }
});

/* ═══════════════════════════════════════════════════════════
   Rotas genéricas aninhadas (3 parâmetros: category/type)
   ═══════════════════════════════════════════════════════════ */

// GET /clinical-tools/:scopeKey/:toolCategory/:toolType
router.get('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;
    const { data } = await getJson(req.user.tenant_id, scopeKey, fullType);
    res.json(data !== null ? { data } : null);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao buscar ferramenta clínica' }); }
});

// PUT /clinical-tools/:scopeKey/:toolCategory/:toolType
router.put('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;
    await saveJson(req.user.tenant_id, req.body.patient_id, req.user.id, scopeKey, fullType, req.body.data ?? req.body);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao salvar ferramenta clínica' }); }
});

// PATCH /clinical-tools/:scopeKey/:toolCategory/:toolType
router.patch('/:scopeKey/:toolCategory/:toolType', async (req, res) => {
  try {
    const { scopeKey, toolCategory, toolType } = req.params;
    const fullType = `${toolCategory}/${toolType}`;
    const { data: existing } = await getJson(req.user.tenant_id, scopeKey, fullType);
    const merged = { ...(typeof existing === 'object' && existing !== null ? existing : {}), ...req.body };
    await saveJson(req.user.tenant_id, null, req.user.id, scopeKey, fullType, merged);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar ferramenta clínica' }); }
});

module.exports = router;
