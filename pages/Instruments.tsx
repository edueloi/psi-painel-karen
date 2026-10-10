import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { PageWrapper, SectionTitle, StatGrid, ContentCard } from '../components/UI/PageWrapper';
import { PanelCard } from '../components/UI/PanelCard';
import { StatCard } from '../components/UI/StatCard';
import { Tabs } from '../components/UI/Tabs';
import { Badge } from '../components/UI/Badge';
import { EmptyState } from '../components/UI/EmptyState';
import { Button, IconButton } from '../components/UI/Button';
import { FilterLineSearch } from '../components/UI/FilterLine';
import {
  Radar, Activity, ChevronRight, ArrowLeft, Users, Calendar,
  Plus, Loader2, BarChart2, TrendingUp, AlertTriangle, CheckCircle2,
  Brain, Zap, Clock, Hash, ArrowRight, FileText, LayoutGrid
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar as RadarPlot, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from 'recharts';

/* ─── Types ────────────────────────────────────────────────── */
interface DiscResult {
  id: string; patient_id?: string; patient_name: string;
  score_d: number; score_i: number; score_s: number; score_c: number;
  created_at: string; aurora_analysis?: string;
}
interface DassPatient {
  patient_id: string; patient_name: string; sessions: number;
  last_scores: { Depression: number; Anxiety: number; Stress: number } | null;
  last_date: string; history: any[];
}
interface GenericPatient {
  patient_id: string | number;
  patient_name: string;
  sessions?: number;
  last_date?: string;
  last_score?: number;
  history?: any[];
}

/* ─── Helpers ──────────────────────────────────────────────── */
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtTime = (secs?: number) => {
  if (!secs) return null;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}min`;
};

const DISC_COLORS = { D: '#dc2626', I: '#d97706', S: '#16a34a', C: '#2563eb' };

const dassLevel = (val: number, sub: 'Depression' | 'Anxiety' | 'Stress') => {
  const thresholds: Record<string, [number, string, string][]> = {
    Depression: [[9,'Normal','emerald'],[13,'Leve','amber'],[20,'Moderado','orange'],[27,'Grave','rose'],[99,'Muito Grave','red']],
    Anxiety:    [[7,'Normal','emerald'],[9,'Leve','amber'],[14,'Moderado','orange'],[19,'Grave','rose'],[99,'Muito Grave','red']],
    Stress:     [[14,'Normal','emerald'],[18,'Leve','amber'],[25,'Moderado','orange'],[33,'Grave','rose'],[99,'Muito Grave','red']],
  };
  for (const [max, label, color] of thresholds[sub]) {
    if (val <= (max as number)) return { label: label as string, color: color as string };
  }
  return { label: 'Normal', color: 'emerald' };
};

const ScoreBadge: React.FC<{ val: number; sub: 'Depression'|'Anxiety'|'Stress' }> = ({ val, sub }) => {
  const { label, color } = dassLevel(val, sub);
  const map: Record<string, 'success' | 'warning' | 'orange' | 'danger'> = {
    emerald: 'success', amber: 'warning', orange: 'orange', rose: 'danger', red: 'danger',
  };
  return (
    <Badge color={map[color] || 'default'} size="sm">
      {val} · {label}
    </Badge>
  );
};

/* ─── Navegação por abas ────────────────────────────────────── */
type ViewType = 'hub' | 'disc' | 'dass' | 'bdi' | 'bai' | 'snap' | 'mchat';

const instrumentTabs = [
  { id: 'hub', label: 'Visão geral', icon: LayoutGrid },
  { id: 'disc', label: 'DISC', icon: Radar },
  { id: 'dass', label: 'DASS-21', icon: Activity },
  { id: 'bdi', label: 'BDI-II', icon: Brain },
  { id: 'bai', label: 'BAI', icon: Zap },
  { id: 'snap', label: 'SNAP-IV', icon: BarChart2 },
  { id: 'mchat', label: 'M-CHAT-R/F', icon: CheckCircle2 },
] as const;

const InstrumentNav: React.FC<{ value: ViewType; onChange: (v: ViewType) => void }> = ({ value, onChange }) => (
  <Tabs<ViewType> items={instrumentTabs} value={value} onChange={onChange} label="Instrumentos psicológicos" />
);

/* ─── Patient Row ───────────────────────────────────────────── */
interface PatientRowProps {
  avatar: string;
  name: string;
  date: string;
  sessions: number;
  extra?: React.ReactNode;
  avgTime?: number | null;
  onOpen: () => void;
}
const PatientRow: React.FC<PatientRowProps> = ({ avatar, name, date, sessions, extra, avgTime, onOpen }) => (
  <div className="group flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer" onClick={onOpen}>
    <div className="w-9 h-9 rounded-lg border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center font-medium text-sm shrink-0">
      {avatar}
    </div>
    <div className="flex-1 min-w-0 space-y-1">
      <p className="font-medium text-slate-800 text-xs truncate">{name}</p>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Calendar size={11}/> {date}</span>
        <span className="flex items-center gap-1"><Hash size={11}/> {sessions} resposta{sessions !== 1 ? 's' : ''}</span>
        {avgTime != null && (
          <span className="flex items-center gap-1"><Clock size={11}/> {fmtTime(avgTime)}</span>
        )}
      </div>
      {extra && <div className="flex flex-wrap gap-1.5 pt-0.5">{extra}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <Badge color="default" size="sm">{sessions}</Badge>
      <IconButton variant="outline" size="sm" aria-label={`Abrir ${name}`} title="Abrir" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        <ArrowRight size={14}/>
      </IconButton>
    </div>
  </div>
);

/* ─── View Header ────────────────────────────────────────────── */
const ViewHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  applyLabel: string;
  applyPath: string;
}> = ({ icon, title, subtitle, applyLabel, applyPath }) => {
  const navigate = useNavigate();
  return (
    <SectionTitle
      icon={icon}
      title={title}
      description={subtitle}
      action={
        <Button variant="primary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => navigate(applyPath)}>
          {applyLabel}
        </Button>
      }
    />
  );
};

const LoadingBlock: React.FC = () => (
  <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
    <Loader2 size={18} className="animate-spin"/> Carregando…
  </div>
);

/* ═══════════════════════════════════════════════════════════
   DISC DETAIL VIEW
═══════════════════════════════════════════════════════════ */
const DiscView: React.FC<{ onNavigate: (v: ViewType) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [results, setResults] = useState<DiscResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DiscResult[]>('/disc')
      .then(data => setResults(data || []))
      .catch(() => pushToast('error', 'Erro ao carregar dados DISC'))
      .finally(() => setLoading(false));
  }, []);

  // Unique patients — keep latest result, count total
  const patientMap = useMemo(() => {
    const map = new Map<string, { latest: DiscResult; count: number }>();
    [...results]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(r => {
        const key = r.patient_id || r.patient_name;
        const cur = map.get(key);
        map.set(key, { latest: r, count: (cur?.count || 0) + 1 });
      });
    return Array.from(map.values());
  }, [results]);

  const filtered = patientMap.filter(({ latest }) =>
    latest.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  const avgChart = useMemo(() => {
    if (!patientMap.length) return [];
    const avg = (key: 'score_d'|'score_i'|'score_s'|'score_c') =>
      +(patientMap.reduce((s, { latest: r }) => s + (r[key] || 0), 0) / patientMap.length).toFixed(2);
    return [
      { dim: 'D', label: 'Dominância',   value: avg('score_d'), fill: DISC_COLORS.D },
      { dim: 'I', label: 'Influência',   value: avg('score_i'), fill: DISC_COLORS.I },
      { dim: 'S', label: 'Estabilidade', value: avg('score_s'), fill: DISC_COLORS.S },
      { dim: 'C', label: 'Conformidade', value: avg('score_c'), fill: DISC_COLORS.C },
    ];
  }, [patientMap]);

  const radarData = avgChart.map(d => ({ subject: d.dim, A: d.value, fullMark: 5 }));

  return (
    <PageWrapper>
      <div className="space-y-4">
        <ViewHeader
          icon={Radar}
          title="DISC — Perfil Comportamental"
          subtitle={`${patientMap.length} paciente${patientMap.length !== 1 ? 's' : ''} · ${results.length} avaliação${results.length !== 1 ? 'ões' : ''} total`}
          applyLabel="Aplicar DISC"
          applyPath="/caixa-ferramentas/disc-avaliativo"
        />
        <InstrumentNav value="disc" onChange={onNavigate}/>

        {loading ? (
          <LoadingBlock/>
        ) : patientMap.length === 0 ? (
          <ContentCard>
            <EmptyState icon={Radar} title="Nenhuma avaliação DISC ainda."/>
          </ContentCard>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PanelCard title="Médias por Dimensão">
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgChart} barCategoryGap="30%">
                      <XAxis dataKey="dim" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={(v: any) => [Number(v).toFixed(2), 'Média']}/>
                      <Bar dataKey="value" radius={[8,8,0,0]}>
                        {avgChart.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>
              <PanelCard title="Radar Médio DISC">
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid/>
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }}/>
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }}/>
                      <RadarPlot dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>
            </div>

            <ContentCard>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-medium text-slate-900">Pacientes Avaliados</h2>
                  <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar paciente..." aria-label="Buscar paciente" className="sm:max-w-[280px]"/>
                </div>
                <div className="space-y-2">
                  {filtered.map(({ latest: r, count }) => (
                    <PatientRow
                      key={r.id}
                      avatar={(r.patient_name || '?')[0].toUpperCase()}
                      name={r.patient_name}
                      date={fmtDate(r.created_at)}
                      sessions={count}
                      onOpen={() => navigate(`/caixa-ferramentas/disc-avaliativo?patient_id=${r.patient_id}`)}
                      extra={
                        <div className="flex items-end gap-2">
                          {(['D','I','S','C'] as const).map(dim => {
                            const key = `score_${dim.toLowerCase()}` as keyof DiscResult;
                            const val = (r[key] as number) || 0;
                            return (
                              <div key={dim} className="flex flex-col items-center gap-0.5">
                                <span className="text-[11px] font-medium" style={{ color: DISC_COLORS[dim] }}>{val.toFixed(1)}</span>
                                <div className="w-5 bg-slate-100 rounded-full overflow-hidden" style={{ height: 28 }}>
                                  <div className="w-full rounded-full" style={{
                                    height: `${(val/5)*100}%`,
                                    background: DISC_COLORS[dim],
                                    marginTop: `${100-(val/5)*100}%`
                                  }}/>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">{dim}</span>
                              </div>
                            );
                          })}
                        </div>
                      }
                    />
                  ))}
                  {filtered.length === 0 && <p className="text-center text-slate-500 text-xs py-6">Nenhum paciente encontrado.</p>}
                </div>
              </div>
            </ContentCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

/* ═══════════════════════════════════════════════════════════
   DASS-21 DETAIL VIEW
═══════════════════════════════════════════════════════════ */
const DassView: React.FC<{ onNavigate: (v: ViewType) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [patients, setPatients] = useState<DassPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DassPatient[]>('/clinical-tools/dass-21/all')
      .then(data => setPatients(data || []))
      .catch(() => pushToast('error', 'Erro ao carregar dados DASS-21'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  const distChart = useMemo(() => {
    const counts: Record<string, number> = { Normal: 0, Leve: 0, Moderado: 0, Grave: 0, 'Muito Grave': 0 };
    patients.forEach(p => {
      if (!p.last_scores) return;
      (['Depression','Anxiety','Stress'] as const).forEach(sub => {
        const { label } = dassLevel(p.last_scores![sub], sub);
        counts[label] = (counts[label] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [patients]);

  const DIST_COLORS: Record<string, string> = {
    Normal: '#10b981', Leve: '#f59e0b', Moderado: '#f97316', Grave: '#f43f5e', 'Muito Grave': '#dc2626'
  };

  // Compute avg response time from history items
  const avgTimeForPatient = (p: DassPatient) => {
    const times = (p.history || []).map(h => h.response_time).filter(Boolean);
    if (!times.length) return null;
    return Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length);
  };

  return (
    <PageWrapper>
      <div className="space-y-4">
        <ViewHeader
          icon={Activity}
          title="DASS-21 — Depressão, Ansiedade e Estresse"
          subtitle={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} avaliado${patients.length !== 1 ? 's' : ''}`}
          applyLabel="Aplicar DASS-21"
          applyPath="/caixa-ferramentas/dass-21"
        />
        <InstrumentNav value="dass" onChange={onNavigate}/>

        {loading ? (
          <LoadingBlock/>
        ) : patients.length === 0 ? (
          <ContentCard>
            <EmptyState icon={Activity} title="Nenhuma avaliação DASS-21 ainda."/>
          </ContentCard>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PanelCard title="Distribuição de Severidade">
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distChart} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                      <Tooltip/>
                      <Bar dataKey="value" radius={[8,8,0,0]} name="Contagem">
                        {distChart.map((d, i) => <Cell key={i} fill={DIST_COLORS[d.name] || '#94a3b8'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>
              <PanelCard title="Legenda de Severidade">
                <div className="space-y-2">
                  {[
                    { label: 'Normal',      color: 'bg-emerald-500', dep: '0-9',   anx: '0-7',  str: '0-14' },
                    { label: 'Leve',        color: 'bg-amber-500',   dep: '10-13', anx: '8-9',  str: '15-18' },
                    { label: 'Moderado',    color: 'bg-orange-500',  dep: '14-20', anx: '10-14',str: '19-25' },
                    { label: 'Grave',       color: 'bg-rose-500',    dep: '21-27', anx: '15-19',str: '26-33' },
                    { label: 'Muito Grave', color: 'bg-red-600',     dep: '28+',   anx: '20+',  str: '34+' },
                  ].map(({ label, color, dep, anx, str }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}/>
                      <span className="font-medium text-slate-700 text-xs w-20">{label}</span>
                      <span className="text-[11px] text-slate-500">Dep {dep} · Ans {anx} · Est {str}</span>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>

            <ContentCard>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-sm font-medium text-slate-900">Pacientes Avaliados</h2>
                  <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar paciente..." aria-label="Buscar paciente" className="sm:max-w-[280px]"/>
                </div>
                <div className="space-y-2">
                  {filtered.map(p => (
                    <PatientRow
                      key={p.patient_id}
                      avatar={(p.patient_name || '?')[0].toUpperCase()}
                      name={p.patient_name}
                      date={fmtDate(p.last_date)}
                      sessions={p.sessions}
                      avgTime={avgTimeForPatient(p)}
                      onOpen={() => navigate(`/caixa-ferramentas/dass-21?patient_id=${p.patient_id}`)}
                      extra={p.last_scores ? (
                        <>
                          {(['Depression','Anxiety','Stress'] as const).map(sub => {
                            const labels: Record<string,string> = { Depression: 'Dep', Anxiety: 'Ans', Stress: 'Est' };
                            return (
                              <span key={sub} className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-500">{labels[sub]}</span>
                                <ScoreBadge val={p.last_scores![sub]} sub={sub}/>
                              </span>
                            );
                          })}
                        </>
                      ) : undefined}
                    />
                  ))}
                  {filtered.length === 0 && <p className="text-center text-slate-500 text-xs py-6">Nenhum paciente encontrado.</p>}
                </div>
              </div>
            </ContentCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

/* ═══════════════════════════════════════════════════════════
   GENERIC RESULTS VIEW (BDI, BAI, SNAP-IV, M-CHAT)
═══════════════════════════════════════════════════════════ */
interface GenericViewProps {
  onNavigate: (v: ViewType) => void;
  viewId: ViewType;
  icon: React.ElementType;
  title: string;
  applyLabel: string;
  applyPath: string;
  resultPath: string;
  endpoint: string;
  scoreLabel?: string;
}
const GenericView: React.FC<GenericViewProps> = ({
  onNavigate, viewId, icon, title, applyLabel, applyPath, resultPath,
  endpoint, scoreLabel = 'Score'
}) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<any[]>(endpoint)
      .then(data => setRaw(data || []))
      .catch(() => pushToast('error', `Erro ao carregar ${title}`))
      .finally(() => setLoading(false));
  }, [endpoint]);

  // Group by patient
  const patients = useMemo<GenericPatient[]>(() => {
    const map = new Map<string, GenericPatient>();
    raw.forEach(r => {
      const pid = String(r.patient_id || r.id || '');
      const name = r.patient_name || r.name || 'Paciente';
      const cur = map.get(pid);
      const sessions = (cur?.sessions || 0) + 1;
      const date = r.last_date || r.created_at || r.date || '';
      const score = r.last_score ?? r.total ?? r.score ?? null;
      map.set(pid, { patient_id: pid, patient_name: name, sessions, last_date: date, last_score: score });
    });
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.last_date || '').getTime() - new Date(a.last_date || '').getTime()
    );
  }, [raw]);

  const filtered = patients.filter(p =>
    p.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <ViewHeader
          icon={icon}
          title={title}
          subtitle={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} avaliado${patients.length !== 1 ? 's' : ''} · ${raw.length} resultado${raw.length !== 1 ? 's' : ''}`}
          applyLabel={applyLabel}
          applyPath={applyPath}
        />
        <InstrumentNav value={viewId} onChange={onNavigate}/>

        {loading ? (
          <LoadingBlock/>
        ) : patients.length === 0 ? (
          <ContentCard>
            <EmptyState icon={icon} title={`Nenhuma avaliação ${title} ainda.`}/>
          </ContentCard>
        ) : (
          <ContentCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-slate-900">Pacientes</h2>
                  <Badge color="default" size="sm">{patients.length}</Badge>
                </div>
                <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar paciente..." aria-label="Buscar paciente" className="sm:max-w-[280px]"/>
              </div>
              <div className="space-y-2">
                {filtered.map(p => (
                  <PatientRow
                    key={String(p.patient_id)}
                    avatar={(p.patient_name || '?')[0].toUpperCase()}
                    name={p.patient_name}
                    date={fmtDate(p.last_date || '')}
                    sessions={p.sessions || 1}
                    onOpen={() => navigate(`${resultPath}?patient_id=${p.patient_id}`)}
                    extra={p.last_score != null ? (
                      <span className="text-[11px] font-medium text-slate-500">
                        {scoreLabel}: <span className="text-slate-800">{p.last_score}</span>
                      </span>
                    ) : undefined}
                  />
                ))}
                {filtered.length === 0 && <p className="text-center text-slate-500 text-xs py-6">Nenhum paciente encontrado.</p>}
              </div>
            </div>
          </ContentCard>
        )}
      </div>
    </PageWrapper>
  );
};

/* ═══════════════════════════════════════════════════════════
   INSTRUMENTS CONFIG
═══════════════════════════════════════════════════════════ */
const INSTRUMENTS_CONFIG = [
  {
    id: 'disc',
    title: 'DISC',
    subtitle: 'Perfil Comportamental',
    description: 'Avalia Dominância, Influência, Estabilidade e Conformidade. Compreenda estilos de comportamento clínico.',
    icon: Radar,
    tags: ['Comportamento', 'Perfil'],
    applyPath: '/caixa-ferramentas/disc-avaliativo',
    viewId: 'disc',
  },
  {
    id: 'dass',
    title: 'DASS-21',
    subtitle: 'Depressão, Ansiedade e Estresse',
    description: 'Rastreio de sintomas com classificação de severidade em três subescalas clínicas validadas.',
    icon: Activity,
    tags: ['Saúde Mental', 'Rastreio'],
    applyPath: '/caixa-ferramentas/dass-21',
    viewId: 'dass',
  },
  {
    id: 'bdi',
    title: 'BDI-II',
    subtitle: 'Inventário de Depressão de Beck',
    description: 'Padrão ouro para avaliação da presença e intensidade de sintomas depressivos.',
    icon: Brain,
    tags: ['Depressão', 'Beck'],
    applyPath: '/caixa-ferramentas/bdi-ii',
    viewId: 'bdi',
  },
  {
    id: 'bai',
    title: 'BAI',
    subtitle: 'Inventário de Ansiedade de Beck',
    description: 'Mensura intensidade de sintomas de ansiedade, incluindo componentes autonômicos e somáticos.',
    icon: Zap,
    tags: ['Ansiedade', 'Beck'],
    applyPath: '/caixa-ferramentas/bai',
    viewId: 'bai',
  },
  {
    id: 'snap',
    title: 'SNAP-IV',
    subtitle: 'Rastreio de TDAH',
    description: 'Escala para avaliação de desatenção, hiperatividade e comportamento opositor desafiador.',
    icon: BarChart2,
    tags: ['TDAH', 'Infantil'],
    applyPath: '/caixa-ferramentas/snap-iv',
    viewId: 'snap',
  },
  {
    id: 'mchat',
    title: 'M-CHAT-R/F',
    subtitle: 'Triagem para Autismo (TEA)',
    description: 'Triagem precoce para sinais de autismo em crianças de 16 a 30 meses. Alta sensibilidade.',
    icon: CheckCircle2,
    tags: ['Autismo', 'TEA'],
    applyPath: '/caixa-ferramentas/m-chat-r',
    viewId: 'mchat',
  },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export const Instruments: React.FC = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [view, setView] = useState<ViewType>('hub');
  const [stats, setStats] = useState<Record<string, number>>({
    disc: 0, dass: 0, bdi: 0, bai: 0, snap: 0, mchat: 0
  });

  useEffect(() => {
    (async () => {
      try {
        const [disc, dass, bdi, bai, snap, mchat] = await Promise.all([
          api.get<any[]>('/disc').catch(() => []),
          api.get<any[]>('/clinical-tools/dass-21/all').catch(() => []),
          api.get<any[]>('/clinical-tools/bdi-ii/all').catch(() => []),
          api.get<any[]>('/clinical-tools/bai/all').catch(() => []),
          api.get<any[]>('/clinical-tools/snap-iv/all').catch(() => []),
          api.get<any[]>('/clinical-tools/m-chat-r/all').catch(() => []),
        ]);
        const uniq = (arr: any[]) => new Set((arr || []).map((r: any) => r.patient_id)).size;
        setStats({ disc: uniq(disc), dass: uniq(dass), bdi: uniq(bdi), bai: uniq(bai), snap: uniq(snap), mchat: uniq(mchat) });
      } catch {}
    })();
  }, []);

  // Generic view configs
  const genericConfigs: Record<string, Omit<GenericViewProps, 'onNavigate' | 'viewId'>> = {
    bdi: {
      icon: Brain,
      title: 'BDI-II — Inventário de Depressão',
      applyLabel: 'Aplicar BDI-II',
      applyPath: '/caixa-ferramentas/bdi-ii',
      resultPath: '/caixa-ferramentas/bdi-ii',
      endpoint: '/clinical-tools/bdi-ii/all',
      scoreLabel: 'Total',
    },
    bai: {
      icon: Zap,
      title: 'BAI — Inventário de Ansiedade',
      applyLabel: 'Aplicar BAI',
      applyPath: '/caixa-ferramentas/bai',
      resultPath: '/caixa-ferramentas/bai',
      endpoint: '/clinical-tools/bai/all',
      scoreLabel: 'Total',
    },
    snap: {
      icon: BarChart2,
      title: 'SNAP-IV — Rastreio de TDAH',
      applyLabel: 'Aplicar SNAP-IV',
      applyPath: '/caixa-ferramentas/snap-iv',
      resultPath: '/caixa-ferramentas/snap-iv',
      endpoint: '/clinical-tools/snap-iv/all',
    },
    mchat: {
      icon: CheckCircle2,
      title: 'M-CHAT-R/F — Triagem TEA',
      applyLabel: 'Aplicar M-CHAT',
      applyPath: '/caixa-ferramentas/m-chat-r',
      resultPath: '/caixa-ferramentas/m-chat-r',
      endpoint: '/clinical-tools/m-chat-r/all',
    },
  };

  if (view === 'disc') return <DiscView onNavigate={setView}/>;
  if (view === 'dass') return <DassView onNavigate={setView}/>;
  if (['bdi','bai','snap','mchat'].includes(view)) {
    const cfg = genericConfigs[view];
    return <GenericView key={view} onNavigate={setView} viewId={view} {...cfg}/>;
  }

  const totalPatients = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Radar}
          title="Instrumentos Psicológicos"
          description="Escalas e inventários clínicos padronizados. Acompanhe a evolução longitudinal com análise assistida por IA."
        />

        <InstrumentNav value={view} onChange={setView}/>

        <StatGrid cols={3}>
          <StatCard title="Instrumentos" value={INSTRUMENTS_CONFIG.length} icon={Radar} color="default"/>
          <StatCard title="Pacientes" value={totalPatients} icon={Users} color="info"/>
          <StatCard title="Ativos" value={stats.disc + stats.dass + stats.bdi + stats.bai} icon={Activity} color="success"/>
        </StatGrid>

        {/* Instrument cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {INSTRUMENTS_CONFIG.map(inst => {
            const count = stats[inst.id] || 0;
            const InstIcon = inst.icon;
            return (
              <ContentCard
                key={inst.id}
                padding="none"
                className="group hover:border-primary-200 transition-all overflow-hidden flex flex-col h-full cursor-pointer"
                onClick={() => setView(inst.viewId as ViewType)}
              >
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                      <InstIcon size={14}/>
                    </div>
                    <Badge color="default" size="sm" dot>{count} paciente{count !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <h3 className="text-sm font-medium text-slate-900">{inst.title}</h3>
                    <p className="text-[11px] text-slate-500">{inst.subtitle}</p>
                    <p className="text-xs text-slate-600 pt-1 line-clamp-2">{inst.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inst.tags.map(tag => (
                      <Badge key={tag} color="default" size="sm">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                  <Button
                    variant="primary"
                    size="xs"
                    iconLeft={<Plus size={14}/>}
                    className="flex-1"
                    onClick={e => { e.stopPropagation(); navigate(inst.applyPath); }}
                  >
                    Aplicar
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    iconLeft={<FileText size={14}/>}
                    className="flex-1"
                    onClick={e => { e.stopPropagation(); setView(inst.viewId as ViewType); }}
                  >
                    Resultados
                  </Button>
                </div>
              </ContentCard>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
};
