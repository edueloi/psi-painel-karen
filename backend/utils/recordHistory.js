/**
 * Histórico de alterações dos registros clínicos (medical_record_history).
 *
 * Observação: a tabela legada `medical_record_versions` (version_number/content) continua existindo e sendo
 * usada pelo prontuário; o histórico novo vive em `medical_record_history` para não conflitar com ela.
 *
 * Privacidade: o snapshot NUNCA contém `restricted_content` nem o `conteudo_restrito` gerado pela IA.
 */
const crypto = require('crypto');
const db = require('../db');
const { ensureStatements } = require('./schemaMigrate');
const LABELS = require('./clinicalFieldLabels');
const { htmlToText } = require('./clinicalSources');

const ready = ensureStatements([
  `CREATE TABLE IF NOT EXISTS medical_record_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    record_id INT NOT NULL,
    version_no INT NOT NULL,
    saved_by_user_id INT NULL,
    saved_by_name VARCHAR(255) NULL,
    saved_at DATETIME NOT NULL,
    event VARCHAR(20) NOT NULL DEFAULT 'editado',
    status VARCHAR(50) NULL,
    snapshot LONGTEXT NULL,
    snapshot_hash CHAR(40) NULL,
    changes LONGTEXT NULL,
    summary VARCHAR(500) NULL,
    INDEX idx_mrh_record (tenant_id, record_id, version_no)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
], 'medical-record-history');

const COALESCE_MS = 5 * 60 * 1000;
const EVENTS = ['criado', 'editado', 'aprovado', 'restaurado', 'ia', 'inicial', 'reavaliacao'];
const SIMPLE_KEYS = [
  ['title', 'Título'], ['status', 'Status'], ['tags', 'Marcadores'], ['created_at', 'Data da sessão'],
  ['start_time', 'Início'], ['end_time', 'Fim'], ['appointment_type', 'Formato'], ['appointment_id', 'Agendamento vinculado'],
  ['draft_content', 'Texto livre'],
];

const toDay = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
};
const toTime = (v) => (v ? String(v).slice(0, 5) : null);

const parseJson = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

/** Remove do JSON da IA o que é restrito (conteudo_restrito) antes de guardar. */
function sanitizeAi(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const obj = typeof raw === 'string' ? parseJson(raw) : raw;
  if (!obj || typeof obj !== 'object') return typeof raw === 'string' ? raw : null;
  const copy = { ...obj };
  delete copy.conteudo_restrito;
  return JSON.stringify(copy);
}

/** Monta o snapshot (sem restricted_content) a partir de uma linha de medical_records. */
function buildSnapshot(row) {
  let tags = row.tags;
  if (typeof tags === 'string') tags = parseJson(tags) || [];
  return {
    record_type: row.record_type || null,
    title: row.title || '',
    status: row.status || null,
    content: row.content || '',
    draft_content: row.draft_content || '',
    ai_organized_content: sanitizeAi(row.ai_organized_content),
    ai_status: row.ai_status || null,
    tags: Array.isArray(tags) ? tags : [],
    created_at: toDay(row.created_at),
    start_time: toTime(row.start_time),
    end_time: toTime(row.end_time),
    appointment_type: row.appointment_type || null,
    appointment_id: row.appointment_id ? String(row.appointment_id) : null,
  };
}

/** Parte do snapshot que define "mudança real" (ignora marcas de tempo internas e o campo ai_fields). */
function normalized(snap) {
  const s = { ...snap };
  delete s.content; // derivado dos demais campos
  const ai = parseJson(snap.ai_organized_content);
  if (ai && typeof ai === 'object') {
    if (ai._estruturado) {
      const e = { ...ai._estruturado };
      delete e.updated_at; delete e.ai_fields; delete e.ai_sources; delete e.resumo;
      ai._estruturado = e;
    }
    s.ai_organized_content = ai;
  }
  s.draft_content = htmlToText(snap.draft_content || '');
  return s;
}
const hashOf = (snap) => crypto.createHash('sha1').update(JSON.stringify(normalized(snap))).digest('hex');

const textOf = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  return JSON.stringify(v);
};

/** Lista de campos alterados entre dois snapshots: [{ key, label }]. */
function diffSnapshots(prev, next) {
  if (!prev) return [];
  const out = [];
  SIMPLE_KEYS.forEach(([key, label]) => {
    const a = key === 'draft_content' ? htmlToText(prev[key]) : textOf(prev[key]);
    const b = key === 'draft_content' ? htmlToText(next[key]) : textOf(next[key]);
    if (a !== b) out.push({ key, label });
  });
  const pa = parseJson(prev.ai_organized_content) || {};
  const pb = parseJson(next.ai_organized_content) || {};
  const va = (pa._estruturado && pa._estruturado.values) || null;
  const vb = (pb._estruturado && pb._estruturado.values) || null;
  if (va || vb) {
    const keys = Array.from(new Set([...Object.keys(va || {}), ...Object.keys(vb || {})]));
    keys.forEach((k) => {
      if (textOf(va && va[k]) !== textOf(vb && vb[k])) out.push({ key: `v:${k}`, label: LABELS[k] || k.replace(/_/g, ' ') });
    });
    if (pa._estruturado && pb._estruturado && pa._estruturado.template !== pb._estruturado.template) out.push({ key: 'template', label: 'Modelo' });
  } else {
    const strip = (o) => { const c = { ...o }; delete c._estruturado; return JSON.stringify(c); };
    if (strip(pa) !== strip(pb)) out.push({ key: 'ai_organized_content', label: 'Conteúdo organizado' });
  }
  return out;
}

function summarize(event, changes, extra) {
  if (event === 'criado') return 'Registro criado';
  if (event === 'inicial') return 'Estado do registro quando o histórico começou a ser registrado';
  if (event === 'aprovado') return 'Registro aprovado';
  const labels = changes.map(c => c.label);
  const head = labels.slice(0, 4).join(', ');
  const rest = labels.length > 4 ? ` e mais ${labels.length - 4}` : '';
  const body = labels.length ? `Alterou: ${head}${rest}` : 'Sem alteração de campos';
  if (event === 'restaurado') return `${extra || 'Restaurado de versão anterior'}. ${body}`.slice(0, 500);
  if (event === 'reavaliacao') return `Reavaliação${extra ? ` — ${extra}` : ''}. ${body}`.slice(0, 500);
  if (event === 'ia') return `IA aplicada. ${body}`.slice(0, 500);
  return body.slice(0, 500);
}

async function lastVersions(tenantId, recordId, n = 2) {
  const [rows] = await db.query(
    'SELECT * FROM medical_record_history WHERE tenant_id = ? AND record_id = ? ORDER BY version_no DESC LIMIT ?',
    [tenantId, recordId, n]
  );
  return rows;
}

const insertVersion = async ({ tenantId, recordId, versionNo, user, event, status, snapshot, changes, summary, savedAt }) => {
  await db.query(
    `INSERT INTO medical_record_history
      (tenant_id, record_id, version_no, saved_by_user_id, saved_by_name, saved_at, event, status, snapshot, snapshot_hash, changes, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId, recordId, versionNo, user ? user.id : null, user ? (user.name || user.email || null) : null,
      savedAt || new Date(), event, status || null, JSON.stringify(snapshot), hashOf(snapshot), JSON.stringify(changes), summary,
    ]
  );
};

/**
 * Registra uma versão a partir do estado ATUAL do registro (já gravado).
 * @param opts.event       criado | editado | aprovado | restaurado | ia
 * @param opts.autosave    rascunho automático: agrupa em no máximo 1 versão a cada 5 min por usuário
 * @param opts.beforeRow   estado anterior (para criar a versão inicial de registros antigos, sem histórico)
 * @returns {Promise<{recorded:boolean}>}
 */
async function recordVersion(user, recordId, opts = {}) {
  try {
    await ready;
    const tenantId = user.tenant_id;
    const [[row]] = await db.query('SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?', [recordId, tenantId]);
    if (!row) return { recorded: false };
    const snapshot = buildSnapshot(row);
    let event = EVENTS.includes(opts.event) ? opts.event : 'editado';

    let latest = await lastVersions(tenantId, recordId, 2);
    // Registro antigo sem histórico: guarda antes o estado anterior como versão inicial.
    if (!latest.length && opts.beforeRow && event !== 'criado') {
      const base = buildSnapshot(opts.beforeRow);
      await insertVersion({
        tenantId, recordId, versionNo: 1, user: null, event: 'inicial', status: base.status, snapshot: base, changes: [],
        summary: summarize('inicial', []), savedAt: opts.beforeRow.updated_at || opts.beforeRow.created_at || new Date(),
      });
      latest = await lastVersions(tenantId, recordId, 2);
    }
    const last = latest[0] || null;
    const lastSnap = last ? parseJson(last.snapshot) : null;
    if (last && last.snapshot_hash === hashOf(snapshot)) return { recorded: false };
    if (!last && event === 'editado') event = 'criado';

    // Autosave: atualiza a última versão do mesmo usuário se tiver menos de 5 min (e não for evento importante).
    const mergeable = opts.autosave && event === 'editado' && last && last.event === 'editado'
      && String(last.saved_by_user_id) === String(user.id) && (Date.now() - new Date(last.saved_at).getTime()) < COALESCE_MS;
    if (mergeable) {
      const baseSnap = latest[1] ? parseJson(latest[1].snapshot) : lastSnap;
      const changes = diffSnapshots(baseSnap, snapshot);
      await db.query(
        'UPDATE medical_record_history SET snapshot = ?, snapshot_hash = ?, changes = ?, summary = ?, status = ?, saved_at = ? WHERE id = ?',
        [JSON.stringify(snapshot), hashOf(snapshot), JSON.stringify(changes), summarize('editado', changes), snapshot.status, new Date(), last.id]
      );
      return { recorded: true, merged: true };
    }

    const changes = diffSnapshots(lastSnap, snapshot);
    await insertVersion({
      tenantId, recordId, versionNo: last ? last.version_no + 1 : 1, user, event, status: snapshot.status, snapshot, changes,
      summary: summarize(event, changes, opts.summaryExtra),
    });
    return { recorded: true };
  } catch (e) {
    console.error('[recordHistory] falha ao registrar versão:', e.message);
    return { recorded: false };
  }
}

/** Garante a versão inicial de um registro antigo que ainda não tem histórico (visualização). */
async function ensureBaseline(tenantId, recordRow) {
  await ready;
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM medical_record_history WHERE tenant_id = ? AND record_id = ?', [tenantId, recordRow.id]);
  if (n > 0) return false;
  const snap = buildSnapshot(recordRow);
  await insertVersion({
    tenantId, recordId: recordRow.id, versionNo: 1, user: null, event: 'inicial', status: snap.status, snapshot: snap, changes: [],
    summary: summarize('inicial', []), savedAt: recordRow.updated_at || recordRow.created_at || new Date(),
  });
  return true;
}

module.exports = { ready, recordVersion, ensureBaseline, buildSnapshot, diffSnapshots, EVENTS };
