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
const BDI_ITEMS = [
  { id: 1, text: "Em relação à tristeza:" },
  { id: 2, text: "Em relação ao pessimismo:" },
  { id: 3, text: "Em relação às falhas passadas:" },
  { id: 4, text: "Em relação à perda de prazer:" },
  { id: 5, text: "Em relação a sentimentos de culpa:" },
  { id: 6, text: "Em relação a sentimentos de punição:" },
  { id: 7, text: "Em relação à autoestima:" },
  { id: 8, text: "Em relação ao autocriticismo:" },
  { id: 9, text: "Em relação a pensamentos ou desejos suicidas:" },
  { id: 10, text: "Em relação ao choro:" },
  { id: 11, text: "Em relação à agitação:" },
  { id: 12, text: "Em relação à perda de interesse:" },
  { id: 13, text: "Em relação à indecisão:" },
  { id: 14, text: "Em relação ao sentimento de inutilidade:" },
  { id: 15, text: "Em relação à perda de energia:" },
  { id: 16, text: "Em relação às mudanças no padrão de sono:" },
  { id: 17, text: "Em relação à irritabilidade:" },
  { id: 18, text: "Em relação às mudanças no apetite:" },
  { id: 19, text: "Em relação à dificuldade de concentração:" },
  { id: 20, text: "Em relação ao cansaço ou fadiga:" },
  { id: 21, text: "Em relação à perda de interesse em sexo:" },
];

const SCORING_LABELS = {
  total: [
    { range: [0, 13], label: "Mínimo", color: "text-emerald-500", bg: "bg-emerald-50" },
    { range: [14, 19], label: "Leve", color: "text-amber-500", bg: "bg-amber-50" },
    { range: [20, 28], label: "Moderado", color: "text-orange-500", bg: "bg-orange-50" },
    { range: [29, 63], label: "Grave", color: "text-rose-600", bg: "bg-rose-100" },
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
interface BdiResult {
  id: string | number;
  date: string;
  answers: Record<number, number>;
  scores: {
    total: number;
  };
  analysis?: string;
  origin?: string;
}

export const BDIPage: React.FC = () => {
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

  const [history, setHistory] = useState<BdiResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<BdiResult | null>(null);
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
        const resp = await api.get<BdiResult[]>(`/clinical-tools/${selectedPatientId}/bdi-ii`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/f/bdi-ii?u=${user?.shareToken}&p=${selectedPatientId}`;
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
    const text = encodeURIComponent(`Olá ${p?.full_name || 'paciente'}, por favor preencha este inventário BDI-II para nossa avaliação: ${link}`);
    window.open(`https://wa.me/${p?.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const calculateScores = (answers: Record<number, number>) => {
    const total = BDI_ITEMS.reduce((sum, item) => sum + (answers[item.id] || 0), 0);
    return { total };
  };

  const getInterpretation = (score: number) => {
    const labels = SCORING_LABELS.total;
    return labels.find(l => score >= l.range[0] && score <= l.range[1]) || labels[labels.length - 1];
  };

  const getClinicalAnalysis = (scores: { total: number }) => {
    const interp = getInterpretation(scores.total);

    const minText: Record<string, string> = {
      "Mínimo": "Ausência de sintomas depressivos clinicamente significativos. O indivíduo não apresenta indicadores que sugiram quadro depressivo ativo.",
      "Leve": "Presença de sintomas depressivos leves. Pode indicar período de tristeza situacional ou início de quadro depressivo que merece acompanhamento.",
      "Moderado": "Sintomas depressivos de intensidade moderada. Impacto perceptível no funcionamento diário com humor deprimido, perda de energia e motivação.",
      "Grave": "Sintomas depressivos graves. Comprometimento significativo do funcionamento com risco aumentado. Avaliação clínica aprofundada e intervenção prioritária são indicadas.",
    };

    const parts: string[] = [];
    parts.push(`**BDI-II Total (${scores.total} pts — ${interp.label}):** ${minText[interp.label] || ''}`);

    let conclusion = '';
    if (interp.label === 'Mínimo') {
      conclusion = 'O perfil geral da avaliação não indica sofrimento depressivo clinicamente significativo no momento. Manutenção do acompanhamento preventivo é recomendada.';
    } else if (interp.label === 'Leve') {
      conclusion = 'Atenção recomendada aos indicadores leves de depressão. Considerar acompanhamento regular e técnicas de regulação emocional.';
    } else if (interp.label === 'Moderado') {
      conclusion = 'Sintomatologia depressiva moderada identificada. Recomenda-se avaliação clínica aprofundada e planejamento de intervenção terapêutica estruturada.';
    } else {
      conclusion = 'Sintomas depressivos graves identificados. Intervenção clínica prioritária é fortemente indicada. Avalie risco de ideação suicida e necessidade de suporte especializado.';
    }

    return { parts, conclusion };
  };

  const handlePrintReport = (result: BdiResult | null, patientName: string) => {
    if (!result) return;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const colorMap: Record<string, string> = { Mínimo: '#10b981', Leve: '#f59e0b', Moderado: '#f97316', Grave: '#e11d48' };
    const bgMap: Record<string, string> = { Mínimo: '#ecfdf5', Leve: '#fffbeb', Moderado: '#fff7ed', Grave: '#fff1f2' };
    const labels4 = ['Nada', 'Leve', 'Moderado', 'Grave'];

    const interp = getInterpretation(result.scores.total);
    const c = colorMap[interp.label] || '#94a3b8';
    const bg = bgMap[interp.label] || '#f8fafc';
    const pct = Math.min((result.scores.total / 63) * 100, 100).toFixed(1);

    const scoresHtml = `
      <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:18px 22px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#334155">BDI-II — Total</span>
          <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${interp.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <span style="font-size:32px;font-weight:900;color:#0f172a;line-height:1;min-width:44px">${result.scores.total}</span>
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
        <div style="width:6px;height:6px;background:#e11d48;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${clean}</p>
      </div>`;
    }).join('');

    const answersHtml = result.answers ? BDI_ITEMS.map((item, i) => {
      const val = result.answers[item.id];
      const rowBg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      return `<tr style="background:${rowBg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(item.id).padStart(2, '0')}</td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 12px;text-align:right;white-space:nowrap">
          <span style="font-size:16px;font-weight:900;color:#e11d48">${val ?? '—'}</span>
          ${val !== undefined ? `<div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:1px">${labels4[val]}</div>` : ''}
        </td>
      </tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>BDI-II — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- COVER STRIPE -->
<div style="background:linear-gradient(135deg,#e11d48 0%,#1e293b 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.75">Relatório de Avaliação Psicológica</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">BDI-II</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Beck et al.</p>
      </div>
    </div>
  </div>
</div>

<!-- BODY -->
<div style="padding:32px 40px">

  <!-- SCORES -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#e11d48;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#e11d48;border-radius:1px"></span> Resultado Total
    </h2>
    ${scoresHtml}
  </div>

  <!-- ANALYSIS -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#e11d48;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#e11d48;border-radius:1px"></span> Análise Clínica
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      ${analysisHtml}
      <div style="margin-top:14px;padding:14px 16px;background:#fff1f2;border-left:3px solid #e11d48;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12.5px;color:#9f1239;line-height:1.6"><strong>Conclusão:</strong> ${conclusion}</p>
      </div>
    </div>
  </div>

  ${answersHtml ? `
  <!-- ANSWERS -->
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#e11d48;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#e11d48;border-radius:1px"></span> Respostas do Paciente
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:left">Item</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right">Resposta</th>
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
  <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;text-transform:uppercase;letter-spacing:.1em">PsiFlux · Tecnologia para Prática Clínica</p>
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

  const handleDownloadPDF = (result: BdiResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'PsiFlux · Tecnologia para Prática Clínica';

    // ── Header ──────────────────────────────────────────
    doc.setFillColor(225, 29, 72); // rose-600
    doc.rect(0, 0, W, 45, 'F');
    doc.setFillColor(244, 63, 94);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(255, 180, 195);
    doc.text('RELATÓRIO DE AVALIAÇÃO PSICOLÓGICA', MARGIN, 15);

    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);

    doc.setFontSize(9); doc.setTextColor(255, 220, 230);
    doc.text(`Avaliação: BDI-II (Inventário de Depressão de Beck)  |  ${dateStr}`, MARGIN, 33);

    let y = 58;

    // ── Score Total ────────────────────────────────────
    doc.setFontSize(10); doc.setTextColor(225, 29, 72);
    doc.text('RESULTADO TOTAL — BDI-II', MARGIN, y);
    y += 6;

    const colorMap: Record<string, [number, number, number]> = {
      Mínimo: [16, 185, 129],
      Leve: [245, 158, 11],
      Moderado: [249, 115, 22],
      Grave: [225, 29, 72],
    };

    const interp = getInterpretation(result.scores.total);
    const rgb = colorMap[interp.label] || [148, 163, 184];

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(MARGIN, y, CONTENT_W, 26, 4, 4, 'FD');

    doc.setFontSize(8); doc.setTextColor(51, 65, 85);
    doc.text('BDI-II — TOTAL', MARGIN + 6, y + 8);

    doc.setFontSize(28); doc.setTextColor(15, 23, 42);
    doc.text(String(result.scores.total), MARGIN + 6, y + 20);

    // Label background
    const labelW = doc.getTextWidth(interp.label) + 6;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(W - MARGIN - labelW - 6, y + 4, labelW, 6, 3, 3, 'F');
    doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text(interp.label, W - MARGIN - labelW / 2 - 6, y + 8.2, { align: 'center' });

    // Progress bar
    const barW = CONTENT_W - 55;
    const barX = MARGIN + 40;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, y + 18, barW, 2.5, 1.25, 1.25, 'F');
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const progressW = Math.min((result.scores.total / 63) * barW, barW);
    doc.roundedRect(barX, y + 18, progressW, 2.5, 1.25, 1.25, 'F');

    y += 34;

    // ── Análise Clínica ───────────────────────────────────
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(225, 29, 72);
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
    doc.setFont('helvetica', 'bold'); doc.setTextColor(159, 18, 57);
    conclusionLines.forEach(line => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    y += boxH + 15;

    // ── Respostas do Paciente ─────────────────────────────
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(225, 29, 72);
    doc.text('RESPOSTAS DO PACIENTE', MARGIN, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('#', MARGIN + 4, y + 5);
    doc.text('ITEM', MARGIN + 12, y + 5);
    doc.text('RESPOSTA', W - MARGIN - 6, y + 5, { align: 'right' });
    y += 8;

    const labels4 = ['Nada', 'Leve', 'Moderado', 'Grave'];
    doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
    BDI_ITEMS.forEach((item, i) => {
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

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(225, 29, 72);
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

    doc.save(`BDI-II_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
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
      const newResult: BdiResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/bdi-ii`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('Avaliação Salva', 'O BDI-II foi registrado no prontuário.');
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
        toolName: 'BDI-II (Inventário de Depressão de Beck)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          interpretations: {
            total: getInterpretation(result.scores.total).label,
          }
        }
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      await api.put(`/clinical-tools/${selectedPatientId}/bdi-ii`, {
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

  // Score Graphic — single bar since BDI-II has one total score
  const ScoreGraphic = ({ score }: { score: number }) => {
    const pct = (score / 63) * 100;
    const level = getInterpretation(score);
    return (
      <div className="space-y-4 w-full">
        <div className="text-center">
          <p className={`text-6xl font-black ${level.color}`}>{score}</p>
          <p className={`text-sm font-black uppercase tracking-widest mt-2 ${level.color}`}>{level.label}</p>
        </div>
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-rose-400 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-black uppercase">
          <span>0 — Mínimo</span>
          <span>63 — Grave</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8 animate-fadeIn mb-8">
      <PageHeader
        title="BDI-II"
        subtitle="Inventário de Depressão de Beck — Avaliação padronizada de sintomas depressivos."
        icon={<Activity className="text-rose-600" />}
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
              className="bg-rose-600 text-white shadow-lg shadow-rose-200"
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
                 <Info size={14} className="text-rose-400" /> Instruções (Beck et al.)
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-black uppercase tracking-widest bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "Selecione a alternativa que melhor descreve como você se sentiu nas últimas duas semanas."
              </p>
              <div className="space-y-3 pt-2 text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                 <p><span className="text-rose-600 font-black">0</span> — Nada</p>
                 <p><span className="text-rose-600 font-black">1</span> — Leve</p>
                 <p><span className="text-rose-600 font-black">2</span> — Moderado</p>
                 <p><span className="text-rose-600 font-black">3</span> — Grave</p>
              </div>
              <div className="pt-2 border-t border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Escore Total</p>
                <div className="space-y-1 mt-2 text-[8px] font-bold text-slate-500">
                  <p><span className="text-emerald-500">0–13</span> Mínimo</p>
                  <p><span className="text-amber-500">14–19</span> Leve</p>
                  <p><span className="text-orange-500">20–28</span> Moderado</p>
                  <p><span className="text-rose-600">29–63</span> Grave</p>
                </div>
              </div>
          </div>
        </div>

        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Activity size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione o paciente para visualizar dados e histórico BDI-II.</p>
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

                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-rose-400 mb-10">
                       <Layout size={18} /> Escore Depressão (BDI-II)
                    </h3>

                    <div className="flex flex-col items-center gap-12">
                       <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm w-full">
                          <ScoreGraphic score={history.length > 0 ? history[history.length - 1].scores.total : currentScores.total} />
                       </div>

                       <div className="flex-1 space-y-6 w-full">
                          {(() => {
                            const lastRes = history.length > 0 ? history[history.length - 1] : null;
                            const score = lastRes ? lastRes.scores.total : currentScores.total;
                            const interpretation = getInterpretation(score);
                            return (
                              <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total BDI-II</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 ${interpretation.color}`}>{interpretation.label}</span>
                                 </div>
                                 <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${(score / 63) * 100}%` }} />
                                 </div>
                                 <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                                    <span>0</span>
                                    <span>{score} pts</span>
                                    <span>63</span>
                                 </div>
                              </div>
                            );
                          })()}
                          {(() => {
                            const lastRes = history.length > 0 ? history[history.length - 1] : null;
                            const score = lastRes ? lastRes.scores.total : currentScores.total;
                            const interpretation = getInterpretation(score);
                            if (['Moderado', 'Grave'].includes(interpretation.label)) {
                              return (
                                <div className="mt-4 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                  <Sparkles size={12} className="text-amber-400 shrink-0" />
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Considere correlacionar com DASS-21 para análise triaxial.
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                          <TrendingUp size={16} className="text-rose-500" /> Evolução do Paciente
                       </h4>
                       <div className="flex gap-2">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"/><span className="text-[7px] font-black uppercase">Total</span></div>
                       </div>
                    </div>

                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                       {history.length < 2 && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando mais dados históricos</p>
                         </div>
                       )}
                       {[...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                         <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-rose-500/60 w-full rounded-lg transition-all group-hover:bg-rose-500" style={{ height: `${(res.scores.total / 63) * 100}%` }} />

                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                               <p className="text-[8px] font-black uppercase mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                               <div className="flex gap-2">
                                  <span className="text-[10px] font-black text-rose-400">Total: {res.scores.total}</span>
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
                       {[...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => {
                         const interp = getInterpretation(res.scores.total);
                         return (
                           <div key={res.id} className="px-6 py-4 hover:bg-slate-50 transition-all group flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <Clock size={11} className="text-rose-400 shrink-0" />
                                       <span className="text-xs font-black text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                       {res.analysis && <Sparkles size={11} className="text-amber-400" />}
                                       {res.origin === 'external' && <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">Externo</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className={`text-xs font-black ${interp.color}`}>{res.scores.total} pts</span>
                                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${interp.bg} ${interp.color}`}>{interp.label}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <button
                                   onClick={() => generateAIResult(res.id)}
                                   title="Análise Aurora"
                                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.analysis ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-rose-500'}`}
                                 >
                                    <Sparkles size={13} className={analyzingId === res.id ? 'animate-spin' : ''} />
                                 </button>
                                 <button
                                   onClick={() => setDetailResult(res)}
                                   className="flex items-center gap-1.5 px-3 h-8 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
                                 >
                                   Ver <ChevronRight size={12} />
                                 </button>
                              </div>
                           </div>
                         );
                       })}
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

    {/* Result Detail Modal — fixed overlay (same pattern as DASS-21) */}
    {detailResult && (
        <div className="fixed inset-0 mt-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-300" style={{ maxHeight: '90vh' }}>

              {/* Header fixo */}
              <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
                 <div>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Avaliação Consolidada — BDI-II</p>
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
                        <Button variant="outline" size="sm" radius="xl" leftIcon={<Printer size={14} />} onClick={() => handlePrintReport(detailResult, patientName)}>Imprimir</Button>
                        <Button variant="primary" size="sm" radius="xl" leftIcon={<FileText size={14} />} onClick={() => handleDownloadPDF(detailResult, patientName)} className="bg-slate-800 text-white shadow-lg shadow-slate-200">PDF</Button>
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
                const { parts, conclusion } = getClinicalAnalysis(detailResult.scores);
                const interp = getInterpretation(detailResult.scores.total);
                return (<>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                   <div className="bg-slate-950 rounded-2xl p-8 flex items-center justify-center shadow-xl" style={{ minHeight: '200px' }}>
                      <ScoreGraphic score={detailResult.scores.total} />
                   </div>
                   <div className="space-y-3 flex flex-col justify-center">
                      <div className="px-4 py-4 rounded-xl border border-slate-100 bg-slate-50/50">
                         <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">BDI-II Total</h4>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${interp.bg} ${interp.color}`}>{interp.label}</span>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className={`text-4xl font-black w-14 ${interp.color}`}>{detailResult.scores.total}</div>
                            <div className="flex-1">
                               <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${interp.color.replace('text', 'bg')}`} style={{ width: `${(detailResult.scores.total / 63) * 100}%` }} />
                               </div>
                               <div className="flex justify-between mt-1 text-[8px] text-slate-400 font-bold">
                                  <span>0</span><span>63</span>
                               </div>
                            </div>
                         </div>
                      </div>
                      {['Moderado', 'Grave'].includes(interp.label) && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                          <Sparkles size={12} className="text-amber-500 shrink-0" />
                          <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                            Score elevado: considere correlacionar com DASS-21 para análise triaxial.
                          </p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Análise Clínica */}
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                   <div className="bg-slate-50 px-8 py-5 flex items-center gap-3 border-b border-slate-100">
                      <Brain size={18} className="text-rose-600" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Análise Clínica — BDI-II (Beck et al.)</h3>
                   </div>
                   <div className="p-8 space-y-4">
                      {parts.map((part, i) => {
                        const [bold, ...rest] = part.split(':');
                        return (
                          <div key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                             <span className="w-1.5 h-1.5 rounded-full bg-rose-300 mt-2 shrink-0" />
                             <p><span className="font-black text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':').replace(/^\*\*\s*/, ' ')}</p>
                          </div>
                        );
                      })}
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                         <span className="font-black text-rose-700">Conclusão: </span>{conclusion}
                      </div>
                   </div>
                </div>

                {detailResult.analysis && (
                  <div className="bg-rose-600 rounded-xl p-5 text-white shadow-lg shadow-rose-100">
                     <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-amber-400" /> Análise Aurora (IA)
                     </h3>
                     <div className="text-sm text-rose-100 space-y-0">
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
                     <Button onClick={() => generateAIResult(detailResult.id)} isLoading={analyzingId === detailResult.id} className="bg-rose-600 text-white rounded-2xl px-6 py-3 shrink-0">Analisar</Button>
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
                          {BDI_ITEMS.map(item => {
                            const val = detailResult.answers[item.id];
                            const labels = ['Nada', 'Leve', 'Moderado', 'Grave'];
                            return (
                              <div key={item.id} className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60">
                                 <span className="text-[10px] font-black text-slate-300 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2, '0')}</span>
                                 <p className="flex-1 text-sm text-slate-600 leading-relaxed">{item.text}</p>
                                 <div className="shrink-0 text-right">
                                    <span className="text-lg font-black text-rose-600">{val ?? '—'}</span>
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
        title="Compartilhar BDI-II"
        subtitle="Envie o inventário para o paciente responder em casa"
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
           <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                 <Share2 size={24} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-tight mb-1">Link de Avaliação Direta</p>
                 <p className="text-xs text-slate-600 font-medium leading-relaxed">Este link é exclusivo para o paciente selecionado. As respostas serão integradas automaticamente ao histórico dele.</p>
              </div>
           </div>

           <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getShareLink()}
                  className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono focus:ring-2 focus:ring-rose-100 outline-none"
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
        title="Aplicação BDI-II"
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
              className="flex-2 bg-rose-600 text-white"
            >
              Processar e Salvar Escala <Save size={18} className="ml-2" />
            </Button>
          </div>
        }
      >
        <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
           <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                "Selecione a alternativa que melhor descreve como o paciente se sentiu nas últimas duas semanas."
              </p>
           </div>

           <div className="space-y-12">
              {BDI_ITEMS.map((item) => (
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
