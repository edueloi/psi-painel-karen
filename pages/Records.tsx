import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TherapeuticPlanEditor, EMPTY_PLAN, type TheraPlan } from '../components/TherapeuticPlanEditor';
import { RelatorioModal, EncaminhamentoModal, AtestadoModal } from '../components/modals/DocumentModals';
import { PatientTimeline } from '../components/PatientTimeline';
import { api, getStaticUrl } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { GridTable } from '../components/UI/GridTable';
import { PageHeader } from '../components/UI/PageHeader';
import {
  Search, Plus, FileText, Calendar, Clock, Activity, BarChart2,
  Trash2, Eye, EyeOff, Edit3, CheckCircle2, ChevronRight, Loader2,
  Sparkles, Lock, LockOpen, AlertTriangle, Save, Shield,
  X, ArrowLeft, Layers, User, Download, RotateCcw, Tag,
  History, BookOpen, Filter, Share2, Users, Send, Copy, ExternalLink,
  ClipboardCheck, RefreshCw, MessageSquare, Brain, CheckCheck,
  LinkIcon, Bell, Info,
  Settings
} from 'lucide-react';
import { DatePicker } from '../components/UI/DatePicker';
import { RichTextEditor } from '../components/UI/RichTextEditor';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

/* ── Types ─────────────────────────────────────────── */
interface Patient { id: string; full_name: string; birth_date?: string; cpf?: string; phone?: string; email?: string; status?: string; }
interface MedicalRecord {
  id: string; patient_id: string; professional_id?: string; professional_name?: string;
  record_type: string; title: string; status: string; ai_status?: string;
  content?: string; draft_content?: string; ai_organized_content?: string;
  restricted_content?: string; is_restricted?: boolean; appointment_type?: string;
  start_time?: string; end_time?: string; created_at: string; updated_at?: string;
  tags?: string[]; patient_name?: string; version_count?: number; approved_at?: string;
  attachments?: any[];
}
interface Stats { total: number; thisMonth: number; approved: number; drafts: number; byType: any[]; byMonth: any[]; topPatients: any[]; }

const STATUS_COLORS: Record<string, string> = {
  'Rascunho': 'bg-amber-100 text-amber-700 border-amber-200',
  'Organizado': 'bg-blue-100 text-blue-700 border-blue-200',
  'Revisado': 'bg-purple-100 text-purple-700 border-purple-200',
  'Aprovado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Finalizado': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};
const TYPE_LABELS: Record<string, string> = {
  Evolucao: 'Evolução', Anamnese: 'Anamnese', Avaliacao: 'Avaliação',
  Encaminhamento: 'Encaminhamento', Plano: 'Plano Terapêutico', Relatorio: 'Relatório',
  Atestado: 'Atestado',
};
const PIE_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const strip = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const mdToHtml = (md: string): string => {
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 4px;font-size:14px;font-weight:700">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:14px 0 6px;font-size:16px;font-weight:700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:16px 0 8px;font-size:18px;font-weight:700">$1</h1>')
    .replace(/\n\n/g, '</p><p style="margin:6px 0">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p style="margin:6px 0">')
    .replace(/$/, '</p>');
};

const TOOL_DISPLAY_NAMES: Record<string, { label: string; category: string }> = {
  'dass-21': { label: 'DASS-21', category: 'Escala Clínica' },
  'phq-9': { label: 'PHQ-9', category: 'Escala Clínica' },
  'gad-7': { label: 'GAD-7', category: 'Escala Clínica' },
  'bdi-ii': { label: 'Beck Depressão (BDI-II)', category: 'Inventário' },
  'bai': { label: 'Beck Ansiedade (BAI)', category: 'Inventário' },
  'beck-depressao': { label: 'Beck Depressão (BDI)', category: 'Inventário' },
  'beck-ansiedade': { label: 'Beck Ansiedade (BAI)', category: 'Inventário' },
  'snap-iv': { label: 'SNAP-IV (TDAH)', category: 'Escala Clínica' },
  'm-chat-r': { label: 'M-CHAT-R/F (Autismo)', category: 'Escala Clínica' },
  'neuro/assessment': { label: 'Avaliação Neuropsicológica', category: 'Neuropsicologia' },
  'tcc/rpd': { label: 'RPD (TCC)', category: 'Registro Clínico' },
  'tcc/cards': { label: 'Cartões de Enfrentamento', category: 'Recurso Terapêutico' },
  'schema/latest': { label: 'Mapa de Esquemas', category: 'Terapia do Esquema' },
  'psycho/dreams': { label: 'Registro de Sonhos', category: 'Psicanálise' },
  'psycho/signifiers': { label: 'Significantes', category: 'Psicanálise' },
  'psycho/free': { label: 'Associações Livres', category: 'Psicanálise' },
  'fap/crbs': { label: 'Comportamentos Alvo (CRBs)', category: 'FAP' },
  'fap/five_rules': { label: 'As 5 Regras da FAP', category: 'FAP' },
  'fap/session_notes': { label: 'Notas de Sessão (FAP)', category: 'FAP' },
  'mindfulness/practices': { label: 'Práticas de Mindfulness', category: 'Prática' },
  'mindfulness/bodyscans': { label: 'Escaneamento Corporal', category: 'Prática' },
  'mindfulness/anchors': { label: 'Âncoras', category: 'Prática' },
  'positivepsych/strengths': { label: 'Forças de Caráter', category: 'Psicologia Positiva' },
  'positivepsych/gratitude': { label: 'Diário de Gratidão', category: 'Psicologia Positiva' },
  'positivepsych/wellbeing': { label: 'Bem-Estar (PERMA)', category: 'Psicologia Positiva' },
  'act/values': { label: 'Valores Pessoais (ACT)', category: 'ACT' },
  'act/defusions': { label: 'Desfusão Cognitiva', category: 'ACT' },
  'act/matrix': { label: 'Matriz ACT', category: 'ACT' },
  'anamnese': { label: 'Anamnese Clínica', category: 'Anamnese' }
};


const ANAMNESIS_FIELD_LABELS: Record<string, string> = {
  // História e Contexto
  motivo_busca: 'Motivo da busca',
  queixa_principal: 'Queixa principal',
  tempo_sofrimento: 'Tempo de sofrimento',
  // História Pessoal
  historico_tratamentos: 'Histórico de tratamentos',
  tratamentos_detalhes: 'Detalhes dos tratamentos anteriores',
  medicamentos: 'Uso de medicamentos',
  medicamentos_quais: 'Quais medicamentos',
  historico_saude: 'Histórico de saúde física/mental',
  // Vida Atual
  sono: 'Qualidade do sono',
  alimentacao: 'Qualidade da alimentação',
  atividade_fisica: 'Atividade física',
  trabalho_estudo: 'Trabalho ou estudo',
  satisfacao_trabalho: 'Satisfação com trabalho/estudo',
  // Relacionamentos
  relacionamento_atual: 'Relacionamento afetivo atual',
  apoio_social: 'Rede de apoio social',
  relacoes_familiares: 'Relações familiares',
  // Saúde Emocional
  humor_geral: 'Humor predominante',
  ansiedade: 'Frequência de ansiedade',
  pensamentos_intrusivos: 'Pensamentos intrusivos',
  pensamentos_descricao: 'Descrição dos pensamentos',
  bem_estar_geral: 'Autoavaliação de bem-estar (0-10)',
  // Objetivos
  objetivos_terapia: 'Objetivos com a terapia',
  urgencia: 'Situação de urgência ou crise',
  urgencia_descricao: 'Detalhamento da urgência',
};

/* ═══════════════════════════════════════════════════════════════
   PASSWORD GATE MODAL
═══════════════════════════════════════════════════════════════ */
const PasswordModal: React.FC<{ title: string; onConfirm: (p: string) => Promise<void>; onClose: () => void }> = ({ title, onConfirm, onClose }) => {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const submit = async () => {
    if (!pw) { setErr('Digite sua senha'); return; }
    setLoading(true); setErr('');
    try { await onConfirm(pw); onClose(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.message || 'Senha incorreta'); }
    finally { setLoading(false); }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      subtitle="Digite sua senha de acesso para confirmar esta operação sensível."
      maxWidth="sm"
      footer={
        <div className="flex gap-3 w-full">
           <Button variant="ghost" onClick={onClose} className="flex-1 uppercase text-xs font-black tracking-widest">Cancelar</Button>
           <Button onClick={submit} isLoading={loading} variant="primary" className="flex-1 uppercase text-xs font-black tracking-widest gap-2">
             <Shield size={16}/> Confirmar
           </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha do sistema</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoFocus
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-300 focus:bg-white transition-all text-sm placeholder:text-slate-300 shadow-inner"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>
        {err && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 animate-shake">
            <AlertTriangle size={14} className="text-rose-500 shrink-0"/>
            <p className="text-xs font-bold text-rose-600 leading-tight">{err}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   EXPORT MODAL (PDF / WORD)
   Suporta os modos exigidos pelo CFP
═══════════════════════════════════════════════════════════════ */
type ExportMode = 'standard' | 'full' | 'no_restricted' | 'restricted_only';

const ExportModal: React.FC<{
  patient: any;
  records: MedicalRecord[];
  onExport: (mode: ExportMode, format: 'pdf' | 'word') => void;
  onClose: () => void;
}> = ({ patient, records, onExport, onClose }) => {
  const [mode, setMode] = useState<ExportMode>('standard');

  const OPTIONS = [
    { id: 'standard', title: 'Resumo Clínico Padrão', desc: 'Informações essenciais para continuidade do cuidado.' },
    { id: 'full', title: 'Prontuário Completo', desc: 'Todo o histórico clínico e evoluções (sem campo restrito).' },
    { id: 'no_restricted', title: 'Versão Compartilhada', desc: 'Apenas os campos públicos/compartilhados.' },
    { id: 'restricted_only', title: 'Anotações Restritas', desc: 'Apenas o campo restrito (uso interno autorizado).' },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Exportar Documentação"
      subtitle={`Selecione o formato e conteúdo para: ${patient?.full_name}`}
      maxWidth="md"
      footer={
        <div className="flex gap-3 w-full">
           <Button variant="ghost" onClick={onClose} className="flex-1 uppercase text-xs font-black tracking-widest">Fechar</Button>
           <Button onClick={() => onExport(mode, 'pdf')} variant="primary" className="flex-1 bg-slate-800 border-slate-800 uppercase text-xs font-black tracking-widest gap-2">
             <FileText size={16}/> Gerar PDF
           </Button>
           <Button onClick={() => onExport(mode, 'word')} variant="primary" className="flex-1 uppercase text-xs font-black tracking-widest gap-2">
             <Download size={16}/> Gerar Word
           </Button>
        </div>
      }
    >
      <div className="space-y-3 pt-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecione o Conteúdo</p>
        <div className="grid grid-cols-1 gap-2">
          {OPTIONS.map(opt => (
            <button 
              key={opt.id} 
              onClick={() => setMode(opt.id as ExportMode)}
              className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                mode === opt.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              {mode === opt.id && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white animate-pulse" />}
              <div className="font-black text-sm mb-0.5 uppercase tracking-tight">{opt.title}</div>
              <div className={`text-[11px] font-bold leading-tight ${mode === opt.id ? 'text-indigo-100' : 'text-slate-400 font-medium'}`}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RECORD VIEWER — visualização somente-leitura do prontuário
═══════════════════════════════════════════════════════════════ */
const ORGANIZED_FIELDS_LABELS: { key: string; label: string; icon: string }[] = [
  { key: 'motivo_consulta',        label: 'Motivo da Consulta / Tema Central',      icon: '🎯' },
  { key: 'contexto_relevante',     label: 'Contexto Relevante',                     icon: '📋' },
  { key: 'observacoes_clinicas',   label: 'Observações Clínicas',                   icon: '🔍' },
  { key: 'intervencoes_realizadas',label: 'Intervenções Realizadas',                icon: '🛠️' },
  { key: 'evolucao_resposta',      label: 'Evolução / Resposta da Paciente',        icon: '📈' },
  { key: 'plano_terapeutico',      label: 'Plano Terapêutico / Próximos Passos',   icon: '🗺️' },
  { key: 'encaminhamentos',        label: 'Encaminhamentos',                        icon: '➡️' },
  { key: 'observacao_complementar',label: 'Observação Complementar',               icon: '📝' },
];

/* ─────────────────────────────────────────────────────────
   RECORD TYPE SELECTOR
───────────────────────────────────────────────────────── */
const TYPE_DEFINITIONS = [
  {
    key: 'Evolucao', label: 'Evolução Clínica',
    description: 'Registro da sessão, intervenções realizadas e evolução do processo',
    icon: '📋', color: 'indigo',
    bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100',
  },
  {
    key: 'Anamnese', label: 'Anamnese',
    description: 'Histórico do paciente coletado via formulário remoto enviado ao e-mail',
    icon: '📝', color: 'violet',
    bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100',
  },
  {
    key: 'Avaliacao', label: 'Avaliação Clínica',
    description: 'Avaliação do caso com integração de instrumentos e escalas aplicadas',
    icon: '🔍', color: 'cyan',
    bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', iconBg: 'bg-cyan-100',
  },
  {
    key: 'Plano', label: 'Plano Terapêutico',
    description: 'Plano estruturado com necessidades, metas, intervenções e roadmap',
    icon: '🗺️', color: 'emerald',
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100',
  },
  {
    key: 'Relatorio', label: 'Relatório / Laudo',
    description: 'Relatório técnico, laudo psicológico ou declaração para terceiros',
    icon: '📄', color: 'blue',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100',
  },
  {
    key: 'Encaminhamento', label: 'Encaminhamento',
    description: 'Encaminhamento para outro serviço, especialidade ou profissional',
    icon: '🔄', color: 'amber',
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100',
  },
  {
    key: 'Atestado', label: 'Atestado',
    description: 'Atestado de comparecimento, afastamento ou aptidão psicológica',
    icon: '📋', color: 'rose',
    bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100',
  },
];

const RecordTypeSelector: React.FC<{
  onSelect: (type: string) => void;
  onClose: () => void;
  patientName?: string;
}> = ({ onSelect, onClose, patientName }) => (
  <Modal isOpen onClose={onClose} title="Novo Registro Clínico"
    subtitle={patientName ? `Paciente: ${patientName}` : 'Selecione o tipo de registro'}
    maxWidth="2xl"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
      {TYPE_DEFINITIONS.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={`group flex items-start gap-4 p-4 rounded-2xl border-2 ${t.border} ${t.bg} hover:shadow-md transition-all text-left hover:-translate-y-0.5 active:scale-[0.98]`}
        >
          <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}>
            {t.icon}
          </div>
          <div className="min-w-0">
            <p className={`font-black text-sm uppercase tracking-tight ${t.text}`}>{t.label}</p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{t.description}</p>
          </div>
        </button>
      ))}
    </div>
  </Modal>
);

const RecordViewer: React.FC<{ record: MedicalRecord; patient?: Patient; onClose: () => void; onEdit: () => void }> = ({ record, patient, onClose, onEdit }) => {
  const organized = useMemo(() => {
    if (!record.ai_organized_content) return null;
    try { return JSON.parse(record.ai_organized_content); } catch { return null; }
  }, [record]);

  const reviewPoints: string[] = organized?.pontos_revisao || [];
  const fields = ORGANIZED_FIELDS_LABELS.filter(f => organized?.[f.key]);

  const generateAtestadoPDF = () => {
    const prof = organized?.professional || {};
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210; const MARGIN = 20; const CW = W - MARGIN * 2;
    let y = 0;

    // ── Cabeçalho azul ─────────────────────────────────────────
    doc.setFillColor(26, 58, 92);
    doc.rect(0, 0, W, 42, 'F');

    // Nome da clínica/empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(230, 244, 254);
    doc.text(prof.companyName || prof.name || 'Clínica', MARGIN, 18);

    // Especialidade
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(144, 196, 232);
    doc.text(prof.specialty || 'Psicologia', MARGIN, 26);

    // Endereço e telefone no cabeçalho (direita)
    if (prof.address || prof.phone) {
      doc.setFontSize(7.5);
      doc.setTextColor(180, 210, 235);
      const infoLines: string[] = [];
      if (prof.address) infoLines.push(prof.address);
      if (prof.phone) infoLines.push(`Tel: ${prof.phone}`);
      doc.text(infoLines, W - MARGIN, 20, { align: 'right' });
    }

    // Linha separadora dourada
    doc.setDrawColor(144, 196, 232);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 36, W - MARGIN, 36);

    // CRP no cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 224, 244);
    if (prof.crp) doc.text(`CRP: ${prof.crp}`, MARGIN, 40);

    y = 56;

    // ── Título do documento ────────────────────────────────────
    const tipo = organized?.tipo || 'Comparecimento';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(26, 58, 92);
    doc.text(`ATESTADO DE ${tipo.toUpperCase()}`, W / 2, y, { align: 'center' });
    y += 4;

    // Linha decorativa abaixo do título
    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 45, y, W / 2 + 45, y);
    y += 10;

    // ── Caixa de dados do paciente ─────────────────────────────
    doc.setFillColor(240, 247, 255);
    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CW, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(26, 58, 92);
    doc.text('PACIENTE', MARGIN + 5, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 35, 60);
    doc.text(patient?.full_name || 'Não informado', MARGIN + 5, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 100, 130);
    const patInfoParts: string[] = [];
    if (patient?.cpf) patInfoParts.push(`CPF: ${patient.cpf}`);
    if (patient?.birth_date) patInfoParts.push(`Nascimento: ${new Date(patient.birth_date).toLocaleDateString('pt-BR')}`);
    if (patInfoParts.length > 0) doc.text(patInfoParts.join('   |   '), MARGIN + 5, y + 22);
    y += 34;

    // ── Corpo do atestado ──────────────────────────────────────
    // Texto principal
    const patName = patient?.full_name || 'o(a) paciente';
    const patCPF = patient?.cpf ? `, CPF ${patient.cpf},` : ',';
    const profName = prof.name || record.professional_name || 'o(a) profissional';

    const bodyText = `Atesto para os devidos fins que o(a) paciente ${patName}${patCPF} esteve sob meus cuidados psicológicos.`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 40, 60);
    const bodyLines = doc.splitTextToSize(bodyText, CW);
    doc.text(bodyLines, MARGIN, y);
    y += bodyLines.length * 5.5 + 6;

    // ── Campos específicos ─────────────────────────────────────
    const addField = (label: string, value: string) => {
      if (!value) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 58, 92);
      doc.text(`${label}:`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 40, 60);
      const lines = doc.splitTextToSize(value, CW - 35);
      doc.text(lines, MARGIN + 33, y);
      y += Math.max(lines.length * 5, 6) + 3;
    };

    const emissao = organized?.data_emissao ? new Date(organized.data_emissao).toLocaleDateString('pt-BR') : fmtDate(record.created_at);
    addField('TIPO', tipo);
    addField('DATA DE EMISSÃO', emissao);
    if (organized?.cid) addField('CID-10', organized.cid);
    if (organized?.finalidade) addField('FINALIDADE', organized.finalidade);
    if (tipo === 'Afastamento' || organized?.afastamento_inicio) {
      const inicio = organized?.afastamento_inicio ? new Date(organized.afastamento_inicio).toLocaleDateString('pt-BR') : '';
      const fim = organized?.afastamento_fim ? new Date(organized.afastamento_fim).toLocaleDateString('pt-BR') : '';
      if (inicio && fim) addField('PERÍODO DE AFASTAMENTO', `${inicio} a ${fim}`);
      if (organized?.dias_afastamento) addField('TOTAL DE DIAS', `${organized.dias_afastamento} dia(s)`);
    }
    if (organized?.observacoes) {
      y += 2;
      addField('OBSERVAÇÕES', organized.observacoes);
    }

    y += 8;

    // ── Rodapé com assinatura ──────────────────────────────────
    // Linha de separação
    doc.setDrawColor(200, 215, 230);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 10;

    // Local e data
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 100, 130);
    doc.text(`${dateStr}`, W / 2, y, { align: 'center' });
    y += 18;

    // Linha de assinatura
    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 40, y, W / 2 + 40, y);
    y += 5;

    // Nome e CRP do profissional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 58, 92);
    doc.text(profName, W / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 100, 130);
    if (prof.specialty) doc.text(prof.specialty, W / 2, y, { align: 'center' });
    y += 4.5;
    if (prof.crp) doc.text(`CRP: ${prof.crp}`, W / 2, y, { align: 'center' });

    // ── Rodapé da página ───────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 175, 195);
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}  |  PsiFlux`, W / 2, 289, { align: 'center' });

    const fileName = `Atestado_${tipo}_${(patient?.full_name || 'paciente').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={record.title}
      subtitle={`${patient?.full_name} — ${fmtDate(record.created_at)}`}
      maxWidth="3xl"
      footer={
        <div className="flex gap-3 w-full justify-between items-center">
           <div className="flex gap-2">
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{record.status}</span>
              {record.ai_status === 'organized' && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5"><Sparkles size={12}/> Organizado IA</span>}
           </div>
           <div className="flex gap-2">
              {record.record_type === 'Atestado' && (
                <Button variant="ghost" onClick={generateAtestadoPDF} className="uppercase text-xs font-black tracking-widest gap-2 text-blue-700 border border-blue-200 hover:bg-blue-50">
                  <Download size={14}/> PDF
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="uppercase text-xs font-black tracking-widest">Fechar</Button>
              <Button onClick={onEdit} variant="primary" className="uppercase text-xs font-black tracking-widest gap-2 min-w-[120px]">
                <Edit3 size={16}/> Editar
              </Button>
           </div>
        </div>
      }
    >
        <div className="space-y-6 pt-2">
          {/* Header Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Profissional</span>
                <span className="text-sm font-bold text-slate-700">{record.professional_name || '—'}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo</span>
                <span className="text-sm font-bold text-slate-700">{TYPE_LABELS[record.record_type] || record.record_type}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Modalidade</span>
                <span className="text-sm font-bold text-slate-700 capitalize">{record.appointment_type || '—'}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Horário</span>
                <span className="text-sm font-bold text-slate-700">{record.start_time ? `${record.start_time}${record.end_time ? ` – ${record.end_time}` : ''}` : '—'}</span>
             </div>
          </div>

          {/* Review points */}
          {reviewPoints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0"/>
              <div>
                <p className="font-black text-amber-800 text-xs uppercase tracking-wide mb-1">Pontos para revisão humana</p>
                <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-bold">• {p}</li>)}</ul>
              </div>
            </div>
          )}

          {/* Organized fields */}
          {organized && fields.length > 0 ? (
            <div className="space-y-5">
              {fields.map(f => (
                <div key={f.key} className="group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base leading-none group-hover:scale-110 transition-transform">{f.icon}</span>
                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{f.label}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-[20px] p-5">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{organized[f.key]}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conteúdo Original do Registro</p>
              <div className="text-sm text-slate-700 font-medium leading-relaxed text-editor-content" dangerouslySetInnerHTML={{ __html: record.content || record.draft_content || '<em>Sem conteúdo registrado</em>' }}/>
            </div>
          )}

          {/* Draft content if has organized */}
          {organized && record.draft_content && (
            <div className="pt-4 border-t border-slate-100">
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition list-none flex items-center gap-2 outline-none">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center group-open:bg-indigo-50 group-open:text-indigo-600 transition-colors">
                    <ChevronRight size={14} className="group-open:rotate-90 transition-transform"/> 
                  </div>
                  Exibir Rascunho Bruto (Histórico)
                </summary>
                <div className="mt-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-5">
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{strip(record.draft_content)}</p>
                </div>
              </details>
            </div>
          )}

          {/* Anexos */}
          {record.attachments && record.attachments.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers size={14} className="text-indigo-500"/> Anexos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {record.attachments.map((att: any, idx: number) => {
                  const isImage = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name || '');
                  const url = getStaticUrl(att.file_url || att.url);
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                      {isImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 group-hover:border-indigo-300 transition-colors">
                          <img src={url} alt={att.file_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                          <FileText size={18} className="text-indigo-500" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{att.file_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{att.file_size ? (att.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Tamanho desconhecido'}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Tag size={12} className="text-slate-400"/>
                <span className="text-[10px] font-black text-slate-400 uppercase">Tags:</span>
                <div className="flex gap-1">
                  {record.tags && record.tags.length > 0 ? record.tags.map((t, i) => <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{t}</span>) : <span className="text-[9px] text-slate-300 font-bold italic">Nenhuma</span>}
                </div>
              </div>
              <div className="flex-1" />
              <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest">ID: {String(record.id).split('-')[0]}...</div>
          </div>
        </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SHARE MODAL — compartilhar prontuário com outro profissional
═══════════════════════════════════════════════════════════════ */
const ShareModal: React.FC<{
  recordId: string;
  recordTitle: string;
  currentShared?: string[];
  professionals: { id: string; name: string; email?: string }[];
  onClose: () => void;
  onShared: () => void;
}> = ({ recordId, recordTitle, currentShared = [], professionals, onClose, onShared }) => {
  const { pushToast } = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState<string[]>(currentShared);

  const share = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.post(`/medical-records/${recordId}/share`, { user_id: selectedId });
      setShared(prev => [...prev, selectedId]);
      setSelectedId('');
      pushToast('success', 'Acesso compartilhado com sucesso!');
      onShared();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao compartilhar acesso');
    } finally { setSaving(false); }
  };

  const revoke = async (uid: string) => {
    try {
      await api.delete(`/medical-records/${recordId}/share/${uid}`);
      setShared(prev => prev.filter(id => id !== uid));
      pushToast('success', 'Acesso removido com sucesso.');
      onShared();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao remover acesso');
    }
  };

  const availableProfessionals = professionals.filter(p => !shared.includes(String(p.id)));
  const sharedProfessionals = professionals.filter(p => shared.includes(String(p.id)));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Compartilhar Acesso"
      subtitle={recordTitle}
      maxWidth="md"
      footer={<Button variant="ghost" onClick={onClose} className="w-full uppercase text-xs font-black tracking-widest">Concluir</Button>}
    >
      <div className="space-y-6 pt-2">
        {/* Com Acesso */}
        {sharedProfessionals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Profissionais com Acesso</h4>
            <div className="grid gap-2">
              {sharedProfessionals.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 group transition-all hover:bg-indigo-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 text-sm truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">{p.email || '—'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => revoke(String(p.id))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm"
                    title="Remover acesso"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Conceder Novo Acesso</h4>
          {availableProfessionals.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-400 font-medium">Todos os profissionais já possuem acesso a este registro.</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className="flex-1 h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white transition-all shadow-inner"
                value={selectedId} onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Selecione um profissional...</option>
                {availableProfessionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              <Button 
                onClick={share} 
                disabled={!selectedId || saving} 
                isLoading={saving}
                variant="primary" 
                className="h-12 px-6 gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus size={18}/> Conceder
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
           <Shield size={16} className="text-amber-500 shrink-0 mt-0.5"/>
           <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
             O compartilhamento permite que outros profissionais visualizem e editem este registro. O proprietário original mantém o controle da auditoria.
           </p>
        </div>
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RECORD EDITOR (modal completo: rascunho → IA → revisão → aprovação)
   Suporta os modos exigidos pelo CFP
═══════════════════════════════════════════════════════════════ */
/* ─────────────────────────────────────────────────────────────
   LINKED TOOLS SECTION (Para Avaliação do Caso)
 ───────────────────────────────────────────────────────────── */
const LinkedToolsSection: React.FC<{ 
  patientId: string; 
  onSelectSource?: (item: any) => void;
  variant?: 'full' | 'sidebar';
}> = ({ patientId, onSelectSource, variant = 'full' }) => {
  const { pushToast } = useToast();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [comparing, setComparing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [approach, setApproach] = useState('TCC (Terapia Cognitivo-Comportamental)');

  useEffect(() => {
    if (!patientId) { setTools([]); setLoading(false); return; }
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Buscar TODAS as fontes de dados do paciente em paralelo
        const [anamnesis, clinical, formResponses, discAssessments] = await Promise.all([
          api.get<any[]>(`/anamnesis-send?patient_id=${patientId}`).catch(() => []),
          api.get<any[]>(`/clinical-tools/patient/${patientId}`).catch(() => []),
          api.get<any[]>(`/forms/responses?patient_id=${patientId}`).catch(() => []),
          api.get<any[]>(`/disc?patient_id=${patientId}`).catch(() => []),
        ]);

        const unified: any[] = [
          // 1. Anamneses respondidas
          ...(anamnesis || [])
            .filter(s => s.status === 'answered')
            .map(s => ({
            id: `anam-${s.id}`,
            rawId: s.id,
            name: s.title || 'Anamnese Clínica',
            category: 'Anamnese',
            date: s.completed_at || s.created_at,
            professional: s.professional_name || 'Psicólogo(a)',
            status: 'Respondido',
            origin: 'Paciente (Remoto)',
            type: 'anamnese',
            isRelevant: false,
            responses: s.responses
          })),

          // 2. Ferramentas clínicas (TCC, Esquema, Psicanálise, FAP, ACT, Mindfulness, etc.)
          ...(clinical || [])
            .filter(c => {
               if (!c.data) return false;
               if (Array.isArray(c.data)) return c.data.length > 0;
               if (typeof c.data === 'object') return Object.keys(c.data).length > 0;
               return true;
            })
            .map(c => {
            const config = TOOL_DISPLAY_NAMES[c.tool_type] || { label: c.tool_type, category: 'Caixa de Ferramentas' };
            return {
              id: `tool-${c.id}`,
              rawId: c.id,
              name: config.label,
              category: config.category,
              date: c.updated_at || c.created_at,
              professional: c.professional_name || 'Psicólogo(a)',
              status: 'Completo',
              origin: 'Profissional/Sistema',
              type: c.tool_type,
              isRelevant: false,
              data: c.data
            };
          }),

          // 3. Formulários respondidos (PHQ-9, GAD-7, Beck, etc.)
          ...(formResponses || [])
            .filter(fr => fr.data)
            .map(fr => ({
            id: `form-${fr.id}`,
            rawId: fr.id,
            name: fr.form_title || 'Formulário Clínico',
            category: fr.form_category || 'Formulário',
            date: fr.created_at,
            professional: fr.respondent_name || 'Paciente',
            status: 'Respondido',
            origin: 'Formulário Público',
            type: 'form_response',
            isRelevant: false,
            data: fr.data,
            score: fr.score
          })),

          // 4. Avaliações DISC
          ...(discAssessments || [])
            .map(disc => ({
            id: `disc-${disc.id}`,
            rawId: disc.id,
            name: 'DISC — Perfil Comportamental',
            category: 'Avaliação DISC',
            date: disc.created_at,
            professional: disc.respondent_name || disc.patient_name || 'Avaliado',
            status: 'Completo',
            origin: 'Formulário Público',
            type: 'disc',
            isRelevant: false,
            data: {
              scores: { D: disc.score_d, I: disc.score_i, S: disc.score_s, C: disc.score_c },
              answers: disc.answers
            },
            score: disc.score_total,
            auroraAnalysis: disc.aurora_analysis
          })),
        ];

        setTools(unified.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (e) {
        console.error('Erro ao buscar fontes vinculadas:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [patientId]);

  const filtered = tools.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(filter.toLowerCase());
    const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(tools.map(t => t.category)));

  const handleSelectSource = (item: any) => {
    if (!onSelectSource) return;
    
    let content = `### FONTE: ${item.name.toUpperCase()} (${fmtDate(item.date)})\n`;
    
    if (item.type === 'anamnese') {
      content += `[Informações desta anamnese integrada ao caso. Paciente relatou histórico e contexto relevante.]\n`;
    } else if (item.type === 'form_response') {
      // Formulários respondidos (PHQ-9, GAD-7, etc.)
      if (item.score != null) content += `Pontuação Total: ${item.score}\n`;
      if (item.data?.answers) {
        content += `Respostas do formulário registradas e disponíveis para análise.\n`;
      }
    } else if (item.type === 'disc') {
      // Avaliação DISC
      const s = item.data?.scores || {};
      content += `Perfil DISC: D(${s.D || 0}), I(${s.I || 0}), S(${s.S || 0}), C(${s.C || 0})\n`;
      if (item.auroraAnalysis) content += `Análise Aurora IA já disponível.\n`;
    } else if (item.data) {
       if (item.type === 'dass-21') {
         if (Array.isArray(item.data)) {
           const last = item.data[item.data.length - 1];
           const s = last?.scores || last?.score || {};
           content += `Última Pontuação: Depressão(${s.depression || 0}), Ansiedade(${s.anxiety || 0}), Estresse(${s.stress || 0})\n`;
           if (item.data.length > 1) content += `Nota: Existem ${item.data.length} aplicações disponíveis para comparação longitudinal.\n`;
         } else {
           const s = item.data.scores || item.data.score || {};
           content += `Pontuação: Depressão(${s.depression || 0}), Ansiedade(${s.anxiety || 0}), Estresse(${s.stress || 0})\n`;
         }
       } else if (item.type.includes('beck')) {
          const score = item.data.score || item.data.total_score || '—';
          content += `Resultado: Pontuação de ${score}.\n`;
       } else {
          // Ferramentas genéricas da Caixa de Ferramentas
          const dataStr = JSON.stringify(item.data);
          if (dataStr.length < 500) content += `Dados: ${dataStr}\n`;
          else content += `Dados disponíveis para análise (${Object.keys(item.data).length} campos).\n`;
       }
    }
    
    content += `[Análise Clínica: Descreva aqui como este instrumento apoia sua formulação clínica do caso...]`;
    onSelectSource({ ...item, summary: content });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGenerateSynthesis = async () => {
    if (selectedIds.length === 0) { pushToast('error', 'Selecione pelo menos uma fonte.'); return; }
    setSynthesisLoading(true);
    try {
      const selectedTools = tools.filter(t => selectedIds.includes(t.id));
      
      // Monta o prompt de contexto com os DADOS REAIS das fontes
      let contextStr = `Crie uma FORMULAÇÃO DE CASO detalhada baseada na abordagem ${approach.toUpperCase()}.\n\n`;
      contextStr += `FONTES SELECIONADAS:\n`;
      selectedTools.forEach(t => {
        contextStr += `\n--- FONTE: ${t.name} (${fmtDate(t.date)}) ---\n`;

        if (t.type === 'anamnese') {
          contextStr += `Tipo: Anamnese Clínica\n`;
          if (t.responses) {
            try {
              const parsedResp = typeof t.responses === 'string' ? JSON.parse(t.responses) : t.responses;
              Object.entries(parsedResp).forEach(([key, value]: [string, any]) => {
                const label = ANAMNESIS_FIELD_LABELS[key] || key;
                if (value && String(value).trim()) {
                  contextStr += `  ${label}: ${String(value)}\n`;
                }
              });
            } catch {
              contextStr += `  Dados da anamnese: ${String(t.responses).substring(0, 3000)}\n`;
            }
          } else {
            contextStr += `  (Dados da anamnese não disponíveis)\n`;
          }

        } else if (t.type === 'form_response') {
          // Formulários respondidos (PHQ-9, GAD-7, Beck, etc.)
          contextStr += `Tipo: Formulário Clínico\n`;
          if (t.score != null) contextStr += `  Pontuação Total: ${t.score}\n`;
          if (t.data?.answers) {
            const answers = t.data.answers;
            Object.entries(answers).forEach(([qId, answer]: [string, any]) => {
              if (answer && String(answer).trim()) {
                contextStr += `  ${qId}: ${String(answer)}\n`;
              }
            });
          } else if (t.data) {
            contextStr += `  Dados: ${JSON.stringify(t.data).substring(0, 2000)}\n`;
          }

        } else if (t.type === 'disc') {
          // Avaliação DISC
          contextStr += `Tipo: Avaliação de Perfil Comportamental DISC\n`;
          const s = t.data?.scores || {};
          contextStr += `  Dominância (D): ${s.D || 0}\n`;
          contextStr += `  Influência (I): ${s.I || 0}\n`;
          contextStr += `  Estabilidade (S): ${s.S || 0}\n`;
          contextStr += `  Conformidade (C): ${s.C || 0}\n`;
          if (t.auroraAnalysis) {
            contextStr += `  Análise Aurora IA anterior: ${String(t.auroraAnalysis).substring(0, 2000)}\n`;
          }

        } else {
          // Ferramentas clínicas genéricas (TCC, Esquema, FAP, ACT, etc.)
          if (Array.isArray(t.data)) {
            const latest = t.data[t.data.length - 1];
            const scores = latest?.scores || latest?.score || {};
            contextStr += `Resultados mais recentes: ${JSON.stringify(scores)}\n`;
            if (t.data.length > 1) {
              contextStr += `Nota: Existem ${t.data.length} aplicações para análise longitudinal.\n`;
              t.data.forEach((entry: any, i: number) => {
                const entryScores = entry?.scores || entry?.score || {};
                contextStr += `  Aplicação ${i + 1} (${fmtDate(entry.date || '')}): ${JSON.stringify(entryScores)}\n`;
              });
            }
          } else if (t.data) {
            const scores = t.data.scores || t.data.score || t.data;
            contextStr += `Resultados: ${JSON.stringify(scores)}\n`;
          }
        }
      });

      // Aqui chamamos o backend para gerar a síntese
      const resp = await api.post<any>('/medical-records/generate-synthesis', {
        patient_id: patientId,
        approach,
        sources: selectedTools.map(t => ({ type: t.type, id: t.rawId, name: t.name })),
        context: contextStr
      });

      // Verifica se o conteúdo retornado é válido
      const content = resp.content;
      if (!content || content === 'Erro ao gerar síntese.' || content.startsWith('Erro')) {
        pushToast('error', 'A IA não conseguiu gerar a síntese. Tente novamente.');
        return;
      }

      onSelectSource({ 
        name: 'Síntese Clínica Aurora IA', 
        summary: `\n## SÍNTESE CLÍNICA INTEGRADA (IA)\n**Abordagem:** ${approach}\n\n${content}\n\n[Nota: Esta análise foi gerada automaticamente pela Aurora IA integrando ${selectedIds.length} fontes de dados. Revise antes de aprovar.]`
      });
      
      pushToast('success', 'Síntese gerada com sucesso!');
      setShowSynthesisModal(false);
      setSelectedIds([]);
    } catch (e: any) {
      console.error('Erro ao gerar síntese:', e);
      pushToast('error', e?.response?.data?.error || 'Erro ao gerar síntese. Verifique a conexão com o serviço de IA.');
    } finally {
      setSynthesisLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-200 gap-3">
      <Loader2 size={24} className="text-indigo-500 animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando fonte histórico...</p>
    </div>
  );

  const isSidebar = variant === 'sidebar';

  return (
    <div className={`bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden flex flex-col ${isSidebar ? 'h-full max-h-[1000px]' : 'space-y-6 p-8'}`}>
      <div className={`flex flex-col gap-4 ${isSidebar ? 'p-5 bg-slate-50/50 border-b border-slate-100' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
            <ClipboardCheck size={20} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-800 text-sm tracking-tight truncate">Fontes Pin-Clínico</h3>
            <p className="text-[10px] text-slate-500 font-medium truncate">Documentos vinculados ao caso.</p>
          </div>
        </div>
        
        <div className={`flex gap-2 ${isSidebar ? 'flex-col' : ''}`}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Instrumento..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none focus:border-indigo-300 transition-all shadow-sm"
            />
          </div>
          {!isSidebar && (
            <select 
              className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none focus:border-indigo-300 transition-all shadow-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className={`${isSidebar ? 'flex-1 overflow-y-auto p-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            <Info size={20} className="text-slate-300 mx-auto mb-2" />
            <p className="text-[11px] text-slate-400 font-medium italic">Sem registros vinculados.</p>
          </div>
        ) : (
          filtered.map(item => {
            const isTool = item.type !== 'anamnese';
            const hasHistory = isTool && Array.isArray(item.data) && item.data.length > 1;

            return (
              <div key={item.id} className={`group flex flex-col p-4 rounded-2xl border transition-all duration-300 relative ${isSidebar ? 'mb-3 bg-white hover:bg-slate-50 border-slate-100 hover:border-indigo-200' : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.category === 'Anamnese' ? 'bg-indigo-50 text-indigo-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {item.category === 'Anamnese' ? <ClipboardCheck size={16}/> : <Activity size={16}/>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 truncate">{item.category}</p>
                      <h4 className="font-black text-slate-700 leading-tight text-[11px] truncate">{item.name}</h4>
                    </div>
                  </div>
                  {hasHistory && (
                     <div className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm">
                        <History size={10} /> +{item.data.length}
                     </div>
                  )}
                </div>

                <div className="space-y-1.5 mb-4 text-[10px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={11} className="text-slate-300 shrink-0"/>
                    {fmtDate(item.date)}
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <User size={11} className="text-slate-300 shrink-0"/>
                    <span className="truncate">{item.professional}</span>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-2 border-t border-slate-50">
                  {isSidebar && (
                    <button 
                      onClick={() => toggleSelect(item.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border shadow-sm ${
                        selectedIds.includes(item.id) 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200'
                      }`}
                      title={selectedIds.includes(item.id) ? 'Remover da seleção' : 'Selecionar para síntese IA'}
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleSelectSource(item)}
                    className="flex-1 h-8 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-100"
                  >
                    Usar Fonte
                  </button>
                  {hasHistory && (
                    <button 
                      onClick={() => setComparing(item.id)}
                      className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                      title="Análise Longitudinal"
                    >
                      <BarChart2 size={14} />
                    </button>
                  )}
                  <button 
                    className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    title="Ver Detalhes"
                    onClick={() => setViewing(item)}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`p-4 bg-indigo-50/50 rounded-b-lg border-t border-indigo-100 flex flex-col gap-3 mt-auto ${isSidebar ? '' : 'rounded-2xl'}`}>
        <div className="flex items-start gap-3">
          <Sparkles size={16} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
            <strong>Assistente Aurora:</strong> {selectedIds.length > 0 ? `Você selecionou ${selectedIds.length} fontes para análise.` : 'Selecione fontes para gerar uma síntese clínica.'}
          </p>
        </div>
        
        {isSidebar && (
          <Button 
             variant="primary" 
             className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[9px] gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
             disabled={selectedIds.length === 0}
             onClick={() => setShowSynthesisModal(true)}
          >
             <Brain size={14} /> Gerar Análise de Caso (IA)
          </Button>
        )}
      </div>

      {/* Modal de Parâmetros de Síntese IA */}
      {showSynthesisModal && (
        <Modal isOpen={true} onClose={() => setShowSynthesisModal(false)} title="Síntese Clínica com IA" subtitle="Formulação de Caso Baseada em Evidências" maxWidth="lg">
           <div className="space-y-6">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-start gap-3">
                 <Brain size={24} className="text-indigo-600 shrink-0" />
                 <div>
                    <h4 className="font-black text-indigo-900 text-xs uppercase tracking-widest mb-1">Análise Multidimensional</h4>
                    <p className="text-[11px] text-indigo-700 font-medium">Aurora irá cruzar os dados das {selectedIds.length} fontes selecionadas para criar uma síntese clínica estruturada.</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecione sua Abordagem Terapêutica</label>
                 <select 
                   className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-indigo-300 transition-all shadow-sm"
                   value={approach}
                   onChange={e => setApproach(e.target.value)}
                 >
                    {[
                      'TCC (Terapia Cognitivo-Comportamental)',
                      'Psicanálise / Psicodinâmica',
                      'Humanismo / Fenomenologia-Existencial',
                      'Gestalt-Terapia',
                      'Análise do Comportamento (Behaviorismo)',
                      'Terapia do Esquema',
                      'ACT (Aceitação e Compromisso)',
                      'DBT (Dialética Comportamental)',
                      'Terapia Sistêmica / Familiar',
                      'Logoterapia'
                    ].map(a => <option key={a} value={a}>{a}</option>)}
                 </select>
                 <p className="text-[10px] text-slate-400 italic px-1">A IA utilizará terminologia e conceitos específicos desta abordagem.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                 <button 
                   type="button"
                   onClick={() => setShowSynthesisModal(false)} 
                   className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                 >
                    Cancelar
                 </button>
                 <Button 
                   onClick={handleGenerateSynthesis} 
                   isLoading={synthesisLoading} 
                   variant="primary" 
                   className="h-11 w-72 bg-indigo-600 hover:bg-indigo-700 text-white uppercase text-[10px] font-black tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                 >
                    <Brain size={14} /> Iniciar Processamento IA
                 </Button>
              </div>
           </div>
        </Modal>
      )}

      {/* Modal de Comparação Longitudinal Simples */}
      {comparing && (
        <Modal isOpen={true} onClose={() => setComparing(null)} title="Análise Longitudinal" subtitle={tools.find(t => t.id === comparing)?.name} maxWidth="lg">
           <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="text-xs text-slate-500 font-medium">Comparando aplicações históricas do instrumento para análise de evolução clínica.</p>
              </div>
              <div className="grid gap-3">
                 {tools.find(t => t.id === comparing)?.data?.slice().reverse().map((entry: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fmtDate(entry.date)}</p>
                        <p className="text-xs font-bold text-slate-700">Resultado: {JSON.stringify(entry.scores || entry.score || entry.answers || {})}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                           {i === 0 ? 'Mais Recente' : 'Anterior'}
                         </span>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 border-dashed">
                 <p className="text-[11px] text-amber-700 font-medium text-center">Visualização gráfica em desenvolvimento. Utilize a comparação de escores brutos para avaliação clínica.</p>
              </div>
           </div>
        </Modal>
      )}

      {/* Modal de Detalhes da Fonte */}
      {viewing && (
        <Modal isOpen={true} onClose={() => setViewing(null)} title="Detalhes da Fonte" subtitle={viewing.name} maxWidth="lg">
           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Coleta</span>
                    <span className="text-xs font-bold text-slate-700">{fmtDate(viewing.date)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</span>
                    <span className="text-xs font-bold text-emerald-600">{viewing.origin}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-indigo-500"/> Conteúdo do Registro
                 </h4>
                 
                 {viewing.type === 'anamnese' ? (
                   <div className="space-y-3">
                     {(() => {
                        try {
                           const res = JSON.parse(viewing.responses || '{}');
                           return Object.entries(res).map(([k, v]: [string, any]) => (
                             <div key={k} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                               <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{ANAMNESIS_FIELD_LABELS[k] || k}</p>
                               <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{String(v)}</p>
                             </div>
                           ));
                        } catch {
                           return <p className="text-xs text-slate-400 italic">Erro ao carregar respostas.</p>;
                        }
                     })()}
                   </div>
                 ) : (
                   <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                      <pre className="text-xs text-slate-700 font-mono leading-relaxed">
                        {JSON.stringify(viewing.data, null, 2)}
                      </pre>
                   </div>
                 )}
              </div>
           </div>
           <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewing(null)} variant="primary" className="h-10 px-6 uppercase text-[10px] font-black">Fechar</Button>
           </div>
        </Modal>
      )}
    </div>
  );
};

const RecordEditor: React.FC<{
  record: Partial<MedicalRecord> | null; mode: 'new' | 'edit';
  patients: Patient[]; selectedPatientId: string | null;
  onSave: () => void; onClose: () => void;
  onExport: () => void;
  anamnesisSends: any[];
}> = ({ record, mode, patients, selectedPatientId, onSave, onClose, onExport, anamnesisSends }) => {
  const { pushToast } = useToast();
  const [step, setStep] = useState<'draft' | 'ai_result' | 'approve'>(
    record?.ai_organized_content ? 'ai_result' : 'draft'
  );
  const [patientId, setPatientId] = useState(record?.patient_id || selectedPatientId || '');
  const [title, setTitle] = useState(record?.title || `Evolução — ${new Date().toLocaleDateString('pt-BR')}`);
  const [recordType, setRecordType] = useState(record?.record_type || 'Evolucao');
  const typeLocked = mode === 'new' && !!record?.record_type;
  const [appointmentType, setAppointmentType] = useState(record?.appointment_type || 'individual');
  const [sessionDate, setSessionDate] = useState(record?.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(record?.start_time || (mode === 'new' ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''));
  const [endTime, setEndTime] = useState(record?.end_time || '');
  const [status, setStatus] = useState(record?.status || 'Rascunho');
  const [tags, setTags] = useState((record?.tags || []).join(', '));
  const [attachments, setAttachments] = useState<any[]>(record?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(strip(record?.draft_content || ''));
  const [privateNotes, setPrivateNotes] = useState(strip(record?.restricted_content || ''));
  const [organized, setOrganized] = useState<any>(null);
  const [reviewPoints, setReviewPoints] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plano Terapêutico — estado isolado quando recordType === 'Plano'
  const [theraPlan, setTheraPlan] = useState<TheraPlan>(() => {
    if (record?.ai_organized_content) {
      try { return JSON.parse(record.ai_organized_content) as TheraPlan; } catch {}
    }
    return { ...EMPTY_PLAN };
  });
  const handleTheraPlanChange = useCallback((updater: TheraPlan | ((p: TheraPlan) => TheraPlan)) => {
    setTheraPlan((prev: TheraPlan) => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const [showApproveModal, setShowApproveModal] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (patientId) fd.append('patient_id', patientId);
      
      const data = await api.post<any>('/uploads', fd);
      
      setAttachments(prev => [...prev, {
        file_name: data.file_name,
        file_url: data.file_url,
        file_type: file.type,
        file_size: file.size
      }]);
      pushToast('success', 'Arquivo anexado com sucesso!');
    } catch (err: any) {
      pushToast('error', err?.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Restaura organized se existir
  useEffect(() => {
    if (record?.ai_organized_content) {
      try { setOrganized(JSON.parse(record.ai_organized_content)); } catch {}
    }
  }, [record]);

  const organizeWithAI = async () => {
    if (!draft.trim()) { pushToast('error', 'Escreva o rascunho antes de organizar.'); return; }
    setAiLoading(true);
    try {
      const patient = patients.find(p => p.id === patientId);
      const url = record?.id ? `/medical-records/${record.id}/organize-ai` : '/medical-records/organize-ai';
      const resp = await api.post<any>(url, {
        draft_content: draft,
        patient_id: patientId,
        patient_name: patient?.full_name,
        created_at: sessionDate
      });
      setOrganized(resp.organized);
      setReviewPoints(resp.review_points || resp.organized?.pontos_revisao || []);
      setStep('ai_result');
      pushToast('success', 'Evolução organizada pela Aurora IA!');
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao organizar com IA');
    } finally { setAiLoading(false); }
  };

  const save = async (newStatus?: string) => {
    if (!patientId) { pushToast('error', 'Selecione o paciente.'); return; }
    setSaving(true);
    try {
      const body = {
        patient_id: patientId,
        title,
        record_type: recordType,
        appointment_type: appointmentType,
        created_at: sessionDate,
        start_time: startTime,
        end_time: endTime,
        status: newStatus || status,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        draft_content: recordType === 'Plano' ? (theraPlan.summary || '') : draft,
        restricted_content: privateNotes,
        ai_organized_content: recordType === 'Plano' ? JSON.stringify(theraPlan) : (organized ? JSON.stringify(organized) : null),
        content: recordType === 'Plano' ? `Plano Terapêutico — ${theraPlan.approach} | ${theraPlan.summary || ''}` : (organized ? Object.values(organized).join('\n\n') : draft),
        attachments
      };

      if (record?.id) { await api.put(`/medical-records/${record.id}`, body); }
      else { await api.post('/medical-records', body); }

      pushToast('success', 'Registro salvo com sucesso!');
      onSave(); onClose();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao salvar registro');
    } finally { setSaving(false); }
  };

  const approve = async (pw: string) => {
    if (!record?.id) { await save('Aprovado'); return; }
    await api.post(`/medical-records/${record.id}/approve`, { password: pw });
    pushToast('success', 'Registro aprovado!');
    onSave(); onClose();
  };

  const ORGANIZED_FIELDS = [
    { key: 'motivo_consulta', label: 'Motivo da Consulta / Tema Central' },
    { key: 'contexto_relevante', label: 'Contexto Relevante' },
    { key: 'observacoes_clinicas', label: 'Observações Clínicas' },
    { key: 'intervencoes_realizadas', label: 'Intervenções Realizadas' },
    { key: 'evolucao_resposta', label: 'Evolução / Resposta da Paciente' },
    { key: 'plano_terapeutico', label: 'Plano Terapêutico / Próximos Passos' },
    { key: 'encaminhamentos', label: 'Encaminhamentos' },
    { key: 'observacao_complementar', label: 'Observação Complementar' },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={recordType === 'Plano' ? (mode === 'new' ? 'Plano Terapêutico' : 'Editar Plano') : (mode === 'new' ? 'Nova Evolução Clínica' : 'Editar Registro')}
      subtitle={title}
      maxWidth={recordType === 'Plano' ? '5xl' : 'full'}
      footer={recordType === 'Plano' ? (
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest px-3 h-9">Cancelar</Button>
          <Button onClick={() => save()} isLoading={saving} variant="primary" className="h-9 sm:h-10 px-5 gap-1.5 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
            <Save size={14}/> Salvar Plano
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
           {/* Step indicator */}
           <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2.5 py-1 bg-indigo-50 rounded-lg border border-indigo-100 whitespace-nowrap">
                {step === 'draft' ? 'Rascunho' : 'Revisão IA'}
              </span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                {(['draft', 'ai_result'] as const).map((s, i) => (
                  <button key={s} onClick={() => setStep(s)} disabled={s === 'ai_result' && !organized}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${step === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
                    {i + 1}. {s === 'draft' ? 'Rascunho' : 'Rev. IA'}
                  </button>
                ))}
              </div>
           </div>
           {/* Actions */}
           <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} className="uppercase text-[10px] font-black tracking-widest px-3 h-9">Cancelar</Button>
              <Button onClick={() => save()} isLoading={saving} variant="primary" className="flex-1 sm:flex-none h-9 sm:h-10 px-4 gap-1.5 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-indigo-200">
                <Save size={14}/> <span className="hidden xs:inline">Salvar</span> Rascunho
              </Button>
              <Button onClick={() => setShowApproveModal(true)} variant="primary" className="flex-1 sm:flex-none h-9 sm:h-10 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 gap-1.5 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-emerald-200 whitespace-nowrap">
                <CheckCircle2 size={14}/> <span className="hidden sm:inline">Aprovar</span><span className="sm:hidden">OK</span>
              </Button>
           </div>
        </div>
      )}
    >
        <div className="space-y-6 max-w-[1440px] mx-auto py-2 pb-12">
          {/* Metadados — compacto para Plano, completo para outros */}
          {recordType === 'Plano' ? (
            <div className="bg-white rounded-[20px] border border-slate-100 px-5 py-4 shadow-sm flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">🗺️</div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plano Terapêutico</p>
                  <p className="text-xs font-black text-emerald-700">{patients.find(p => String(p.id) === String(patientId))?.full_name || '—'}</p>
                </div>
              </div>
              <div className="space-y-1 flex-1 min-w-[160px]">
                <label className="text-[9px] font-black text-slate-400 uppercase">Título</label>
                <input className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-emerald-300" value={title} onChange={e => setTitle(e.target.value)}/>
              </div>
              <div className="space-y-1 w-36">
                <label className="text-[9px] font-black text-slate-400 uppercase">Data</label>
                <input type="date" className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={sessionDate} onChange={e => setSessionDate(e.target.value)}/>
              </div>
              {!typeLocked && (
                <div className="space-y-1 w-44">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Paciente</label>
                  <select className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none disabled:opacity-60" value={patientId} onChange={e => setPatientId(e.target.value)} disabled={mode === 'edit'}>
                    <option value="">Selecione...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} className="text-indigo-500" /> Identificação e Metadados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Paciente</label>
                  <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300 disabled:opacity-60" value={patientId} onChange={e => setPatientId(e.target.value)} disabled={mode === 'edit'}>
                    <option value="">Selecione...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Data</label>
                  <input type="date" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none disabled:opacity-60" value={sessionDate} onChange={e => setSessionDate(e.target.value)} disabled={mode === 'edit'}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Título</label>
                  <input className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300" value={title} onChange={e => setTitle(e.target.value)}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Tipo de Registro</label>
                  {typeLocked ? (
                    <div className="w-full h-11 px-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm font-black text-indigo-700 flex items-center gap-2">
                      <span>{TYPE_DEFINITIONS.find(t => t.key === recordType)?.icon}</span>
                      {TYPE_LABELS[recordType] || recordType}
                    </div>
                  ) : (
                    <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none disabled:opacity-60" value={recordType} onChange={e => setRecordType(e.target.value)} disabled={mode === 'edit'}>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Modalidade</label>
                  <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={appointmentType} onChange={e => setAppointmentType(e.target.value)}>
                    {['individual','casal','familiar','grupo','online','presencial'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Início</label>
                  <input type="time" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none disabled:opacity-60" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={mode === 'edit'}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Fim</label>
                  <input type="time" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={endTime} onChange={e => setEndTime(e.target.value)}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Tags (vírgula)</label>
                  <input className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" placeholder="ansiedade, fobia..." value={tags} onChange={e => setTags(e.target.value)}/>
                </div>
              </div>
            </div>
          )}

          <div className={recordType === 'Avaliacao' ? 'flex flex-col lg:flex-row gap-6' : recordType === 'Plano' ? 'w-full min-w-0' : 'max-w-5xl mx-auto'}>
             {/* COLUNA ESQUERDA - FONTES (Apenas para Avaliação) */}
             {recordType === 'Avaliacao' && patientId && (
               <div className="lg:w-80 xl:w-96 shrink-0 animate-slideRightFade">
                 <LinkedToolsSection 
                    patientId={patientId} 
                    variant="sidebar"
                    onSelectSource={(item: any) => {
                      setDraft((prev) => prev + '<br><br>' + mdToHtml(item.summary));
                      pushToast('info', `${item.name} integrado.`);
                    }}
                 />
               </div>
             )}

             {/* COLUNA CENTRAL - EDITOR */}
             <div className="flex-1 space-y-6">
                {/* STEP 1 — Rascunho */}
                {step === 'draft' && recordType === 'Plano' && (
                  <TherapeuticPlanEditor
                    plan={theraPlan}
                    onChange={handleTheraPlanChange}
                    patientId={patientId}
                    recordId={record?.id ? String(record.id) : undefined}
                  />
                )}
                {step === 'draft' && recordType !== 'Plano' && (
                  <div className="space-y-4 animate-fadeIn">
                    {recordType === 'Anamnese' ? (
                      <div className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-sm space-y-6 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 mb-2">
                          <ClipboardCheck size={32} className="text-indigo-600" />
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                          <h3 className="font-black text-slate-800 text-lg uppercase tracking-widest">Coleta de Dados (Remota)</h3>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Para este tipo de registro, o histórico é coletado diretamente com o paciente através de um formulário seguro e sigiloso.
                          </p>
                        </div>
                        {record?.id && (
                          <div className="pt-6 animate-slideUpFade">
                             <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3">Status do Envio Atual</p>
                             {(() => {
                               const currentSend = anamnesisSends.find(s => String(s.medical_record_id) === String(record.id));
                               if (!currentSend) return <p className="text-xs text-slate-400 font-bold italic">Nenhum formulário vinculado.</p>;
                               return (
                                 <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                                   <span className={`w-2 h-2 rounded-full animate-pulse ${currentSend.status === 'answered' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                   {currentSend.status}
                                 </div>
                               );
                             })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-indigo-500" /> Rascunho Bruto da Sessão
                          </h3>
                        </div>
                        <RichTextEditor
                          value={draft}
                          onChange={setDraft}
                          placeholder="Escreva tudo o que aconteceu na sessão..."
                          minHeight={recordType === 'Avaliacao' ? "550px" : "400px"}
                        />
                        <Button onClick={organizeWithAI} isLoading={aiLoading} disabled={!draft.trim()} variant="primary"
                          className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3">
                          {aiLoading ? 'Organizando conteúdo...' : 'Organizar com Inteligência Artificial'}
                        </Button>
                      </div>
                    )}

                    {/* Campo Restrito */}
                    {recordType !== 'Anamnese' && (
                      <div className="bg-rose-50/50 rounded-[24px] border border-rose-100 p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                          <Shield size={18} className="text-rose-500"/>
                          <h3 className="font-black text-rose-700 text-xs uppercase tracking-widest">Observações Privadas (Campo Restrito)</h3>
                        </div>
                        <textarea className="w-full p-4 rounded-2xl bg-white border border-rose-100 text-sm leading-relaxed resize-none outline-none focus:border-rose-300 transition font-medium min-h-[120px]"
                          placeholder="Hipóteses clínicas..."
                          value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2 — Revisão IA */}
                {step === 'ai_result' && organized && (
                  <div className="space-y-4 animate-slideUpFade">
                    {reviewPoints.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0"/>
                        <div>
                          <p className="font-black text-amber-800 text-xs uppercase tracking-wide mb-1">Pontos para revisão humana</p>
                          <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-bold">• {p}</li>)}</ul>
                        </div>
                      </div>
                    )}
                    <div className="grid gap-4 pb-20">
                      {ORGANIZED_FIELDS.map(f => (
                        <div key={f.key} className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm space-y-2">
                          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">{f.label}</label>
                          <textarea
                            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium resize-none outline-none focus:bg-white focus:border-indigo-300 transition min-h-[100px] leading-relaxed text-slate-700"
                            value={organized[f.key] || ''}
                            onChange={e => setOrganized({ ...organized, [f.key]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Anexos (Evolução) */}
          {recordType === 'Evolucao' && (
            <div className="bg-slate-50/50 rounded-[24px] border border-slate-200 p-6 shadow-sm max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-indigo-500"/>
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Anexos da Evolução</h3>
                </div>
                <Button variant="ghost" className="text-xs uppercase tracking-widest bg-white border border-slate-200 hover:border-indigo-300 shadow-sm" onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
                  <Plus size={14} /> Anexar Arquivo
                </Button>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </div>
              
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {attachments.map((att, idx) => {
                    const isImage = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name || '');
                    const url = getStaticUrl(att.file_url || att.url);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden group flex-1 min-w-0">
                          {isImage ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                              <img src={url} alt={att.file_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                              <FileText size={18} className="text-indigo-500" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{att.file_name}</p>
                            {att.file_size ? <p className="text-[10px] text-slate-400">{(att.file_size / 1024 / 1024).toFixed(2)} MB</p> : null}
                          </div>
                        </a>
                        <button onClick={() => removeAttachment(idx)} className="text-rose-500 hover:text-rose-700 ml-2 shrink-0"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      {showApproveModal && (
        <PasswordModal
          title="Aprovar Registro"
          onConfirm={approve}
          onClose={() => setShowApproveModal(false)}
        />
      )}
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SEND ANAMNESIS MODAL
   Profissional configura e gera link seguro para o paciente
═══════════════════════════════════════════════════════════════ */
const SendAnamnesisModal: React.FC<{
  record: MedicalRecord;
  patient: Patient;
  user: any;
  onClose: () => void;
  onSent: (sendData: any) => void;
}> = ({ record, patient, onClose, onSent }) => {
  const [title, setTitle] = useState(`Anamnese — ${patient.full_name}`);
  const [customMessage, setCustomMessage] = useState('');
  const [templateType, setTemplateType] = useState<'full' | 'short'>('full');
  const [approach, setApproach] = useState('');
  const [allowResume, setAllowResume] = useState(true);
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState(false);
  const [expiresHours, setExpiresHours] = useState<number | null>(168); // 7 dias
  const [reminderHours, setReminderHours] = useState<number | null>(48);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { pushToast } = useToast();

  const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : 'https://psiflux.com.br';

  const handleSend = async () => {
    setLoading(true);
    try {
      const data: any = await api.post('/anamnesis-send', {
        patient_id: patient.id,
        medical_record_id: record.id,
        title,
        custom_message: customMessage || null,
        template_type: templateType,
        approach: approach || null,
        allow_resume: allowResume,
        allow_edit_after_submit: allowEditAfterSubmit,
        expires_hours: expiresHours,
        reminder_hours: reminderHours,
        consent_required: true,
        notify_channels: ['link'],
      });
      const link = data.public_link || `${FRONTEND_URL}/f/anamnese?t=${data.secure_token}`;
      setGeneratedLink(link);
      onSent(data);
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao criar envio.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const whatsappLink = generatedLink
    ? `https://wa.me/${(patient.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${patient.full_name}! Preparei um formulário de anamnese para você preencher antes da nossa sessão. Por favor, acesse o link abaixo e responda com calma:\n\n${generatedLink}\n\nSuas respostas são confidenciais. 🔒`)}`
    : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Enviar Anamnese ao Paciente"
      subtitle={`Paciente: ${patient.full_name}`}
      maxWidth="lg"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1 uppercase text-xs font-black tracking-widest">
            {generatedLink ? 'Fechar' : 'Cancelar'}
          </Button>
          {!generatedLink && (
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={loading || !title.trim()}
              className="flex-1 gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-indigo-100"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? 'Gerando link...' : 'Gerar Link Seguro'}
            </Button>
          )}
        </div>
      }
    >
      {generatedLink ? (
        /* ── LINK GERADO ── */
        <div className="space-y-5 pt-2 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-black text-emerald-800 text-sm">Link gerado com sucesso!</p>
              <p className="text-emerald-600 text-xs font-medium">Compartilhe com o paciente pelo canal de sua preferência.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link seguro do paciente</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-indigo-700 font-mono bg-white p-2 rounded-xl border border-indigo-100 truncate">{generatedLink}</code>
              <button
                onClick={copyLink}
                className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {copied ? <><CheckCheck size={14}/> Copiado!</> : <><Copy size={14}/> Copiar</>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition text-center"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <ExternalLink size={18} className="text-slate-600" />
              </div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Copiar Link</p>
              <p className="text-[10px] text-slate-400 font-medium">Cole em qualquer canal</p>
            </button>
            {whatsappLink && (patient.phone || '').replace(/\D/g, '').length >= 10 && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 hover:bg-emerald-100 transition text-center"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">Enviar WhatsApp</p>
                <p className="text-[10px] text-emerald-600 font-medium">{patient.phone}</p>
              </a>
            )}
          </div>

          {/* Confirmação do lembrete automático */}
          {reminderHours ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Bell size={15} className="text-amber-600" />
              </div>
              <div>
                <p className="font-black text-amber-800 text-xs uppercase tracking-widest">Lembrete automático agendado</p>
                <p className="text-amber-700 text-xs font-medium mt-0.5">
                  Se o paciente não responder, o bot enviará um lembrete via WhatsApp automaticamente em{' '}
                  <strong>
                    {reminderHours === 24 ? '24 horas' :
                     reminderHours === 48 ? '2 dias' :
                     reminderHours === 72 ? '3 dias' :
                     reminderHours === 168 ? '7 dias' :
                     `${reminderHours}h`}
                  </strong>.
                </p>
                <p className="text-amber-500 text-[10px] font-medium mt-1">O lembrete é cancelado automaticamente quando o paciente responder ou se você cancelar o envio.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Bell size={13} className="text-slate-300 shrink-0" />
              <p className="text-[11px] text-slate-400 font-medium">Sem lembrete automático configurado. Você pode enviar um lembrete manual a qualquer momento.</p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-medium text-center px-4">
            🔒 Link criptografado e de uso único por sessão. O paciente não precisa de conta no sistema.
          </p>
        </div>
      ) : (
        /* ── CONFIGURAÇÕES ── */
        <div className="space-y-5 pt-2">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título do formulário *</label>
            <input
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Anamnese Inicial — Nome do Paciente"
            />
          </div>

          {/* Mensagem personalizada */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mensagem de boas-vindas (opcional)</label>
            <textarea
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition resize-none min-h-[80px]"
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Ex: Olá! Antes da nossa primeira sessão, gostaria que você preenchesse este formulário..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipo de formulário */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Versão</label>
              <div className="flex flex-col gap-2">
                {([['full', 'Completa', '~15 min'], ['short', 'Rápida', '~5 min']] as const).map(([val, lab, time]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTemplateType(val as 'full' | 'short')}
                    className={`p-3 rounded-xl border-2 text-left transition ${templateType === val ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-100'}`}
                  >
                    <p className="font-black text-xs uppercase">{lab}</p>
                    <p className="text-[10px] font-medium opacity-70">{time}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Opções */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configurações</label>
              {[
                { label: 'Continuar em etapas', sub: 'Salva o progresso', val: allowResume, set: setAllowResume },
                { label: 'Editar após envio', sub: 'Permite correções', val: allowEditAfterSubmit, set: setAllowEditAfterSubmit },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => opt.set(!opt.val)}
                  className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition ${opt.val ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${opt.val ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {opt.val && <CheckCheck size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">{opt.label}</p>
                    <p className="text-[10px] font-medium text-slate-400">{opt.sub}</p>
                  </div>
                </button>
              ))}

              {/* Expiração */}
              <select
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-indigo-400"
                value={expiresHours ?? ''}
                onChange={e => setExpiresHours(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sem expiração</option>
                <option value="24">Expira em 24h</option>
                <option value="48">Expira em 48h</option>
                <option value="168">Expira em 7 dias</option>
                <option value="720">Expira em 30 dias</option>
              </select>

              {/* Lembrete */}
              <select
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-indigo-400"
                value={reminderHours ?? ''}
                onChange={e => setReminderHours(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sem lembrete</option>
                <option value="24">Lembrar em 24h</option>
                <option value="48">Lembrar em 48h</option>
                <option value="72">Lembrar em 3 dias</option>
                <option value="168">Lembrar em 7 dias</option>
              </select>
            </div>
          </div>

          {/* Abordagem */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Abordagem terapêutica (para guiar IA)</label>
            <select
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-indigo-400"
              value={approach}
              onChange={e => setApproach(e.target.value)}
            >
              <option value="">Não especificar</option>
              <option value="tcc">TCC — Terapia Cognitivo-Comportamental</option>
              <option value="psicanalise">Psicanálise</option>
              <option value="humanista">Humanista / Rogersiana</option>
              <option value="act">ACT — Terapia de Aceitação e Compromisso</option>
              <option value="sistemica">Sistêmica / Familiar</option>
              <option value="integrativa">Integrativa</option>
            </select>
            <p className="text-[10px] text-slate-400 font-medium">A IA usará esta abordagem para organizar as respostas do paciente.</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <Brain size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              As respostas do paciente <strong>não vão diretamente para o prontuário</strong>. Você receberá um aviso para revisar e aprovar antes de incorporá-las ao histórico clínico.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ANAMNESIS RESPONSE MODAL
   Profissional revisa respostas do paciente, usa IA e converte
═══════════════════════════════════════════════════════════════ */
const AnamnesisResponseModal: React.FC<{
  sendId: number;
  patientName: string;
  user: any;
  onClose: () => void;
  onConvertToRecord: (recordId: number) => void;
}> = ({ sendId, patientName, onClose, onConvertToRecord }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const { pushToast } = useToast();

  useEffect(() => {
    api.get<any>(`/anamnesis-send/${sendId}`)
      .then(d => {
        setData(d);
        setNotes(d?.response?.professional_notes || '');
      })
      .catch(() => pushToast('error', 'Erro ao carregar respostas.'))
      .finally(() => setLoading(false));
  }, [sendId]);

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const result: any = await api.post(`/anamnesis-send/${sendId}/ai-summary`, {});
      setData((prev: any) => ({
        ...prev,
        response: { ...prev.response, ai_summary: result.summary, tcc_draft: result.tcc_draft }
      }));
      pushToast('success', 'Resumo clínico gerado pela IA!');
    } catch { pushToast('error', 'Erro ao gerar resumo IA.'); }
    finally { setAiLoading(false); }
  };

  const saveReview = async (status: 'reviewing' | 'approved' | 'discarded') => {
    try {
      await api.post(`/anamnesis-send/${sendId}/review`, { review_status: status, professional_notes: notes });
      pushToast('success', status === 'discarded' ? 'Respostas descartadas.' : 'Revisão salva!');
      setData((prev: any) => ({ ...prev, response: { ...prev.response, review_status: status, professional_notes: notes } }));
    } catch { pushToast('error', 'Erro ao salvar revisão.'); }
  };

  const convertToRecord = async () => {
    setConvertLoading(true);
    try {
      const result: any = await api.post(`/anamnesis-send/${sendId}/to-record`, {});
      onConvertToRecord(result.record_id);
    } catch { pushToast('error', 'Erro ao converter para prontuário.'); }
    finally { setConvertLoading(false); }
  };

  const sendReminder = async () => {
    try {
      const result: any = await api.post(`/anamnesis-send/${sendId}/send-reminder`, {});
      if (result.sent_via_bot) {
        pushToast('success', 'Lembrete enviado via WhatsApp pelo bot!');
      } else if (result.whatsapp_url) {
        pushToast('success', 'Bot offline — abrindo WhatsApp para envio manual.');
        window.open(result.whatsapp_url, '_blank', 'noopener,noreferrer');
      } else {
        pushToast('success', 'Lembrete registrado. Paciente sem telefone cadastrado.');
      }
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao enviar lembrete.');
    }
  };

  const REVIEW_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', reviewing: 'Em Revisão', approved: 'Aprovado', discarded: 'Descartado'
  };

  const answers = data?.response?.answers || {};
  const hasAnswers = Object.keys(answers).length > 0;
  const reviewStatus = data?.response?.review_status || 'pending';
  const aiSummary = data?.response?.ai_summary;
  const tccDraft = data?.response?.tcc_draft;
  const hasCritical = data?.response?.has_critical_content;
  const alerts = data?.response?.clinical_alerts || [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Respostas da Anamnese"
      subtitle={`Paciente: ${patientName}`}
      maxWidth="xl"
      footer={
        <div className="flex gap-3 w-full flex-wrap">
          <Button variant="ghost" onClick={onClose} className="uppercase text-xs font-black tracking-widest">Fechar</Button>
          {!hasAnswers && data?.status !== 'answered' && data?.status !== 'cancelled' && (
            <Button variant="ghost" onClick={sendReminder}
              className="gap-2 uppercase text-xs font-black tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50">
              <Bell size={14} /> Enviar Lembrete
            </Button>
          )}
          {hasAnswers && reviewStatus !== 'approved' && (
            <Button variant="primary" onClick={convertToRecord} disabled={convertLoading}
              className="gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-emerald-100 bg-emerald-600 border-emerald-600 hover:bg-emerald-700">
              {convertLoading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
              Criar Rascunho de Prontuário
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 size={32} className="text-indigo-600 animate-spin" />
        </div>
      ) : !hasAnswers ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
            <ClipboardCheck size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-sm">
            {data?.status === 'sent' ? 'O paciente ainda não abriu o formulário.' :
             data?.status === 'viewed' ? 'O paciente abriu o formulário mas ainda não respondeu.' :
             data?.status === 'filling' ? 'O paciente está preenchendo o formulário agora.' :
             'Nenhuma resposta registrada ainda.'}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{REVIEW_STATUS_LABELS[reviewStatus] || reviewStatus}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-5 pt-2 max-h-[65vh] overflow-y-auto">
          {/* Alerta crítico */}
          {hasCritical && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-700 text-sm">Conteúdo crítico detectado</p>
                <p className="text-rose-600 text-xs font-medium mt-0.5">O paciente mencionou: {alerts.join(', ')}. Avalie com atenção prioritária.</p>
              </div>
            </div>
          )}

          {/* Metadados */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Enviado', val: data?.sent_at ? new Date(data.sent_at).toLocaleString('pt-BR') : '—' },
              { label: 'Respondido', val: data?.response?.submitted_at ? new Date(data.response.submitted_at).toLocaleString('pt-BR') : '—' },
              { label: 'Status envio', val: data?.status },
              { label: 'Revisão', val: REVIEW_STATUS_LABELS[reviewStatus] || reviewStatus },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">{item.label}</p>
                <p className="font-bold text-slate-700 mt-0.5">{item.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Settings size={12}/> Configuração do Envio
              </div>
              <div className="space-y-2">
                <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Versão</span>
                   <p className="text-sm font-black text-slate-700 uppercase">{data?.template_type === 'full' ? 'Completa (~15min)' : 'Rápida (~5min)'}</p>
                </div>
                <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Abordagem (IA)</span>
                   <p className="text-[11px] font-bold text-slate-600 uppercase">{data?.approach ? data.approach.toUpperCase() : 'Não especificada'}</p>
                </div>
                {data?.custom_message && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mensagem enviada</span>
                    <p className="text-xs text-slate-500 italic leading-snug line-clamp-2">"{data.custom_message}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-2xl p-4 border space-y-3 ${data?.status === 'answered' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <LinkIcon size={12}/> Link do Formulário
              </div>
              
              {data?.status === 'answered' ? (
                <div className="py-2">
                   <p className="text-xs font-black text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block">FORMULÁRIO CONCLUÍDO</p>
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="bg-white p-2 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-slate-400 truncate max-w-[150px]">{data?.public_link}</span>
                      <Button 
                        size="xs" 
                        variant="ghost" 
                        onClick={() => { navigator.clipboard.writeText(data?.public_link); pushToast('success', 'Link copiado!'); }}
                        className="h-7 w-7 p-0 shrink-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                      >
                        <Copy size={12}/>
                      </Button>
                   </div>
                   <div className="flex items-center gap-2">
                      <Button size="xs" variant="ghost" className="h-8 text-[10px] uppercase font-black tracking-widest bg-white border border-slate-200" onClick={async () => {
                         try {
                            const resp: any = await api.post(`/anamnesis-send/${sendId}/resend`, {});
                            setData((prev: any) => ({ ...prev, public_link: resp.public_link, status: 'sent', secure_token: resp.secure_token }));
                            pushToast('success', 'Novo link gerado!');
                         } catch { pushToast('error', 'Erro ao gerar novo link.'); }
                      }}>Gerar Novo Link</Button>
                      <Button size="xs" variant="ghost" className="h-8 text-[10px] uppercase font-black tracking-widest text-rose-600 hover:bg-rose-50" onClick={async () => {
                         if (!confirm('Deseja realmente cancelar este link? O paciente não poderá mais responder.')) return;
                         try {
                            await api.post(`/anamnesis-send/${sendId}/cancel`, {});
                            setData((prev: any) => ({ ...prev, status: 'cancelled' }));
                            pushToast('success', 'Link revogado.');
                         } catch { pushToast('error', 'Erro ao revogar link.'); }
                      }}>Revogar</Button>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo IA */}
          {(aiSummary || tccDraft) ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-indigo-600" />
                <p className="font-black text-indigo-700 text-xs uppercase tracking-widest">Análise Clínica — Aurora IA</p>
              </div>
              {tccDraft && (
                <div className="space-y-2">
                  {Object.entries(tccDraft).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-indigo-800 font-medium leading-relaxed">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
              {aiSummary && !tccDraft && (
                <div className="space-y-2">
                  {Object.entries(aiSummary).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-indigo-800 font-medium leading-relaxed">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={generateAI}
              disabled={aiLoading}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition flex items-center justify-center gap-2"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {aiLoading ? 'Gerando análise IA...' : 'Gerar Análise com Aurora IA'}
            </button>
          )}

          {/* Respostas Detalhadas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck size={12} /> Respostas do Paciente
              </p>
              <span className="text-[9px] font-bold text-slate-300 uppercase">Respostas fornecidas via link seguro</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(answers).map(([key, val]) => (
                <div key={key} className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm hover:border-indigo-100 transition-colors">
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                    {ANAMNESIS_FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                  </div>
                  <p className="text-sm text-slate-700 font-semibold leading-relaxed">
                    {Array.isArray(val) ? val.join(', ') : typeof val === 'number' ? `${val}/10` : String(val || '—')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notas profissional */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anotações clínicas (uso profissional)</label>
            <textarea
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white min-h-[80px] resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Impressões clínicas, observações, pontos a aprofundar na sessão..."
            />
            <div className="flex gap-2">
              <button onClick={() => saveReview('reviewing')} className="h-9 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase hover:bg-amber-100 transition">
                Salvar como Em Revisão
              </button>
              <button onClick={() => saveReview('approved')} className="h-9 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase hover:bg-emerald-100 transition">
                Marcar como Aprovado
              </button>
              <button onClick={() => saveReview('discarded')} className="h-9 px-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black uppercase hover:bg-rose-100 transition ml-auto">
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN RECORDS PAGE
═══════════════════════════════════════════════════════════════ */
export const Records: React.FC<{ defaultTab?: 'history' | 'reports' | 'analysis' }> = ({ defaultTab }) => {

  const { pushToast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'patient'>(searchParams.get('patient_id') ? 'patient' : 'grid');
  const [activeTab, setActiveTab] = useState<'history' | 'analysis' | 'timeline'>(defaultTab === 'analysis' ? 'analysis' : 'history');
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLatestRecords, setShowLatestRecords] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [globalRecords, setGlobalRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
  const [currentRecord, setCurrentRecord] = useState<Partial<MedicalRecord> | null>(null);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restrictedModal, setRestrictedModal] = useState<{recordId: string; content?: string} | null>(null);
  const [showPwModal, setShowPwModal] = useState<{ type: string; recordId: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewerRecord, setViewerRecord] = useState<MedicalRecord | null>(null);
  const [shareModal, setShareModal] = useState<{ record: MedicalRecord } | null>(null);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [sendAnamnesisModal, setSendAnamnesisModal] = useState<{ record: MedicalRecord; patient: Patient } | null>(null);
  const [relatorioModal, setRelatorioModal] = useState<Patient | null>(null);
  const [encaminhamentoModal, setEncaminhamentoModal] = useState<Patient | null>(null);
  const [atestadoModal, setAtestadoModal] = useState<Patient | null>(null);
  const [anamnesisResponseModal, setAnamnesisResponseModal] = useState<{ sendId: number; patientName: string } | null>(null);
  const [anamnesisSends, setAnamnesisSends] = useState<any[]>([]);
  const [cancelAnamnesisModal, setCancelAnamnesisModal] = useState<{ sendId: number; patientName: string } | null>(null);

  useEffect(() => { 
    fetchAll(); 
    if (selectedPatientId) fetchRecords(selectedPatientId);
    else fetchGlobalRecords();
  }, []);
  
  useEffect(() => {
    const pid = searchParams.get('patient_id');
    if (pid) { 
        setSelectedPatientId(pid); setView('patient'); 
        fetchRecords(pid);
    } else { 
        setSelectedPatientId(null); setView('grid'); 
        fetchGlobalRecords();
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) fetchRecords(selectedPatientId);
    else fetchGlobalRecords();
  }, [filterStatus, filterType, dateFrom, dateTo]);

  // Atualização automática (polling) enquanto houver anamneses pendentes
  useEffect(() => {
    if (!selectedPatientId || view !== 'patient') return;

    // Se houver alguma anamnese não respondida, verifica status periodicamente
    const hasPending = anamnesisSends.some(s => s.status !== 'answered');
    if (!hasPending) return;

    const interval = setInterval(() => {
      api.get<any[]>('/anamnesis-send', { patient_id: selectedPatientId })
        .then(sends => setAnamnesisSends(sends || []))
        .catch(() => {});
    }, 8000); // 8 segundos

    return () => clearInterval(interval);
  }, [selectedPatientId, view, anamnesisSends]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [pp, st, profs] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<Stats>('/medical-records/stats').catch(() => null),
        api.get<any[]>('/users').catch(() => []),
      ]);
      setPatients(pp.map(p => ({ ...p, full_name: p.full_name || (p as any).name || '' })));
      if (st) setStats(st);
      if (profs) setProfessionals((profs as any[]).map(u => ({ id: String(u.id), name: u.name || u.full_name || '', email: u.email })));
      // Carrega registros globais para mostrar tipo do prontuário na lista de pacientes
      fetchGlobalRecords();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };


  const fetchGlobalRecords = async () => {
    try {
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        if (filterType) params.record_type = filterType;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const data = await api.get<MedicalRecord[]>('/medical-records', params);
        setGlobalRecords((data || []).map(r => ({ 
            ...r, 
            id: String(r.id), 
            patient_id: String(r.patient_id),
            tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [] 
        })));
    } catch (err) { console.error('Error fetching global records', err); }
  };

  const fetchRecords = async (pid: string) => {
    setIsLoading(true);
    try {
      const params: any = { patient_id: String(pid) };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.record_type = filterType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await api.get<MedicalRecord[]>(`/medical-records`, params);
      setRecords((data || []).map(r => ({ 
        ...r, 
        id: String(r.id), 
        patient_id: String(r.patient_id),
        tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [] 
      })));
      // Carrega envios de anamnese para mostrar status/botão correto
      api.get<any[]>('/anamnesis-send', { patient_id: pid })
        .then(sends => setAnamnesisSends(sends || []))
        .catch(() => {});
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao buscar prontuários');
    } finally {
      setIsLoading(false);
    }
  };


  const selectedPatient = useMemo(() => patients.find(p => String(p.id) === selectedPatientId), [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => patients.filter(p =>
    (p.status === 'active' || !p.status) &&
    ((p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf || '').includes(search))
  ), [patients, search]);

  const patientRecords = useMemo(() => records.filter(r => String(r.patient_id) === String(selectedPatientId)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [records, selectedPatientId]);

  const analysisData = useMemo(() => {
    if (!patientRecords.length) return null;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    patientRecords.forEach(r => {
      byType[TYPE_LABELS[r.record_type] || r.record_type] = (byType[r.record_type] || 0) + 1;
      byStatus[r.status || 'Rascunho'] = (byStatus[r.status] || 0) + 1;
      const m = new Date(r.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      byMonth[m] = (byMonth[m] || 0) + 1;
    });
    return {
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byMonth: Object.entries(byMonth).map(([name, count]) => ({ name, count }))
    };
  }, [patientRecords]);

  const openNew = () => {
    setTypeSelectorOpen(true);
  };

  const handleSelectType = async (type: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const pat = patients.find((p: Patient) => String(p.id) === String(selectedPatientId));
    const titleMap: Record<string, string> = {
      Evolucao: `Evolução — ${today}`,
      Anamnese: pat ? `Anamnese — ${pat.full_name}` : `Anamnese — ${today}`,
      Avaliacao: `Avaliação — ${today}`,
      Plano: pat ? `Plano Terapêutico — ${pat.full_name}` : `Plano Terapêutico — ${today}`,
    };
    setTypeSelectorOpen(false);

    if (type === 'Anamnese' && pat) {
      try {
        const newRecord = await api.post<MedicalRecord>('/medical-records', {
          patient_id: selectedPatientId,
          record_type: 'Anamnese',
          title: titleMap['Anamnese'],
          status: 'Rascunho',
          created_at: new Date().toISOString().split('T')[0],
        });
        if (selectedPatientId) fetchRecords(selectedPatientId);
        setSendAnamnesisModal({ record: newRecord, patient: pat });
      } catch {
        pushToast('error', 'Erro ao criar registro de anamnese');
      }
      return;
    }

    if (type === 'Relatorio' && pat) { setRelatorioModal(pat); return; }
    if (type === 'Encaminhamento' && pat) { setEncaminhamentoModal(pat); return; }
    if (type === 'Atestado' && pat) { setAtestadoModal(pat); return; }

    setCurrentRecord({ patient_id: selectedPatientId || '', record_type: type, title: titleMap[type] || `Registro — ${today}` });
    setEditorMode('new');
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const data = await api.get<MedicalRecord>(`/medical-records/${id}`);
      setCurrentRecord({ ...data, id: String(data.id), tags: data.tags || [] });
      setEditorMode('edit');
      setEditorOpen(true);
    } catch (e) { pushToast('error', 'Erro ao carregar registro'); }
  };

  const finishExport = async (mode: ExportMode, format: 'pdf' | 'word') => {
    if (!selectedPatient) return;
    setIsLoading(true);
    try {
        const systemName = 'PsiFlux — Sistema de Prontuário Informatizado';
        const profName = user?.name || 'Profissional';
        const profCRP = (user as any)?.crp || 'Não informado';
        const patName = selectedPatient.full_name;
        const patCPF = selectedPatient.cpf || 'Não informado';
        const patBirth = selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR') : 'Não informado';
        const exportDate = new Date().toLocaleString('pt-BR');

        if (format === 'pdf') {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const W = 210; const MARGIN = 18;
            const CONTENT_W = W - MARGIN * 2;

            // ── Cover banner ──────────────────────────────────────
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, W, 46, 'F');
            // Subtle light strip
            doc.setFillColor(99, 91, 255);
            doc.rect(0, 36, W, 10, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9); doc.setTextColor(200, 195, 255);
            doc.text(systemName, MARGIN, 14);
            doc.setFontSize(18); doc.setTextColor(255, 255, 255);
            doc.text('Prontuário Clínico', MARGIN, 27);
            doc.setFontSize(9); doc.setTextColor(220, 218, 255);
            doc.text(`Gerado em: ${exportDate}`, MARGIN, 40);

            // ── Patient info box ───────────────────────────────────
            let y = 56;
            doc.setFillColor(248, 248, 255);
            doc.roundedRect(MARGIN, y, CONTENT_W, 28, 4, 4, 'F');
            doc.setDrawColor(210, 207, 255);
            doc.roundedRect(MARGIN, y, CONTENT_W, 28, 4, 4, 'S');

            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 90, 220);
            doc.text('PACIENTE', MARGIN + 5, y + 7);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 27, 75);
            doc.text(patName, MARGIN + 5, y + 15);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 116, 139);
            doc.text(`CPF: ${patCPF}   |   Nascimento: ${patBirth}`, MARGIN + 5, y + 22);

            // ── Professional info ──────────────────────────────────
            y += 34;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 116, 139);
            doc.text(`Profissional Responsável: ${profName}   |   CRP: ${profCRP}`, MARGIN, y);
            y += 5;
            doc.setDrawColor(226, 232, 240); doc.line(MARGIN, y, W - MARGIN, y);
            y += 8;

            // Mode label
            const modeLabels: Record<ExportMode, string> = {
              standard: 'Resumo Clínico Padrão',
              full: 'Prontuário Completo',
              no_restricted: 'Versão Compartilhada (sem campo restrito)',
              restricted_only: 'Anotações Restritas',
            };
            doc.setFillColor(243, 244, 246); doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
            doc.text(`Modalidade de exportação: ${modeLabels[mode]}`, MARGIN + 4, y + 5.5);
            y += 14;

            // ── Records ───────────────────────────────────────────
            const addPage = () => { doc.addPage(); y = 20; };

            patientRecords.forEach((r, idx) => {
                // Record header pill
                if (y > 255) addPage();
                const headerH = 14;
                doc.setFillColor(238, 242, 255);
                doc.roundedRect(MARGIN, y, CONTENT_W, headerH, 3, 3, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(55, 48, 163);
                doc.text(`${idx + 1}. ${r.title}`, MARGIN + 5, y + 9);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
                doc.text(`${fmtDate(r.created_at)}   ${r.start_time || ''}${r.end_time ? ` – ${r.end_time}` : ''}   ${TYPE_LABELS[r.record_type] || r.record_type}   ${r.status}`, W - MARGIN - 5, y + 9, { align: 'right' });
                y += headerH + 4;

                // Tags
                if (r.tags && r.tags.length > 0) {
                    doc.setFontSize(7); doc.setTextColor(99, 91, 255);
                    doc.text('Tags: ' + r.tags.join(', '), MARGIN + 3, y);
                    y += 5;
                }

                const FIELD_LABELS: Record<string, string> = {
                    motivo_consulta: 'Motivo da Consulta',
                    contexto_relevante: 'Contexto Relevante',
                    observacoes_clinicas: 'Observações Clínicas',
                    intervencoes_realizadas: 'Intervenções Realizadas',
                    evolucao_resposta: 'Evolução / Resposta',
                    plano_terapeutico: 'Plano Terapêutico',
                    encaminhamentos: 'Encaminhamentos',
                    observacao_complementar: 'Observação Complementar',
                };

                if (mode !== 'restricted_only') {
                    // Try organized fields first
                    let organized: any = null;
                    if (r.ai_organized_content) { try { organized = JSON.parse(r.ai_organized_content); } catch {} }

                    if (organized) {
                        Object.entries(FIELD_LABELS).forEach(([key, label]) => {
                            const val = organized[key];
                            if (!val) return;
                            if (y > 258) addPage();
                            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(79, 70, 229);
                            doc.text(label.toUpperCase(), MARGIN + 3, y);
                            y += 4;
                            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
                            const lines = doc.splitTextToSize(String(val), CONTENT_W - 6);
                            lines.forEach((line: string) => {
                                if (y > 275) addPage();
                                doc.text(line, MARGIN + 3, y); y += 4.5;
                            });
                            y += 2;
                        });
                    } else {
                        const content = strip(r.content || r.draft_content || '');
                        if (content) {
                            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
                            const lines = doc.splitTextToSize(content, CONTENT_W - 6);
                            lines.forEach((line: string) => {
                                if (y > 275) addPage();
                                doc.text(line, MARGIN + 3, y); y += 4.5;
                            });
                        }
                    }
                }

                // Restricted content
                if (r.restricted_content && (mode === 'full' || mode === 'restricted_only')) {
                    if (y > 255) addPage();
                    doc.setFillColor(255, 241, 242); doc.roundedRect(MARGIN + 2, y, CONTENT_W - 4, 6, 2, 2, 'F');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(190, 18, 60);
                    doc.text('CAMPO RESTRITO — USO EXCLUSIVO', MARGIN + 5, y + 4.5);
                    y += 9;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(136, 19, 55);
                    const rlines = doc.splitTextToSize(r.restricted_content, CONTENT_W - 6);
                    rlines.forEach((line: string) => {
                        if (y > 275) addPage();
                        doc.text(line, MARGIN + 3, y); y += 4.5;
                    });
                }

                // Separator
                y += 4;
                if (y < 270) { doc.setDrawColor(226, 232, 240); doc.line(MARGIN, y, W - MARGIN, y); y += 6; }
            });

            // Footer on each page
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let pg = 1; pg <= totalPages; pg++) {
                doc.setPage(pg);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180);
                doc.text(`${systemName}  |  Pág. ${pg} de ${totalPages}  |  ${exportDate}`, W / 2, 292, { align: 'center' });
            }

            doc.save(`${patName.replace(/\s+/g, '_')}_Prontuario.pdf`);
        } else {
            // ── Word export ────────────────────────────────────────
            const children: any[] = [
                new Paragraph({ text: systemName, heading: HeadingLevel.HEADING_3 }),
                new Paragraph({ text: `Prontuário Clínico — ${patName}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: `Paciente: ${patName}   CPF: ${patCPF}   Nascimento: ${patBirth}`, bold: false })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Profissional: ${profName}   CRP: ${profCRP}`, bold: false })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Gerado em: ${exportDate}`, italics: true, color: '888888' })], spacing: { after: 400 } }),
            ];

            patientRecords.forEach((r, idx) => {
                children.push(new Paragraph({ text: `${idx + 1}. ${r.title}`, heading: HeadingLevel.HEADING_2 }));
                children.push(new Paragraph({ children: [new TextRun({ text: `Data: ${fmtDate(r.created_at)}  |  Tipo: ${TYPE_LABELS[r.record_type] || r.record_type}  |  Status: ${r.status}`, color: '666666', size: 18 })], spacing: { after: 100 } }));

                if (mode !== 'restricted_only') {
                    let organized: any = null;
                    if (r.ai_organized_content) { try { organized = JSON.parse(r.ai_organized_content); } catch {} }
                    if (organized) {
                        const LABELS: Record<string, string> = { motivo_consulta: 'Motivo da Consulta', contexto_relevante: 'Contexto Relevante', observacoes_clinicas: 'Observações Clínicas', intervencoes_realizadas: 'Intervenções Realizadas', evolucao_resposta: 'Evolução / Resposta', plano_terapeutico: 'Plano Terapêutico', encaminhamentos: 'Encaminhamentos', observacao_complementar: 'Observação Complementar' };
                        Object.entries(LABELS).forEach(([k, label]) => {
                            if (!organized[k]) return;
                            children.push(new Paragraph({ children: [new TextRun({ text: label, bold: true, color: '4F46E5' })], spacing: { before: 120, after: 40 } }));
                            children.push(new Paragraph({ text: organized[k], spacing: { after: 100 } }));
                        });
                    } else {
                        children.push(new Paragraph({ text: strip(r.content || r.draft_content || ''), spacing: { after: 200 } }));
                    }
                }
                if (r.restricted_content && (mode === 'full' || mode === 'restricted_only')) {
                    children.push(new Paragraph({ children: [new TextRun({ text: 'CAMPO RESTRITO — USO EXCLUSIVO', bold: true, color: 'BE123C' })], spacing: { before: 200, after: 60 } }));
                    children.push(new Paragraph({ text: r.restricted_content, spacing: { after: 200 } }));
                }
                children.push(new Paragraph({ text: '─────────────────────────────────────────────', spacing: { after: 200 } }));
            });

            const docx = new Document({ sections: [{ children }] });
            const blob = await Packer.toBlob(docx);
            saveAs(blob, `${patName.replace(/\s+/g, '_')}_Prontuario.docx`);
        }

        // Registra a exportação no audit log (compliance CFP)
        try {
          await api.post('/medical-records/log-export', {
            record_ids: patientRecords.map(r => r.id),
            patient_id: selectedPatient.id,
            export_mode: mode,
            export_format: format,
          });
        } catch { /* log de audit não deve bloquear a exportação */ }

        pushToast('success', 'Documento gerado e baixado!');
        setShowExportModal(false);
    } catch (err: any) {
        pushToast('error', 'Erro na exportação: ' + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const deleteRecord = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/medical-records/${deleteId}`);
      pushToast('success', 'Registro excluído.');
      if (selectedPatientId) fetchRecords(selectedPatientId);
    } catch (e: any) { pushToast('error', e.message); } finally { setDeleteId(null); }
  };

  const accessRestricted = async (pw: string) => {
    if (!showPwModal) return;
    const data = await api.post<any>(`/medical-records/${showPwModal.recordId}/restricted`, { password: pw });
    setRestrictedModal({ recordId: showPwModal.recordId, content: data.restricted_content || data.ai_restricted || '(Sem conteúdo restrito)' });
    setShowPwModal(null);
  };

  const exportPDF = () => {
    setShowExportModal(true);
  };

  if (editorOpen) {
    return (
      <RecordEditor
        record={currentRecord} mode={editorMode}
        patients={patients} selectedPatientId={selectedPatientId}
        onSave={() => selectedPatientId && fetchRecords(selectedPatientId)}
        onClose={() => setEditorOpen(false)}
        onExport={() => setShowExportModal(true)}
        anamnesisSends={anamnesisSends}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fadeIn">
      <PageHeader
        icon={<FileText />}
        title="Prontuário Clínico"
        subtitle={view === 'patient' && selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Evoluções, Relatórios e Diagnósticos"}
        showBackButton={view === 'patient'}
        onBackClick={() => { setSearchParams({}); setView('grid'); setSelectedPatientId(null); setRecords([]); }}
        actions={
          <div className="flex items-center gap-2">
            {view === 'patient' && (
              <>
                <button
                  onClick={() => { setSearchParams({}); setView('grid'); setSelectedPatientId(null); setRecords([]); setAnamnesisSends([]); }}
                  className="h-9 px-3 md:px-4 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
                >
                  <ArrowLeft size={14}/> <span className="hidden sm:inline">Voltar</span>
                </button>

                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-2xl border border-slate-200 shadow-sm">
                  {([
                    { key: 'history', label: 'Registros', icon: <History size={13}/> },
                    { key: 'timeline', label: 'Timeline', icon: <Clock size={13}/> },
                    { key: 'analysis', label: 'Análise', icon: <BarChart2 size={13}/> },
                  ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {tab.icon} <span className="hidden xs:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <button onClick={exportPDF} className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center justify-center sm:gap-2 shadow-sm">
                  <Download size={14}/> <span className="hidden sm:inline">PDF</span>
                </button>

                <button onClick={openNew} className="h-9 md:h-10 px-3 md:px-6 bg-indigo-600 text-white rounded-xl text-[10px] md:text-[11px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center justify-center sm:gap-2 transition-all">
                  <Plus size={16}/> <span className="hidden sm:inline">Novo Registro</span>
                </button>
              </>
            )}
            {view === 'grid' && (
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter size={14}/> <span className="hidden sm:inline">Filtros</span>
              </button>
            )}
          </div>
        }
      />

      {/* Linha de Filtros de Tipo (Mobile Friendly) */}
      {view === 'patient' && activeTab === 'history' && (
        <div className="bg-white/40 p-1.5 rounded-2xl border border-slate-200/50 flex items-center gap-1 overflow-x-auto no-scrollbar animate-fadeIn">
          <button 
            onClick={() => setFilterType('')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${!filterType ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}
          >
            Tudo
          </button>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <button 
              key={key} 
              onClick={() => setFilterType(key)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterType === key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ─── GRID DE PACIENTES ─── */}      {/* Filtros Expansion */}
      {showFilters && (
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm mb-6 animate-slideDownFade">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} className="text-indigo-500"/> Parâmetros de Filtro
            </h3>
            <button onClick={() => { setFilterStatus(''); setFilterType(''); setDateFrom(null); setDateTo(null); }} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800">Limpar Tudo</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
              <select className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Revisado">Revisado</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
              <select className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Desde</label>
              <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Início" className="h-10"/>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Até</label>
              <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fim" className="h-10"/>
            </div>
          </div>
        </div>
      )}

      {view === 'grid' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Registros', value: stats.total, color: 'indigo', icon: <FileText size={20}/> },
                { label: 'Este Mês', value: stats.thisMonth, color: 'blue', icon: <Calendar size={20}/> },
                { label: 'Aprovados', value: stats.approved, color: 'emerald', icon: <CheckCircle2 size={20}/> },
                { label: 'Rascunhos', value: stats.drafts, color: 'amber', icon: <Edit3 size={20}/> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>{s.icon}</div>
                  <div>
                    <div className="text-2xl font-black text-slate-800">{s.value}</div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid de pacientes ou Últimos Registros */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:border-indigo-300 font-medium"
                  placeholder={showLatestRecords ? "Buscar no histórico..." : "Buscar paciente..."} value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={() => setShowLatestRecords(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${!showLatestRecords ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Pacientes</button>
                <button onClick={() => setShowLatestRecords(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${showLatestRecords ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Últimos Registros</button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={28} className="text-indigo-400 animate-spin"/></div>
            ) : showLatestRecords ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-4 shadow-sm">
                    <GridTable
                        data={globalRecords.filter(r => strip(r.content || '').toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase()))}
                        keyExtractor={(r) => r.id}
                        columns={[
                            {
                                header: 'Registro e Paciente',
                                accessor: 'title',
                                render: (r: MedicalRecord) => (
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter">{r.title}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                            <User size={10} className="text-slate-300"/> {r.patient_name || 'Paciente não identificado'}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                header: 'Data',
                                accessor: 'created_at',
                                render: (r: MedicalRecord) => (
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                        <Calendar size={12} className="text-slate-300"/>
                                        {fmtDate(r.created_at)}
                                    </div>
                                )
                            },
                            {
                                header: 'Status',
                                accessor: 'status',
                                render: (r: MedicalRecord) => (
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span>
                                        {r.ai_status === 'organized' && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1"><Sparkles size={10}/> IA</span>}
                                    </div>
                                )
                            },
                            {
                                header: 'Ações',
                                className: 'text-right',
                                render: (r: MedicalRecord) => (
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => { setSearchParams({ patient_id: String(r.patient_id) }); setSelectedPatientId(String(r.patient_id)); setView('patient'); }}
                                            className="h-9 w-9 p-0 rounded-xl"
                                            title="Ver Paciente"
                                        >
                                            <ChevronRight size={16}/>
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-4 shadow-sm">
                    <GridTable
                        data={filteredPatients}
                        keyExtractor={(p) => p.id}
                        onRowClick={(p) => { setSearchParams({ patient_id: String(p.id) }); setSelectedPatientId(String(p.id)); setView('patient'); }}
                        columns={[
                            {
                                header: 'Identificação do Paciente',
                                accessor: 'full_name',
                                render: (p: Patient) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100 shadow-sm">
                                            {(p.full_name || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter">{p.full_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <User size={10} className="text-slate-300"/> {p.cpf || 'CPF não informado'}
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                header: 'Email / Contato',
                                accessor: 'email',
                                render: (p: Patient) => (
                                    <div className="flex flex-col gap-0.5">
                                        <div className="text-[11px] font-bold text-slate-600 truncate">{p.email || 'Nenhum e-mail'}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.phone || 'Sem telefone'}</div>
                                    </div>
                                )
                            },
                            {
                                header: 'Prontuário',
                                accessor: 'status',
                                render: (p: Patient) => {
                                  // Conta registros deste paciente no globalRecords
                                  const pRecs = globalRecords.filter(r => String(r.patient_id) === String(p.id));
                                  const lastRec = pRecs[0];
                                  const statusPt = !p.status || p.status === 'ativo' || p.status === 'active' || p.status === 'Ativo'
                                    ? 'Em Atendimento' : p.status === 'inativo' || p.status === 'inactive' ? 'Inativo' : p.status;
                                  const isActive = !p.status || ['ativo','active','Ativo','Em Atendimento'].includes(p.status);
                                  return (
                                    <div className="flex flex-col gap-1.5">
                                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm w-fit ${
                                        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                      }`}>
                                        {statusPt}
                                      </span>
                                      {lastRec && (
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                          {TYPE_LABELS[lastRec.record_type] || lastRec.record_type}
                                          {pRecs.length > 1 && ` +${pRecs.length - 1}`}
                                        </span>
                                      )}
                                      {!lastRec && (
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Sem registros</span>
                                      )}
                                    </div>
                                  );
                                }
                            },
                            {
                                header: 'Ações',
                                className: 'text-right',
                                render: (p: Patient) => (
                                    <div className="flex items-center justify-end">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <ChevronRight size={18}/>
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DETALHE DO PACIENTE ─── */}
      {view === 'patient' && selectedPatient && (
        <div className="space-y-6">
          {/* Stats do paciente */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: patientRecords.length, icon: <Layers size={16}/>, color: 'indigo' },
              { label: 'Aprovados', value: patientRecords.filter(r => r.status === 'Aprovado').length, icon: <CheckCircle2 size={16}/>, color: 'emerald' },
              { label: 'Rascunhos', value: patientRecords.filter(r => r.status === 'Rascunho').length, icon: <Edit3 size={16}/>, color: 'amber' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-[20px] border border-${s.color}-100 p-3 md:p-4 shadow-sm flex items-center gap-2 md:gap-3`}>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>{s.icon}</div>
                <div className="min-w-0">
                  <div className="text-lg md:text-xl font-black text-slate-800">{s.value}</div>
                  <div className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Histórico */}
          {activeTab === 'history' && (
            <div className="animate-fadeIn">
              {patientRecords.length === 0 ? (
                <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100">
                    <BookOpen size={32}/>
                  </div>
                  <p className="font-bold text-slate-400 mb-6 uppercase text-[11px] tracking-widest">Nenhuma evolução registrada para este paciente.</p>
                  <Button onClick={openNew} variant="primary" className="h-11 px-8 gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5">
                    <Plus size={18}/> Iniciar Evolução
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="md:hidden space-y-3">
                    {patientRecords.map((r) => {
                      const TYPE_COLORS_M: Record<string, string> = {
                        'Anamnese': 'bg-violet-50 text-violet-700 border-violet-200',
                        'Evolução': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        'Relatório': 'bg-blue-50 text-blue-700 border-blue-200',
                        'Avaliação': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                      };
                      const typeColorM = TYPE_COLORS_M[r.record_type] || 'bg-slate-50 text-slate-500 border-slate-200';
                      const sendForThisRecord = anamnesisSends.find(s => String(s.medical_record_id) === String(r.id));
                      const pat = patients.find(p => String(p.id) === String(r.patient_id));
                      return (
                        <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100"><FileText size={16}/></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-800 text-sm uppercase tracking-tighter leading-tight">{r.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{TYPE_LABELS[r.record_type] || r.record_type}{r.appointment_type ? ` · ${r.appointment_type}` : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] font-bold text-slate-500">{fmtDate(r.created_at)}</p>
                              {r.start_time && <p className="text-[9px] text-slate-400">{r.start_time}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${typeColorM}`}>{TYPE_LABELS[r.record_type] || r.record_type}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span>
                            {r.ai_status === 'organized' && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1"><Sparkles size={9}/> IA</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {r.record_type === 'Anamnese' && pat && (
                              sendForThisRecord ? (
                                <button onClick={() => setAnamnesisResponseModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}
                                  className={`h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition ${sendForThisRecord.status === 'answered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sendForThisRecord.status === 'filling' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                  <ClipboardCheck size={12}/>{sendForThisRecord.status === 'answered' ? 'Respostas' : 'Status'}
                                </button>
                              ) : (
                                <button onClick={() => setSendAnamnesisModal({ record: r, patient: pat })}
                                  className="h-8 px-3 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase flex items-center gap-1.5 border border-indigo-600">
                                  <Send size={12}/> Enviar
                                </button>
                              )
                            )}
                            <div className="flex items-center gap-1 bg-slate-100/30 p-1 rounded-xl border border-slate-200/50 ml-auto">
                              {[
                                { icon: <Eye size={15}/>, title: "Visualizar", onClick: async () => { try { const full = await api.get<MedicalRecord>(`/api/medical-records/${r.id}`); setViewerRecord(full); } catch { setViewerRecord(r); } }, color: "indigo", skip: r.record_type === 'Anamnese' },
                                { icon: <Edit3 size={15}/>, title: "Editar", onClick: () => openEdit(r.id), color: "amber" },
                                { icon: <Lock size={15}/>, title: "Restrito", onClick: () => setShowPwModal({ type: 'restricted', recordId: r.id }), color: "rose", isRose: true },
                                { icon: <Share2 size={15}/>, title: "Compartilhar", onClick: () => setShareModal({ record: r }), color: "purple" },
                                { icon: <Trash2 size={15}/>, title: "Excluir", onClick: () => setDeleteId(r.id), color: "rose" },
                              ].filter(b => !b.skip).map((btn, idx) => (
                                <button key={idx} onClick={btn.onClick} title={btn.title}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition border border-slate-100 ${btn.isRose ? 'bg-slate-50 text-rose-400 hover:bg-rose-500 hover:text-white border-rose-50' : `bg-white text-slate-400 hover:bg-${btn.color}-600 hover:text-white`}`}>
                                  {btn.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block">
                  <GridTable
                    data={patientRecords}
                  keyExtractor={(r) => r.id}
                  columns={[
                    {
                      header: 'Documento / Registro',
                      accessor: 'title',
                      render: (r: MedicalRecord) => (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 shadow-sm">
                            <FileText size={18}/>
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-black text-slate-800 text-sm uppercase tracking-tighter truncate">{r.title}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{TYPE_LABELS[r.record_type] || r.record_type}</span>
                               {r.appointment_type && (
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                               )}
                               {r.appointment_type && (
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{r.appointment_type}</span>
                               )}
                            </div>
                          </div>
                        </div>
                      )
                    },
                    {
                      header: 'Data da Sessão',
                      accessor: 'created_at',
                      render: (r: MedicalRecord) => (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                             <Calendar size={13} className="text-slate-300"/> {fmtDate(r.created_at)}
                          </div>
                          {r.start_time && (
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                               <Clock size={11} className="text-slate-200"/> {r.start_time}{r.end_time ? ` – ${r.end_time}` : ''}
                             </div>
                          )}
                        </div>
                      )
                    },
                    {
                      header: 'Tipo / Status',
                      accessor: 'status',
                      render: (r: MedicalRecord) => {
                        // Cores por tipo de registro
                        const TYPE_COLORS: Record<string, string> = {
                          'Anamnese': 'bg-violet-50 text-violet-700 border-violet-200',
                          'Evolução': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                          'Relatório': 'bg-blue-50 text-blue-700 border-blue-200',
                          'Avaliação': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                          'Sessão': 'bg-teal-50 text-teal-700 border-teal-200',
                          'Diagnóstico': 'bg-rose-50 text-rose-700 border-rose-200',
                        };
                        const typeColor = TYPE_COLORS[r.record_type] || 'bg-slate-50 text-slate-500 border-slate-200';
                        return (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${typeColor}`}>
                              {TYPE_LABELS[r.record_type] || r.record_type}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {r.status}
                            </span>
                            {r.ai_status === 'organized' && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1"><Sparkles size={9}/> IA</span>}
                          </div>
                        );
                      }
                    },
                    {
                      header: 'Ações',
                      className: 'text-right min-w-[150px]',
                      render: (r: MedicalRecord) => (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap md:flex-nowrap">
                          {/* Botão especial: Enviar Anamnese / Ver Respostas */}
                          {r.record_type === 'Anamnese' && (
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const sendForThisRecord = anamnesisSends.find(s => String(s.medical_record_id) === String(r.id));
                                const pat = patients.find(p => String(p.id) === String(r.patient_id));
                                if (!pat) return null;

                                if (sendForThisRecord) {
                                  const canCancel = !['answered', 'cancelled', 'expired'].includes(sendForThisRecord.status);
                                  return (
                                    <>
                                      <button
                                        onClick={() => setAnamnesisResponseModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}
                                        className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border transition ${
                                          sendForThisRecord.status === 'answered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                                          sendForThisRecord.status === 'filling' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                                          sendForThisRecord.status === 'cancelled' ? 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-60' :
                                          'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        <ClipboardCheck size={13}/>
                                        <span className="hidden lg:inline">
                                          {sendForThisRecord.status === 'answered' ? 'Ver respostas' :
                                           sendForThisRecord.status === 'cancelled' ? 'Cancelado' :
                                           'Status Envio'}
                                        </span>
                                      </button>
                                      {canCancel && (
                                        <button
                                          title="Cancelar envio"
                                          onClick={() => setCancelAnamnesisModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}
                                          className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                        >
                                          <X size={14}/>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setSendAnamnesisModal({ record: r, patient: pat })}
                                        title="Enviar novamente"
                                        className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-slate-50 transition-all"
                                      >
                                        <Plus size={14}/>
                                      </button>
                                    </>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => setSendAnamnesisModal({ record: r, patient: pat })}
                                    className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100 border border-indigo-600 hover:bg-indigo-700 transition"
                                  >
                                    <Send size={13}/> <span className="hidden lg:inline">Enviar ao Paciente</span>
                                  </button>
                                );
                              })()}
                            </div>
                          )}

                          {/* Ações de Linha Padrão */}
                          <div className="flex items-center gap-1 bg-slate-100/30 p-1 rounded-xl border border-slate-200/50">
                            {[
                              { icon: <Eye size={16}/>, title: "Visualizar", onClick: async () => { try { const full = await api.get<MedicalRecord>(`/api/medical-records/${r.id}`); setViewerRecord(full); } catch { setViewerRecord(r); } }, color: "indigo", skip: r.record_type === 'Anamnese' },
                              { icon: <Edit3 size={16}/>, title: "Editar", onClick: () => openEdit(r.id), color: "amber" },
                              { icon: <Lock size={16}/>, title: "Restrito", onClick: () => setShowPwModal({ type: 'restricted', recordId: r.id }), color: "rose", isRose: true },
                              { icon: <Share2 size={16}/>, title: "Compartilhar", onClick: () => setShareModal({ record: r }), color: "purple" },
                              { icon: <Trash2 size={16}/>, title: "Excluir", onClick: () => setDeleteId(r.id), color: "rose" },
                            ].filter(b => !b.skip).map((btn, idx) => (
                              <button 
                                key={idx}
                                onClick={btn.onClick} 
                                title={btn.title}
                                className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition shadow-sm border border-slate-100 ${
                                  btn.isRose ? 'bg-slate-50 text-rose-400 hover:bg-rose-500 hover:text-white border-rose-50' : 
                                  `bg-white text-slate-400 hover:bg-${btn.color}-600 hover:text-white`
                                }`}
                              >
                                {btn.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
                  </div>{/* end hidden md:block */}
                </>
              )}
            </div>
          )}

          {/* Timeline */}
          {activeTab === 'timeline' && selectedPatientId && (
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 animate-fadeIn">
              <PatientTimeline
                patientId={String(selectedPatientId)}
                patientName={selectedPatient?.full_name}
              />
            </div>
          )}

          {/* Análise */}
          {activeTab === 'analysis' && analysisData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Evolução por Mês</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analysisData.byMonth}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }}/>
                    <YAxis tick={{ fontSize: 11 }}/>
                    <Tooltip/>
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Status dos Registros</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analysisData.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                      {analysisData.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Por Tipo de Registro</h3>
                <div className="flex flex-wrap gap-3">
                  {analysisData.byType.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="font-black text-slate-700 text-sm">{t.name}</span>
                      <span className="text-xs font-bold text-slate-400">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir Registro?"
        subtitle="Esta ação é irreversível e o prontuário será removido permanentemente do sistema."
        maxWidth="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 uppercase text-xs font-black tracking-widest">Cancelar</Button>
            <Button variant="primary" onClick={deleteRecord} className="flex-1 bg-rose-600 border-rose-600 hover:bg-rose-700 uppercase text-xs font-black tracking-widest gap-2">
              <Trash2 size={16}/> Confirmar Exclusão
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
            <AlertTriangle size={32} className="animate-pulse" />
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Você está prestes a excluir um registro clínico. Esta operação será registrada nos logs de auditoria do sistema para conformidade com o CFP.
          </p>
        </div>
      </Modal>

      {/* Restricted Content Password Modal */}
      {showPwModal && (
        <PasswordModal
          title="Acessar Campo Restrito"
          onConfirm={accessRestricted}
          onClose={() => setShowPwModal(null)}
        />
      )}

      {/* Restricted Content View */}
      <Modal
        isOpen={!!restrictedModal}
        onClose={() => setRestrictedModal(null)}
        title="Conteúdo Restrito"
        subtitle="Informações sigilosas de uso exclusivo do profissional responsável."
        maxWidth="lg"
        footer={<Button variant="ghost" onClick={() => setRestrictedModal(null)} className="w-full uppercase text-xs font-black tracking-widest">Fechar Visualização</Button>}
      >
        <div className="space-y-4 pt-2">
          <div className="bg-rose-50 border border-rose-100/50 rounded-2xl p-6 shadow-inner">
            <p className="text-sm font-medium text-rose-900 leading-relaxed whitespace-pre-wrap selection:bg-rose-200">
               {restrictedModal?.content}
            </p>
          </div>
          <div className="flex items-center gap-2 px-1">
             <Shield size={12} className="text-slate-400"/>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Protegido por Criptografia de Ponta a Ponta</p>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
            patient={selectedPatient}
            records={patientRecords}
            onExport={finishExport}
            onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Type Selector */}
      {typeSelectorOpen && (
        <RecordTypeSelector
          onSelect={handleSelectType}
          onClose={() => setTypeSelectorOpen(false)}
          patientName={patients.find((p: Patient) => String(p.id) === String(selectedPatientId))?.full_name}
        />
      )}

      {/* Record Viewer */}
      {viewerRecord && (
        <RecordViewer
          record={viewerRecord}
          patient={patients.find(p => String(p.id) === String(viewerRecord.patient_id))}
          onClose={() => setViewerRecord(null)}
          onEdit={() => { openEdit(viewerRecord.id); setViewerRecord(null); }}
        />
      )}

      {/* Share Modal */}
      {shareModal && (
        <ShareModal
          recordId={shareModal.record.id}
          recordTitle={shareModal.record.title}
          professionals={professionals.filter(p => String(p.id) !== String(user?.id))}
          onClose={() => setShareModal(null)}
          onShared={() => selectedPatientId && fetchRecords(selectedPatientId)}
        />
      )}

      {/* ══ MODAL: RELATÓRIO ══ */}
      {relatorioModal && (
        <RelatorioModal
          patient={relatorioModal}
          professional={{ name: user?.name, crp: user?.crp, specialty: (user as any)?.specialty, address: (user as any)?.address, phone: (user as any)?.phone, companyName: user?.companyName }}
          onClose={() => setRelatorioModal(null)}
          onSaved={() => { if (selectedPatientId) fetchRecords(selectedPatientId); pushToast('success', 'Relatório salvo no prontuário!'); }}
        />
      )}

      {/* ══ MODAL: ENCAMINHAMENTO ══ */}
      {encaminhamentoModal && (
        <EncaminhamentoModal
          patient={encaminhamentoModal}
          professional={{ name: user?.name, crp: user?.crp, specialty: (user as any)?.specialty, address: (user as any)?.address, phone: (user as any)?.phone, companyName: user?.companyName }}
          onClose={() => setEncaminhamentoModal(null)}
          onSaved={() => { if (selectedPatientId) fetchRecords(selectedPatientId); pushToast('success', 'Encaminhamento registrado no prontuário!'); }}
        />
      )}

      {/* ══ MODAL: ATESTADO ══ */}
      {atestadoModal && (
        <AtestadoModal
          patient={atestadoModal}
          professional={{ name: user?.name, crp: user?.crp, specialty: (user as any)?.specialty, address: (user as any)?.address, phone: (user as any)?.phone, companyName: user?.companyName }}
          onClose={() => setAtestadoModal(null)}
          onSaved={() => { if (selectedPatientId) fetchRecords(selectedPatientId); pushToast('success', 'Atestado emitido e salvo no prontuário!'); }}
        />
      )}

      {/* ══ MODAL: ENVIAR ANAMNESE PARA PACIENTE ══ */}
      {sendAnamnesisModal && (
        <SendAnamnesisModal
          record={sendAnamnesisModal.record}
          patient={sendAnamnesisModal.patient}
          user={user as any}
          onClose={() => setSendAnamnesisModal(null)}
          onSent={(sendData) => {
            setAnamnesisSends(prev => {
              const exists = prev.find(s => s.id === sendData.id);
              if (exists) return prev.map(s => s.id === sendData.id ? sendData : s);
              return [...prev, sendData];
            });
            pushToast('success', 'Anamnese enviada ao paciente com sucesso!');
          }}
        />
      )}

      {/* ══ MODAL: VER RESPOSTAS DA ANAMNESE ══ */}
      {anamnesisResponseModal && (
        <AnamnesisResponseModal
          sendId={anamnesisResponseModal.sendId}
          patientName={anamnesisResponseModal.patientName}
          user={user as any}
          onClose={() => setAnamnesisResponseModal(null)}
          onConvertToRecord={(recordId) => {
            setAnamnesisResponseModal(null);
            pushToast('success', 'Rascunho de prontuário criado com sucesso!');
            if (selectedPatientId) fetchRecords(selectedPatientId);
          }}
        />
      )}

      {/* Modal de confirmação de cancelamento de anamnese */}
      {cancelAnamnesisModal && (
        <Modal
          isOpen
          onClose={() => setCancelAnamnesisModal(null)}
          title="Cancelar envio de anamnese"
          maxWidth="sm"
          footer={
            <div className="flex gap-3 w-full">
              <Button variant="ghost" onClick={() => setCancelAnamnesisModal(null)} className="flex-1 uppercase text-xs font-black tracking-widest">
                Manter ativo
              </Button>
              <Button
                variant="primary"
                className="flex-1 uppercase text-xs font-black tracking-widest bg-rose-600 border-rose-600 hover:bg-rose-700 shadow-rose-100"
                onClick={async () => {
                  try {
                    await api.post(`/anamnesis-send/${cancelAnamnesisModal.sendId}/cancel`, {});
                    setAnamnesisSends((prev: any[]) => prev.map((s: any) => s.id === cancelAnamnesisModal.sendId ? { ...s, status: 'cancelled' } : s));
                    pushToast('success', 'Envio cancelado. Lembretes interrompidos.');
                  } catch { pushToast('error', 'Erro ao cancelar envio.'); }
                  finally { setCancelAnamnesisModal(null); }
                }}
              >
                <X size={14} /> Sim, cancelar
              </Button>
            </div>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-700 text-sm">Cancelar o formulário de {cancelAnamnesisModal.patientName}?</p>
                <p className="text-rose-600 text-xs font-medium mt-1">O paciente não poderá mais responder e todos os lembretes automáticos serão interrompidos imediatamente.</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed px-1">
              Se quiser enviar novamente no futuro, basta clicar em <strong>"+"</strong> para gerar um novo link.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
