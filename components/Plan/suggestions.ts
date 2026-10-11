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
  BARRIER_TYPES, FOCUS_AREAS, STRATEGY_LABEL, STRATEGY_TYPES, newBarrier, newIndicator, newObjective, newStrategy, newTask, todayISO, uid,
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

/**
 * Converte a proposta estruturada da IA em um rascunho editável do plano.
 * Não cria revisões nem declara resultados/alta/consentimento que não estejam
 * explícitos nas fontes. O rascunho só é persistido quando a profissional salva.
 */
export function buildPlanDraftFromAI(v2: PlanV2, raw: Record<string, any>, sourceOrigins: string[]): PlanV2 {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const list = (value: unknown): Record<string, any>[] => Array.isArray(value)
    ? value.filter((item): item is Record<string, any> => !!item && typeof item === 'object') : [];
  const allowed = (value: unknown, options: { value: string }[]) => {
    const candidate = text(value);
    return options.some(option => option.value === candidate) ? candidate : '';
  };
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const append = (current: string, incoming: string) => {
    if (!incoming || current.includes(incoming)) return current;
    return current ? `${current}\n\n${incoming}` : incoming;
  };

  const inputGoals = list(raw.goals);
  const objectives = [...v2.objectives];
  // Os índices enviados pela IA se referem à ordem de `goals`, não aos
  // objetivos que já estavam no plano antes da geração.
  const goalIdByIndex: string[] = [];
  inputGoals.forEach((goal, index) => {
    const description = text(goal.description);
    if (!description) return;
    const existingIndex = objectives.findIndex(objective => sameText(objective.description, description));
    if (existingIndex >= 0) {
      goalIdByIndex[index] = objectives[existingIndex].id;
      return;
    }
    const objective = newObjective(description, {
      area: allowed(goal.area, FOCUS_AREAS),
      priority: allowed(goal.priority, [{ value: 'alta' }, { value: 'media' }, { value: 'baixa' }]) as 'alta' | 'media' | 'baixa' | '',
      indicators: text(goal.progress_indicators),
      criterion: text(goal.completion_criterion),
    });
    objectives.push(objective);
    goalIdByIndex[index] = objective.id;
  });
  const objectiveIdAt = (value: unknown) => {
    const index = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(index) && index >= 0 ? goalIdByIndex[index] || '' : '';
  };

  const strategies = [...v2.strategies];
  list(raw.interventions).forEach(item => {
    const rationale = text(item.rationale || item.description || item.name);
    const type = allowed(item.type, STRATEGY_TYPES) || 'outras';
    const typeOther = type === 'outras' ? text(item.type_other || item.name || item.type) : '';
    if (!rationale && !typeOther) return;
    if (strategies.some(strategy => strategy.type === type && sameText(strategy.rationale || strategy.type_other, rationale || typeOther))) return;
    strategies.push(newStrategy({ type, type_other: typeOther, objective_id: objectiveIdAt(item.goal_index), rationale }));
  });

  const tasks = [...v2.tasks];
  list(raw.tasks).forEach(item => {
    const activity = text(item.activity || item.description);
    if (!activity || tasks.some(task => sameText(task.activity, activity))) return;
    tasks.push(newTask({ activity, objective_id: objectiveIdAt(item.objective_index), instructions: text(item.instructions), due: text(item.due) }));
  });

  const indicators = [...v2.indicators];
  list(raw.indicators).forEach(item => {
    const name = text(item.name);
    if (!name || indicators.some(indicator => sameText(indicator.name, name))) return;
    const kind = text(item.kind);
    indicators.push(newIndicator({
      name, kind: kind === 'qualitativo' || kind === 'quantitativo' ? kind : '', objective_id: objectiveIdAt(item.objective_index),
      definition: text(item.definition), method: text(item.method), baseline: text(item.baseline), unit: text(item.unit), source: text(item.source),
    }));
  });

  const barriers = [...v2.barriers];
  list(raw.barriers).forEach(item => {
    const context = text(item.context || item.description);
    const type = allowed(item.type, BARRIER_TYPES) || 'outras';
    const other = type === 'outras' ? text(item.other || item.type) : '';
    if (!context && !other) return;
    if (barriers.some(barrier => barrier.type === type && sameText(barrier.context || barrier.other, context || other))) return;
    barriers.push(newBarrier({ type, other, context, strategy: text(item.strategy) }));
  });

  const destination = raw.destination && typeof raw.destination === 'object' ? raw.destination : {};
  const currentState = raw.current_state && typeof raw.current_state === 'object' ? raw.current_state : {};
  const discharge = raw.discharge && typeof raw.discharge === 'object' ? raw.discharge : {};
  const participation = raw.participation && typeof raw.participation === 'object' ? raw.participation : {};
  const focusAreas = unique([...v2.overview.focus_areas, ...list(raw.focus_areas).map(item => text(item.value)), ...(Array.isArray(raw.focus_areas) ? raw.focus_areas.map(text) : [])])
    .filter(area => FOCUS_AREAS.some(option => option.value === area));
  const priorities = [...v2.overview.priorities];
  list(raw.priorities).concat(list(raw.needs)).forEach(item => {
    const priority = text(item.text || item.title || item.description);
    if (priority && !priorities.some(existing => sameText(existing.text, priority))) priorities.push({ id: uid(), text: priority });
  });
  const noteParts = [text(raw.summary), text(raw.current_focus), text(raw.notes), text(currentState.main_complaint), text(currentState.main_difficulties), text(raw.approach_specific?.conceptualization)]
    .filter(Boolean);

  return {
    ...v2,
    overview: {
      ...v2.overview,
      general_objective: text(destination.general_objective || raw.summary) || v2.overview.general_objective,
      status: v2.overview.status || 'planejamento',
      start_date: v2.overview.start_date || todayISO(),
      focus_areas: focusAreas,
      focus_other: text(raw.focus_other) || v2.overview.focus_other,
      priorities,
      rationale: append(v2.overview.rationale, text(raw.rationale || destination.progress_criteria)),
    },
    objectives, strategies, tasks, indicators, barriers,
    barriers_notes: append(v2.barriers_notes, text(raw.barriers_notes)),
    discharge: {
      ...v2.discharge,
      criteria: text(discharge.criteria) || v2.discharge.criteria,
      remaining: text(discharge.remaining) || v2.discharge.remaining,
      relapse_prevention: text(discharge.relapse_prevention) || v2.discharge.relapse_prevention,
      continuity: text(discharge.continuity) || v2.discharge.continuity,
      referrals: text(discharge.referrals) || v2.discharge.referrals,
      // "achieved" só é aceito quando existe dado explícito da fonte.
      achieved: text(discharge.achieved) || v2.discharge.achieved,
    },
    participation: {
      ...v2.participation,
      discussed: text(participation.discussed) || v2.participation.discussed,
      preferences: text(participation.preferences) || v2.participation.preferences,
      agreements: text(participation.agreements) || v2.participation.agreements,
      divergences: text(participation.divergences) || v2.participation.divergences,
      perceived_barriers: text(participation.perceived_barriers) || v2.participation.perceived_barriers,
      adjustments: text(participation.adjustments) || v2.participation.adjustments,
    },
    notes: noteParts.reduce(append, v2.notes),
    origins: unique([...v2.origins, ...sourceOrigins]),
    marks: { ...v2.marks, reviews: v2.reviews.length ? v2.marks.reviews : 'nao_avaliado' },
  };
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
