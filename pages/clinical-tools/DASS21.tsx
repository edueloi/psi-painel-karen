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
        <p key={i} className="text-xs font-black uppercase tracking-widest text-amber-300 mt-4 mb-1 first:mt-0">
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
          <span className="shrink-0 font-black text-amber-300">{numMatch[1]}.</span>
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
          <span className="shrink-0 text-amber-300">•</span>
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
    if (m) return <strong key={i} className="font-black text-white">{m[1]}</strong>;
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
            <span style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#334155">${subLabels[sub]}</span>
            <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${interp.label}</span>
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
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.75">Relatório de Avaliação Psicológica</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.8;margin-bottom:2px">Instrumento</p>
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
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#6366f1;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#6366f1;border-radius:1px"></span> Resultados por Domínio
    </h2>
    ${scoresHtml}
  </div>

  <!-- ANALYSIS -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#6366f1;display:flex;align-items:center;gap:8px">
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
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#6366f1;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#6366f1;border-radius:1px"></span> Respostas do Paciente
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 6px;width:26px"></th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:left">Afirmação</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right">Resposta</th>
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

  const handleDownloadPDF = (result: DassResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'PsiFlux · Tecnologia para Prática Clínica';

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
    doc.text(`Avaliação: DASS-21 (Vignola & Tucci)  |  ${dateStr}`, MARGIN, 33);

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
    <>
      <div className="space-y-8 animate-fadeIn mb-8">
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
                         <div key={res.id} className="px-6 py-4 hover:bg-slate-50 transition-all group flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <Clock size={11} className="text-indigo-400 shrink-0" />
                                     <span className="text-xs font-black text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                     {res.analysis && <Sparkles size={11} className="text-amber-400" />}
                                  </div>
                                  <div className="flex gap-3">
                                     {(['Depression', 'Anxiety', 'Stress'] as const).map(s => {
                                        const interp = getInterpretation(s, res.scores[s]);
                                        return (
                                           <div key={s} className="flex flex-col items-center">
                                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">{s.charAt(0)}</span>
                                              <span className={`text-xs font-black ${interp.color}`}>{res.scores[s]}</span>
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
                                 className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.analysis ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-indigo-500'}`}
                               >
                                  <Sparkles size={13} className={analyzingId === res.id ? 'animate-spin' : ''} />
                               </button>
                               <button
                                 onClick={() => setDetailResult(res)}
                                 className="flex items-center gap-1.5 px-3 h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
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
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Avaliação Consolidada</p>
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
                      {(['Depression', 'Anxiety', 'Stress'] as const).map(sub => {
                         const score = detailResult.scores[sub];
                         const interp = getInterpretation(sub, score);
                         return (
                           <div key={sub} className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50">
                              <div className="flex items-center justify-between mb-2">
                                 <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{sub === 'Depression' ? 'Depressão' : sub === 'Anxiety' ? 'Ansiedade' : 'Estresse'}</h4>
                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${interp.bg} ${interp.color}`}>{interp.label}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-2xl font-black text-slate-900 w-8">{score}</div>
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
                             <p><span className="font-black text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':').replace(/^\*\*\s*/, ' ')}</p>
                          </div>
                        );
                      })}
                      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                         <span className="font-black text-indigo-700">Conclusão: </span>{conclusion}
                      </div>
                   </div>
                </div>

                {detailResult.analysis && (
                  <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-indigo-100">
                     <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-amber-400" /> Análise Aurora (IA)
                     </h3>
                     <div className="text-sm text-indigo-100 space-y-0">
                        {renderMarkdown(detailResult.analysis!)}
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
    </>
  );
};
