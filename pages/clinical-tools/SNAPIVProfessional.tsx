import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
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
  MessageCircle as WhatsAppIcon,
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
const SNAPIV_ITEMS = [
  { id: 1, text: "Frequentemente deixa de prestar atenção a detalhes ou comete erros por descuido em atividades escolares, de trabalho ou outras.", subscale: "I" },
  { id: 2, text: "Frequentemente tem dificuldades para manter a atenção em tarefas ou atividades lúdicas.", subscale: "I" },
  { id: 3, text: "Frequentemente parece não escutar quando lhe dirigem a palavra diretamente.", subscale: "I" },
  { id: 4, text: "Frequentemente não segue instruções até o fim e não termina tarefas escolares, obrigações ou deveres.", subscale: "I" },
  { id: 5, text: "Frequentemente tem dificuldade para organizar tarefas e atividades.", subscale: "I" },
  { id: 6, text: "Frequentemente evita, não gosta ou se recusa a participar de tarefas que exigem esforço mental prolongado.", subscale: "I" },
  { id: 7, text: "Frequentemente perde coisas necessárias para tarefas ou atividades.", subscale: "I" },
  { id: 8, text: "É facilmente distraído por estímulos externos.", subscale: "I" },
  { id: 9, text: "Com frequência é esquecido em atividades do dia a dia.", subscale: "I" },
  { id: 10, text: "Frequentemente agita as mãos ou os pés ou se remexe na cadeira.", subscale: "H" },
  { id: 11, text: "Frequentemente abandona a cadeira em sala de aula ou em outras situações nas quais se espera que fique sentado.", subscale: "H" },
  { id: 12, text: "Frequentemente corre ou sobe em coisas de forma excessiva em situações nas quais isso é inadequado.", subscale: "H" },
  { id: 13, text: "Frequentemente tem dificuldade para brincar ou participar de atividades de lazer em silêncio.", subscale: "H" },
  { id: 14, text: "Frequentemente está 'a mil' ou age como se tivesse com um motor ligado.", subscale: "H" },
  { id: 15, text: "Frequentemente fala em demasia.", subscale: "H" },
  { id: 16, text: "Frequentemente dá respostas precipitadas antes de as perguntas serem concluídas.", subscale: "H" },
  { id: 17, text: "Frequentemente tem dificuldade para aguardar a sua vez.", subscale: "H" },
  { id: 18, text: "Frequentemente interrompe ou se intromete em assuntos alheios.", subscale: "H" },
  { id: 19, text: "Frequentemente fica com raiva e 'explode'.", subscale: "O" },
  { id: 20, text: "Frequentemente discute com adultos.", subscale: "O" },
  { id: 21, text: "Frequentemente desafia ativamente ou recusa-se a obedecer às solicitações de adultos.", subscale: "O" },
  { id: 22, text: "Frequentemente faz coisas deliberadamente para aborrecer as pessoas.", subscale: "O" },
  { id: 23, text: "Frequentemente culpa os outros por seus erros ou mau comportamento.", subscale: "O" },
  { id: 24, text: "Com frequência é suscetível ou fica facilmente irritado pelos outros.", subscale: "O" },
  { id: 25, text: "Frequentemente é raivoso e ressentido.", subscale: "O" },
  { id: 26, text: "Frequentemente é rancoroso ou vingativo.", subscale: "O" },
];

const SNAP_CUTOFFS = {
  inattention: 2.0,
  hyperactivity: 2.0,
  oppositional: 1.67,
};

function getLevel(subscale: 'inattention' | 'hyperactivity' | 'oppositional', score: number) {
  const cutoff = SNAP_CUTOFFS[subscale];
  if (score >= cutoff) return { label: 'Significativo', color: 'text-rose-600', bg: 'bg-rose-50' };
  if (score >= cutoff * 0.7) return { label: 'Limítrofe', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'Dentro do Esperado', color: 'text-emerald-600', bg: 'bg-emerald-50' };
}

// ─── Markdown renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const headingMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
    if (headingMatch) {
      result.push(
        <p key={i} className="text-xs font-black uppercase tracking-widest text-amber-300 mt-4 mb-1 first:mt-0">
          {headingMatch[1]}
        </p>
      );
      i++; continue;
    }
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      result.push(
        <div key={i} className="flex gap-2 mt-2">
          <span className="shrink-0 font-black text-amber-300">{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      result.push(
        <div key={i} className="flex gap-2 mt-1">
          <span className="shrink-0 text-amber-300">•</span>
          <span>{inlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      i++; continue;
    }
    result.push(<p key={i} className="mt-2 leading-relaxed">{inlineMarkdown(line)}</p>);
    i++;
  }
  return result;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-black text-white">{m[1]}</strong>;
    return part;
  });
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface SnapResult {
  id: string | number;
  date: string;
  answers: Record<number, number>;
  scores: {
    inattention: number;
    hyperactivity: number;
    oppositional: number;
  };
  analysis?: string;
  origin?: string;
}

// ─── Clinical Analysis ───────────────────────────────────────────────────────
function getClinicalAnalysis(scores: { inattention: number; hyperactivity: number; oppositional: number }) {
  const iLevel = getLevel('inattention', scores.inattention);
  const hLevel = getLevel('hyperactivity', scores.hyperactivity);
  const oLevel = getLevel('oppositional', scores.oppositional);

  const iText: Record<string, string> = {
    'Significativo': 'Escores de desatenção acima do ponto de corte clínico. Indica presença frequente de comportamentos de desatenção como dificuldade de manter foco, erros por descuido e esquecimentos, compatíveis com perfil de TDAH subtipo predominantemente desatento.',
    'Limítrofe': 'Escores de desatenção próximos ao limiar clínico. Há sinais de dificuldade atencional que merecem acompanhamento e monitoramento ao longo do tempo.',
    'Dentro do Esperado': 'Escores de desatenção dentro do esperado para a faixa etária. Sem indicadores clínicos significativos para desatenção no momento.',
  };

  const hText: Record<string, string> = {
    'Significativo': 'Escores de hiperatividade/impulsividade acima do limiar clínico. Comportamentos como agitação motora, interrupções frequentes e dificuldade de aguardar a vez são observados de forma consistente.',
    'Limítrofe': 'Escores de hiperatividade/impulsividade próximos ao ponto de corte. Sinais de inquietação e impulsividade presentes, mas ainda abaixo do critério clínico pleno.',
    'Dentro do Esperado': 'Escores de hiperatividade/impulsividade dentro da normalidade esperada. Sem indicadores clínicos de hiperatividade ou impulsividade no momento.',
  };

  const oText: Record<string, string> = {
    'Significativo': 'Escores de oposição/desafio acima do corte. Presença frequente de comportamentos desafiadores como discussões com adultos, recusa de seguir regras e irritabilidade acentuada.',
    'Limítrofe': 'Escores de oposição/desafio próximos ao limiar clínico. Há padrão de comportamento desafiador que merece atenção, mas ainda abaixo do critério diagnóstico.',
    'Dentro do Esperado': 'Escores de oposição/desafio dentro do esperado. Sem padrão de comportamento oposicionista clinicamente relevante no momento.',
  };

  const parts: string[] = [];
  parts.push(`**Desatenção (média ${scores.inattention.toFixed(2)} — ${iLevel.label}):** ${iText[iLevel.label]}`);
  parts.push(`**Hiperatividade/Impulsividade (média ${scores.hyperactivity.toFixed(2)} — ${hLevel.label}):** ${hText[hLevel.label]}`);
  parts.push(`**Oposição/Desafio (média ${scores.oppositional.toFixed(2)} — ${oLevel.label}):** ${oText[oLevel.label]}`);

  const significant = [iLevel, hLevel, oLevel].filter(l => l.label === 'Significativo');
  const borderline = [iLevel, hLevel, oLevel].filter(l => l.label === 'Limítrofe');
  let conclusion = '';
  if (significant.length === 0 && borderline.length === 0) {
    conclusion = 'O perfil geral da avaliação não indica comprometimento clínico significativo nos domínios avaliados pelo SNAP-IV no momento.';
  } else if (significant.length === 1 && borderline.length === 0) {
    conclusion = 'Um domínio apresenta escore clinicamente significativo. Recomenda-se avaliação clínica complementar e acompanhamento contínuo.';
  } else if (significant.length >= 2) {
    conclusion = 'Dois ou mais domínios apresentam escores acima do ponto de corte clínico. Avaliação diagnóstica aprofundada para TDAH e/ou TOD é fortemente recomendada.';
  } else {
    conclusion = 'Perfil com achados limítrofes. Monitoramento periódico recomendado para acompanhar evolução dos comportamentos avaliados.';
  }

  return { parts, conclusion };
}

export const SNAPIVPage: React.FC = () => {
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

  const [history, setHistory] = useState<SnapResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<SnapResult | null>(null);
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
        const resp = await api.get<SnapResult[]>(`/clinical-tools/${selectedPatientId}/snap-iv`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/f/snap-iv?u=${user?.shareToken}&p=${selectedPatientId}`;
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
    const text = encodeURIComponent(`Olá ${p?.full_name || 'responsável'}, por favor preencha esta escala SNAP-IV para nossa avaliação: ${link}`);
    window.open(`https://wa.me/${p?.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const calculateScores = (answers: Record<number, number>) => {
    const iSum = [1,2,3,4,5,6,7,8,9].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
    const hSum = [10,11,12,13,14,15,16,17,18].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
    const oSum = [19,20,21,22,23,24,25,26].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
    return {
      inattention: Number((iSum / 9).toFixed(2)),
      hyperactivity: Number((hSum / 9).toFixed(2)),
      oppositional: Number((oSum / 8).toFixed(2)),
    };
  };

  const currentScores = useMemo(() => calculateScores(currentAnswers), [currentAnswers]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente para salvar.');
      return;
    }
    if (Object.keys(currentAnswers).length < 26) {
      info('Atenção', 'Responda todas as 26 questões para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const newResult: SnapResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores,
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/snap-iv`, {
        patient_id: selectedPatientId,
        data: updatedHistory,
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('Avaliação Salva', 'A escala SNAP-IV foi registrada no prontuário.');
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
        toolName: 'SNAP-IV (TDAH e Oposição/Desafio — Swanson, Nolan e Pelham)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          interpretations: {
            inattention: getLevel('inattention', result.scores.inattention).label,
            hyperactivity: getLevel('hyperactivity', result.scores.hyperactivity).label,
            oppositional: getLevel('oppositional', result.scores.oppositional).label,
          },
        },
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      await api.put(`/clinical-tools/${selectedPatientId}/snap-iv`, {
        patient_id: selectedPatientId,
        data: updatedHistory,
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

  // ─── Radar Chart ─────────────────────────────────────────────────────────
  const RadarGraphic = ({ scores }: { scores: SnapResult['scores'] }) => {
    const max = 3;
    const size = 200;
    const center = size / 2;
    const r = 80;

    const getPos = (score: number, angle: number) => {
      const dist = (score / max) * r;
      const rad = (angle * Math.PI) / 180;
      return {
        x: center + dist * Math.cos(rad),
        y: center + dist * Math.sin(rad),
      };
    };

    const pI = getPos(scores.inattention, -90);
    const pH = getPos(scores.hyperactivity, 30);
    const pO = getPos(scores.oppositional, 150);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
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
        <line x1={center} y1={center} x2={center} y2={center - r} stroke="#cbd5e1" strokeDasharray="2" />
        <line x1={center} y1={center} x2={center + r * Math.cos(30 * Math.PI / 180)} y2={center + r * Math.sin(30 * Math.PI / 180)} stroke="#cbd5e1" strokeDasharray="2" />
        <line x1={center} y1={center} x2={center + r * Math.cos(150 * Math.PI / 180)} y2={center + r * Math.sin(150 * Math.PI / 180)} stroke="#cbd5e1" strokeDasharray="2" />

        <polygon
          points={`${pI.x},${pI.y} ${pH.x},${pH.y} ${pO.x},${pO.y}`}
          fill="rgba(37, 99, 235, 0.15)"
          stroke="#2563eb"
          strokeWidth="3"
        />

        {/* Cutoff polygon (normalized) */}
        {(() => {
          const ci = getPos(SNAP_CUTOFFS.inattention, -90);
          const ch = getPos(SNAP_CUTOFFS.hyperactivity, 30);
          const co = getPos(SNAP_CUTOFFS.oppositional, 150);
          return (
            <polygon
              points={`${ci.x},${ci.y} ${ch.x},${ch.y} ${co.x},${co.y}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1"
              strokeDasharray="3,2"
              opacity={0.5}
            />
          );
        })()}

        <text x={center} y={center - r - 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Desatenção</text>
        <text x={center + r * Math.cos(30 * Math.PI / 180) + 12} y={center + r * Math.sin(30 * Math.PI / 180) + 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Hiperativ.</text>
        <text x={center + r * Math.cos(150 * Math.PI / 180) - 12} y={center + r * Math.sin(150 * Math.PI / 180) + 15} textAnchor="middle" className="text-[10px] font-black uppercase fill-slate-400">Oposição</text>
      </svg>
    );
  };

  // ─── Print Report ─────────────────────────────────────────────────────────
  const handlePrintReport = (result: SnapResult | null, patientName: string) => {
    if (!result) return;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const levelColorMap: Record<string, string> = {
      'Significativo': '#e11d48',
      'Limítrofe': '#d97706',
      'Dentro do Esperado': '#10b981',
    };
    const levelBgMap: Record<string, string> = {
      'Significativo': '#fff1f2',
      'Limítrofe': '#fffbeb',
      'Dentro do Esperado': '#ecfdf5',
    };

    const subscales: { key: keyof SnapResult['scores']; label: string; color: string }[] = [
      { key: 'inattention', label: 'Desatenção', color: '#2563eb' },
      { key: 'hyperactivity', label: 'Hiperatividade/Impulsividade', color: '#7c3aed' },
      { key: 'oppositional', label: 'Oposição/Desafio', color: '#db2777' },
    ];

    const scoresHtml = subscales.map(sub => {
      const score = result.scores[sub.key];
      const level = getLevel(sub.key, score);
      const c = levelColorMap[level.label];
      const bg = levelBgMap[level.label];
      const pct = Math.min((score / 3) * 100, 100).toFixed(1);
      const cutoff = SNAP_CUTOFFS[sub.key];
      const cutoffPct = Math.min((cutoff / 3) * 100, 100).toFixed(1);
      return `
        <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:18px 22px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#334155">${sub.label}</span>
            <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${level.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:32px;font-weight:900;color:#0f172a;line-height:1;min-width:44px">${score.toFixed(2)}</span>
            <div style="flex:1">
              <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;position:relative">
                <div style="height:100%;width:${pct}%;background:${sub.color};border-radius:99px"></div>
                <div style="position:absolute;top:0;left:${cutoffPct}%;width:2px;height:100%;background:#f43f5e;opacity:.6"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px">
                <span style="font-size:9px;color:#94a3b8;font-weight:600">0</span>
                <span style="font-size:9px;color:#f43f5e;font-weight:700">Corte: ${cutoff}</span>
                <span style="font-size:9px;color:#94a3b8;font-weight:600">3</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const analysisHtml = parts.map(p => {
      const clean = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b">$1</strong>');
      return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="width:6px;height:6px;background:#2563eb;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${clean}</p>
      </div>`;
    }).join('');

    const scaleLabels = ['Nada', 'Um pouco', 'Bastante', 'Demais'];
    const subColorMap: Record<string, string> = { I: '#2563eb', H: '#7c3aed', O: '#db2777' };
    const subAbbrMap: Record<string, string> = { I: 'D', H: 'H', O: 'O' };

    const answersHtml = result.answers ? SNAPIV_ITEMS.map((item, i) => {
      const val = result.answers[item.id];
      const sc = subColorMap[item.subscale] || '#2563eb';
      const subAbbr = subAbbrMap[item.subscale];
      const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      return `<tr style="background:${bg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(item.id).padStart(2,'0')}</td>
        <td style="padding:8px 6px;width:22px"><span style="background:${sc}15;color:${sc};font-size:9px;font-weight:800;padding:2px 5px;border-radius:4px">${subAbbr}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 12px;text-align:right;white-space:nowrap">
          <span style="font-size:16px;font-weight:900;color:#2563eb">${val ?? '—'}</span>
          ${val !== undefined ? `<div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:1px">${scaleLabels[val]}</div>` : ''}
        </td>
      </tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>SNAP-IV — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<div style="background:linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.75">Relatório de Avaliação Psicológica</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">SNAP-IV</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Swanson, Nolan &amp; Pelham</p>
      </div>
    </div>
  </div>
</div>

<div style="padding:32px 40px">

  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#2563eb;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#2563eb;border-radius:1px"></span> Resultados por Subescala
    </h2>
    ${scoresHtml}
  </div>

  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#2563eb;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#2563eb;border-radius:1px"></span> Análise Clínica
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      ${analysisHtml}
      <div style="margin-top:14px;padding:14px 16px;background:#eff6ff;border-left:3px solid #2563eb;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12.5px;color:#1e40af;line-height:1.6"><strong>Conclusão:</strong> ${conclusion}</p>
      </div>
    </div>
  </div>

  ${answersHtml ? `
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#2563eb;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#2563eb;border-radius:1px"></span> Respostas do Informante (26 itens)
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 6px;width:26px"></th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:left">Item</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right">Resposta</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

  <div class="no-break" style="margin-bottom:28px;display:flex;gap:8px;flex-wrap:wrap">
    <div style="background:#fff1f2;border:1px solid #ffe4e6;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:#e11d48;display:inline-block;flex-shrink:0"></span>
      <span style="font-size:10px;font-weight:700;color:#e11d48">Significativo</span>
    </div>
    <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:#d97706;display:inline-block;flex-shrink:0"></span>
      <span style="font-size:10px;font-weight:700;color:#d97706">Limítrofe</span>
    </div>
    <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;flex-shrink:0"></span>
      <span style="font-size:10px;font-weight:700;color:#10b981">Dentro do Esperado</span>
    </div>
    <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
      <span style="font-size:9px;color:#94a3b8;font-weight:600">Linha tracejada vermelha = ponto de corte clínico</span>
    </div>
  </div>

</div>

<div style="border-top:1px solid #f1f5f9;padding:16px 40px;display:flex;justify-content:space-between;align-items:center">
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;text-transform:uppercase;letter-spacing:.1em">PsiFlux · Tecnologia para Prática Clínica</p>
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600">Gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</p>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // ─── Download PDF ─────────────────────────────────────────────────────────
  const handleDownloadPDF = (result: SnapResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'PsiFlux · Tecnologia para Prática Clínica';

    // Header
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, W, 45, 'F');
    doc.setFillColor(67, 120, 240);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(190, 210, 255);
    doc.text('RELATÓRIO DE AVALIAÇÃO PSICOLÓGICA', MARGIN, 15);

    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);

    doc.setFontSize(9); doc.setTextColor(210, 225, 255);
    doc.text(`Avaliação: SNAP-IV (Swanson, Nolan & Pelham)  |  ${dateStr}`, MARGIN, 33);

    let y = 58;

    // Subscale Results
    doc.setFontSize(10); doc.setTextColor(37, 99, 235);
    doc.text('RESULTADOS POR SUBESCALA', MARGIN, y);
    y += 6;

    const subscales: { key: keyof SnapResult['scores']; label: string; rgb: [number,number,number] }[] = [
      { key: 'inattention', label: 'Desatenção', rgb: [37, 99, 235] },
      { key: 'hyperactivity', label: 'Hiperatividade/Impulsividade', rgb: [124, 58, 237] },
      { key: 'oppositional', label: 'Oposição/Desafio', rgb: [219, 39, 119] },
    ];

    const levelColorRgb: Record<string, [number, number, number]> = {
      'Significativo': [225, 29, 72],
      'Limítrofe': [217, 119, 6],
      'Dentro do Esperado': [16, 185, 129],
    };

    subscales.forEach(sub => {
      const score = result.scores[sub.key];
      const level = getLevel(sub.key, score);
      const rgb = levelColorRgb[level.label] || [148, 163, 184];
      const cutoff = SNAP_CUTOFFS[sub.key];

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(MARGIN, y, CONTENT_W, 20, 4, 4, 'FD');

      doc.setFontSize(8); doc.setTextColor(51, 65, 85);
      doc.text(sub.label.toUpperCase(), MARGIN + 6, y + 8);

      doc.setFontSize(20); doc.setTextColor(15, 23, 42);
      doc.text(score.toFixed(2), MARGIN + 6, y + 17);

      const labelW = doc.getTextWidth(level.label) + 6;
      // Light background for label badge (use a very light version of the rgb)
      doc.setFillColor(Math.min(rgb[0] + 180, 255), Math.min(rgb[1] + 180, 255), Math.min(rgb[2] + 180, 255));
      doc.roundedRect(W - MARGIN - labelW - 6, y + 4, labelW, 6, 3, 3, 'F');

      doc.setFontSize(7.5); doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(level.label, W - MARGIN - labelW / 2 - 6, y + 8.2, { align: 'center' });

      // Progress bar
      const barW = CONTENT_W - 55;
      const barX = MARGIN + 45;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y + 12, barW, 2.5, 1.25, 1.25, 'F');
      doc.setFillColor(sub.rgb[0], sub.rgb[1], sub.rgb[2]);
      const progressW = Math.min((score / 3) * barW, barW);
      doc.roundedRect(barX, y + 12, progressW, 2.5, 1.25, 1.25, 'F');

      // Cutoff marker
      const cutoffX = barX + Math.min((cutoff / 3) * barW, barW);
      doc.setDrawColor(244, 63, 94);
      doc.setLineWidth(0.5);
      doc.line(cutoffX, y + 10.5, cutoffX, y + 16);

      y += 24;
    });

    // Radar (mini)
    const rx = W - MARGIN - 35;
    const ry = 80;
    const rSize = 25;

    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    [0.25, 0.5, 0.75, 1].forEach(s => {
      const r2 = rSize * s;
      const x1 = rx + r2 * Math.cos(-Math.PI/2); const y1 = ry + r2 * Math.sin(-Math.PI/2);
      const x2 = rx + r2 * Math.cos(Math.PI/6);  const y2 = ry + r2 * Math.sin(Math.PI/6);
      const x3 = rx + r2 * Math.cos(5*Math.PI/6); const y3 = ry + r2 * Math.sin(5*Math.PI/6);
      doc.line(x1, y1, x2, y2); doc.line(x2, y2, x3, y3); doc.line(x3, y3, x1, y1);
    });
    [- Math.PI/2, Math.PI/6, 5*Math.PI/6].forEach(a => {
      doc.line(rx, ry, rx + rSize * Math.cos(a), ry + rSize * Math.sin(a));
    });

    const iR = (result.scores.inattention / 3) * rSize;
    const hR = (result.scores.hyperactivity / 3) * rSize;
    const oR = (result.scores.oppositional / 3) * rSize;
    const p1 = { x: rx + iR * Math.cos(-Math.PI/2), y: ry + iR * Math.sin(-Math.PI/2) };
    const p2 = { x: rx + hR * Math.cos(Math.PI/6),  y: ry + hR * Math.sin(Math.PI/6) };
    const p3 = { x: rx + oR * Math.cos(5*Math.PI/6), y: ry + oR * Math.sin(5*Math.PI/6) };

    doc.setFillColor(37, 99, 235); doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.5);
    doc.lines([[p2.x - p1.x, p2.y - p1.y], [p3.x - p2.x, p3.y - p2.y], [p1.x - p3.x, p1.y - p3.y]], p1.x, p1.y, [1, 1], 'FD', true);

    y += 4;

    // Clinical Analysis
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(37, 99, 235);
    doc.text('ANÁLISE CLÍNICA', MARGIN, y);
    y += 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);

    const analysisLines: string[] = [];
    parts.forEach(p => {
      const clean = p.replace(/\*\*/g, '');
      analysisLines.push(...doc.splitTextToSize(clean, CONTENT_W - 16));
    });
    const conclusionLines = doc.splitTextToSize('Conclusão: ' + conclusion, CONTENT_W - 16);
    const boxH = (analysisLines.length + conclusionLines.length) * 5 + 15;

    if (y + boxH > 275) { doc.addPage(); y = 20; }
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4, 4, 'FD');

    let analysisY = y + 8;
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    analysisLines.forEach(line => {
      doc.text('• ' + line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    analysisY += 2;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
    conclusionLines.forEach(line => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    y += boxH + 15;

    // Answers table
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(37, 99, 235);
    doc.text('RESPOSTAS DO INFORMANTE (26 ITENS)', MARGIN, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('#', MARGIN + 4, y + 5);
    doc.text('ITEM', MARGIN + 12, y + 5);
    doc.text('RESPOSTA', W - MARGIN - 6, y + 5, { align: 'right' });
    y += 8;

    const scaleLabels = ['Nada', 'Um pouco', 'Bastante', 'Demais'];
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    SNAPIV_ITEMS.forEach((item, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const val = result.answers[item.id];
      const textLines = doc.splitTextToSize(item.text, CONTENT_W - 40);
      const rowH = Math.max(textLines.length * 4.5, 8);

      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
      }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text(String(item.id).padStart(2, '0'), MARGIN + 2, y + 5);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(51, 65, 85);
      textLines.forEach((ln: string, li: number) => {
        doc.text(ln, MARGIN + 12, y + 5 + li * 4.5);
      });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(37, 99, 235);
      doc.text(String(val ?? '—'), W - MARGIN - 20, y + 5);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(161, 161, 170);
      doc.text(scaleLabels[val] || '', W - MARGIN - 6, y + 5, { align: 'right' });

      y += rowH;
    });

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let j = 1; j <= totalPages; j++) {
      doc.setPage(j);
      doc.setFontSize(7); doc.setTextColor(203, 213, 225);
      doc.setDrawColor(241, 245, 249);
      doc.line(MARGIN, 282, W - MARGIN, 282);
      doc.text(systemName, MARGIN, 288);
      doc.text(`Página ${j} de ${totalPages}`, W - MARGIN, 288, { align: 'right' });
    }

    doc.save(`SNAP-IV_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const subscaleLabels: Record<string, string> = { I: 'Desatenção', H: 'Hiperatividade', O: 'Oposição' };
  const subscaleColors: Record<string, string> = {
    I: 'text-blue-500 bg-blue-50',
    H: 'text-indigo-500 bg-indigo-50',
    O: 'text-violet-500 bg-violet-50',
  };

  return (
    <>
      <div className="space-y-8 animate-fadeIn mb-8">
      <PageHeader
        title="SNAP-IV"
        subtitle="Escala de Avaliação de TDAH e Oposição/Desafio (Swanson, Nolan & Pelham)."
        icon={<Activity className="text-blue-500" />}
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
              className="bg-blue-600 text-white shadow-lg shadow-blue-200"
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
                 <Info size={14} className="text-blue-400" /> Referências Clínicas SNAP-IV
              </h4>
              <div className="space-y-3 pt-2 text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                 <p><span className="text-blue-600 font-black">0</span> — Nada</p>
                 <p><span className="text-blue-600 font-black">1</span> — Um pouco</p>
                 <p><span className="text-blue-600 font-black">2</span> — Bastante</p>
                 <p><span className="text-blue-600 font-black">3</span> — Demais</p>
              </div>
              <div className="pt-2 border-t border-slate-50 space-y-2">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pontos de Corte</p>
                 <p className="text-[9px] font-bold text-slate-500">Desatenção / Hiperativ.: ≥ 2,0</p>
                 <p className="text-[9px] font-bold text-slate-500">Oposição/Desafio: ≥ 1,67</p>
              </div>
          </div>
        </div>

        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Activity size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione o paciente para visualizar dados e gráficos SNAP-IV.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column: Graphics */}
              <div className="space-y-8">
                 <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                       <TrendingUp size={240} />
                    </div>

                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-blue-400 mb-10">
                       <Layout size={18} /> Gráfico SNAP-IV
                    </h3>

                    <div className="flex flex-col items-center gap-12">
                       <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm">
                          <RadarGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                       </div>
                       <div className="flex-1 space-y-6 w-full">
                          {(['inattention', 'hyperactivity', 'oppositional'] as const).map(sub => {
                             const lastRes = history.length > 0 ? history[history.length - 1] : null;
                             const score = lastRes ? lastRes.scores[sub] : currentScores[sub];
                             const level = getLevel(sub, score);
                             const subLabel = sub === 'inattention' ? 'Desatenção' : sub === 'hyperactivity' ? 'Hiperatividade' : 'Oposição';
                             return (
                               <div key={sub} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{subLabel}</span>
                                     <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 ${level.color}`}>{level.label}</span>
                                  </div>
                                  <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                                     <div className={`h-full transition-all duration-1000 ${level.color.replace('text', 'bg')}`} style={{ width: `${(score / 3) * 100}%` }} />
                                     {/* Cutoff marker */}
                                     <div className="absolute top-0 h-full w-px bg-rose-400 opacity-60" style={{ left: `${(SNAP_CUTOFFS[sub] / 3) * 100}%` }} />
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
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp size={16} className="text-blue-500" /> Evolução do Paciente
                       </h4>
                       <div className="flex gap-2">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"/><span className="text-[7px] font-black uppercase">Des</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"/><span className="text-[7px] font-black uppercase">Hip</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500"/><span className="text-[7px] font-black uppercase">Opo</span></div>
                       </div>
                    </div>

                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                       {history.length < 2 && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando mais dados históricos</p>
                         </div>
                       )}
                       {[...history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                         <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-violet-500/20 w-full rounded-t-lg transition-all group-hover:bg-violet-500/40" style={{ height: `${(res.scores.oppositional / 3) * 100}%` }} />
                            <div className="bg-indigo-500/40 w-full transition-all group-hover:bg-indigo-500/60" style={{ height: `${(res.scores.hyperactivity / 3) * 100}%` }} />
                            <div className="bg-blue-500/60 w-full rounded-b-lg transition-all group-hover:bg-blue-500" style={{ height: `${(res.scores.inattention / 3) * 100}%` }} />

                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                               <p className="text-[8px] font-black uppercase mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                               <div className="flex gap-2">
                                  <span className="text-[10px] font-black text-blue-400">D{res.scores.inattention.toFixed(1)}</span>
                                  <span className="text-[10px] font-black text-indigo-400">H{res.scores.hyperactivity.toFixed(1)}</span>
                                  <span className="text-[10px] font-black text-violet-400">O{res.scores.oppositional.toFixed(1)}</span>
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
                       {[...history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => (
                         <div key={res.id} className="px-6 py-4 hover:bg-slate-50 transition-all group flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <Clock size={11} className="text-blue-400 shrink-0" />
                                     <span className="text-xs font-black text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                     {res.analysis && <Sparkles size={11} className="text-amber-400" />}
                                     {res.origin === 'external' && <span className="text-[8px] font-black text-slate-300 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Externo</span>}
                                  </div>
                                  <div className="flex gap-3">
                                     {(['inattention', 'hyperactivity', 'oppositional'] as const).map(s => {
                                        const level = getLevel(s, res.scores[s]);
                                        const letter = s === 'inattention' ? 'D' : s === 'hyperactivity' ? 'H' : 'O';
                                        return (
                                           <div key={s} className="flex flex-col items-center">
                                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">{letter}</span>
                                              <span className={`text-xs font-black ${level.color}`}>{res.scores[s].toFixed(2)}</span>
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                               <button
                                 onClick={() => generateAIResult(res.id)}
                                 title="Análise Aurora"
                                 className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.analysis ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-blue-500'}`}
                               >
                                  <Sparkles size={13} className={analyzingId === res.id ? 'animate-spin' : ''} />
                               </button>
                               <button
                                 onClick={() => setDetailResult(res)}
                                 className="flex items-center gap-1.5 px-3 h-8 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
                               >
                                 Ver <ChevronRight size={12} />
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
      </div>

    {/* Result Detail Modal */}
    {detailResult && (
      <div className="fixed inset-0 mt-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-300" style={{maxHeight:'90vh'}}>

            {/* Header fixo */}
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
               <div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Avaliação SNAP-IV Consolidada</p>
                  {(() => {
                    const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
                    return <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{patientName}</h2>;
                  })()}
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
                    return (<>
                      <Button variant="outline" size="sm" radius="xl" leftIcon={<Printer size={14}/>} onClick={() => handlePrintReport(detailResult, patientName)}>Imprimir</Button>
                      <Button variant="primary" size="sm" radius="xl" leftIcon={<FileText size={14}/>} onClick={() => handleDownloadPDF(detailResult, patientName)} className="bg-slate-800 text-white shadow-lg shadow-slate-200">PDF</Button>
                    </>);
                  })()}
                  <button onClick={() => { setDetailResult(null); setShowAnswers(false); }} className="w-9 h-9 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center ml-1">
                     <Plus size={20} className="rotate-45" />
                  </button>
               </div>
            </div>

            {/* Conteúdo com scroll interno */}
            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 custom-scrollbar pb-12">
            {(() => {
              const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
              const { parts, conclusion } = getClinicalAnalysis(detailResult.scores);
              return (<>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                 <div className="bg-slate-950 rounded-2xl p-6 flex items-center justify-center shadow-xl" style={{minHeight:'200px'}}>
                    <RadarGraphic scores={detailResult.scores} />
                 </div>
                 <div className="space-y-3">
                    {(['inattention', 'hyperactivity', 'oppositional'] as const).map(sub => {
                       const score = detailResult.scores[sub];
                       const level = getLevel(sub, score);
                       const subLabel = sub === 'inattention' ? 'Desatenção' : sub === 'hyperactivity' ? 'Hiperatividade/Impulsividade' : 'Oposição/Desafio';
                       const cutoff = SNAP_CUTOFFS[sub];
                       return (
                         <div key={sub} className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-2">
                               <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{subLabel}</h4>
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${level.bg} ${level.color}`}>{level.label}</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-2xl font-black text-slate-900 w-12">{score.toFixed(2)}</div>
                               <div className="flex-1">
                                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden relative">
                                     <div className={`h-full ${level.color.replace('text', 'bg')}`} style={{ width: `${(score / 3) * 100}%` }} />
                                     <div className="absolute top-0 h-full w-px bg-rose-400 opacity-70" style={{ left: `${(cutoff / 3) * 100}%` }} />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                     <span className="text-[8px] text-slate-400 font-bold">0</span>
                                     <span className="text-[8px] text-rose-400 font-bold">corte {cutoff}</span>
                                     <span className="text-[8px] text-slate-400 font-bold">3</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                       );
                    })}
                 </div>
              </div>

              {/* Análise Clínica */}
              <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                 <div className="bg-slate-50 px-8 py-5 flex items-center gap-3 border-b border-slate-100">
                    <Brain size={18} className="text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Análise Clínica — SNAP-IV (Swanson, Nolan & Pelham)</h3>
                 </div>
                 <div className="p-8 space-y-4">
                    {parts.map((part, i) => {
                      const [bold, ...rest] = part.split(':');
                      return (
                        <div key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2 shrink-0" />
                           <p><span className="font-black text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':').replace(/^\*\*\s*/, ' ')}</p>
                        </div>
                      );
                    })}
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                       <span className="font-black text-blue-700">Conclusão: </span>{conclusion}
                    </div>
                 </div>
              </div>

              {detailResult.analysis && (
                <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-100">
                   <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-amber-400" /> Análise Aurora (IA)
                   </h3>
                   <div className="text-sm text-blue-100 space-y-0">
                      {renderMarkdown(detailResult.analysis!)}
                   </div>
                </div>
              )}

              {!detailResult.analysis && (
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex items-center gap-6">
                   <Sparkles size={32} className="text-slate-300 shrink-0" />
                   <div className="flex-1">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Aurora — IA Clínica</p>
                      <p className="text-sm text-slate-400">Gere uma análise aprofundada com inteligência artificial para este resultado SNAP-IV.</p>
                   </div>
                   <Button onClick={() => generateAIResult(detailResult.id)} isLoading={analyzingId === detailResult.id} className="bg-blue-600 text-white rounded-2xl px-6 py-3 shrink-0">Analisar</Button>
                </div>
              )}

              {/* Respostas do Informante */}
              {detailResult.answers && Object.keys(detailResult.answers).length > 0 && (
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                   <button
                     onClick={() => setShowAnswers(!showAnswers)}
                     className="w-full bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100 transition-all"
                   >
                      <div className="flex items-center gap-3">
                         <FileText size={18} className="text-slate-400" />
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Respostas do Informante (26 itens)</h3>
                      </div>
                      <ChevronRight size={18} className={`text-slate-400 transition-transform ${showAnswers ? 'rotate-90' : ''}`} />
                   </button>
                   {showAnswers && (
                     <div className="divide-y divide-slate-50">
                        {/* Group by subscale */}
                        {(['I', 'H', 'O'] as const).map(sub => {
                          const subItems = SNAPIV_ITEMS.filter(it => it.subscale === sub);
                          const subTitles: Record<string, string> = { I: 'Desatenção (itens 1–9)', H: 'Hiperatividade/Impulsividade (itens 10–18)', O: 'Oposição/Desafio (itens 19–26)' };
                          const subAccent: Record<string, string> = { I: 'text-blue-500 bg-blue-50', H: 'text-indigo-500 bg-indigo-50', O: 'text-violet-500 bg-violet-50' };
                          return (
                            <React.Fragment key={sub}>
                              <div className={`px-8 py-3 ${subAccent[sub]} border-b border-slate-100`}>
                                 <p className="text-[10px] font-black uppercase tracking-widest">{subTitles[sub]}</p>
                              </div>
                              {subItems.map(item => {
                                const val = detailResult.answers[item.id];
                                const scaleLabels = ['Nada', 'Um pouco', 'Bastante', 'Demais'];
                                return (
                                  <div key={item.id} className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60">
                                     <span className="text-[10px] font-black text-slate-300 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2,'0')}</span>
                                     <p className="flex-1 text-sm text-slate-600 leading-relaxed">{item.text}</p>
                                     <div className="shrink-0 text-right">
                                        <span className="text-lg font-black text-blue-600">{val ?? '—'}</span>
                                        {val !== undefined && <p className="text-[10px] text-slate-400 font-bold">{scaleLabels[val]}</p>}
                                     </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
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
      </div>
    )}

    {/* Share Modal */}
    <Modal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      title="Compartilhar SNAP-IV"
      subtitle="Envie o questionário para pais ou professores responderem"
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
         <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
               <Share2 size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-tight mb-1">Link de Avaliação Direta</p>
               <p className="text-xs text-slate-600 font-medium leading-relaxed">Este link é exclusivo para o paciente selecionado. As respostas serão integradas automaticamente ao gráfico de evolução.</p>
            </div>
         </div>

         <div className="space-y-2">
            <div className="flex gap-2">
              <input
                readOnly
                value={getShareLink()}
                className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono focus:ring-2 focus:ring-blue-100 outline-none"
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
      title="Aplicação SNAP-IV"
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
            className="flex-2 bg-blue-600 text-white"
          >
            Processar e Salvar Escala <Save size={18} className="ml-2" />
          </Button>
        </div>
      }
    >
      <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
         <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
              "Avalie com que frequência cada comportamento ocorre. Baseie-se nos últimos 6 meses."
            </p>
            <div className="flex gap-6 mt-4 flex-wrap">
              {[{ v: 0, l: 'Nada' }, { v: 1, l: 'Um pouco' }, { v: 2, l: 'Bastante' }, { v: 3, l: 'Demais' }].map(opt => (
                <div key={opt.v} className="flex items-center gap-2">
                   <span className="text-blue-600 font-black text-base">{opt.v}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">{opt.l}</span>
                </div>
              ))}
            </div>
         </div>

         {(['I', 'H', 'O'] as const).map(sub => {
           const subItems = SNAPIV_ITEMS.filter(it => it.subscale === sub);
           const subTitles: Record<string, string> = {
             I: 'Desatenção',
             H: 'Hiperatividade / Impulsividade',
             O: 'Oposição / Desafio',
           };
           const subBg: Record<string, string> = {
             I: 'bg-blue-50 border-blue-100 text-blue-700',
             H: 'bg-indigo-50 border-indigo-100 text-indigo-700',
             O: 'bg-violet-50 border-violet-100 text-violet-700',
           };
           return (
             <div key={sub} className="space-y-6">
               <div className={`rounded-2xl px-5 py-3 border ${subBg[sub]}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest">{subTitles[sub]}</p>
               </div>
               {subItems.map(item => (
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
           );
         })}
      </div>
    </Modal>
    </>
  );
};
