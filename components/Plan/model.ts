/**
 * Plano Terapêutico — modelo de dados (v2), migração do formato legado e utilitários.
 *
 * PERSISTÊNCIA: o plano continua sendo um registro `medical_records` (record_type = 'Plano') e o JSON
 * inteiro continua indo em `ai_organized_content` (feito por pages/Records.tsx). O formato v2 vive em
 * `plan.v2`; os campos legados (summary, goals, needs, interventions...) permanecem intactos no mesmo
 * objeto, então nada é perdido e versões antigas do app seguem lendo o registro.
 * `plan.summary` é espelhado com o objetivo geral (Records usa esse campo em `content`/`draft_content`).
 * Versões (snapshots) ficam em `plan.v2.versions`.
 */

/* ───────────── Legado (mantido para compatibilidade) ───────────── */
export interface TheraNeed {
  id: string; title: string; description: string; source: string;
  priority: 'alta' | 'media' | 'baixa'; urgency: string;
  functional_impact: string;
  status: 'nao_iniciado' | 'em_andamento' | 'avancando' | 'estabilizado' | 'concluido';
}
export interface TheraGoal {
  id: string; description: string; need_id: string;
  timeframe: 'curto' | 'medio' | 'longo';
  progress_indicators: string; completion_criterion: string;
  priority: 'alta' | 'media' | 'baixa';
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pausado';
  progress_note: string;
}
export interface TheraPhase {
  id: string; title: string; description: string; goals: string;
  status: 'nao_iniciada' | 'atual' | 'concluida'; order: number;
}
export interface TheraIntervention {
  id: string; name: string; goal_id: string;
  frequency: string; priority: 'alta' | 'media' | 'baixa'; notes: string;
}
export interface TheraReprogramming {
  id: string; date: string; reason: string;
  what_changed: string; justification: string; expected_impact: string;
}

/* ───────────── Novo formato ───────────── */
export type SectionId =
  | 'overview' | 'objectives' | 'strategies' | 'tasks' | 'indicators'
  | 'barriers' | 'reviews' | 'discharge' | 'participation' | 'notes';

export type SectionMark = '' | 'nao_informado' | 'nao_se_aplica' | 'nao_avaliado';
export type Priority = '' | 'alta' | 'media' | 'baixa';

export interface PlanPriority { id: string; text: string }

export interface PlanOverview {
  general_objective: string;
  status: '' | 'planejamento' | 'em_andamento' | 'em_revisao' | 'concluido' | 'interrompido';
  start_date: string;
  review_date: string;
  focus_areas: string[];
  focus_other: string;
  priorities: PlanPriority[];
  rationale: string;
  rationale_sources: string[]; // ids de registros (avaliação clínica) vinculados
}

export type ObjectiveStatus = 'nao_iniciado' | 'em_andamento' | 'alcancado' | 'revisado' | 'suspenso';
export interface PlanObjective {
  id: string;
  description: string;
  area: string;
  priority: Priority;
  indicators: string;
  strategy_ids: string[];
  created_at: string;
  reviewed_at: string;
  status: ObjectiveStatus;
  evidence: string;
  /** Barra de progresso só aparece se a profissional definir critério e valor manualmente. */
  criterion: string;
  progress_value: number | null;
}

export type StrategyStatus = 'planejada' | 'iniciada' | 'em_andamento' | 'concluida' | 'suspensa';
export interface StrategySession { id: string; date: string; record_id?: string; note: string }
export interface PlanStrategy {
  id: string;
  type: string;
  type_other: string;
  objective_id: string;
  rationale: string;
  status: StrategyStatus;
  sessions: StrategySession[];
  results: string;
}

export type TaskStatus = 'proposta' | 'em_andamento' | 'realizada' | 'parcial' | 'nao_realizada' | 'suspensa';
export interface PlanTask {
  id: string;
  activity: string;
  objective_id: string;
  instructions: string;
  date: string;
  due: string;
  status: TaskStatus;
  difficulties: string;
  result: string;
}

export interface IndicatorRecord { id: string; date: string; value: string; note: string }
export interface PlanIndicator {
  id: string;
  name: string;
  kind: '' | 'qualitativo' | 'quantitativo';
  objective_id: string;
  definition: string;
  method: string;
  baseline: string;
  unit: string;
  source: string;
  records: IndicatorRecord[];
}

export interface PlanBarrier {
  id: string;
  type: string;
  other: string;
  context: string;
  strategy: string;
}

export interface PlanReview {
  id: string;
  date: string;
  objective_ids: string[];
  evidence: string;
  strategies_kept: string;
  strategies_modified: string;
  new_objectives: string;
  closed_objectives: string;
  justification: string;
  next_review: string;
  version_id: string;
  author: string;
  created_at: string;
}

export interface PlanDischarge {
  criteria: string;
  achieved: string;
  remaining: string;
  relapse_prevention: string;
  continuity: string;
  referrals: string;
}

export interface PlanParticipation {
  discussed: string;
  preferences: string;
  agreements: string;
  divergences: string;
  perceived_barriers: string;
  adjustments: string;
}

export interface PlanMeta {
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  /** Identifica a sessão de edição que alterou o plano por último (controla a preservação do estado anterior). */
  edit_session?: string;
}

export type PlanSnapshot = Omit<PlanV2, 'versions'>;
export interface PlanVersion {
  id: string;
  number: number;
  created_at: string;
  author: string;
  kind: 'revisao' | 'manual' | 'auto';
  reason: string;
  snapshot: PlanSnapshot;
}

export interface PlanV2 {
  version: 2;
  overview: PlanOverview;
  objectives: PlanObjective[];
  strategies: PlanStrategy[];
  tasks: PlanTask[];
  indicators: PlanIndicator[];
  barriers: PlanBarrier[];
  barriers_notes: string;
  reviews: PlanReview[];
  discharge: PlanDischarge;
  participation: PlanParticipation;
  notes: string;
  origins: string[];
  origin_other: string;
  marks: Partial<Record<SectionId, SectionMark>>;
  dismissed: string[];
  meta: PlanMeta;
  versions: PlanVersion[];
}

export interface TheraPlan {
  approach: string; current_phase: string;
  plan_status: 'ativo' | 'em_revisao' | 'pausado' | 'concluido' | 'arquivado';
  summary: string; priority_level: string; current_focus: string;
  current_state: Record<string, string>;
  destination: Record<string, string>;
  needs: TheraNeed[];
  goals: TheraGoal[];
  phases: TheraPhase[];
  interventions: TheraIntervention[];
  approach_specific: Record<string, string>;
  reprogrammings: TheraReprogramming[];
  v2?: PlanV2;
}

export const EMPTY_PLAN: TheraPlan = {
  approach: 'TCC', current_phase: 'Fase 1', plan_status: 'ativo',
  summary: '', priority_level: 'media', current_focus: '',
  current_state: {}, destination: {},
  needs: [], goals: [], phases: [], interventions: [], approach_specific: {}, reprogrammings: [],
};

/* ───────────── Constantes de domínio ───────────── */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export type Opt = { value: string; label: string };

export const SECTION_MARK_OPTIONS: Opt[] = [
  { value: '', label: 'Preenchimento normal' },
  { value: 'nao_informado', label: 'Não informado' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
  { value: 'nao_avaliado', label: 'Ainda não avaliado' },
];
export const MARK_LABEL: Record<string, string> = {
  nao_informado: 'Não informado', nao_se_aplica: 'Não se aplica', nao_avaliado: 'Ainda não avaliado',
};

export const PLAN_STATUS_OPTIONS: Opt[] = [
  { value: 'planejamento', label: 'Em planejamento' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'interrompido', label: 'Interrompido' },
];
export const FOCUS_AREAS: Opt[] = [
  { value: 'ansiedade', label: 'Ansiedade' },
  { value: 'autoestima', label: 'Autoestima' },
  { value: 'regulacao_emocional', label: 'Regulação emocional' },
  { value: 'autoconhecimento', label: 'Autoconhecimento' },
  { value: 'relacionamentos', label: 'Relacionamentos' },
  { value: 'trabalho_estudos', label: 'Trabalho/estudos' },
  { value: 'habitos_rotina', label: 'Hábitos e rotina' },
  { value: 'tomada_decisoes', label: 'Tomada de decisões' },
  { value: 'outro', label: 'Outro — especificar' },
];
export const AREA_LABEL: Record<string, string> = Object.fromEntries(FOCUS_AREAS.map(o => [o.value, o.label]));

export const PRIORITY_OPTIONS: Opt[] = [
  { value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' },
];
export const OBJECTIVE_STATUS: Opt[] = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'alcancado', label: 'Alcançado' },
  { value: 'revisado', label: 'Revisado' },
  { value: 'suspenso', label: 'Suspenso' },
];
export const SUGGESTED_OBJECTIVES: Opt[] = [
  { value: 'Desenvolver regulação emocional', label: 'Regulação emocional' },
  { value: 'Reduzir comportamentos de evitação', label: 'Reduzir evitação' },
  { value: 'Identificar e questionar pensamentos automáticos', label: 'Pensamentos automáticos' },
  { value: 'Ampliar estratégias de enfrentamento', label: 'Enfrentamento' },
  { value: 'Desenvolver comunicação assertiva', label: 'Comunicação assertiva' },
  { value: 'Desenvolver habilidades interpessoais', label: 'Habilidades interpessoais' },
  { value: 'Reduzir autocrítica', label: 'Autocrítica' },
];
export const STRATEGY_TYPES: Opt[] = [
  { value: 'psicoeducacao', label: 'Psicoeducação' },
  { value: 'automonitoramento', label: 'Automonitoramento' },
  { value: 'registro_pensamentos', label: 'Registro de pensamentos' },
  { value: 'reestruturacao_cognitiva', label: 'Reestruturação cognitiva' },
  { value: 'experimentos_comportamentais', label: 'Experimentos comportamentais' },
  { value: 'exposicao_gradual', label: 'Exposição gradual' },
  { value: 'treino_habilidades', label: 'Treino de habilidades' },
  { value: 'resolucao_problemas', label: 'Resolução de problemas' },
  { value: 'regulacao_emocional', label: 'Regulação emocional' },
  { value: 'esquemas', label: 'Trabalho com esquemas' },
  { value: 'outras', label: 'Outra — especificar' },
];
export const STRATEGY_LABEL: Record<string, string> = Object.fromEntries(STRATEGY_TYPES.map(o => [o.value, o.label]));
export const STRATEGY_STATUS: Opt[] = [
  { value: 'planejada', label: 'Planejada' }, { value: 'iniciada', label: 'Iniciada' },
  { value: 'em_andamento', label: 'Em andamento' }, { value: 'concluida', label: 'Concluída' },
  { value: 'suspensa', label: 'Suspensa' },
];
export const TASK_STATUS: Opt[] = [
  { value: 'proposta', label: 'Proposta' }, { value: 'em_andamento', label: 'Em andamento' },
  { value: 'realizada', label: 'Realizada' }, { value: 'parcial', label: 'Parcialmente realizada' },
  { value: 'nao_realizada', label: 'Não realizada' }, { value: 'suspensa', label: 'Suspensa' },
];
export const BARRIER_TYPES: Opt[] = [
  { value: 'adesao', label: 'Adesão' },
  { value: 'rotina', label: 'Rotina' },
  { value: 'financeiras_logisticas', label: 'Financeiras ou logísticas' },
  { value: 'sintomas_persistentes', label: 'Sintomas persistentes' },
  { value: 'compreensao', label: 'Compreensão das propostas' },
  { value: 'estressores', label: 'Estressores externos' },
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'outras', label: 'Outras — especificar' },
];
export const BARRIER_LABEL: Record<string, string> = Object.fromEntries(BARRIER_TYPES.map(o => [o.value, o.label]));
export const ORIGIN_OPTIONS: Opt[] = [
  { value: 'anamnese', label: 'Anamnese' },
  { value: 'avaliacao', label: 'Avaliação clínica' },
  { value: 'sessoes', label: 'Sessões' },
  { value: 'instrumentos', label: 'Instrumentos aplicados' },
  { value: 'documento_externo', label: 'Documento externo' },
  { value: 'outro', label: 'Outro' },
];

export const SECTIONS: ReadonlyArray<{ id: SectionId; n: number; label: string; short: string; hint: string }> = [
  { id: 'overview', n: 1, label: 'Visão geral e objetivos', short: 'Visão geral', hint: 'Objetivo geral, situação do plano, áreas de foco e prioridades.' },
  { id: 'objectives', n: 2, label: 'Objetivos específicos', short: 'Objetivos', hint: 'Objetivos observáveis, com prioridade, indicadores e evidências.' },
  { id: 'strategies', n: 3, label: 'Estratégias e intervenções', short: 'Estratégias', hint: 'Intervenções planejadas e aplicadas, com justificativa clínica.' },
  { id: 'tasks', n: 4, label: 'Tarefas e exercícios', short: 'Tarefas', hint: 'Atividades propostas entre as sessões e o que foi aprendido com elas.' },
  { id: 'indicators', n: 5, label: 'Indicadores de progresso', short: 'Indicadores', hint: 'Como o progresso é observado ou medido; sem percentual automático.' },
  { id: 'barriers', n: 6, label: 'Dificuldades e barreiras', short: 'Barreiras', hint: 'Fatores contextuais que afetam o processo, sem julgamento.' },
  { id: 'reviews', n: 7, label: 'Revisões e ajustes', short: 'Revisões', hint: 'Cada revisão registrada preserva uma versão do plano.' },
  { id: 'discharge', n: 8, label: 'Previsão de alta', short: 'Alta', hint: 'Critérios e planejamento de encerramento. Nunca é definida automaticamente.' },
  { id: 'participation', n: 9, label: 'Consentimento e colaboração', short: 'Participação', hint: 'Participação do paciente na construção do plano.' },
  { id: 'notes', n: 10, label: 'Observações adicionais', short: 'Observações', hint: 'Qualquer informação complementar relevante.' },
];

/* ───────────── Normalização / migração ───────────── */
const emptyOverview = (): PlanOverview => ({
  general_objective: '', status: '', start_date: '', review_date: '', focus_areas: [], focus_other: '',
  priorities: [], rationale: '', rationale_sources: [],
});
const emptyDischarge = (): PlanDischarge => ({ criteria: '', achieved: '', remaining: '', relapse_prevention: '', continuity: '', referrals: '' });
const emptyParticipation = (): PlanParticipation => ({ discussed: '', preferences: '', agreements: '', divergences: '', perceived_barriers: '', adjustments: '' });

export const newObjective = (description = '', extra: Partial<PlanObjective> = {}): PlanObjective => ({
  id: uid(), description, area: '', priority: '', indicators: '', strategy_ids: [],
  created_at: todayISO(), reviewed_at: '', status: 'nao_iniciado', evidence: '', criterion: '', progress_value: null, ...extra,
});
export const newStrategy = (extra: Partial<PlanStrategy> = {}): PlanStrategy => ({
  id: uid(), type: '', type_other: '', objective_id: '', rationale: '', status: 'planejada', sessions: [], results: '', ...extra,
});
export const newTask = (extra: Partial<PlanTask> = {}): PlanTask => ({
  id: uid(), activity: '', objective_id: '', instructions: '', date: todayISO(), due: '', status: 'proposta', difficulties: '', result: '', ...extra,
});
export const newIndicator = (extra: Partial<PlanIndicator> = {}): PlanIndicator => ({
  id: uid(), name: '', kind: '', objective_id: '', definition: '', method: '', baseline: '', unit: '', source: '', records: [], ...extra,
});
export const newBarrier = (extra: Partial<PlanBarrier> = {}): PlanBarrier => ({
  id: uid(), type: '', other: '', context: '', strategy: '', ...extra,
});

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Completa campos ausentes de um v2 (parcial ou de versões anteriores). */
export function normalizeV2(raw: Partial<PlanV2> | undefined, author = ''): PlanV2 {
  return syncLinks(normalizeRaw(raw, author));
}

/** `strategy.objective_id` é a fonte da verdade; `objective.strategy_ids` é espelho. */
export function syncLinks(v2: PlanV2): PlanV2 {
  return {
    ...v2,
    objectives: v2.objectives.map(o => {
      const ids = v2.strategies.filter(s => s.objective_id === o.id).map(s => s.id);
      const same = ids.length === o.strategy_ids.length && ids.every((id, i) => id === o.strategy_ids[i]);
      return same ? o : { ...o, strategy_ids: ids };
    }),
  };
}

function normalizeRaw(raw: Partial<PlanV2> | undefined, author: string): PlanV2 {
  const r = (raw || {}) as Partial<PlanV2>;
  const now = new Date().toISOString();
  return {
    version: 2,
    overview: { ...emptyOverview(), ...(r.overview || {}), priorities: asArr<PlanPriority>(r.overview?.priorities), focus_areas: asArr<string>(r.overview?.focus_areas), rationale_sources: asArr<string>(r.overview?.rationale_sources) },
    objectives: asArr<PlanObjective>(r.objectives).map(o => ({ ...newObjective(), ...o, strategy_ids: asArr<string>(o.strategy_ids) })),
    strategies: asArr<PlanStrategy>(r.strategies).map(s => ({ ...newStrategy(), ...s, sessions: asArr<StrategySession>(s.sessions) })),
    tasks: asArr<PlanTask>(r.tasks).map(t => ({ ...newTask(), ...t })),
    indicators: asArr<PlanIndicator>(r.indicators).map(i => ({ ...newIndicator(), ...i, records: asArr<IndicatorRecord>(i.records) })),
    barriers: asArr<PlanBarrier>(r.barriers).map(b => ({ ...newBarrier(), ...b })),
    barriers_notes: str(r.barriers_notes),
    reviews: asArr<PlanReview>(r.reviews),
    discharge: { ...emptyDischarge(), ...(r.discharge || {}) },
    participation: { ...emptyParticipation(), ...(r.participation || {}) },
    notes: str(r.notes),
    origins: asArr<string>(r.origins),
    origin_other: str(r.origin_other),
    marks: { ...(r.marks || {}) },
    dismissed: asArr<string>(r.dismissed),
    meta: { created_at: now, created_by: author, updated_at: '', updated_by: '', ...(r.meta || {}) },
    versions: asArr<PlanVersion>(r.versions),
  };
}

const legacyStatusToObjective = (s: string): ObjectiveStatus =>
  s === 'concluido' ? 'alcancado' : s === 'pausado' ? 'suspenso' : s === 'em_andamento' ? 'em_andamento' : 'nao_iniciado';
const legacyPlanStatus = (s: string): PlanOverview['status'] =>
  s === 'em_revisao' ? 'em_revisao' : s === 'concluido' ? 'concluido' : s === 'pausado' || s === 'arquivado' ? 'interrompido' : s === 'ativo' ? 'em_andamento' : '';

const LEGACY_LABELS: Record<string, string> = {
  main_complaint: 'Queixa principal', main_difficulties: 'Principais dificuldades', symptoms: 'Sintomas', functional_impairment: 'Prejuízos funcionais',
  emotional_patterns: 'Padrões emocionais', cognitive_patterns: 'Padrões cognitivos', behavioral_patterns: 'Padrões comportamentais', risks: 'Riscos',
  maintenance_factors: 'Fatores de manutenção', existing_resources: 'Recursos existentes', protection_factors: 'Fatores de proteção',
  functioning_level: 'Nível de funcionamento', patient_perception: 'Percepção do paciente', clinical_perception: 'Percepção clínica',
  patient_changes: 'Mudanças desejadas pelo paciente', clinical_changes: 'Mudanças desejadas clinicamente', expected_results: 'Resultados esperados',
  functional_improvement: 'Melhora funcional esperada', progress_criteria: 'Critérios de progresso',
};

/** Converte o plano no formato antigo para o v2 sem descartar nada (o legado segue no objeto). */
export function migrateLegacy(plan: TheraPlan, author = ''): PlanV2 {
  const base = normalizeV2(undefined, author);
  const goals = asArr<TheraGoal>(plan.goals);
  const needs = asArr<TheraNeed>(plan.needs);
  const ints = asArr<TheraIntervention>(plan.interventions);
  const reps = asArr<TheraReprogramming>(plan.reprogrammings);

  base.overview.general_objective = str(plan.destination?.general_objective) || str(plan.summary);
  base.overview.status = legacyPlanStatus(plan.plan_status);
  base.overview.rationale = str(plan.current_focus) ? `Foco terapêutico (plano anterior): ${plan.current_focus}` : '';
  const order = ['alta', 'media', 'baixa'];
  base.overview.priorities = needs.filter(n => n.title)
    .sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
    .map(n => ({ id: n.id || uid(), text: n.title }));

  base.objectives = goals.map(g => newObjective(str(g.description), {
    id: g.id || uid(), priority: (g.priority as Priority) || '', indicators: str(g.progress_indicators),
    status: legacyStatusToObjective(g.status), evidence: str(g.progress_note),
    // O critério antigo vira texto; o valor de progresso fica vazio (nenhum % é inventado).
    criterion: str(g.completion_criterion),
  }));
  base.strategies = ints.map(i => {
    const match = STRATEGY_TYPES.find(t => t.label.toLowerCase() === str(i.name).toLowerCase());
    return newStrategy({
      id: i.id || uid(), type: match ? match.value : 'outras', type_other: match ? '' : str(i.name),
      objective_id: goals.some(g => g.id === i.goal_id) ? i.goal_id : '',
      rationale: [i.frequency && `Frequência: ${i.frequency}`, i.notes].filter(Boolean).join(' — '),
    });
  });
  base.reviews = reps.map(r => ({
    id: r.id || uid(), date: str(r.date), objective_ids: [], evidence: str(r.reason), strategies_kept: '',
    strategies_modified: str(r.what_changed), new_objectives: '', closed_objectives: '', justification: str(r.justification),
    next_review: '', version_id: '', author: '', created_at: str(r.date),
  }));

  const extra: string[] = [];
  const dump = (title: string, obj: Record<string, string> | undefined, labels: Record<string, string>) => {
    const lines = Object.entries(obj || {}).filter(([, v]) => str(v).trim()).map(([k, v]) => `- ${labels[k] || k}: ${v}`);
    if (lines.length) extra.push(`${title}\n${lines.join('\n')}`);
  };
  if (str(plan.summary) && plan.summary !== base.overview.general_objective) extra.push(`Resumo do momento atual: ${plan.summary}`);
  dump('Estado atual do caso', plan.current_state, LEGACY_LABELS);
  const dest = { ...(plan.destination || {}) }; delete dest.general_objective;
  dump('Destino terapêutico', dest, LEGACY_LABELS);
  dump(`Campos específicos da abordagem (${plan.approach || '-'})`, plan.approach_specific, {});
  const phases = asArr<TheraPhase>(plan.phases).filter(p => p.title);
  if (phases.length) extra.push(`Fases do processo\n${phases.map(p => `- ${p.title}${p.description ? `: ${p.description}` : ''}`).join('\n')}`);
  const needsRest = needs.filter(n => n.description || n.functional_impact);
  if (needsRest.length) extra.push(`Necessidades identificadas\n${needsRest.map(n => `- ${n.title}: ${[n.description, n.functional_impact].filter(Boolean).join(' | ')}`).join('\n')}`);
  if (extra.length) base.notes = `[Conteúdo migrado do plano no formato anterior]\n\n${extra.join('\n\n')}`;
  return syncLinks(base);
}

/** Garante v2 no plano (migrando o legado quando necessário). */
export function ensurePlanV2(plan: TheraPlan, author = ''): TheraPlan {
  const v2 = plan.v2 ? normalizeV2(plan.v2, author) : migrateLegacy(plan, author);
  return { ...plan, v2 };
}

export function snapshotOf(v2: PlanV2): PlanSnapshot {
  const { versions: _versions, ...rest } = v2;
  return JSON.parse(JSON.stringify(rest)) as PlanSnapshot;
}

export function addVersion(v2: PlanV2, kind: PlanVersion['kind'], reason: string, author: string, snap?: PlanSnapshot, at?: string): { v2: PlanV2; version: PlanVersion } {
  const version: PlanVersion = {
    id: uid(), number: v2.versions.reduce((m, v) => Math.max(m, v.number), 0) + 1,
    created_at: at || new Date().toISOString(), author, kind, reason, snapshot: snap || snapshotOf(v2),
  };
  return { v2: { ...v2, versions: [...v2.versions, version] }, version };
}

/* ───────────── Progresso por seção ───────────── */
export type SectionStatus = 'preenchido' | 'andamento' | 'nao_iniciado';
export interface SectionProgress { done: number; total: number; status: SectionStatus; mark: SectionMark }

const filled = (s: unknown) => str(s).trim().length > 0;

export function sectionChecklist(v2: PlanV2, id: SectionId): boolean[] {
  switch (id) {
    case 'overview': {
      const o = v2.overview;
      return [filled(o.general_objective), !!o.status, filled(o.start_date), filled(o.review_date),
        o.focus_areas.length > 0 && (!o.focus_areas.includes('outro') || filled(o.focus_other)), o.priorities.some(p => filled(p.text)), filled(o.rationale)];
    }
    case 'objectives': {
      const os = v2.objectives;
      return [os.length > 0, os.some(o => filled(o.description)), os.some(o => !!o.area), os.some(o => !!o.priority), os.some(o => filled(o.indicators)), os.some(o => o.strategy_ids.length > 0)];
    }
    case 'strategies': {
      const ss = v2.strategies;
      return [ss.length > 0, ss.some(s => !!s.type), ss.some(s => !!s.objective_id), ss.some(s => filled(s.rationale)), ss.some(s => s.sessions.length > 0 || filled(s.results))];
    }
    case 'tasks': {
      const ts = v2.tasks;
      return [ts.length > 0, ts.some(t => filled(t.activity)), ts.some(t => filled(t.instructions)), ts.some(t => filled(t.result) || t.status === 'realizada' || t.status === 'parcial')];
    }
    case 'indicators': {
      const is = v2.indicators;
      return [is.length > 0, is.some(i => filled(i.name) && !!i.kind), is.some(i => filled(i.definition) && filled(i.method)), is.some(i => filled(i.baseline)), is.some(i => i.records.length > 0)];
    }
    case 'barriers':
      return [v2.barriers.length > 0, v2.barriers.some(b => !!b.type), v2.barriers.some(b => filled(b.context)), v2.barriers.some(b => filled(b.strategy))];
    case 'reviews':
      return [v2.reviews.length > 0, v2.reviews.some(r => filled(r.justification)), v2.reviews.some(r => filled(r.next_review))];
    case 'discharge': {
      const d = v2.discharge;
      return [filled(d.criteria), filled(d.achieved), filled(d.remaining), filled(d.relapse_prevention), filled(d.continuity), filled(d.referrals)];
    }
    case 'participation': {
      const p = v2.participation;
      return [filled(p.discussed), filled(p.preferences), filled(p.agreements), filled(p.divergences), filled(p.perceived_barriers), filled(p.adjustments)];
    }
    case 'notes':
      return [filled(v2.notes)];
  }
}

export function sectionProgress(v2: PlanV2, id: SectionId): SectionProgress {
  const mark = (v2.marks[id] || '') as SectionMark;
  const list = sectionChecklist(v2, id);
  const total = list.length;
  if (mark) return { done: total, total, status: 'preenchido', mark };
  const done = list.filter(Boolean).length;
  return { done, total, status: done === 0 ? 'nao_iniciado' : done === total ? 'preenchido' : 'andamento', mark };
}

export const STATUS_LABEL: Record<SectionStatus, string> = { preenchido: 'Preenchido', andamento: 'Em andamento', nao_iniciado: 'Não iniciado' };

/* ───────────── Comparação entre versões ───────────── */
export interface DiffRow { section: string; path: string; before: string; after: string }

const SECTION_KEY_LABEL: Record<string, string> = {
  overview: 'Visão geral', objectives: 'Objetivos específicos', strategies: 'Estratégias', tasks: 'Tarefas', indicators: 'Indicadores',
  barriers: 'Barreiras', barriers_notes: 'Barreiras', reviews: 'Revisões', discharge: 'Previsão de alta', participation: 'Participação',
  notes: 'Observações', origins: 'Origem das informações', origin_other: 'Origem das informações', marks: 'Marcações de seção',
};

function flatten(value: unknown, prefix: string, out: Map<string, string>) {
  if (value == null) { out.set(prefix, ''); return; }
  if (Array.isArray(value)) {
    if (value.length === 0) { out.set(prefix, ''); return; }
    if (value.every(v => typeof v !== 'object' || v == null)) { out.set(prefix, value.join(', ')); return; }
    value.forEach((v, i) => {
      const key = v && typeof v === 'object' && 'id' in (v as object) ? String((v as { id: string }).id) : String(i);
      flatten(v, `${prefix}[${key}]`, out);
    });
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k, out));
    return;
  }
  out.set(prefix, String(value));
}

export function diffSnapshots(a: PlanSnapshot, b: PlanSnapshot): DiffRow[] {
  const ma = new Map<string, string>(); const mb = new Map<string, string>();
  const strip = (s: PlanSnapshot) => { const { meta: _meta, dismissed: _dismissed, ...rest } = s; return rest; };
  flatten(strip(a), '', ma); flatten(strip(b), '', mb);
  const keys = Array.from(new Set([...ma.keys(), ...mb.keys()]));
  const rows: DiffRow[] = [];
  keys.forEach(k => {
    const before = ma.get(k) ?? ''; const after = mb.get(k) ?? '';
    if (before === after) return;
    const root = k.split(/[.[]/)[0];
    rows.push({ section: SECTION_KEY_LABEL[root] || root, path: k, before, after });
  });
  return rows;
}

export function formatDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
}
