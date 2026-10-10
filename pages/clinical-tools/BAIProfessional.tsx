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
const BAI_ITEMS = [
  { id: 1, text: "Dormência ou formigamento" },
  { id: 2, text: "Sensação de calor" },
  { id: 3, text: "Tremor nas pernas" },
  { id: 4, text: "Incapaz de relaxar" },
  { id: 5, text: "Medo que o pior aconteça" },
  { id: 6, text: "Tonturas ou vertigens" },
  { id: 7, text: "Batimento cardíaco acelerado ou palpitações" },
  { id: 8, text: "Sem equilíbrio" },
  { id: 9, text: "Aterrorizado" },
  { id: 10, text: "Nervoso" },
  { id: 11, text: "Sensação de sufocamento" },
  { id: 12, text: "Tremor nas mãos" },
  { id: 13, text: "Trêmulo" },
  { id: 14, text: "Medo de perder o controle" },
  { id: 15, text: "Dificuldade de respirar" },
  { id: 16, text: "Medo de morrer" },
  { id: 17, text: "Assustado" },
  { id: 18, text: "Indigestão ou desconforto abdominal" },
  { id: 19, text: "Sensação de desmaio" },
  { id: 20, text: "Rosto afogueado" },
  { id: 21, text: "Suando (não pelo calor)" },
];

const SCORING_LABELS = [
  { range: [0, 7], label: "Mínimo", color: "text-emerald-500", bg: "bg-emerald-50" },
  { range: [8, 15], label: "Leve", color: "text-amber-500", bg: "bg-amber-50" },
  { range: [16, 25], label: "Moderado", color: "text-orange-500", bg: "bg-orange-50" },
  { range: [26, 63], label: "Grave", color: "text-red-600", bg: "bg-red-100" },
];

function getInterpretation(score: number) {
  return SCORING_LABELS.find(l => score >= l.range[0] && score <= l.range[1]) || SCORING_LABELS[0];
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
        <p key={i} className="text-xs font-semibold text-primary-700 mt-4 mb-1 first:mt-0">
          {headingMatch[1]}
        </p>
      );
      i++; continue;
    }
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
interface BaiResult {
  id: string | number;
  date: string;
  answers: Record<number, number>;
  scores: {
    total: number;
  };
  analysis?: string;
  origin?: string;
}

// ─── getClinicalAnalysis ──────────────────────────────────────────────────────
function getClinicalAnalysis(scores: { total: number }): { parts: string[]; conclusion: string } {
  const level = getInterpretation(scores.total);

  const textMap: Record<string, string> = {
    Mínimo: 'Ausência de sintomas ansiosos clinicamente relevantes. Nível de ansiedade dentro da normalidade esperada.',
    Leve: 'Sintomas leves de ansiedade presentes. Pode refletir ansiedade situacional ou traço ansioso inicial que merece monitoramento.',
    Moderado: 'Nível moderado de ansiedade com impacto no funcionamento. Sintomas autonômicos presentes como taquicardia, tensão muscular ou dificuldade de relaxar.',
    Grave: 'Ansiedade grave com comprometimento funcional significativo. Sintomas intensos de ativação autonômica, medo e hipervigilância. Intervenção clínica prioritária indicada.',
  };

  const parts: string[] = [
    `**Total BAI (${scores.total} pts — ${level.label}):** ${textMap[level.label] || ''}`,
  ];

  let conclusion = '';
  if (level.label === 'Mínimo') {
    conclusion = 'O perfil de ansiedade não indica sofrimento clinicamente significativo no momento.';
  } else if (level.label === 'Leve') {
    conclusion = 'Presença de sintomas ansiosos leves. Monitoramento contínuo e intervenções preventivas são recomendados.';
  } else if (level.label === 'Moderado') {
    conclusion = 'Nível moderado de ansiedade com impacto funcional. Avaliação clínica aprofundada e plano de intervenção são indicados.';
  } else {
    conclusion = 'Ansiedade grave com comprometimento funcional expressivo. Intervenção clínica prioritária fortemente indicada.';
  }

  return { parts, conclusion };
}

// ─── ScoreGraphic ─────────────────────────────────────────────────────────────
const ScoreGraphic = ({ score }: { score: number }) => {
  const pct = (score / 63) * 100;
  const level = getInterpretation(score);
  return (
    <div className="space-y-4 w-full">
      <div className="text-center">
        <p className={`text-xl font-medium ${level.color}`}>{score}</p>
        <p className="text-sm font-medium mt-1 text-slate-600">{level.label}</p>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>0 — Mínimo</span>
        <span>63 — Grave</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
type BaiTab = 'summary' | 'history';
type BaiDetailTab = 'summary' | 'ai' | 'answers';

const baiTabs = [
  { id: 'summary', label: 'Resumo', icon: Layout },
  { id: 'history', label: 'Registros', icon: History },
] as const;

export const BAIPage: React.FC = () => {
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

  const [history, setHistory] = useState<BaiResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<BaiResult | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState<BaiTab>('summary');
  const [detailTab, setDetailTab] = useState<BaiDetailTab>('summary');
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
        const resp = await api.get<BaiResult[]>(`/clinical-tools/${selectedPatientId}/bai`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = getPublicBaseUrl();
    return `${baseUrl}/f/bai?u=${user?.shareToken}&p=${selectedPatientId}`;
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
    const text = encodeURIComponent(`Olá ${p?.full_name || 'paciente'}, por favor preencha este Inventário de Ansiedade de Beck (BAI) para nossa avaliação: ${link}`);
    window.open(`https://wa.me/${p?.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const calculateScores = (answers: Record<number, number>) => {
    const total = BAI_ITEMS.reduce((sum, item) => sum + (answers[item.id] || 0), 0);
    return { total };
  };

  const handlePrintReport = (result: BaiResult | null, patientName: string) => {
    if (!result) return;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const colorMap: Record<string, string> = {
      Mínimo: '#10b981',
      Leve: '#f59e0b',
      Moderado: '#f97316',
      Grave: '#dc2626',
    };
    const bgMap: Record<string, string> = {
      Mínimo: '#ecfdf5',
      Leve: '#fffbeb',
      Moderado: '#fff7ed',
      Grave: '#fef2f2',
    };

    const scaleLabels = ['Absolutamente não', 'Levemente', 'Moderadamente', 'Gravemente'];
    const level = getInterpretation(result.scores.total);
    const c = colorMap[level.label] || '#94a3b8';
    const bg = bgMap[level.label] || '#f8fafc';
    const pct = Math.min((result.scores.total / 63) * 100, 100).toFixed(1);

    const scoresHtml = `
      <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:18px 22px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:11px;font-weight:800;letter-spacing:.12em;;color:#334155">Total BAI</span>
          <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;;letter-spacing:.08em">${level.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <span style="font-size:40px;font-weight:900;color:#0f172a;line-height:1;min-width:56px">${result.scores.total}</span>
          <div style="flex:1">
            <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${c};border-radius:99px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px">
              <span style="font-size:9px;color:#94a3b8;font-weight:600">0</span>
              <span style="font-size:9px;color:#94a3b8;font-weight:600">63</span>
            </div>
          </div>
        </div>
      </div>`;

    const analysisHtml = parts.map(p => {
      const clean = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b">$1</strong>');
      return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="width:6px;height:6px;background:#d97706;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${clean}</p>
      </div>`;
    }).join('');

    const answersHtml = result.answers ? BAI_ITEMS.map((item, i) => {
      const val = result.answers[item.id];
      const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      return `<tr style="background:${bg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(item.id).padStart(2, '0')}</td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 12px;text-align:right;white-space:nowrap">
          <span style="font-size:16px;font-weight:900;color:#d97706">${val ?? '—'}</span>
          ${val !== undefined ? `<div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:1px">${scaleLabels[val]}</div>` : ''}
        </td>
      </tr>`;
    }).join('') : '';

    const crossNoteHtml = (level.label === 'Moderado' || level.label === 'Grave') ? `
      <div style="margin-bottom:28px;padding:14px 18px;background:#fff7ed;border-left:3px solid #f97316;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.6">
          <strong>Correlação Clínica:</strong> Para resultados moderados ou graves no BAI, recomenda-se a avaliação complementar com a subescala de Ansiedade do DASS-21, permitindo uma visão multidimensional do sofrimento ansioso.
        </p>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BAI — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- COVER STRIPE -->
<div style="background:linear-gradient(135deg,#d97706 0%,#f97316 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;;opacity:.75">Relatório de Avaliação Psicológica</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">BAI</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Beck Anxiety Inventory</p>
      </div>
    </div>
  </div>
</div>

<!-- BODY -->
<div style="padding:32px 40px">

  <!-- SCORES -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#d97706;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#d97706;border-radius:1px"></span> Resultado Global
    </h2>
    ${scoresHtml}
  </div>

  <!-- ANALYSIS -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#d97706;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#d97706;border-radius:1px"></span> Análise Clínica
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      ${analysisHtml}
      <div style="margin-top:14px;padding:14px 16px;background:#fff7ed;border-left:3px solid #d97706;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12.5px;color:#92400e;line-height:1.6"><strong>Conclusão:</strong> ${conclusion}</p>
      </div>
    </div>
  </div>

  ${crossNoteHtml}

  ${answersHtml ? `
  <!-- ANSWERS -->
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#d97706;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#d97706;border-radius:1px"></span> Respostas do Paciente
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:left">Sintoma</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:right">Resposta</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

  <!-- LEGEND -->
  <div class="no-break" style="margin-bottom:28px;display:flex;gap:8px;flex-wrap:wrap">
    ${(['Mínimo', 'Leve', 'Moderado', 'Grave'] as const).map(l => `
      <div style="background:${bgMap[l]};border:1px solid ${colorMap[l]}30;border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${colorMap[l]};display:inline-block;flex-shrink:0"></span>
        <span style="font-size:10px;font-weight:700;color:${colorMap[l]}">${l}</span>
      </div>`).join('')}
  </div>

</div>

<!-- FOOTER -->
<div style="border-top:1px solid #f1f5f9;padding:16px 40px;display:flex;justify-content:space-between;align-items:center">
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;;letter-spacing:.1em">Plaelo · Tecnologia para Prática Clínica</p>
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
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

  const handleDownloadPDF = (result: BaiResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'Plaelo · Tecnologia para Prática Clínica';

    // ── Header ──────────────────────────────────────────
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(0, 0, W, 45, 'F');
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(254, 243, 199);
    doc.text('RELATÓRIO DE AVALIAÇÃO PSICOLÓGICA', MARGIN, 15);

    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);

    doc.setFontSize(9); doc.setTextColor(253, 230, 138);
    doc.text(`Avaliação: BAI (Beck Anxiety Inventory) | ${dateStr}`, MARGIN, 33);

    let y = 58;

    // ── Score Total ─────────────────────────────────────
    const level = getInterpretation(result.scores.total);
    doc.setFontSize(10); doc.setTextColor(217, 119, 6);
    doc.text('RESULTADO GLOBAL', MARGIN, y);
    y += 6;

    const colorMapPDF: Record<string, [number, number, number]> = {
      Mínimo: [16, 185, 129],
      Leve: [245, 158, 11],
      Moderado: [249, 115, 22],
      Grave: [220, 38, 38],
    };
    const rgb = colorMapPDF[level.label] || [148, 163, 184];

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(MARGIN, y, CONTENT_W, 28, 4, 4, 'FD');

    doc.setFontSize(8); doc.setTextColor(51, 65, 85);
    doc.text('TOTAL BAI', MARGIN + 6, y + 8);

    doc.setFontSize(36); doc.setTextColor(15, 23, 42);
    doc.text(String(result.scores.total), MARGIN + 6, y + 22);

    const labelW = doc.getTextWidth(level.label) + 6;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(W - MARGIN - labelW - 6, y + 4, labelW, 6, 3, 3, 'F');
    doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text(level.label, W - MARGIN - labelW / 2 - 6, y + 8.2, { align: 'center' });

    const barW = CONTENT_W - 55;
    const barX = MARGIN + 44;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, y + 17, barW, 3, 1.5, 1.5, 'F');
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const progressW = Math.min((result.scores.total / 63) * barW, barW);
    doc.roundedRect(barX, y + 17, progressW, 3, 1.5, 1.5, 'F');

    y += 38;

    // ── Análise Clínica ───────────────────────────────────
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(217, 119, 6);
    doc.text('ANÁLISE CLÍNICA', MARGIN, y);
    y += 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);

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
    doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14);
    conclusionLines.forEach(line => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    y += boxH + 10;

    // ── Cross-recommendation (Moderado or Grave) ──────────
    if (level.label === 'Moderado' || level.label === 'Grave') {
      if (y > 250) { doc.addPage(); y = 20; }
      const noteText = 'Correlação Clínica: Para resultados moderados ou graves no BAI, recomenda-se a avaliação complementar com a subescala de Ansiedade do DASS-21, permitindo uma visão multidimensional do sofrimento ansioso.';
      const noteLines = doc.splitTextToSize(noteText, CONTENT_W - 16);
      const noteH = noteLines.length * 5 + 12;
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(249, 115, 22);
      doc.roundedRect(MARGIN, y, CONTENT_W, noteH, 4, 4, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(154, 52, 18);
      noteLines.forEach((line, li) => {
        doc.text(line, MARGIN + 6, y + 7 + li * 5);
      });
      y += noteH + 10;
    }

    // ── Respostas do Paciente ─────────────────────────────
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 119, 6);
    doc.text('RESPOSTAS DO PACIENTE', MARGIN, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('#', MARGIN + 4, y + 5);
    doc.text('SINTOMA', MARGIN + 12, y + 5);
    doc.text('RESPOSTA', W - MARGIN - 6, y + 5, { align: 'right' });
    y += 8;

    const scaleLabels = ['Absolutamente não', 'Levemente', 'Moderadamente', 'Gravemente'];
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    BAI_ITEMS.forEach((item, i) => {
      if (y > 275) {
        doc.addPage(); y = 20;
      }
      const val = result.answers[item.id];
      const textLines = doc.splitTextToSize(item.text, CONTENT_W - 36);
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

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 119, 6);
      doc.text(String(val ?? '—'), W - MARGIN - 20, y + 5);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(161, 161, 170);
      doc.text(scaleLabels[val] || '', W - MARGIN - 6, y + 5, { align: 'right' });

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

    doc.save(`BAI_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
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
      const newResult: BaiResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores,
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/bai`, {
        patient_id: selectedPatientId,
        data: updatedHistory,
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('Avaliação Salva', 'O BAI foi registrado no prontuário.');
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
      const level = getInterpretation(result.scores.total);
      const resp = await api.post<any>('/ai/analyze-clinical-tool', {
        toolName: 'BAI (Inventário de Ansiedade de Beck)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          interpretations: {
            total: level.label,
          },
        },
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      await api.put(`/clinical-tools/${selectedPatientId}/bai`, {
        patient_id: selectedPatientId,
        data: updatedHistory,
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

  const detailPatientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
  const lastResult = history.length > 0 ? history[history.length - 1] : null;
  const shownScore = lastResult ? lastResult.scores.total : currentScores.total;

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
          title="BAI"
          description="Inventário de Ansiedade de Beck — Avaliação padronizada de sintomas de ansiedade."
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

            <PanelCard title="Instruções (Beck Anxiety Inventory)" icon={Info}>
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  "Abaixo está uma lista de sintomas comuns de ansiedade. Por favor, indique o quanto você foi incomodado por cada sintoma durante a última semana."
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <p><span className="text-primary-700 font-medium">0</span> — Absolutamente não</p>
                  <p><span className="text-primary-700 font-medium">1</span> — Levemente</p>
                  <p><span className="text-primary-700 font-medium">2</span> — Moderadamente</p>
                  <p><span className="text-primary-700 font-medium">3</span> — Gravemente</p>
                </div>
              </div>
            </PanelCard>
          </div>

          <div className="min-w-0 space-y-4">
            {!selectedPatientId ? (
              <ContentCard>
                <EmptyState icon={Activity} title="Nenhum paciente selecionado" description="Selecione o paciente para visualizar dados e gráficos BAI." />
              </ContentCard>
            ) : (
              <Tabs<BaiTab> items={baiTabs} value={activeTab} onChange={setActiveTab} label="Seções do BAI">
                {activeTab === 'summary' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {/* Pontuação */}
                    <PanelCard title="Pontuação Total" icon={Layout}>
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                          <ScoreGraphic score={shownScore} />
                        </div>
                        <div className="space-y-1.5">
                          {SCORING_LABELS.map(sl => {
                            const active = shownScore >= sl.range[0] && shownScore <= sl.range[1];
                            return (
                              <div key={sl.label} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${active ? `border-slate-200 ${sl.bg}` : 'border-transparent opacity-50'}`}>
                                <span className={`text-xs font-medium ${active ? sl.color : 'text-slate-500'}`}>{sl.label}</span>
                                <span className="text-[11px] text-slate-500">{sl.range[0]}–{sl.range[1]}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500 italic">Resultado da Última Avaliação Sincronizada</p>
                      </div>
                    </PanelCard>

                    {/* Evolução */}
                    <PanelCard
                      title="Evolução do Paciente"
                      icon={TrendingUp}
                      action={
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-500" />
                          <span className="text-[11px] text-slate-500">BAI Total</span>
                        </div>
                      }
                    >
                      <div className="h-56 w-full bg-slate-50 rounded-lg border border-slate-100 p-3 flex items-end gap-2 relative">
                        {history.length < 2 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <p className="text-[11px] text-slate-500">Aguardando mais dados históricos</p>
                          </div>
                        )}
                        {history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => {
                          const lvl = getInterpretation(res.scores.total);
                          const colorClass = lvl.label === 'Mínimo' ? 'bg-emerald-500/60' : lvl.label === 'Leve' ? 'bg-amber-400/60' : lvl.label === 'Moderado' ? 'bg-orange-500/70' : 'bg-red-600/70';
                          const hoverColorClass = lvl.label === 'Mínimo' ? 'group-hover:bg-emerald-500' : lvl.label === 'Leve' ? 'group-hover:bg-amber-500' : lvl.label === 'Moderado' ? 'group-hover:bg-orange-600' : 'group-hover:bg-red-700';
                          return (
                            <div
                              key={res.id}
                              className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative"
                              onClick={() => setDetailResult(res)}
                            >
                              <div
                                className={`w-full rounded-md transition-all ${colorClass} ${hoverColorClass}`}
                                style={{ height: `${(res.scores.total / 63) * 100}%` }}
                              />

                              <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                <p className="text-[11px] font-medium mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                                <div className="flex gap-2">
                                  <span className="text-[11px] font-medium text-white">
                                    {res.scores.total} — {lvl.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PanelCard>
                  </div>
                )}

                {activeTab === 'history' && (
                  <PanelCard title="Registros Sincronizados" icon={History} contentClassName="p-0">
                    <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto custom-scrollbar">
                      {history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => {
                        const interp = getInterpretation(res.scores.total);
                        return (
                          <div key={res.id} className="px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-primary-500 shrink-0" />
                                <span className="text-xs font-medium text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                {res.analysis && <Sparkles size={12} className="text-primary-500" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500">Total</span>
                                <span className={`text-xs font-medium ${interp.color}`}>{res.scores.total}</span>
                                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${interp.bg} ${interp.color}`}>{interp.label}</span>
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
                        );
                      })}
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
        subtitle={detailResult ? `Avaliação Consolidada — BAI · ${new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : undefined}
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
          const level = getInterpretation(detailResult.scores.total);
          const hasAnswers = !!detailResult.answers && Object.keys(detailResult.answers).length > 0;
          const detailTabs = [
            { id: 'summary', label: 'Resultado', icon: Layout },
            { id: 'ai', label: 'Análise Bia', icon: Sparkles },
            ...(hasAnswers ? [{ id: 'answers', label: 'Respostas', icon: FileText }] : []),
          ] as { id: BaiDetailTab; label: string; icon: typeof Layout }[];
          return (
            <Tabs<BaiDetailTab> items={detailTabs} value={detailTabs.some(d => d.id === detailTab) ? detailTab : 'summary'} onChange={setDetailTab} label="Detalhes da avaliação">
              {detailTab === 'summary' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-center">
                      <ScoreGraphic score={detailResult.scores.total} />
                    </div>
                    <div className="space-y-1.5">
                      {SCORING_LABELS.map(sl => {
                        const active = detailResult.scores.total >= sl.range[0] && detailResult.scores.total <= sl.range[1];
                        return (
                          <div key={sl.label} className={`px-3 py-2 rounded-lg border transition-colors ${active ? `border-slate-200 ${sl.bg}` : 'border-slate-100 bg-slate-50/30 opacity-50'}`}>
                            <div className="flex items-center justify-between">
                              <h4 className={`text-xs font-medium ${active ? sl.color : 'text-slate-500'}`}>{sl.label}</h4>
                              <span className="text-[11px] text-slate-500">{sl.range[0]}–{sl.range[1]} pts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cross-recommendation */}
                  {(level.label === 'Moderado' || level.label === 'Grave') && (
                    <Alert variant="warning" title="Correlação Clínica">
                      Para resultados moderados ou graves no BAI, recomenda-se a avaliação complementar com a subescala de{' '}
                      <span className="font-medium">Ansiedade do DASS-21</span>, permitindo uma visão multidimensional do sofrimento ansioso.
                    </Alert>
                  )}

                  {/* Análise Clínica */}
                  <PanelCard title="Análise Clínica — BAI (Beck Anxiety Inventory)" icon={Brain}>
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
                    {BAI_ITEMS.map(item => {
                      const val = detailResult.answers[item.id];
                      const scaleLabels = ['Absolutamente não', 'Levemente', 'Moderadamente', 'Gravemente'];
                      return (
                        <div key={item.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50/60">
                          <span className="text-[11px] text-slate-400 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2, '0')}</span>
                          <p className="flex-1 text-[13px] text-slate-600 leading-relaxed">{item.text}</p>
                          <div className="shrink-0 text-right">
                            <span className="text-sm font-medium text-primary-700">{val ?? '—'}</span>
                            {val !== undefined && <p className="text-[11px] text-slate-500">{scaleLabels[val]}</p>}
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
        title="Compartilhar BAI"
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
        title="Aplicação BAI"
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
            "Abaixo está uma lista de sintomas comuns de ansiedade. Por favor, indique o quanto o paciente foi incomodado por cada sintoma durante a última semana."
          </Alert>

          <div className="divide-y divide-slate-100">
            {BAI_ITEMS.map((item) => (
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
