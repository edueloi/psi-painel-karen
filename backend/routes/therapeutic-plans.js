const { authMiddleware } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const db = require('../db');

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
      let extra = '';
      if (r.ai_organized_content) {
        try {
          const obj = JSON.parse(r.ai_organized_content);
          extra = Object.values(obj).filter(v => typeof v === 'string').slice(0, 3).join(' | ');
        } catch {}
      }
      return `[${r.record_type} - ${r.title} - ${r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}]\n${r.content_preview || extra}`;
    }).join('\n\n');

    const prompt = `Você é um assistente clínico especializado em psicologia. Com base nas informações do paciente abaixo, gere um rascunho estruturado de Plano Terapêutico usando a abordagem ${approach}.

REGISTROS DO PACIENTE:
${sourceSummary || 'Sem registros disponíveis ainda.'}

Responda APENAS com JSON válido, sem markdown, sem explicações, no seguinte formato:
{
  "summary": "Resumo clínico em 2-3 frases do momento atual",
  "current_focus": "Foco terapêutico principal em 1 frase",
  "priority_level": "alta",
  "current_state": {
    "main_complaint": "...",
    "main_difficulties": "...",
    "symptoms": "...",
    "functional_impairment": "...",
    "emotional_patterns": "...",
    "cognitive_patterns": "...",
    "behavioral_patterns": "...",
    "risks": "...",
    "maintenance_factors": "...",
    "existing_resources": "...",
    "protection_factors": "...",
    "patient_perception": "...",
    "clinical_perception": "..."
  },
  "destination": {
    "general_objective": "...",
    "patient_changes": "...",
    "clinical_changes": "...",
    "expected_results": "...",
    "functional_improvement": "...",
    "progress_criteria": "..."
  },
  "needs": [
    { "title": "...", "description": "...", "priority": "alta", "urgency": "normal", "functional_impact": "...", "status": "nao_iniciado", "source": "avaliacao" }
  ],
  "goals": [
    { "description": "...", "timeframe": "curto", "priority": "alta", "status": "nao_iniciado", "progress_indicators": "...", "completion_criterion": "...", "progress_note": "" }
  ],
  "phases": [
    { "title": "Acolhimento e Avaliação", "description": "...", "goals": "...", "status": "atual", "order": 1 },
    { "title": "Intervenção Principal", "description": "...", "goals": "...", "status": "nao_iniciada", "order": 2 },
    { "title": "Consolidação e Alta", "description": "...", "goals": "...", "status": "nao_iniciada", "order": 3 }
  ],
  "approach_specific": {
    "conceptualization": "...",
    "main_focus": "...",
    "precipitants": "...",
    "predisposing": "...",
    "maintaining": "...",
    "protective": "...",
    "behavioral_goals": "...",
    "cognitive_goals": "...",
    "emotional_goals": "..."
  }
}`;

    let suggestion = null;
    try {
      const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
        body: JSON.stringify({ prompt, max_tokens: 2500 })
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

    res.json({ suggestion });
  } catch (err) {
    console.error('[therapeutic-plans/ai-suggest]', err);
    res.status(500).json({ error: 'Erro ao gerar sugestão: ' + err.message });
  }
});

module.exports = router;
