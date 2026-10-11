const { authMiddleware } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const db = require('../db');

// Resume conteúdo estruturado sem expor chaves técnicas ou perder respostas
// preenchidas no formulário (as quais muitas vezes não ficam em `content`).
function structuredText(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    const values = [];
    const visit = (value, depth = 0) => {
      if (depth > 3 || values.length >= 24 || value == null) return;
      if (typeof value === 'string' && value.trim()) values.push(value.trim());
      else if (Array.isArray(value)) value.forEach(item => visit(item, depth + 1));
      else if (typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
        if (!['id', 'created_at', 'updated_at', 'versions', 'meta'].includes(key)) visit(item, depth + 1);
      });
    };
    visit(parsed);
    return values.join(' | ').slice(0, 1800);
  } catch {
    return '';
  }
}

/* ─────────────────────────────────────────────────────────
   GET /therapeutic-plans/patient/:patient_id/sources
   Retorna fontes de dados do paciente para alimentar o plano
───────────────────────────────────────────────────────── */
router.get('/patient/:patient_id/sources', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.params;
    const tenant_id = req.user.tenant_id;

    const [records] = await db.query(
      `SELECT id, title, record_type, status, created_at,
              LEFT(COALESCE(content, draft_content, ''), 800) AS content_preview,
              ai_organized_content
       FROM medical_records
       WHERE patient_id = ? AND tenant_id = ? AND record_type != 'Plano'
       ORDER BY created_at DESC LIMIT 40`,
      [patient_id, tenant_id]
    );

    let tools = [];
    try {
      const [toolRows] = await db.query(
        `SELECT tool_type, results_json, created_at
         FROM clinical_tool_results
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 20`,
        [patient_id, tenant_id]
      );
      tools = toolRows;
    } catch {}

    res.json({ records, tools });
  } catch (err) {
    console.error('[therapeutic-plans/sources]', err);
    res.status(500).json({ error: 'Erro ao buscar fontes do paciente' });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /therapeutic-plans/ai-suggest
   Gera sugestão de plano terapêutico com IA
───────────────────────────────────────────────────────── */
router.post('/ai-suggest', authMiddleware, async (req, res) => {
  try {
    const { patient_id, approach = 'TCC', current_plan = {} } = req.body;
    const tenant_id = req.user.tenant_id;

    // Buscar fontes
    const [records] = await db.query(
      `SELECT title, record_type, created_at,
              LEFT(COALESCE(content, draft_content, ''), 600) AS content_preview,
              ai_organized_content
       FROM medical_records
       WHERE patient_id = ? AND tenant_id = ? AND record_type != 'Plano'
       ORDER BY created_at DESC LIMIT 20`,
      [patient_id, tenant_id]
    );

    const sourceSummary = records.map(r => {
      const parts = [r.content_preview, structuredText(r.ai_organized_content)].filter(Boolean);
      return `[${r.record_type} - ${r.title} - ${r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}]\n${parts.join('\n')}`;
    }).join('\n\n');

    const prompt = `Você é um assistente clínico de apoio a psicólogas. Gere SOMENTE um rascunho editável de plano terapêutico pela abordagem ${approach}, com base exclusivamente nos registros abaixo.

REGISTROS DO PACIENTE:
${sourceSummary || 'Sem registros disponíveis ainda.'}

Regras obrigatórias: não faça diagnóstico, não invente fatos, riscos, resultados, adesão, alta, consentimento ou fala do paciente. Quando a informação não estiver nos registros, use string vazia ou array vazio. Não inclua identificadores pessoais. Revisões não devem ser criadas. Alta e participação só podem ser preenchidas se constarem expressamente nas fontes.

Responda APENAS JSON válido, sem markdown:
{
  "summary":"síntese breve baseada nas fontes", "current_focus":"", "rationale":"",
  "focus_areas":["ansiedade|autoestima|regulacao_emocional|autoconhecimento|relacionamentos|trabalho_estudos|habitos_rotina|tomada_decisoes|outro"],
  "priorities":[{"text":"prioridade terapêutica"}],
  "current_state":{"main_complaint":"","main_difficulties":""},
  "destination":{"general_objective":"","progress_criteria":""},
  "goals":[{"description":"","area":"uma área de foco","priority":"alta|media|baixa","progress_indicators":"","completion_criterion":""}],
  "interventions":[{"type":"psicoeducacao|automonitoramento|registro_pensamentos|reestruturacao_cognitiva|experimentos_comportamentais|exposicao_gradual|treino_habilidades|resolucao_problemas|regulacao_emocional|esquemas|outras","type_other":"","goal_index":0,"rationale":""}],
  "tasks":[{"activity":"","objective_index":0,"instructions":"","due":"AAAA-MM-DD ou vazio"}],
  "indicators":[{"name":"","kind":"qualitativo|quantitativo","objective_index":0,"definition":"","method":"","baseline":"","unit":"","source":""}],
  "barriers":[{"type":"adesao|rotina|financeiras_logisticas|sintomas_persistentes|compreensao|estressores|ambiente|outras","other":"","context":"","strategy":""}],
  "barriers_notes":"", "discharge":{"criteria":"","achieved":"","remaining":"","relapse_prevention":"","continuity":"","referrals":""},
  "participation":{"discussed":"","preferences":"","agreements":"","divergences":"","perceived_barriers":"","adjustments":""}, "notes":""
}`;

    let suggestion = null;
    try {
      const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
        body: JSON.stringify({ prompt, max_tokens: 3500 })
      });
      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const raw = aiData.text || aiData.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) suggestion = JSON.parse(match[0]);
      }
    } catch (e) {
      console.warn('[therapeutic-plans/ai-suggest] IA error:', e.message);
    }

    if (!suggestion) return res.status(422).json({ error: 'IA não retornou sugestão válida' });

    // Garantir IDs nos arrays
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (Array.isArray(suggestion.needs)) suggestion.needs = suggestion.needs.map(n => ({ ...n, id: uid() }));
    if (Array.isArray(suggestion.goals)) suggestion.goals = suggestion.goals.map(g => ({ ...g, id: uid() }));
    if (Array.isArray(suggestion.phases)) suggestion.phases = suggestion.phases.map(p => ({ ...p, id: uid() }));

    res.json({
      suggestion,
      // O cliente usa somente o tipo para marcar as origens que realmente
      // participaram do rascunho; não devolve conteúdo clínico duplicado.
      sources_used: records.map(record => ({ record_type: record.record_type })),
    });
  } catch (err) {
    console.error('[therapeutic-plans/ai-suggest]', err);
    res.status(500).json({ error: 'Erro ao gerar sugestão: ' + err.message });
  }
});

module.exports = router;
