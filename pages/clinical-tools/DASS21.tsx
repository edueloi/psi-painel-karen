import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  Activity, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  FileText,
  AlertTriangle,
  Info,
  ChevronRight,
  TrendingUp,
  Brain,
  Zap,
  Shield,
  ShieldCheck,
  Clock,
  Layout,
  Star,
  Users,
  Share2,
  Share,
  Printer,
  Copy,
  CheckCircle,
  MessageCircle as WhatsAppIcon
} from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
// DASS-21 (Vignola, R.C.B. & Tucci, A.M.)
const DASS_ITEMS = [
  { id: 1, text: "Achei difícil me acalmar", subscale: "Stress" },
  { id: 2, text: "Senti minha boca seca", subscale: "Anxiety" },
  { id: 3, text: "Não consegui vivenciar nenhum sentimento positivo", subscale: "Depression" },
  { id: 4, text: "Tive dificuldade em respirar em alguns momentos (ex. respiração ofegante, falta de ar, sem ter feito nenhum esforço físico)", subscale: "Anxiety" },
  { id: 5, text: "Achei difícil ter iniciativa para fazer as coisas", subscale: "Depression" },
  { id: 6, text: "Tive a tendência de reagir de forma exagerada às situações", subscale: "Stress" },
  { id: 7, text: "Senti tremores (ex. nas mãos)", subscale: "Anxiety" },
  { id: 8, text: "Senti que estava sempre nervoso", subscale: "Stress" },
  { id: 9, text: "Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridículo (a)", subscale: "Anxiety" },
  { id: 10, text: "Senti que não tinha nada a desejar", subscale: "Depression" },
  { id: 11, text: "Senti-me agitado", subscale: "Stress" },
  { id: 12, text: "Achei difícil relaxar", subscale: "Stress" },
  { id: 13, text: "Senti-me depressivo (a) e sem ânimo", subscale: "Depression" },
  { id: 14, text: "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo", subscale: "Stress" },
  { id: 15, text: "Senti que ia entrar em pânico", subscale: "Anxiety" },
  { id: 16, text: "Não consegui me entusiasmar com nada", subscale: "Depression" },
  { id: 17, text: "Senti que não tinha valor como pessoa", subscale: "Depression" },
  { id: 18, text: "Senti que estava um pouco emotivo/sensível demais", subscale: "Stress" },
  { id: 19, text: "Sabia que meu coração estava alterado mesmo não tendo feito nenhum esforço físico (ex. aumento da frequência cardíaca, disritmia cardíaca)", subscale: "Anxiety" },
  { id: 20, text: "Senti medo sem motivo", subscale: "Anxiety" },
  { id: 21, text: "Senti que a vida não tinha sentido", subscale: "Depression" }
];

const SCORING_LABELS = {
  Depression: [
    { range: [0, 9], label: "Normal", color: "text-emerald-500", bg: "bg-emerald-50" },
    { range: [10, 13], label: "Leve", color: "text-amber-500", bg: "bg-amber-50" },
    { range: [14, 20], label: "Moderado", color: "text-orange-500", bg: "bg-orange-50" },
    { range: [21, 27], label: "Grave", color: "text-rose-500", bg: "bg-rose-50" },
    { range: [28, 99], label: "Muito Grave", color: "text-red-600", bg: "bg-red-100" }
  ],
  Anxiety: [
    { range: [0, 7], label: "Normal", color: "text-emerald-500", bg: "bg-emerald-50" },
    { range: [8, 9], label: "Leve", color: "text-amber-500", bg: "bg-amber-50" },
    { range: [10, 14], label: "Moderado", color: "text-orange-500", bg: "bg-orange-50" },
    { range: [15, 19], label: "Grave", color: "text-rose-500", bg: "bg-rose-50" },
    { range: [20, 99], label: "Muito Grave", color: "text-red-600", bg: "bg-red-100" }
  ],
  Stress: [
    { range: [0, 14], label: "Normal", color: "text-emerald-500", bg: "bg-emerald-50" },
    { range: [15, 18], label: "Leve", color: "text-amber-500", bg: "bg-amber-50" },
    { range: [19, 25], label: "Moderado", color: "text-orange-500", bg: "bg-orange-50" },
    { range: [26, 33], label: "Grave", color: "text-rose-500", bg: "bg-rose-50" },
    { range: [34, 99], label: "Muito Grave", color: "text-red-600", bg: "bg-red-100" }
  ]
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface DassResult {
  id: string | number;
  date: string;
  answers: Record<number, number>;
  scores: {
    Depression: number;
    Anxiety: number;
    Stress: number;
  };
  analysis?: string;
}

export const DASS21Page: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialPid = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPid);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [history, setHistory] = useState<DassResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<DassResult | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Patients
  useEffect(() => {
    api.get<any[]>('/patients').then(data => {
      setPatients((data || []).map(p => ({
        ...p,
        full_name: p.name || p.full_name || '',
        status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
      })));
    }).finally(() => setLoadingPatients(false));
  }, []);

  // Load History
  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      return;
    }
    const load = async () => {
      try {
        const resp = await api.get<DassResult[]>(`/clinical-tools/${selectedPatientId}/dass-21`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/f/dass-21?u=${user?.shareToken}&p=${selectedPatientId}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('Copiado', 'Link copiado para a área de transferência.');
  };

  const handleWhatsApp = () => {
    const p = patients.find(px => String(px.id) === String(selectedPatientId));
    const link = getShareLink();
    const text = encodeURIComponent(`Olá ${p?.full_name || 'paciente'}, por favor preencha esta escala DASS-21 para nossa avaliação: ${link}`);
    window.open(`https://wa.me/${p?.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const calculateScores = (answers: Record<number, number>) => {
    const scores = { Depression: 0, Anxiety: 0, Stress: 0 };
    DASS_ITEMS.forEach(item => {
      const val = answers[item.id] || 0;
      scores[item.subscale as keyof typeof scores] += val;
    });
    return {
      Depression: scores.Depression * 2,
      Anxiety: scores.Anxiety * 2,
      Stress: scores.Stress * 2
    };
  };

  const getInterpretation = (subscale: 'Depression' | 'Anxiety' | 'Stress', score: number) => {
    const labels = SCORING_LABELS[subscale];
    return labels.find(l => score >= l.range[0] && score <= l.range[1]) || labels[0];
  };

  const getClinicalAnalysis = (scores: { Depression: number; Anxiety: number; Stress: number }) => {
    const d = getInterpretation('Depression', scores.Depression);
    const a = getInterpretation('Anxiety', scores.Anxiety);
    const s = getInterpretation('Stress', scores.Stress);

    const descMap: Record<string, string> = {
      Normal: 'dentro da normalidade clínica, sem indicadores de sofrimento significativo',
      Leve: 'em nível leve, com indicadores iniciais que merecem atenção',
      Moderado: 'em nível moderado, com sintomas que impactam o funcionamento diário',
      Grave: 'em nível grave, com sintomas marcantes que comprometem a qualidade de vida',
      'Muito Grave': 'em nível muito grave, com sintomas intensos que exigem atenção clínica imediata',
    };

    const depText = {
      Normal: 'Sem sinais de humor disfórico ou perda de motivação.',
      Leve: 'Presença leve de humor deprimido, podendo haver leve diminuição de energia ou prazer.',
      Moderado: 'Sintomas como humor triste persistente, baixa autoestima, dificuldade de concentração e perda de interesse em atividades.',
      Grave: 'Presença intensa de desesperança, desmotivação acentuada, possível ideação negativa e retraimento social.',
      'Muito Grave': 'Quadro depressivo severo com marcada anedonia, sentimentos de inutilidade, possível ideação suicida e comprometimento funcional importante.',
    };
    const anxText = {
      Normal: 'Sem indícios de ativação autonômica excessiva ou ansiedade clínica.',
      Leve: 'Leve hiperatividade autonômica, tensão muscular ou preocupação ocasional.',
      Moderado: 'Sintomas de ansiedade visíveis: taquicardia, boca seca, tensão, preocupação excessiva ou dificuldade de relaxar.',
      Grave: 'Ansiedade intensa com sintomas físicos (palpitações, tremores), medo excessivo, possíveis crises de pânico.',
      'Muito Grave': 'Ansiedade incapacitante com ativação autonômica severa, pânico frequente e comprometimento significativo do funcionamento.',
    };
    const strText = {
      Normal: 'Nível de estresse dentro da normalidade, sem sobrecarga emocional aparente.',
      Leve: 'Leve tensão emocional com dificuldade ocasional em relaxar ou reagir proporcionalmente.',
      Moderado: 'Irritabilidade, impaciência, tensão persistente e dificuldade em desacelerar ou descansar.',
      Grave: 'Sobrecarga emocional significativa, reações exageradas a situações, agitação e dificuldade em controlar impulsos.',
      'Muito Grave': 'Estresse crônico severo com exaustão emocional, intolerância marcante e risco de esgotamento (burnout).',
    };

    const parts: string[] = [];
    parts.push(`**Depressão (${scores.Depression} pts — ${d.label}):** ${depText[d.label]}`);
    parts.push(`**Ansiedade (${scores.Anxiety} pts — ${a.label}):** ${anxText[a.label]}`);
    parts.push(`**Estresse (${scores.Stress} pts — ${s.label}):** ${strText[s.label]}`);

    const high = [d, a, s].filter(x => ['Grave', 'Muito Grave'].includes(x.label));
    let conclusion = '';
    if (high.length === 0) {
      conclusion = 'O perfil geral da avaliação não indica sofrimento psicológico clinicamente significativo no momento.';
    } else if (high.length === 1) {
      conclusion = `Atenção especial recomendada para a dimensão destacada. Considerar acompanhamento e aprofundamento clínico.`;
    } else if (high.length === 2) {
      conclusion = `Dois domínios apresentam severidade elevada. Recomenda-se avaliação clínica aprofundada e planejamento de intervenção.`;
    } else {
      conclusion = `Os três domínios apresentam níveis elevados de sofrimento. Intervenção clínica prioritária é fortemente indicada.`;
    }

    return { parts, conclusion };
  };

  const handlePrintReport = (result: typeof detailResult, patientName: string) => {
    if (!result) return;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const answersHtml = result.answers ? DASS_ITEMS.map(item => {
      const val = result.answers[item.id];
      const labels = ['Não se aplicou', 'Algum grau', 'Grau considerável', 'Quase sempre'];
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#334155">${item.id}. ${item.text}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#4f46e5;text-align:center">${val ?? '—'} — ${val !== undefined ? labels[val] : '—'}</td></tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>DASS-21 — ${patientName}</title>
    <style>body{font-family:system-ui,sans-serif;color:#0f172a;margin:0;padding:32px;} h1{font-size:22px;font-weight:900;margin:0} h2{font-size:14px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.1em;margin:24px 0 8px} p{margin:4px 0;font-size:13px;line-height:1.6} .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase} .score-row{display:flex;gap:16px;margin:6px 0;align-items:center} .bar{flex:1;height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden} .bar-fill{height:100%;border-radius:99px} table{width:100%;border-collapse:collapse;margin-top:8px} @media print{body{padding:16px}}</style>
    </head><body>
    <div style="border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:900;color:#6366f1;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px">DASS-21 — Relatório de Avaliação</p>
      <h1>${patientName}</h1>
      <p style="color:#94a3b8;font-size:12px;margin-top:4px">${dateStr}</p>
    </div>
    <h2>Resultados por Domínio</h2>
    ${(['Depression','Anxiety','Stress'] as const).map(sub => {
      const score = result.scores[sub];
      const interp = getInterpretation(sub, score);
      const label = sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse';
      const colorMap: Record<string,string> = { Normal:'#10b981', Leve:'#f59e0b', Moderado:'#f97316', Grave:'#f43f5e', 'Muito Grave':'#dc2626' };
      const c = colorMap[interp.label] || '#94a3b8';
      return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em">${label}</span><span class="badge" style="background:${c}20;color:${c}">${interp.label}</span></div><div class="score-row"><span style="font-size:22px;font-weight:900;min-width:40px">${score}</span><div class="bar"><div class="bar-fill" style="width:${Math.min((score/42)*100,100)}%;background:${c}"></div></div></div></div>`;
    }).join('')}
    <h2>Análise Clínica</h2>
    ${parts.map(p => `<p style="margin-bottom:8px">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')}
    <p style="margin-top:12px;padding:12px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:4px"><strong>Conclusão:</strong> ${conclusion}</p>
    ${answersHtml ? `<h2 style="margin-top:24px">Respostas do Paciente</h2><table>${answersHtml}</table>` : ''}
    <p style="margin-top:32px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:12px">Gerado por PsiFlux · DASS-21 (Vignola & Tucci) · ${new Date().toLocaleDateString('pt-BR')}</p>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const currentScores = useMemo(() => calculateScores(currentAnswers), [currentAnswers]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente para salvar.');
      return;
    }
    if (Object.keys(currentAnswers).length < 21) {
      info('Atenção', 'Responda todas as 21 questões para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const newResult: DassResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/dass-21`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('Avaliação Salva', 'A escala DASS-21 foi registrada no prontuário.');
    } catch (err) {
      error('Erro', 'Falha ao salvar a avaliação.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateAIResult = async (resultId: string | number) => {
    const result = history.find(h => h.id === resultId);
    if (!result) return;

    setAnalyzingId(resultId);
    try {
      const resp = await api.post<any>('/ai/analyze-clinical-tool', {
        toolName: 'DASS-21 (Depressão, Ansiedade e Estresse)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          interpretations: {
            Depression: getInterpretation('Depression', result.scores.Depression).label,
            Anxiety: getInterpretation('Anxiety', result.scores.Anxiety).label,
            Stress: getInterpretation('Stress', result.scores.Stress).label,
          }
        }
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      await api.put(`/clinical-tools/${selectedPatientId}/dass-21`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      if (detailResult?.id === resultId) setDetailResult({ ...detailResult, analysis });
      success('Aurora Analisou', 'Interpretação clínica gerada.');
    } catch (err) {
      error('Erro', 'Falha na análise.');
    } finally {
      setAnalyzingId(null);
    }
  };

  // Radar Chart Simple SVG
  const RadarGraphic = ({ scores }: { scores: DassResult['scores'] }) => {
    const max = 42;
    const size = 200;
    const center = size / 2;
    const r = 80;

    const getPos = (score: number, angle: number) => {
      const dist = (score / max) * r;
      const rad = (angle * Math.PI) / 180;
      return {
        x: center + dist * Math.cos(rad),
        y: center + dist * Math.sin(rad)
      };
    };

    const pD = getPos(scores.Depression, -90);
    const pA = getPos(scores.Anxiety, 30);
    const pS = getPos(scores.Stress, 150);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Grids */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon 
            key={scale}
            points={`
              ${center},${center - r * scale} 
              ${center + r * scale * Math.cos(30 * Math.PI / 180)},${center + r * scale * Math.sin(30 * Math.PI / 180)}
              ${center + r * scale * Math.cos(150 * Math.PI / 180)},${center + r * scale * Math.sin(150 * Math.PI / 180)}
            `}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {/* Axis */}
        <line x1={center} y1={center} x2={center} y2={center-r} stroke="#cbd5e1" strokeDasharray="2" />
        <line x1={center} y1={center} x2={center + r * Math.cos(30 * Math.PI / 180)} y2={center + r * Math.sin(30 * Math.PI / 180)} stroke="#cbd5e1" strokeDasharray="2" />
        <line x1={center} y1={center} x2={center + r * Math.cos(150 * Math.PI / 180)} y2={center + r * Math.sin(150 * Math.PI / 180)} stroke="#cbd5e1" strokeDasharray="2" />
        
        {/* Data */}
        <polygon 
          points={`${pD.x},${pD.y} ${pA.x},${pA.y} ${pS.x},${pS.y}`}
          fill="rgba(79, 70, 229, 0.15)"
          stroke="#4f46e5"
          strokeWidth="3"
        />
        
        {/* Labels */}
        <text x={center} y={center - r - 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Depressão</text>
        <text x={center + r * Math.cos(30 * Math.PI / 180) + 10} y={center + r * Math.sin(30 * Math.PI / 180) + 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Ansiedade</text>
        <text x={center + r * Math.cos(150 * Math.PI / 180) - 10} y={center + r * Math.sin(150 * Math.PI / 180) + 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Estresse</text>
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="DASS-21"
        subtitle="Escala de Depressão, Ansiedade e Estresse (Vignola & Tucci)."
        icon={<Activity className="text-indigo-500" />}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              radius="xl"
              leftIcon={<Plus size={16} />}
              onClick={() => selectedPatientId ? setIsApplying(true) : info('Selecione um paciente', 'Escolha um prontuário para aplicar a escala.')}
              className="bg-indigo-600 text-white shadow-lg shadow-indigo-200"
            >
               Aplicar Nova Escala
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              radius="xl" 
              leftIcon={<Share2 size={16} />} 
              onClick={() => selectedPatientId ? setShareOpen(true) : info('Selecione um paciente', 'Escolha um prontuário para compartilhar.')}
            >
               Compartilhar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <div className="space-y-6">
          <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={id => setSelectedPatientId(id)}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={loadingPatients}
            t={t}

          />

          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Info size={14} className="text-indigo-400" /> Instruções (Vignola & Tucci)
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-black uppercase tracking-widest bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "Por favor, leia cuidadosamente cada uma das afirmações abaixo e marque o número apropriado 0, 1, 2 ou 3."
              </p>
              <div className="space-y-3 pt-2 text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                 <p><span className="text-indigo-600 font-black">0</span> — Não se aplicou de maneira alguma</p>
                 <p><span className="text-indigo-600 font-black">1</span> — Aplicou-se em algum grau</p>
                 <p><span className="text-indigo-600 font-black">2</span> — Aplicou-se consideravelmente</p>
                 <p><span className="text-indigo-600 font-black">3</span> — Aplicou-se muito / maioria do tempo</p>
              </div>
          </div>
        </div>

        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Activity size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione o paciente para visualizar dados e gráficos DASS-21.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column: Graphics */}
              <div className="space-y-8">
                 {/* Current Graphic Preview */}
                 <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                       <TrendingUp size={240} />
                    </div>
                    
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-indigo-400 mb-10">
                       <Layout size={18} /> Gráfico Circular de Tríade
                    </h3>

                    <div className="flex flex-col items-center gap-12">
                       <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm">
                          <RadarGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                       </div>
                       <div className="flex-1 space-y-6 w-full">
                          {(['Depression', 'Anxiety', 'Stress'] as const).map(sub => {
                             const lastRes = history.length > 0 ? history[history.length - 1] : null;
                             const score = lastRes ? lastRes.scores[sub] : currentScores[sub];
                             const interpretation = getInterpretation(sub, score);
                             const label = sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse';
                             return (
                               <div key={sub} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                                     <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 ${interpretation.color}`}>{interpretation.label}</span>
                                  </div>
                                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                     <div className={`h-full transition-all duration-1000 ${interpretation.color.replace('text', 'bg')}`} style={{ width: `${(score / 42) * 100}%` }} />
                                  </div>
                               </div>
                             );
                          })}
                          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-slate-500">
                             <p className="text-[9px] font-black uppercase tracking-widest italic leading-relaxed">Resultado da Última Avaliação Sincronizada</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: History & Evolution */}
              <div className="space-y-8">
                 {/* Historical Graphic Evolution */}
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp size={16} className="text-indigo-500" /> Evolução do Paciente
                       </h4>
                       <div className="flex gap-2">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-[7px] font-black uppercase">D</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"/><span className="text-[7px] font-black uppercase">A</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"/><span className="text-[7px] font-black uppercase">S</span></div>
                       </div>
                    </div>

                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                       {history.length < 2 && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando mais dados históricos</p>
                         </div>
                       )}
                       {history.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                         <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-orange-500/20 w-full rounded-t-lg transition-all group-hover:bg-orange-500/40" style={{ height: `${(res.scores.Stress / 42) * 100}%` }} />
                            <div className="bg-amber-500/40 w-full transition-all group-hover:bg-amber-500/60" style={{ height: `${(res.scores.Anxiety / 42) * 100}%` }} />
                            <div className="bg-emerald-500/60 w-full rounded-b-lg transition-all group-hover:bg-emerald-500" style={{ height: `${(res.scores.Depression / 42) * 100}%` }} />
                            
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                               <p className="text-[8px] font-black uppercase mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                               <div className="flex gap-2">
                                  <span className="text-[10px] font-black text-emerald-400">D{res.scores.Depression}</span>
                                  <span className="text-[10px] font-black text-amber-400">A{res.scores.Anxiety}</span>
                                  <span className="text-[10px] font-black text-orange-400">S{res.scores.Stress}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* History List */}
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Registros Sincronizados</p>
                       <History size={16} className="text-slate-300" />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                       {history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => (
                         <div key={res.id} className="p-8 hover:bg-slate-50/50 transition-all group flex items-center justify-between">
                            <div className="space-y-2">
                               <div className="flex items-center gap-3">
                                  <Clock size={12} className="text-indigo-400" />
                                  <span className="text-xs font-black text-slate-800">{new Date(res.date).toLocaleDateString()}</span>
                                  {res.analysis && <Sparkles size={12} className="text-amber-500 animate-pulse" />}
                               </div>
                               <div className="flex gap-4">
                                  {(['Depression', 'Anxiety', 'Stress'] as const).map(s => (
                                     <div key={s} className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{s.charAt(0)}</span>
                                        <span className={`text-[11px] font-black ${getInterpretation(s, res.scores[s]).color}`}>{res.scores[s]}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => generateAIResult(res.id)}
                                 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${res.analysis ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300 hover:text-indigo-500'}`}
                               >
                                  <Sparkles size={16} className={analyzingId === res.id ? 'animate-spin' : ''} />
                               </button>
                               <button 
                                 onClick={() => setDetailResult(res)}
                                 className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-indigo-500 rounded-xl flex items-center justify-center transition-all"
                               >
                                  <ChevronRight size={18} />
                               </button>
                            </div>
                         </div>
                       ))}
                       {history.length === 0 && (
                         <div className="p-20 text-center space-y-3 opacity-30">
                            <FileText size={40} className="mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sem lançamentos</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {detailResult && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-12 space-y-12 relative animate-slideUpFade">
              <button onClick={() => { setDetailResult(null); setShowAnswers(false); }} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all">
                 <Plus size={24} className="rotate-45" />
              </button>

              {(() => {
                const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
                const { parts, conclusion } = getClinicalAnalysis(detailResult.scores);
                return (<>
                <div className="flex flex-col md:flex-row gap-8 items-start justify-between border-b border-slate-50 pb-10">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Avaliação Consolidada</p>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{patientName}</h2>
                      <p className="text-sm font-bold text-slate-400">{new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                   <div className="flex gap-3 shrink-0">
                      <Button variant="outline" size="sm" radius="xl" leftIcon={<Printer size={16}/>} onClick={() => handlePrintReport(detailResult, patientName)}>Imprimir</Button>
                      <Button variant="ghost" size="sm" radius="xl" leftIcon={<Share size={16}/>} onClick={() => handlePrintReport(detailResult, patientName)}>Exportar PDF</Button>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="bg-slate-950 rounded-[2.5rem] p-10 flex items-center justify-center shadow-2xl">
                      <RadarGraphic scores={detailResult.scores} />
                   </div>
                   <div className="space-y-8">
                      {(['Depression', 'Anxiety', 'Stress'] as const).map(sub => {
                         const score = detailResult.scores[sub];
                         const interp = getInterpretation(sub, score);
                         return (
                           <div key={sub} className="p-8 rounded-[2rem] border border-slate-100 bg-slate-50/50 space-y-4">
                              <div className="flex items-center justify-between">
                                 <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse'}</h4>
                                 <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl ${interp.bg} ${interp.color}`}>{interp.label}</span>
                              </div>
                              <div className="flex items-center gap-6">
                                 <div className="text-3xl font-black text-slate-900">{score}</div>
                                 <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${interp.color.replace('text', 'bg')}`} style={{ width: `${(score / 42) * 100}%` }} />
                                 </div>
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>

                {/* Análise Clínica Baseada em Protocolo */}
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                   <div className="bg-slate-50 px-8 py-5 flex items-center gap-3 border-b border-slate-100">
                      <Brain size={18} className="text-indigo-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Análise Clínica — DASS-21 (Vignola & Tucci)</h3>
                   </div>
                   <div className="p-8 space-y-4">
                      {parts.map((part, i) => {
                        const [bold, ...rest] = part.split(':');
                        return (
                          <div key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 shrink-0" />
                             <p><span className="font-black text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':')}</p>
                          </div>
                        );
                      })}
                      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                         <span className="font-black text-indigo-700">Conclusão: </span>{conclusion}
                      </div>
                   </div>
                </div>

                {detailResult.analysis && (
                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-100 space-y-6">
                     <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                        <Sparkles size={20} className="text-amber-400" /> Análise Aurora (IA)
                     </h3>
                     <div className="text-base font-bold leading-relaxed text-indigo-50/80 italic">
                        "{detailResult.analysis}"
                     </div>
                  </div>
                )}

                {!detailResult.analysis && (
                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex items-center gap-6">
                     <Sparkles size={32} className="text-slate-300 shrink-0" />
                     <div className="flex-1">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Aurora — IA Clínica</p>
                        <p className="text-sm text-slate-400">Gere uma análise aprofundada com inteligência artificial para este resultado.</p>
                     </div>
                     <Button onClick={() => generateAIResult(detailResult.id)} isLoading={analyzingId === detailResult.id} className="bg-indigo-600 text-white rounded-2xl px-6 py-3 shrink-0">Analisar</Button>
                  </div>
                )}

                {/* Respostas do Paciente */}
                {detailResult.answers && Object.keys(detailResult.answers).length > 0 && (
                  <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                     <button
                       onClick={() => setShowAnswers(!showAnswers)}
                       className="w-full bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100 transition-all"
                     >
                        <div className="flex items-center gap-3">
                           <FileText size={18} className="text-slate-400" />
                           <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Respostas do Paciente (21 itens)</h3>
                        </div>
                        <ChevronRight size={18} className={`text-slate-400 transition-transform ${showAnswers ? 'rotate-90' : ''}`} />
                     </button>
                     {showAnswers && (
                       <div className="divide-y divide-slate-50">
                          {DASS_ITEMS.map(item => {
                            const val = detailResult.answers[item.id];
                            const labels = ['Não se aplicou', 'Algum grau', 'Grau considerável', 'Quase sempre'];
                            const subLabel = item.subscale === 'Depression' ? 'D' : item.subscale === 'Anxiety' ? 'A' : 'E';
                            const subColor = item.subscale === 'Depression' ? 'text-amber-500 bg-amber-50' : item.subscale === 'Anxiety' ? 'text-orange-500 bg-orange-50' : 'text-blue-500 bg-blue-50';
                            return (
                              <div key={item.id} className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60">
                                 <span className="text-[10px] font-black text-slate-300 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2,'0')}</span>
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${subColor}`}>{subLabel}</span>
                                 <p className="flex-1 text-sm text-slate-600 leading-relaxed">{item.text}</p>
                                 <div className="shrink-0 text-right">
                                    <span className="text-lg font-black text-indigo-600">{val ?? '—'}</span>
                                    {val !== undefined && <p className="text-[10px] text-slate-400 font-bold">{labels[val]}</p>}
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                     )}
                  </div>
                )}
                </>);
              })()}
           </div>
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartilhar DASS-21"
        subtitle="Envie o questionário para o paciente responder em casa"
        maxWidth="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="ghost" radius="xl" onClick={() => setShareOpen(false)}>Fechar</Button>
            <Button variant="success" radius="xl" leftIcon={<WhatsAppIcon size={15} />} onClick={handleWhatsApp}>
              Enviar WhatsApp
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
           <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                 <Share2 size={24} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-tight mb-1">Link de Avaliação Direta</p>
                 <p className="text-xs text-slate-600 font-medium leading-relaxed">Este link é exclusivo para o paciente selecionado. As respostas serão integradas automaticamente ao gráfico de evolução dele.</p>
              </div>
           </div>

           <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getShareLink()}
                  className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <Button variant="outline" size="sm" radius="xl" onClick={handleCopy}
                  leftIcon={copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}>
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest pt-2 flex items-center justify-center gap-2">
                 <ShieldCheck size={12} /> Criptografia de Ponta-a-Ponta
              </p>
           </div>
        </div>
      </Modal>

      {/* Application Modal (Questionnaire) */}
      <Modal
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        title="Aplicação DASS-21"
        subtitle={`Respondendo por: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}`}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" radius="xl" onClick={() => setIsApplying(false)} className="flex-1">Cancelar</Button>
            <Button 
              variant="primary" 
              radius="xl" 
              onClick={handleSave} 
              isLoading={isSaving}
              className="flex-2 bg-indigo-600 text-white"
            >
              Processar e Salvar Escala <Save size={18} className="ml-2" />
            </Button>
          </div>
        }
      >
        <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
           <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                "Por favor, leia cada afirmação e selecione o quanto ela se aplicou ao paciente durante a última semana."
              </p>
           </div>
           
           <div className="space-y-12">
              {DASS_ITEMS.map((item, idx) => (
                <div key={item.id} className="space-y-6">
                   <div className="flex gap-4">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] shrink-0 border border-slate-200">{item.id}</span>
                      <p className="text-base font-black text-slate-800 leading-tight pt-1">{item.text}</p>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map(val => (
                        <button
                          key={val}
                          onClick={() => setCurrentAnswers({ ...currentAnswers, [item.id]: val })}
                          className={`h-14 rounded-2xl text-xs font-black transition-all border ${
                            currentAnswers[item.id] === val 
                            ? 'bg-slate-950 text-white border-slate-950 shadow-xl scale-[1.02]' 
                            : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </Modal>
    </div>
  );
};
