import React, { useState, useCallback } from 'react';
import {
  Brain, Target, Activity, Map, Zap, RefreshCw, Sparkles,
  Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle,
  CheckCircle2, Circle, Clock, ArrowRight, Loader2,
  BookOpen, Heart, Shield, TrendingUp, Edit3, RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

/* ── Types ── */
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
export interface TheraPlan {
  approach: string; current_phase: string;
  plan_status: 'ativo' | 'em_revisao' | 'pausado' | 'concluido' | 'arquivado';
  summary: string; priority_level: string; current_focus: string;
  current_state: {
    main_complaint: string; main_difficulties: string; symptoms: string;
    functional_impairment: string; emotional_patterns: string; cognitive_patterns: string;
    behavioral_patterns: string; risks: string; maintenance_factors: string;
    existing_resources: string; protection_factors: string;
    functioning_level: string; patient_perception: string; clinical_perception: string;
  };
  destination: {
    general_objective: string; patient_changes: string; clinical_changes: string;
    expected_results: string; functional_improvement: string; progress_criteria: string;
  };
  needs: TheraNeed[];
  goals: TheraGoal[];
  phases: TheraPhase[];
  interventions: TheraIntervention[];
  approach_specific: Record<string, string>;
  reprogrammings: TheraReprogramming[];
}

export const EMPTY_PLAN: TheraPlan = {
  approach: 'TCC', current_phase: 'Fase 1', plan_status: 'ativo',
  summary: '', priority_level: 'media', current_focus: '',
  current_state: {
    main_complaint: '', main_difficulties: '', symptoms: '',
    functional_impairment: '', emotional_patterns: '', cognitive_patterns: '',
    behavioral_patterns: '', risks: '', maintenance_factors: '',
    existing_resources: '', protection_factors: '',
    functioning_level: '', patient_perception: '', clinical_perception: '',
  },
  destination: {
    general_objective: '', patient_changes: '', clinical_changes: '',
    expected_results: '', functional_improvement: '', progress_criteria: '',
  },
  needs: [], goals: [], phases: [], interventions: [], approach_specific: {}, reprogrammings: [],
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── Helpers ── */
const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-rose-50 text-rose-700 border-rose-200',
  media: 'bg-amber-50 text-amber-700 border-amber-200',
  baixa: 'bg-slate-50 text-slate-500 border-slate-200',
};
const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  avancando: 'Avançando', estabilizado: 'Estabilizado', concluido: 'Concluído', pausado: 'Pausado',
};
const STATUS_COLORS: Record<string, string> = {
  nao_iniciado: 'bg-slate-50 text-slate-500 border-slate-200',
  em_andamento: 'bg-blue-50 text-blue-700 border-blue-200',
  avancando: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  estabilizado: 'bg-purple-50 text-purple-700 border-purple-200',
  concluido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausado: 'bg-gray-50 text-gray-500 border-gray-200',
};
const APPROACH_SPECIFIC_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  TCC: [
    { key: 'conceptualization', label: 'Conceitualização Cognitiva' },
    { key: 'main_focus', label: 'Foco Principal de Intervenção' },
    { key: 'secondary_focus', label: 'Foco Secundário' },
    { key: 'automatic_thoughts', label: 'Pensamentos Automáticos Prioritários' },
    { key: 'core_beliefs', label: 'Crenças Centrais e Intermediárias' },
    { key: 'precipitants', label: 'Fatores Precipitantes' },
    { key: 'predisposing', label: 'Fatores Predisponentes' },
    { key: 'maintaining', label: 'Fatores Mantenedores' },
    { key: 'protective', label: 'Fatores Protetivos' },
    { key: 'behavioral_goals', label: 'Metas Comportamentais' },
    { key: 'cognitive_goals', label: 'Metas Cognitivas' },
    { key: 'emotional_goals', label: 'Metas Emocionais' },
    { key: 'behavioral_experiments', label: 'Experimentos Comportamentais Previstos' },
    { key: 'relapse_prevention', label: 'Prevenção de Recaída' },
  ],
  'Terapia do Esquema': [
    { key: 'priority_schemas', label: 'Esquemas Prioritários' },
    { key: 'activated_modes', label: 'Modos Ativados' },
    { key: 'frustrated_needs', label: 'Necessidades Emocionais Básicas Frustradas' },
    { key: 'repetitive_patterns', label: 'Padrões Repetitivos' },
    { key: 'coping_strategies', label: 'Estratégias de Enfrentamento' },
    { key: 'reparation_goals', label: 'Objetivos de Reparação' },
    { key: 'corrective_experiences', label: 'Experiências Corretivas Planejadas' },
  ],
  ACT: [
    { key: 'experiential_avoidance', label: 'Esquiva Experiencial' },
    { key: 'cognitive_fusion', label: 'Fusão Cognitiva' },
    { key: 'values', label: 'Valores Identificados' },
    { key: 'committed_actions', label: 'Ações Comprometidas' },
    { key: 'psychological_flexibility', label: 'Estratégias de Flexibilidade Psicológica' },
    { key: 'mindfulness_practices', label: 'Práticas de Mindfulness Planejadas' },
  ],
  'Humanista': [
    { key: 'emotional_awareness', label: 'Ampliação de Consciência Emocional' },
    { key: 'congruence', label: 'Congruência / Autenticidade' },
    { key: 'self_acceptance', label: 'Autoaceitação' },
    { key: 'needs_expression', label: 'Expressão de Necessidades' },
    { key: 'self_strengthening', label: 'Fortalecimento do Self' },
  ],
  'Psicanálise': [
    { key: 'listening_axes', label: 'Eixos de Escuta Clínica' },
    { key: 'priority_conflicts', label: 'Conflitos Prioritários' },
    { key: 'repetitions', label: 'Repetições Identificadas' },
    { key: 'defenses', label: 'Defesas' },
    { key: 'transference_themes', label: 'Temas Transferenciais' },
    { key: 'elaboration', label: 'Elaboração Progressiva' },
  ],
  'Sistêmica': [
    { key: 'relational_patterns', label: 'Padrões Relacionais' },
    { key: 'communication', label: 'Comunicação' },
    { key: 'roles', label: 'Papéis no Sistema' },
    { key: 'boundaries', label: 'Limites' },
    { key: 'link_reorganization', label: 'Reorganização de Vínculos' },
    { key: 'systemic_change', label: 'Estratégias de Mudança Sistêmica' },
  ],
};

const INTERVENTION_SUGGESTIONS = [
  'Psicoeducação', 'Registro de Pensamentos (RPD)', 'Reestruturação Cognitiva',
  'Experimento Comportamental', 'Exposição Gradual', 'Treino Assertivo',
  'Ativação Comportamental', 'Regulação Emocional', 'Trabalho com Esquemas',
  'Cadeira Vazia', 'Mindfulness', 'Elaboração de Luto', 'Treino de Rotina',
  'Desfusão Cognitiva', 'Mapa de Valores', 'Psicoeducação Familiar',
  'Técnica da Seta Descendente', 'Análise Funcional', 'Automonitoramento',
];

/* ── Sub-components ── */

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color?: string }> = ({ icon, title, color = 'indigo' }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className={`w-8 h-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <h3 className={`text-[11px] font-black uppercase tracking-widest text-${color}-700`}>{title}</h3>
  </div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }> = ({ label, value, onChange, multiline = false, placeholder = '' }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
    {multiline ? (
      <textarea rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300 resize-none leading-relaxed"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
    ) : (
      <input type="text"
        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700 outline-none focus:border-indigo-300"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
    )}
  </div>
);

const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }> = ({ label, value, onChange, options }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
    <select className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300"
      value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Collapsible: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: string }> = ({ title, icon, children, defaultOpen = false, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="font-black text-slate-700 text-xs uppercase tracking-widest">{title}</span>
          {badge && <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">{badge}</span>}
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-50">{children}</div>}
    </div>
  );
};

/* ── Main Component ── */
interface TherapeuticPlanEditorProps {
  plan: TheraPlan;
  onChange: (plan: TheraPlan) => void;
  patientId: string;
  recordId?: string;
}

export const TherapeuticPlanEditor: React.FC<TherapeuticPlanEditorProps> = ({ plan, onChange, patientId }) => {
  const { pushToast } = useToast();
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const update = useCallback((path: string, value: any) => {
    onChange(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      let obj: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }, [onChange]);

  const setCurrentState = (key: string, val: string) => update(`current_state.${key}`, val);
  const setDestination = (key: string, val: string) => update(`destination.${key}`, val);
  const setApproachSpecific = (key: string, val: string) => update(`approach_specific.${key}`, val);

  /* Needs CRUD */
  const addNeed = () => onChange(p => ({
    ...p, needs: [...p.needs, {
      id: uid(), title: '', description: '', source: 'observacao',
      priority: 'media', urgency: 'normal', functional_impact: '', status: 'nao_iniciado',
    }]
  }));
  const updateNeed = (id: string, key: string, val: any) => onChange(p => ({
    ...p, needs: p.needs.map(n => n.id === id ? { ...n, [key]: val } : n)
  }));
  const removeNeed = (id: string) => onChange(p => ({ ...p, needs: p.needs.filter(n => n.id !== id) }));

  /* Goals CRUD */
  const addGoal = () => onChange(p => ({
    ...p, goals: [...p.goals, {
      id: uid(), description: '', need_id: '', timeframe: 'medio',
      progress_indicators: '', completion_criterion: '',
      priority: 'media', status: 'nao_iniciado', progress_note: '',
    }]
  }));
  const updateGoal = (id: string, key: string, val: any) => onChange(p => ({
    ...p, goals: p.goals.map(g => g.id === id ? { ...g, [key]: val } : g)
  }));
  const removeGoal = (id: string) => onChange(p => ({ ...p, goals: p.goals.filter(g => g.id !== id) }));

  /* Phases CRUD */
  const addPhase = () => onChange(p => ({
    ...p, phases: [...p.phases, {
      id: uid(), title: '', description: '', goals: '',
      status: 'nao_iniciada', order: p.phases.length + 1,
    }]
  }));
  const updatePhase = (id: string, key: string, val: any) => onChange(p => ({
    ...p, phases: p.phases.map(ph => ph.id === id ? { ...ph, [key]: val } : ph)
  }));
  const removePhase = (id: string) => onChange(p => ({ ...p, phases: p.phases.filter(ph => ph.id !== id) }));

  /* Interventions CRUD */
  const addIntervention = () => onChange(p => ({
    ...p, interventions: [...p.interventions, {
      id: uid(), name: '', goal_id: '', frequency: '', priority: 'media', notes: '',
    }]
  }));
  const updateIntervention = (id: string, key: string, val: any) => onChange(p => ({
    ...p, interventions: p.interventions.map(i => i.id === id ? { ...i, [key]: val } : i)
  }));
  const removeIntervention = (id: string) => onChange(p => ({
    ...p, interventions: p.interventions.filter(i => i.id !== id)
  }));

  /* Reprogrammings CRUD */
  const addReprogramming = () => onChange(p => ({
    ...p, reprogrammings: [...p.reprogrammings, {
      id: uid(), date: new Date().toISOString().slice(0, 10),
      reason: '', what_changed: '', justification: '', expected_impact: '',
    }]
  }));
  const updateReprogramming = (id: string, key: string, val: any) => onChange(p => ({
    ...p, reprogrammings: p.reprogrammings.map(r => r.id === id ? { ...r, [key]: val } : r)
  }));
  const removeReprogramming = (id: string) => onChange(p => ({
    ...p, reprogrammings: p.reprogrammings.filter(r => r.id !== id)
  }));

  /* AI Suggest */
  const handleAISuggest = async () => {
    if (!patientId) { pushToast('error', 'Selecione um paciente primeiro'); return; }
    setAiLoading(true);
    try {
      const resp = await api.post<any>('/api/therapeutic-plans/ai-suggest', {
        patient_id: patientId,
        approach: plan.approach,
        current_plan: plan,
      });
      if (resp.suggestion) {
        const s = resp.suggestion;
        onChange(p => ({
          ...p,
          summary: s.summary || p.summary,
          current_focus: s.current_focus || p.current_focus,
          priority_level: s.priority_level || p.priority_level,
          current_state: { ...p.current_state, ...(s.current_state || {}) },
          destination: { ...p.destination, ...(s.destination || {}) },
          needs: s.needs?.length ? s.needs : p.needs,
          goals: s.goals?.length ? s.goals : p.goals,
          phases: s.phases?.length ? s.phases : p.phases,
          approach_specific: { ...p.approach_specific, ...(s.approach_specific || {}) },
        }));
        pushToast('success', 'Sugestão da IA aplicada! Revise e ajuste.');
      }
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao gerar sugestão');
    } finally {
      setAiLoading(false);
    }
  };

  const approachFields = APPROACH_SPECIFIC_FIELDS[plan.approach] || APPROACH_SPECIFIC_FIELDS.TCC;

  const TABS = [
    { id: 'overview', label: 'Visão Geral', icon: <Brain size={13}/> },
    { id: 'current', label: 'Estado', icon: <Activity size={13}/> },
    { id: 'destination', label: 'Destino', icon: <Target size={13}/> },
    { id: 'needs', label: `Nec. (${plan.needs.length})`, icon: <Heart size={13}/> },
    { id: 'goals', label: `Metas (${plan.goals.length})`, icon: <CheckCircle2 size={13}/> },
    { id: 'roadmap', label: 'Roadmap', icon: <Map size={13}/> },
    { id: 'interventions', label: `Interv. (${plan.interventions.length})`, icon: <Zap size={13}/> },
    { id: 'approach', label: plan.approach, icon: <BookOpen size={13}/> },
    { id: 'reprogramming', label: `Reprog. (${plan.reprogrammings.length})`, icon: <RotateCcw size={13}/> },
  ];

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-indigo-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="text-white"/>
          </div>
          <div>
            <p className="font-black text-white text-sm uppercase tracking-wide">Assistência IA</p>
            <p className="text-white/70 text-xs font-medium">Gera plano estruturado a partir dos dados do paciente</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAISuggest}
          disabled={aiLoading || !patientId}
          className="h-9 px-5 bg-white text-indigo-700 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition disabled:opacity-50"
        >
          {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
          {aiLoading ? 'Gerando...' : 'Gerar com IA'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white border border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VISÃO GERAL ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <SectionHeader icon={<Brain size={16}/>} title="Visão Geral do Plano"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Abordagem Terapêutica" value={plan.approach}
                onChange={v => update('approach', v)}
                options={[
                  { value: 'TCC', label: 'TCC — Terapia Cognitivo-Comportamental' },
                  { value: 'Terapia do Esquema', label: 'Terapia do Esquema' },
                  { value: 'ACT', label: 'ACT — Terapia de Aceitação e Compromisso' },
                  { value: 'Humanista', label: 'Humanista / Centrada na Pessoa' },
                  { value: 'Psicanálise', label: 'Psicanálise' },
                  { value: 'Sistêmica', label: 'Sistêmica / Familiar' },
                ]}
              />
              <SelectField label="Status do Plano" value={plan.plan_status}
                onChange={v => update('plan_status', v)}
                options={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'em_revisao', label: 'Em Revisão' },
                  { value: 'pausado', label: 'Pausado' },
                  { value: 'concluido', label: 'Concluído' },
                  { value: 'arquivado', label: 'Arquivado' },
                ]}
              />
              <SelectField label="Nível de Prioridade Clínica" value={plan.priority_level}
                onChange={v => update('priority_level', v)}
                options={[
                  { value: 'baixa', label: 'Baixa' },
                  { value: 'media', label: 'Média' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'urgente', label: 'Urgente' },
                ]}
              />
              <Field label="Fase Atual" value={plan.current_phase}
                onChange={v => update('current_phase', v)} placeholder="Ex: Fase 2 — Intervenção Principal"/>
              <div className="md:col-span-2">
                <Field label="Resumo do Momento Atual" value={plan.summary}
                  onChange={v => update('summary', v)} multiline
                  placeholder="Breve síntese do estado clínico atual do paciente..."/>
              </div>
              <div className="md:col-span-2">
                <Field label="Foco Terapêutico Atual" value={plan.current_focus}
                  onChange={v => update('current_focus', v)}
                  placeholder="Principal foco da intervenção no momento atual..."/>
              </div>
            </div>
          </div>

          {/* Progress summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Necessidades', value: plan.needs.length, icon: <Heart size={16}/>, color: 'rose' },
              { label: 'Metas', value: plan.goals.length, icon: <CheckCircle2 size={16}/>, color: 'indigo' },
              { label: 'Intervenções', value: plan.interventions.length, icon: <Zap size={16}/>, color: 'amber' },
              { label: 'Metas concluídas', value: plan.goals.filter(g => g.status === 'concluido').length, icon: <TrendingUp size={16}/>, color: 'emerald' },
            ].map(s => (
              <div key={s.label} className={`bg-white border border-${s.color}-100 rounded-2xl p-4 shadow-sm flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-black text-slate-800">{s.value}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: ESTADO ATUAL ── */}
      {activeTab === 'current' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <SectionHeader icon={<Activity size={16}/>} title="Estado Atual do Caso" color="blue"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Queixa Principal Atual" value={plan.current_state.main_complaint} multiline
                onChange={v => setCurrentState('main_complaint', v)}/>
              <Field label="Principais Dificuldades" value={plan.current_state.main_difficulties} multiline
                onChange={v => setCurrentState('main_difficulties', v)}/>
              <Field label="Sintomas / Sofrimentos Predominantes" value={plan.current_state.symptoms} multiline
                onChange={v => setCurrentState('symptoms', v)}/>
              <Field label="Prejuízos Funcionais" value={plan.current_state.functional_impairment} multiline
                onChange={v => setCurrentState('functional_impairment', v)}/>
              <Field label="Padrões Emocionais" value={plan.current_state.emotional_patterns} multiline
                onChange={v => setCurrentState('emotional_patterns', v)}/>
              <Field label="Padrões Cognitivos" value={plan.current_state.cognitive_patterns} multiline
                onChange={v => setCurrentState('cognitive_patterns', v)}/>
              <Field label="Padrões Comportamentais" value={plan.current_state.behavioral_patterns} multiline
                onChange={v => setCurrentState('behavioral_patterns', v)}/>
              <Field label="Riscos Identificados" value={plan.current_state.risks} multiline
                onChange={v => setCurrentState('risks', v)}/>
              <Field label="Fatores de Manutenção" value={plan.current_state.maintenance_factors} multiline
                onChange={v => setCurrentState('maintenance_factors', v)}/>
              <Field label="Recursos Existentes" value={plan.current_state.existing_resources} multiline
                onChange={v => setCurrentState('existing_resources', v)}/>
              <Field label="Fatores de Proteção" value={plan.current_state.protection_factors} multiline
                onChange={v => setCurrentState('protection_factors', v)}/>
              <Field label="Nível Atual de Funcionamento" value={plan.current_state.functioning_level}
                onChange={v => setCurrentState('functioning_level', v)} placeholder="Bom / Regular / Comprometido..."/>
              <Field label="Percepção do Paciente sobre o Problema" value={plan.current_state.patient_perception} multiline
                onChange={v => setCurrentState('patient_perception', v)}/>
              <Field label="Percepção Clínica" value={plan.current_state.clinical_perception} multiline
                onChange={v => setCurrentState('clinical_perception', v)}/>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: DESTINO ── */}
      {activeTab === 'destination' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <SectionHeader icon={<Target size={16}/>} title="Destino Terapêutico" color="emerald"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Objetivo Geral do Tratamento" value={plan.destination.general_objective} multiline
                  onChange={v => setDestination('general_objective', v)}
                  placeholder="Objetivo central que orienta todo o processo terapêutico..."/>
              </div>
              <Field label="Mudanças Desejadas pelo Paciente" value={plan.destination.patient_changes} multiline
                onChange={v => setDestination('patient_changes', v)}/>
              <Field label="Mudanças Desejadas Clinicamente" value={plan.destination.clinical_changes} multiline
                onChange={v => setDestination('clinical_changes', v)}/>
              <Field label="Resultados Esperados" value={plan.destination.expected_results} multiline
                onChange={v => setDestination('expected_results', v)}/>
              <Field label="Melhora Funcional Esperada" value={plan.destination.functional_improvement} multiline
                onChange={v => setDestination('functional_improvement', v)}/>
              <div className="md:col-span-2">
                <Field label="Critérios de Progresso" value={plan.destination.progress_criteria} multiline
                  onChange={v => setDestination('progress_criteria', v)}
                  placeholder="Indicadores observáveis de que o paciente está avançando..."/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: NECESSIDADES ── */}
      {activeTab === 'needs' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {plan.needs.length} necessidade(s) identificada(s)
            </p>
            <button type="button" onClick={addNeed}
              className="h-8 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-100">
              <Plus size={13}/> Adicionar
            </button>
          </div>
          {plan.needs.length === 0 && (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <Heart size={28} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-xs text-slate-400 font-bold">Nenhuma necessidade registrada. Use a IA ou adicione manualmente.</p>
            </div>
          )}
          {plan.needs.map((need, idx) => (
            <Collapsible key={need.id} defaultOpen={idx === 0}
              title={need.title || `Necessidade ${idx + 1}`}
              badge={need.priority}
              icon={<Heart size={14}/>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <Field label="Título" value={need.title} onChange={v => updateNeed(need.id, 'title', v)}
                  placeholder="Ex: Reduzir ansiedade social"/>
                <SelectField label="Prioridade" value={need.priority}
                  onChange={v => updateNeed(need.id, 'priority', v)}
                  options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]}/>
                <Field label="Descrição Clínica" value={need.description} multiline
                  onChange={v => updateNeed(need.id, 'description', v)}/>
                <Field label="Impacto Funcional" value={need.functional_impact} multiline
                  onChange={v => updateNeed(need.id, 'functional_impact', v)}/>
                <SelectField label="Origem" value={need.source}
                  onChange={v => updateNeed(need.id, 'source', v)}
                  options={[
                    { value: 'anamnese', label: 'Anamnese' },
                    { value: 'evolucao', label: 'Evolução' },
                    { value: 'instrumento', label: 'Instrumento/Escala' },
                    { value: 'avaliacao', label: 'Avaliação do Caso' },
                    { value: 'observacao', label: 'Observação Clínica' },
                  ]}/>
                <SelectField label="Status" value={need.status}
                  onChange={v => updateNeed(need.id, 'status', v)}
                  options={[
                    { value: 'nao_iniciado', label: 'Não Iniciado' },
                    { value: 'em_andamento', label: 'Em Andamento' },
                    { value: 'avancando', label: 'Avançando' },
                    { value: 'estabilizado', label: 'Estabilizado' },
                    { value: 'concluido', label: 'Concluído' },
                  ]}/>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeNeed(need.id)}
                    className="h-8 px-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition">
                    <Trash2 size={12}/> Remover
                  </button>
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* ── TAB: METAS ── */}
      {activeTab === 'goals' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {plan.goals.length} meta(s) definida(s)
            </p>
            <button type="button" onClick={addGoal}
              className="h-8 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-100">
              <Plus size={13}/> Adicionar
            </button>
          </div>
          {plan.goals.length === 0 && (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <CheckCircle2 size={28} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-xs text-slate-400 font-bold">Nenhuma meta definida. Use a IA ou adicione manualmente.</p>
            </div>
          )}
          {plan.goals.map((goal, idx) => (
            <Collapsible key={goal.id} defaultOpen={idx === 0}
              title={goal.description ? goal.description.slice(0, 60) + (goal.description.length > 60 ? '...' : '') : `Meta ${idx + 1}`}
              badge={goal.timeframe}
              icon={<CheckCircle2 size={14}/>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <div className="md:col-span-2">
                  <Field label="Descrição da Meta" value={goal.description} multiline
                    onChange={v => updateGoal(goal.id, 'description', v)}
                    placeholder="Descreva a meta de forma clara e observável..."/>
                </div>
                <SelectField label="Necessidade Vinculada" value={goal.need_id}
                  onChange={v => updateGoal(goal.id, 'need_id', v)}
                  options={[{ value: '', label: '— Sem vínculo —' }, ...plan.needs.map(n => ({ value: n.id, label: n.title || 'Sem título' }))]}/>
                <SelectField label="Prazo" value={goal.timeframe}
                  onChange={v => updateGoal(goal.id, 'timeframe', v)}
                  options={[
                    { value: 'curto', label: 'Curto Prazo (1-4 semanas)' },
                    { value: 'medio', label: 'Médio Prazo (1-3 meses)' },
                    { value: 'longo', label: 'Longo Prazo (3+ meses)' },
                  ]}/>
                <SelectField label="Prioridade" value={goal.priority}
                  onChange={v => updateGoal(goal.id, 'priority', v)}
                  options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]}/>
                <SelectField label="Status" value={goal.status}
                  onChange={v => updateGoal(goal.id, 'status', v)}
                  options={[
                    { value: 'nao_iniciado', label: 'Não Iniciado' },
                    { value: 'em_andamento', label: 'Em Andamento' },
                    { value: 'concluido', label: 'Concluído' },
                    { value: 'pausado', label: 'Pausado' },
                  ]}/>
                <Field label="Indicadores de Progresso" value={goal.progress_indicators} multiline
                  onChange={v => updateGoal(goal.id, 'progress_indicators', v)}/>
                <Field label="Critério de Conclusão" value={goal.completion_criterion} multiline
                  onChange={v => updateGoal(goal.id, 'completion_criterion', v)}/>
                <div className="md:col-span-2">
                  <Field label="Nota de Progresso Atual" value={goal.progress_note} multiline
                    onChange={v => updateGoal(goal.id, 'progress_note', v)}
                    placeholder="Observações sobre o andamento desta meta..."/>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeGoal(goal.id)}
                    className="h-8 px-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition">
                    <Trash2 size={12}/> Remover
                  </button>
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* ── TAB: ROADMAP ── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fases do Processo Terapêutico</p>
            <button type="button" onClick={addPhase}
              className="h-8 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-100">
              <Plus size={13}/> Fase
            </button>
          </div>
          {/* Visual roadmap */}
          {plan.phases.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {plan.phases.sort((a, b) => a.order - b.order).map((phase, idx) => (
                  <div key={phase.id} className="flex items-center shrink-0">
                    <div className={`flex flex-col items-center gap-2 w-36 text-center p-3 rounded-2xl border transition-all ${
                      phase.status === 'atual' ? 'bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-100' :
                      phase.status === 'concluida' ? 'bg-emerald-50 border-emerald-200' :
                      'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        phase.status === 'atual' ? 'bg-indigo-600 text-white' :
                        phase.status === 'concluida' ? 'bg-emerald-500 text-white' :
                        'bg-slate-200 text-slate-400'
                      }`}>
                        {phase.status === 'concluida' ? <CheckCircle2 size={16}/> :
                         phase.status === 'atual' ? <ArrowRight size={16}/> :
                         <Circle size={16}/>}
                      </div>
                      <p className="text-[9px] font-black text-slate-700 uppercase leading-tight">{phase.title || `Fase ${idx + 1}`}</p>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg ${
                        phase.status === 'atual' ? 'bg-indigo-600 text-white' :
                        phase.status === 'concluida' ? 'bg-emerald-500 text-white' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {phase.status === 'atual' ? 'Atual' : phase.status === 'concluida' ? 'Concluída' : 'Futura'}
                      </span>
                    </div>
                    {idx < plan.phases.length - 1 && (
                      <div className="w-8 h-0.5 bg-slate-200 shrink-0"/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {plan.phases.map((phase, idx) => (
            <Collapsible key={phase.id} defaultOpen={phase.status === 'atual'}
              title={phase.title || `Fase ${idx + 1}`}
              icon={<Map size={14}/>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <Field label="Título da Fase" value={phase.title}
                  onChange={v => updatePhase(phase.id, 'title', v)} placeholder="Ex: Fase 2 — Intervenção Principal"/>
                <SelectField label="Status" value={phase.status}
                  onChange={v => updatePhase(phase.id, 'status', v)}
                  options={[
                    { value: 'nao_iniciada', label: 'Não Iniciada' },
                    { value: 'atual', label: 'Fase Atual' },
                    { value: 'concluida', label: 'Concluída' },
                  ]}/>
                <Field label="Descrição / Objetivo da Fase" value={phase.description} multiline
                  onChange={v => updatePhase(phase.id, 'description', v)}/>
                <Field label="Metas desta Fase" value={phase.goals} multiline
                  onChange={v => updatePhase(phase.id, 'goals', v)}/>
                <div className="flex justify-between items-center md:col-span-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Ordem</label>
                    <input type="number" min={1}
                      className="w-16 h-8 px-2 rounded-lg bg-slate-50 border border-slate-100 text-sm font-bold outline-none text-center"
                      value={phase.order}
                      onChange={e => updatePhase(phase.id, 'order', Number(e.target.value))}/>
                  </div>
                  <button type="button" onClick={() => removePhase(phase.id)}
                    className="h-8 px-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition">
                    <Trash2 size={12}/> Remover
                  </button>
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* ── TAB: INTERVENÇÕES ── */}
      {activeTab === 'interventions' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plan.interventions.length} intervenção(ões) planejada(s)</p>
            <button type="button" onClick={addIntervention}
              className="h-8 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-100">
              <Plus size={13}/> Adicionar
            </button>
          </div>
          {/* Quick add pills */}
          <div className="flex flex-wrap gap-1.5">
            {INTERVENTION_SUGGESTIONS.map(s => (
              <button key={s} type="button"
                onClick={() => onChange(p => ({
                  ...p, interventions: [...p.interventions, {
                    id: uid(), name: s, goal_id: '', frequency: '', priority: 'media', notes: ''
                  }]
                }))}
                className="text-[9px] font-black uppercase px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition flex items-center gap-1">
                <Plus size={9}/> {s}
              </button>
            ))}
          </div>
          {plan.interventions.map((intv, idx) => (
            <Collapsible key={intv.id} defaultOpen={false}
              title={intv.name || `Intervenção ${idx + 1}`}
              icon={<Zap size={14}/>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <Field label="Técnica / Intervenção" value={intv.name}
                  onChange={v => updateIntervention(intv.id, 'name', v)}/>
                <SelectField label="Meta Vinculada" value={intv.goal_id}
                  onChange={v => updateIntervention(intv.id, 'goal_id', v)}
                  options={[{ value: '', label: '— Sem vínculo —' }, ...plan.goals.map(g => ({ value: g.id, label: g.description ? g.description.slice(0, 50) : 'Sem descrição' }))]}/>
                <Field label="Frequência" value={intv.frequency}
                  onChange={v => updateIntervention(intv.id, 'frequency', v)} placeholder="Ex: Semanal, A cada sessão..."/>
                <SelectField label="Prioridade" value={intv.priority}
                  onChange={v => updateIntervention(intv.id, 'priority', v)}
                  options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]}/>
                <div className="md:col-span-2">
                  <Field label="Observações" value={intv.notes} multiline
                    onChange={v => updateIntervention(intv.id, 'notes', v)}/>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeIntervention(intv.id)}
                    className="h-8 px-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition">
                    <Trash2 size={12}/> Remover
                  </button>
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* ── TAB: ABORDAGEM ESPECÍFICA ── */}
      {activeTab === 'approach' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <SectionHeader icon={<BookOpen size={16}/>} title={`Campos Específicos — ${plan.approach}`} color="violet"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approachFields.map(f => (
                <Field key={f.key} label={f.label}
                  value={plan.approach_specific[f.key] || ''}
                  onChange={v => setApproachSpecific(f.key, v)} multiline/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: REPROGRAMAÇÕES ── */}
      {activeTab === 'reprogramming' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Reprogramações do Plano</p>
            <button type="button" onClick={addReprogramming}
              className="h-8 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-100">
              <Plus size={13}/> Registrar
            </button>
          </div>
          {plan.reprogrammings.length === 0 && (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <RotateCcw size={28} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-xs text-slate-400 font-bold">Nenhuma reprogramação registrada ainda.</p>
            </div>
          )}
          {plan.reprogrammings.map((rep, idx) => (
            <Collapsible key={rep.id} defaultOpen={idx === 0}
              title={`Reprogramação — ${rep.date || 'sem data'}`}
              icon={<RotateCcw size={14}/>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Data</label>
                  <input type="date" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:border-indigo-300"
                    value={rep.date} onChange={e => updateReprogramming(rep.id, 'date', e.target.value)}/>
                </div>
                <Field label="Motivo da Mudança" value={rep.reason}
                  onChange={v => updateReprogramming(rep.id, 'reason', v)}/>
                <Field label="O Que Mudou" value={rep.what_changed} multiline
                  onChange={v => updateReprogramming(rep.id, 'what_changed', v)}/>
                <Field label="Justificativa Clínica" value={rep.justification} multiline
                  onChange={v => updateReprogramming(rep.id, 'justification', v)}/>
                <div className="md:col-span-2">
                  <Field label="Impacto Esperado" value={rep.expected_impact} multiline
                    onChange={v => updateReprogramming(rep.id, 'expected_impact', v)}/>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeReprogramming(rep.id)}
                    className="h-8 px-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition">
                    <Trash2 size={12}/> Remover
                  </button>
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};
