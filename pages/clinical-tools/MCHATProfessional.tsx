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
const MCHAT_ITEMS = [
  { id: 1, text: "Se você apontar para algo no outro lado do cômodo, a criança olha para o que você apontou?", failAnswer: false },
  { id: 2, text: "Você já se perguntou se a criança pode ter algum problema de audição?", failAnswer: true },
  { id: 3, text: "A criança brinca de faz de conta? (ex.: fingir que está bebendo de uma xícara vazia, fingir que está falando ao telefone)", failAnswer: false },
  { id: 4, text: "A criança gosta de subir nas coisas? (ex.: móveis, brinquedos, escadas)", failAnswer: false },
  { id: 5, text: "A criança realiza movimentos incomuns com os dedos perto dos olhos? (ex.: agitar os dedos perto dos olhos)", failAnswer: true },
  { id: 6, text: "A criança aponta com o dedo para pedir alguma coisa ou para pedir ajuda?", failAnswer: false },
  { id: 7, text: "A criança aponta com o dedo para mostrar algo interessante para você?", failAnswer: false },
  { id: 8, text: "A criança se interessa por outras crianças?", failAnswer: false },
  { id: 9, text: "A criança mostra objetos a você — trazendo-os ou levantando-os — apenas para compartilhar o interesse (não para pedir ajuda)?", failAnswer: false },
  { id: 10, text: "A criança responde quando você a chama pelo nome?", failAnswer: false },
  { id: 11, text: "Quando você sorri para a criança, ela sorri de volta?", failAnswer: false },
  { id: 12, text: "A criança fica chateada com ruídos comuns do dia a dia? (ex.: aspirador de pó, música alta)", failAnswer: true },
  { id: 13, text: "A criança consegue andar?", failAnswer: false },
  { id: 14, text: "A criança olha nos seus olhos quando você está falando com ela, brincando com ela ou vestindo-a?", failAnswer: false },
  { id: 15, text: "A criança tenta copiar o que você faz?", failAnswer: false },
  { id: 16, text: "Se você virar a cabeça para olhar para algo, a criança olha ao redor para ver o que você está olhando?", failAnswer: false },
  { id: 17, text: "A criança tenta chamar sua atenção?", failAnswer: false },
  { id: 18, text: "A criança entende quando você pede para ela fazer alguma coisa? (ex.: sem apontar, diga 'coloque o livro no chão')", failAnswer: false },
  { id: 19, text: "Se acontecer alguma coisa nova, a criança olha para o seu rosto para ver como você reage?", failAnswer: false },
  { id: 20, text: "A criança gosta de atividades com movimento? (ex.: ser balançada, pulada nos joelhos)", failAnswer: false },
];

const SCORING_LABELS = [
  { range: [0, 2], label: "Baixo Risco", color: "text-emerald-500", bg: "bg-emerald-50" },
  { range: [3, 7], label: "Risco Médio", color: "text-amber-500", bg: "bg-amber-50" },
  { range: [8, 20], label: "Alto Risco", color: "text-rose-600", bg: "bg-rose-100" },
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
interface MchatResult {
  id: string | number;
  date: string;
  answers: Record<number, boolean>;
  scores: {
    total: number;
    riskLevel: string;
  };
  analysis?: string;
  origin?: string;
}

// ─── Score Graphic ────────────────────────────────────────────────────────────
const ScoreGraphic = ({ scores }: { scores: MchatResult['scores'] }) => {
  const interp = getInterpretation(scores.total);
  const pct = (scores.total / 20) * 100;
  return (
    <div className="space-y-4 w-full text-center">
      <p className={`text-7xl font-black ${interp.color}`}>{scores.total}</p>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">itens com falha / 20</p>
      <div className="h-4 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${interp.color.replace('text', 'bg')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`inline-block text-xs font-black px-4 py-2 rounded-full ${interp.bg} ${interp.color} uppercase tracking-widest`}>
        {interp.label}
      </span>
    </div>
  );
};

// ─── Clinical Analysis ────────────────────────────────────────────────────────
function getClinicalAnalysis(scores: { total: number; riskLevel: string }): string {
  const { total } = scores;
  if (total <= 2) {
    return "Pontuação dentro do esperado para desenvolvimento típico. Nenhuma intervenção imediata indicada com base nesta triagem. Manter acompanhamento de rotina.";
  } else if (total <= 7) {
    return "Pontuação na faixa de risco médio. Recomenda-se a aplicação da segunda etapa do M-CHAT-R/F (Entrevista de Seguimento) para investigar os itens com falha. Não é diagnóstico.";
  } else {
    return "Pontuação na faixa de alto risco. Encaminhamento para avaliação diagnóstica especializada (neuropediatra, psicólogo do desenvolvimento) é fortemente recomendado. O M-CHAT-R/F é um instrumento de triagem — não diagnóstico.";
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const MCHATPage: React.FC = () => {
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

  const [history, setHistory] = useState<MchatResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<MchatResult | null>(null);
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
        const resp = await api.get<MchatResult[]>(`/clinical-tools/${selectedPatientId}/m-chat-r`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/f/m-chat-r?u=${user?.shareToken}&p=${selectedPatientId}`;
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
    const text = encodeURIComponent(`Olá ${p?.full_name || 'responsável'}, por favor preencha este questionário M-CHAT-R/F para triagem do desenvolvimento da criança: ${link}`);
    window.open(`https://wa.me/${p?.phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const calculateScores = (answers: Record<number, boolean>) => {
    let total = 0;
    MCHAT_ITEMS.forEach(item => {
      const ans = answers[item.id];
      if (ans === item.failAnswer) total++;
    });
    const riskLevel = total <= 2 ? 'Baixo' : total <= 7 ? 'Médio' : 'Alto';
    return { total, riskLevel };
  };

  const currentScores = useMemo(() => calculateScores(currentAnswers), [currentAnswers]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente para salvar.');
      return;
    }
    if (Object.keys(currentAnswers).length < 20) {
      info('Atenção', 'Responda todas as 20 questões para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const newResult: MchatResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/m-chat-r`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('Avaliação Salva', 'O M-CHAT-R/F foi registrado no prontuário.');
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
        toolName: 'M-CHAT-R/F (Triagem para Autismo)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          interpretation: getInterpretation(result.scores.total).label,
        }
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      await api.put(`/clinical-tools/${selectedPatientId}/m-chat-r`, {
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

  const handlePrintReport = (result: MchatResult | null, patientName: string) => {
    if (!result) return;
    const analysis = getClinicalAnalysis(result.scores);
    const interp = getInterpretation(result.scores.total);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const colorMap: Record<string, string> = {
      'Baixo Risco': '#10b981',
      'Risco Médio': '#f59e0b',
      'Alto Risco': '#e11d48',
    };
    const bgMap: Record<string, string> = {
      'Baixo Risco': '#ecfdf5',
      'Risco Médio': '#fffbeb',
      'Alto Risco': '#fff1f2',
    };

    const color = colorMap[interp.label] || '#10b981';
    const bg = bgMap[interp.label] || '#ecfdf5';
    const pct = ((result.scores.total / 20) * 100).toFixed(1);

    const answersHtml = result.answers ? MCHAT_ITEMS.map((item, i) => {
      const val = result.answers[item.id];
      const isFail = val === item.failAnswer;
      const rowBg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      const valLabel = val === true ? 'SIM' : val === false ? 'NÃO' : '—';
      const statusColor = isFail ? '#e11d48' : '#10b981';
      const statusLabel = isFail ? 'FALHA' : 'PASS';
      return `<tr style="background:${rowBg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(item.id).padStart(2, '0')}</td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 10px;text-align:center;white-space:nowrap">
          <span style="font-size:13px;font-weight:900;color:#0f172a">${valLabel}</span>
        </td>
        <td style="padding:8px 12px;text-align:center;white-space:nowrap">
          <span style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}30;font-size:9px;font-weight:800;padding:2px 8px;border-radius:99px">${statusLabel}</span>
        </td>
      </tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>M-CHAT-R/F — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<!-- COVER STRIPE -->
<div style="background:linear-gradient(135deg,#0d9488 0%,#059669 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.75">Relatório de Triagem</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">M-CHAT-R/F</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Triagem para Autismo</p>
      </div>
    </div>
  </div>
</div>

<!-- BODY -->
<div style="padding:32px 40px">

  <!-- SCORE SUMMARY -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#0d9488;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#0d9488;border-radius:1px"></span> Resultado da Triagem
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      <div style="display:flex;align-items:center;gap:24px">
        <div style="text-align:center;min-width:80px">
          <p style="margin:0;font-size:56px;font-weight:900;color:${color};line-height:1">${result.scores.total}</p>
          <p style="margin:4px 0 0;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8">itens com falha / 20</p>
        </div>
        <div style="flex:1">
          <div style="margin-bottom:10px">
            <span style="background:${bg};color:${color};border:1px solid ${color}30;padding:4px 14px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${interp.label}</span>
          </div>
          <div style="height:10px;background:#e2e8f0;border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:99px"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="font-size:9px;color:#94a3b8;font-weight:600">0</span>
            <span style="font-size:9px;color:#94a3b8;font-weight:600">20</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CLINICAL ANALYSIS -->
  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#0d9488;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#0d9488;border-radius:1px"></span> Análise Clínica
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="width:6px;height:6px;background:#0d9488;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${analysis}</p>
      </div>
      <div style="margin-top:14px;padding:12px 16px;background:#f0fdf4;border-left:3px solid #0d9488;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:11px;color:#064e3b;font-weight:700;font-style:italic">Nota: M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.</p>
      </div>
    </div>
  </div>

  ${answersHtml ? `
  <!-- ANSWERS -->
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#0d9488;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#0d9488;border-radius:1px"></span> Respostas Item a Item
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:left">Pergunta</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:center;width:60px">Resposta</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:center;width:70px">Status</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

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

  const handleDownloadPDF = (result: MchatResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const analysis = getClinicalAnalysis(result.scores);
    const interp = getInterpretation(result.scores.total);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'PsiFlux · Tecnologia para Prática Clínica';

    const colorMap: Record<string, [number, number, number]> = {
      'Baixo Risco': [16, 185, 129],
      'Risco Médio': [245, 158, 11],
      'Alto Risco': [225, 29, 72],
    };

    // ── Header ──────────────────────────────────────────
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(0, 0, W, 45, 'F');
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(167, 243, 208);
    doc.text('RELATÓRIO DE TRIAGEM — AUTISMO', MARGIN, 15);

    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);

    doc.setFontSize(9); doc.setTextColor(209, 250, 229);
    doc.text(`M-CHAT-R/F  |  ${dateStr}`, MARGIN, 33);

    let y = 58;

    // ── Score Summary ─────────────────────────────────
    const rgb = colorMap[interp.label] || [16, 185, 129];
    doc.setFontSize(10); doc.setTextColor(13, 148, 136);
    doc.text('RESULTADO DA TRIAGEM', MARGIN, y);
    y += 6;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(MARGIN, y, CONTENT_W, 26, 4, 4, 'FD');

    doc.setFontSize(36); doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(String(result.scores.total), MARGIN + 6, y + 17);

    doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text('itens com falha / 20', MARGIN + 6, y + 22);

    const labelW = doc.getTextWidth(interp.label) + 8;
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(W - MARGIN - labelW - 4, y + 5, labelW, 7, 3.5, 3.5, 'F');
    doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text(interp.label, W - MARGIN - labelW / 2 - 4, y + 9.8, { align: 'center' });

    // Progress bar
    const barW = CONTENT_W - 55;
    const barX = MARGIN + 40;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, y + 16, barW, 2.5, 1.25, 1.25, 'F');
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const progressW = Math.min((result.scores.total / 20) * barW, barW);
    if (progressW > 0) {
      doc.roundedRect(barX, y + 16, progressW, 2.5, 1.25, 1.25, 'F');
    }

    y += 34;

    // ── Clinical Analysis ──────────────────────────────
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(13, 148, 136);
    doc.text('ANÁLISE CLÍNICA', MARGIN, y);
    y += 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);

    const analysisLines = doc.splitTextToSize(analysis, CONTENT_W - 16);
    const noteText = 'Nota: M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.';
    const noteLines = doc.splitTextToSize(noteText, CONTENT_W - 20);
    const boxH = analysisLines.length * 5 + noteLines.length * 4.5 + 18;

    if (y + boxH > 275) { doc.addPage(); y = 20; }
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4, 4, 'FD');

    let analysisY = y + 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    analysisLines.forEach((line: string) => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    analysisY += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(6, 78, 59);
    noteLines.forEach((line: string) => {
      doc.text(line, MARGIN + 8, analysisY);
      analysisY += 4.5;
    });

    y += boxH + 12;

    // ── Answers Table ─────────────────────────────────
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(13, 148, 136);
    doc.text('RESPOSTAS ITEM A ITEM', MARGIN, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('#', MARGIN + 4, y + 5);
    doc.text('PERGUNTA', MARGIN + 12, y + 5);
    doc.text('RESPOSTA', W - MARGIN - 40, y + 5, { align: 'right' });
    doc.text('STATUS', W - MARGIN - 6, y + 5, { align: 'right' });
    y += 8;

    doc.setFontSize(8.5);
    MCHAT_ITEMS.forEach((item, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const val = result.answers[item.id];
      const isFail = val === item.failAnswer;
      const valLabel = val === true ? 'SIM' : val === false ? 'NÃO' : '—';
      const statusLabel = isFail ? 'FALHA' : 'PASS';
      const statusRgb: [number, number, number] = isFail ? [225, 29, 72] : [16, 185, 129];

      const textLines = doc.splitTextToSize(item.text, CONTENT_W - 60);
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

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(valLabel, W - MARGIN - 42, y + 5, { align: 'right' });

      doc.setFontSize(7.5); doc.setTextColor(statusRgb[0], statusRgb[1], statusRgb[2]);
      doc.text(statusLabel, W - MARGIN - 4, y + 5, { align: 'right' });

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

    doc.save(`M-CHAT-RF_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  return (
    <>
      <div className="space-y-8 animate-fadeIn mb-8">
        <PageHeader
          title="M-CHAT-R/F"
          subtitle="Triagem para sinais de autismo em crianças pequenas."
          icon={<Activity className="text-teal-500" />}
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
                className="bg-teal-600 text-white shadow-lg shadow-teal-200"
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

            {/* Reference panel */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} className="text-teal-400" /> Referência M-CHAT-R/F
              </h4>
              <div className="space-y-3 pt-2 text-[9px] font-bold uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-slate-600"><span className="text-emerald-600 font-black">0–2</span> — Baixo Risco</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-slate-600"><span className="text-amber-600 font-black">3–7</span> — Risco Médio</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                  <p className="text-slate-600"><span className="text-rose-600 font-black">8–20</span> — Alto Risco</p>
                </div>
              </div>
              <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                <p className="text-[9px] text-teal-700 font-bold leading-relaxed italic">
                  M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.
                </p>
              </div>
            </div>
          </div>

          {!selectedPatientId ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Activity size={32} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione o paciente para visualizar dados e histórico M-CHAT-R/F.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column: Score Graphic */}
                <div className="space-y-8">
                  <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                      <TrendingUp size={240} />
                    </div>

                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-teal-400 mb-10">
                      <Layout size={18} /> Resultado Atual
                    </h3>

                    <div className="flex flex-col items-center gap-12">
                      <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm w-full">
                        <ScoreGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                      </div>
                      <div className="pt-4 border-t border-white/10 w-full flex justify-between items-center text-slate-500">
                        <p className="text-[9px] font-black uppercase tracking-widest italic leading-relaxed">Resultado da Última Avaliação Sincronizada</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: History & Evolution */}
                <div className="space-y-8">
                  {/* Historical bar chart */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-teal-500" /> Evolução do Paciente
                      </h4>
                    </div>

                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                      {history.length < 2 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando mais dados históricos</p>
                        </div>
                      )}
                      {[...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => {
                        const ip = getInterpretation(res.scores.total);
                        const barPct = (res.scores.total / 20) * 100;
                        return (
                          <div
                            key={res.id}
                            className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative"
                            onClick={() => setDetailResult(res)}
                          >
                            <div
                              className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${ip.color.replace('text', 'bg')}`}
                              style={{ height: `${barPct}%`, opacity: 0.7 }}
                            />
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl">
                              <p className="text-[8px] font-black uppercase mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                              <span className={`text-[10px] font-black ${ip.color}`}>{res.scores.total} falhas — {ip.label}</span>
                            </div>
                          </div>
                        );
                      })}
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
                        const ip = getInterpretation(res.scores.total);
                        return (
                          <div key={res.id} className="px-6 py-4 hover:bg-slate-50 transition-all group flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock size={11} className="text-teal-400 shrink-0" />
                                  <span className="text-xs font-black text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                  {res.analysis && <Sparkles size={11} className="text-amber-400" />}
                                  {res.origin === 'external' && (
                                    <span className="text-[8px] font-black text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded uppercase tracking-wide">externo</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">falhas</span>
                                  <span className={`text-sm font-black ${ip.color}`}>{res.scores.total}</span>
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg ${ip.bg} ${ip.color}`}>{ip.label}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => generateAIResult(res.id)}
                                title="Análise Aurora"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.analysis ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-teal-500'}`}
                              >
                                <Sparkles size={13} className={analyzingId === res.id ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={() => setDetailResult(res)}
                                className="flex items-center gap-1.5 px-3 h-8 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
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

      {/* Detail Modal */}
      {detailResult && (
        <div className="fixed inset-0 mt-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-300" style={{ maxHeight: '90vh' }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">Avaliação M-CHAT-R/F</p>
                {(() => {
                  const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
                  return <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{patientName}</h2>;
                })()}
                <p className="text-xs font-medium text-slate-400 mt-0.5">{new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(() => {
                  const patientName = patients.find(p => String(p.id) === String(selectedPatientId))?.full_name || 'Paciente';
                  return (
                    <>
                      <Button variant="outline" size="sm" radius="xl" leftIcon={<Printer size={14} />} onClick={() => handlePrintReport(detailResult, patientName)}>Imprimir</Button>
                      <Button variant="primary" size="sm" radius="xl" leftIcon={<FileText size={14} />} onClick={() => handleDownloadPDF(detailResult, patientName)} className="bg-slate-800 text-white shadow-lg shadow-slate-200">PDF</Button>
                    </>
                  );
                })()}
                <button
                  onClick={() => { setDetailResult(null); setShowAnswers(false); }}
                  className="w-9 h-9 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center ml-1"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 custom-scrollbar pb-12">

              {/* Score display */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-slate-950 rounded-2xl p-8 flex items-center justify-center shadow-xl" style={{ minHeight: '180px' }}>
                  <ScoreGraphic scores={detailResult.scores} />
                </div>
                <div className="space-y-3 flex flex-col justify-center">
                  {(() => {
                    const ip = getInterpretation(detailResult.scores.total);
                    return (
                      <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Total de Falhas</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${ip.bg} ${ip.color}`}>{ip.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`text-4xl font-black w-12 ${ip.color}`}>{detailResult.scores.total}</div>
                          <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${ip.color.replace('text', 'bg')}`} style={{ width: `${(detailResult.scores.total / 20) * 100}%` }} />
                          </div>
                          <span className="text-xs font-black text-slate-400">/ 20</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Clinical Analysis */}
              <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                <div className="bg-slate-50 px-8 py-5 flex items-center gap-3 border-b border-slate-100">
                  <Brain size={18} className="text-teal-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Análise Clínica — M-CHAT-R/F</h3>
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex gap-3 text-sm leading-relaxed text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 mt-2 shrink-0" />
                    <p>{getClinicalAnalysis(detailResult.scores)}</p>
                  </div>
                  <div className="mt-4 p-4 bg-teal-50 border border-teal-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                    <span className="font-black text-teal-700">Nota: </span>M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.
                  </div>
                </div>
              </div>

              {/* Aurora AI Analysis */}
              {detailResult.analysis && (
                <div className="bg-teal-600 rounded-xl p-5 text-white shadow-lg shadow-teal-100">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-amber-400" /> Análise Aurora (IA)
                  </h3>
                  <div className="text-sm text-teal-100 space-y-0">
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
                  <Button onClick={() => generateAIResult(detailResult.id)} isLoading={analyzingId === detailResult.id} className="bg-teal-600 text-white rounded-2xl px-6 py-3 shrink-0">Analisar</Button>
                </div>
              )}

              {/* Answers table (collapsible) */}
              {detailResult.answers && Object.keys(detailResult.answers).length > 0 && (
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="w-full bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-slate-400" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Respostas Item a Item (20 itens)</h3>
                    </div>
                    <ChevronRight size={18} className={`text-slate-400 transition-transform ${showAnswers ? 'rotate-90' : ''}`} />
                  </button>
                  {showAnswers && (
                    <div className="divide-y divide-slate-50">
                      {MCHAT_ITEMS.map(item => {
                        const val = detailResult.answers[item.id];
                        const isFail = val === item.failAnswer;
                        const valLabel = val === true ? 'SIM' : val === false ? 'NÃO' : '—';
                        return (
                          <div key={item.id} className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60">
                            <span className="text-[10px] font-black text-slate-300 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2, '0')}</span>
                            <p className="flex-1 text-sm text-slate-600 leading-relaxed">{item.text}</p>
                            <div className="shrink-0 text-right flex flex-col items-end gap-1">
                              <span className="text-base font-black text-slate-800">{valLabel}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isFail ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {isFail ? 'FALHA' : 'PASS'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartilhar M-CHAT-R/F"
        subtitle="Envie o questionário para os pais/responsáveis preencherem"
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
          <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm shrink-0">
              <Share2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest leading-tight mb-1">Link de Triagem Direta</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">Este link é exclusivo para o paciente selecionado. As respostas dos pais/responsáveis serão integradas automaticamente ao histórico.</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                readOnly
                value={getShareLink()}
                className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono focus:ring-2 focus:ring-teal-100 outline-none"
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

      {/* Application Modal */}
      <Modal
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        title="Aplicação M-CHAT-R/F"
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
              className="flex-2 bg-teal-600 text-white"
            >
              Processar e Salvar Escala <Save size={18} className="ml-2" />
            </Button>
          </div>
        }
      >
        <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
              Responda SIM ou NÃO para cada comportamento da criança conforme observado ou relatado pelos pais/responsáveis.
            </p>
          </div>

          <div className="space-y-12">
            {MCHAT_ITEMS.map((item) => (
              <div key={item.id} className="space-y-6">
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] shrink-0 border border-slate-200">{item.id}</span>
                  <p className="text-base font-black text-slate-800 leading-tight pt-1">{item.text}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setCurrentAnswers({ ...currentAnswers, [item.id]: val })}
                      className={`h-16 rounded-2xl font-black text-lg transition-all border-2 ${
                        currentAnswers[item.id] === val
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xl scale-[1.03]'
                          : 'bg-white text-slate-300 border-slate-100 hover:border-teal-200 hover:text-teal-600'
                      }`}
                    >
                      {val ? 'SIM' : 'NÃO'}
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
