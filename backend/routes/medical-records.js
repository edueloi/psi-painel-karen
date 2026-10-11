const { authMiddleware, checkPermission } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const sources = require('../utils/clinicalSources');
const history = require('../utils/recordHistory');

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */
const parseAiJson = (raw) => {
  const m = String(raw || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const o = JSON.parse(m[0]); return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch { return null; }
};
const AI_UNAVAILABLE = 'A IA está indisponível no momento. Seus dados foram mantidos; tente novamente em instantes.';

/** Chama o endpoint interno de IA com a mesma sessão do usuário. Lança Error({status,message}) amigável. */
async function callAi(req, { system, prompt, max_tokens = 2500, temperature = 0.2 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
      body: JSON.stringify({ system, prompt, max_tokens, temperature }),
      signal: ctrl.signal,
    });
    if (aiResp.status === 403) { const e = new Error('Seu perfil não tem permissão para usar os recursos de IA.'); e.status = 403; throw e; }
    if (!aiResp.ok) { const e = new Error(AI_UNAVAILABLE); e.status = 502; throw e; }
    const aiData = await aiResp.json();
    return aiData.text || aiData.content || aiData.result || '';
  } catch (e) {
    if (e.status) throw e;
    console.warn('[ai] indisponível:', e.message);
    const err = new Error(AI_UNAVAILABLE); err.status = 502; throw err;
  } finally { clearTimeout(timer); }
}

/** Carrega o registro do tenant e confere se o usuário pode vê-lo (admin, responsável ou compartilhado). */
async function loadVisibleRecord(req, res, id) {
  const [[row]] = await db.query('SELECT r.*, u.name AS professional_name FROM medical_records r LEFT JOIN users u ON u.id = r.professional_id WHERE r.id = ? AND r.tenant_id = ?', [id, req.user.tenant_id]);
  if (!row) { res.status(404).json({ error: 'Prontuário não encontrado' }); return null; }
  if (!sources.canSeeRecord(req.user, row)) { res.status(403).json({ error: 'Você não tem acesso a este registro.' }); return null; }
  return row;
}
const isLocked = (row) => row && (row.status === 'Aprovado' || row.status === 'Finalizado');
const parseSelection = (v) => (Array.isArray(v) ? v.map(String) : null);
const AI_ERR = (res, err, fallback) => {
  if (err && err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: fallback });
};
const logAudit = async (recordId, userId, tenantId, action, detail = null) => {
  try {
    await db.query(
      'INSERT INTO medical_record_audit (record_id, user_id, tenant_id, action, detail) VALUES (?, ?, ?, ?, ?)',
      [recordId, userId, tenantId, action, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) { console.error('audit log error', e); }
};

const parseJson = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

/* ──────────────────────────────────────────────────────────
   GET /medical-records
   Suporta filtros: patient_id, professional_id, status, date_from, date_to, record_type
────────────────────────────────────────────────────────── */
// Garante coluna shared_with na tabela (migration segura)
let _sharedWithReady = false;
async function ensureSharedWith() {
  if (_sharedWithReady) return;
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM medical_records LIKE 'shared_with'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE medical_records ADD COLUMN shared_with JSON NULL DEFAULT NULL");
    }
    _sharedWithReady = true;
  } catch (e) { console.warn('shared_with:', e.message); }
}
ensureSharedWith();

// Garante que file_type em medical_record_attachments suporta mime types longos
(async () => {
  try {
    await db.query("ALTER TABLE medical_record_attachments MODIFY COLUMN file_type VARCHAR(255) NULL");
  } catch (e) { /* já correto */ }
})();

router.get('/', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    const { patient_id, professional_id, status, date_from, date_to, record_type, my_records } = req.query;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const uid = req.user.id;

    let query = `
      SELECT r.id, r.patient_id, r.professional_id, r.record_type, r.title,
             r.status, r.ai_status, r.start_time, r.end_time, r.created_at, r.tags,
             r.shared_with, r.appointment_type,
             CASE WHEN r.record_type IN ('Evolucao','Avaliacao') THEN r.ai_organized_content ELSE NULL END AS ai_organized_content,
             LEFT(r.content, 300) as content,
             p.name as patient_name,
             u.name as professional_name
      FROM medical_records r
      LEFT JOIN patients p ON p.id = r.patient_id
      LEFT JOIN users u ON u.id = r.professional_id
      WHERE r.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    // Segurança de propriedade: profissionais só veem os próprios ou os compartilhados com eles
    if (!isAdmin) {
      query += ' AND (r.professional_id = ? OR JSON_CONTAINS(r.shared_with, ?, "$"))';
      params.push(uid, String(uid));
    }

    if (my_records === '1') { query += ' AND r.professional_id = ?'; params.push(uid); }
    if (patient_id) { query += ' AND r.patient_id = ?'; params.push(patient_id); }
    if (professional_id) { query += ' AND r.professional_id = ?'; params.push(professional_id); }
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (record_type) { query += ' AND r.record_type = ?'; params.push(record_type); }
    if (date_from) { query += ' AND DATE(r.created_at) >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND DATE(r.created_at) <= ?'; params.push(date_to); }

    query += ' ORDER BY r.created_at DESC';

    const [records] = await db.query(query, params);
    // O campo restrito gerado pela IA (conteudo_restrito) não deve circular na listagem.
    records.forEach((rec) => {
      if (!rec.ai_organized_content || !String(rec.ai_organized_content).includes('conteudo_restrito')) return;
      try {
        const o = JSON.parse(rec.ai_organized_content);
        if (o && typeof o === 'object') { delete o.conteudo_restrito; rec.ai_organized_content = JSON.stringify(o); }
      } catch { /* mantém como veio */ }
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuários' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/share — compartilhar com profissional
   Body: { user_id: number }
────────────────────────────────────────────────────────── */
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    const [[record]] = await db.query(
      'SELECT id, professional_id, shared_with FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
    if (record.professional_id !== req.user.id && !['admin','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Apenas o responsável pode compartilhar este registro.' });

    // Verifica se o profissional a compartilhar é do mesmo tenant
    const [[target]] = await db.query('SELECT id, name FROM users WHERE id = ? AND tenant_id = ?', [user_id, req.user.tenant_id]);
    if (!target) return res.status(404).json({ error: 'Profissional não encontrado neste sistema.' });

    let list = [];
    try { list = JSON.parse(record.shared_with || '[]'); } catch {}
    if (!list.includes(Number(user_id))) list.push(Number(user_id));

    await db.query('UPDATE medical_records SET shared_with = ? WHERE id = ?', [JSON.stringify(list), req.params.id]);
    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'updated', { action: 'shared_with', target_user: user_id });

    res.json({ ok: true, shared_with: list, target_name: target.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao compartilhar' });
  }
});

/* ──────────────────────────────────────────────────────────
   DELETE /medical-records/:id/share/:userId — revogar compartilhamento
────────────────────────────────────────────────────────── */
router.delete('/:id/share/:userId', authMiddleware, async (req, res) => {
  try {
    const [[record]] = await db.query(
      'SELECT id, professional_id, shared_with FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
    if (record.professional_id !== req.user.id && !['admin','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Apenas o responsável pode revogar o compartilhamento.' });

    let list = [];
    try { list = JSON.parse(record.shared_with || '[]'); } catch {}
    list = list.filter(id => id !== Number(req.params.userId));

    await db.query('UPDATE medical_records SET shared_with = ? WHERE id = ?', [JSON.stringify(list), req.params.id]);
    res.json({ ok: true, shared_with: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao revogar compartilhamento' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/stats — DEVE vir ANTES de /:id
────────────────────────────────────────────────────────── */
router.get('/stats', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM medical_records WHERE tenant_id = ?', [tid]);
    const [[{ thisMonth }]] = await db.query("SELECT COUNT(*) as thisMonth FROM medical_records WHERE tenant_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())", [tid]);
    const [[{ approved }]] = await db.query("SELECT COUNT(*) as approved FROM medical_records WHERE tenant_id = ? AND (status = 'Aprovado' OR status = 'Finalizado')", [tid]);
    const [[{ drafts }]] = await db.query("SELECT COUNT(*) as drafts FROM medical_records WHERE tenant_id = ? AND status = 'Rascunho'", [tid]);
    const [byType] = await db.query('SELECT record_type, COUNT(*) as count FROM medical_records WHERE tenant_id = ? GROUP BY record_type ORDER BY count DESC', [tid]);
    const [byMonth] = await db.query(`SELECT DATE_FORMAT(created_at,'%Y-%m') as month, COUNT(*) as count FROM medical_records WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month ASC`, [tid]);
    const [topPatients] = await db.query(`SELECT p.name as patient_name, COUNT(r.id) as count FROM medical_records r JOIN patients p ON p.id = r.patient_id WHERE r.tenant_id = ? GROUP BY r.patient_id ORDER BY count DESC LIMIT 5`, [tid]);
    res.json({ total, thisMonth, approved, drafts, byType, byMonth, topPatients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

/* ──────────────────────────────────────────────────────────
   Prompt canônico — organizador de texto livre (8 campos)
────────────────────────────────────────────────────────── */
const AI_SYSTEM_PROMPT = `Você é uma assistente de organização de prontuário clínico em saúde mental.
Sua função é reorganizar o texto bruto escrito pelo profissional em formato técnico, ético, claro, objetivo e sucinto.
Regras obrigatórias:
- Use SOMENTE o "Rascunho da sessão". O "Contexto do paciente" (quando houver) serve apenas para dar coerência: NÃO copie fatos do contexto como se tivessem ocorrido nesta sessão
- Não invente fatos não informados pelo profissional
- Não emita diagnóstico se não foi explicitamente informado
- Não use linguagem moralista, acusatória ou opinativa
- Separe o conteúdo padrão do que deve permanecer em campo restrito
- Preserve o sigilo e reduza detalhes íntimos desnecessários
- Sinalize com [REVISAR] pontos ambíguos para revisão humana
- Mantenha coerência temporal
- Padronize linguagem clínica técnica
- Diferencie fato relatado pelo paciente de observação clínica do profissional
- Quando houver risco, encaminhamento ou intercorrência, destaque no campo apropriado
- Campo sem base no rascunho: devolva "" (string vazia)

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "motivo_consulta": "...",
  "contexto_relevante": "...",
  "observacoes_clinicas": "...",
  "intervencoes_realizadas": "...",
  "evolucao_resposta": "...",
  "plano_terapeutico": "...",
  "encaminhamentos": "...",
  "observacao_complementar": "...",
  "conteudo_restrito": "... (apenas para uso interno - não entra em exportação padrão)",
  "pontos_revisao": ["..."],
  "classificacao": "apto_padrao | necessita_revisao | manter_restrito"
}`;

const ORGANIZED_KEYS = ['motivo_consulta', 'contexto_relevante', 'observacoes_clinicas', 'intervencoes_realizadas', 'evolucao_resposta', 'plano_terapeutico', 'encaminhamentos', 'observacao_complementar', 'conteudo_restrito'];

const clipText = (v, n) => String(v || '').slice(0, n);
const pickFrom = (list, allowed) => {
  if (!Array.isArray(list) || !Array.isArray(allowed)) return [];
  const map = new Map(allowed.map(a => [String(a).toLowerCase(), String(a)]));
  const out = [];
  list.forEach(v => { const hit = map.get(String(v || '').trim().toLowerCase()); if (hit && !out.includes(hit)) out.push(hit); });
  return out;
};

/** Valida a resposta do organizador: só chaves conhecidas, textos limitados e classificação válida. */
function sanitizeOrganized(parsed) {
  const out = {};
  ORGANIZED_KEYS.forEach((k) => {
    const v = parsed ? parsed[k] : '';
    out[k] = typeof v === 'string' ? v.trim().slice(0, 4000) : '';
  });
  out.pontos_revisao = Array.isArray(parsed && parsed.pontos_revisao)
    ? parsed.pontos_revisao.map(p => clipText(typeof p === 'string' ? p : '', 300)).filter(Boolean).slice(0, 10) : [];
  out.classificacao = ['apto_padrao', 'necessita_revisao', 'manter_restrito'].includes(parsed && parsed.classificacao) ? parsed.classificacao : 'necessita_revisao';
  return out;
}

/** Contexto de apoio do organizador: cadastro, plano e (opcional) fontes escolhidas; nunca o texto livre atual. */
async function organizerContext(req, patientId, recordId, selection) {
  if (!patientId) return { context: '', used: [] };
  try {
    const wanted = (selection || ['plano', 'anamnese']).filter(s => s !== 'texto_livre' && s !== 'transcricao');
    const g = await sources.gather(req.user, patientId, { recordId, selection: wanted });
    return { context: sources.clipText(sources.renderContext(g.items), 9000), used: sources.publicItems(g.items) };
  } catch (e) {
    if (e.status === 404) throw e; // paciente de outra clínica
    console.warn('[organize-ai] contexto indisponível:', e.message);
    return { context: '', used: [] };
  }
}

async function organizeDraft(req, { draft_content, patient_id, record_id, sources: sel }) {
  const draft = sources.clipText(sources.htmlToText(draft_content), 14000, true);
  const ctx = await organizerContext(req, patient_id, record_id, parseSelection(sel));
  const raw = await callAi(req, {
    system: AI_SYSTEM_PROMPT,
    prompt: `${ctx.context ? `Contexto do paciente (fontes de apoio, NÃO fazem parte da sessão atual):\n${ctx.context}\n\n` : ''}Rascunho da sessão:\n${draft}`,
    max_tokens: 2000, temperature: 0.2,
  });
  const parsed = parseAiJson(raw);
  if (!parsed) { const e = new Error('A IA devolveu uma resposta inesperada. Tente novamente.'); e.status = 502; throw e; }
  return { organized: sanitizeOrganized(parsed), used: ctx.used };
}

/* ──────────────────────────────────────────────────────────
   POST /medical-records/organize-ai — organizar WITHOUT existing record
   (usado para novos registros ainda não salvos)
────────────────────────────────────────────────────────── */
router.post('/organize-ai', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { draft_content, patient_id, sources: sel } = req.body || {};
    if (!sources.htmlToText(draft_content)) return res.status(400).json({ error: 'Rascunho vazio' });
    const { organized, used } = await organizeDraft(req, { draft_content, patient_id, sources: sel });
    res.json({ organized, ai_status: 'organized', review_points: organized.pontos_revisao, sources: used });
  } catch (err) { AI_ERR(res, err, 'Erro ao organizar com IA'); }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/fill-evolution — IA propõe os campos estruturados da evolução
   NÃO grava nada: devolve apenas sugestões para o profissional revisar no painel.
   Body: { patient_id?, record_id?, sources?: [grupos], draft_content, transcript, options: {campo: [opções]}, goals: [],
           previous?: {proxima, tarefas}, patient_context? (legado, usado só sem patient_id) }
   Com patient_id as fontes (anamnese, avaliações, evoluções, instrumentos, plano, humor) vêm do servidor e cada
   sugestão devolve as fontes citadas. As fontes históricas servem de contexto; o conteúdo da sessão é o texto livre/transcrição.
────────────────────────────────────────────────────────── */
const EVOLUTION_AI_SYSTEM = `Você é uma assistente de documentação clínica de saúde mental. A partir do conteúdo da SESSÃO ATUAL (fontes "Texto livre" e/ou "Transcrição"), proponha o preenchimento dos campos de uma evolução de sessão. As demais fontes ([F#] de anamnese, evoluções anteriores, plano, instrumentos, humor) são apenas CONTEXTO para coerência.
Regras obrigatórias:
- O conteúdo dos campos deve vir da sessão atual. NUNCA copie para a evolução fatos de sessões anteriores, da anamnese ou de outras fontes como se tivessem ocorrido hoje.
- NÃO invente nada. Se uma informação não aparece na sessão atual, devolva "" (texto), [] (lista) ou null (risco).
- Não emita diagnóstico nem hipótese diagnóstica que não tenha sido dita pelo profissional.
- Riscos (ideação suicida, autolesão, heteroagressão, vulnerabilidade): use "presente" SOMENTE se a sessão atual menciona; "sem_indicios" SOMENTE se a sessão atual afirma explicitamente a ausência; caso contrário null. Risco registrado no passado não vale para hoje.
- Linguagem técnica, clara, objetiva e sucinta; diferencie relato do paciente de observação do profissional.
- Para campos com lista de opções, use SOMENTE itens exatamente iguais aos fornecidos.
- Não inclua dados de identificação (nome, CPF, contatos).
- Em "fontes" liste, por campo preenchido, os ids [F#] de onde a informação veio; em "confianca" use alta (literal no texto), media (resumo/combinação) ou baixa (inferência leve).
Retorne SOMENTE um JSON válido com a estrutura:
{
  "tema": "", "humor": "", "relato": "",
  "afeto": [], "aparencia": [], "pensamento": [], "sono_energia": [], "queixas_novas": "",
  "intervencoes": [], "tecnica": "", "objetivos": [],
  "resposta": "", "adesao": "", "avancos": "",
  "tarefas": "", "proxima": "", "proxima_foco": "", "observacoes": "",
  "riscos": {
    "ideacao": {"status": null, "detalhe": ""},
    "autolesao": {"status": null, "detalhe": ""},
    "heteroagressao": {"status": null, "detalhe": ""},
    "vulnerabilidade": {"status": null, "detalhe": ""}
  },
  "fontes": {"campo": ["F1"]},
  "confianca": {"campo": "alta"},
  "pontos_revisao": []
}`;

const CURRENT_GROUPS = ['texto_livre', 'transcricao'];
const CONFIDENCE = ['alta', 'media', 'baixa'];
const normConf = (c) => { const v = String(c || '').toLowerCase().replace('é', 'e'); return CONFIDENCE.includes(v) ? v : null; };

/** Converte {campo: ["F1"]} da IA em rótulos válidos; ids inexistentes são descartados. */
function mapCitations(rawFontes, items) {
  const byId = new Map(items.map(i => [i.id, i]));
  const result = {};
  if (rawFontes && typeof rawFontes === 'object' && !Array.isArray(rawFontes)) {
    Object.keys(rawFontes).forEach((k) => {
      const ids = (Array.isArray(rawFontes[k]) ? rawFontes[k] : [rawFontes[k]]).map(x => String(x || '').replace(/[\[\]\s]/g, '').toUpperCase());
      const valid = Array.from(new Set(ids.filter(id => byId.has(id))));
      result[k] = valid;
    });
  }
  return { ids: result, labelsOf: (ids) => (ids || []).map(id => byId.get(id).label), groupsOf: (ids) => (ids || []).map(id => byId.get(id).group) };
}

router.post('/fill-evolution', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { draft_content, transcript, patient_context, options, goals, previous, patient_id, record_id, sources: sel } = req.body || {};
    const selection = parseSelection(sel);
    let items; let planGoals = []; let available = []; let truncated = [];
    if (patient_id) {
      const g = await sources.gather(req.user, patient_id, { recordId: record_id, selection, draft: draft_content, transcript });
      items = g.items; planGoals = g.planGoals; available = g.available; truncated = g.truncated;
    } else {
      // Compatibilidade: sem paciente, só texto livre/transcrição enviados pelo cliente.
      const draftText = sources.clipText(sources.htmlToText(draft_content), 9000, true);
      const transText = sources.clipText(String(transcript || '').trim(), 14000, true);
      items = [];
      if (transText) items.push({ id: `F${items.length + 1}`, group: 'transcricao', label: 'Transcrição da sessão (sala virtual)', text: transText });
      if (draftText) items.push({ id: `F${items.length + 1}`, group: 'texto_livre', label: 'Texto livre do registro (rascunho atual)', text: draftText });
    }
    if (!items.some(i => CURRENT_GROUPS.includes(i.group))) {
      return res.status(400).json({ error: 'Informe o texto livre ou a transcrição da sessão (e mantenha essa fonte marcada) para a IA preencher a evolução.' });
    }

    const opts = options && typeof options === 'object' ? options : {};
    const goalList = Array.isArray(goals) && goals.length
      ? goals.map(g => clipText(g, 300)).filter(Boolean).slice(0, 30)
      : planGoals;
    const optLines = Object.keys(opts).filter(k => Array.isArray(opts[k]))
      .map(k => `- ${k}: ${opts[k].map(o => `"${clipText(o, 80)}"`).join(', ')}`).join('\n');
    const prompt = [
      !patient_id && patient_context ? `Contexto do paciente: ${clipText(patient_context, 500)}` : '',
      optLines ? `Opções permitidas por campo:\n${optLines}` : '',
      goalList.length ? `Objetivos ativos do plano terapêutico (use itens exatamente iguais em "objetivos"):\n${goalList.map(g => `- ${g}`).join('\n')}` : '',
      !patient_id && previous && (previous.proxima || previous.tarefas) ? `Sessão anterior — plano: ${clipText(previous.proxima, 500)} | tarefas: ${clipText(previous.tarefas, 500)}` : '',
      `FONTES:\n${sources.renderContext(items)}`,
    ].filter(Boolean).join('\n\n');

    const raw = await callAi(req, { system: EVOLUTION_AI_SYSTEM, prompt, max_tokens: 2500, temperature: 0.2 });
    const parsed = parseAiJson(raw);
    if (!parsed) return res.status(502).json({ error: 'A IA devolveu uma resposta inesperada. Tente novamente.' });

    const cites = mapCitations(parsed.fontes, items);
    const s = {};
    ['tema', 'relato', 'queixas_novas', 'tecnica', 'resposta', 'avancos', 'tarefas', 'proxima', 'proxima_foco', 'observacoes'].forEach(k => {
      const v = clipText(typeof parsed[k] === 'string' ? parsed[k] : '', 4000).trim();
      if (v) s[k] = v;
    });
    ['humor', 'adesao'].forEach(k => {
      const v = pickFrom([parsed[k]], opts[k])[0];
      if (v) s[k] = v;
    });
    ['afeto', 'aparencia', 'pensamento', 'sono_energia', 'intervencoes'].forEach(k => {
      const v = pickFrom(parsed[k], opts[k]);
      if (v.length) s[k] = v;
    });
    const g2 = pickFrom(parsed.objetivos, goalList);
    if (g2.length) s.objetivos = g2;

    const meta = {};
    const note = (key, citeKey) => {
      const ids = cites.ids[citeKey || key] || [];
      const conf = normConf(parsed.confianca && parsed.confianca[citeKey || key]);
      meta[key] = { fontes: cites.labelsOf(ids), confianca: ids.length ? (conf || 'media') : 'baixa' };
      return ids;
    };
    Object.keys(s).forEach(k => note(k));

    // Riscos: só valem se apoiados por fonte da sessão atual (nunca por histórico).
    const risks = parsed.riscos && typeof parsed.riscos === 'object' ? parsed.riscos : {};
    ['ideacao', 'autolesao', 'heteroagressao', 'vulnerabilidade'].forEach(k => {
      const r = risks[k];
      const st = r && typeof r === 'object' ? String(r.status || '').toLowerCase() : '';
      if (st !== 'presente' && st !== 'sem_indicios') return;
      const ids = cites.ids[`risco_${k}`] || cites.ids[k] || cites.ids.riscos || [];
      // Sem citação, só vale se não há fonte histórica no contexto (então a origem só pode ser a sessão atual).
      const onlyCurrentContext = !items.some(i => !CURRENT_GROUPS.includes(i.group) && i.group !== 'cadastro');
      const currentBacked = cites.groupsOf(ids).some(gr => CURRENT_GROUPS.includes(gr)) || (!ids.length && onlyCurrentContext);
      if (!currentBacked) return;
      if (st === 'presente') {
        s[`risco_${k}`] = 'Presente';
        const d = clipText(typeof r.detalhe === 'string' ? r.detalhe : '', 1000).trim();
        if (d) s[`risco_${k}_detalhe`] = d;
      } else s[`risco_${k}`] = 'Sem indícios';
      meta[`risco_${k}`] = { fontes: cites.labelsOf(ids), confianca: ids.length ? (normConf(parsed.confianca && (parsed.confianca[`risco_${k}`] || parsed.confianca[k])) || 'media') : 'baixa' };
    });

    const reviewPoints = Array.isArray(parsed.pontos_revisao) ? parsed.pontos_revisao.map(p => clipText(typeof p === 'string' ? p : '', 300)).filter(Boolean).slice(0, 8) : [];
    if (record_id) logAudit(record_id, req.user.id, req.user.tenant_id, 'ai_organized', { fill: 'evolution', groups: Array.from(new Set(items.map(i => i.group))) });
    res.json({ suggestions: s, suggestion_meta: meta, review_points: reviewPoints, sources: sources.publicItems(items), available, truncated });
  } catch (err) { AI_ERR(res, err, 'Erro ao preencher com IA'); }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/sources?patient_id=&record_id= — fontes disponíveis (rótulos e contagens, sem o texto)
   Alimenta o seletor "Origem das informações" antes de gerar com IA.
────────────────────────────────────────────────────────── */
router.get('/sources', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { patient_id, record_id } = req.query;
    if (!patient_id) return res.status(400).json({ error: 'Paciente obrigatório' });
    const g = await sources.gather(req.user, patient_id, { recordId: record_id || undefined });
    const groups = g.available.map(a => ({ ...a, items: g.items.filter(i => i.group === a.id).map(i => i.label) }));
    res.json({ groups });
  } catch (err) { AI_ERR(res, err, 'Erro ao listar fontes'); }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/source-text — texto COMPLETO de uma fonte ("Usar Fonte" / "Ver detalhes")
   Body: { patient_id, type: 'anamnese' | 'tool' | 'form_response', id }
────────────────────────────────────────────────────────── */
router.post('/source-text', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    const { patient_id, type, id } = req.body || {};
    if (!patient_id || !type || !id) return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' });
    const r = await sources.renderSourceText(req.user, patient_id, String(type), id);
    if (!r) return res.status(404).json({ error: 'Fonte não encontrada ou sem acesso.' });
    res.json(r);
  } catch (err) { AI_ERR(res, err, 'Erro ao carregar a fonte'); }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/fill-assessment — IA propõe os campos da AVALIAÇÃO (modelo da especialidade em uso)
   NÃO grava nada. Body: { patient_id, record_id?, specialty, sources?: [grupos], draft_content?, transcript?,
     fields: [{ key, label, type, options?, columns?: [chaves], section? }] }
   Devolve { suggestions: {campo: valor}, suggestion_meta: {campo: {fontes: [rótulos], confianca}}, review_points, sources }
────────────────────────────────────────────────────────── */
const ASSESSMENT_AI_SYSTEM = `Você é uma assistente de documentação clínica de saúde mental. Preencha os campos de uma AVALIAÇÃO CLÍNICA usando APENAS as FONTES fornecidas (blocos [F#]).
Regras obrigatórias:
- Use exclusivamente informações que constam nas fontes. Não invente, não complete lacunas com suposições. Campo sem base nas fontes: NÃO inclua a chave.
- Nunca conclua nem feche diagnóstico. Hipóteses diagnósticas e compreensão do caso só como HIPÓTESES PROVISÓRIAS, começando o texto com "Hipótese provisória:" e sempre a confirmar pelo profissional.
- Riscos (suicida, autolesão, heteroagressão, a terceiros, tentativas prévias): preencha só se constar de forma explícita nas fontes; nunca deduza ausência de risco.
- Exame do estado mental: só com observações do profissional registradas nas fontes; não deduza a partir de relato.
- Campos de seleção/lista: use SOMENTE valores exatamente iguais às opções fornecidas.
- Diferencie relato do paciente de observação do profissional; linguagem técnica, sucinta, sem moralismo.
- Instrumentos/escalas: cite escores e datas como constam nas fontes; não recalcule nem reinterprete.
- Não inclua nome, CPF, contatos ou outros dados de identificação.
- Para cada campo informe "fontes" (ids F# usados) e "confianca": alta (literal nas fontes), media (resumo/combinação) ou baixa (inferência leve).
- Em "pontos_revisao" liste lacunas, contradições entre fontes e itens que exigem avaliação do profissional.
Retorne SOMENTE um JSON válido:
{"campos": {"<chave>": {"valor": <texto | opção | lista | lista de objetos>, "fontes": ["F1"], "confianca": "alta"}}, "pontos_revisao": ["..."]}`;

// Campos que a IA nunca sugere (conduta clínica/prescrição e devolutiva são decisão do profissional).
const ASSESSMENT_BLOCKED = new Set(['prescricao', 'exames_solicitados', 'devolutiva']);
const HYPOTHESIS_KEYS = new Set(['hipoteses', 'diag_diferencial', 'raciocinio', 'avaliacao', 'impressao', 'cid']);
const RISK_KEYS = new Set(['risco_suicida', 'risco_terceiros', 'tentativas_previas', 'risco_fatores', 'risco_conduta']);
const NEGATIVE_RISK_VALUES = new Set(['sem indicação de risco', 'não']);

function sanitizeFieldDefs(fields) {
  const out = [];
  (Array.isArray(fields) ? fields : []).slice(0, 150).forEach((f) => {
    if (!f || typeof f.key !== 'string' || !/^[a-z0-9_]{1,60}$/.test(f.key)) return;
    if (!['text', 'textarea', 'select', 'multi', 'rows', 'date', 'number'].includes(f.type)) return;
    if (ASSESSMENT_BLOCKED.has(f.key)) return;
    out.push({
      key: f.key, label: clipText(f.label || f.key, 120), type: f.type, section: clipText(f.section || '', 80),
      options: Array.isArray(f.options) ? f.options.map(o => clipText(o, 80)).filter(Boolean).slice(0, 40) : undefined,
      columns: Array.isArray(f.columns) ? f.columns.filter(c => typeof c === 'string' && /^[a-z0-9_]{1,30}$/.test(c)).slice(0, 8) : undefined,
    });
  });
  return out;
}

function validateAssessmentValue(def, v) {
  switch (def.type) {
    case 'text': { const t = clipText(typeof v === 'string' ? v : '', 500).trim(); return t || null; }
    case 'textarea': { const t = clipText(typeof v === 'string' ? v : '', 4000).trim(); return t || null; }
    case 'select': return pickFrom([v], def.options)[0] || null;
    case 'multi': { const l = pickFrom(Array.isArray(v) ? v : [v], def.options); return l.length ? l : null; }
    case 'date': return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null;
    case 'number': { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? String(n) : null; }
    case 'rows': {
      if (!Array.isArray(v) || !def.columns || !def.columns.length) return null;
      const rows = v.slice(0, 12).map((r) => {
        const o = {};
        if (r && typeof r === 'object') def.columns.forEach(c => { const t = clipText(typeof r[c] === 'string' || typeof r[c] === 'number' ? String(r[c]) : '', 300).trim(); if (t) o[c] = t; });
        return o;
      }).filter(o => Object.keys(o).length);
      return rows.length ? rows : null;
    }
    default: return null;
  }
}

router.post('/fill-assessment', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { patient_id, record_id, specialty, fields, draft_content, transcript, sources: sel } = req.body || {};
    if (!patient_id) return res.status(400).json({ error: 'Selecione o paciente antes de preencher com IA.' });
    const defs = sanitizeFieldDefs(fields);
    if (!defs.length) return res.status(400).json({ error: 'Modelo de avaliação sem campos preenchíveis.' });
    if (record_id) { const rec = await loadVisibleRecord(req, res, record_id); if (!rec) return; if (String(rec.patient_id) !== String(patient_id)) return res.status(400).json({ error: 'Registro não pertence a este paciente.' }); }

    const g = await sources.gather(req.user, patient_id, { recordId: record_id, selection: parseSelection(sel), draft: draft_content, transcript });
    const evidence = g.items.filter(i => i.group !== 'cadastro');
    if (!evidence.length) {
      return res.status(400).json({ error: 'Não há informações nas fontes selecionadas. Marque outras fontes ou escreva o texto livre.' });
    }

    const fieldLines = defs.map((d) => {
      const parts = [`- ${d.key} | ${d.label}${d.section ? ` (${d.section})` : ''} | tipo: ${d.type}`];
      if (d.options && d.options.length) parts.push(`opções: ${d.options.map(o => `"${o}"`).join(', ')}`);
      if (d.type === 'rows' && d.columns) parts.push(`colunas: ${d.columns.join(', ')}`);
      if (d.type === 'date') parts.push('formato AAAA-MM-DD');
      return parts.join(' | ');
    }).join('\n');
    const prompt = `Modelo de avaliação: ${clipText(specialty, 40) || 'psicologia'}\n\nCAMPOS PREENCHÍVEIS:\n${fieldLines}\n\nFONTES:\n${sources.renderContext(g.items)}`;

    const raw = await callAi(req, { system: ASSESSMENT_AI_SYSTEM, prompt, max_tokens: 3500, temperature: 0.2 });
    const parsed = parseAiJson(raw);
    const campos = parsed && parsed.campos && typeof parsed.campos === 'object' && !Array.isArray(parsed.campos) ? parsed.campos : null;
    if (!campos) return res.status(502).json({ error: 'A IA devolveu uma resposta inesperada. Tente novamente.' });

    const byId = new Map(g.items.map(i => [i.id, i]));
    const suggestions = {}; const meta = {};
    defs.forEach((d) => {
      const entry = campos[d.key];
      if (entry === undefined || entry === null) return;
      const isWrapped = entry && typeof entry === 'object' && !Array.isArray(entry) && 'valor' in entry;
      let value = validateAssessmentValue(d, isWrapped ? entry.valor : entry);
      if (value === null) return;
      const ids = Array.from(new Set((isWrapped && Array.isArray(entry.fontes) ? entry.fontes : []).map(x => String(x || '').replace(/[\[\]\s]/g, '').toUpperCase()).filter(id => byId.has(id) && byId.get(id).group !== 'cadastro')));
      let conf = (isWrapped && normConf(entry.confianca)) || 'media';
      // Hipóteses e riscos precisam de fonte citada; sem ela a sugestão é descartada.
      if ((HYPOTHESIS_KEYS.has(d.key) || RISK_KEYS.has(d.key)) && !ids.length) return;
      if (RISK_KEYS.has(d.key) && d.type === 'select' && NEGATIVE_RISK_VALUES.has(String(value).toLowerCase()) && conf !== 'alta') return;
      if (HYPOTHESIS_KEYS.has(d.key)) {
        if (conf === 'alta') conf = 'media'; // hipótese nunca é "alta"
        if (d.type === 'textarea' || d.type === 'text') { if (!/hip[óo]tese/i.test(value)) value = `Hipótese provisória: ${value}`; }
        if (d.type === 'rows' && d.columns && d.columns.includes('status')) value = value.map(r => ({ ...r, status: r.status || 'Hipótese' }));
      }
      if (!ids.length) conf = 'baixa';
      suggestions[d.key] = value;
      meta[d.key] = { fontes: ids.map(id => byId.get(id).label), confianca: conf };
    });

    const reviewPoints = Array.isArray(parsed.pontos_revisao) ? parsed.pontos_revisao.map(p => clipText(typeof p === 'string' ? p : '', 300)).filter(Boolean).slice(0, 10) : [];
    if (record_id) logAudit(record_id, req.user.id, req.user.tenant_id, 'ai_organized', { fill: 'assessment', groups: Array.from(new Set(g.items.map(i => i.group))) });
    res.json({ suggestions, suggestion_meta: meta, review_points: reviewPoints, sources: sources.publicItems(g.items), available: g.available, truncated: g.truncated });
  } catch (err) { AI_ERR(res, err, 'Erro ao preencher a avaliação com IA'); }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/log-export — registrar exportação no audit
   Chamado pelo frontend após gerar PDF/Word (geração é client-side)
────────────────────────────────────────────────────────── */
router.post('/log-export', authMiddleware, async (req, res) => {
  try {
    const { record_ids, patient_id, export_mode, export_format } = req.body;
    // Loga uma entrada de audit por registro exportado
    const ids = Array.isArray(record_ids) ? record_ids : [];
    for (const rid of ids) {
      await logAudit(rid, req.user.id, req.user.tenant_id, 'exported', {
        patient_id, export_mode, export_format
      });
    }
    res.json({ ok: true, logged: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar exportação' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id — registro completo
────────────────────────────────────────────────────────── */
router.get('/:id', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {

    const [rows] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name, u.email as professional_email
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ? AND r.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const record = rows[0];
    if (!sources.canSeeRecord(req.user, record)) return res.status(403).json({ error: 'Você não tem acesso a este registro.' });

    const [attachments] = await db.query(
      'SELECT id, file_name, file_url, file_type, file_size FROM medical_record_attachments WHERE record_id = ?',
      [record.id]
    );
    const [versions] = await db.query(
      'SELECT id, version_number, status, created_at, content FROM medical_record_versions WHERE record_id = ? ORDER BY version_number DESC LIMIT 10',
      [record.id]
    );
    const [audit] = await db.query(
      `SELECT a.*, u.name as user_name FROM medical_record_audit a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? ORDER BY a.created_at DESC LIMIT 20`,
      [record.id]
    );

    record.attachments = attachments;
    record.versions = versions;
    record.audit = audit;
    record.tags = parseJson(record.tags);

    await logAudit(record.id, req.user.id, req.user.tenant_id, 'viewed');
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records — criar novo
────────────────────────────────────────────────────────── */
router.post('/', authMiddleware, checkPermission('create_medical_record'), async (req, res) => {
  try {
    const {
      patient_id, appointment_id, content, restricted_content,
      record_type, title, status, tags, start_time, end_time,
      appointment_type, attachments,
      draft_content, // rascunho bruto antes da IA
      ai_organized_content, ai_status, created_at
    } = req.body;
    // Data da sessão informada pelo profissional (YYYY-MM-DD); fixa ao meio-dia para não "virar" de dia por fuso.
    const sessionCreatedAt = /^\d{4}-\d{2}-\d{2}/.test(String(created_at || '')) ? `${String(created_at).slice(0, 10)} 12:00:00` : null;

    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    // SEGURANÇA: Verificar se o paciente pertence a este tenant
    const [[patient]] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, req.user.tenant_id]);
    if (!patient) return res.status(403).json({ error: 'Paciente não encontrado ou acesso negado nesta clínica.' });

    // SEGURANÇA: Se houver agendamento, verificar se ele também pertence ao tenant
    if (appointment_id) {
       const [[apt]] = await db.query('SELECT id FROM appointments WHERE id = ? AND tenant_id = ?', [appointment_id, req.user.tenant_id]);
       if (!apt) return res.status(403).json({ error: 'Agendamento não pertence a esta clínica.' });
    }

    const tagsStr = tags ? JSON.stringify(Array.isArray(tags) ? tags : []) : null;

    const [result] = await db.query(
      `INSERT INTO medical_records
       (tenant_id, patient_id, professional_id, appointment_id,
        content, restricted_content, draft_content, ai_organized_content,
        record_type, title, status, ai_status, tags,
        start_time, end_time, appointment_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [
        req.user.tenant_id, patient_id, req.user.id, appointment_id || null,
        content || null, restricted_content || null, draft_content || null, ai_organized_content || null,
        record_type || 'Evolucao', title || null,
        status || 'Rascunho', ai_status || 'pending', tagsStr,
        start_time || null, end_time || null, appointment_type || 'individual', sessionCreatedAt
      ]
    );

    const recordId = result.insertId;

    // Salvar versão inicial
    await db.query(
      'INSERT INTO medical_record_versions (record_id, version_number, content, status, created_by) VALUES (?, 1, ?, ?, ?)',
      [recordId, content || '', status || 'Rascunho', req.user.id]
    );

    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        await db.query(
          'INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
          [recordId, att.file_name, att.file_url, att.file_type || null, att.file_size || null]
        );
      }
    }

    await logAudit(recordId, req.user.id, req.user.tenant_id, 'created', { status, record_type });
    await history.recordVersion(req.user, recordId, { event: 'criado' });

    const [record] = await db.query('SELECT * FROM medical_records WHERE id = ?', [recordId]);
    res.status(201).json(record[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   PUT /medical-records/:id — atualizar
────────────────────────────────────────────────────────── */
router.put('/:id', authMiddleware, checkPermission('edit_medical_record'), async (req, res) => {
  try {
    const {
      content, restricted_content, draft_content, ai_organized_content,
      record_type, title, status, ai_status, tags,
      start_time, end_time, appointment_type, attachments,
      created_at, appointment_id,
      autosave, history_event, restored_from
    } = req.body;
    const sessionDate = /^\d{4}-\d{2}-\d{2}/.test(String(created_at || '')) ? String(created_at).slice(0, 10) : null;

    // Vínculo com agendamento: precisa pertencer à mesma clínica
    if (appointment_id) {
      const [[apt]] = await db.query('SELECT id FROM appointments WHERE id = ? AND tenant_id = ?', [appointment_id, req.user.tenant_id]);
      if (!apt) return res.status(403).json({ error: 'Agendamento não pertence a esta clínica.' });
    }

    const [existing] = await db.query(
      'SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (!sources.canSeeRecord(req.user, existing[0])) return res.status(403).json({ error: 'Você não tem acesso a este registro.' });
    // Restaurar versão só vale para registros ainda não aprovados/finalizados.
    if (history_event === 'restaurado' && isLocked(existing[0])) {
      return res.status(409).json({ error: 'Registros aprovados não podem ser restaurados a partir do histórico.' });
    }

    const tagsStr = tags ? JSON.stringify(Array.isArray(tags) ? tags : []) : undefined;
    const nextVersion = (existing[0].version_count || 1) + 1;

    await db.query(
      `UPDATE medical_records SET
        created_at = IF(status IN ('Aprovado', 'Finalizado') OR ? IS NULL OR DATE(created_at) = ?, created_at, CONCAT(?, ' 12:00:00')),
        appointment_id = COALESCE(?, appointment_id),
        content = COALESCE(?, content),
        restricted_content = COALESCE(?, restricted_content),
        draft_content = COALESCE(?, draft_content),
        ai_organized_content = COALESCE(?, ai_organized_content),
        record_type = COALESCE(?, record_type),
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        ai_status = COALESCE(?, ai_status),
        tags = COALESCE(?, tags),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        appointment_type = COALESCE(?, appointment_type),
        version_count = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        sessionDate, sessionDate, sessionDate, appointment_id || null,
        content ?? null, restricted_content ?? null, draft_content ?? null, ai_organized_content ?? null,
        record_type ?? null, title ?? null,
        status ?? null, ai_status ?? null, tagsStr ?? null,
        start_time ?? null, end_time ?? null, appointment_type ?? null,
        nextVersion, req.params.id
      ]
    );

    // Salvar nova versão
    if (content !== undefined || status !== undefined) {
      await db.query(
        'INSERT INTO medical_record_versions (record_id, version_number, content, status, created_by) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, nextVersion, content || '', status || 'Rascunho', req.user.id]
      );
    }

    // Sincronizar anexos
    if (attachments && Array.isArray(attachments)) {
      await db.query('DELETE FROM medical_record_attachments WHERE record_id = ?', [req.params.id]);
      for (const att of attachments) {
        await db.query(
          'INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, att.file_name, att.file_url, att.file_type || null, att.file_size || null]
        );
      }
    }

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'updated', { status, ai_status });
    await history.recordVersion(req.user, Number(req.params.id), {
      event: ['restaurado', 'ia'].includes(history_event) ? history_event : 'editado',
      autosave: autosave === true,
      beforeRow: existing[0],
      summaryExtra: restored_from ? `Restaurado da versão ${Number(restored_from) || ''}`.trim() : undefined,
    });

    const [updated] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/approve — aprovar registro
   Requer senha do profissional
────────────────────────────────────────────────────────── */
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha obrigatória para aprovação' });

    // Verificar senha
    const [[user]] = await db.query('SELECT password FROM users WHERE id = ? AND tenant_id = ?', [req.user.id, req.user.tenant_id]);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const [existing] = await db.query('SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (!sources.isAdminRole(req.user) && String(existing[0].professional_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Somente o profissional responsável (ou um administrador) pode aprovar este registro.' });
    }

    await db.query(
      'UPDATE medical_records SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['Aprovado', req.user.id, req.params.id]
    );

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'approved');
    await history.recordVersion(req.user, Number(req.params.id), { event: 'aprovado', beforeRow: existing[0] });
    res.json({ ok: true, message: 'Registro aprovado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aprovar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/organize-ai — organizar com IA
────────────────────────────────────────────────────────── */
router.post('/:id/organize-ai', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { draft_content, sources: sel } = req.body || {};
    if (!sources.htmlToText(draft_content)) return res.status(400).json({ error: 'Rascunho vazio' });

    const [rows] = await db.query('SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const rec = rows[0];
    if (!sources.canSeeRecord(req.user, rec)) return res.status(403).json({ error: 'Você não tem acesso a este registro.' });

    let result;
    try {
      result = await organizeDraft(req, { draft_content, patient_id: rec.patient_id, record_id: rec.id, sources: sel });
    } catch (e) {
      // IA fora do ar: guarda só o rascunho (sem sobrescrever o conteúdo já organizado) e avisa o usuário.
      await db.query('UPDATE medical_records SET draft_content = ?, updated_at = NOW() WHERE id = ?', [draft_content, req.params.id]);
      throw e;
    }
    const { organized, used } = result;

    // Registros estruturados guardam os campos em ai_organized_content._estruturado: preserva ao gravar o organizado.
    let toSave = { ...organized };
    try {
      const prev = rec.ai_organized_content ? JSON.parse(rec.ai_organized_content) : null;
      if (prev && prev._estruturado) toSave._estruturado = prev._estruturado;
    } catch { /* conteúdo anterior inválido: grava só o organizado */ }

    await db.query(
      'UPDATE medical_records SET draft_content = ?, ai_organized_content = ?, ai_status = ?, updated_at = NOW() WHERE id = ?',
      [draft_content, JSON.stringify(toSave), 'organized', req.params.id]
    );

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'ai_organized', { classification: organized.classificacao });
    await history.recordVersion(req.user, Number(req.params.id), { event: 'ia', beforeRow: rec });
    res.json({ organized, ai_status: 'organized', review_points: organized.pontos_revisao, sources: used });
  } catch (err) { AI_ERR(res, err, 'Erro ao organizar com IA'); }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id/restricted — conteúdo restrito
   Requer verificação de senha
────────────────────────────────────────────────────────── */
router.post('/:id/restricted', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha necessária' });

    const [[user]] = await db.query('SELECT password FROM users WHERE id = ? AND tenant_id = ?', [req.user.id, req.user.tenant_id]);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const [[record]] = await db.query(
      'SELECT professional_id, shared_with, restricted_content, ai_organized_content FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
    if (!sources.canSeeRecord(req.user, record)) return res.status(403).json({ error: 'Você não tem acesso a este registro.' });

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'restricted_accessed');
    res.json({
      restricted_content: record.restricted_content,
      ai_restricted: (() => {
        try { const j = JSON.parse(record.ai_organized_content || '{}'); return j.conteudo_restrito || null; } catch { return null; }
      })()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao acessar conteúdo restrito' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id/audit — histórico de auditoria
────────────────────────────────────────────────────────── */
router.get('/:id/audit', authMiddleware, async (req, res) => {
  try {
    const [[auditRec]] = await db.query('SELECT id, professional_id, shared_with FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (!auditRec) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (!sources.canSeeRecord(req.user, auditRec)) return res.status(403).json({ error: 'Você não tem acesso a este registro.' });
    const [audit] = await db.query(
      `SELECT a.*, u.name as user_name FROM medical_record_audit a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? AND a.tenant_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id, req.user.tenant_id]
    );
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar auditoria' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id/history — linha do tempo de alterações (sem o conteúdo)
   ?light=1 devolve só os metadados (criado/última alteração) e não gera auditoria nem versão inicial.
   O snapshot nunca contém o campo restrito.
────────────────────────────────────────────────────────── */
const historyRow = (v) => ({
  id: v.id, version_no: v.version_no, saved_by_user_id: v.saved_by_user_id, saved_by_name: v.saved_by_name,
  saved_at: v.saved_at, event: v.event, status: v.status, summary: v.summary,
  changes: (() => { try { return JSON.parse(v.changes || '[]'); } catch { return []; } })(),
});

router.get('/:id/history', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    await history.ready;
    const rec = await loadVisibleRecord(req, res, req.params.id);
    if (!rec) return;
    const light = req.query.light === '1';
    if (!light) await history.ensureBaseline(req.user.tenant_id, rec);

    const [first] = await db.query('SELECT saved_by_name, saved_at, event FROM medical_record_history WHERE tenant_id = ? AND record_id = ? ORDER BY version_no ASC LIMIT 1', [req.user.tenant_id, rec.id]);
    const [last] = await db.query('SELECT saved_by_name, saved_at FROM medical_record_history WHERE tenant_id = ? AND record_id = ? ORDER BY version_no DESC LIMIT 1', [req.user.tenant_id, rec.id]);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM medical_record_history WHERE tenant_id = ? AND record_id = ?', [req.user.tenant_id, rec.id]);
    const created = first[0] && first[0].event === 'criado' ? first[0] : null;
    const meta = {
      created_by: (created && created.saved_by_name) || rec.professional_name || null,
      created_at: (created && created.saved_at) || rec.created_at,
      last_by: (last[0] && last[0].saved_by_name) || rec.professional_name || null,
      last_at: (last[0] && last[0].saved_at) || rec.updated_at || rec.created_at,
      total,
      locked: isLocked(rec),
    };
    if (light) return res.json({ meta, versions: [] });

    const [rows] = await db.query(
      `SELECT id, version_no, saved_by_user_id, saved_by_name, saved_at, event, status, summary, changes
       FROM medical_record_history WHERE tenant_id = ? AND record_id = ? ORDER BY version_no DESC LIMIT 200`,
      [req.user.tenant_id, rec.id]
    );
    await logAudit(rec.id, req.user.id, req.user.tenant_id, 'viewed', { history: true });
    res.json({ meta, versions: rows.map(historyRow) });
  } catch (err) { AI_ERR(res, err, 'Erro ao buscar histórico'); }
});

// GET /medical-records/:id/history/:versionId — snapshot da versão e da anterior (para comparar)
router.get('/:id/history/:versionId', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    await history.ready;
    const rec = await loadVisibleRecord(req, res, req.params.id);
    if (!rec) return;
    const [[v]] = await db.query('SELECT * FROM medical_record_history WHERE id = ? AND record_id = ? AND tenant_id = ?', [req.params.versionId, rec.id, req.user.tenant_id]);
    if (!v) return res.status(404).json({ error: 'Versão não encontrada' });
    const [[prev]] = await db.query('SELECT snapshot FROM medical_record_history WHERE record_id = ? AND tenant_id = ? AND version_no < ? ORDER BY version_no DESC LIMIT 1', [rec.id, req.user.tenant_id, v.version_no]);
    const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
    res.json({ version: { ...historyRow(v), snapshot: parse(v.snapshot) }, previous: prev ? parse(prev.snapshot) : null, locked: isLocked(rec) });
  } catch (err) { AI_ERR(res, err, 'Erro ao buscar versão'); }
});

/* ──────────────────────────────────────────────────────────
   DELETE /medical-records/:id
────────────────────────────────────────────────────────── */
router.delete('/:id', authMiddleware, checkPermission('edit_medical_record'), async (req, res) => {
  try {
    // SEGURANÇA: Verificar existência e posse primeiro
    const [[record]] = await db.query('SELECT id, professional_id FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    if (!sources.isAdminRole(req.user) && String(record.professional_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Somente o profissional responsável (ou um administrador) pode excluir este registro.' });
    }

    // Só deleta dependentes se o registro for dele
    await db.query('DELETE FROM medical_record_attachments WHERE record_id = ?', [req.params.id]);
    await db.query('DELETE FROM medical_record_versions WHERE record_id = ?', [req.params.id]);
    await history.ready;
    await db.query('DELETE FROM medical_record_history WHERE record_id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    await db.query('DELETE FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    
    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'deleted');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   PROMPT PARA SÍNTESE CLÍNICA (IA)
────────────────────────────────────────────────────────── */
const CLINICAL_SYNTHESIS_PROMPT = `Você é uma assistente de síntese clínica avançada (Bia IA).
Sua função é integrar múltiplos dados de um paciente (Anamneses, Escalas, Outros Instrumentos) em uma FORMULAÇÃO DE CASO coesa e estruturada.
Você deve utilizar estritamente a abordagem teórica especificada pelo profissional.

Estrutura da resposta (Markdown):
1. **Síntese dos Dados Coletados** (Panorama Geral)
2. **Formulação do Caso** (Sob a ótica da abordagem clínica selecionada)
3. **Hipóteses Diagnósticas / Pontos de Atenção**
4. **Planejamento Terapêutico Sugerido**

Regras:
- Utilize terminologia técnica da abordagem selecionada.
- Seja empático, mas rigorosamente científico.
- Destaque correlações entre diferentes instrumentos.
- Sinalize lacunas de informação que necessitam de mais investigação.
`;

/* ──────────────────────────────────────────────────────────
   POST /medical-records/generate-synthesis — gerar síntese multidimensional
────────────────────────────────────────────────────────── */
router.post('/generate-synthesis', authMiddleware, checkPermission('access_ai_features'), async (req, res) => {
  try {
    const { patient_id, approach, sources: srcs, context } = req.body || {};
    if (!patient_id) return res.status(400).json({ error: 'patient_id obrigatório' });

    // SEGURANÇA: o paciente precisa ser desta clínica
    const [[patient]] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, req.user.tenant_id]);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado nesta clínica.' });

    // Enriquecer o contexto com dados reais do banco se as fontes foram informadas
    let enrichedContext = sources.clipText(typeof context === 'string' ? context : '', 24000);

    if (srcs && Array.isArray(srcs)) {
      for (const src of srcs.slice(0, 20)) {
        if (src.type === 'anamnese' && src.id) {
          // As respostas ficam em anamnesis_patient_responses.answers (anamnesis_sends não tem coluna de respostas).
          try {
            const ownSql = sources.isAdminRole(req.user) ? '' : ' AND s.professional_id = ?';
            const [[anamData]] = await db.query(
              `SELECT s.title, r.answers FROM anamnesis_sends s JOIN anamnesis_patient_responses r ON r.send_id = s.id
               WHERE s.id = ? AND s.tenant_id = ? AND s.patient_id = ?${ownSql}`,
              [src.id, req.user.tenant_id, patient_id, ...(sources.isAdminRole(req.user) ? [] : [req.user.id])]
            );
            if (anamData && anamData.answers) {
              const responses = typeof anamData.answers === 'string' ? JSON.parse(anamData.answers) : anamData.answers;
              // Se o contexto não já contém as respostas detalhadas, acrescentar (com rótulos legíveis)
              if (!enrichedContext.includes('Motivo da busca') && !enrichedContext.includes('motivo_busca')) {
                enrichedContext += `\n\n--- DADOS COMPLETOS DA ANAMNESE (${anamData.title || 'Anamnese'}) ---\n`;
                enrichedContext += `${sources.renderValues(responses).slice(0, 6000)}\n`;
              }
            }
          } catch (e) {
            console.warn('Erro ao buscar dados da anamnese para síntese:', e.message);
          }
        }
      }
    }

    if (!enrichedContext.trim()) {
      return res.status(400).json({ error: 'Nenhum dado disponível para gerar a síntese. Verifique se as fontes selecionadas possuem dados.' });
    }

    // Chamar o endpoint de IA para completar
    const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': req.headers.authorization 
      },
      body: JSON.stringify({
        system: CLINICAL_SYNTHESIS_PROMPT,
        prompt: `Abordagem Selecionada: ${sources.clipText(approach, 120)}\n\n${enrichedContext}`,
        max_tokens: 2500,
        temperature: 0.3
      })
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text().catch(() => '');
      console.error('Falha na comunicação com Aurora IA:', aiResp.status, errBody);
      return res.status(502).json({ error: 'Falha na comunicação com o serviço de IA. Tente novamente.' });
    }

    const aiData = await aiResp.json();
    const content = aiData.text || aiData.content || aiData.result || '';

    if (!content || content.length < 50) {
      console.error('IA retornou conteúdo vazio ou muito curto:', content);
      return res.status(502).json({ error: 'A IA não conseguiu gerar uma síntese válida. Tente novamente com mais dados.' });
    }

    res.json({ content });
  } catch (err) {
    console.error('Erro ao gerar síntese clínica:', err);
    res.status(500).json({ error: 'Erro ao gerar síntese clínica com IA' });
  }
});

module.exports = router;
