/**
 * Sugestões de atualização do plano a partir de registros de sessão.
 *
 * IMPORTANTE (segurança clínica): nada aqui altera o plano. Cada sugestão carrega uma função `apply`
 * que só é executada quando a profissional clica em Aceitar/Adicionar/Atualizar. O texto é sempre um
 * trecho do próprio registro ou uma proposta genérica marcada como SUGESTÃO — nunca um resultado inventado.
 *
 * PONTO DE INTEGRAÇÃO COM IA: `suggestFromSession()` é uma heurística local (palavras-chave). Para usar a IA
 * (Bia/Aurora) basta gerar `PlanSuggestion[]` por outro caminho e passá-los ao `AIPanel` — já existe
 * `POST /therapeutic-plans/ai-suggest`, cujo retorno é convertido por `suggestionsFromAI()` abaixo.
 * Depois de salvar uma sessão, chame `suggestFromSession(plan, { id, date, text, label })` e
 * entregue o resultado ao `TherapeuticPlanEditor` pela prop `sessionContext`.
 */
import {
  FOCUS_AREAS, STRATEGY_LABEL, newBarrier, newObjective, newStrategy, newTask, uid,
  type PlanV2, type SectionId,
} from './model';

export interface SessionContext { id: string; date: string; text: string; label: string }

export interface PlanSuggestion {
  id: string;
  action: 'add' | 'update';
  section: SectionId;
  title: string;
  identified: string;
  origin: { label: string; recordId?: string; date?: string };
  field: string;
  justification: string;
  current: string;
  proposed: string;
  /** Aplica a sugestão (com o texto possivelmente editado) e devolve o novo plano. */
  apply: (v: PlanV2, text: string) => PlanV2;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Primeiro trecho (sentença) do texto que casa com a expressão. */
function snippet(text: string, re: RegExp): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const hit = sentences.find(s => re.test(norm(s))) || '';
  return hit.length > 240 ? `${hit.slice(0, 237)}...` : hit;
}

const addId = (v: PlanV2, id: string): PlanV2 => ({ ...v, dismissed: [...v.dismissed, id] });

const OBJECTIVE_RULES: Array<{ key: string; re: RegExp; text: string; area: string }> = [
  { key: 'evitacao', re: /evit(a|o|ac|ar|and)/, text: 'Reduzir comportamentos de evitação', area: '' },
  { key: 'pensamentos', re: /pensamentos? automatic|catastrof|crenca/, text: 'Identificar e questionar pensamentos automáticos', area: '' },
  { key: 'regulacao', re: /regulac|raiva|impulsiv|crise de|choro frequente/, text: 'Desenvolver regulação emocional', area: 'regulacao_emocional' },
  { key: 'assertiva', re: /assertiv|dificuldade (de|em) (dizer nao|se posicionar)|nao consegue dizer nao/, text: 'Desenvolver comunicação assertiva', area: 'relacionamentos' },
  { key: 'autocritica', re: /autocritic|se cobra|me cobro|muito exigente consigo/, text: 'Reduzir autocrítica', area: 'autoestima' },
];

const STRATEGY_RULES: Array<{ type: string; re: RegExp }> = [
  { type: 'psicoeducacao', re: /psicoeduca/ },
  { type: 'registro_pensamentos', re: /registro de pensamento|\brpd\b/ },
  { type: 'reestruturacao_cognitiva', re: /reestrutura/ },
  { type: 'exposicao_gradual', re: /exposicao/ },
  { type: 'automonitoramento', re: /automonitor/ },
  { type: 'experimentos_comportamentais', re: /experimento comportamental|experimentos comportamentais/ },
  { type: 'resolucao_problemas', re: /resolucao de problema/ },
  { type: 'treino_habilidades', re: /treino de habilidade|role.?play/ },
];

const AREA_RULES: Array<{ area: string; re: RegExp }> = [
  { area: 'ansiedade', re: /ansiedad|ansios|preocupa/ },
  { area: 'autoestima', re: /autoestima|autoimagem/ },
  { area: 'relacionamentos', re: /relacionament|conjuge|parceir[oa]|conflito familiar/ },
  { area: 'trabalho_estudos', re: /trabalho|chefe|faculdade|estudos/ },
  { area: 'habitos_rotina', re: /\bsono\b|insonia|alimentac|rotina/ },
];

const BARRIER_RULES: Array<{ type: string; re: RegExp }> = [
  { type: 'financeiras_logisticas', re: /financeir|dinheiro|transporte|deslocamento/ },
  { type: 'rotina', re: /sem tempo|rotina corrida|remarc|faltou a sessao/ },
];

const sameText = (a: string, b: string) => norm(a).includes(norm(b)) || norm(b).includes(norm(a));

export function suggestFromSession(v2: PlanV2, ctx: SessionContext): PlanSuggestion[] {
  const text = stripHtml(ctx.text || '');
  if (!text) return [];
  const n = norm(text);
  const origin = { label: ctx.label, recordId: ctx.id, date: ctx.date };
  const out: PlanSuggestion[] = [];
  const push = (s: PlanSuggestion) => { if (!v2.dismissed.includes(s.id) && !out.some(o => o.id === s.id)) out.push(s); };
  const NOTE = 'Sugestão gerada por palavras-chave do registro; confirme se faz sentido clínico antes de aceitar.';

  OBJECTIVE_RULES.forEach(rule => {
    if (!rule.re.test(n)) return;
    if (v2.objectives.some(o => sameText(o.description, rule.text) || sameText(o.description, rule.text.split(' ').slice(-2).join(' ')))) return;
    const id = `obj:${rule.key}:${ctx.id}`;
    push({
      id, action: 'add', section: 'objectives', title: `Novo objetivo: ${rule.text}`,
      identified: snippet(text, rule.re) || 'Tema recorrente no registro da sessão.',
      origin, field: 'Objetivos específicos › descrição', justification: NOTE, current: '(sem objetivo equivalente no plano)', proposed: rule.text,
      apply: (v, t) => addId({ ...v, objectives: [...v.objectives, newObjective(t, { area: rule.area })] }, id),
    });
  });

  STRATEGY_RULES.forEach(rule => {
    if (!rule.re.test(n)) return;
    const label = STRATEGY_LABEL[rule.type];
    const existing = v2.strategies.find(s => s.type === rule.type);
    const id = `str:${rule.type}:${ctx.id}`;
    const sessionNote = `Mencionada no registro "${ctx.label}"`;
    if (existing) {
      if (existing.sessions.some(s => s.record_id === ctx.id)) return;
      push({
        id, action: 'update', section: 'strategies', title: `Vincular sessão à estratégia: ${label}`,
        identified: snippet(text, rule.re) || `${label} mencionada no registro.`, origin, field: 'Estratégias › sessões em que foi aplicada',
        justification: 'A estratégia já existe no plano e é citada neste registro. O vínculo documenta onde ela foi trabalhada; não altera resultados.',
        current: existing.sessions.length ? `${existing.sessions.length} sessão(ões) vinculada(s)` : '(nenhuma sessão vinculada)', proposed: sessionNote,
        apply: (v, t) => addId({ ...v, strategies: v.strategies.map(s => (s.id === existing.id ? { ...s, sessions: [...s.sessions, { id: uid(), date: ctx.date, record_id: ctx.id, note: t }] } : s)) }, id),
      });
    } else {
      push({
        id, action: 'add', section: 'strategies', title: `Nova estratégia: ${label}`,
        identified: snippet(text, rule.re) || `${label} mencionada no registro.`, origin, field: 'Estratégias e intervenções',
        justification: NOTE, current: '(estratégia não registrada no plano)', proposed: sessionNote,
        apply: (v, t) => addId({ ...v, strategies: [...v.strategies, newStrategy({ type: rule.type, status: 'iniciada', sessions: [{ id: uid(), date: ctx.date, record_id: ctx.id, note: t }] })] }, id),
      });
    }
  });

  const missingAreas = AREA_RULES.filter(r => r.re.test(n) && !v2.overview.focus_areas.includes(r.area));
  missingAreas.forEach(rule => {
    const label = FOCUS_AREAS.find(a => a.value === rule.area)?.label || rule.area;
    const id = `area:${rule.area}:${ctx.id}`;
    push({
      id, action: 'update', section: 'overview', title: `Incluir área de foco: ${label}`,
      identified: snippet(text, rule.re) || `Tema “${label}” aparece no registro.`, origin, field: 'Visão geral › áreas de foco',
      justification: NOTE, current: v2.overview.focus_areas.map(a => FOCUS_AREAS.find(x => x.value === a)?.label || a).join(', ') || '(nenhuma área marcada)', proposed: label,
      apply: v => addId({ ...v, overview: { ...v.overview, focus_areas: [...v.overview.focus_areas, rule.area] } }, id),
    });
  });

  BARRIER_RULES.forEach(rule => {
    if (!rule.re.test(n)) return;
    if (v2.barriers.some(b => b.type === rule.type)) return;
    const id = `bar:${rule.type}:${ctx.id}`;
    const sn = snippet(text, rule.re);
    push({
      id, action: 'add', section: 'barriers', title: 'Nova barreira a considerar',
      identified: sn || 'Possível fator contextual no registro.', origin, field: 'Dificuldades e barreiras › fatores contextuais',
      justification: 'Trecho do registro que pode indicar um fator contextual. Descreva sem julgamento ao confirmar.', current: '(sem barreira deste tipo no plano)', proposed: sn,
      apply: (v, t) => addId({ ...v, barriers: [...v.barriers, newBarrier({ type: rule.type, context: t })] }, id),
    });
  });

  if (/tarefa de casa|tarefa para casa|combinamos (de )?registrar|exercicio para (casa|a semana)/.test(n)) {
    const sn = snippet(text, /tarefa|combinamos|exercicio/);
    const id = `task:${ctx.id}`;
    if (sn && !v2.tasks.some(t => sameText(t.activity, sn))) {
      push({
        id, action: 'add', section: 'tasks', title: 'Registrar tarefa combinada na sessão',
        identified: sn, origin, field: 'Tarefas e exercícios › atividade',
        justification: 'O registro menciona uma tarefa entre sessões. Ajuste o texto antes de adicionar.', current: '(tarefa não registrada no plano)', proposed: sn,
        apply: (v, t) => addId({ ...v, tasks: [...v.tasks, newTask({ activity: t, date: ctx.date })] }, id),
      });
    }
  }
  return out;
}

/** Converte a resposta de `POST /therapeutic-plans/ai-suggest` (formato legado) em sugestões — sem aplicar nada. */
export function suggestionsFromAI(v2: PlanV2, s: Record<string, any>): PlanSuggestion[] {
  const out: PlanSuggestion[] = [];
  const origin = { label: 'Assistente IA (registros do prontuário)' };
  const objective = String(s?.destination?.general_objective || s?.summary || '').trim();
  if (objective && objective !== v2.overview.general_objective.trim()) {
    const id = `ai:overview:${objective.slice(0, 24)}`;
    if (!v2.dismissed.includes(id)) out.push({
      id, action: v2.overview.general_objective.trim() ? 'update' : 'add', section: 'overview', title: 'Objetivo geral sugerido pela IA',
      identified: 'Síntese gerada a partir dos registros do paciente.', origin, field: 'Visão geral › objetivo geral',
      justification: 'Texto gerado por IA: é uma hipótese de trabalho, não uma conclusão clínica. Revise antes de aceitar.',
      current: v2.overview.general_objective || '(vazio)', proposed: objective,
      apply: (v, t) => addId({ ...v, overview: { ...v.overview, general_objective: t } }, id),
    });
  }
  (Array.isArray(s?.goals) ? s.goals : []).forEach((g: any) => {
    const d = String(g?.description || '').trim();
    if (!d || v2.objectives.some(o => sameText(o.description, d))) return;
    const id = `ai:goal:${d.slice(0, 32)}`;
    if (v2.dismissed.includes(id)) return;
    out.push({
      id, action: 'add', section: 'objectives', title: 'Objetivo sugerido pela IA',
      identified: String(g?.progress_indicators || 'Gerado a partir dos registros.'), origin, field: 'Objetivos específicos › descrição',
      justification: 'Texto gerado por IA: revise e ajuste antes de aceitar. Nenhum critério de progresso é adotado automaticamente.',
      current: '(sem objetivo equivalente)', proposed: d,
      apply: (v, t) => addId({ ...v, objectives: [...v.objectives, newObjective(t, { priority: ['alta', 'media', 'baixa'].includes(g?.priority) ? g.priority : '', indicators: String(g?.progress_indicators || '') })] }, id),
    });
  });
  return out;
}

/* ───────────── Vínculo sessão ↔ plano (helper para o registro de sessão) ───────────── */

export interface PlanLinkTarget { kind: 'objective' | 'strategy'; id: string; label: string }

/** Lista objetivos e estratégias do plano para o seletor "vincular intervenção ao plano" na sessão. */
export function getPlanLinkTargets(plan: { v2?: PlanV2 } | undefined | null): PlanLinkTarget[] {
  const v2 = plan?.v2;
  if (!v2) return [];
  return [
    ...v2.objectives.map(o => ({ kind: 'objective' as const, id: o.id, label: `Objetivo: ${(o.description || 'sem descrição').slice(0, 70)}` })),
    ...v2.strategies.map(s => ({ kind: 'strategy' as const, id: s.id, label: `Estratégia: ${s.type === 'outras' ? s.type_other || 'outra' : STRATEGY_LABEL[s.type] || 'sem tipo'}` })),
  ];
}

/**
 * Vincula uma intervenção registrada na sessão a um objetivo ou estratégia do plano.
 * Devolve novo `plan` (ou o mesmo, se o alvo não existir). Deve ser seguido de salvar o plano
 * (PUT /medical-records/:id do registro 'Plano', campo ai_organized_content) e só deve ser chamado após ação explícita.
 */
export function linkSessionInterventionToPlan<P extends { v2?: PlanV2 }>(
  plan: P, link: { target: PlanLinkTarget; recordId: string; date: string; note?: string },
): P {
  const v2 = plan.v2;
  if (!v2) return plan;
  const note = link.note || 'Intervenção registrada na sessão';
  if (link.target.kind === 'strategy') {
    if (!v2.strategies.some(s => s.id === link.target.id)) return plan;
    return { ...plan, v2: { ...v2, strategies: v2.strategies.map(s => (s.id !== link.target.id || s.sessions.some(x => x.record_id === link.recordId) ? s : { ...s, sessions: [...s.sessions, { id: uid(), date: link.date, record_id: link.recordId, note }] })) } };
  }
  if (!v2.objectives.some(o => o.id === link.target.id)) return plan;
  return {
    ...plan, v2: { ...v2, objectives: v2.objectives.map(o => (o.id !== link.target.id ? o : { ...o, evidence: [o.evidence, `${link.date}: ${note} (registro ${link.recordId})`].filter(Boolean).join('\n') })) },
  };
}
