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
  MessageCircle as WhatsAppIcon
} from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { Alert } from '../../components/UI/Alert';
import { EmptyState } from '../../components/UI/EmptyState';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { Button, IconButton } from '../../components/UI/Button';
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

// ─── Markdown renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    // Heading-like patterns: **TITLE** alone on a line
    const headingMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
    if (headingMatch) {
      result.push(
        <p key={i} className="text-xs font-semibold text-primary-700 mt-4 mb-1 first:mt-0">
          {headingMatch[1]}
        </p>
      );
      i++; continue;
    }
    // Numbered list item: "1. text"
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      result.push(
        <div key={i} className="flex gap-2 mt-2">
          <span className="shrink-0 font-semibold text-primary-700">{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }
    // Bullet
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      result.push(
        <div key={i} className="flex gap-2 mt-1">
          <span className="shrink-0 text-primary-700">•</span>
          <span>{inlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      i++; continue;
    }
    // Normal paragraph
    result.push(<p key={i} className="mt-2 leading-relaxed">{inlineMarkdown(line)}</p>);
    i++;
  }
  return result;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-semibold text-slate-900">{m[1]}</strong>;
    return part;
  });
}

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

type DassTab = 'summary' | 'history';
type DassDetailTab = 'summary' | 'ai' | 'answers';

const dassTabs = [
  { id: 'summary', label: 'Resumo', icon: Layout },
  { id: 'history', label: 'Registros', icon: History },
] as const;

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
  const [activeTab, setActiveTab] = useState<DassTab>('summary');
  const [detailTab, setDetailTab] = useState<DassDetailTab>('summary');
  useEffect(() => { setDetailTab('summary'); }, [detailResult?.id]);
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
    const baseUrl = getPublicBaseUrl();
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
    const colorMap: Record<string,string> = { Normal:'#10b981', Leve:'#f59e0b', Moderado:'#f97316', Grave:'#f43f5e', 'Muito Grave':'#dc2626' };
    const bgMap: Record<string,string> = { Normal:'#ecfdf5', Leve:'#fffbeb', Moderado:'#fff7ed', Grave:'#fff1f2', 'Muito Grave':'#fef2f2' };
    const labels4 = ['Não se aplicou', 'Algum grau', 'Grau considerável', 'Quase sempre'];
    const subLabels: Record<string,string> = { Depression:'Depressão', Anxiety:'Ansiedade', Stress:'Estresse' };
    const subColor: Record<string,string> = { Depression:'#8b5cf6', Anxiety:'#f97316', Stress:'#3b82f6' };

    const scoresHtml = (['Depression','Anxiety','Stress'] as const).map(sub => {
      const score = result.scores[sub];
      const interp = getInterpretation(sub, score);
      const c = colorMap[interp.label] || '#94a3b8';
      const bg = bgMap[interp.label] || '#f8fafc';
      const pct = Math.min((score / 42) * 100, 100).toFixed(1);
      return `
        <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:18px 22px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:11px;font-weight:800;letter-spacing:.12em;;color:#334155">${subLabels[sub]}</span>
            <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;;letter-spacing:.08em">${interp.label}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:32px;font-weight:900;color:#0f172a;line-height:1;min-width:44px">${score}</span>
            <div style="flex:1">
              <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${c};border-radius:99px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px">
                <span style="font-size:9px;color:#94a3b8;font-weight:600">0</span>
                <span style="font-size:9px;color:#94a3b8;font-weight:600">42</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const analysisHtml = parts.map(p => {
      const clean = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b">$1</strong>');
      return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="width:6px;height:6px;background:#6366f1;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${clean}</p>
      </div>`;
    }).join('');

    const answersHtml = result.answers ? DASS_ITEMS.map((item, i) => {
      const val = result.answers[item.id];
      const sc = subColor[item.subscale] || '#6366f1';
      const subAbbr = item.subscale === 'Depression' ? 'D' : item.subscale === 'Anxiety' ? 'A' : 'E';
      const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      return `<tr style="background:${bg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(item.id).padStart(2,'0')}</td>
        <td style="padding:8px 6px;width:22px"><span style="background:${sc}15;color:${sc};font-size:9px;font-weight:800;padding:2px 5px;border-radius:4px">${subAbbr}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 12px;text-align:right;white-space:nowrap">
          <span style="font-size:16px;font-weight:900;color:#4f46e5">${val ?? '—'}</span>
          ${val !== undefined ? `<div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:1px">${labels4[val]}</div>` : ''}
        </td>
      </tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DASS-21 — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- COVER STRIPE -->
<div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;;opacity:.75">Relatório de Avaliação Psicológica</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">DASS-21</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Vignola & Tucci</p>
      </div>
    </div>
  </div>
</div>

<!-- BODY -->
<div style="padding:32px 40px">

  <!-- SCORES -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#6366f1;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#6366f1;border-radius:1px"></span> Resultados por Domínio
    </h2>
    ${scoresHtml}
  </div>

  <!-- ANALYSIS -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#6366f1;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#6366f1;border-radius:1px"></span> Análise Clínica
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      ${analysisHtml}
      <div style="margin-top:14px;padding:14px 16px;background:#eef2ff;border-left:3px solid #6366f1;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12.5px;color:#3730a3;line-height:1.6"><strong>Conclusão:</strong> ${conclusion}</p>
      </div>
    </div>
  </div>

  ${answersHtml ? `
  <!-- ANSWERS -->
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#6366f1;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#6366f1;border-radius:1px"></span> Respostas do Paciente
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 6px;width:26px"></th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:left">Afirmação</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:right">Resposta</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- LEGEND -->
  <div class="no-break" style="margin-bottom:28px;display:flex;gap:8px;flex-wrap:wrap">
    ${(['Normal','Leve','Moderado','Grave','Muito Grave'] as const).map(l => `
      <div style="background:${bgMap[l]};border:1px solid ${colorMap[l]}30;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${colorMap[l]};display:inline-block;flex-shrink:0"></span>
        <span style="font-size:10px;font-weight:700;color:${colorMap[l]}">${l}</span>
      </div>`).join('')}
  </div>

</div>

<!-- FOOTER -->
<div style="border-top:1px solid #f1f5f9;padding:16px 40px;display:flex;justify-content:space-between;align-items:center">
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;;letter-spacing:.1em">Plaelo · Tecnologia para Prática Clínica</p>
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

  const handleDownloadPDF = (result: DassResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'Plaelo · Tecnologia para Prática Clínica';

    // ── Header ──────────────────────────────────────────
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, W, 45, 'F');
    // Light strip
    doc.setFillColor(99, 91, 255);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(200, 195, 255);
    doc.text('RELATÓRIO DE AVALIAÇÃO PSICOLÓGICA', MARGIN, 15);
    
    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);
    
    doc.setFontSize(9); doc.setTextColor(220, 218, 255);
    doc.text(`Avaliação: DASS-21 (Vignola & Tucci) | ${dateStr}`, MARGIN, 33);

    let y = 58;

    // ── Resumo dos Domínios ────────────────────────────────
    doc.setFontSize(10); doc.setTextColor(99, 102, 241);
    doc.text('RESULTADOS POR DOMÍNIO', MARGIN, y);
    y += 6;

    const subscaleLabels: Record<string, string> = { Depression: 'Depressão', Anxiety: 'Ansiedade', Stress: 'Estresse' };
    const colorMap: Record<string, [number, number, number]> = { 
      Normal: [16, 185, 129], 
      Leve: [245, 158, 11], 
      Moderado: [249, 115, 22], 
      Grave: [244, 63, 94], 
      'Muito Grave': [220, 38, 38] 
    };

    (['Depression', 'Anxiety', 'Stress'] as const).forEach(sub => {
      const score = result.scores[sub];
      const interp = getInterpretation(sub, score);
      const rgb = colorMap[interp.label] || [148, 163, 184];

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(MARGIN, y, CONTENT_W, 20, 4, 4, 'FD');

      doc.setFontSize(8); doc.setTextColor(51, 65, 85);
      doc.text(subscaleLabels[sub].toUpperCase(), MARGIN + 6, y + 8);

      doc.setFontSize(24); doc.setTextColor(15, 23, 42);
      doc.text(String(score), MARGIN + 6, y + 17);

      // Label background
      doc.setFillColor(rgb[0], rgb[1], rgb[2], 0.1);
      const labelW = doc.getTextWidth(interp.label) + 6;
      doc.roundedRect(W - MARGIN - labelW - 6, y + 4, labelW, 6, 3, 3, 'F');
      
      doc.setFontSize(7.5); doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(interp.label, W - MARGIN - labelW / 2 - 6, y + 8.2, { align: 'center' });

      // Progress bar
      const barW = CONTENT_W - 55;
      const barX = MARGIN + 40;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y + 12, barW, 2.5, 1.25, 1.25, 'F');
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      const progressW = Math.min((score / 42) * barW, barW);
      doc.roundedRect(barX, y + 12, progressW, 2.5, 1.25, 1.25, 'F');

      y += 24;
    });

    // ── Radar Chart (Visual WOW) ──────────────────────────
    const rx = W - MARGIN - 35;
    const ry = 80;
    const rSize = 25;
    
    // Web
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    [0.25, 0.5, 0.75, 1].forEach(s => {
      const r = rSize * s;
      const x1 = rx + r * Math.cos(-Math.PI/2); const y1 = ry + r * Math.sin(-Math.PI/2);
      const x2 = rx + r * Math.cos(Math.PI/6);  const y2 = ry + r * Math.sin(Math.PI/6);
      const x3 = rx + r * Math.cos(5*Math.PI/6); const y3 = ry + r * Math.sin(5*Math.PI/6);
      doc.line(x1, y1, x2, y2); doc.line(x2, y2, x3, y3); doc.line(x3, y3, x1, y1);
    });

    // Axes
    [ -Math.PI/2, Math.PI/6, 5*Math.PI/6 ].forEach(a => {
      doc.line(rx, ry, rx + rSize * Math.cos(a), ry + rSize * Math.sin(a));
    });

    // Polygon
    const dR = (result.scores.Depression / 42) * rSize;
    const aR = (result.scores.Anxiety / 42) * rSize;
    const sR = (result.scores.Stress / 42) * rSize;
    
    const p1 = { x: rx + dR * Math.cos(-Math.PI/2), y: ry + dR * Math.sin(-Math.PI/2) };
    const p2 = { x: rx + aR * Math.cos(Math.PI/6),  y: ry + aR * Math.sin(Math.PI/6) };
    const p3 = { x: rx + sR * Math.cos(5*Math.PI/6), y: ry + sR * Math.sin(5*Math.PI/6) };
    
    doc.setFillColor(79, 70, 229, 0.3); doc.setDrawColor(79, 70, 229); doc.setLineWidth(0.5);
    doc.lines([[p2.x - p1.x, p2.y - p1.y], [p3.x - p2.x, p3.y - p2.y], [p1.x - p3.x, p1.y - p3.y]], p1.x, p1.y, [1, 1], 'FD', true);

    y += 4;

    // ── Análise Clínica ───────────────────────────────────
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(99, 102, 241);
    doc.text('ANÁLISE CLÍNICA', MARGIN, y);
    y += 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);
    
    // Calcular altura da análise
    const analysisLines: string[] = [];
    parts.forEach(p => {
      const clean = p.replace(/\*\*/g, '');
      analysisLines.push(...doc.splitTextToSize(clean, CONTENT_W - 16));
    });
    const conclusionLines = doc.splitTextToSize('Conclusão:' + conclusion, CONTENT_W - 16);
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
    doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 48, 163);
    conclusionLines.forEach((line, i) => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    y += boxH + 15;

    // ── Respostas do Paciente ─────────────────────────────
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(99, 102, 241);
    doc.text('RESPOSTAS DO PACIENTE', MARGIN, y);
    y += 6;

    const tableHeaderY = y;
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('#', MARGIN + 4, y + 5);
    doc.text('AFIRMAÇÃO', MARGIN + 12, y + 5);
    doc.text('RESPOSTA', W - MARGIN - 6, y + 5, { align: 'right' });
    y += 8;

    const labels4 = ['Não se aplicou', 'Algum grau', 'Grau considerável', 'Quase sempre'];
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    DASS_ITEMS.forEach((item, i) => {
      if (y > 275) { 
        doc.addPage(); y = 20; 
        // Repetir header se quiser
      }
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
      textLines.forEach((ln, li) => {
        doc.text(ln, MARGIN + 12, y + 5 + li * 4.5);
      });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(79, 70, 229);
      doc.text(String(val ?? '—'), W - MARGIN - 20, y + 5);
      
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(161, 161, 170);
      doc.text(labels4[val] || '', W - MARGIN - 6, y + 5, { align: 'right' });

      y += rowH;
    });

    // ── Footer ───────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let j = 1; j <= totalPages; j++) {
      doc.setPage(j);
      doc.setFontSize(7); doc.setTextColor(203, 213, 225);
      doc.setDrawColor(241, 245, 249);
      doc.line(MARGIN, 282, W - MARGIN, 282);
      doc.text(systemName, MARGIN, 288);
      doc.text(`Página ${j} de ${totalPages}`, W - MARGIN, 288, { align: 'right' });
    }

    doc.save(`DASS-21_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
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
      success('Bia Analisou', 'Interpretação clínica gerada.');
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
          style={{ fill: 'var(--c-500)', fillOpacity: 0.15, stroke: 'var(--c-600)' }}
          strokeWidth="2"
        />
        
        {/* Labels */}
        <text x={center} y={center - r - 15} textAnchor="middle" className="text-[11px] font-semibold fill-slate-400">Depressão</text>
        <text x={center + r * Math.cos(30 * Math.PI / 180) + 10} y={center + r * Math.sin(30 * Math.PI / 180) + 15} textAnchor="middle" className="text-[11px] font-semibold fill-slate-400">Ansiedade</text>
        <text x={center + r * Math.cos(150 * Math.PI / 180) - 10} y={center + r * Math.sin(150 * Math.PI / 180) + 15} textAnchor="middle" className="text-[11px] font-semibold fill-slate-400">Estresse</text>
      </svg>
    );
  };

  const detailPatientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Activity}
          title="DASS-21"
          description="Escala de Depressão, Ansiedade e Estresse (Vignola & Tucci)."
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={() => selectedPatientId ? setIsApplying(true) : info('Selecione um paciente', 'Escolha um prontuário para aplicar a escala.')}
              >
                Aplicar Nova Escala
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Share2 size={14} />}
                onClick={() => selectedPatientId ? setShareOpen(true) : info('Selecione um paciente', 'Escolha um prontuário para compartilhar.')}
              >
                Compartilhar
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <div className="min-w-0 space-y-3">
            <ClinicalSidebar
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={id => setSelectedPatientId(id)}
              patientSearch={patientSearch}
              setPatientSearch={setPatientSearch}
              isLoading={loadingPatients}
              t={t}
            />

            <PanelCard title="Instruções (Vignola & Tucci)" icon={Info}>
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  "Por favor, leia cuidadosamente cada uma das afirmações abaixo e marque o número apropriado 0, 1, 2 ou 3."
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <p><span className="text-primary-700 font-medium">0</span> — Não se aplicou de maneira alguma</p>
                  <p><span className="text-primary-700 font-medium">1</span> — Aplicou-se em algum grau</p>
                  <p><span className="text-primary-700 font-medium">2</span> — Aplicou-se consideravelmente</p>
                  <p><span className="text-primary-700 font-medium">3</span> — Aplicou-se muito / maioria do tempo</p>
                </div>
              </div>
            </PanelCard>
          </div>

          <div className="min-w-0 space-y-4">
            {!selectedPatientId ? (
              <ContentCard>
                <EmptyState icon={Activity} title="Nenhum paciente selecionado" description="Selecione o paciente para visualizar dados e gráficos DASS-21." />
              </ContentCard>
            ) : (
              <Tabs<DassTab> items={dassTabs} value={activeTab} onChange={setActiveTab} label="Seções do DASS-21">
                {activeTab === 'summary' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {/* Left Column: Graphics */}
                    <div className="min-w-0 space-y-3">
                      <PanelCard title="Gráfico Circular de Tríade" icon={Layout}>
                        <div className="space-y-4">
                          <div className="flex justify-center bg-slate-50 border border-slate-100 rounded-lg p-4 overflow-x-auto">
                            <RadarGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                          </div>
                          <div className="space-y-3">
                            {(['Depression', 'Anxiety', 'Stress'] as const).map(sub => {
                              const lastRes = history.length > 0 ? history[history.length - 1] : null;
                              const score = lastRes ? lastRes.scores[sub] : currentScores[sub];
                              const interpretation = getInterpretation(sub, score);
                              const label = sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse';
                              return (
                                <div key={sub} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-600">{label}</span>
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${interpretation.bg} ${interpretation.color}`}>{interpretation.label}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${interpretation.color.replace('text', 'bg')}`} style={{ width: `${(score / 42) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                            <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">Resultado da Última Avaliação Sincronizada</p>
                          </div>
                        </div>
                      </PanelCard>

                      {/* Cross-instrument recommendations */}
                      {history.length > 0 && (() => {
                        const last = history[history.length - 1];
                        const depInterp = getInterpretation('Depression', last.scores.Depression);
                        const anxInterp = getInterpretation('Anxiety', last.scores.Anxiety);
                        const recs = [];
                        if (['Moderado','Grave','Muito Grave'].includes(depInterp.label)) {
                          recs.push({ slug: 'bdi-ii', label: 'BDI-II', desc: 'Inventário de Depressão de Beck', reason: `Depressão ${depInterp.label} no DASS-21`, color: 'rose' });
                        }
                        if (['Moderado','Grave','Muito Grave'].includes(anxInterp.label)) {
                          recs.push({ slug: 'bai', label: 'BAI', desc: 'Inventário de Ansiedade de Beck', reason: `Ansiedade ${anxInterp.label} no DASS-21`, color: 'amber' });
                        }
                        if (recs.length === 0) return null;
                        return (
                          <PanelCard title="Instrumentos Sugeridos" icon={Zap}>
                            <div className="space-y-2">
                              {recs.map(r => (
                                <button
                                  key={r.slug}
                                  type="button"
                                  onClick={() => navigate(`/caixa-ferramentas/${r.slug}?patientId=${selectedPatientId}`)}
                                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                                    r.color === 'rose'
                                      ? 'bg-red-50 border-red-100 hover:bg-red-100'
                                      : 'bg-amber-50 border-amber-100 hover:bg-amber-100'
                                  }`}
                                >
                                  <div className="text-left min-w-0">
                                    <p className={`text-xs font-medium ${r.color === 'rose' ? 'text-red-700' : 'text-amber-700'}`}>{r.label}</p>
                                    <p className="text-[11px] text-slate-600">{r.desc}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 italic">{r.reason}</p>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </PanelCard>
                        );
                      })()}
                    </div>

                    {/* Right Column: Evolution */}
                    <PanelCard
                      title="Evolução do Paciente"
                      icon={TrendingUp}
                      className="self-start"
                      action={
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[11px] text-slate-500">D</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[11px] text-slate-500">A</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[11px] text-slate-500">S</span></div>
                        </div>
                      }
                    >
                      <div className="h-56 w-full bg-slate-50 rounded-lg border border-slate-100 p-3 flex items-end gap-2 relative">
                        {history.length < 2 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <p className="text-[11px] text-slate-500">Aguardando mais dados históricos</p>
                          </div>
                        )}
                        {history.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                          <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-orange-500/20 w-full rounded-t-md transition-all group-hover:bg-orange-500/40" style={{ height: `${(res.scores.Stress / 42) * 100}%` }} />
                            <div className="bg-amber-500/40 w-full transition-all group-hover:bg-amber-500/60" style={{ height: `${(res.scores.Anxiety / 42) * 100}%` }} />
                            <div className="bg-emerald-500/60 w-full rounded-b-md transition-all group-hover:bg-emerald-500" style={{ height: `${(res.scores.Depression / 42) * 100}%` }} />

                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                              <p className="text-[11px] font-medium mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                              <div className="flex gap-2">
                                <span className="text-[11px] font-medium text-emerald-400">D{res.scores.Depression}</span>
                                <span className="text-[11px] font-medium text-amber-400">A{res.scores.Anxiety}</span>
                                <span className="text-[11px] font-medium text-orange-400">S{res.scores.Stress}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </PanelCard>
                  </div>
                )}

                {activeTab === 'history' && (
                  <PanelCard title="Registros Sincronizados" icon={History} contentClassName="p-0">
                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto custom-scrollbar">
                      {history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => (
                        <div key={res.id} className="px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-primary-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                              {res.analysis && <Sparkles size={12} className="text-primary-500" />}
                            </div>
                            <div className="flex gap-3">
                              {(['Depression', 'Anxiety', 'Stress'] as const).map(s => {
                                const interp = getInterpretation(s, res.scores[s]);
                                return (
                                  <div key={s} className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-500">{s.charAt(0)}</span>
                                    <span className={`text-xs font-medium ${interp.color}`}>{res.scores[s]}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <IconButton
                              variant={res.analysis ? 'primary' : 'outline'}
                              size="sm"
                              aria-label="Análise Bia"
                              title="Análise Bia"
                              loading={analyzingId === res.id}
                              onClick={() => generateAIResult(res.id)}
                            >
                              <Sparkles size={14} />
                            </IconButton>
                            <Button variant="outline" size="sm" iconRight={<ChevronRight size={14} />} onClick={() => setDetailResult(res)}>
                              Ver
                            </Button>
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && (
                        <EmptyState icon={FileText} title="Sem lançamentos" />
                      )}
                    </div>
                  </PanelCard>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Result Detail Modal */}
      <Modal
        isOpen={!!detailResult}
        onClose={() => { setDetailResult(null); setShowAnswers(false); }}
        size="2xl"
        title={detailPatientName}
        subtitle={detailResult ? `Avaliação Consolidada — DASS-21 · ${new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : undefined}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => { setDetailResult(null); setShowAnswers(false); }}>Fechar</Button>
            {detailResult && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={() => handlePrintReport(detailResult, detailPatientName)}>Imprimir</Button>
                <Button variant="primary" size="sm" iconLeft={<FileText size={14} />} onClick={() => handleDownloadPDF(detailResult, detailPatientName)}>PDF</Button>
              </div>
            )}
          </div>
        }
      >
        {detailResult && (() => {
          const { parts, conclusion } = getClinicalAnalysis(detailResult.scores);
          const hasAnswers = !!detailResult.answers && Object.keys(detailResult.answers).length > 0;
          const detailTabs = [
            { id: 'summary', label: 'Resultado', icon: Layout },
            { id: 'ai', label: 'Análise Bia', icon: Sparkles },
            ...(hasAnswers ? [{ id: 'answers', label: 'Respostas', icon: FileText }] : []),
          ] as { id: DassDetailTab; label: string; icon: typeof Layout }[];
          return (
            <Tabs<DassDetailTab> items={detailTabs} value={detailTabs.some(d => d.id === detailTab) ? detailTab : 'summary'} onChange={setDetailTab} label="Detalhes da avaliação">
              {detailTab === 'summary' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-center overflow-x-auto">
                      <RadarGraphic scores={detailResult.scores} />
                    </div>
                    <div className="space-y-2">
                      {(['Depression', 'Anxiety', 'Stress'] as const).map(sub => {
                        const score = detailResult.scores[sub];
                        const interp = getInterpretation(sub, score);
                        return (
                          <div key={sub} className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium text-slate-700">{sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse'}</h4>
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${interp.bg} ${interp.color}`}>{interp.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-base font-medium text-slate-900 w-8">{score}</div>
                              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${interp.color.replace('text', 'bg')}`} style={{ width: `${(score / 42) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Análise Clínica Baseada em Protocolo */}
                  <PanelCard title="Análise Clínica — DASS-21 (Vignola & Tucci)" icon={Brain}>
                    <div className="space-y-3">
                      {parts.map((part, i) => {
                        const [bold, ...rest] = part.split(':');
                        return (
                          <div key={i} className="flex gap-3 text-[13px] leading-relaxed text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-300 mt-2 shrink-0" />
                            <p><span className="font-medium text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':').replace(/^\*\*\s*/, ' ')}</p>
                          </div>
                        );
                      })}
                      <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-[13px] text-slate-700 leading-relaxed">
                        <span className="font-medium text-primary-700">Conclusão: </span>{conclusion}
                      </div>
                    </div>
                  </PanelCard>
                </div>
              )}

              {detailTab === 'ai' && (
                detailResult.analysis ? (
                  <PanelCard title="Análise Bia (IA)" icon={Sparkles}>
                    <div className="text-[13px] text-slate-700 space-y-0">
                      {renderMarkdown(detailResult.analysis!)}
                    </div>
                  </PanelCard>
                ) : (
                  <ContentCard>
                    <EmptyState
                      icon={Sparkles}
                      title="Bia — IA Clínica"
                      description="Gere uma análise aprofundada com inteligência artificial para este resultado."
                      action={<Button variant="primary" size="sm" loading={analyzingId === detailResult.id} onClick={() => generateAIResult(detailResult.id)}>Analisar</Button>}
                    />
                  </ContentCard>
                )
              )}

              {detailTab === 'answers' && hasAnswers && (
                <PanelCard title="Respostas do Paciente (21 itens)" icon={FileText} contentClassName="p-0">
                  <div className="divide-y divide-slate-100">
                    {DASS_ITEMS.map(item => {
                      const val = detailResult.answers[item.id];
                      const labels = ['Não se aplicou', 'Algum grau', 'Grau considerável', 'Quase sempre'];
                      const subLabel = item.subscale === 'Depression' ? 'D' : item.subscale === 'Anxiety' ? 'A' : 'E';
                      const subColor = item.subscale === 'Depression' ? 'text-amber-600 bg-amber-50' : item.subscale === 'Anxiety' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50';
                      return (
                        <div key={item.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50/60">
                          <span className="text-[11px] text-slate-400 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2,'0')}</span>
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 ${subColor}`}>{subLabel}</span>
                          <p className="flex-1 text-[13px] text-slate-600 leading-relaxed">{item.text}</p>
                          <div className="shrink-0 text-right">
                            <span className="text-sm font-medium text-primary-700">{val ?? '—'}</span>
                            {val !== undefined && <p className="text-[11px] text-slate-500">{labels[val]}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PanelCard>
              )}
            </Tabs>
          );
        })()}
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartilhar DASS-21"
        subtitle="Envie o questionário para o paciente responder em casa"
        size="md"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="ghost" size="sm" onClick={() => setShareOpen(false)}>Fechar</Button>
            <Button variant="success" size="sm" iconLeft={<WhatsAppIcon size={14} />} onClick={handleWhatsApp}>
              Enviar WhatsApp
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert variant="info" title="Link de Avaliação Direta">
            Este link é exclusivo para o paciente selecionado. As respostas serão integradas automaticamente ao gráfico de evolução dele.
          </Alert>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                readOnly
                aria-label="Link de avaliação"
                wrapperClassName="flex-1"
                className="font-mono"
                value={getShareLink()}
              />
              <Button variant="outline" onClick={handleCopy}
                iconLeft={copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 text-center pt-1 flex items-center justify-center gap-2">
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
        size="2xl"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsApplying(false)}>Cancelar</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              iconRight={<Save size={14} />}
            >
              Processar e Salvar Escala
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Alert variant="info">
            "Por favor, leia cada afirmação e selecione o quanto ela se aplicou ao paciente durante a última semana."
          </Alert>

          <div className="divide-y divide-slate-100">
            {DASS_ITEMS.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-medium text-[11px] shrink-0 border border-slate-200">{item.id}</span>
                  <p className="text-[13px] font-medium text-slate-800 leading-snug pt-1">{item.text}</p>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:w-56 shrink-0">
                  {[0, 1, 2, 3].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCurrentAnswers({ ...currentAnswers, [item.id]: val })}
                      className={`h-9 rounded-lg text-xs font-medium transition-colors border ${
                        currentAnswers[item.id] === val
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-primary-300'
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
    </PageWrapper>
  );
};
