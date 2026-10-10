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
import { Badge } from '../../components/UI/Badge';
import { EmptyState } from '../../components/UI/EmptyState';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { Button, IconButton } from '../../components/UI/Button';
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
      <p className={`text-xl font-medium ${interp.color}`}>{scores.total}</p>
      <p className="text-[11px] text-slate-500">itens com falha / 20</p>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${interp.color.replace('text', 'bg')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${interp.bg} ${interp.color}`}>
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
type MchatTab = 'summary' | 'history';
type MchatDetailTab = 'summary' | 'ai' | 'answers';

const mchatTabs = [
  { id: 'summary', label: 'Resumo', icon: Layout },
  { id: 'history', label: 'Registros', icon: History },
] as const;

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
  const [activeTab, setActiveTab] = useState<MchatTab>('summary');
  const [detailTab, setDetailTab] = useState<MchatDetailTab>('summary');
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
        const resp = await api.get<MchatResult[]>(`/clinical-tools/${selectedPatientId}/m-chat-r`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const getShareLink = () => {
    const baseUrl = getPublicBaseUrl();
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
      success('Bia Analisou', 'Interpretação clínica gerada.');
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
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;;opacity:.75">Relatório de Triagem</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;;opacity:.8;margin-bottom:2px">Instrumento</p>
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
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#0d9488;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#0d9488;border-radius:1px"></span> Resultado da Triagem
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      <div style="display:flex;align-items:center;gap:24px">
        <div style="text-align:center;min-width:80px">
          <p style="margin:0;font-size:56px;font-weight:900;color:${color};line-height:1">${result.scores.total}</p>
          <p style="margin:4px 0 0;font-size:9px;font-weight:800;;letter-spacing:.08em;color:#94a3b8">itens com falha / 20</p>
        </div>
        <div style="flex:1">
          <div style="margin-bottom:10px">
            <span style="background:${bg};color:${color};border:1px solid ${color}30;padding:4px 14px;border-radius:99px;font-size:10px;font-weight:800;;letter-spacing:.08em">${interp.label}</span>
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
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#0d9488;display:flex;align-items:center;gap:8px">
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
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;;color:#0d9488;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#0d9488;border-radius:1px"></span> Respostas Item a Item
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:left">Pergunta</th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:center;width:60px">Resposta</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;;letter-spacing:.1em;color:#94a3b8;text-align:center;width:70px">Status</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

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

  const handleDownloadPDF = (result: MchatResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const analysis = getClinicalAnalysis(result.scores);
    const interp = getInterpretation(result.scores.total);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'Plaelo · Tecnologia para Prática Clínica';

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
          title="M-CHAT-R/F"
          description="Triagem para sinais de autismo em crianças pequenas."
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

            {/* Reference panel */}
            <PanelCard title="Referência M-CHAT-R/F" icon={Info}>
              <div className="space-y-3">
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-slate-600"><span className="text-emerald-600 font-medium">0–2</span> — Baixo Risco</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-slate-600"><span className="text-amber-600 font-medium">3–7</span> — Risco Médio</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                    <p className="text-slate-600"><span className="text-rose-600 font-medium">8–20</span> — Alto Risco</p>
                  </div>
                </div>
                <Alert variant="info">
                  M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.
                </Alert>
              </div>
            </PanelCard>
          </div>

          <div className="min-w-0 space-y-4">
            {!selectedPatientId ? (
              <ContentCard>
                <EmptyState icon={Activity} title="Nenhum paciente selecionado" description="Selecione o paciente para visualizar dados e histórico M-CHAT-R/F." />
              </ContentCard>
            ) : (
              <Tabs<MchatTab> items={mchatTabs} value={activeTab} onChange={setActiveTab} label="Seções do M-CHAT-R/F">
                {activeTab === 'summary' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <PanelCard title="Resultado Atual" icon={Layout}>
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                          <ScoreGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                        </div>
                        <p className="text-[11px] text-slate-500 italic">Resultado da Última Avaliação Sincronizada</p>
                      </div>
                    </PanelCard>

                    <PanelCard title="Evolução do Paciente" icon={TrendingUp}>
                      <div className="h-56 w-full bg-slate-50 rounded-lg border border-slate-100 p-3 flex items-end gap-2 relative">
                        {history.length < 2 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <p className="text-[11px] text-slate-500">Aguardando mais dados históricos</p>
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
                                className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${ip.color.replace('text', 'bg')}`}
                                style={{ height: `${barPct}%`, opacity: 0.7 }}
                              />
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                <p className="text-[11px] font-medium mb-1 border-b border-white/10 pb-1">{new Date(res.date).toLocaleDateString()}</p>
                                <span className="text-[11px] font-medium text-white">{res.scores.total} falhas — {ip.label}</span>
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
                      {[...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => {
                        const ip = getInterpretation(res.scores.total);
                        return (
                          <div key={res.id} className="px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Clock size={12} className="text-primary-500 shrink-0" />
                                <span className="text-xs font-medium text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                {res.analysis && <Sparkles size={12} className="text-primary-500" />}
                                {res.origin === 'external' && (
                                  <Badge color="primary">externo</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500">falhas</span>
                                <span className={`text-xs font-medium ${ip.color}`}>{res.scores.total}</span>
                                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${ip.bg} ${ip.color}`}>{ip.label}</span>
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

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailResult}
        onClose={() => { setDetailResult(null); setShowAnswers(false); }}
        size="2xl"
        title={detailPatientName}
        subtitle={detailResult ? `Avaliação M-CHAT-R/F · ${new Date(detailResult.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : undefined}
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
          const ip = getInterpretation(detailResult.scores.total);
          const hasAnswers = !!detailResult.answers && Object.keys(detailResult.answers).length > 0;
          const detailTabs = [
            { id: 'summary', label: 'Resultado', icon: Layout },
            { id: 'ai', label: 'Análise Bia', icon: Sparkles },
            ...(hasAnswers ? [{ id: 'answers', label: 'Respostas', icon: FileText }] : []),
          ] as { id: MchatDetailTab; label: string; icon: typeof Layout }[];
          return (
            <Tabs<MchatDetailTab> items={detailTabs} value={detailTabs.some(d => d.id === detailTab) ? detailTab : 'summary'} onChange={setDetailTab} label="Detalhes da avaliação">
              {detailTab === 'summary' && (
                <div className="space-y-3">
                  {/* Score display */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-center">
                      <ScoreGraphic scores={detailResult.scores} />
                    </div>
                    <div className="space-y-3 flex flex-col justify-center">
                      <div className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-slate-700">Total de Falhas</h4>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${ip.bg} ${ip.color}`}>{ip.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-base font-medium w-8 ${ip.color}`}>{detailResult.scores.total}</div>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${ip.color.replace('text', 'bg')}`} style={{ width: `${(detailResult.scores.total / 20) * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500">/ 20</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Analysis */}
                  <PanelCard title="Análise Clínica — M-CHAT-R/F" icon={Brain}>
                    <div className="space-y-3">
                      <div className="flex gap-3 text-[13px] leading-relaxed text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-300 mt-2 shrink-0" />
                        <p>{getClinicalAnalysis(detailResult.scores)}</p>
                      </div>
                      <Alert variant="info" title="Nota">
                        M-CHAT-R/F é um instrumento de triagem, não diagnóstico. Para aplicação em crianças de 16 a 30 meses. Escores ≥3 requerem entrevista de seguimento.
                      </Alert>
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
                <PanelCard title="Respostas Item a Item (20 itens)" icon={FileText} contentClassName="p-0">
                  <div className="divide-y divide-slate-100">
                    {MCHAT_ITEMS.map(item => {
                      const val = detailResult.answers[item.id];
                      const isFail = val === item.failAnswer;
                      const valLabel = val === true ? 'SIM' : val === false ? 'NÃO' : '—';
                      return (
                        <div key={item.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50/60">
                          <span className="text-[11px] text-slate-400 w-6 shrink-0 mt-0.5">{String(item.id).padStart(2, '0')}</span>
                          <p className="flex-1 text-[13px] text-slate-600 leading-relaxed">{item.text}</p>
                          <div className="shrink-0 text-right flex flex-col items-end gap-1">
                            <span className="text-sm font-medium text-slate-800">{valLabel}</span>
                            <Badge color={isFail ? 'danger' : 'success'}>{isFail ? 'FALHA' : 'PASS'}</Badge>
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
        title="Compartilhar M-CHAT-R/F"
        subtitle="Envie o questionário para os pais/responsáveis preencherem"
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
          <Alert variant="info" title="Link de Triagem Direta">
            Este link é exclusivo para o paciente selecionado. As respostas dos pais/responsáveis serão integradas automaticamente ao histórico.
          </Alert>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                readOnly
                aria-label="Link de triagem"
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

      {/* Application Modal */}
      <Modal
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        title="Aplicação M-CHAT-R/F"
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
            Responda SIM ou NÃO para cada comportamento da criança conforme observado ou relatado pelos pais/responsáveis.
          </Alert>

          <div className="divide-y divide-slate-100">
            {MCHAT_ITEMS.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-medium text-[11px] shrink-0 border border-slate-200">{item.id}</span>
                  <p className="text-[13px] font-medium text-slate-800 leading-snug pt-1">{item.text}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:w-48 shrink-0">
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setCurrentAnswers({ ...currentAnswers, [item.id]: val })}
                      className={`h-9 rounded-lg text-xs font-medium transition-colors border ${
                        currentAnswers[item.id] === val
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-primary-300'
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
    </PageWrapper>
  );
};
