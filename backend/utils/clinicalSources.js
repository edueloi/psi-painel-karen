/**
 * Agregador de FONTES clínicas para a IA (preencher Avaliação/Evolução, organizar texto livre).
 *
 * Regras de segurança:
 *  - o paciente SEMPRE é validado contra o tenant da sessão;
 *  - registros (evoluções, avaliações, plano, anamnese-registro) só entram se o usuário puder vê-los
 *    (admin, responsável ou compartilhado) — mesma regra da listagem de prontuários;
 *  - NUNCA entram: restricted_content, "conteudo_restrito" gerado pela IA, ferramentas livres (sonhos,
 *    associações, RPD...), nome/CPF/contatos do paciente;
 *  - cada item carrega um rótulo de FONTE ("Anamnese 22/05/2026") que a IA deve citar e a UI exibe.
 *
 * Tudo é limitado por tamanho e prioridade (ver CAPS / ORDER).
 */
const db = require('../db');
const LABELS = require('./clinicalFieldLabels');

const GROUPS = [
  { id: 'texto_livre', label: 'Texto livre', client: true },
  { id: 'transcricao', label: 'Transcrição', client: true },
  { id: 'anamnese', label: 'Anamnese' },
  { id: 'plano', label: 'Plano terapêutico' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'evolucoes', label: 'Evoluções' },
  { id: 'instrumentos', label: 'Instrumentos' },
  { id: 'humor', label: 'Humor' },
];
const GROUP_IDS = GROUPS.map(g => g.id);
// Ordem de prioridade no contexto enviado à IA e teto de caracteres por grupo.
const ORDER = ['texto_livre', 'transcricao', 'cadastro', 'plano', 'anamnese', 'avaliacoes', 'evolucoes', 'instrumentos', 'humor'];
const CAPS = { texto_livre: 9000, transcricao: 14000, cadastro: 700, plano: 2500, anamnese: 5000, avaliacoes: 4500, evolucoes: 6000, instrumentos: 3500, humor: 1200 };

const ANAMNESIS_LABELS = {
  motivo_busca: 'Motivo da busca', queixa_principal: 'Queixa principal', tempo_sofrimento: 'Tempo de sofrimento',
  historico_tratamentos: 'Histórico de tratamentos', tratamentos_detalhes: 'Detalhes dos tratamentos anteriores',
  medicamentos: 'Uso de medicamentos', medicamentos_quais: 'Quais medicamentos', historico_saude: 'Histórico de saúde física/mental',
  sono: 'Qualidade do sono', alimentacao: 'Qualidade da alimentação', atividade_fisica: 'Atividade física',
  trabalho_estudo: 'Trabalho ou estudo', satisfacao_trabalho: 'Satisfação com trabalho/estudo',
  relacionamento_atual: 'Relacionamento afetivo atual', apoio_social: 'Rede de apoio social', relacoes_familiares: 'Relações familiares',
  humor_geral: 'Humor predominante', ansiedade: 'Frequência de ansiedade', pensamentos_intrusivos: 'Pensamentos intrusivos',
  pensamentos_descricao: 'Descrição dos pensamentos', bem_estar_geral: 'Autoavaliação de bem-estar (0-10)',
  objetivos_terapia: 'Objetivos com a terapia', urgencia: 'Situação de urgência ou crise', urgencia_descricao: 'Detalhamento da urgência',
};
const LEGACY_LABELS = {
  motivo_consulta: 'Motivo da consulta / tema central', contexto_relevante: 'Contexto relevante', observacoes_clinicas: 'Observações clínicas',
  intervencoes_realizadas: 'Intervenções realizadas', evolucao_resposta: 'Evolução / resposta', plano_terapeutico: 'Plano e próximos passos',
  encaminhamentos: 'Encaminhamentos', observacao_complementar: 'Observação complementar',
};
const SCALE_TOOLS = {
  'dass-21': 'DASS-21', 'bdi-ii': 'BDI-II (Beck Depressão)', bai: 'BAI (Beck Ansiedade)', 'beck-depressao': 'BDI (Beck Depressão)',
  'beck-ansiedade': 'BAI (Beck Ansiedade)', 'snap-iv': 'SNAP-IV', 'm-chat-r': 'M-CHAT-R/F', 'phq-9': 'PHQ-9', 'gad-7': 'GAD-7',
  'disc-evaluative': 'DISC',
};
const SCHEMA_INSTRUMENTS = { ysq: 'YSQ-S3', ypi: 'YPI (estilos parentais)', yami: 'YAMI', yci: 'YCI', yrai: 'YRAI', rne: 'RNE' };
const HUMOR_LABELS = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Muito bem'];

/* ── utilidades de texto ─────────────────────────────── */
const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** HTML do editor rico -> texto simples (o rascunho chega com tags e não deve ir assim para a IA). */
function htmlToText(html) {
  if (html === null || html === undefined) return '';
  let s = String(html);
  if (!/[<&]/.test(s)) return s.replace(/\r/g, '').trim();
  s = s.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n').replace(/<\s*li[^>]*>/gi, '- ');
  s = decodeEntities(s.replace(/<[^>]*>/g, ' '));
  return s.replace(/[ \t\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Corta preservando começo e fim quando `keepTail` (ex.: transcrição, em que o final importa). */
function clipText(value, max, keepTail = false) {
  const s = String(value || '');
  if (s.length <= max) return s;
  if (!keepTail) return `${s.slice(0, Math.max(0, max - 20))} [...cortado]`;
  const head = Math.floor(max * 0.55);
  const tail = max - head - 40;
  return `${s.slice(0, head)}\n[... trecho intermediário omitido por tamanho ...]\n${s.slice(s.length - tail)}`;
}

const pad = (n) => String(n).padStart(2, '0');
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
}
const isEmpty = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.some(x => !isEmpty(x)))
  || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some(x => !isEmpty(x)));
const humanize = (k) => String(k).replace(/_/g, ' ');

function valueToText(v) {
  if (isEmpty(v)) return '';
  if (Array.isArray(v)) {
    const hasObjects = v.some(x => x && typeof x === 'object');
    return v.map(x => (x && typeof x === 'object' ? Object.values(x).filter(y => !isEmpty(y)).map(String).join(' — ') : String(x))).filter(Boolean).join(hasObjects ? '\n' : ', ');
  }
  if (typeof v === 'object') return Object.values(v).filter(x => !isEmpty(x)).map(String).join(' — ');
  return String(v).trim();
}

/** Valores estruturados (modelos por especialidade) -> linhas "Rótulo: texto". */
function renderValues(values) {
  const lines = [];
  Object.keys(values || {}).forEach((key) => {
    if (key === 'sessao_numero') return;
    const text = valueToText(values[key]);
    if (!text) return;
    lines.push(`${LABELS[key] || humanize(key)}: ${text}`);
  });
  return lines.join('\n');
}

/** Texto de um registro (estruturado, organizado pela IA em 8 campos ou texto simples). Nunca inclui o campo restrito. */
function recordText(row) {
  let ai = null;
  try { ai = row.ai_organized_content ? JSON.parse(row.ai_organized_content) : null; } catch { ai = null; }
  let text = '';
  if (ai && ai._estruturado && ai._estruturado.values) {
    text = renderValues(ai._estruturado.values);
  } else if (ai && typeof ai === 'object' && row.record_type !== 'Plano') {
    text = Object.keys(LEGACY_LABELS).filter(k => typeof ai[k] === 'string' && ai[k].trim()).map(k => `${LEGACY_LABELS[k]}: ${ai[k].trim()}`).join('\n');
  }
  if (!text) text = htmlToText(row.content || row.draft_content || '');
  return text.trim();
}

function planText(row) {
  let plan = null;
  try { plan = JSON.parse(row.ai_organized_content || 'null'); } catch { plan = null; }
  if (!plan || typeof plan !== 'object') return { text: htmlToText(row.content || ''), goals: [] };
  const lines = [];
  if (plan.approach) lines.push(`Abordagem: ${plan.approach}`);
  if (plan.plan_status) lines.push(`Situação do plano: ${plan.plan_status}`);
  if (plan.current_phase) lines.push(`Fase atual: ${plan.current_phase}`);
  if (plan.summary) lines.push(`Resumo: ${htmlToText(plan.summary)}`);
  if (plan.current_focus) lines.push(`Foco atual: ${htmlToText(plan.current_focus)}`);
  const goals = (Array.isArray(plan.goals) ? plan.goals : []).filter(g => g && String(g.description || '').trim());
  if (goals.length) {
    lines.push('Objetivos:');
    goals.slice(0, 15).forEach(g => lines.push(`- ${String(g.description).trim()}${g.status ? ` (${String(g.status).replace(/_/g, ' ')})` : ''}`));
  }
  const ints = (Array.isArray(plan.interventions) ? plan.interventions : []).filter(i => i && String(i.name || '').trim());
  if (ints.length) lines.push(`Intervenções planejadas: ${ints.slice(0, 10).map(i => String(i.name).trim()).join('; ')}`);
  return { text: lines.join('\n'), goals: goals.map(g => String(g.description).trim()).slice(0, 30) };
}

const isAdminRole = (u) => ['admin', 'super_admin', 'Administrador'].includes(u && u.role);

/** Mesma regra da listagem de prontuários: admin, responsável ou compartilhado. */
function visibleClause(user, alias = 'r') {
  if (isAdminRole(user)) return { sql: '', params: [] };
  return { sql: ` AND (${alias}.professional_id = ? OR JSON_CONTAINS(${alias}.shared_with, ?, "$"))`, params: [user.id, String(user.id)] };
}

/** Confere se o usuário pode ver um registro já carregado (professional_id/shared_with). */
function canSeeRecord(user, record) {
  if (isAdminRole(user)) return true;
  if (!record) return false;
  if (String(record.professional_id) === String(user.id)) return true;
  let list = [];
  try { list = Array.isArray(record.shared_with) ? record.shared_with : JSON.parse(record.shared_with || '[]'); } catch { list = []; }
  return list.map(Number).includes(Number(user.id));
}

const calcAge = (birth) => {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let age = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
};

const safe = async (label, fn) => {
  try { return await fn(); } catch (e) { console.warn(`[clinicalSources] ${label}:`, e.message); return []; }
};

/* ── coleta (por grupo) ──────────────────────────────── */
async function collectServerItems(user, patientId, { recordId } = {}) {
  const tenantId = user.tenant_id;
  const [[patient]] = await db.query(
    'SELECT id, birth_date, gender, profession, marital_status, diagnosis FROM patients WHERE id = ? AND tenant_id = ?',
    [patientId, tenantId]
  );
  if (!patient) { const err = new Error('Paciente não encontrado nesta clínica.'); err.status = 404; throw err; }

  const items = []; // { group, label, date, text }
  const planGoals = [];
  const vis = visibleClause(user, 'r');
  const notCurrent = recordId ? ' AND r.id <> ?' : '';
  const notCurrentParams = recordId ? [Number(recordId)] : [];

  // cadastro
  const age = calcAge(patient.birth_date);
  const cad = [];
  if (age !== null) cad.push(`Idade: ${age} anos`);
  if (patient.gender) cad.push(`Gênero: ${patient.gender}`);
  if (patient.profession) cad.push(`Profissão: ${patient.profession}`);
  if (patient.marital_status) cad.push(`Estado civil: ${patient.marital_status}`);
  if (patient.diagnosis && String(patient.diagnosis).trim()) cad.push(`Diagnóstico informado no cadastro (não confirmado): ${String(patient.diagnosis).trim()}`);
  if (cad.length) items.push({ group: 'cadastro', label: 'Cadastro do paciente', date: null, text: cad.join('\n') });

  // anamnese respondida (anamnesis_sends + anamnesis_patient_responses)
  const savedAnamRecords = new Set();
  const anam = await safe('anamnese', async () => {
    const ownSql = isAdminRole(user) ? '' : ' AND s.professional_id = ?';
    const [rows] = await db.query(
      `SELECT s.id, s.title, s.completed_at, s.created_at, r.answers, r.submitted_at, r.saved_to_record_id
       FROM anamnesis_sends s JOIN anamnesis_patient_responses r ON r.send_id = s.id
       WHERE s.tenant_id = ? AND s.patient_id = ? AND s.status = 'answered'${ownSql}
       ORDER BY COALESCE(r.submitted_at, s.completed_at, s.created_at) DESC LIMIT 2`,
      [tenantId, patientId, ...(isAdminRole(user) ? [] : [user.id])]
    );
    return rows;
  });
  anam.forEach((row) => {
    if (row.saved_to_record_id) savedAnamRecords.add(String(row.saved_to_record_id));
    let answers = {};
    try { answers = JSON.parse(row.answers || '{}') || {}; } catch { answers = {}; }
    const text = Object.keys(answers).map((k) => {
      const t = valueToText(answers[k]);
      return t ? `${ANAMNESIS_LABELS[k] || humanize(k)}: ${t}` : '';
    }).filter(Boolean).join('\n');
    if (!text) return;
    const d = row.submitted_at || row.completed_at || row.created_at;
    items.push({ group: 'anamnese', label: `Anamnese ${fmtDate(d)}`.trim(), date: d, text });
  });
  // registros do tipo Anamnese (sem duplicar os já gerados a partir de um envio)
  const anamRecs = await safe('anamnese-registro', async () => {
    const [rows] = await db.query(
      `SELECT r.id, r.record_type, r.status, r.created_at, r.content, r.draft_content, r.ai_organized_content
       FROM medical_records r WHERE r.tenant_id = ? AND r.patient_id = ? AND r.record_type = 'Anamnese'${vis.sql}${notCurrent}
       ORDER BY r.created_at DESC LIMIT 2`,
      [tenantId, patientId, ...vis.params, ...notCurrentParams]
    );
    return rows;
  });
  anamRecs.filter(r => !savedAnamRecords.has(String(r.id))).forEach((row) => {
    const text = recordText(row);
    if (text) items.push({ group: 'anamnese', label: `Anamnese (registro) ${fmtDate(row.created_at)}`, date: row.created_at, text });
  });

  // plano terapêutico atual
  const plans = await safe('plano', async () => {
    const [rows] = await db.query(
      `SELECT r.id, r.record_type, r.status, r.created_at, r.updated_at, r.content, r.ai_organized_content
       FROM medical_records r WHERE r.tenant_id = ? AND r.patient_id = ? AND r.record_type = 'Plano'${vis.sql}${notCurrent}
       ORDER BY r.created_at DESC LIMIT 1`,
      [tenantId, patientId, ...vis.params, ...notCurrentParams]
    );
    return rows;
  });
  plans.forEach((row) => {
    const p = planText(row);
    p.goals.forEach(g => planGoals.push(g));
    if (p.text) items.push({ group: 'plano', label: `Plano terapêutico ${fmtDate(row.updated_at || row.created_at)}`, date: row.updated_at || row.created_at, text: p.text });
  });

  // avaliações anteriores (a mais recente por último limite; 2 versões)
  const evals = await safe('avaliacoes', async () => {
    const [rows] = await db.query(
      `SELECT r.id, r.record_type, r.status, r.created_at, r.content, r.draft_content, r.ai_organized_content
       FROM medical_records r WHERE r.tenant_id = ? AND r.patient_id = ? AND r.record_type = 'Avaliacao'${vis.sql}${notCurrent}
       ORDER BY r.created_at DESC LIMIT 2`,
      [tenantId, patientId, ...vis.params, ...notCurrentParams]
    );
    return rows;
  });
  evals.forEach((row, i) => {
    const text = recordText(row);
    if (text) items.push({ group: 'avaliacoes', label: `Avaliação ${fmtDate(row.created_at)}${row.status && row.status !== 'Aprovado' ? ` (${String(row.status).toLowerCase()})` : ''}`, date: row.created_at, text: i === 0 ? text : clipText(text, 1500) });
  });

  // evoluções recentes
  const evols = await safe('evolucoes', async () => {
    const [rows] = await db.query(
      `SELECT r.id, r.record_type, r.status, r.created_at, r.content, r.draft_content, r.ai_organized_content
       FROM medical_records r WHERE r.tenant_id = ? AND r.patient_id = ? AND r.record_type = 'Evolucao'${vis.sql}${notCurrent}
       ORDER BY r.created_at DESC LIMIT 6`,
      [tenantId, patientId, ...vis.params, ...notCurrentParams]
    );
    return rows;
  });
  evols.forEach((row) => {
    const text = recordText(row);
    if (text) items.push({ group: 'evolucoes', label: `Evolução ${fmtDate(row.created_at)}${row.status && row.status !== 'Aprovado' ? ` (${String(row.status).toLowerCase()})` : ''}`, date: row.created_at, text: clipText(text, 1400) });
  });

  // instrumentos: escalas (clinical_tools), formulários pontuados e inventários de esquemas
  const tools = await safe('instrumentos', async () => {
    const types = Object.keys(SCALE_TOOLS);
    const [rows] = await db.query(
      `SELECT tool_type, data, updated_at FROM clinical_tools
       WHERE tenant_id = ? AND (scope_key = ? OR patient_id = ?) AND tool_type IN (${types.map(() => '?').join(',')})`,
      [tenantId, String(patientId), patientId, ...types]
    );
    return rows;
  });
  tools.forEach((row) => {
    let data = null;
    try { data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch { data = null; }
    const list = (Array.isArray(data) ? data : data ? [data] : []).filter(e => e && typeof e === 'object');
    if (!list.length) return;
    const dated = list.map(e => ({ e, d: e.date || e.created_at || row.updated_at })).sort((a, b) => new Date(b.d).getTime() - new Date(a.d).getTime()).slice(0, 3);
    const lines = dated.map(({ e, d }) => {
      const parts = [];
      const score = e.scores !== undefined ? e.scores : (e.score !== undefined ? e.score : e.total_score);
      if (score !== undefined && score !== null) parts.push(`escores ${typeof score === 'object' ? JSON.stringify(score) : score}`);
      const level = e.levels || e.interpretation || e.classification || e.risk;
      if (level) parts.push(`leitura ${typeof level === 'object' ? JSON.stringify(level) : level}`);
      return `${fmtDate(d)}: ${parts.length ? parts.join('; ') : 'aplicado (sem escore registrado)'}`;
    });
    items.push({ group: 'instrumentos', label: `${SCALE_TOOLS[row.tool_type]} ${fmtDate(dated[0].d)}`, date: dated[0].d, text: clipText(lines.join('\n'), 700) });
  });
  const forms = await safe('formularios', async () => {
    const [rows] = await db.query(
      `SELECT fr.id, fr.score, fr.created_at, f.title FROM form_responses fr JOIN forms f ON f.id = fr.form_id
       WHERE fr.patient_id = ? AND fr.score > 0 ORDER BY fr.created_at DESC LIMIT 4`,
      [patientId]
    );
    return rows;
  });
  forms.forEach(r => items.push({ group: 'instrumentos', label: `${r.title || 'Formulário'} ${fmtDate(r.created_at)}`, date: r.created_at, text: `Pontuação total: ${r.score}` }));
  const inv = await safe('inventarios-esquemas', async () => {
    const [rows] = await db.query(
      `SELECT instrument_id, status, answered_count, total_count, completed_at, last_saved_at FROM schema_inventory_applications
       WHERE tenant_id = ? AND patient_id = ? ORDER BY COALESCE(completed_at, last_saved_at, created_at) DESC LIMIT 6`,
      [tenantId, patientId]
    );
    return rows;
  });
  inv.forEach((r) => {
    const name = SCHEMA_INSTRUMENTS[r.instrument_id] || String(r.instrument_id).toUpperCase();
    const d = r.completed_at || r.last_saved_at;
    const state = r.status === 'completed' ? 'concluído' : `em andamento (${r.answered_count}/${r.total_count} itens)`;
    items.push({ group: 'instrumentos', label: `Inventário de esquemas ${name} ${fmtDate(d)}`.trim(), date: d, text: `Inventário ${name} ${state}. A pontuação por esquema não é calculada aqui: não inferir resultados.` });
  });

  // humor por sessão
  const moods = await safe('humor', async () => {
    const [rows] = await db.query(
      'SELECT mood_score, emotions, note, recorded_at FROM patient_mood_logs WHERE tenant_id = ? AND patient_id = ? ORDER BY recorded_at DESC LIMIT 8',
      [tenantId, patientId]
    );
    return rows;
  });
  if (moods.length) {
    const lines = moods.map((m) => {
      const h = HUMOR_LABELS[Math.round(Number(m.mood_score)) - 1] || String(m.mood_score);
      return `${fmtDate(m.recorded_at)}: humor ${h}${m.emotions ? ` (${String(m.emotions).slice(0, 80)})` : ''}${m.note ? ` — ${String(m.note).slice(0, 120)}` : ''}`;
    });
    items.push({ group: 'humor', label: `Humor por sessão (${moods.length} registros, último ${fmtDate(moods[0].recorded_at)})`, date: moods[0].recorded_at, text: lines.join('\n') });
  }

  return { items, planGoals };
}

/**
 * Monta o contexto final.
 * @param selection  lista de ids de grupos (null = todos os disponíveis)
 * @param client     { draft, transcript } fornecidos pelo editor (texto livre atual e transcrição da sala virtual)
 */
async function gather(user, patientId, { recordId, selection, draft, transcript } = {}) {
  const { items: serverItems, planGoals } = await collectServerItems(user, patientId, { recordId });
  const all = [...serverItems];
  const draftText = htmlToText(draft || '');
  const transText = String(transcript || '').trim();
  if (draftText) all.push({ group: 'texto_livre', label: 'Texto livre do registro (rascunho atual)', date: null, text: draftText });
  if (transText) all.push({ group: 'transcricao', label: 'Transcrição da sessão (sala virtual)', date: null, text: transText });

  const available = GROUPS.map(g => ({ id: g.id, label: g.label, count: all.filter(i => i.group === g.id).length }));
  const wanted = Array.isArray(selection)
    ? new Set(selection.filter(s => GROUP_IDS.includes(String(s))).map(String))
    : new Set(GROUP_IDS);

  const truncated = [];
  const used = [];
  ORDER.forEach((gid) => {
    if (gid !== 'cadastro' && !wanted.has(gid)) return; // cadastro (idade/diagnóstico informado) sempre vai
    let left = CAPS[gid];
    all.filter(i => i.group === gid).forEach((it) => {
      if (left <= 200) { if (!truncated.includes(gid)) truncated.push(gid); return; }
      const keepTail = gid === 'transcricao' || gid === 'texto_livre';
      const text = clipText(it.text, left, keepTail);
      if (text.length < it.text.length && !truncated.includes(gid)) truncated.push(gid);
      left -= text.length;
      used.push({ ...it, text });
    });
  });
  const final = used.map((it, i) => ({ ...it, id: `F${i + 1}` }));
  return { items: final, available, truncated, planGoals };
}

/** Achata um objeto em linhas "chave: valor" (sem as respostas item a item de escalas). */
function flattenObject(obj, prefix = '', depth = 0, skip = []) {
  const lines = [];
  if (obj === null || obj === undefined) return lines;
  if (typeof obj !== 'object') { lines.push(`${prefix}${String(obj)}`); return lines; }
  Object.keys(obj).forEach((k) => {
    if (skip.includes(k) || isEmpty(obj[k])) return;
    const v = obj[k];
    const label = LABELS[k] || humanize(k);
    if (v && typeof v === 'object' && depth < 3) {
      if (Array.isArray(v) && v.every(x => x === null || typeof x !== 'object')) lines.push(`${prefix}${label}: ${v.join(', ')}`);
      else lines.push(`${prefix}${label}:`, ...flattenObject(v, `${prefix}  `, depth + 1, skip));
    } else lines.push(`${prefix}${label}: ${String(v)}`);
  });
  return lines;
}

/**
 * Texto COMPLETO de uma fonte escolhida pelo usuário ("Usar Fonte"): anamnese com rótulos, escala com todas as
 * aplicações (escores, subescalas, interpretação) ou formulário respondido. Sem corte de tamanho relevante.
 */
async function renderSourceText(user, patientId, type, id) {
  const tenantId = user.tenant_id;
  const [[patient]] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
  if (!patient) { const err = new Error('Paciente não encontrado nesta clínica.'); err.status = 404; throw err; }
  if (type === 'anamnese') {
    const ownSql = isAdminRole(user) ? '' : ' AND s.professional_id = ?';
    const [[row]] = await db.query(
      `SELECT s.title, s.completed_at, s.created_at, r.answers, r.submitted_at FROM anamnesis_sends s
       JOIN anamnesis_patient_responses r ON r.send_id = s.id
       WHERE s.id = ? AND s.tenant_id = ? AND s.patient_id = ?${ownSql}`,
      [id, tenantId, patientId, ...(isAdminRole(user) ? [] : [user.id])]
    );
    if (!row) return null;
    let answers = {};
    try { answers = JSON.parse(row.answers || '{}') || {}; } catch { answers = {}; }
    const body = Object.keys(answers).map((k) => { const t = valueToText(answers[k]); return t ? `${ANAMNESIS_LABELS[k] || humanize(k)}: ${t}` : ''; }).filter(Boolean).join('\n');
    return { title: row.title || 'Anamnese', date: fmtDate(row.submitted_at || row.completed_at || row.created_at), text: body };
  }
  if (type === 'tool') {
    const [[row]] = await db.query('SELECT tool_type, data, updated_at FROM clinical_tools WHERE id = ? AND tenant_id = ? AND (scope_key = ? OR patient_id = ?)', [id, tenantId, String(patientId), patientId]);
    if (!row) return null;
    let data = null;
    try { data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch { data = null; }
    const list = Array.isArray(data) ? data : data ? [data] : [];
    const dated = list.filter(e => e && typeof e === 'object').map(e => ({ e, d: e.date || e.created_at || row.updated_at }))
      .sort((a, b) => new Date(b.d).getTime() - new Date(a.d).getTime());
    const blocks = dated.map(({ e, d }, i) => `${i === 0 ? 'Aplicação mais recente' : 'Aplicação anterior'} (${fmtDate(d)}):\n${flattenObject(e, '  ', 0, ['answers', 'id', 'date', 'created_at']).join('\n')}`);
    return { title: SCALE_TOOLS[row.tool_type] || row.tool_type, date: fmtDate(dated.length ? dated[0].d : row.updated_at), text: blocks.join('\n\n') };
  }
  if (type === 'form_response') {
    const [[row]] = await db.query(
      'SELECT fr.data, fr.score, fr.created_at, f.title FROM form_responses fr JOIN forms f ON f.id = fr.form_id WHERE fr.id = ? AND fr.patient_id = ?', [id, patientId]
    );
    if (!row) return null;
    let data = null;
    try { data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; } catch { data = null; }
    const lines = [];
    if (row.score !== null && row.score !== undefined) lines.push(`Pontuação total: ${row.score}`);
    if (data && data.answers) lines.push(...flattenObject(data.answers, '', 0));
    else if (data) lines.push(...flattenObject(data, '', 0));
    return { title: row.title || 'Formulário', date: fmtDate(row.created_at), text: lines.join('\n') };
  }
  return null;
}

/** Texto das fontes para o prompt: cada bloco começa com [F#] rótulo. */
function renderContext(items) {
  return items.map(i => `[${i.id}] ${i.label}\n${i.text}`).join('\n\n');
}

const publicItems = (items) => items.map(i => ({ id: i.id, group: i.group, label: i.label }));

module.exports = {
  GROUPS, GROUP_IDS, gather, renderContext, publicItems, htmlToText, clipText, recordText, renderValues,
  canSeeRecord, isAdminRole, fmtDate, LABELS, renderSourceText,
};
