import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/UI/PageHeader';
import {
  Radar, Activity, ChevronRight, ArrowLeft, Users, Calendar,
  Plus, Loader2, BarChart2, TrendingUp, AlertTriangle, CheckCircle2,
  Brain, Zap, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar as RadarPlot, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, Legend
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

/* ─── Helpers ──────────────────────────────────────────────── */
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const DISC_COLORS = { D: '#dc2626', I: '#d97706', S: '#16a34a', C: '#2563eb' };
const DISC_LABELS = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };

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
  const cls: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    red:     'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${cls[color]}`}>
      {val} · {label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   DISC DETAIL VIEW
═══════════════════════════════════════════════════════════ */
const DiscView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [results, setResults] = useState<DiscResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DiscResult[]>('/disc').then(data => {
      setResults(data || []);
    }).catch(() => pushToast('error', 'Erro ao carregar dados DISC'))
      .finally(() => setLoading(false));
  }, []);

  // Unique patients with their latest result
  const patientMap = useMemo(() => {
    const map = new Map<string, DiscResult>();
    [...results].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(r => map.set(r.patient_id || r.patient_name, r));
    return Array.from(map.values());
  }, [results]);

  const filtered = patientMap.filter(r =>
    r.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregate chart data
  const avgChart = useMemo(() => {
    if (!patientMap.length) return [];
    const avg = (key: 'score_d'|'score_i'|'score_s'|'score_c') =>
      +(patientMap.reduce((s, r) => s + (r[key] || 0), 0) / patientMap.length).toFixed(2);
    return [
      { dim: 'D', label: 'Dominância',    value: avg('score_d'), fill: DISC_COLORS.D },
      { dim: 'I', label: 'Influência',    value: avg('score_i'), fill: DISC_COLORS.I },
      { dim: 'S', label: 'Estabilidade',  value: avg('score_s'), fill: DISC_COLORS.S },
      { dim: 'C', label: 'Conformidade',  value: avg('score_c'), fill: DISC_COLORS.C },
    ];
  }, [patientMap]);

  const radarData = avgChart.map(d => ({ subject: d.dim, A: d.value, fullMark: 5 }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase transition">
          <ArrowLeft size={14}/> Instrumentos
        </button>
        <div className="flex-1">
          <h2 className="font-black text-slate-800 text-xl">DISC — Perfil Comportamental</h2>
          <p className="text-xs text-slate-400 font-medium">{patientMap.length} paciente{patientMap.length !== 1 ? 's' : ''} avaliado{patientMap.length !== 1 ? 's' : ''} · {results.length} avaliação{results.length !== 1 ? 'ões' : ''} total</p>
        </div>
        <button onClick={() => navigate('/caixa-ferramentas/disc-avaliativo')}
          className="h-10 px-5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition flex items-center gap-2 shadow">
          <Plus size={14}/> Aplicar DISC
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-indigo-400 animate-spin"/></div>
      ) : patientMap.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center shadow-sm">
          <Radar size={32} className="text-slate-200 mx-auto mb-4"/>
          <p className="font-bold text-slate-400">Nenhuma avaliação DISC registrada ainda.</p>
          <button onClick={() => navigate('/caixa-ferramentas/disc-avaliativo')}
            className="mt-4 h-10 px-6 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 inline-flex items-center gap-2">
            <Plus size={13}/> Aplicar primeiro DISC
          </button>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Médias por Dimensão (todos os pacientes)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={avgChart} barCategoryGap="30%">
                  <XAxis dataKey="dim" tick={{ fontSize: 13, fontWeight: 700 }}/>
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }}/>
                  <Tooltip formatter={(v: any) => [Number(v).toFixed(2), 'Média']}/>
                  <Bar dataKey="value" radius={[8,8,0,0]}>
                    {avgChart.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Radar Médio DISC</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14, fontWeight: 700 }}/>
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }}/>
                  <RadarPlot dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Patient list */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Pacientes Avaliados</h3>
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:border-indigo-300 font-medium"
                  placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                    {(r.patient_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 text-sm truncate">{r.patient_name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={9}/>{fmtDate(r.created_at)}</div>
                  </div>
                  {/* D I S C mini bars */}
                  <div className="flex items-end gap-2 shrink-0">
                    {(['D','I','S','C'] as const).map(dim => {
                      const key = `score_${dim.toLowerCase()}` as keyof DiscResult;
                      const val = (r[key] as number) || 0;
                      return (
                        <div key={dim} className="flex flex-col items-center gap-1">
                          <div className="text-[9px] font-black" style={{ color: DISC_COLORS[dim] }}>{val.toFixed(1)}</div>
                          <div className="w-6 bg-slate-200 rounded-full overflow-hidden" style={{ height: 36 }}>
                            <div className="w-full rounded-full transition-all" style={{
                              height: `${(val / 5) * 100}%`,
                              background: DISC_COLORS[dim],
                              marginTop: `${100 - (val / 5) * 100}%`
                            }}/>
                          </div>
                          <div className="text-[9px] font-black text-slate-500">{dim}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => navigate(`/disc?patient_id=${r.patient_id}`)}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 flex items-center justify-center transition shrink-0">
                    <ChevronRight size={14}/>
                  </button>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-slate-400 text-xs font-medium py-6">Nenhum paciente encontrado.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DASS-21 DETAIL VIEW
═══════════════════════════════════════════════════════════ */
const DassView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [patients, setPatients] = useState<DassPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DassPatient[]>('/clinical-tools/dass-all')
      .then(data => setPatients(data || []))
      .catch(() => pushToast('error', 'Erro ao carregar dados DASS-21'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  // Distribution count chart
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase transition">
          <ArrowLeft size={14}/> Instrumentos
        </button>
        <div className="flex-1">
          <h2 className="font-black text-slate-800 text-xl">DASS-21 — Depressão, Ansiedade e Estresse</h2>
          <p className="text-xs text-slate-400 font-medium">{patients.length} paciente{patients.length !== 1 ? 's' : ''} avaliado{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/caixa-ferramentas/dass-21')}
          className="h-10 px-5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase hover:bg-rose-700 transition flex items-center gap-2 shadow">
          <Plus size={14}/> Aplicar DASS-21
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-rose-400 animate-spin"/></div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center shadow-sm">
          <Activity size={32} className="text-slate-200 mx-auto mb-4"/>
          <p className="font-bold text-slate-400">Nenhuma avaliação DASS-21 registrada ainda.</p>
          <button onClick={() => navigate('/caixa-ferramentas/dass-21')}
            className="mt-4 h-10 px-6 bg-rose-600 text-white rounded-xl font-black text-xs uppercase hover:bg-rose-700 inline-flex items-center gap-2">
            <Plus size={13}/> Aplicar primeiro DASS-21
          </button>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Distribuição de Severidade (última avaliação)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distChart} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="value" radius={[8,8,0,0]} name="Contagem">
                    {distChart.map((d, i) => <Cell key={i} fill={DIST_COLORS[d.name] || '#94a3b8'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-3">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-2">Legenda de Severidade</h3>
              {[
                { label: 'Normal',      color: 'emerald', dep: '0-9',   anx: '0-7',  str: '0-14' },
                { label: 'Leve',        color: 'amber',   dep: '10-13', anx: '8-9',  str: '15-18' },
                { label: 'Moderado',    color: 'orange',  dep: '14-20', anx: '10-14',str: '19-25' },
                { label: 'Grave',       color: 'rose',    dep: '21-27', anx: '15-19',str: '26-33' },
                { label: 'Muito Grave', color: 'red',     dep: '28+',   anx: '20+',  str: '34+' },
              ].map(({ label, color, dep, anx, str }) => {
                const cls: Record<string,string> = { emerald:'bg-emerald-500', amber:'bg-amber-500', orange:'bg-orange-500', rose:'bg-rose-500', red:'bg-red-600' };
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${cls[color]}`}/>
                    <span className="font-black text-slate-700 text-xs w-20">{label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Dep: {dep} · Ans: {anx} · Est: {str}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patient list */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Pacientes Avaliados</h3>
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:border-indigo-300 font-medium"
                  placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.patient_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-rose-50 hover:border-rose-100 transition group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                      {(p.patient_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-800 text-sm truncate">{p.patient_name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Calendar size={9}/>{fmtDate(p.last_date)}</span>
                        <span>{p.sessions} avaliação{p.sessions !== 1 ? 'ões' : ''}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/caixa-ferramentas/dass-21?patient_id=${p.patient_id}`)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition shrink-0">
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                  {p.last_scores ? (
                    <div className="flex flex-wrap gap-2">
                      {(['Depression','Anxiety','Stress'] as const).map(sub => {
                        const labels: Record<string,string> = { Depression: 'Depressão', Anxiety: 'Ansiedade', Stress: 'Estresse' };
                        return (
                          <div key={sub} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold">{labels[sub]}:</span>
                            <ScoreBadge val={p.last_scores![sub]} sub={sub}/>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">Sem pontuação registrada.</p>
                  )}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-slate-400 text-xs font-medium py-6">Nenhum paciente encontrado.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   HUB VIEW
═══════════════════════════════════════════════════════════ */
const INSTRUMENTS_CONFIG = [
  {
    id: 'disc',
    title: 'DISC',
    subtitle: 'Perfil Comportamental de Marston',
    description: 'Avalia Dominância, Influência, Estabilidade e Conformidade. Ideal para compreender estilos de comunicação e comportamento clínico.',
    gradient: 'from-indigo-600 to-purple-600',
    icon: <Radar size={26} className="text-white"/>,
    tags: ['Comportamento', 'Perfil', 'Estilo'],
    applyPath: '/caixa-ferramentas/disc-avaliativo',
    viewPath: undefined as string | undefined,
    applyColor: 'bg-indigo-600 hover:bg-indigo-700',
  },
  {
    id: 'dass',
    title: 'DASS-21',
    subtitle: 'Depressão, Ansiedade e Estresse',
    description: 'Escala de 21 itens que rastreia sintomas de depressão, ansiedade e estresse. Validada para uso clínico com classificação de severidade.',
    gradient: 'from-rose-500 to-pink-600',
    icon: <Activity size={26} className="text-white"/>,
    tags: ['Saúde Mental', 'Rastreio', 'Triagem'],
    applyPath: '/caixa-ferramentas/dass-21',
    viewPath: undefined as string | undefined,
    applyColor: 'bg-rose-600 hover:bg-rose-700',
  },
  {
    id: 'bdi',
    title: 'BDI-II',
    subtitle: 'Inventário de Depressão de Beck',
    description: 'Inventário de 21 itens que avalia a presença e intensidade de sintomas depressivos. Pontuação de 0 a 63 com classificação Mínimo/Leve/Moderado/Grave.',
    gradient: 'from-rose-600 to-red-700',
    icon: <Brain size={26} className="text-white"/>,
    tags: ['Depressão', 'Beck', 'Sintomas'],
    applyPath: '/caixa-ferramentas/bdi-ii',
    viewPath: '/caixa-ferramentas/bdi-ii',
    applyColor: 'bg-rose-600 hover:bg-rose-700',
  },
  {
    id: 'bai',
    title: 'BAI',
    subtitle: 'Inventário de Ansiedade de Beck',
    description: 'Inventário de 21 itens que mensura a intensidade de sintomas de ansiedade. Avalia sintomas autonômicos, cognitivos e somáticos.',
    gradient: 'from-amber-500 to-orange-600',
    icon: <Zap size={26} className="text-white"/>,
    tags: ['Ansiedade', 'Beck', 'Autonômico'],
    applyPath: '/caixa-ferramentas/bai',
    viewPath: '/caixa-ferramentas/bai',
    applyColor: 'bg-amber-600 hover:bg-amber-700',
  },
  {
    id: 'snap',
    title: 'SNAP-IV',
    subtitle: 'Rastreio de TDAH e Oposição/Desafio',
    description: 'Escala de 26 itens respondida por pais ou professores. Avalia desatenção, hiperatividade/impulsividade e comportamento opositor/desafiador.',
    gradient: 'from-blue-600 to-indigo-700',
    icon: <BarChart2 size={26} className="text-white"/>,
    tags: ['TDAH', 'Neurodesenv.', 'Infantil'],
    applyPath: '/caixa-ferramentas/snap-iv',
    viewPath: '/caixa-ferramentas/snap-iv',
    applyColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    id: 'mchat',
    title: 'M-CHAT-R/F',
    subtitle: 'Triagem para Autismo em Crianças',
    description: 'Instrumento de triagem com 20 itens (SIM/NÃO) para sinais de autismo em crianças de 16 a 30 meses. Respondido por pais/responsáveis.',
    gradient: 'from-teal-500 to-emerald-600',
    icon: <CheckCircle2 size={26} className="text-white"/>,
    tags: ['Autismo', 'TEA', 'Triagem'],
    applyPath: '/caixa-ferramentas/m-chat-r',
    viewPath: '/caixa-ferramentas/m-chat-r',
    applyColor: 'bg-teal-600 hover:bg-teal-700',
  },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
type ViewType = 'hub' | 'disc' | 'dass' | 'bdi' | 'bai' | 'snap' | 'mchat';

export const Instruments: React.FC = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [view, setView] = useState<ViewType>('hub');
  const [stats, setStats] = useState<Record<string, number>>({ disc: 0, dass: 0, bdi: 0, bai: 0, snap: 0, mchat: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [disc, dass] = await Promise.all([
          api.get<any[]>('/disc').catch(() => []),
          api.get<any[]>('/clinical-tools/dass-all').catch(() => []),
        ]);
        
        // As outras rotas podem não retornar tudo de uma vez, mas podemos tentar buscar por pacientes ou deixar em 0 por enquanto
        // se as rotas específicas não existirem no backend agregadas.
        // Contudo, se DISC/DASS estão funcionando, vamos focar nelas e tentar inferir as outras se possível.
        
        const uniqueDisc = new Set((disc || []).map((r: any) => r.patient_id)).size;
        
        setStats(prev => ({
          ...prev,
          disc: uniqueDisc,
          dass: (dass || []).length
        }));
      } catch (e) {}
    };
    fetchStats();
  }, []);

  if (view === 'disc') return <DiscView onBack={() => setView('hub')}/>;
  if (view === 'dass') return <DassView onBack={() => setView('hub')}/>;

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fadeIn">
      <PageHeader
        icon={<Radar/>}
        title="Instrumentos Psicológicos"
        subtitle="DISC, DASS-21 e instrumentos padronizados"
      />

      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-[28px] p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}/>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
            <Brain size={28}/>
          </div>
          <div className="flex-1">
            <h2 className="font-black text-xl mb-1">Avaliação Psicológica Padronizada</h2>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-xl">
              Aplique instrumentos psicométricos validados e acompanhe os resultados dos pacientes com gráficos e histórico longitudinal.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="bg-white/20 border border-white/30 rounded-2xl px-4 py-2 text-center">
              <div className="font-black text-2xl">{stats.disc}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">DISC</div>
            </div>
            <div className="bg-white/20 border border-white/30 rounded-2xl px-4 py-2 text-center">
              <div className="font-black text-2xl">{stats.dass}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">DASS-21</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instrument cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INSTRUMENTS_CONFIG.map(inst => {
          const count = stats[inst.id] || 0;
          const handleView = () => {
            if (inst.viewPath) {
              navigate(inst.viewPath);
            } else {
              setView(inst.id as ViewType);
            }
          };

          return (
            <div key={inst.id}
              className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
              onClick={handleView}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${inst.gradient} p-6`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                    {inst.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-xl leading-tight">{inst.title}</h3>
                    <p className="text-white/80 text-xs font-bold mt-0.5">{inst.subtitle}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                       {inst.tags.map(tag => (
                         <span key={tag} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">{tag}</span>
                       ))}
                    </div>
                  </div>
                  <div className="bg-white/20 border border-white/30 rounded-2xl px-3 py-2 text-center shrink-0">
                    <div className="font-black text-white text-xl">{count}</div>
                    <div className="text-[9px] text-white/80 font-bold uppercase">pacientes</div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{inst.description}</p>

                <div className="flex gap-3">
                  <button onClick={e => { e.stopPropagation(); navigate(inst.applyPath); }}
                    className={`flex-1 h-11 rounded-2xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${inst.applyColor} text-white shadow-md`}>
                    <Plus size={13}/> Aplicar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleView(); }}
                    className="flex-1 h-11 rounded-2xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100">
                    <BarChart2 size={13}/> Ver Resultados <ChevronRight size={12}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[28px] p-8 text-center">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
          <Zap size={24} className="text-slate-300"/>
        </div>
        <h3 className="font-black text-slate-500 text-sm uppercase tracking-widest mb-1">Mais Instrumentos em Breve</h3>
        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
          M-CHAT-R/F, SNAP-IV, BDI-II, BAI e outros instrumentos serão adicionados progressivamente.
        </p>
      </div>
    </div>
  );
};
