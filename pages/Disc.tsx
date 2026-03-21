import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Brain, Users, Share2, Trash2, Sparkles, ChevronRight, ChevronDown,
  Copy, CheckCircle, Calendar, AlertCircle, Info,
  MessageCircle, ExternalLink, Target, Zap, Shield, Star, X,
  Mail, Filter, TrendingUp, BookOpen, Clock, User,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/UI/Button';
import { Combobox } from '../components/UI/Combobox';
import { Modal } from '../components/UI/Modal';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

// ─── Types ──────────────────────────────────────────────────────────────────
interface DiscResult {
  id: string;
  patient_id?: string | null;
  patient_name: string;
  respondent_name?: string;
  respondent_email?: string;
  answers: Record<string, string>;
  score_total: number;
  score_d: number;
  score_i: number;
  score_s: number;
  score_c: number;
  aurora_analysis?: string | null;
  notes?: string | null;
  created_at: string;
}

interface DiscForm { id: string; title: string; hash: string; }
interface Patient { id: string; name?: string; full_name?: string; status?: string; email?: string; }

// ─── Constants ───────────────────────────────────────────────────────────────
const BLOCK_CONFIG = {
  D: { label: 'Dominância',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <Zap size={14} />,    desc: 'Direto, assertivo, orientado a resultado e ação', marston: 'Como a pessoa reage a problemas e desafios' },
  I: { label: 'Influência',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Star size={14} />,   desc: 'Comunicativo, caloroso, persuasivo e social', marston: 'Como a pessoa influencia e se relaciona com pessoas' },
  S: { label: 'Estabilidade', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <Shield size={14} />, desc: 'Estável, acolhedor, paciente, resistente a mudanças', marston: 'Como a pessoa reage ao ritmo e às mudanças do ambiente' },
  C: { label: 'Conformidade', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <Target size={14} />, desc: 'Analítico, cuidadoso, organizado, crítico', marston: 'Como a pessoa reage a regras e procedimentos' },
} as const;

const FACTOR_DETAILS: Record<string, { beliefs: string[]; attention: string[]; tcc: string[]; strengths: string[] }> = {
  D: {
    tcc: ['Impaciência', 'Necessidade de controle', 'Baixa tolerância à frustração'],
    beliefs: ['"Preciso resolver isso agora."', '"Se eu não assumir, nada vai funcionar."', '"Demonstrar fraqueza é perigoso."'],
    attention: ['Irritabilidade', 'Impulsividade', 'Autocobrança por desempenho', 'Conflito interpessoal'],
    strengths: ['Determinação', 'Liderança natural', 'Foco em resultados', 'Assertividade'],
  },
  I: {
    tcc: ['Busca de validação', 'Necessidade de aprovação', 'Sensibilidade à rejeição'],
    beliefs: ['"Preciso ser aceito(a)."', '"Se não gostarem de mim, há algo errado comigo."', '"Preciso manter o clima bom."'],
    attention: ['Dependência de validação externa', 'Dificuldade em colocar limites', 'Oscilação emocional'],
    strengths: ['Comunicação', 'Entusiasmo', 'Empatia', 'Capacidade de inspirar'],
  },
  S: {
    tcc: ['Evitação de conflito', 'Medo de ruptura', 'Dificuldade de mudança'],
    beliefs: ['"É melhor evitar problema."', '"Mudanças podem dar errado."', '"Preciso manter tudo em paz."'],
    attention: ['Passividade', 'Medo de desagradar', 'Permanência em contextos ruins por segurança'],
    strengths: ['Paciência', 'Lealdade', 'Consistência', 'Acolhimento'],
  },
  C: {
    tcc: ['Perfeccionismo', 'Excesso de análise', 'Medo de errar', 'Procrastinação'],
    beliefs: ['"Não posso errar."', '"Preciso ter certeza antes."', '"Só posso agir quando estiver perfeito."'],
    attention: ['Ansiedade', 'Ruminação', 'Padrões inflexíveis', 'Autocrítica elevada'],
    strengths: ['Precisão', 'Organização', 'Pensamento crítico', 'Qualidade'],
  },
};

const COMBINED_PROFILES: Record<string, string> = {
  'DI': 'Ativa, persuasiva, intensa, rápida e social. Pode ter impulsividade e dificuldade em desacelerar.',
  'ID': 'Ativa, persuasiva, intensa, rápida e social. Pode ter impulsividade e dificuldade em desacelerar.',
  'DC': 'Exigente, estratégica, controladora e focada em alto padrão. Pode ter perfeccionismo e rigidez.',
  'CD': 'Exigente, estratégica, controladora e focada em alto padrão. Pode ter perfeccionismo e rigidez.',
  'IS': 'Acolhedora, sociável, gentil e relacional. Pode se anular para agradar e evitar conflito.',
  'SI': 'Acolhedora, sociável, gentil e relacional. Pode se anular para agradar e evitar conflito.',
  'IC': 'Comunicativa, mas sensível à crítica e preocupada com imagem. Pode oscilar entre espontaneidade e autocensura.',
  'CI': 'Comunicativa, mas sensível à crítica e preocupada com imagem. Pode oscilar entre espontaneidade e autocensura.',
  'SC': 'Cuidadosa, estável, organizada e reservada. Pode ter dificuldade com mudanças e excesso de cautela.',
  'CS': 'Cuidadosa, estável, organizada e reservada. Pode ter dificuldade com mudanças e excesso de cautela.',
  'DS': 'Firme, protetora e constante. Pode assumir responsabilidades demais e sofrer com sobrecarga.',
  'SD': 'Firme, protetora e constante. Pode assumir responsabilidades demais e sofrer com sobrecarga.',
};

function getLevel(avg: number): { label: string; color: string } {
  if (avg >= 3.5) return { label: 'Forte', color: '#16a34a' };
  if (avg >= 2.5) return { label: 'Moderado', color: '#d97706' };
  return { label: 'Baixo', color: '#94a3b8' };
}

function getTopFactors(r: DiscResult) {
  return (['D', 'I', 'S', 'C'] as const)
    .map(k => ({ key: k, val: r[`score_${k.toLowerCase()}` as keyof DiscResult] as number }))
    .sort((a, b) => b.val - a.val);
}

function getCurrentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ─── Radar Chart SVG ─────────────────────────────────────────────────────────
function DiscRadarChart({ d, i, s, c }: { d: number; i: number; s: number; c: number }) {
  const cx_ = 130;
  const cy_ = 130;
  const maxR = 85;

  const axes = [
    { key: 'D', angle: -90, val: d, color: '#dc2626', label: 'Dominância' },
    { key: 'I', angle: 0,   val: i, color: '#d97706', label: 'Influência' },
    { key: 'S', angle: 90,  val: s, color: '#16a34a', label: 'Estabilidade' },
    { key: 'C', angle: 180, val: c, color: '#2563eb', label: 'Conformidade' },
  ];

  const toXY = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return [cx_ + r * Math.cos(rad), cy_ + r * Math.sin(rad)] as [number, number];
  };

  const levels = [1, 2, 3, 4, 5];
  const polygon = axes.map(a => {
    const r = (a.val / 5) * maxR;
    const [x, y] = toXY(a.angle, r);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="-30 -40 320 340" width="100%" style={{ maxWidth: 260, overflow: 'visible' }}>
      {/* Grid polygons */}
      {levels.map(lv => (
        <polygon
          key={lv}
          points={axes.map(a => { const [x, y] = toXY(a.angle, (lv / 5) * maxR); return `${x},${y}`; }).join(' ')}
          fill={lv % 2 === 0 ? 'rgba(241,245,249,0.6)' : 'none'}
          stroke={lv === 5 ? '#cbd5e1' : '#e2e8f0'}
          strokeWidth={lv === 5 ? 1.5 : 1}
        />
      ))}
      {/* Level numbers on D axis */}
      {levels.map(lv => {
        const [x, y] = toXY(-90, (lv / 5) * maxR);
        return <text key={lv} x={x + 5} y={y + 1} fontSize="8" fill="#94a3b8" fontWeight="600">{lv}</text>;
      })}
      {/* Axis lines */}
      {axes.map(a => {
        const [x, y] = toXY(a.angle, maxR);
        return <line key={a.key} x1={cx_} y1={cy_} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4,3" />;
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill="rgba(37,99,235,0.10)" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />
      {/* Data points */}
      {axes.map(a => {
        const r = (a.val / 5) * maxR;
        const [x, y] = toXY(a.angle, r);
        return (
          <g key={a.key}>
            <circle cx={x} cy={y} r={7} fill={a.color} fillOpacity={0.15} stroke={a.color} strokeWidth={1.5} />
            <circle cx={x} cy={y} r={4} fill={a.color} stroke="#fff" strokeWidth={2} />
          </g>
        );
      })}
      {/* Axis labels */}
      {axes.map(a => {
        const [lx, ly] = toXY(a.angle, maxR + 20);
        const [vx, vy] = toXY(a.angle, maxR + 35);
        return (
          <g key={a.key}>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={900} fill={a.color}>{a.key}</text>
            <text x={vx} y={vy} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#475569" fontWeight={700}>{a.val.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function DiscBarChart({ d, i, s, c }: { d: number; i: number; s: number; c: number }) {
  const scores = [
    { key: 'D', val: d, ...BLOCK_CONFIG.D },
    { key: 'I', val: i, ...BLOCK_CONFIG.I },
    { key: 'S', val: s, ...BLOCK_CONFIG.S },
    { key: 'C', val: c, ...BLOCK_CONFIG.C },
  ];
  return (
    <div className="space-y-4 w-full">
      {scores.map(s_ => {
        const pct = Math.round(((s_.val - 1) / 4) * 100);
        const lv = getLevel(s_.val);
        return (
          <div key={s_.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span style={{ background: s_.bg, color: s_.color, borderColor: s_.border }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wide">
                  {s_.key} — {s_.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: lv.color }}>{lv.label}</span>
                <span className="text-lg font-black leading-none" style={{ color: s_.color }}>{s_.val.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${s_.color}99, ${s_.color})` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{s_.desc}</p>
          </div>
        );
      })}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Escala:</p>
        {[['1.0–2.4','Baixo','#94a3b8'],['2.5–3.4','Moderado','#d97706'],['3.5–5.0','Forte','#16a34a']].map(([r,l,c]) => (
          <span key={l} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c + '20', color: c }}>{r} — {l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Mini bars ──────────────────────────────────────────────────────────────
function MiniDiscBars({ r }: { r: DiscResult }) {
  return (
    <div className="flex gap-1.5 items-end" style={{ height: 32 }}>
      {(['D', 'I', 'S', 'C'] as const).map(k => {
        const val = r[`score_${k.toLowerCase()}` as keyof DiscResult] as number;
        const h = Math.max(6, Math.round(((val - 1) / 4) * 26));
        return (
          <div key={k} className="flex flex-col items-center gap-0.5">
            <div style={{ height: h, width: 9, background: BLOCK_CONFIG[k].color, borderRadius: 3 }} />
            <span style={{ fontSize: 8, color: BLOCK_CONFIG[k].color, fontWeight: 900 }}>{k}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Badge ────────────────────────────────────────────────────────────
function ScoreBadge({ k, val }: { k: 'D'|'I'|'S'|'C'; val: number; key?: React.Key }) {
  const cfg = BLOCK_CONFIG[k];
  const lv = getLevel(val);
  return (
    <div className="text-center px-3 py-2 rounded-xl" style={{ background: cfg.bg }}>
      <p className="text-xl font-black leading-none" style={{ color: cfg.color }}>{val.toFixed(1)}</p>
      <p className="text-[9px] font-black mt-0.5" style={{ color: cfg.color }}>{k}</p>
      <p className="text-[8px] font-bold mt-0.5" style={{ color: lv.color }}>{lv.label}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Disc() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultRange = getCurrentMonthRange();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    searchParams.get('patientId') || (preferences as any).disc?.selectedPatientId || ''
  );
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [discForm, setDiscForm] = useState<DiscForm | null>(null);
  const [results, setResults] = useState<DiscResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePatientId, setSharePatientId] = useState('');
  const [shareTab, setShareTab] = useState<'public' | 'patient'>('public');
  const [copied, setCopied] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  // Aurora
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiMap, setAiMap] = useState<Record<string, string>>({});

  // Manual modal
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    api.get<any[]>('/patients').then(data => setPatients(data || [])).catch(() => {});
    api.get<DiscForm>('/disc/form').then(f => { if (f) setDiscForm(f); }).catch(() => {});
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedPatientId ? `/disc?patient_id=${selectedPatientId}` : '/disc';
      const data = await api.get<DiscResult[]>(url);
      setResults(data || []);
      const map: Record<string, string> = {};
      (data || []).forEach(r => { if (r.aurora_analysis) map[r.id] = r.aurora_analysis; });
      setAiMap(prev => ({ ...prev, ...map }));
    } catch {
      showToast('Erro ao carregar avaliações DISC', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => { loadResults(); }, [loadResults]);

  // Filter by date client-side
  const filteredResults = results.filter(r => {
    const d = r.created_at.slice(0, 10);
    return d >= dateFrom && d <= dateTo;
  });

  const handlePatientChange = (val: string) => {
    setSelectedPatientId(val);
    updatePreference('disc' as any, { selectedPatientId: val });
    setExpandedId(null);
  };

  const getShareLink = () => {
    if (!discForm) return '';
    const base = `${window.location.origin}/f/${discForm.hash}`;
    const params = new URLSearchParams();
    if (shareTab === 'patient' && sharePatientId) params.set('p', sharePatientId);
    if (user?.shareToken) params.set('u', user.shareToken);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareLink()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    const link = getShareLink();
    const msg = encodeURIComponent(`Olá! Gostaria que você respondesse ao Questionário DISC (avaliação de perfil comportamental). Acesse pelo link: ${link}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    try {
      await api.delete(`/disc/${deleteModal.id}`);
      setResults(prev => prev.filter(r => r.id !== deleteModal.id));
      if (expandedId === deleteModal.id) setExpandedId(null);
      setDeleteModal({ open: false, id: null });
      showToast('Avaliação excluída', 'success');
    } catch {
      showToast('Erro ao excluir', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const generateAurora = async (result: DiscResult) => {
    setAnalyzingId(result.id);
    try {
      const scores = { D: result.score_d, I: result.score_i, S: result.score_s, C: result.score_c };
      const top = getTopFactors(result);
      const resp = await api.post<any>('/ai/analyze-form', {
        formTitle: 'DISC Adaptado para TCC',
        respondentName: result.patient_name,
        answers: result.answers,
        score: result.score_total,
        interpretations: [
          { resultTitle: 'Dominância',   description: `Média D: ${scores.D.toFixed(2)} — ${getLevel(scores.D).label}` },
          { resultTitle: 'Influência',   description: `Média I: ${scores.I.toFixed(2)} — ${getLevel(scores.I).label}` },
          { resultTitle: 'Estabilidade', description: `Média S: ${scores.S.toFixed(2)} — ${getLevel(scores.S).label}` },
          { resultTitle: 'Conformidade', description: `Média C: ${scores.C.toFixed(2)} — ${getLevel(scores.C).label}` },
        ],
        patientData: patients.find(p => String(p.id) === String(result.patient_id)),
        discScores: scores,
        dominantFactors: top.slice(0, 2).map(t => `${t.key} (${t.val.toFixed(2)})`).join(' + '),
        methodology: 'DISC de William Moulton Marston — avalia como a pessoa reage a desafios (D), influencia pessoas (I), lida com mudanças (S) e segue regras (C). Escala 1–5, média por bloco.',
      });

      const clean = (resp.analysis || '')
        .replace(/```markdown/g, '').replace(/```/g, '').replace(/^##\s*/gm, '').trim();

      setAiMap(prev => ({ ...prev, [result.id]: clean }));
      await api.patch(`/disc/${result.id}/aurora`, { analysis: clean });
    } catch {
      showToast('Erro ao gerar análise Aurora', 'error');
    } finally {
      setAnalyzingId(null);
    }
  };

  const activePatients = patients.filter(p => p.status === 'ativo' || p.status === 'active');
  const patientOptions = activePatients.map(p => ({ id: p.id, label: p.full_name || p.name || '' }));

  // Stats
  const avgD = filteredResults.length ? filteredResults.reduce((s, r) => s + r.score_d, 0) / filteredResults.length : 0;
  const avgI = filteredResults.length ? filteredResults.reduce((s, r) => s + r.score_i, 0) / filteredResults.length : 0;
  const avgS = filteredResults.length ? filteredResults.reduce((s, r) => s + r.score_s, 0) / filteredResults.length : 0;
  const avgC = filteredResults.length ? filteredResults.reduce((s, r) => s + r.score_c, 0) / filteredResults.length : 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Brain size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">DISC</h1>
            <p className="text-sm text-slate-400 font-medium mt-0.5">Análise Comportamental — Metodologia Marston</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" radius="xl" leftIcon={<BookOpen size={15} />} onClick={() => setManualOpen(true)}>
            Manual de Uso
          </Button>
          <Button variant="outline" size="sm" radius="xl" leftIcon={<Share2 size={15} />}
            onClick={() => { setSharePatientId(selectedPatientId); setShareOpen(true); }}>
            Compartilhar DISC
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Combobox
              label="Filtrar por paciente"
              options={[{ id: '', label: 'Todos os pacientes' }, ...patientOptions]}
              value={selectedPatientId}
              onChange={val => handlePatientChange(String(val))}
              icon={<Users size={16} />}
              placeholder="Selecione um paciente..."
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">De</p>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Até</p>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="text-xs text-slate-400 whitespace-nowrap pb-2">
            <span className="font-black text-slate-700 text-base">{filteredResults.length}</span> avaliação{filteredResults.length !== 1 ? 'ões' : ''}
          </div>
        </div>
      </div>

      {/* Summary stats (when results exist) */}
      {filteredResults.length > 1 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={12} /> Médias do Período
          </p>
          <div className="grid grid-cols-4 gap-3">
            {([['D', avgD],['I', avgI],['S', avgS],['C', avgC]] as ['D'|'I'|'S'|'C', number][]).map(([k, v]) => (
              <ScoreBadge key={k} k={k} val={v} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredResults.length === 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-3xl p-8 text-center">
          <Brain size={40} className="mx-auto text-indigo-300 mb-4" />
          <h3 className="font-black text-slate-700 mb-1">Nenhuma avaliação neste período</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Compartilhe o link do DISC com seus pacientes. Quando responderem, os resultados aparecerão aqui com gráficos e análise completa por fator D/I/S/C.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="primary" size="sm" radius="xl" leftIcon={<Share2 size={14} />}
              onClick={() => { setSharePatientId(selectedPatientId); setShareOpen(true); }}>
              Compartilhar DISC agora
            </Button>
            <Button variant="ghost" size="sm" radius="xl" leftIcon={<Filter size={14} />}
              onClick={() => { const r = getCurrentMonthRange(); setDateFrom(r.from); setDateTo(r.to); }}>
              Mês atual
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Results list */}
      {!loading && (
        <div className="space-y-4">
          {filteredResults.map(result => {
            const top = getTopFactors(result);
            const dominant = top[0];
            const second = top[1];
            const profileKey = `${dominant.key}${second.key}`;
            const combinedProfile = COMBINED_PROFILES[profileKey];
            const isExpanded = expandedId === result.id;
            const aurora = aiMap[result.id] || result.aurora_analysis;
            const patient = patients.find(p => String(p.id) === String(result.patient_id));
            const initials = (result.patient_name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

            return (
              <div key={result.id}
                className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-all duration-200 ${isExpanded ? 'border-indigo-200 shadow-lg shadow-indigo-50' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}>

                {/* Card header */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer transition-colors hover:bg-slate-50/50"
                  onClick={() => setExpandedId(isExpanded ? null : result.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm text-white"
                    style={{ background: `linear-gradient(135deg, ${BLOCK_CONFIG[dominant.key].color}cc, ${BLOCK_CONFIG[second.key].color}cc)` }}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="font-black text-slate-900 text-sm hover:text-indigo-600 transition-colors flex items-center gap-1"
                        onClick={e => {
                          e.stopPropagation();
                          if (result.patient_id) navigate(`/pacientes?patientId=${result.patient_id}`);
                        }}
                      >
                        {result.patient_name}
                        {result.patient_id && <ExternalLink size={11} className="text-slate-300 hover:text-indigo-500" />}
                      </button>
                      <span style={{ background: BLOCK_CONFIG[dominant.key].bg, color: BLOCK_CONFIG[dominant.key].color, borderColor: BLOCK_CONFIG[dominant.key].border }}
                        className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border">
                        {dominant.key} dominante
                      </span>
                      {aurora && <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">✦ Aurora</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={10} className="text-slate-300" />
                      <p className="text-xs text-slate-400">{new Date(result.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {result.respondent_email && (
                        <span className="text-[10px] text-slate-300">· {result.respondent_email}</span>
                      )}
                    </div>
                  </div>

                  {/* Score badges */}
                  <div className="hidden sm:flex gap-2 shrink-0">
                    {(['D','I','S','C'] as const).map(k => {
                      const val = result[`score_${k.toLowerCase()}` as keyof DiscResult] as number;
                      return (
                        <div key={k} className="text-center w-10">
                          <p className="text-base font-black leading-none" style={{ color: BLOCK_CONFIG[k].color }}>{val.toFixed(1)}</p>
                          <p className="text-[9px] font-black text-slate-400 mt-0.5">{k}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mini bars (mobile) */}
                  <div className="flex sm:hidden shrink-0">
                    <MiniDiscBars r={result} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"
                      onClick={() => setDeleteModal({ open: true, id: result.id })}
                      title="Excluir avaliação"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronDown size={18} className={`text-slate-300 transition-transform duration-200${isExpanded ? ' rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 space-y-6">

                    {/* Score badges row */}
                    <div className="grid grid-cols-4 gap-3">
                      {(['D','I','S','C'] as const).map(k => (
                        <ScoreBadge key={k} k={k} val={result[`score_${k.toLowerCase()}` as keyof DiscResult] as number} />
                      ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50/70 rounded-2xl p-5 flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gráfico Radar</p>
                        <DiscRadarChart d={result.score_d} i={result.score_i} s={result.score_s} c={result.score_c} />
                      </div>
                      <div className="bg-slate-50/70 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Médias por Fator (1 – 5)</p>
                        <DiscBarChart d={result.score_d} i={result.score_i} s={result.score_s} c={result.score_c} />
                      </div>
                    </div>

                    {/* All 4 factor details */}
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Análise por Fator</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {top.map(({ key: k, val }) => {
                          const cfg = BLOCK_CONFIG[k];
                          const det = FACTOR_DETAILS[k];
                          const lv = getLevel(val);
                          return (
                            <div key={k} style={{ background: cfg.bg, borderColor: cfg.border }} className="rounded-2xl border p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                                  {k} — {cfg.label}
                                </p>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: lv.color + '20', color: lv.color }}>{lv.label}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mb-2 italic">{cfg.marston}</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {det.strengths.map(s => (
                                  <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-white border text-slate-600" style={{ borderColor: cfg.border }}>{s}</span>
                                ))}
                              </div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1">Na TCC pode aparecer como</p>
                              <div className="flex flex-wrap gap-1">
                                {det.tcc.map(t => (
                                  <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-white border border-slate-100 text-slate-500">{t}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Combined profile + attention */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                          Perfil Combinado — {dominant.key} + {second.key}
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed mb-3">
                          {combinedProfile || `Perfil com predominância em ${BLOCK_CONFIG[dominant.key].label} e ${BLOCK_CONFIG[second.key].label}.`}
                        </p>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wide mb-1">Crenças comuns</p>
                        {FACTOR_DETAILS[dominant.key].beliefs.map(b => (
                          <p key={b} className="text-xs text-slate-500 italic">{b}</p>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Pontos de Atenção Clínicos</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {[...FACTOR_DETAILS[dominant.key].attention, ...FACTOR_DETAILS[second.key].attention.slice(0, 2)].map(a => (
                            <span key={a} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-100 text-amber-700">{a}</span>
                          ))}
                        </div>
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-wide mb-1">Gatilhos comuns</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {dominant.key === 'D' && 'Lentidão, indecisão, perda de controle, incompetência alheia.'}
                          {dominant.key === 'I' && 'Rejeição, críticas, ambientes frios, isolamento social.'}
                          {dominant.key === 'S' && 'Mudanças bruscas, conflitos, pressão, imprevisibilidade.'}
                          {dominant.key === 'C' && 'Erros, desorganização, ambiguidade, falta de critério.'}
                        </p>
                      </div>
                    </div>

                    {/* Aurora Analysis */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-violet-600" />
                          <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Análise Clínica — Aurora IA</p>
                        </div>
                        <Button
                          size="xs" variant={aurora ? 'ghost' : 'primary'} radius="xl"
                          isLoading={analyzingId === result.id}
                          loadingText="Analisando..."
                          leftIcon={<Sparkles size={12} />}
                          onClick={() => generateAurora(result)}
                        >
                          {aurora ? 'Regenerar' : 'Gerar Análise'}
                        </Button>
                      </div>
                      {aurora ? (
                        <div
                          className="text-sm leading-relaxed text-slate-700 text-justify"
                          dangerouslySetInnerHTML={{
                            __html: aurora
                              .replace(/^:\s+/gm, '')
                              .replace(/\*\*(.*?)\*\*/g, '<strong style="display:block;margin-top:20px;margin-bottom:8px;color:#1e293b;font-size:12px;font-weight:900;border-left:3px solid #7c3aed;padding-left:10px;text-transform:uppercase;letter-spacing:0.05em;">$1</strong>')
                              .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>')
                          }}
                        />
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Clique em "Gerar Análise" para que a Aurora crie uma análise clínica detalhada baseada no perfil DISC deste paciente, considerando os fatores predominantes e padrões comportamentais da metodologia Marston.
                        </p>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 flex-wrap">
                      {result.patient_id && (
                        <Button size="xs" variant="ghost" radius="xl" leftIcon={<User size={12} />}
                          onClick={() => navigate(`/pacientes?patientId=${result.patient_id}`)}>
                          Ver paciente
                        </Button>
                      )}
                      <Button size="xs" variant="ghost" radius="xl" leftIcon={<Share2 size={12} />}
                        onClick={() => { setSharePatientId(result.patient_id || ''); setShareTab('patient'); setShareOpen(true); }}>
                        Compartilhar novo DISC
                      </Button>
                    </div>

                    {/* Full answers accordion */}
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors list-none">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ver Respostas Completas (30 perguntas)</span>
                        <ChevronRight size={16} className="text-slate-300 group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="mt-3 space-y-1 max-h-72 overflow-y-auto pr-1">
                        {Object.entries(result.answers).map(([qId, answer]) => (
                          <div key={qId} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50">
                            <span className="text-xs text-slate-400 font-medium uppercase w-8">{qId}</span>
                            <div className="flex-1 mx-3 h-px bg-slate-100" />
                            <span className="text-xs font-bold text-slate-700">{String(answer)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartilhar DISC"
        subtitle="Envie o questionário DISC para o paciente responder"
        maxWidth="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="ghost" radius="xl" onClick={() => setShareOpen(false)}>Fechar</Button>
            <Button variant="success" radius="xl" leftIcon={<MessageCircle size={15} />} onClick={handleWhatsApp}>
              Enviar via WhatsApp
            </Button>
          </div>
        }
      >
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
          {(['public','patient'] as const).map(t => (
            <button key={t} onClick={() => setShareTab(t)}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${shareTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {t === 'public' ? 'Link Aberto' : 'Para Paciente'}
            </button>
          ))}
        </div>

        {shareTab === 'patient' && (
          <div className="mb-4">
            <Combobox
              label="Selecionar paciente"
              options={activePatients.map(p => ({ id: p.id, label: p.full_name || p.name || '' }))}
              value={sharePatientId}
              onChange={val => setSharePatientId(String(val))}
              icon={<Users size={16} />}
              placeholder="Escolha o paciente..."
            />
          </div>
        )}

        {!discForm ? (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-700">
            Formulário DISC sendo configurado. Aguarde alguns instantes e recarregue a página.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                readOnly
                value={getShareLink()}
                className="flex-1 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono"
              />
              <Button variant="outline" size="sm" radius="xl" onClick={handleCopy}
                leftIcon={copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">O paciente acessa este link e responde as 30 perguntas. Os resultados aparecem automaticamente aqui.</p>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        title="Excluir Avaliação"
        subtitle="Esta ação não pode ser desfeita"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" radius="xl" onClick={() => setDeleteModal({ open: false, id: null })}>Cancelar</Button>
            <Button variant="danger" radius="xl" isLoading={deleting} loadingText="Excluindo..." onClick={handleDelete}
              leftIcon={<Trash2 size={14} />}>
              Excluir
            </Button>
          </div>
        }
      >
        <div className="flex gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
          <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">Tem certeza que deseja excluir esta avaliação DISC? Todos os dados, incluindo a análise da Aurora, serão perdidos permanentemente.</p>
        </div>
      </Modal>

      {/* Manual Modal */}
      <Modal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Manual DISC — Metodologia Marston"
        subtitle="Guia completo para interpretação e uso clínico na TCC"
        maxWidth="2xl"
        footer={<Button variant="ghost" radius="xl" onClick={() => setManualOpen(false)}>Fechar</Button>}
      >
        <div className="space-y-5 text-sm text-slate-700 max-h-[65vh] overflow-y-auto pr-2">

          {/* Origem */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Origem — William Moulton Marston</p>
            <p className="text-sm leading-relaxed text-slate-600">O DISC é uma metodologia de avaliação comportamental desenvolvida por William Moulton Marston (1928). Mapeia como pessoas reagem a <strong>desafios (D)</strong>, influenciam <strong>pessoas (I)</strong>, lidam com <strong>mudanças (S)</strong> e seguem <strong>regras (C)</strong>. É amplamente utilizado para autoconhecimento, gestão de equipes, recrutamento e — adaptado aqui — para compreensão de padrões cognitivos e comportamentais na TCC.</p>
          </div>

          {/* Os 4 perfis */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Os 4 Perfis Comportamentais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['D','I','S','C'] as const).map(k => {
                const cfg = BLOCK_CONFIG[k];
                const det = FACTOR_DETAILS[k];
                return (
                  <div key={k} style={{ background: cfg.bg, borderColor: cfg.border }} className="rounded-xl border p-3">
                    <p className="font-black text-sm mb-1" style={{ color: cfg.color }}>{k} — {cfg.label}</p>
                    <p className="text-xs text-slate-600 mb-2">{cfg.desc}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">Pontos fortes</p>
                    <div className="flex flex-wrap gap-1">
                      {det.strengths.map(s => <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-white border border-slate-100 text-slate-600">{s}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Escala e cálculo */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Escala e Cálculo</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {['1 = Nunca','2 = Raramente','3 = Às vezes','4 = Frequentemente','5 = Quase sempre'].map(l => (
                <span key={l} className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">{l}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['D','Dominância','÷ 8','q1–q8'],['I','Influência','÷ 7','q9–q15'],['S','Estabilidade','÷ 7','q16–q22'],['C','Conformidade','÷ 8','q23–q30']].map(([k,l,d,q]) => (
                <div key={k} style={{ background: BLOCK_CONFIG[k as keyof typeof BLOCK_CONFIG].bg, borderColor: BLOCK_CONFIG[k as keyof typeof BLOCK_CONFIG].border }}
                  className="rounded-xl border p-3">
                  <p className="font-black text-sm" style={{ color: BLOCK_CONFIG[k as keyof typeof BLOCK_CONFIG].color }}>{k} — {l}</p>
                  <p className="text-xs text-slate-500">{q} &nbsp;→&nbsp; Média {d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Faixas */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faixas de Interpretação por Média</p>
            <div className="space-y-2">
              {[['1.0 – 2.4','Traço pouco presente — comportamento raramente ativado','#94a3b8'],['2.5 – 3.4','Traço moderado — presente em situações de pressão','#d97706'],['3.5 – 5.0','Traço forte / predominante — comportamento central','#16a34a']].map(([r,l,c]) => (
                <div key={l} className="flex items-start gap-3 p-2 rounded-xl" style={{ background: c + '12' }}>
                  <span className="font-mono text-xs font-black w-24 shrink-0 mt-0.5" style={{ color: c }}>{r}</span>
                  <span className="text-xs text-slate-600">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Perfis combinados */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Perfis Combinados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(COMBINED_PROFILES).filter(([k]) => k.length === 2 && k[0] < k[1]).map(([key, desc]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-black text-xs text-slate-700 mb-1">{key[0]} + {key[1]}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Modelo devolutiva */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Modelo de Devolutiva na Sessão</p>
            <p className="text-sm italic text-slate-600 leading-relaxed">
              "Seu resultado sugere predominância em [fatores mais altos]. Isso pode indicar um padrão de funcionamento em que você tende a [descrever o perfil]. Na TCC, isso nos ajuda a entender como certos pensamentos, emoções e comportamentos se repetem em situações de pressão, conflito, exigência, vínculo ou mudança."
            </p>
          </div>

          {/* Roteiro de exploração */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Roteiro de Exploração na Sessão</p>
            <div className="space-y-2">
              {[
                ['1. Situações-gatilho', 'Em quais situações esse traço aparece mais? No trabalho, relacionamentos, decisões ou conflitos?'],
                ['2. Pensamentos automáticos', 'O que você pensa quando isso acontece? O que teme que aconteça? O que sente que precisa provar, evitar ou controlar?'],
                ['3. Emoções associadas', 'Ansiedade · Frustração · Culpa · Medo · Raiva · Vergonha'],
                ['4. Comportamentos típicos', 'Confronta · Evita · Agrada · Se cala · Controla · Analisa demais · Procrastina · Acelera'],
                ['5. Reestruturação cognitiva', 'Esse padrão está me ajudando ou me desgastando? Que outra forma mais equilibrada existe?'],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="text-xs font-black text-slate-700">{t}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Observação ética */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Observação Ética</p>
            <p className="text-xs text-slate-600 leading-relaxed">Apresentar ao paciente como <strong>"instrumento de apoio para autoconhecimento e compreensão de padrões comportamentais"</strong>. Não é teste psicológico formal nem diagnóstico de personalidade. O DISC adaptado é recurso auxiliar de avaliação qualitativa — não classifica pessoas como boas ou ruins, apenas mapeia tendências comportamentais naturais.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
