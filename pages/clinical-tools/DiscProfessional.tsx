import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  Gauge,
  Target,
  History,
  Sparkles,
  ArrowLeft,
  Plus,
  Save,
  FileText,
  ChevronRight,
  TrendingUp,
  Brain,
  Clock,
  Layout,
  BookOpen,
  Share2,
  CheckCircle,
  Copy,
  Printer,
  Info
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/UI/Modal';
import { Patient } from '../../types';
import { api } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const DISC_ENTRIES = [
  { id: 'q1',  text: 'Gosto de resolver as coisas rapidamente.', block: 'D' },
  { id: 'q2',  text: 'Fico incomodado(a) quando percebo lentidão ou indecisão nos outros.', block: 'D' },
  { id: 'q3',  text: 'Costumo assumir a liderança quando ninguém toma iniciativa.', block: 'D' },
  { id: 'q4',  text: 'Prefiro agir logo do que pensar por muito tempo.', block: 'D' },
  { id: 'q5',  text: 'Sinto necessidade de ter controle sobre o que está acontecendo.', block: 'D' },
  { id: 'q6',  text: 'Tenho facilidade para confrontar situações difíceis.', block: 'D' },
  { id: 'q7',  text: 'Fico frustrado(a) quando as coisas não saem como planejei.', block: 'D' },
  { id: 'q8',  text: 'Em conflitos, costumo me posicionar de forma direta.', block: 'D' },
  { id: 'q9',  text: 'Gosto de conversar e me conectar com pessoas.', block: 'I' },
  { id: 'q10', text: 'Sinto-me motivado(a) quando recebo atenção ou reconhecimento.', block: 'I' },
  { id: 'q11', text: 'Tenho facilidade para entusiasmar outras pessoas.', block: 'I' },
  { id: 'q12', text: 'Gosto de ambientes leves, dinâmicos e com interação.', block: 'I' },
  { id: 'q13', text: 'Costumo expressar com facilidade o que penso e sinto.', block: 'I' },
  { id: 'q14', text: 'Gosto de ser visto(a) como alguém agradável e inspirador(a).', block: 'I' },
  { id: 'q15', text: 'Fico mais animado(a) quando estou em grupo do que sozinho(a).', block: 'I' },
  { id: 'q16', text: 'Valorizo ambientes calmos, previsíveis e harmoniosos.', block: 'S' },
  { id: 'q17', text: 'Mudanças bruscas costumam me deixar desconfortável.', block: 'S' },
  { id: 'q18', text: 'Prefiro manter uma rotina estável.', block: 'S' },
  { id: 'q19', text: 'Costumo evitar conflitos para preservar a paz.', block: 'S' },
  { id: 'q20', text: 'Sou uma pessoa paciente e constante.', block: 'S' },
  { id: 'q21', text: 'Gosto de ajudar os outros de forma acolhedora.', block: 'S' },
  { id: 'q22', text: 'Preciso de um tempo maior para me adaptar a novidades.', block: 'S' },
  { id: 'q23', text: 'Sou detalhista e gosto das coisas bem feitas.', block: 'C' },
  { id: 'q24', text: 'Costumo analisar bastante antes de tomar decisões.', block: 'C' },
  { id: 'q25', text: 'Fico incomodado(a) quando percebo erros, desorganização ou falta de critério.', block: 'C' },
  { id: 'q26', text: 'Gosto de regras claras e orientações bem definidas.', block: 'C' },
  { id: 'q27', text: 'Tenho tendência a cobrar muito de mim mesmo(a).', block: 'C' },
  { id: 'q28', text: 'Prefiro ter certeza antes de agir.', block: 'C' },
  { id: 'q29', text: 'Valorizo precisão, lógica e planejamento.', block: 'C' },
  { id: 'q30', text: 'Reviso mentalmente o que fiz para ver se poderia ter feito melhor.', block: 'C' },
];

const BLOCK_COLORS = {
  D: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Dominância' },
  I: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Influência' },
  S: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Estabilidade' },
  C: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Conformidade' },
};

const BLOCK_PDF_COLORS: Record<string, [number,number,number]> = {
  D: [220, 38, 38],
  I: [217, 119, 6],
  S: [5, 150, 105],
  C: [37, 99, 235],
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

// ─── Types ───────────────────────────────────────────────────────────────────
interface DiscResult {
  id: string | number;
  date: string;
  answers?: Record<string, number>;
  scores: { D: number; I: number; S: number; C: number };
  analysis?: string;
  type?: string;
}

// ─── Clinical Analysis ───────────────────────────────────────────────────────
function getLevel(score: number): 'Forte' | 'Moderado' | 'Baixo' {
  if (score >= 3.5) return 'Forte';
  if (score >= 2.5) return 'Moderado';
  return 'Baixo';
}

function getClinicalAnalysis(scores: { D: number; I: number; S: number; C: number }) {
  const levelText: Record<string, string> = {
    D_Forte: 'Perfil altamente assertivo, orientado a resultados e desafios. Tendência à liderança direta, decisões rápidas e pouca tolerância à lentidão.',
    D_Moderado: 'Capacidade assertiva presente, mas equilibrada. Assume liderança quando necessário, sem impor presença de forma dominante.',
    D_Baixo: 'Postura colaborativa e não confrontadora. Prefere ambientes de consenso e evita conflitos diretos.',
    I_Forte: 'Perfil comunicativo, entusiasta e influente. Alta necessidade de reconhecimento e contato social. Foco em pessoas e relacionamentos.',
    I_Moderado: 'Sociável e expressivo de forma adaptativa. Confortável em grupo, mas sem depender de atenção constante.',
    I_Baixo: 'Mais reservado e focado em tarefas. Não busca protagonismo social; prefere profundidade a superficialidade nas relações.',
    S_Forte: 'Perfil estável, paciente e leal. Alta necessidade de previsibilidade e harmonia. Resistência natural a mudanças abruptas.',
    S_Moderado: 'Equilíbrio entre estabilidade e adaptabilidade. Tolera mudanças quando bem comunicadas e graduais.',
    S_Baixo: 'Adaptável a mudanças e ritmos variáveis. Pode demonstrar impaciência com rotinas muito rígidas ou lentas.',
    C_Forte: 'Perfil analítico, metódico e focado em qualidade. Alta exigência consigo mesmo e com processos. Forte necessidade de dados e critérios claros.',
    C_Moderado: 'Organizado e criterioso dentro do necessário. Equilibra análise e ação sem paralisia por excesso de perfeccionismo.',
    C_Baixo: 'Flexível quanto a regras e procedimentos. Age com mais espontaneidade, podendo subestimar detalhes e protocolos.',
  };

  const parts: string[] = [];
  (['D', 'I', 'S', 'C'] as const).forEach(k => {
    const level = getLevel(scores[k]);
    const key = `${k}_${level}`;
    const label = BLOCK_COLORS[k].label;
    parts.push(`**${label} — ${scores[k].toFixed(2)} (${level}):** ${levelText[key]}`);
  });

  const dominant = (['D', 'I', 'S', 'C'] as const).reduce((a, b) => scores[a] >= scores[b] ? a : b);
  const dominantLabel = BLOCK_COLORS[dominant].label;

  const conclusionMap: Record<string, string> = {
    D: `Perfil predominantemente Dominante. Indivíduo orientado a resultados, que reage melhor em ambientes desafiadores com autonomia e metas claras.`,
    I: `Perfil predominantemente de Influência. Indivíduo orientado a pessoas e reconhecimento, que prospera em ambientes colaborativos e dinâmicos.`,
    S: `Perfil predominantemente de Estabilidade. Indivíduo orientado a harmonia e consistência, que se destaca em ambientes previsíveis e de apoio mútuo.`,
    C: `Perfil predominantemente de Conformidade. Indivíduo orientado a processos e precisão, que funciona melhor com estrutura, dados e critérios bem definidos.`,
  };

  return { parts, conclusion: conclusionMap[dominant], dominant, dominantLabel };
}

export const DISCProfessionalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPid = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  const { t } = useLanguage();

  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPid);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [history, setHistory] = useState<DiscResult[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<DiscResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const getShareLink = () => {
    const base = `${window.location.origin}/f/disc`;
    const params = new URLSearchParams();
    if (selectedPatientId) params.set('p', selectedPatientId);
    if (user?.shareToken) params.set('u', user.shareToken);
    return `${base}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('Copiado!', 'Link de compartilhamento copiado.');
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Olá! Gostaria que você respondesse ao Mapeamento DISC. Acesse pelo link seguro: ${getShareLink()}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

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
        const resp = await api.get<DiscResult[]>(`/clinical-tools/${selectedPatientId}/disc-evaluative`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const calculateScores = () => {
    const raw = { D: 0, I: 0, S: 0, C: 0 };
    const counts = { D: 8, I: 7, S: 7, C: 8 };
    DISC_ENTRIES.forEach(q => {
      raw[q.block as keyof typeof raw] += currentAnswers[q.id] || 0;
    });
    return {
      D: Number((raw.D / counts.D).toFixed(2)),
      I: Number((raw.I / counts.I).toFixed(2)),
      S: Number((raw.S / counts.S).toFixed(2)),
      C: Number((raw.C / counts.C).toFixed(2)),
    };
  };

  const currentScores = useMemo(() => calculateScores(), [currentAnswers]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente.');
      return;
    }
    if (Object.keys(currentAnswers).length < 30) {
      info('Atenção', 'Preencha todas as 30 observações de perfil.');
      return;
    }

    setIsSaving(true);
    try {
      const newResult: DiscResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores,
        type: 'evaluative'
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/disc-evaluative`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('DISC Avaliativo Salvo', 'O perfil clínico foi registrado com sucesso.');
    } catch (err) {
      error('Erro', 'Falha ao salvar o perfil DISC.');
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
        toolName: 'DISC Avaliativo (Perfil Marston)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          blocks: BLOCK_COLORS
        }
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);

      await api.put(`/clinical-tools/${selectedPatientId}/disc-evaluative`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });

      setHistory(updatedHistory);
      if (detailResult?.id === resultId) setDetailResult({ ...detailResult, analysis });
      success('Aurora Analisou', 'Perfil comportamental expandido pela IA.');
    } catch (err) {
      error('Erro', 'Erro na geração da análise.');
    } finally {
      setAnalyzingId(null);
    }
  };

  // ── PDF Print (HTML window.print) ─────────────────────────────────────────
  const handlePrintReport = (result: DiscResult | null, patientName: string) => {
    if (!result) return;
    const { parts, conclusion, dominantLabel } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const blockColorMap: Record<string, string> = { D: '#dc2626', I: '#d97706', S: '#059669', C: '#2563eb' };
    const blockBgMap: Record<string, string>    = { D: '#fef2f2', I: '#fffbeb', S: '#ecfdf5', C: '#eff6ff' };

    const scoresHtml = (['D', 'I', 'S', 'C'] as const).map(k => {
      const score = result.scores[k];
      const level = getLevel(score);
      const c = blockColorMap[k];
      const bg = blockBgMap[k];
      const pct = ((score / 5) * 100).toFixed(1);
      return `
        <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:18px 22px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#334155">${BLOCK_COLORS[k].label}</span>
            <span style="background:${bg};color:${c};border:1px solid ${c}30;padding:3px 12px;border-radius:99px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${level}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <span style="font-size:32px;font-weight:900;color:#0f172a;line-height:1;min-width:56px">${score.toFixed(2)}</span>
            <div style="flex:1">
              <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${c};border-radius:99px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px">
                <span style="font-size:9px;color:#94a3b8;font-weight:600">0</span>
                <span style="font-size:9px;color:#94a3b8;font-weight:600">5</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const analysisHtml = parts.map(p => {
      const clean = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b">$1</strong>');
      return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
        <div style="width:6px;height:6px;background:#7c3aed;border-radius:50%;margin-top:5px;flex-shrink:0"></div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#475569">${clean}</p>
      </div>`;
    }).join('');

    const answersHtml = result.answers ? DISC_ENTRIES.map((item, i) => {
      const val = result.answers![item.id];
      const c = blockColorMap[item.block];
      const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      return `<tr style="background:${bg}">
        <td style="padding:8px 12px;font-size:11px;color:#64748b;font-weight:700;width:28px;text-align:right">${String(i+1).padStart(2,'0')}</td>
        <td style="padding:8px 6px;width:22px"><span style="background:${c}15;color:${c};font-size:9px;font-weight:800;padding:2px 5px;border-radius:4px">${item.block}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#334155;line-height:1.4">${item.text}</td>
        <td style="padding:8px 12px;text-align:right;white-space:nowrap">
          <span style="font-size:16px;font-weight:900;color:#7c3aed">${val ?? '—'}</span>
        </td>
      </tr>`;
    }).join('') : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DISC Avaliativo — ${patientName}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-break { page-break-inside: avoid; } }
</style>
</head>
<body>

<div style="background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);padding:28px 40px 24px;color:white">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.75">Relatório de Mapeamento Comportamental</p>
      <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-.5px">${patientName}</h1>
      <p style="margin:0;font-size:12px;opacity:.8;font-weight:500">${dateStr}</p>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:8px 16px;display:inline-block">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.8;margin-bottom:2px">Instrumento</p>
        <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:-.3px">DISC</p>
        <p style="margin:0;font-size:9px;opacity:.7;margin-top:2px">Protocolo Marston</p>
      </div>
    </div>
  </div>
</div>

<div style="padding:32px 40px">

  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#7c3aed;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#7c3aed;border-radius:1px"></span> Resultados por Fator
    </h2>
    ${scoresHtml}
  </div>

  <div class="no-break" style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#7c3aed;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#7c3aed;border-radius:1px"></span> Análise Comportamental
    </h2>
    <div style="background:#fafafa;border:1px solid #f1f5f9;border-radius:16px;padding:20px 22px">
      ${analysisHtml}
      <div style="margin-top:14px;padding:14px 16px;background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:12.5px;color:#4c1d95;line-height:1.6"><strong>Fator Dominante — ${dominantLabel}:</strong> ${conclusion}</p>
      </div>
    </div>
  </div>

  ${answersHtml ? `
  <div style="margin-bottom:28px">
    <h2 style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#7c3aed;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:2px;background:#7c3aed;border-radius:1px"></span> Respostas Registradas
    </h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right;width:36px">#</th>
          <th style="padding:8px 6px;width:26px"></th>
          <th style="padding:8px 10px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:left">Observação</th>
          <th style="padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;text-align:right">Pontuação</th>
        </tr>
      </thead>
      <tbody>${answersHtml}</tbody>
    </table>
  </div>` : ''}

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

  // ── jsPDF Download ────────────────────────────────────────────────────────
  const handleDownloadPDF = (result: DiscResult | null, patientName: string) => {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;
    const { parts, conclusion, dominantLabel } = getClinicalAnalysis(result.scores);
    const dateStr = new Date(result.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const systemName = 'PsiFlux · Tecnologia para Prática Clínica';

    // Header
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, W, 45, 'F');
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 36, W, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(200, 195, 255);
    doc.text('RELATÓRIO DE MAPEAMENTO COMPORTAMENTAL DISC', MARGIN, 15);

    doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(patientName, MARGIN, 26);

    doc.setFontSize(9); doc.setTextColor(220, 218, 255);
    doc.text(`Avaliação: DISC Avaliativo (Protocolo Marston)  |  ${dateStr}`, MARGIN, 33);

    let y = 58;

    // Scores
    doc.setFontSize(10); doc.setTextColor(124, 58, 237);
    doc.text('RESULTADOS POR FATOR', MARGIN, y);
    y += 6;

    (['D', 'I', 'S', 'C'] as const).forEach(k => {
      const score = result.scores[k];
      const level = getLevel(score);
      const rgb = BLOCK_PDF_COLORS[k];

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(MARGIN, y, CONTENT_W, 20, 4, 4, 'FD');

      doc.setFontSize(8); doc.setTextColor(51, 65, 85);
      doc.text(`${BLOCK_COLORS[k].label.toUpperCase()} (${k})`, MARGIN + 6, y + 8);

      doc.setFontSize(18); doc.setTextColor(15, 23, 42);
      doc.text(score.toFixed(2), MARGIN + 6, y + 17);

      const labelW = doc.getTextWidth(level) + 6;
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(W - MARGIN - labelW - 6, y + 4, labelW, 6, 3, 3, 'F');
      doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text(level, W - MARGIN - labelW / 2 - 6, y + 8.2, { align: 'center' });

      const barW = CONTENT_W - 55;
      const barX = MARGIN + 45;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y + 12, barW, 2.5, 1.25, 1.25, 'F');
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      const progressW = Math.min((score / 5) * barW, barW);
      doc.roundedRect(barX, y + 12, progressW, 2.5, 1.25, 1.25, 'F');

      y += 24;
    });

    y += 4;

    // Analysis
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(124, 58, 237);
    doc.text('ANÁLISE COMPORTAMENTAL', MARGIN, y);
    y += 8;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(241, 245, 249);

    const analysisLines: string[] = [];
    parts.forEach(p => {
      const clean = p.replace(/\*\*/g, '');
      analysisLines.push(...doc.splitTextToSize(clean, CONTENT_W - 16));
    });
    const conclusionLines = doc.splitTextToSize(`Fator Dominante — ${dominantLabel}: ${conclusion}`, CONTENT_W - 16);
    const boxH = (analysisLines.length + conclusionLines.length) * 5 + 15;

    if (y + boxH > 275) { doc.addPage(); y = 20; }
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4, 4, 'FD');

    let analysisY = y + 8;
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    analysisLines.forEach(line => {
      doc.text('• ' + line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    analysisY += 2;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(76, 29, 149);
    conclusionLines.forEach(line => {
      doc.text(line, MARGIN + 6, analysisY);
      analysisY += 5;
    });

    y += boxH + 15;

    // Answers table
    if (result.answers && Object.keys(result.answers).length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(124, 58, 237);
      doc.text('OBSERVAÇÕES REGISTRADAS', MARGIN, y);
      y += 6;

      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('#', MARGIN + 4, y + 5);
      doc.text('F', MARGIN + 10, y + 5);
      doc.text('OBSERVAÇÃO', MARGIN + 18, y + 5);
      doc.text('PONTUAÇÃO', W - MARGIN - 6, y + 5, { align: 'right' });
      y += 8;

      doc.setFontSize(8.5); doc.setTextColor(51, 65, 85);
      DISC_ENTRIES.forEach((item, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        const val = result.answers![item.id];
        const textLines = doc.splitTextToSize(item.text, CONTENT_W - 40);
        const rowH = Math.max(textLines.length * 4.5, 8);

        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
        }

        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
        doc.text(String(i + 1).padStart(2, '0'), MARGIN + 2, y + 5);

        const rgb = BLOCK_PDF_COLORS[item.block];
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(item.block, MARGIN + 10, y + 5);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(51, 65, 85);
        textLines.forEach((ln: string, li: number) => {
          doc.text(ln, MARGIN + 18, y + 5 + li * 4.5);
        });

        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(109, 40, 217);
        doc.text(String(val ?? '—'), W - MARGIN - 6, y + 5, { align: 'right' });

        y += rowH;
      });
    }

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

    doc.save(`DISC_${patientName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  // ── Radar SVG ─────────────────────────────────────────────────────────────
  const RadarGraphic = ({ scores }: { scores: any }) => {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;
    const factors = ['D', 'I', 'S', 'C'];

    const points = factors.map((f, i) => {
      const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
      const val = (scores[f] || 0) / 5;
      const r = radius * val;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');

    const webPaths = [0.25, 0.5, 0.75, 1].map(scale => {
      return factors.map((_, i) => {
        const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
        const r = radius * scale;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(' ');
    });

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {webPaths.map((path, i) => (
          <polygon key={i} points={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {factors.map((_, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          return (
            <line key={i} x1={center} y1={center}
              x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          );
        })}
        {factors.map((f, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          const r = radius + 25;
          return (
            <text key={i} x={center + r * Math.cos(angle)} y={center + r * Math.sin(angle)}
              fill="white" fontSize="10" fontWeight="900" textAnchor="middle" alignmentBaseline="middle"
              className="uppercase tracking-widest opacity-40 font-black">
              {f}
            </text>
          );
        })}
        <polygon points={points} fill="rgba(139, 92, 246, 0.3)" stroke="#8b5cf6" strokeWidth="3" strokeLinejoin="round" />
        {points.split(' ').map((p, i) => {
          const [x, y] = p.split(',');
          return <circle key={i} cx={x} cy={y} r="4" fill="#8b5cf6" stroke="white" strokeWidth="2" />;
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="DISC Avaliativo (Clínico)"
        subtitle="Mapeamento técnico de tendências comportamentais para uso em sessão."
        icon={<Gauge className="text-violet-500" />}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={
          <div className="flex gap-2">
             <Button
                variant="outline"
                size="sm"
                radius="xl"
                leftIcon={<Share2 size={16} />}
                onClick={() => selectedPatientId ? setIsSharing(true) : info('Selecione um paciente', 'Escolha um prontuário para compartilhar o link.')}
                className="bg-white text-slate-600 border-slate-200"
             >
                Compartilhar
             </Button>
             <Button
                variant="primary"
                size="sm"
                radius="xl"
                leftIcon={<Plus size={16} />}
                onClick={() => selectedPatientId ? setIsApplying(true) : info('Selecione um paciente', 'Escolha um prontuário para realizar o mapeamento.')}
                className="bg-violet-600 text-white shadow-xl shadow-violet-200"
             >
                Novo Mapeamento
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
                 <BookOpen size={14} className="text-violet-400" /> Referência Técnica
              </h4>
              <div className="space-y-3">
                 {Object.entries(BLOCK_COLORS).map(([k, v]) => (
                   <div key={k} className="space-y-1">
                      <p className={`text-[10px] font-black uppercase ${v.color}`}>{k} — {v.label}</p>
                      <p className="text-[9px] text-slate-400 font-medium italic leading-tight">Reage a {k === 'D' ? 'Desafios e Resultados' : k === 'I' ? 'Pessoas e Networking' : k === 'S' ? 'Ritmo e Estabilidade' : 'Regras e Detalhes'}.</p>
                   </div>
                 ))}
              </div>
          </div>
        </div>

        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Gauge size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione um prontuário para realizar o DISC Avaliativo.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <Brain size={240} />
                </div>

                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-violet-400 mb-10">
                   <Target size={18} /> Cockpit de Tendência Comportamental
                </h3>

                <div className="flex flex-col items-center gap-12">
                   <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm">
                      <RadarGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                   </div>
                   <div className="flex-1 space-y-6 w-full">
                      {(['D', 'I', 'S', 'C'] as const).map(k => {
                         const lastRes = history.length > 0 ? history[history.length - 1] : null;
                         const score = lastRes ? lastRes.scores[k] : currentScores[k];
                         const v = BLOCK_COLORS[k];
                         return (
                           <div key={k} className="space-y-2">
                              <div className="flex items-center justify-between">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{v.label}</span>
                                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 ${v.color}`}>{getLevel(score)}</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                 <div className={`h-full transition-all duration-1000 ${v.color.replace('text', 'bg')}`} style={{ width: `${(score / 5) * 100}%` }} />
                              </div>
                           </div>
                         );
                      })}
                      <div className="pt-4 border-t border-white/10 text-slate-500">
                         <p className="text-[9px] font-black uppercase tracking-widest italic leading-relaxed">Perfil Técnico da Última Observação</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp size={16} className="text-violet-500" /> Evolução de Adaptabilidade
                    </h4>
                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                       {history.length < 2 && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ponto único de observação</p>
                         </div>
                       )}
                       {history.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                         <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-blue-500/20 w-full rounded-t-lg" style={{ height: `${(res.scores.C / 5) * 100}%` }} />
                            <div className="bg-emerald-500/40 w-full" style={{ height: `${(res.scores.S / 5) * 100}%` }} />
                            <div className="bg-amber-500/60 w-full" style={{ height: `${(res.scores.I / 5) * 100}%` }} />
                            <div className="bg-red-500/80 w-full rounded-b-lg" style={{ height: `${(res.scores.D / 5) * 100}%` }} />
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Mapeamento</p>
                       <History size={16} className="text-slate-300" />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                       {history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => (
                         <div key={res.id} className="px-6 py-4 hover:bg-slate-50 transition-all group flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <Clock size={11} className="text-violet-400 shrink-0" />
                                     <span className="text-xs font-black text-slate-700">{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                                     {res.analysis && <Sparkles size={11} className="text-amber-400" />}
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                     {Object.entries(res.scores).map(([k, v]: any) => (
                                        <div key={k} className="flex flex-col">
                                           <span className="text-[8px] font-black text-slate-400 uppercase">{k}</span>
                                           <span className={`text-[12px] font-black ${BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].color}`}>{v}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                               <button
                                 onClick={() => generateAIResult(res.id)}
                                 title="Análise Aurora"
                                 className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.analysis ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-violet-500'}`}
                               >
                                  <Sparkles size={13} className={analyzingId === res.id ? 'animate-spin' : ''} />
                               </button>
                               <button
                                 onClick={() => { setDetailResult(res); setShowAnswers(false); }}
                                 className="flex items-center gap-1.5 px-3 h-8 bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
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

      <Modal
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        title="Mapeamento DISC Clínico"
        subtitle={`Avaliando Perfil: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}`}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" radius="xl" onClick={() => setIsApplying(false)} className="flex-1">Cancelar</Button>
            <Button
                variant="primary"
                radius="xl"
                onClick={handleSave}
                isLoading={isSaving}
                className="flex-2 bg-violet-600 text-white"
            >
                Processar Perfil Marston <Save size={18} className="ml-2" />
            </Button>
          </div>
        }
      >
        <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
           <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-[11px] font-medium text-slate-500">
              "Observe as tendências comportamentais do paciente durante as sessões e responda de 1 a 5 o quanto cada fator se manifesta."
           </div>

           {(['D', 'I', 'S', 'C'] as const).map(block => (
              <div key={block} className="space-y-8">
                 <div className={`p-4 rounded-2xl border ${BLOCK_COLORS[block].bg} ${BLOCK_COLORS[block].border} flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-current ${BLOCK_COLORS[block].color}`}>
                       <span className="font-black text-lg">{block}</span>
                    </div>
                    <div>
                       <p className={`text-xs font-black uppercase ${BLOCK_COLORS[block].color}`}>{BLOCK_COLORS[block].label}</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Dimensionamento de Fator</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                    {DISC_ENTRIES.filter(e => e.block === block).map(entry => (
                       <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:border-violet-200 transition-all shadow-sm">
                          <span className="text-xs font-black text-slate-700 flex-1 leading-tight">{entry.text}</span>
                          <div className="flex gap-1.5 self-end">
                             {[1, 2, 3, 4, 5].map(v => (
                               <button
                                 key={v}
                                 onClick={() => setCurrentAnswers({ ...currentAnswers, [entry.id]: v })}
                                 className={`w-11 h-11 rounded-xl text-xs font-black border transition-all ${
                                   currentAnswers[entry.id] === v
                                   ? `bg-slate-950 text-white border-slate-950 shadow-xl scale-[1.1]`
                                   : 'bg-white text-slate-300 border-slate-100 hover:border-violet-200 hover:text-violet-500'
                                 }`}
                               >
                                  {v}
                               </button>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           ))}
        </div>
      </Modal>

      <Modal
        isOpen={isSharing}
        onClose={() => setIsSharing(false)}
        title="Compartilhar Perfil DISC"
        subtitle="Enviar link de mapeamento para resposta externa do paciente."
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
           <div className="p-6 bg-violet-50 rounded-3xl border border-violet-100 space-y-3">
              <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest leading-none">Link de Resposta Segura</p>
              <div className="flex gap-2">
                 <input
                   readOnly
                   value={getShareLink()}
                   className="flex-1 bg-white border border-violet-200 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-500 outline-none"
                 />
                 <button
                   onClick={handleCopyLink}
                   className="w-12 h-12 bg-white border border-violet-200 rounded-xl flex items-center justify-center text-violet-600 hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                 >
                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                 </button>
              </div>
           </div>

           <div className="space-y-3">
              <Button
                variant="primary"
                radius="xl"
                className="w-full py-8 bg-emerald-600 border-b-4 border-emerald-800 hover:bg-slate-950"
                onClick={handleWhatsApp}
              >
                 Enviar via WhatsApp
              </Button>
              <Button
                variant="outline"
                radius="xl"
                className="w-full py-8 text-slate-400 font-black uppercase tracking-widest text-[10px]"
                onClick={() => setIsSharing(false)}
              >
                 Cancelar
              </Button>
           </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailResult && (
        <div className="fixed inset-0 mt-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-[0_20px_70px_rgba(15,23,42,0.18)] w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-300" style={{maxHeight:'90vh'}}>

            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-slate-100 shrink-0">
               <div>
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Perfil Comportamental Consolidado</p>
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

            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6 custom-scrollbar pb-12">
              {(() => {
                const { parts, conclusion, dominant, dominantLabel } = getClinicalAnalysis(detailResult.scores);
                return (<>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                   <div className="bg-slate-950 rounded-2xl p-6 flex items-center justify-center shadow-xl" style={{minHeight:'200px'}}>
                      <RadarGraphic scores={detailResult.scores} />
                   </div>
                   <div className="space-y-3">
                      {(['D', 'I', 'S', 'C'] as const).map(k => {
                         const score = detailResult.scores[k];
                         const level = getLevel(score);
                         const v = BLOCK_COLORS[k];
                         return (
                           <div key={k} className={`px-4 py-3 rounded-xl border ${v.border} ${v.bg}`}>
                              <div className="flex items-center justify-between mb-2">
                                 <h4 className={`text-[11px] font-black uppercase tracking-widest ${v.color}`}>{k} — {v.label}</h4>
                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/80 ${v.color}`}>{level}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className={`text-2xl font-black w-12 ${v.color}`}>{score.toFixed(2)}</div>
                                 <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${v.color.replace('text', 'bg')}`} style={{ width: `${(score / 5) * 100}%` }} />
                                 </div>
                              </div>
                           </div>
                         );
                      })}
                   </div>
                </div>

                <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                   <div className="bg-slate-50 px-8 py-5 flex items-center gap-3 border-b border-slate-100">
                      <Brain size={18} className="text-violet-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Análise Comportamental — DISC (Protocolo Marston)</h3>
                   </div>
                   <div className="p-8 space-y-4">
                      {parts.map((part, i) => {
                        const [bold, ...rest] = part.split(':');
                        return (
                          <div key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                             <span className="w-1.5 h-1.5 rounded-full bg-violet-300 mt-2 shrink-0" />
                             <p><span className="font-black text-slate-800">{bold.replace(/\*\*/g, '')}:</span>{rest.join(':').replace(/^\*\*\s*/, ' ')}</p>
                          </div>
                        );
                      })}
                      <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-2xl text-sm text-slate-700 leading-relaxed">
                         <span className="font-black text-violet-700">Fator Dominante — {dominantLabel}: </span>{conclusion}
                      </div>
                   </div>
                </div>

                {detailResult.analysis && (
                  <div className="bg-violet-600 rounded-xl p-5 text-white shadow-lg shadow-violet-100">
                     <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-amber-400" /> Análise Aurora (IA)
                     </h3>
                     <div className="text-sm text-violet-100 space-y-0">
                        {renderMarkdown(detailResult.analysis!)}
                     </div>
                  </div>
                )}

                {!detailResult.analysis && (
                  <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex items-center gap-6">
                     <Sparkles size={32} className="text-slate-300 shrink-0" />
                     <div className="flex-1">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Aurora — IA Clínica</p>
                        <p className="text-sm text-slate-400">Gere uma análise aprofundada com inteligência artificial para este perfil.</p>
                     </div>
                     <Button onClick={() => generateAIResult(detailResult.id)} isLoading={analyzingId === detailResult.id} className="bg-violet-600 text-white rounded-2xl px-6 py-3 shrink-0">Analisar</Button>
                  </div>
                )}

                {detailResult.answers && Object.keys(detailResult.answers).length > 0 && (
                  <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                     <button
                       onClick={() => setShowAnswers(!showAnswers)}
                       className="w-full bg-slate-50 px-8 py-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100 transition-all"
                     >
                        <div className="flex items-center gap-3">
                           <FileText size={18} className="text-slate-400" />
                           <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Respostas Registradas (30 itens)</h3>
                        </div>
                        <ChevronRight size={18} className={`text-slate-400 transition-transform ${showAnswers ? 'rotate-90' : ''}`} />
                     </button>
                     {showAnswers && (
                       <div className="divide-y divide-slate-50">
                          {DISC_ENTRIES.map(item => {
                            const val = detailResult.answers![item.id];
                            const v = BLOCK_COLORS[item.block as keyof typeof BLOCK_COLORS];
                            return (
                              <div key={item.id} className="px-8 py-4 flex items-start gap-4 hover:bg-slate-50/60">
                                 <span className="text-[10px] font-black text-slate-300 w-6 shrink-0 mt-0.5">{String(DISC_ENTRIES.indexOf(item)+1).padStart(2,'0')}</span>
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${v.bg} ${v.color}`}>{item.block}</span>
                                 <p className="flex-1 text-sm text-slate-600 leading-relaxed">{item.text}</p>
                                 <div className="shrink-0 text-right">
                                    <span className={`text-lg font-black ${v.color}`}>{val ?? '—'}</span>
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
    </div>
  );
};
