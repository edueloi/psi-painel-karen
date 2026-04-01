import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/UI/PageHeader';
import {
  Radar, Activity, ChevronRight, ArrowLeft, Users, Calendar,
  Plus, Loader2, BarChart2, TrendingUp, AlertTriangle, CheckCircle2,
  Brain, Zap, Search, Clock, Hash, ArrowRight, FileText
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

/* ─── Patient Row ───────────────────────────────────────────── */
interface PatientRowProps {
  avatar: string;
  name: string;
  date: string;
  sessions: number;
  accentClass: string;
  extra?: React.ReactNode;
  avgTime?: number | null;
  onOpen: () => void;
}
const PatientRow: React.FC<PatientRowProps> = ({ avatar, name, date, sessions, accentClass, extra, avgTime, onOpen }) => (
  <div className={`group flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer`} onClick={onOpen}>
    <div className={`w-11 h-11 rounded-2xl ${accentClass} flex items-center justify-center font-black text-base shrink-0`}>
      {avatar}
    </div>
    <div className="flex-1 min-w-0 space-y-1">
      <p className="font-black text-slate-800 text-sm truncate">{name}</p>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold">
        <span className="flex items-center gap-1"><Calendar size={9}/> {date}</span>
        <span className="flex items-center gap-1"><Hash size={9}/> {sessions} resposta{sessions !== 1 ? 's' : ''}</span>
        {avgTime != null && (
          <span className="flex items-center gap-1"><Clock size={9}/> {fmtTime(avgTime)}</span>
        )}
      </div>
      {extra && <div className="flex flex-wrap gap-1.5 pt-0.5">{extra}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-black">
        {sessions}
      </div>
      <button className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 flex items-center justify-center transition shrink-0">
        <ArrowRight size={13}/>
      </button>
    </div>
  </div>
);

/* ─── Search box ─────────────────────────────────────────────── */
const SearchBox: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="relative">
    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    <input
      className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:border-indigo-300 font-medium"
      placeholder="Buscar paciente..." value={value} onChange={e => onChange(e.target.value)}
    />
  </div>
);

/* ─── View Header ────────────────────────────────────────────── */
const ViewHeader: React.FC<{
  onBack: () => void;
  title: string;
  subtitle: string;
  applyLabel: string;
  applyColor: string;
  applyPath: string;
}> = ({ onBack, title, subtitle, applyLabel, applyColor, applyPath }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase transition shrink-0">
        <ArrowLeft size={14}/> Voltar
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="font-black text-slate-800 text-xl truncate">{title}</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
      </div>
      <button onClick={() => navigate(applyPath)}
        className={`shrink-0 h-10 px-5 ${applyColor} text-white rounded-xl font-black text-xs uppercase hover:opacity-90 transition flex items-center gap-2 shadow`}>
        <Plus size={14}/> {applyLabel}
      </button>
    </div>
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
    <div className="space-y-6 animate-fadeIn">
      <ViewHeader
        onBack={onBack}
        title="DISC — Perfil Comportamental"
        subtitle={`${patientMap.length} paciente${patientMap.length !== 1 ? 's' : ''} · ${results.length} avaliação${results.length !== 1 ? 'ões' : ''} total`}
        applyLabel="Aplicar DISC"
        applyColor="bg-indigo-600"
        applyPath="/caixa-ferramentas/disc-avaliativo"
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-indigo-400 animate-spin"/></div>
      ) : patientMap.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center shadow-sm">
          <Radar size={32} className="text-slate-200 mx-auto mb-4"/>
          <p className="font-bold text-slate-400">Nenhuma avaliação DISC ainda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest mb-4">Médias por Dimensão</p>
              <ResponsiveContainer width="100%" height={180}>
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
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest mb-4">Radar Médio DISC</p>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14, fontWeight: 700 }}/>
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }}/>
                  <RadarPlot dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest">Pacientes Avaliados</p>
              <SearchBox value={search} onChange={setSearch}/>
            </div>
            <div className="space-y-2">
              {filtered.map(({ latest: r, count }) => (
                <PatientRow
                  key={r.id}
                  avatar={(r.patient_name || '?')[0].toUpperCase()}
                  name={r.patient_name}
                  date={fmtDate(r.created_at)}
                  sessions={count}
                  accentClass="bg-indigo-100 text-indigo-600"
                  onOpen={() => navigate(`/caixa-ferramentas/disc-avaliativo?patient_id=${r.patient_id}`)}
                  extra={
                    <div className="flex items-end gap-2">
                      {(['D','I','S','C'] as const).map(dim => {
                        const key = `score_${dim.toLowerCase()}` as keyof DiscResult;
                        const val = (r[key] as number) || 0;
                        return (
                          <div key={dim} className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-black" style={{ color: DISC_COLORS[dim] }}>{val.toFixed(1)}</span>
                            <div className="w-5 bg-slate-100 rounded-full overflow-hidden" style={{ height: 28 }}>
                              <div className="w-full rounded-full" style={{
                                height: `${(val/5)*100}%`,
                                background: DISC_COLORS[dim],
                                marginTop: `${100-(val/5)*100}%`
                              }}/>
                            </div>
                            <span className="text-[9px] font-black text-slate-400">{dim}</span>
                          </div>
                        );
                      })}
                    </div>
                  }
                />
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
    <div className="space-y-6 animate-fadeIn">
      <ViewHeader
        onBack={onBack}
        title="DASS-21 — Depressão, Ansiedade e Estresse"
        subtitle={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} avaliado${patients.length !== 1 ? 's' : ''}`}
        applyLabel="Aplicar DASS-21"
        applyColor="bg-rose-600"
        applyPath="/caixa-ferramentas/dass-21"
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-rose-400 animate-spin"/></div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center shadow-sm">
          <Activity size={32} className="text-slate-200 mx-auto mb-4"/>
          <p className="font-bold text-slate-400">Nenhuma avaliação DASS-21 ainda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest mb-4">Distribuição de Severidade</p>
              <ResponsiveContainer width="100%" height={180}>
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
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-2.5">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest mb-1">Legenda de Severidade</p>
              {[
                { label: 'Normal',      color: 'bg-emerald-500', dep: '0-9',   anx: '0-7',  str: '0-14' },
                { label: 'Leve',        color: 'bg-amber-500',   dep: '10-13', anx: '8-9',  str: '15-18' },
                { label: 'Moderado',    color: 'bg-orange-500',  dep: '14-20', anx: '10-14',str: '19-25' },
                { label: 'Grave',       color: 'bg-rose-500',    dep: '21-27', anx: '15-19',str: '26-33' },
                { label: 'Muito Grave', color: 'bg-red-600',     dep: '28+',   anx: '20+',  str: '34+' },
              ].map(({ label, color, dep, anx, str }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}/>
                  <span className="font-black text-slate-700 text-xs w-20">{label}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Dep {dep} · Ans {anx} · Est {str}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest">Pacientes Avaliados</p>
              <SearchBox value={search} onChange={setSearch}/>
            </div>
            <div className="space-y-2">
              {filtered.map(p => (
                <PatientRow
                  key={p.patient_id}
                  avatar={(p.patient_name || '?')[0].toUpperCase()}
                  name={p.patient_name}
                  date={fmtDate(p.last_date)}
                  sessions={p.sessions}
                  accentClass="bg-rose-100 text-rose-600"
                  avgTime={avgTimeForPatient(p)}
                  onOpen={() => navigate(`/caixa-ferramentas/dass-21?patient_id=${p.patient_id}`)}
                  extra={p.last_scores ? (
                    <>
                      {(['Depression','Anxiety','Stress'] as const).map(sub => {
                        const labels: Record<string,string> = { Depression: 'Dep', Anxiety: 'Ans', Stress: 'Est' };
                        return (
                          <span key={sub} className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold">{labels[sub]}</span>
                            <ScoreBadge val={p.last_scores![sub]} sub={sub}/>
                          </span>
                        );
                      })}
                    </>
                  ) : undefined}
                />
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
   GENERIC RESULTS VIEW (BDI, BAI, SNAP-IV, M-CHAT)
═══════════════════════════════════════════════════════════ */
interface GenericViewProps {
  onBack: () => void;
  title: string;
  applyLabel: string;
  applyColor: string;
  applyPath: string;
  resultPath: string;
  endpoint: string;
  accentClass: string;
  spinColor: string;
  emptyIcon: React.ReactNode;
  scoreLabel?: string;
}
const GenericView: React.FC<GenericViewProps> = ({
  onBack, title, applyLabel, applyColor, applyPath, resultPath,
  endpoint, accentClass, spinColor, emptyIcon, scoreLabel = 'Score'
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
    <div className="space-y-6 animate-fadeIn">
      <ViewHeader
        onBack={onBack}
        title={title}
        subtitle={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} avaliado${patients.length !== 1 ? 's' : ''} · ${raw.length} resultado${raw.length !== 1 ? 's' : ''}`}
        applyLabel={applyLabel}
        applyColor={applyColor}
        applyPath={applyPath}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className={`${spinColor} animate-spin`}/></div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center shadow-sm">
          <div className="opacity-20 mx-auto mb-4 w-8 h-8 flex items-center justify-center">{emptyIcon}</div>
          <p className="font-bold text-slate-400">Nenhuma avaliação {title} ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="font-black text-slate-700 text-[10px] uppercase tracking-widest">Pacientes</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{patients.length}</span>
            </div>
            <SearchBox value={search} onChange={setSearch}/>
          </div>
          <div className="space-y-2">
            {filtered.map(p => (
              <PatientRow
                key={String(p.patient_id)}
                avatar={(p.patient_name || '?')[0].toUpperCase()}
                name={p.patient_name}
                date={fmtDate(p.last_date || '')}
                sessions={p.sessions || 1}
                accentClass={accentClass}
                onOpen={() => navigate(`${resultPath}?patient_id=${p.patient_id}`)}
                extra={p.last_score != null ? (
                  <span className="text-[10px] font-black text-slate-500">
                    {scoreLabel}: <span className="text-slate-800">{p.last_score}</span>
                  </span>
                ) : undefined}
              />
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-400 text-xs font-medium py-6">Nenhum paciente encontrado.</p>}
          </div>
        </div>
      )}
    </div>
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
    gradient: 'from-indigo-600 to-violet-700',
    icon: <Radar size={22} className="text-white"/>,
    tags: ['Comportamento', 'Perfil'],
    applyPath: '/caixa-ferramentas/disc-avaliativo',
    applyColor: 'bg-indigo-600 hover:bg-indigo-700',
    viewId: 'disc',
  },
  {
    id: 'dass',
    title: 'DASS-21',
    subtitle: 'Depressão, Ansiedade e Estresse',
    description: 'Rastreio de sintomas com classificação de severidade em três subescalas clínicas validadas.',
    gradient: 'from-rose-500 to-pink-600',
    icon: <Activity size={22} className="text-white"/>,
    tags: ['Saúde Mental', 'Rastreio'],
    applyPath: '/caixa-ferramentas/dass-21',
    applyColor: 'bg-rose-600 hover:bg-rose-700',
    viewId: 'dass',
  },
  {
    id: 'bdi',
    title: 'BDI-II',
    subtitle: 'Inventário de Depressão de Beck',
    description: 'Padrão ouro para avaliação da presença e intensidade de sintomas depressivos.',
    gradient: 'from-amber-500 to-orange-600',
    icon: <Brain size={22} className="text-white"/>,
    tags: ['Depressão', 'Beck'],
    applyPath: '/caixa-ferramentas/bdi-ii',
    applyColor: 'bg-amber-600 hover:bg-amber-700',
    viewId: 'bdi',
  },
  {
    id: 'bai',
    title: 'BAI',
    subtitle: 'Inventário de Ansiedade de Beck',
    description: 'Mensura intensidade de sintomas de ansiedade, incluindo componentes autonômicos e somáticos.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: <Zap size={22} className="text-white"/>,
    tags: ['Ansiedade', 'Beck'],
    applyPath: '/caixa-ferramentas/bai',
    applyColor: 'bg-emerald-600 hover:bg-emerald-700',
    viewId: 'bai',
  },
  {
    id: 'snap',
    title: 'SNAP-IV',
    subtitle: 'Rastreio de TDAH',
    description: 'Escala para avaliação de desatenção, hiperatividade e comportamento opositor desafiador.',
    gradient: 'from-blue-600 to-sky-700',
    icon: <BarChart2 size={22} className="text-white"/>,
    tags: ['TDAH', 'Infantil'],
    applyPath: '/caixa-ferramentas/snap-iv',
    applyColor: 'bg-blue-600 hover:bg-blue-700',
    viewId: 'snap',
  },
  {
    id: 'mchat',
    title: 'M-CHAT-R/F',
    subtitle: 'Triagem para Autismo (TEA)',
    description: 'Triagem precoce para sinais de autismo em crianças de 16 a 30 meses. Alta sensibilidade.',
    gradient: 'from-purple-500 to-fuchsia-600',
    icon: <CheckCircle2 size={22} className="text-white"/>,
    tags: ['Autismo', 'TEA'],
    applyPath: '/caixa-ferramentas/m-chat-r',
    applyColor: 'bg-purple-600 hover:bg-purple-700',
    viewId: 'mchat',
  },
];

type ViewType = 'hub' | 'disc' | 'dass' | 'bdi' | 'bai' | 'snap' | 'mchat';

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
  const genericConfigs: Record<string, Omit<GenericViewProps, 'onBack'>> = {
    bdi: {
      title: 'BDI-II — Inventário de Depressão',
      applyLabel: 'Aplicar BDI-II',
      applyColor: 'bg-amber-600',
      applyPath: '/caixa-ferramentas/bdi-ii',
      resultPath: '/caixa-ferramentas/bdi-ii',
      endpoint: '/clinical-tools/bdi-ii/all',
      accentClass: 'bg-amber-100 text-amber-700',
      spinColor: 'text-amber-400',
      emptyIcon: <Brain size={32}/>,
      scoreLabel: 'Total',
    },
    bai: {
      title: 'BAI — Inventário de Ansiedade',
      applyLabel: 'Aplicar BAI',
      applyColor: 'bg-emerald-600',
      applyPath: '/caixa-ferramentas/bai',
      resultPath: '/caixa-ferramentas/bai',
      endpoint: '/clinical-tools/bai/all',
      accentClass: 'bg-emerald-100 text-emerald-700',
      spinColor: 'text-emerald-400',
      emptyIcon: <Zap size={32}/>,
      scoreLabel: 'Total',
    },
    snap: {
      title: 'SNAP-IV — Rastreio de TDAH',
      applyLabel: 'Aplicar SNAP-IV',
      applyColor: 'bg-blue-600',
      applyPath: '/caixa-ferramentas/snap-iv',
      resultPath: '/caixa-ferramentas/snap-iv',
      endpoint: '/clinical-tools/snap-iv/all',
      accentClass: 'bg-blue-100 text-blue-700',
      spinColor: 'text-blue-400',
      emptyIcon: <BarChart2 size={32}/>,
    },
    mchat: {
      title: 'M-CHAT-R/F — Triagem TEA',
      applyLabel: 'Aplicar M-CHAT',
      applyColor: 'bg-purple-600',
      applyPath: '/caixa-ferramentas/m-chat-r',
      resultPath: '/caixa-ferramentas/m-chat-r',
      endpoint: '/clinical-tools/m-chat-r/all',
      accentClass: 'bg-purple-100 text-purple-700',
      spinColor: 'text-purple-400',
      emptyIcon: <CheckCircle2 size={32}/>,
    },
  };

  if (view === 'disc') return <DiscView onBack={() => setView('hub')}/>;
  if (view === 'dass') return <DassView onBack={() => setView('hub')}/>;
  if (['bdi','bai','snap','mchat'].includes(view)) {
    const cfg = genericConfigs[view];
    return <GenericView onBack={() => setView('hub')} {...cfg}/>;
  }

  const totalPatients = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fadeIn">
      <PageHeader
        icon={<Radar/>}
        title="Instrumentos Psicológicos"
        subtitle="Escalas e inventários clínicos padronizados"
      />

      {/* Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #4f46e5 0%, transparent 50%), radial-gradient(circle at 80% 50%, #701a75 0%, transparent 50%)' }}/>
        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center shrink-0 border border-white/20 backdrop-blur-xl shadow-inner">
            <Brain size={40} className="text-indigo-300"/>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-black mb-1.5 tracking-tight">Hub de Instrumentos <span className="text-indigo-400">PsiFlux</span></h2>
            <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-2xl">
              Centralize escalas psicométricas e inventários clínicos. Acompanhe a evolução longitudinal com análise assistida por IA.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-black text-indigo-400">{INSTRUMENTS_CONFIG.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Instrumentos</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-black text-rose-400">{totalPatients}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Pacientes</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-black text-emerald-400">{stats.disc + stats.dass + stats.bdi + stats.bai}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Ativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instrument cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {INSTRUMENTS_CONFIG.map(inst => {
          const count = stats[inst.id] || 0;
          return (
            <div key={inst.id}
              className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
              onClick={() => setView(inst.viewId as ViewType)}
            >
              <div className={`h-1.5 bg-gradient-to-r ${inst.gradient}`}/>

              <div className="p-6 flex-1 flex flex-col gap-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${inst.gradient} rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {inst.icon}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2 text-center min-w-[56px]">
                    <div className="text-lg font-black text-slate-800 tabular-nums">{count}</div>
                    <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-tight">pacientes</div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-black text-slate-800 text-lg tracking-tight leading-tight">{inst.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-0.5 mb-2" style={{ color: `var(--tw-gradient-from, #6366f1)` }}>
                    {inst.subtitle}
                  </p>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">{inst.description}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {inst.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">{tag}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(inst.applyPath); }}
                    className={`flex-1 h-10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${inst.applyColor} text-white shadow-sm`}
                  >
                    <Plus size={13}/> Aplicar
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setView(inst.viewId as ViewType); }}
                    className="flex-1 h-10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  >
                    <FileText size={13}/> Resultados
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
