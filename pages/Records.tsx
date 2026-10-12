import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TherapeuticPlanEditor, EMPTY_PLAN, type TheraPlan } from '../components/TherapeuticPlanEditor';
import { RelatorioModal, EncaminhamentoModal, AtestadoModal } from '../components/modals/DocumentModals';
import { PatientTimeline } from '../components/PatientTimeline';
import { api, getStaticUrl } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmModal, ModalFooter } from '../components/UI/Modal';
import { Button, IconButton } from '../components/UI/Button';
import { Tabs } from '../components/UI/Tabs';
import { Alert } from '../components/UI/Alert';
import { Select, Input, Textarea } from '../components/UI/Input';
import { ContentCard, StatGrid } from '../components/UI/PageWrapper';
import { Switch } from '../components/UI/Switch';
import { GridTable } from '../components/UI/GridTable';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { StatCard } from '../components/UI/StatCard';
import { Badge } from '../components/UI/Badge';
import { EmptyState } from '../components/UI/EmptyState';
import { PanelCard } from '../components/UI/PanelCard';
import { FilterLineSegmented, FilterLineSearch } from '../components/UI/FilterLine';
import {
  Search, Plus, FileText, Calendar, Clock, Activity, BarChart2,
  Trash2, Eye, EyeOff, Edit3, CheckCircle2, ChevronRight, Loader2,
  Sparkles, Lock, LockOpen, AlertTriangle, Save, Shield,
  X, ArrowLeft, Layers, User, Download, RotateCcw, Tag,
  History, BookOpen, Share2, Send, Copy, ExternalLink,
  ClipboardCheck, RefreshCw, MessageSquare, Brain, CheckCheck,
  LinkIcon, Bell, Info, TrendingUp, CalendarDays,
  Settings, ClipboardList, FileUp
} from 'lucide-react';
import { StructuredForm, type FollowupRow } from '../components/Records/StructuredForm';
import { SessionDataTab, localDateStr, localTimeStr, fmtIsoDate, diffMinutes, minToTime, timeToMin, DEFAULT_TAG_SUGGESTIONS, FORMATOS, type AppointmentLite } from '../components/Records/SessionDataTab';
import { AiFillPanel } from '../components/Records/AiFillPanel';
import { SourcesDialog, type SourceGroupId } from '../components/Records/SourcesDialog';
import { HistoryPanel, type HistorySnapshot } from '../components/Records/HistoryPanel';
import { AnamnesisLivePanel, PlanLivePanel, FaltaForm, OcorrenciaSelect, SessionsAlerts } from '../components/Records/LiveRecordPanels';
import { dayOfStamp, localToday, fmtDay as fmtDayStr, faltaPending, ocorrenciaOf, isAbsenceOc, isFaltaOc } from '../components/Records/liveRecords';
import { PendingCard, type PreviousSession } from '../components/Records/PendingCard';
import { StructuredReadView } from '../components/Records/StructuredReadView';
import { SessionTimeline } from '../components/Records/SessionTimeline';
import { AssessmentPanel } from '../components/Records/AssessmentPanel';
import { RecordsHome } from '../components/Records/RecordsHome';
import { ImportClinicalFileModal, type ImportedClinicalFile } from '../components/Records/ImportClinicalFileModal';
import {
  SPECIALTY_TEMPLATES, SPECIALTY_OPTIONS, DEFAULT_SPECIALTY, detectSpecialty, getSections, parseStructured,
  compileLegacy, hasAnyValue, hasValue, buildResumo, humorFromScore, splitTasks, sectionStatus, RISCO_TRIAGEM,
  type SpecialtyId, type RecordKind, type StructuredValues,
} from '../components/Records/specialtyTemplates';
import { DatePicker } from '../components/UI/DatePicker';
import { RichTextEditor } from '../components/UI/RichTextEditor';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { jsPDF } from 'jspdf';
import { renderClinicalPdf, loadLogoImage, type ClinicInfo, type ProfessionalInfo } from '../components/Records/pdf/clinicalDocument';
import { buildClinicalDocModel, type ExportMood, type ExportInstrument, type ExportAttachment, type ExportAnamnesisSend } from '../components/Records/pdf/buildClinicalDocModel';
import { buildClinicalDocxBlob } from '../components/Records/pdf/clinicalDocx';
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
  attachments?: any[]; appointment_id?: string;
}
interface Stats { total: number; thisMonth: number; approved: number; drafts: number; byType: any[]; byMonth: any[]; topPatients: any[]; }

const STATUS_COLORS: Record<string, string> = {
  'Rascunho': 'bg-amber-100 text-amber-700 border-amber-200',
  'Organizado': 'bg-primary-100 text-primary-700 border-primary-200',
  'Revisado': 'bg-purple-100 text-purple-700 border-purple-200',
  'Aprovado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Finalizado': 'bg-primary-100 text-primary-700 border-primary-200',
};
const STATUS_BADGE_COLOR: Record<string, 'warning'|'info'|'purple'|'success'|'default'> = {
  'Rascunho': 'warning', 'Organizado': 'info', 'Revisado': 'purple',
  'Aprovado': 'success', 'Finalizado': 'info',
};
const TYPE_BADGE_COLOR: Record<string, 'purple'|'info'|'teal'|'orange'|'default'> = {
  'Anamnese': 'purple', 'Evolução': 'info', 'Relatório': 'info',
  'Avaliação': 'teal', 'Encaminhamento': 'orange', 'Plano Terapêutico': 'purple',
  'Atestado': 'default',
};
const TYPE_LABELS: Record<string, string> = {
  Evolucao: 'Evolução', Anamnese: 'Anamnese', Avaliacao: 'Avaliação',
  Encaminhamento: 'Encaminhamento', Plano: 'Plano Terapêutico', Relatorio: 'Relatório',
  Atestado: 'Atestado',
};
const PIE_COLORS = ['var(--c-600)', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const strip = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Reduz imagens antes do envio: até 1920px no maior lado e WebP qualidade 82%. */
const optimizeImageForUpload = async (file: File): Promise<File> => {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  return new Promise(resolve => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    const finish = (result = file) => { URL.revokeObjectURL(sourceUrl); resolve(result); };
    image.onerror = () => finish();
    image.onload = () => {
      const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
      const ratio = largestSide > 1920 ? 1920 / largestSide : 1;
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return finish();
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) return finish();
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
        finish(new File([blob], `${baseName}-otimizada.webp`, { type: 'image/webp', lastModified: file.lastModified }));
      }, 'image/webp', 0.82);
    };
    image.src = sourceUrl;
  });
};

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
const RECORDS_TABS = [
  { id: 'history', label: 'Registros', icon: History },
  { id: 'anamnesis', label: 'Anamnese', icon: BookOpen },
  { id: 'assessment', label: 'Avaliação', icon: Brain },
  { id: 'plan', label: 'Plano terapêutico', icon: Layers },
  { id: 'sessions', label: 'Sessões e evolução', icon: ClipboardCheck },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'analysis', label: 'Análise', icon: BarChart2 },
] as const;
/** Abas do prontuário: no celular só a ativa mostra o texto e ela sempre fica visível na rolagem. */
const RecordsTabsBar: React.FC<{ value: RecordsTabId; onChange: (v: RecordsTabId) => void }> = ({ value, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [value]);
  const items = RECORDS_TABS.map(tb => ({
    ...tb,
    label: <span className={tb.id === value ? '' : 'hidden sm:inline'}>{tb.label}</span>,
  }));
  return (
    <div ref={ref} className="min-w-0 [&_[role=tablist]]:snap-x [&_[role=tab]]:snap-center [&_[role=tab]]:px-3">
      <Tabs<RecordsTabId> items={items} value={value} onChange={onChange} label="Seções do prontuário" />
    </div>
  );
};
const TAB_RECORD_TYPE: Record<string, string> = { anamnesis: 'Anamnese', assessment: 'Avaliacao', plan: 'Plano', sessions: 'Evolucao' };
type RecordsTabId = typeof RECORDS_TABS[number]['id'];

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
      size="sm"
      footer={
        <ModalFooter>
           <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
           <Button onClick={submit} loading={loading} variant="primary" size="sm" iconLeft={<Shield size={14}/>}>
             Confirmar
           </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <Input
          label="Senha do sistema"
          type={showPw ? 'text' : 'password'}
          autoFocus
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="••••••••"
          addonRight={
            <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'} className="text-slate-400 hover:text-slate-600 transition-colors">
              {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          }
        />
        {err && <Alert variant="error">{err}</Alert>}
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
    { id: 'standard', title: 'Resumo Clínico', desc: '1 a 2 páginas: queixa, hipóteses, plano atual, últimas evoluções e conduta.' },
    { id: 'full', title: 'Prontuário Completo', desc: 'Documento longo com capa e sumário: cadastro, anamnese, avaliações, plano, todas as sessões, instrumentos, documentos, anexos e linha do tempo. Não inclui o campo restrito.' },
    { id: 'no_restricted', title: 'Versão Compartilhada', desc: 'Mesmo formato do prontuário completo, só com campos públicos/compartilhados, e faixa de versão compartilhada.' },
    { id: 'restricted_only', title: 'Anotações Restritas', desc: 'Apenas o campo restrito, com selo RESTRITO no cabeçalho (uso interno autorizado).' },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Exportar Documentação"
      size="md"
      footer={
        <ModalFooter>
           <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
           <Button onClick={() => onExport(mode, 'pdf')} variant="outline" size="sm" iconLeft={<FileText size={14}/>}>
             Gerar PDF
           </Button>
           <Button onClick={() => onExport(mode, 'word')} variant="primary" size="sm" iconLeft={<Download size={14}/>}>
             Gerar Word
           </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-600">Selecione o conteúdo</p>
        <div className="grid grid-cols-1 gap-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id as ExportMode)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                mode === opt.id
                  ? 'bg-primary-50 border-primary-500 text-primary-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300'
              }`}
            >
              <div className="font-medium text-[13px]">{opt.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
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
    description: 'Registro de cada sessão: tema, relato, intervenções, resposta, tarefas e plano da próxima',
    icon: '📋', color: 'indigo',
    bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700', iconBg: 'bg-primary-100',
  },
  {
    key: 'Anamnese', label: 'Anamnese',
    description: 'Histórico do paciente coletado via formulário remoto enviado ao e-mail',
    icon: '📝', color: 'violet',
    bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100',
  },
  {
    key: 'Avaliacao', label: 'Avaliação Clínica',
    description: 'Documento por seções: queixa, formulação, estado mental, instrumentos, riscos e conclusão',
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
    bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700', iconBg: 'bg-primary-100',
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

const TYPE_ICONS: Record<string, React.ElementType> = {
  Evolucao: ClipboardCheck, Anamnese: BookOpen, Avaliacao: Brain, Plano: Layers, Relatorio: FileText, Encaminhamento: Share2, Atestado: CheckCheck,
};

const RecordTypeSelector: React.FC<{
  onSelect: (type: string) => void;
  onClose: () => void;
  patientName?: string;
  existing?: Record<string, string>;
}> = ({ onSelect, onClose, patientName, existing = {} }) => (
  <Modal isOpen onClose={onClose} title="Novo Registro Clínico" subtitle={patientName} size="2xl">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TYPE_DEFINITIONS.map(t => {
        const TypeIcon = TYPE_ICONS[t.key] || FileText;
        return (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/40 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-md bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <TypeIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[13px] text-slate-800">{existing[t.key] || t.label}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{existing[t.key] ? 'Já existe para este paciente: abre o registro atual para atualizar (sem criar outro).' : t.description}</p>
          </div>
        </button>
        );
      })}
    </div>
  </Modal>
);

const RecordViewer: React.FC<{ record: MedicalRecord; patient?: Patient; onClose: () => void; onEdit: () => void }> = ({ record, patient, onClose, onEdit }) => {
  const organized = useMemo(() => {
    if (!record.ai_organized_content) return null;
    try { return JSON.parse(record.ai_organized_content); } catch { return null; }
  }, [record]);

  const structured = useMemo(() => parseStructured(record.ai_organized_content), [record]);
  const reviewPoints: string[] = organized?.pontos_revisao || [];
  const fields =ORGANIZED_FIELDS_LABELS.filter(f => organized?.[f.key]);

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

    const bodyText = `Atesto para os devidos fins que o(a) paciente ${patName}${patCPF} esteve sob meus cuidados profissionais.`;
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
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}  |  Plaelo`, W / 2, 289, { align: 'center' });

    const fileName = `Atestado_${tipo}_${(patient?.full_name || 'paciente').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={record.title}
      size="2xl"
      footer={
        <ModalFooter align="between">
           <div className="flex flex-wrap gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{record.status}</span>
              {record.ai_status === 'organized' && <Badge color="purple" icon={<Sparkles size={11}/>}>Organizado IA</Badge>}
           </div>
           <div className="flex flex-wrap gap-2">
              {record.record_type === 'Atestado' && (
                <Button variant="outline" size="sm" onClick={generateAtestadoPDF} iconLeft={<Download size={14}/>}>PDF</Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
              <Button onClick={onEdit} variant="primary" size="sm" iconLeft={<Edit3 size={14}/>}>Editar</Button>
           </div>
        </ModalFooter>
      }
    >
        <div className="space-y-6 pt-2">
          {/* Header Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
             <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Profissional</span>
                <span className="text-sm font-semibold text-slate-700">{record.professional_name || '—'}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Tipo</span>
                <span className="text-sm font-semibold text-slate-700">{TYPE_LABELS[record.record_type] || record.record_type}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Modalidade</span>
                <span className="text-sm font-semibold text-slate-700 capitalize">{record.appointment_type || '—'}</span>
             </div>
             <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Horário</span>
                <span className="text-sm font-semibold text-slate-700">{record.start_time ? `${record.start_time}${record.end_time ? ` – ${record.end_time}` : ''}` : '—'}</span>
             </div>
          </div>

          {/* Review points */}
          {reviewPoints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0"/>
              <div>
                <p className="font-semibold text-amber-800 text-xs mb-1">Pontos para revisão humana</p>
                <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-semibold">• {p}</li>)}</ul>
              </div>
            </div>
          )}

          {/* Organized fields */}
          {structured ? (
            <StructuredReadView sections={getSections(structured.template, structured.kind)} values={structured.values} />
          ) : organized && fields.length > 0 ? (
            <div className="space-y-5">
              {fields.map(f => (
                <div key={f.key} className="group">
                  <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[11px] font-semibold text-primary-600">{f.label}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-5">
                    <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{organized[f.key]}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-6">
              <p className="text-[11px] font-semibold text-slate-400 mb-4">Conteúdo Original do Registro</p>
              <div className="text-sm text-slate-700 font-medium leading-relaxed text-editor-content" dangerouslySetInnerHTML={{ __html: record.content || record.draft_content || '<em>Sem conteúdo registrado</em>' }}/>
            </div>
          )}

          {/* Draft content if has organized */}
          {organized && record.draft_content && (
            <div className="pt-4 border-t border-slate-100">
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-primary-600 transition list-none flex items-center gap-2 outline-none">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center group-open:bg-primary-50 group-open:text-primary-600 transition-colors">
                    <ChevronRight size={14} className="group-open:rotate-90 transition-transform"/> 
                  </div>
                  Exibir Rascunho Bruto (Histórico)
                </summary>
                <div className="mt-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 p-5">
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{strip(record.draft_content)}</p>
                </div>
              </details>
            </div>
          )}

          {/* Anexos */}
          {record.attachments && record.attachments.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Layers size={14} className="text-primary-500"/> Anexos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {record.attachments.map((att: any, idx: number) => {
                  const isImage = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name || '');
                  const url = getStaticUrl(att.file_url || att.url);
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-primary-300 transition-colors group">
                      {isImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 group-hover:border-primary-300 transition-colors">
                          <img src={url} alt={att.file_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                          <FileText size={18} className="text-primary-500" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-primary-600 transition-colors">{att.file_name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{att.file_size ? (att.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Tamanho desconhecido'}</p>
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
                <span className="text-[11px] font-semibold text-slate-400">Tags:</span>
                <div className="flex gap-1">
                  {record.tags && record.tags.length > 0 ? record.tags.map((t, i) => <span key={i} className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">{t}</span>) : <span className="text-[11px] text-slate-300 font-semibold italic">Nenhuma</span>}
                </div>
              </div>
              <div className="flex-1" />
              <div className="text-[11px] text-slate-300 font-semibold">ID: {String(record.id).split('-')[0]}...</div>
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
      size="md"
      footer={<ModalFooter><Button variant="primary" size="sm" onClick={onClose}>Concluir</Button></ModalFooter>}
    >
      <div className="space-y-6 pt-2">
        {/* Com Acesso */}
        {sharedProfessionals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 px-1">Profissionais com Acesso</h4>
            <div className="grid gap-2">
              {sharedProfessionals.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-primary-50/50 border border-primary-100 group transition-all hover:bg-primary-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm shadow-sm group-hover:scale-105 transition-transform">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-700 text-sm truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">{p.email || '—'}</div>
                    </div>
                  </div>
                                    <IconButton size="sm" variant="ghost" onClick={() => revoke(String(p.id))} title="Remover acesso" aria-label="Remover acesso" className="text-red-600 hover:bg-red-50">
                    <Trash2 size={14}/>
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-slate-400 px-1">Conceder Novo Acesso</h4>
          {availableProfessionals.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-400 font-medium">Todos os profissionais já possuem acesso a este registro.</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select wrapperClassName="flex-1" aria-label="Profissional" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Selecione um profissional...</option>
                {availableProfessionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </Select>
              <Button onClick={share} disabled={!selectedId || saving} loading={saving} variant="primary" size="md" iconLeft={<Plus size={14}/>}>
                Conceder
              </Button>
            </div>
          )}
        </div>

        <Alert variant="warning">
          O compartilhamento permite que outros profissionais visualizem e editem este registro. O proprietário original mantém o controle da auditoria.
        </Alert>
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
/** Texto do DISC a partir dos escores (a análise anterior da Bia, se houver, vai junto). */
const discSourceText = (item: any) => {
  const sc = item.data?.scores || {};
  const lines = ['Perfil comportamental DISC (escores brutos):', 'Dominância (D): ' + (sc.D ?? 0), 'Influência (I): ' + (sc.I ?? 0), 'Estabilidade (S): ' + (sc.S ?? 0), 'Conformidade (C): ' + (sc.C ?? 0)];
  if (item.score != null) lines.push('Pontuação total: ' + item.score);
  if (item.auroraAnalysis) lines.push('', 'Análise anterior da Bia IA:', String(item.auroraAnalysis));
  return lines.join(String.fromCharCode(10));
};

const LinkedToolsSection: React.FC<{ 
  patientId: string; 
  onSelectSource?: (item: any) => void;
  variant?: 'full' | 'sidebar';
  /** Fontes já trazidas para o texto livre (Em uso). */
  usedIds?: string[];
  /** Monta a avaliação clínica com IA a partir das fontes em uso. */
  onBuildAssessment?: () => void;
}> = ({ patientId, onSelectSource, variant = 'full', usedIds = [], onBuildAssessment }) => {
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

  const [loadingUse, setLoadingUse] = useState<string | null>(null);
  const fetchFullText = async (item: any): Promise<string> => {
    if (item.type === 'disc') return discSourceText(item);
    const kind = item.type === 'anamnese' ? 'anamnese' : item.type === 'form_response' ? 'form_response' : 'tool';
    const r = await api.post<any>('/medical-records/source-text', { patient_id: patientId, type: kind, id: item.rawId });
    return String(r?.text || '').trim();
  };
  const NL = String.fromCharCode(10);
  const useSource = async (item: any, silent = false) => {
    if (!onSelectSource || usedIds.includes(item.id)) return;
    setLoadingUse(item.id);
    try {
      const body = await fetchFullText(item);
      if (!body) { if (!silent) pushToast('info', 'Esta fonte não tem conteúdo preenchido para trazer.'); return; }
      onSelectSource({ ...item, summary: '### FONTE: ' + item.name + ' (' + fmtDate(item.date) + ')' + NL + body });
    } catch (e: any) {
      pushToast('error', e?.message || 'Não foi possível carregar o conteúdo completo desta fonte.');
    } finally { setLoadingUse(null); }
  };
  const useAllSources = async () => {
    for (const item of filtered) { if (!usedIds.includes(item.id)) await useSource(item, true); }
  };
  const [viewText, setViewText] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  useEffect(() => {
    if (!viewing) { setViewText(''); return; }
    let alive = true;
    setViewLoading(true);
    fetchFullText(viewing).then(t => { if (alive) setViewText(t || 'Sem conteúdo preenchido.'); }).catch(() => { if (alive) setViewText('Não foi possível carregar o conteúdo.'); }).finally(() => { if (alive) setViewLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing]);

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
                  contextStr += `${label}: ${String(value)}\n`;
                }
              });
            } catch {
              contextStr += `Dados da anamnese: ${String(t.responses).substring(0, 3000)}\n`;
            }
          } else {
            contextStr += `  (Dados da anamnese não disponíveis)\n`;
          }

        } else if (t.type === 'form_response') {
          // Formulários respondidos (PHQ-9, GAD-7, Beck, etc.)
          contextStr += `Tipo: Formulário Clínico\n`;
          if (t.score != null) contextStr += `Pontuação Total: ${t.score}\n`;
          if (t.data?.answers) {
            const answers = t.data.answers;
            Object.entries(answers).forEach(([qId, answer]: [string, any]) => {
              if (answer && String(answer).trim()) {
                contextStr += `${qId}: ${String(answer)}\n`;
              }
            });
          } else if (t.data) {
            contextStr += `Dados: ${JSON.stringify(t.data).substring(0, 2000)}\n`;
          }

        } else if (t.type === 'disc') {
          // Avaliação DISC
          contextStr += `Tipo: Avaliação de Perfil Comportamental DISC\n`;
          const s = t.data?.scores || {};
          contextStr += `Dominância (D): ${s.D || 0}\n`;
          contextStr += `Influência (I): ${s.I || 0}\n`;
          contextStr += `Estabilidade (S): ${s.S || 0}\n`;
          contextStr += `Conformidade (C): ${s.C || 0}\n`;
          if (t.auroraAnalysis) {
            contextStr += `Análise Bia IA anterior: ${String(t.auroraAnalysis).substring(0, 2000)}\n`;
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
        name: 'Síntese Clínica Bia IA',
        summary: `\n## SÍNTESE CLÍNICA INTEGRADA (IA)\n**Abordagem:** ${approach}\n\n${content}\n\n[Nota: Esta análise foi gerada automaticamente pela Bia IA integrando ${selectedIds.length} fontes de dados. Revise antes de aprovar.]`
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
    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 gap-3">
      <Loader2 size={24} className="text-primary-500 animate-spin" />
      <p className="text-[11px] font-semibold text-slate-400">Sincronizando fonte histórico...</p>
    </div>
  );

  const isSidebar = variant === 'sidebar';

  return (
    <div className={`bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col ${isSidebar ? 'h-full max-h-[1000px]' : 'space-y-3 p-4'}`}>
      <div className={`flex flex-col gap-4 ${isSidebar ? 'p-5 bg-slate-50/50 border-b border-slate-100' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 shrink-0">
            <ClipboardCheck size={20} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate">Fontes Pin-Clínico</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">Documentos vinculados ao caso.</p>
          </div>
        </div>
        
        {isSidebar && onSelectSource && filtered.length > 0 && (
          <Button size="sm" variant="outline" iconLeft={<CheckCheck size={14} />} onClick={useAllSources} disabled={filtered.every(f => usedIds.includes(f.id))}>Usar todas as fontes</Button>
        )}
        <div className={`flex gap-2 ${isSidebar ? 'flex-col' : ''}`}>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Instrumento..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              iconLeft={<Search size={14} />}
            />
          </div>
          {!isSidebar && (
            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          )}
        </div>
      </div>

      <div className={`${isSidebar ? 'flex-1 overflow-y-auto p-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-100 border-dashed">
            <Info size={20} className="text-slate-300 mx-auto mb-2" />
            <p className="text-[11px] text-slate-400 font-medium italic">Sem registros vinculados.</p>
          </div>
        ) : (
          filtered.map(item => {
            const isTool = item.type !== 'anamnese';
            const hasHistory = isTool && Array.isArray(item.data) && item.data.length > 1;

            return (
              <div key={item.id} className={`group flex flex-col p-4 rounded-lg border transition-all duration-300 relative ${isSidebar ? 'mb-3 bg-white hover:bg-slate-50 border-slate-100 hover:border-primary-200' : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-sm'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.category === 'Anamnese' ? 'bg-primary-50 text-primary-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {item.category === 'Anamnese' ? <ClipboardCheck size={16}/> : <Activity size={16}/>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 mb-0.5 truncate">{item.category}</p>
                      <h4 className="font-semibold text-slate-700 leading-tight text-[11px] truncate">{item.name}</h4>
                    </div>
                  </div>
                  {hasHistory && (
                     <div className="bg-amber-100 text-amber-600 text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <History size={10} /> +{item.data.length}
                     </div>
                  )}
                </div>

                <div className="space-y-1.5 mb-4 text-[11px] text-slate-500 font-medium">
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
                    <IconButton
                      size="sm"
                      variant={selectedIds.includes(item.id) ? 'primary' : 'outline'}
                      onClick={() => toggleSelect(item.id)}
                      title={selectedIds.includes(item.id) ? 'Remover da seleção' : 'Selecionar para síntese IA'}
                      aria-label={selectedIds.includes(item.id) ? 'Remover da seleção' : 'Selecionar para síntese IA'}
                    >
                      <CheckCheck size={14} />
                    </IconButton>
                  )}
                  {usedIds.includes(item.id) ? (
                    <Button size="sm" variant="outline" className="flex-1" disabled iconLeft={<CheckCircle2 size={14} />}>Em uso</Button>
                  ) : (
                    <Button size="sm" variant="success" className="flex-1" loading={loadingUse === item.id} onClick={() => useSource(item)}>
                      Usar Fonte
                    </Button>
                  )}
                  {hasHistory && (
                    <IconButton size="sm" variant="outline" onClick={() => setComparing(item.id)} title="Análise Longitudinal" aria-label="Análise Longitudinal">
                      <BarChart2 size={14} />
                    </IconButton>
                  )}
                  <IconButton size="sm" variant="ghost" title="Ver Detalhes" aria-label="Ver Detalhes" onClick={() => setViewing(item)}>
                    <Eye size={14} />
                  </IconButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`p-4 bg-primary-50/50 rounded-b-lg border-t border-primary-100 flex flex-col gap-3 mt-auto ${isSidebar ? '' : 'rounded-lg'}`}>
        <div className="flex items-start gap-3">
          <Sparkles size={16} className="text-primary-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-primary-700 font-medium leading-relaxed">
            <strong>Assistente Bia:</strong> {selectedIds.length > 0 ? `Você selecionou ${selectedIds.length} fontes para análise.` : 'Selecione fontes para gerar uma síntese clínica.'}
          </p>
        </div>
        
        {isSidebar && (
          <Button 
             variant="primary" 
             className="w-full h-10 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[11px] gap-2  disabled:opacity-50"
             disabled={selectedIds.length === 0}
             onClick={() => setShowSynthesisModal(true)}
          >
             <Brain size={14} /> Gerar Análise de Caso (IA)
          </Button>
        )}
        {isSidebar && onBuildAssessment && (
          <Button variant="primary" size="sm" className="w-full" iconLeft={<Sparkles size={14} />} onClick={onBuildAssessment}>
            Montar avaliação clínica{usedIds.length ? ' (' + usedIds.length + ' fonte' + (usedIds.length > 1 ? 's' : '') + ' em uso)' : ''}
          </Button>
        )}
      </div>

      {/* Modal de Parâmetros de Síntese IA */}
      {showSynthesisModal && (
        <Modal isOpen={true} onClose={() => setShowSynthesisModal(false)} title="Síntese Clínica com IA" size="lg">
           <div className="space-y-6">
              <div className="bg-primary-50 p-5 rounded-lg border border-primary-100 flex items-start gap-3">
                 <Brain size={24} className="text-primary-600 shrink-0" />
                 <div>
                    <h4 className="font-semibold text-primary-900 text-xs mb-1">Análise Multidimensional</h4>
                    <p className="text-[11px] text-primary-700 font-medium">Bia irá cruzar os dados das {selectedIds.length} fontes selecionadas para criar uma síntese clínica estruturada.</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-semibold text-slate-400 px-1">Selecione sua Abordagem Terapêutica</label>
                 <Select
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
                 </Select>
                 <p className="text-[11px] text-slate-400 italic px-1">A IA utilizará terminologia e conceitos específicos desta abordagem.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                 <Button type="button" variant="outline" size="sm" onClick={() => setShowSynthesisModal(false)}>
                    Cancelar
                 </Button>
                 <Button
                   onClick={handleGenerateSynthesis}
                   loading={synthesisLoading}
                   variant="primary"
                   size="sm"
                 >
                    <Brain size={14} /> Iniciar Processamento IA
                 </Button>
              </div>
           </div>
        </Modal>
      )}

      {/* Modal de Comparação Longitudinal Simples */}
      {comparing && (
        <Modal isOpen={true} onClose={() => setComparing(null)} title="Análise Longitudinal" size="lg">
           <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <p className="text-xs text-slate-500 font-medium">Comparando aplicações históricas do instrumento para análise de evolução clínica.</p>
              </div>
              <div className="grid gap-3">
                 {tools.find(t => t.id === comparing)?.data?.slice().reverse().map((entry: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">{fmtDate(entry.date)}</p>
                        <p className="text-xs font-semibold text-slate-700">Resultado: {JSON.stringify(entry.scores || entry.score || entry.answers || {})}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold  ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                           {i === 0 ? 'Mais Recente' : 'Anterior'}
                         </span>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 border-dashed">
                 <p className="text-[11px] text-amber-700 font-medium text-center">Visualização gráfica em desenvolvimento. Utilize a comparação de escores brutos para avaliação clínica.</p>
              </div>
           </div>
        </Modal>
      )}

      {/* Modal de Detalhes da Fonte */}
      {viewing && (
        <Modal isOpen={true} onClose={() => setViewing(null)} title="Detalhes da Fonte" size="lg">
           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-400">Data da Coleta</span>
                    <span className="text-xs font-semibold text-slate-700">{fmtDate(viewing.date)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-400">Origem</span>
                    <span className="text-xs font-semibold text-emerald-600">{viewing.origin}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                    <FileText size={14} className="text-primary-500"/> Conteúdo do Registro
                 </h4>
                 
                 {viewLoading ? (
                   <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-primary-500" /></div>
                 ) : (
                   <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-white p-4 text-[13px] leading-relaxed text-slate-700">{viewText}</p>
                 )}
              </div>
           </div>
           <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewing(null)} variant="primary" className="h-10 px-6 text-[11px] font-semibold">Fechar</Button>
           </div>
        </Modal>
      )}
    </div>
  );
};

type EditorSection = 'dados' | 'estrutura' | 'conteudo' | 'restrito' | 'anexos' | 'historico';
type EditorTabId = 'dados' | 'estrutura' | 'rascunho' | 'revisao' | 'restrito' | 'anexos' | 'historico';
const EDITOR_TABS = [
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'estrutura', label: 'Registro', icon: ClipboardList },
  { id: 'rascunho', label: 'Rascunho', icon: FileText },
  { id: 'revisao', label: 'Revisão IA', icon: Sparkles },
  { id: 'restrito', label: 'Restrito', icon: Shield },
  { id: 'anexos', label: 'Anexos', icon: Layers },
  { id: 'historico', label: 'Histórico', icon: History },
] as const;
const RecordEditor: React.FC<{
  record: Partial<MedicalRecord> | null; mode: 'new' | 'edit';
  patients: Patient[]; selectedPatientId: string | null;
  onSave: () => void; onClose: () => void;
  onExport: () => void;
  anamnesisSends: any[];
  planRecordId?: string;
  nextSessionNumber?: number;
  patientRecords?: MedicalRecord[];
  onExists?: (id: string) => void;
}> = ({ record, mode, patients, selectedPatientId, onSave, onClose, onExport, anamnesisSends, planRecordId, nextSessionNumber, patientRecords = [], onExists }) => {
  const { pushToast } = useToast();
  const { user: authUser, hasPermission } = useAuth();
  const canUseAi = hasPermission('access_ai_features');
  const initialStructured = useMemo(() => parseStructured(record?.ai_organized_content), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Id do registro em edição: nasce no primeiro salvamento (rascunho automático) e evita duplicar registros novos.
  const recordIdRef = useRef<string | null>(record?.id ? String(record.id) : null);
  // Reavaliação: reabre a MESMA avaliação (data de hoje) e grava uma versão 'reavaliacao' no histórico ao salvar.
  const reassess = !!(record as any)?.__reassess;
  const [reassessNote, setReassessNote] = useState('');
  const [existsInfo, setExistsInfo] = useState<{ id?: string; message: string } | null>(null);
  const [showClinical, setShowClinical] = useState(false);
  const [step, setStep] = useState<'draft' | 'ai_result' | 'approve'>(
    // O Plano Terapêutico possui um editor próprio. Planos antigos também podem
    // ter conteúdo organizado sem o marcador v2; ainda assim devem abrir no
    // editor atual, que faz a migração preservando os dados.
    record?.record_type !== 'Plano' && record?.ai_organized_content && !initialStructured ? 'ai_result' : 'draft'
  );
  const hhmm = (t?: string | null) => (t || '').slice(0, 5);
  const recordDay = (r?: { created_at?: string } | null) => {
    if (!r?.created_at) return '';
    const d = new Date(r.created_at);
    return isNaN(d.getTime()) ? String(r.created_at).split('T')[0] : localDateStr(d);
  };
  const [patientId, setPatientId] = useState(record?.patient_id || selectedPatientId || '');
  const [title, setTitle] = useState(record?.title || `Evolução — ${new Date().toLocaleDateString('pt-BR')}`);
  const [recordType, setRecordType] = useState(record?.record_type || 'Evolucao');
  const typeLocked = mode === 'new' && !!record?.record_type;
  const legacyAppointmentType = record?.appointment_type || 'individual';
  const [formato, setFormato] = useState<string>(FORMATOS.some(f => f.value === legacyAppointmentType) ? legacyAppointmentType : 'individual');
  const [modalidade, setModalidade] = useState<string>(
    initialStructured?.meta?.modalidade || (['online', 'presencial'].includes(legacyAppointmentType) ? legacyAppointmentType : 'presencial')
  );
  const [sessionDate, setSessionDate] = useState(reassess ? localDateStr(new Date()) : (recordDay(record) || localDateStr(new Date())));
  const [startTime, setStartTime] = useState(hhmm(record?.start_time) || (mode === 'new' ? localTimeStr(new Date()) : ''));
  const initialDuration: number | null = initialStructured?.meta?.duracao_min
    ?? diffMinutes(hhmm(record?.start_time), hhmm(record?.end_time))
    ?? (mode === 'new' && !record?.end_time ? 50 : null);
  const [durationMin, setDurationMin] = useState(initialDuration ? String(initialDuration) : '');
  const [endTime, setEndTime] = useState(() => {
    if (record?.end_time) return hhmm(record.end_time);
    const s = timeToMin(hhmm(record?.start_time) || (mode === 'new' ? localTimeStr(new Date()) : ''));
    return mode === 'new' && s !== null && initialDuration ? minToTime(s + initialDuration) : '';
  });
  const [appointmentId, setAppointmentId] = useState<string>(String((record as any)?.appointment_id || initialStructured?.meta?.agendamento_id || ''));
  const [status, setStatus] = useState(reassess ? 'Rascunho' : (record?.status || 'Rascunho'));
  const [tags, setTags] = useState<string[]>(Array.isArray(record?.tags) ? (record!.tags as string[]) : []);
  const approvedRecord = status === 'Aprovado' || status === 'Finalizado';
  const [approvedEditUnlocked, setApprovedEditUnlocked] = useState(false);
  const [showUnlockEditModal, setShowUnlockEditModal] = useState(false);
  const locked = approvedRecord && !approvedEditUnlocked;
  const [attachments, setAttachments] = useState<any[]>(record?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(strip(record?.draft_content || ''));
  const [privateNotes, setPrivateNotes] = useState(strip(record?.restricted_content || ''));
  const [organized, setOrganized] = useState<any>(null);
  const [reviewPoints, setReviewPoints] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Histórico: evento da próxima gravação (IA aplicada / restaurado), restauração pendente e dados de autoria.
  const historyEventRef = useRef<'ia' | 'restaurado' | 'reavaliacao' | null>(reassess ? 'reavaliacao' : null);
  const restoredFromRef = useRef<number | null>(null);
  const [restorePending, setRestorePending] = useState<number | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [auditInfo, setAuditInfo] = useState<{ created_by?: string | null; created_at?: string | null; last_by?: string | null; last_at?: string | null } | null>(null);
  useEffect(() => {
    if (!recordIdRef.current) return;
    let alive = true;
    api.get<any>(`/medical-records/${recordIdRef.current}/history`, { light: '1' }).then(r => { if (alive) setAuditInfo(r?.meta || null); }).catch(() => {});
    return () => { alive = false; };
  }, [historyTick, record?.id]);


  // Plano Terapêutico — estado isolado quando recordType === 'Plano'
  const [theraPlan, setTheraPlan] = useState<TheraPlan>(() => {
    if (record?.ai_organized_content) {
      try { return JSON.parse(record.ai_organized_content) as TheraPlan; } catch {}
    }
    return { ...EMPTY_PLAN };
  });
  const handleTheraPlanChange = useCallback((updater: TheraPlan | ((p: TheraPlan) => TheraPlan)) => {
    if (locked) return;
    setTheraPlan((prev: TheraPlan) => typeof updater === 'function' ? updater(prev) : updater);
  }, [locked]);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const isStructured = recordType === 'Evolucao' || recordType === 'Avaliacao' || recordType === 'Anamnese';
  const detectedSpecialty = useMemo(() => detectSpecialty(authUser as any), [authUser]);
  const [specialty, setSpecialty] = useState<SpecialtyId>(initialStructured?.template || detectedSpecialty || DEFAULT_SPECIALTY);
  const isEvolucao = recordType === 'Evolucao';

  // Sessão anterior do paciente (a evolução imediatamente anterior a esta) — base das pendências e da duplicação.
  const previousInfo = useMemo(() => {
    const currentDay = record?.created_at ? new Date(record.created_at).getTime() : Date.now();
    const prev = patientRecords
      .filter(r => r.record_type === 'Evolucao' && String(r.id) !== String(record?.id || '') && (mode === 'new' || new Date(r.created_at).getTime() <= currentDay))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const st = prev ? parseStructured(prev.ai_organized_content) : null;
    if (!prev || !st) return null;
    const v = st.values || {};
    const info: PreviousSession = {
      numero: v.sessao_numero ? String(v.sessao_numero) : undefined,
      data: fmtDate(prev.created_at),
      proxima: String(v.proxima || '').trim(),
      tarefas: splitTasks(v.tarefas),
    };
    return { info, values: v as StructuredValues };
  }, [patientRecords, record?.id, record?.created_at, mode]);

  const [sValues, setSValues] = useState<StructuredValues>(() => {
    if (initialStructured?.values) return initialStructured.values;
    // Nova evolução: já traz as tarefas da sessão anterior para o profissional registrar o retorno.
    if (mode === 'new' && (record?.record_type || 'Evolucao') === 'Evolucao' && previousInfo?.info.tarefas.length) {
      return { tarefas_retorno: previousInfo.info.tarefas.map(tarefa => ({ tarefa })) };
    }
    return {};
  });
  const sValuesRef = useRef(sValues);
  sValuesRef.current = sValues;
  const ocorrencia = String(sValues.ocorrencia || 'Sessão realizada');
  const absent = isEvolucao && isAbsenceOc(ocorrencia);
  const [aiFields, setAiFields] = useState<string[]>(initialStructured?.ai_fields || []);
  const [aiSources, setAiSources] = useState<Record<string, string[]>>(initialStructured?.ai_sources || {});
  const [sessionNumber, setSessionNumber] = useState<string>(
    initialStructured?.values?.sessao_numero
      ? String(initialStructured.values.sessao_numero)
      : (recordType === 'Evolucao'
        ? String(patientRecords.filter(r => r.record_type === 'Evolucao' && String(r.id) !== String(record?.id || '') && recordDay(r) <= sessionDate).length + 1 || nextSessionNumber || '')
        : '')
  );
  const [numberTouched, setNumberTouched] = useState(!!initialStructured?.values?.sessao_numero);
  const [planGoals, setPlanGoals] = useState<string[]>([]);
  const structuredKind = (recordType === 'Avaliacao' || recordType === 'Anamnese' ? recordType : 'Evolucao') as RecordKind;
  const sections = useMemo(() => getSections(specialty, structuredKind), [specialty, structuredKind]);
  const handleStructuredChange = useCallback((key: string, value: any) => {
    if (locked) return;
    setSValues(prev => ({ ...prev, [key]: value }));
    setAiFields(prev => (prev.includes(key) ? prev.filter(k => k !== key) : prev));
  }, [locked]);
  const confirmAiField = useCallback((key: string) => setAiFields(prev => prev.filter(k => k !== key)), []);
  // Aviso de "modelo anterior" só para registros antigos já salvos (os novos sempre nascem estruturados).
  const isLegacyRecord = isStructured && mode === 'edit' && !initialStructured && !!(record?.id && (record.ai_organized_content || record.draft_content || record.content));

  // Sugestão de nº da sessão: posição cronológica entre as evoluções do paciente até a data escolhida.
  const suggestNumberFor = useCallback((day: string) => {
    const before = patientRecords.filter(r => r.record_type === 'Evolucao' && String(r.id) !== String(recordIdRef.current || '') && recordDay(r) <= day).length;
    return before + 1;
  }, [patientRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestedNumber = useMemo(() => suggestNumberFor(sessionDate), [suggestNumberFor, sessionDate]);

  // Título automático segue a data enquanto o profissional não personalizar.
  const typeWord = isEvolucao ? 'Evolução' : (TYPE_LABELS[recordType] || 'Registro');
  const autoTitle = `${typeWord} — ${fmtIsoDate(sessionDate)}`;
  const isAutoTitle = (t: string) => /^[^—]{2,40} — \d{2}\/\d{2}\/\d{4}( \(v\d+\))?$/.test(t.trim());
  const changeDate = (day: string) => {
    setSessionDate(day);
    if (day && isAutoTitle(title)) setTitle(`${typeWord} — ${fmtIsoDate(day)}`);
    if (day && !numberTouched) setSessionNumber(String(suggestNumberFor(day)));
  };

  // Horário: editar início/fim recalcula a duração; editar a duração recalcula o fim.
  const changeStart = (v: string) => {
    setStartTime(v);
    const s = timeToMin(v);
    if (s === null) return;
    const d = endTime ? diffMinutes(v, endTime) : null;
    if (d !== null) setDurationMin(String(d));
    else if (Number(durationMin) > 0) setEndTime(minToTime(s + Number(durationMin)));
  };
  const changeEnd = (v: string) => {
    setEndTime(v);
    const d = diffMinutes(startTime, v);
    if (d !== null) setDurationMin(String(d));
  };
  const changeDuration = (v: string) => {
    setDurationMin(v);
    const n = Number(v);
    const s = timeToMin(startTime);
    if (n > 0 && s !== null) setEndTime(minToTime(s + n));
  };

  // Agendamentos do paciente (para vincular e sugerir)
  const [appointments, setAppointments] = useState<AppointmentLite[]>([]);
  useEffect(() => {
    if (!patientId || !isStructured) { setAppointments([]); return; }
    let alive = true;
    api.get<any[]>('/appointments', { patient_id: String(patientId) }).then(rows => {
      if (!alive) return;
      const list: AppointmentLite[] = (Array.isArray(rows) ? rows : [])
        .filter(a => a?.start_time && !/cancel/i.test(String(a.status || '')))
        .map(a => {
          const raw = String(a.start_time).replace(' ', 'T');
          const start = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`);
          const day = localDateStr(start);
          return {
            id: String(a.id), start, durationMin: Number(a.duration_minutes) || 50, modality: a.modality,
            label: `${fmtIsoDate(day).slice(0, 5)} ${localTimeStr(start)} · ${a.title || a.service_name || 'Atendimento'}`,
          };
        })
        .filter(a => !isNaN(a.start.getTime()));
      setAppointments(list);
    }).catch(() => { if (alive) setAppointments([]); });
    return () => { alive = false; };
  }, [patientId, isStructured]);
  const appointmentOptions = useMemo(() => {
    const base = new Date(`${sessionDate || localDateStr(new Date())}T12:00:00`).getTime();
    const win = 30 * 24 * 3600 * 1000;
    const list = appointments.filter(a => Math.abs(a.start.getTime() - base) <= win || a.id === appointmentId);
    return list.sort((a, b) => Math.abs(a.start.getTime() - base) - Math.abs(b.start.getTime() - base));
  }, [appointments, sessionDate, appointmentId]);
  const suggestedAppointment = useMemo(() => {
    if (appointmentId) return null;
    const sameDay = appointments.filter(a => localDateStr(a.start) === sessionDate);
    if (!sameDay.length) return null;
    const now = Date.now();
    return sameDay.sort((a, b) => Math.abs(a.start.getTime() - now) - Math.abs(b.start.getTime() - now))[0];
  }, [appointments, appointmentId, sessionDate]);

  // Humor do dia vindo do diário de humor do paciente (mesmo agendamento)
  const [moodHint, setMoodHint] = useState('');
  const applyMoodFromAppointment = useCallback(async (aptId: string) => {
    if (!patientId || !aptId || !isEvolucao) return;
    try {
      const logs = await api.get<any[]>(`/patients/${patientId}/mood-logs`, { appointment_id: String(aptId) });
      const humor = humorFromScore(Array.isArray(logs) ? logs[0]?.mood_score : null);
      if (humor && !hasValue(sValuesRef.current.humor)) {
        setSValues(prev => (hasValue(prev.humor) ? prev : { ...prev, humor }));
        setMoodHint(`Humor preenchido a partir do registro do paciente neste atendimento (${humor}). Ajuste se necessário.`);
      }
    } catch { /* sem diário de humor: segue manual */ }
  }, [patientId, isEvolucao]);
  const moodAutoRef = useRef(false);
  useEffect(() => {
    if (mode !== 'new' || moodAutoRef.current || !suggestedAppointment) return;
    moodAutoRef.current = true;
    applyMoodFromAppointment(suggestedAppointment.id);
  }, [mode, suggestedAppointment, applyMoodFromAppointment]);

  const linkAppointment = (id: string) => {
    setAppointmentId(id);
    if (!id) return;
    const a = appointments.find(x => x.id === id);
    if (!a) return;
    const day = localDateStr(a.start);
    const t = localTimeStr(a.start);
    const s = timeToMin(t);
    setSessionDate(day);
    if (isAutoTitle(title)) setTitle(`${typeWord} — ${fmtIsoDate(day)}`);
    setStartTime(t);
    setDurationMin(String(a.durationMin));
    if (s !== null) setEndTime(minToTime(s + a.durationMin));
    if (a.modality === 'online' || a.modality === 'presencial') setModalidade(a.modality);
    if (isEvolucao) { setSessionNumber(String(suggestNumberFor(day))); setNumberTouched(false); }
    applyMoodFromAppointment(id);
    pushToast('success', 'Dados preenchidos com o agendamento.');
  };

  const tagSuggestions = useMemo(() => {
    const used = new Set<string>();
    patientRecords.forEach(r => (Array.isArray(r.tags) ? r.tags : []).forEach(t => used.add(String(t))));
    return [...Array.from(used), ...DEFAULT_TAG_SUGGESTIONS];
  }, [patientRecords]);

  useEffect(() => {
    if (!isStructured || !planRecordId) return;
    api.get<any>(`/medical-records/${planRecordId}`).then(d => {
      try {
        const plan = JSON.parse(d?.ai_organized_content || '{}');
        setPlanGoals((plan.goals || []).map((g: any) => String(g.description || '').trim()).filter(Boolean));
      } catch { /* plano sem metas */ }
    }).catch(() => {});
  }, [isStructured, planRecordId]);

  const [editorSection, setEditorSection] = useState<EditorSection>(
    ((record as any)?.__section as EditorSection | undefined)
    || (isStructured && (mode === 'edit' || !!patientId) ? 'estrutura' : (mode === 'new' ? 'dados' : 'conteudo'))
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locked) {
      pushToast('info', 'Confirme sua senha para anexar arquivos a um registro aprovado.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const allowed = selectedFiles.filter(file => (
      /^image\/(jpeg|png|webp)$/i.test(file.type)
      || ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'].includes(file.type)
      || /\.(pdf|doc|docx|odt)$/i.test(file.name)
    ));
    if (!allowed.length) {
      pushToast('error', 'Envie uma imagem JPG, PNG ou WebP, PDF ou documento do Word.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded: any[] = [];
      let optimizedImages = 0;
      for (const originalFile of allowed) {
        const file = await optimizeImageForUpload(originalFile);
        if (file !== originalFile) optimizedImages += 1;
        const fd = new FormData();
        fd.append('file', file);
        if (patientId) fd.append('patient_id', patientId);
        const data = await api.post<any>('/uploads', fd);
        uploaded.push({
          file_name: data.file_name,
          file_url: data.file_url,
          file_type: file.type,
          file_size: file.size
        });
      }
      setAttachments(prev => [...prev, ...uploaded]);
      const imageHint = optimizedImages ? ` ${optimizedImages === 1 ? 'Imagem otimizada' : `${optimizedImages} imagens otimizadas`} para economizar espaço.` : '';
      pushToast('success', `${uploaded.length === 1 ? 'Arquivo anexado' : `${uploaded.length} arquivos anexados`}.${imageHint}`);
      if (allowed.length < selectedFiles.length) pushToast('info', 'Alguns arquivos foram ignorados: use JPG, PNG, WebP, PDF ou Word.');
    } catch (err: any) {
      pushToast('error', err?.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    if (locked) return;
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Restaura organized se existir
  useEffect(() => {
    if (record?.ai_organized_content) {
      try {
        const parsed = JSON.parse(record.ai_organized_content);
        if (parsed && parsed._estruturado) {
          // Registro estruturado: só reaproveita as chaves antigas se a IA tiver organizado o texto livre.
          if (record.ai_status === 'organized') { const { _estruturado, ...legacy } = parsed; setOrganized(legacy); }
        } else {
          setOrganized(parsed);
          setReviewPoints(Array.isArray(parsed?.pontos_revisao) ? parsed.pontos_revisao : []);
        }
      } catch {}
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
      pushToast('success', 'Evolução organizada pela Bia IA!');
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao organizar com IA');
    } finally { setAiLoading(false); }
  };

  // Monta o corpo do registro. Registros estruturados guardam os dados em ai_organized_content._estruturado
  // e espelham o texto nas chaves antigas (motivo_consulta...) para exportacao, IA e visualizacao antiga.
  const buildBody = (st: string) => {
    let aiContent: string | null;
    let content: string;
    if (recordType === 'Plano') {
      aiContent = JSON.stringify(theraPlan);
      content = 'Plano Terapêutico — ' + theraPlan.approach + ' | ' + (theraPlan.summary || '');
    } else {
      const base: Record<string, any> = organized ? { ...organized } : {};
      if (isStructured) {
        const values: StructuredValues = { ...sValues };
        if (recordType === 'Evolucao' && sessionNumber.trim()) values.sessao_numero = sessionNumber.trim();
        else delete values.sessao_numero;
        Object.assign(base, compileLegacy(sections, values));
        const dur = Number(durationMin);
        base._estruturado = {
          v: 1, kind: recordType, template: specialty, values, updated_at: new Date().toISOString(),
          resumo: recordType === 'Evolucao' ? buildResumo(values) : undefined,
          meta: {
            duracao_min: dur > 0 ? dur : undefined, modalidade, agendamento_id: appointmentId || undefined,
            proxima_reavaliacao: recordType === 'Avaliacao' && !reassess ? (initialStructured?.meta as any)?.proxima_reavaliacao : undefined,
            ocorrencia: recordType === 'Evolucao' && isAbsenceOc(String(values.ocorrencia || '')) ? String(values.ocorrencia) : undefined,
            falta_pendente: recordType === 'Evolucao' && isFaltaOc(String(values.ocorrencia || '')) && !String(values.falta_motivo || '').trim() ? true : undefined,
          },
          ai_fields: aiFields.length ? aiFields : undefined,
          ai_sources: aiFields.length ? Object.fromEntries(aiFields.filter(k => aiSources[k]?.length).map(k => [k, aiSources[k]])) : undefined,
        };
      }
      const keys = Object.keys(base);
      aiContent = keys.length ? JSON.stringify(base) : null;
      const joined = keys.filter(k => k !== '_estruturado').map(k => base[k]).join('\n\n');
      content = keys.length ? (joined || draft) : draft;
      if (recordType === 'Evolucao' && isAbsenceOc(String(sValues.ocorrencia || ''))) {
        const oc = String(sValues.ocorrencia);
        const motivo = String(sValues.falta_motivo || '').trim();
        const head = isFaltaOc(oc) ? `${oc}${motivo ? ` — motivo: ${motivo}` : ' — motivo pendente'}` : oc;
        content = [head, String(sValues.falta_motivo_texto || '').trim(), String(sValues.falta_obs || '').trim(), content].filter(Boolean).join('\n\n');
      }
    }
    return {
      patient_id: patientId,
      title,
      record_type: recordType,
      appointment_type: formato,
      appointment_id: appointmentId || undefined,
      created_at: sessionDate,
      start_time: startTime,
      end_time: endTime,
      status: st,
      tags,
      draft_content: recordType === 'Plano' ? (theraPlan.summary || '') : draft,
      restricted_content: privateNotes,
      ai_organized_content: aiContent,
      content,
      attachments,
    };
  };

  // Grava sem fechar o editor; o primeiro salvamento de um registro novo guarda o id para os próximos.
  const persist = async (st: string, opts: { autosave?: boolean } = {}) => {
    const body = {
      ...buildBody(st),
      autosave: !!opts.autosave,
      history_event: historyEventRef.current || undefined,
      restored_from: restoredFromRef.current || undefined,
      history_note: historyEventRef.current === 'reavaliacao' && reassessNote.trim() ? reassessNote.trim() : undefined,
    };
    try {
      if (recordIdRef.current) { await api.put(`/medical-records/${recordIdRef.current}`, body); }
      else {
        const created = await api.post<any>('/medical-records', body);
        if (created?.id) recordIdRef.current = String(created.id);
      }
    } catch (e: any) {
      // Registro vivo: já existe um registro único/da mesma data — oferece abrir o atual (sem perder o que foi digitado).
      if (e?.status === 409 && e?.data?.code === 'RECORD_EXISTS' && !opts.autosave) {
        setExistsInfo({ id: e.data.existing_id ? String(e.data.existing_id) : undefined, message: e.data.error || e.message });
      }
      throw e;
    }
    historyEventRef.current = null;
    restoredFromRef.current = null;
    setRestorePending(null);
    setHistoryTick(t => t + 1);
  };

  const save = async (newStatus?: string) => {
    if (!patientId) { setEditorSection('dados'); pushToast('error', 'Selecione o paciente.'); return; }
    setSaving(true);
    try {
      await persist(newStatus || status);
      pushToast('success', 'Registro salvo com sucesso!');
      onSave(); onClose();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao salvar registro');
    } finally { setSaving(false); }
  };

  // Rascunho automático: grava 15s depois da última alteração e mostra "Salvo às hh:mm".
  const currentSig = JSON.stringify([patientId, title, recordType, formato, modalidade, sessionDate, startTime, endTime, durationMin, sessionNumber, tags, draft, privateNotes, sValues, aiFields, attachments, organized, appointmentId]);
  const lastSigRef = useRef(currentSig);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [autosaving, setAutosaving] = useState(false);
  useEffect(() => {
    if (!isStructured || !patientId || saving || restorePending || currentSig === lastSigRef.current) return;
    if (!(hasAnyValue(sValues) || draft.trim() || privateNotes.trim())) return;
    const sig = currentSig;
    const t = setTimeout(async () => {
      setAutosaving(true);
      try { await persist(status, { autosave: true }); lastSigRef.current = sig; setSavedAt(new Date()); } catch { /* tenta de novo na próxima alteração */ }
      finally { setAutosaving(false); }
    }, 15000);
    return () => clearTimeout(t);
  }, [currentSig, status, patientId, isStructured, saving, restorePending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+S salva o rascunho sem sair do editor
  const saveNow = async () => {
    if (!patientId) { setEditorSection('dados'); pushToast('error', 'Selecione o paciente.'); return; }
    setAutosaving(true);
    try {
      await persist(status);
      lastSigRef.current = currentSig;
      setSavedAt(new Date());
      pushToast('success', 'Rascunho salvo.');
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao salvar rascunho'); }
    finally { setAutosaving(false); }
  };
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNowRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Ao fechar sem salvar: salva automaticamente como rascunho se houver conteúdo
  const handleClose = async () => {
    const hasContent = recordType === 'Plano'
      ? (theraPlan.summary || theraPlan.approach || theraPlan.goals?.length)
      : (draft.trim() || privateNotes.trim() || (isStructured && hasAnyValue(sValues)));
    const isApproved = status === 'Aprovado';
    if (reassess && currentSig === lastSigRef.current) { if (recordIdRef.current) onSave(); onClose(); return; }
    if (restorePending) { if (recordIdRef.current) onSave(); onClose(); return; }
    if (!patientId || !hasContent || isApproved) {
      if (recordIdRef.current) onSave();
      onClose();
      return;
    }
    try {
      await persist(status === 'Aprovado' ? status : 'Rascunho');
      pushToast('info', 'Rascunho salvo automaticamente.');
      onSave();
    } catch { /* silencioso */ }
    onClose();
  };

  const [showRiskWarn, setShowRiskWarn] = useState(false);
  // Validação leve antes de aprovar: data, relato ou ao menos uma seção; avisa se o risco não foi avaliado.
  const requestApprove = () => {
    if (!sessionDate) { setEditorSection('dados'); pushToast('error', 'Informe a data da sessão antes de aprovar.'); return; }
    if (absent) {
      if (isFaltaOc(ocorrencia) && !String(sValues.falta_motivo || '').trim()) { setEditorSection('estrutura'); pushToast('error', 'Preencha o motivo da falta antes de aprovar.'); return; }
      setShowApproveModal(true);
      return;
    }
    if (isStructured) {
      const anySection = sections.some(s => sectionStatus(s, sValues) !== 'empty');
      if (!hasValue(sValues.relato) && !anySection && !draft.trim()) {
        setEditorSection('estrutura');
        pushToast('error', 'Preencha o relato ou ao menos uma seção antes de aprovar.');
        return;
      }
      const hasTriage = sections.some(s => s.fields.some(f => f.key === 'risco_ideacao'));
      if (hasTriage && RISCO_TRIAGEM.every(r => !sValues[`risco_${r.key}`])) { setShowRiskWarn(true); return; }
    }
    setShowApproveModal(true);
  };

  const unlockApprovedRecord = async (password: string) => {
    if (!recordIdRef.current) throw new Error('Salve o registro antes de liberar a edição.');
    const result = await api.post<any>(`/medical-records/${recordIdRef.current}/unlock-edit`, { password });
    setApprovedEditUnlocked(true);
    pushToast('success', result?.message || 'Edição liberada temporariamente.');
  };

  const approve = async (pw: string) => {
    if (!patientId) { setEditorSection('dados'); throw new Error('Selecione o paciente.'); }
    // Garante que a versão aprovada contém tudo o que está na tela.
    await persist(recordIdRef.current ? status : 'Rascunho');
    await api.post(`/medical-records/${recordIdRef.current}/approve`, { password: pw });
    pushToast('success', 'Registro aprovado!');
    onSave(); onClose();
  };

  /* ── IA: preencher os campos da evolução ───────────────────── */
  const [transcript, setTranscript] = useState('');
  const [transcriptLabel, setTranscriptLabel] = useState('');
  const [roomSessions, setRoomSessions] = useState<any[]>([]);
  const [roomSessionId, setRoomSessionId] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  useEffect(() => {
    if (!isEvolucao || !canUseAi || !patientId) { setRoomSessions([]); return; }
    let alive = true;
    const name = patients.find(p => String(p.id) === String(patientId))?.full_name;
    api.get<any[]>('/virtual-rooms/history').then(rows => {
      if (!alive) return;
      setRoomSessions((Array.isArray(rows) ? rows : []).filter(r =>
        Number(r.transcript_count) > 0 && (String(r.patient_id || '') === String(patientId) || (!!name && r.patient_name === name))
      ));
    }).catch(() => { if (alive) setRoomSessions([]); });
    return () => { alive = false; };
  }, [isEvolucao, canUseAi, patientId, patients]);
  const roomSessionLabel = (r: any) => `${r.display_title || r.room_title || 'Sala virtual'} · ${r.started_at ? fmtDateTime(r.started_at) : fmtDate(r.created_at)} · ${r.transcript_count} falas`;
  const loadTranscript = async () => {
    const rs = roomSessions.find(r => String(r.id) === roomSessionId);
    if (!rs) return;
    setTranscriptLoading(true);
    try {
      const lines = await api.get<any[]>(`/virtual-rooms/${rs.room_id}/sessions/${rs.session_key}/transcript`);
      const text = (Array.isArray(lines) ? lines : []).map(l => `${l.speaker_name || (l.speaker_role === 'guest' ? 'Paciente' : 'Profissional')}: ${l.text}`).join('\n');
      if (!text.trim()) { pushToast('info', 'Essa sessão não tem transcrição disponível.'); return; }
      setTranscript(text);
      setTranscriptLabel(roomSessionLabel(rs));
      pushToast('success', 'Transcrição carregada. Use "Preencher com IA" para extrair os campos.');
    } catch (e: any) { pushToast('error', e?.message || 'Não foi possível carregar a transcrição.'); }
    finally { setTranscriptLoading(false); }
  };

  const aiOptions = useMemo(() => {
    const o: Record<string, string[]> = {};
    sections.forEach(s => s.fields.forEach(f => { if ((f.type === 'multi' || f.type === 'select') && f.options) o[f.key] = f.options; }));
    return o;
  }, [sections]);
  // Campos do modelo em uso que a IA pode sugerir. Na anamnese, as fontes escolhidas
  // (avaliações, evoluções, formulário e entrevista) podem completar ou atualizar o
  // próprio questionário; observação e conduta continuam sendo decisão profissional.
  const aiFieldDefs = useMemo(() => sections.flatMap(sec => sec.fields
    .filter(f => ['text', 'textarea', 'select', 'multi', 'rows', 'date', 'number', 'scale'].includes(f.type))
    .filter(f => recordType !== 'Anamnese' || !['observacoes_profissional', 'conduta_inicial'].includes(f.key))
    .map(f => ({ key: f.key, label: f.label, type: f.type === 'scale' ? 'number' : f.type, options: f.options, columns: f.columns?.map(c => c.key), section: sec.label }))), [sections, recordType]);
  const anamnesisAnswersForAi = useMemo(() => {
    if (recordType !== 'Anamnese') return '';
    const format = (value: any): string => {
      if (Array.isArray(value)) return value.map(v => typeof v === 'object' ? Object.values(v).filter(Boolean).join(' — ') : String(v)).filter(Boolean).join('; ');
      return typeof value === 'object' && value ? Object.values(value).filter(Boolean).join(' — ') : String(value ?? '').trim();
    };
    return sections.flatMap(section => section.fields
      .filter(field => !field.aiOnly && hasValue(sValues[field.key]))
      .map(field => `${field.label}: ${format(sValues[field.key])}`)
    ).join('\n');
  }, [recordType, sections, sValues]);
  const [aiFillBusy, setAiFillBusy] = useState(false);
  const [aiPanel, setAiPanel] = useState<{ stamp: number; kind: 'evolution' | 'assessment'; suggestions: Record<string, any>; meta: Record<string, { fontes?: string[]; confianca?: string }>; reviewPoints: string[]; sources: string[] } | null>(null);
  const aiAppliedRef = useRef(false);
  // Fontes trazidas do painel lateral para o texto livre ("Em uso"): são exatamente as que a IA lê a partir do texto livre.
  const [usedSources, setUsedSources] = useState<{ id: string; label: string; group: SourceGroupId }[]>([]);
  const [fillDialog, setFillDialog] = useState<null | 'evolution' | 'assessment'>(null);
  const openFill = (kind: 'evolution' | 'assessment') => {
    if (!patientId) { pushToast('info', 'Selecione o paciente antes de usar a IA.'); setEditorSection('dados'); return; }
    const hasText = !!strip(draft) || !!String(sValues.relato || '').trim() || !!transcript.trim() || usedSources.length > 0;
    if (kind === 'evolution' && !hasText) {
      pushToast('info', 'Escreva o texto livre da sessão ou carregue a transcrição da sala virtual para a IA preencher os campos.');
      setEditorSection('conteudo'); setStep('draft');
      return;
    }
    setFillDialog(kind);
  };
  const fillWithAI = () => openFill('evolution');
  const fillAssessmentWithAI = () => openFill('assessment');
  const runFill = async (selection: SourceGroupId[]) => {
    const kind = fillDialog;
    if (!kind) return;
    const generatingAnamnesisAnalysis = kind === 'assessment' && recordType === 'Anamnese';
    const sel: SourceGroupId[] = generatingAnamnesisAnalysis
      ? Array.from(new Set([...selection, 'texto_livre'])) as SourceGroupId[]
      : usedSources.length && !selection.includes('texto_livre') ? [...selection, 'texto_livre'] : selection;
    const source = generatingAnamnesisAnalysis
      ? anamnesisAnswersForAi
      : strip(draft) ? draft : (kind === 'evolution' ? String(sValues.relato || '').trim() : '');
    setAiFillBusy(true);
    try {
      const common = { patient_id: patientId, record_id: recordIdRef.current || undefined, sources: sel, draft_content: source, transcript };
      const resp = kind === 'evolution'
        ? await api.post<any>('/medical-records/fill-evolution', {
          ...common,
          options: aiOptions,
          goals: planGoals,
          previous: previousInfo ? { proxima: previousInfo.info.proxima, tarefas: previousInfo.info.tarefas.join('; ') } : undefined,
        })
        : await api.post<any>('/medical-records/fill-assessment', { ...common, specialty, fields: aiFieldDefs });
      const suggestions = resp?.suggestions || {};
      if (!Object.keys(suggestions).length) { pushToast('info', 'A IA não encontrou informações suficientes nas fontes selecionadas para sugerir campos.'); return; }
      aiAppliedRef.current = false;
      setFillDialog(null);
      setAiPanel({
        stamp: Date.now(), kind, suggestions, meta: resp?.suggestion_meta || {}, reviewPoints: resp?.review_points || [],
        sources: (resp?.sources || []).map((s: any) => s.label),
      });
    } catch (e: any) {
      pushToast('error', e?.message || 'A IA está indisponível agora. O que você digitou foi mantido; tente novamente em instantes.');
    } finally { setAiFillBusy(false); }
  };
  const applyAiPatch = (patch: Record<string, any>) => {
    aiAppliedRef.current = true;
    historyEventRef.current = 'ia';
    setSValues(prev => ({ ...prev, ...patch }));
    setAiFields(prev => Array.from(new Set([...prev, ...Object.keys(patch)])));
    const meta = aiPanel?.meta || {};
    setAiSources(prev => {
      const next = { ...prev };
      Object.keys(patch).forEach(k => { if (meta[k]?.fontes?.length) next[k] = meta[k].fontes as string[]; });
      return next;
    });
  };
  const closeAiPanel = () => {
    setAiPanel(null);
    if (aiAppliedRef.current) { setEditorSection('estrutura'); pushToast('info', 'Campos aplicados. Revise antes de aprovar.'); }
  };

  /* ── Histórico: restaurar uma versão como alteração pendente (não salva sozinho) ───────── */
  const restoreSnapshot = (snap: HistorySnapshot, versionNo: number) => {
    if (locked) return;
    if (snap.title) setTitle(snap.title);
    setDraft(snap.draft_content || '');
    setTags(Array.isArray(snap.tags) ? snap.tags : []);
    if (snap.created_at) setSessionDate(snap.created_at);
    setStartTime(hhmm(snap.start_time));
    setEndTime(hhmm(snap.end_time));
    if (snap.appointment_type && FORMATOS.some(f => f.value === snap.appointment_type)) setFormato(snap.appointment_type);
    setAppointmentId(snap.appointment_id || '');
    let ai: any = null;
    try { ai = snap.ai_organized_content ? JSON.parse(snap.ai_organized_content) : null; } catch { ai = null; }
    if (recordType === 'Plano') {
      if (ai) setTheraPlan(ai as TheraPlan);
    } else if (ai && ai._estruturado) {
      const { _estruturado, ...legacy } = ai;
      if (_estruturado.template && SPECIALTY_TEMPLATES[_estruturado.template as SpecialtyId]) setSpecialty(_estruturado.template as SpecialtyId);
      setSValues(_estruturado.values || {});
      setAiFields([]); setAiSources({});
      setOrganized(Object.keys(legacy).length ? legacy : null);
      if (_estruturado.values?.sessao_numero) setSessionNumber(String(_estruturado.values.sessao_numero));
    } else if (ai) {
      setOrganized(ai);
    }
    restoredFromRef.current = versionNo;
    historyEventRef.current = 'restaurado';
    setRestorePending(versionNo);
    setEditorSection(isStructured ? 'estrutura' : 'conteudo');
    setStep('draft');
    pushToast('info', `Versão ${versionNo} carregada no editor. Salve para confirmar a restauração.`);
  };

  /* ── Duplicar da última sessão (nunca copia o relato) ───────── */
  const [dupPatch, setDupPatch] = useState<Record<string, any> | null>(null);
  const applyDup = (patch: Record<string, any>) => {
    setSValues(prev => ({ ...prev, ...patch }));
    setAiFields(prev => prev.filter(k => !(k in patch)));
    setDupPatch(null);
    pushToast('success', 'Intervenções e tarefas copiadas da última sessão. O relato não é copiado.');
  };
  const duplicateFromLast = () => {
    if (!previousInfo) { pushToast('info', 'Não há sessão anterior deste paciente para duplicar.'); return; }
    const keys = ['abordagem', 'intervencoes', 'tecnica', 'intervencoes_obs', 'objetivos', 'tarefas'];
    const available = new Set(sections.flatMap(s => s.fields.map(f => f.key)));
    const patch: Record<string, any> = {};
    keys.forEach(k => { if (available.has(k) && hasValue(previousInfo.values[k])) patch[k] = previousInfo.values[k]; });
    if (!Object.keys(patch).length) { pushToast('info', 'A sessão anterior não tem intervenções ou tarefas para copiar.'); return; }
    if (Object.keys(patch).some(k => hasValue(sValues[k]))) { setDupPatch(patch); return; }
    applyDup(patch);
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

  const isPlano = recordType === 'Plano';
  const isAnamnese = recordType === 'Anamnese';
  const editorTabs = EDITOR_TABS
    .filter(t => {
      if (isPlano) return t.id === 'dados' || t.id === 'rascunho' || t.id === 'anexos' || t.id === 'historico';
      if (isAnamnese) return t.id === 'dados' || t.id === 'estrutura' || t.id === 'rascunho' || t.id === 'anexos' || t.id === 'historico';
      if (t.id === 'estrutura') return isStructured;
      if (t.id === 'anexos') return true;
      return true;
    })
    .map(t => ({
      ...t,
      label: t.id === 'estrutura'
        ? (isAnamnese ? 'Preenchimento profissional' : recordType === 'Avaliacao' ? 'Avaliação clínica' : absent ? (isFaltaOc(ocorrencia) ? 'Falta' : 'Ocorrência') : 'Evolução da sessão')
        : t.id === 'rascunho' ? (isPlano ? 'Plano' : isAnamnese ? 'Coleta remota' : isStructured ? 'Texto livre / IA' : 'Rascunho') : t.label,
      disabled: t.id === 'revisao' && !organized,
    }));
  const editorTab: EditorTabId = editorSection === 'estrutura' ? 'estrutura' : editorSection === 'conteudo' ? (step === 'ai_result' ? 'revisao' : 'rascunho') : editorSection === 'dados' ? 'dados' : editorSection;
  const changeEditorTab = (v: EditorTabId) => {
    if (v === 'rascunho') { setEditorSection('conteudo'); setStep('draft'); }
    else if (v === 'revisao') { setEditorSection('conteudo'); setStep('ai_result'); }
    else setEditorSection(v);
  };
  const patientName = patients.find(p => String(p.id) === String(patientId))?.full_name;

  const editorTitle = isPlano
    ? (mode === 'new' ? 'Plano Terapêutico' : 'Editar Plano')
    : isAnamnese
      ? (mode === 'new' ? 'Nova Anamnese' : 'Editar Anamnese')
      : recordType === 'Avaliacao'
        ? (reassess ? 'Reavaliação Clínica' : mode === 'new' ? 'Nova Avaliação Clínica' : 'Editar Avaliação')
        : (mode === 'new' ? 'Nova Evolução Clínica' : 'Editar Registro');

  return (
    <PageWrapper>
      <div className="space-y-4 pb-16 animate-fadeIn">
        <SectionTitle
          icon={ClipboardCheck}
          title={editorTitle}
          description={patientName ? `Paciente: ${patientName}` : 'Preencha os dados do registro clínico.'}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={handleClose}>Voltar</Button>
            </div>
          }
        />

        {restorePending && (
          <Alert variant="warning" title={`Restauração da versão ${restorePending} pendente`}>
            Os valores dessa versão estão no editor, mas ainda não foram salvos. Clique em Salvar rascunho para confirmar; se sair sem salvar, a restauração é descartada.
          </Alert>
        )}
        {locked && recordIdRef.current && (
          <Alert variant="warning" title="Registro aprovado protegido">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Para alterar conteúdo, anexos, avaliação ou anamnese, confirme sua senha. O status continuará aprovado e cada alteração ficará no histórico.</span>
              <Button type="button" size="sm" variant="outline" iconLeft={<LockOpen size={14} />} onClick={() => setShowUnlockEditModal(true)}>Liberar edição</Button>
            </div>
          </Alert>
        )}
        <Tabs<EditorTabId> items={editorTabs} value={editorTab} onChange={changeEditorTab} label="Seções do registro" />

        {/* Dados / Identificação */}
        {editorSection === 'dados' && (isPlano ? (
          <ContentCard padding="md" className="space-y-3">
            <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
              <User size={14} className="text-primary-600" /> Identificação e Metadados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} disabled={locked} />
              <Input label="Data" type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} disabled={locked} />
              {!typeLocked && (
                <Select label="Paciente" value={patientId} onChange={e => setPatientId(e.target.value)} disabled={mode === 'edit'}>
                  <option value="">Selecione...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              )}
            </div>
          </ContentCard>
        ) : (
          <SessionDataTab
            recordType={recordType}
            typeLocked={typeLocked}
            typeLabel={TYPE_LABELS[recordType] || recordType}
            typeOptions={Object.entries(TYPE_LABELS)}
            onRecordTypeChange={setRecordType}
            typeIcon={(() => { const TI = TYPE_ICONS[recordType] || FileText; return <TI size={14} />; })()}
            mode={mode}
            patients={patients}
            patientId={patientId}
            onPatientChange={setPatientId}
            title={title}
            onTitleChange={setTitle}
            autoTitle={autoTitle}
            sessionDate={sessionDate}
            onDateChange={changeDate}
            startTime={startTime}
            endTime={endTime}
            durationMin={durationMin}
            onStartChange={changeStart}
            onEndChange={changeEnd}
            onDurationChange={changeDuration}
            formato={formato}
            onFormatoChange={setFormato}
            modalidade={modalidade}
            onModalidadeChange={setModalidade}
            showSessionNumber={isEvolucao}
            sessionNumber={sessionNumber}
            suggestedNumber={suggestedNumber}
            onSessionNumberChange={v => { setSessionNumber(v); setNumberTouched(true); }}
            tags={tags}
            onTagsChange={setTags}
            tagSuggestions={tagSuggestions}
            locked={locked}
            lockReason="Este registro já foi aprovado e é um documento clínico: data, horário e duração ficam travados para preservar a integridade do prontuário. Os demais dados continuam editáveis."
            appointments={appointmentOptions}
            appointmentId={appointmentId}
            onLinkAppointment={linkAppointment}
            suggestedAppointment={suggestedAppointment}
            auditInfo={mode === 'edit' || recordIdRef.current ? auditInfo : null}
          />
        ))}

        {/* Registro estruturado — Anamnese, Evolução e Avaliação */}
        {editorSection === 'estrutura' && isStructured && (
          <div className="space-y-3 animate-fadeIn">
            {isAnamnese ? (
              <ContentCard padding="md" className="space-y-1.5">
                <h3 className="text-sm font-medium text-slate-900">Anamnese preenchida pelo profissional</h3>
                <p className="text-[11px] leading-relaxed text-slate-500">As perguntas abaixo são as mesmas do formulário remoto. Preencha durante a entrevista, mesmo sem enviar link ao paciente; a IA pode usar Avaliações, Evoluções, respostas do paciente e a entrevista para sugerir ou atualizar campos, sempre para sua revisão.</p>
              </ContentCard>
            ) : (
            <ContentCard padding="md">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Select
                  label={recordType === 'Avaliacao' ? 'Modelo de avaliação' : 'Modelo de evolução'}
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value as SpecialtyId)}
                >
                  {SPECIALTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                <p className="text-[11px] leading-relaxed text-slate-500 sm:col-span-1 xl:col-span-2">
                  {SPECIALTY_TEMPLATES[specialty].description}{' '}
                  {detectedSpecialty
                    ? (detectedSpecialty === specialty ? 'Modelo definido pela especialidade do seu perfil.' : 'Diferente do modelo do seu perfil.')
                    : 'Seu perfil não informa a especialidade: escolha o modelo mais adequado a este atendimento.'}
                </p>
              </div>
            </ContentCard>
            )}
            {isLegacyRecord && (
              <Alert variant="info">
                Este registro foi criado no modelo anterior. O conteúdo original está em <strong>Texto livre / IA</strong> e continua sendo salvo; preencha as seções abaixo para estruturá-lo.
              </Alert>
            )}
            {reassess && (
              <ContentCard padding="md" className="space-y-2">
                <Alert variant="info">Você está reavaliando a avaliação existente: ao salvar, a versão anterior fica no histórico e a data de referência passa a ser {fmtDayStr(sessionDate)}. A próxima reavaliação é prevista para 6 meses depois.</Alert>
                <Input label="Motivo da reavaliação (opcional)" value={reassessNote} onChange={e => setReassessNote(e.target.value)} />
              </ContentCard>
            )}
            {isEvolucao && (
              <ContentCard padding="md">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <OcorrenciaSelect value={ocorrencia} onChange={v => handleStructuredChange('ocorrencia', v)} disabled={locked} />
                  {absent && <Button variant="outline" size="sm" onClick={() => setShowClinical(v => !v)}>{showClinical ? 'Ocultar registro clínico' : 'Registro clínico da sessão (opcional)'}</Button>}
                </div>
              </ContentCard>
            )}
            {absent && <FaltaForm values={sValues} onChange={handleStructuredChange} disabled={locked} />}
            {(!absent || showClinical) && (
            <StructuredForm
              key={`${recordType}-${specialty}`}
              sections={sections}
              values={sValues}
              onChange={handleStructuredChange}
              planGoals={planGoals}
              label={isAnamnese ? 'Seções da anamnese' : recordType === 'Avaliacao' ? 'Seções da avaliação' : 'Seções da evolução'}
              showProgress
              disabled={locked}
              aiFields={aiFields}
              onConfirmAi={confirmAiField}
              aiSources={aiSources}
              toolbar={isEvolucao ? (
                <>
                  {canUseAi && <Button variant="primary" size="sm" loading={aiFillBusy} disabled={locked} iconLeft={<Sparkles size={14} />} onClick={fillWithAI}>Preencher com IA</Button>}
                  <Button variant="outline" size="sm" iconLeft={<Copy size={14} />} disabled={locked} onClick={duplicateFromLast}>Duplicar da última sessão</Button>
                </>
              ) : ((recordType === 'Avaliacao' || isAnamnese) && canUseAi ? (
                <Button variant="primary" size="sm" loading={aiFillBusy} disabled={locked} iconLeft={<Sparkles size={14} />} onClick={fillAssessmentWithAI}>{isAnamnese ? 'Gerar análise com IA' : 'Preencher com IA'}</Button>
              ) : undefined)}
              sectionTop={id => {
                if (isEvolucao && id === 'sessao') return (
                  <>
                    {moodHint && <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><Info size={12} className="mt-0.5 shrink-0" />{moodHint}</p>}
                    <PendingCard
                      previous={previousInfo?.info || null}
                      rows={(Array.isArray(sValues.tarefas_retorno) ? sValues.tarefas_retorno : []) as FollowupRow[]}
                      onChange={rows => handleStructuredChange('tarefas_retorno', rows)}
                    />
                  </>
                );
                if (isEvolucao && id === 'tarefas') return (
                  <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/40 p-3 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-800">Arquivos relacionados às tarefas</p>
                        <p className="text-[11px] text-slate-500">Imagem, PDF ou Word. Imagens são otimizadas antes do envio para ocupar menos espaço.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" iconLeft={<FileUp size={14} />} onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={locked}>
                        Anexar arquivos
                      </Button>
                      <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.odt" onChange={handleFileUpload} />
                    </div>
                    {attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((att, idx) => {
                          const image = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name || '');
                          const url = getStaticUrl(att.file_url || att.url);
                          return (
                            <div key={`${att.file_url || att.file_name}-${idx}`} className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                              {image ? <img src={url} alt="Prévia do anexo" className="h-11 w-11 shrink-0 rounded object-cover border border-slate-200" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-primary-50"><FileText size={18} className="text-primary-600" /></div>}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-slate-700">{att.file_name || 'Arquivo anexado'}</p>
                                <p className="text-[11px] text-slate-500">{att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(2)} MB` : 'Arquivo da evolução'}</p>
                              </div>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700" title="Visualizar" aria-label="Visualizar anexo"><Eye size={14} /></a>
                              <a href={url} download className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700" title="Baixar" aria-label="Baixar anexo"><Download size={14} /></a>
                              {!locked && <IconButton type="button" size="sm" variant="ghost" onClick={() => removeAttachment(idx)} aria-label="Remover anexo" title="Remover anexo" className="shrink-0 text-red-600 hover:bg-red-50"><Trash2 size={14} /></IconButton>}
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-[11px] text-slate-500">Nenhum arquivo anexado a esta evolução.</p>}
                  </div>
                );
                return null;
              }}
            />
            )}
          </div>
        )}

        {/* Conteúdo — Plano / Anamnese / Rascunho / Revisão IA */}
        {editorSection === 'conteudo' && (
          <div className={(recordType === 'Avaliacao' || recordType === 'Evolucao') && step === 'draft' ? 'flex flex-col lg:flex-row gap-3' : 'w-full min-w-0'}>
            {/* COLUNA ESQUERDA - FONTES (Apenas para Avaliação) */}
            {(recordType === 'Avaliacao' || recordType === 'Evolucao') && step === 'draft' && patientId && (
              <div className="lg:w-80 xl:w-96 shrink-0 animate-slideRightFade">
                <LinkedToolsSection
                  patientId={patientId}
                  variant="sidebar"
                  usedIds={usedSources.map(u => u.id)}
                  onBuildAssessment={recordType === 'Avaliacao' && canUseAi && !locked ? () => openFill('assessment') : undefined}
                  onSelectSource={(item: any) => {
                    if (locked) return;
                    setDraft((prev) => prev + '<br><br>' + mdToHtml(item.summary));
                    if (item.id && item.type) {
                      setUsedSources(prev => (prev.some(u => u.id === item.id) ? prev : [...prev, { id: item.id, label: `${item.name} ${fmtDate(item.date)}`, group: (item.type === 'anamnese' ? 'anamnese' : 'instrumentos') as SourceGroupId }]));
                    }
                    pushToast('info', `${item.name} trazida completa para o texto livre.`);
                  }}
                />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-3">
              {/* STEP 1 — Rascunho */}
              {step === 'draft' && isPlano && (
                <div className={locked ? 'pointer-events-none opacity-60' : ''}>
                <TherapeuticPlanEditor
                  plan={theraPlan}
                  onChange={handleTheraPlanChange}
                  patientId={patientId}
                  recordId={record?.id ? String(record.id) : undefined}
                  onCancel={handleClose}
                  onSaveDraft={() => save('Rascunho')}
                  saving={saving}
                />
                </div>
              )}
              {step === 'draft' && !isPlano && (
                <div className="space-y-3 animate-fadeIn">
                  {isAnamnese ? (
                    <ContentCard padding="lg" className="text-center">
                      <EmptyState
                        icon={ClipboardCheck}
                        title="Coleta de Dados (Remota)"
                        description="Para este tipo de registro, o histórico é coletado diretamente com o paciente através de um formulário seguro e sigiloso."
                        action={<Button variant="primary" size="sm" iconLeft={<Edit3 size={14} />} disabled={locked} onClick={() => setEditorSection('estrutura')}>Preencher manualmente</Button>}
                      />
                      {record?.id && (
                        <div className="pt-3 animate-slideUpFade">
                          <p className="text-xs font-medium text-slate-600 mb-2">Status do Envio Atual</p>
                          {(() => {
                            const currentSend = anamnesisSends.find(s => String(s.medical_record_id) === String(record.id));
                            if (!currentSend) return <p className="text-xs text-slate-500 italic">Nenhum formulário vinculado.</p>;
                            return (
                              <Badge color={currentSend.status === 'answered' ? 'success' : 'primary'} dot>{currentSend.status}</Badge>
                            );
                          })()}
                        </div>
                      )}
                    </ContentCard>
                  ) : (
                    <ContentCard padding="md" className="space-y-3">
                      <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <FileText size={14} className="text-primary-600" /> Rascunho Bruto da Sessão
                      </h3>
                      <div className={locked ? 'pointer-events-none opacity-60' : ''}>
                      <RichTextEditor
                        value={draft}
                        onChange={value => { if (!locked) setDraft(value); }}
                        placeholder="Escreva tudo o que aconteceu na sessão..."
                        minHeight={recordType === 'Avaliacao' ? 550 : 400}
                      />
                      </div>
                      {isEvolucao && canUseAi && (
                        <div className="space-y-3 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-900"><Sparkles size={14} className="text-primary-600" /> Preencher a evolução com IA</h4>
                            <p className="mt-0.5 text-[11px] text-slate-500">A IA lê o texto acima (e a transcrição, se carregada) e sugere os campos da aba Evolução da sessão. Você revisa campo a campo antes de aplicar.</p>
                          </div>
                          {roomSessions.length > 0 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <Select wrapperClassName="flex-1" label="Transcrição da sala virtual" value={roomSessionId} onChange={e => setRoomSessionId(e.target.value)}>
                                <option value="">Selecione uma sessão com transcrição...</option>
                                {roomSessions.map(r => <option key={r.id} value={String(r.id)}>{roomSessionLabel(r)}</option>)}
                              </Select>
                              <Button variant="outline" size="sm" loading={transcriptLoading} disabled={locked || !roomSessionId} onClick={loadTranscript}>Carregar transcrição</Button>
                            </div>
                          )}
                          {transcript && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                              <span className="min-w-0 break-words">Transcrição carregada: {transcriptLabel} ({transcript.length.toLocaleString('pt-BR')} caracteres). Ela é usada só para a IA e não é salva no registro.</span>
                              <div className="flex flex-wrap gap-1.5">
                                <Button size="xs" variant="outline" onClick={() => { setDraft(prev => (prev ? `${prev}\n\n` : '') + transcript); pushToast('info', 'Transcrição inserida no texto livre.'); }}>Inserir no texto livre</Button>
                                <Button size="xs" variant="ghost" onClick={() => { setTranscript(''); setTranscriptLabel(''); }}>Remover</Button>
                              </div>
                            </div>
                          )}
                          <Button onClick={fillWithAI} loading={aiFillBusy} disabled={locked || (!draft.trim() && !transcript.trim() && !hasValue(sValues.relato))} variant="primary" size="lg" className="w-full" iconLeft={<Sparkles size={14}/>}>
                            {aiFillBusy ? 'Lendo a sessão...' : 'Preencher com IA'}
                          </Button>
                          <p className="text-[11px] text-slate-500">Revise antes de aprovar: a IA não inventa conteúdo e os riscos só são sugeridos se estiverem no texto.</p>
                        </div>
                      )}
                      {recordType === 'Avaliacao' && canUseAi && (
                        <div className="space-y-2 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-900"><Sparkles size={14} className="text-primary-600" /> Montar a avaliação clínica com IA</h4>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Use as fontes do painel ao lado (Usar Fonte traz o conteúdo completo para o texto livre) e escolha o que a IA pode ler. Ela sugere as seções da aba Avaliação clínica, cita a origem de cada campo e você revisa antes de aplicar.
                              {usedSources.length > 0 ? ` Em uso: ${usedSources.map(u => u.label).join(', ')}.` : ''}
                            </p>
                          </div>
                          <Button onClick={fillAssessmentWithAI} loading={aiFillBusy} disabled={locked} variant="primary" size="lg" className="w-full" iconLeft={<Sparkles size={14} />}>
                            {aiFillBusy ? 'Lendo as fontes...' : 'Montar avaliação clínica com IA'}
                          </Button>
                        </div>
                      )}
                      <Button onClick={organizeWithAI} loading={aiLoading} disabled={locked || !draft.trim()} variant={isEvolucao && canUseAi ? 'outline' : 'primary'} size="lg" className="w-full" iconLeft={<Sparkles size={14}/>}>
                        {aiLoading ? 'Organizando conteúdo...' : 'Organizar com Inteligência Artificial'}
                      </Button>
                    </ContentCard>
                  )}
                </div>
              )}

              {/* STEP 2 — Revisão IA */}
              {step === 'ai_result' && organized && (
                <div className="space-y-3 animate-slideUpFade">
                  {reviewPoints.length > 0 && (
                    <Alert variant="warning" title="Pontos para revisão humana">
                      <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i}>• {p}</li>)}</ul>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {ORGANIZED_FIELDS.map(f => (
                      <ContentCard key={f.key} padding="md">
                        <Textarea
                          label={f.label}
                          rows={5}
                          value={organized[f.key] || ''}
                          disabled={locked}
                          onChange={e => { if (!locked) setOrganized({ ...organized, [f.key]: e.target.value }); }}
                        />
                      </ContentCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campo Restrito */}
        {editorSection === 'restrito' && !isAnamnese && !isPlano && (
          <ContentCard padding="md" className="space-y-3">
            <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
              <Shield size={14} /> Observações Privadas (Campo Restrito)
            </h3>
            <Textarea
              aria-label="Observações privadas (campo restrito)"
              rows={8}
              placeholder="Hipóteses clínicas..."
              value={privateNotes}
              disabled={locked}
              onChange={e => { if (!locked) setPrivateNotes(e.target.value); }}
            />
          </ContentCard>
        )}

        {/* Anexos — disponíveis em todos os tipos de registro, inclusive Anamnese e Avaliação. */}
        {editorSection === 'anexos' && (
          <ContentCard padding="md" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Layers size={14} className="text-primary-600"/> Anexos do Registro
              </h3>
              <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={locked}>
                Anexar Arquivo
              </Button>
              <input type="file" className="hidden" ref={fileInputRef} multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.odt" onChange={handleFileUpload} />
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {attachments.map((att, idx) => {
                  const isImage = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name || '');
                  const url = getStaticUrl(att.file_url || att.url);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden group flex-1 min-w-0">
                        {isImage ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                            <img src={url} alt={att.file_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-primary-500" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-700 truncate group-hover:text-primary-600 transition-colors">{att.file_name}</p>
                          {att.file_size ? <p className="text-[11px] text-slate-500">{(att.file_size / 1024 / 1024).toFixed(2)} MB</p> : null}
                        </div>
                      </a>
                      {!locked && <IconButton size="sm" variant="ghost" onClick={() => removeAttachment(idx)} aria-label="Remover anexo" title="Remover anexo" className="ml-2 shrink-0 text-red-600 hover:bg-red-50"><Trash2 size={14} /></IconButton>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Layers} title="Nenhum anexo" description="Anexe documentos ou imagens relacionados a este registro." />
            )}
          </ContentCard>
        )}

        <ConfirmModal
          isOpen={!!existsInfo}
          onClose={() => setExistsInfo(null)}
          onConfirm={() => { const id = existsInfo?.id; setExistsInfo(null); if (id && onExists) { pushToast('info', 'Já existe — abrindo o registro atual.'); onExists(id); } }}
          title="Já existe um registro"
          message={`${existsInfo?.message || ''}${existsInfo?.id ? ' Se abrir o registro atual, o que foi digitado aqui e ainda não foi salvo não será aplicado.' : ''}`}
          confirmLabel={existsInfo?.id ? 'Abrir registro atual' : 'Entendi'}
          cancelLabel="Continuar editando"
          variant="primary"
        />

        {/* Histórico de alterações */}
        {editorSection === 'historico' && (
          <HistoryPanel
            recordId={recordIdRef.current}
            kind={structuredKind}
            locked={locked}
            onRestore={restoreSnapshot}
            refreshKey={historyTick}
          />
        )}
      </div>

      {/* Rodapé fixo de ações */}
      <div className="sticky bottom-0 z-20 -mx-3 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 xl:-mx-6 xl:px-6">
        <span className="text-[11px] text-slate-500">
          {status === 'Aprovado'
            ? 'Registro aprovado.'
            : autosaving
              ? 'Salvando rascunho...'
              : savedAt
                ? `Salvo às ${savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Ctrl+S salva o rascunho`
                : isStructured ? 'O rascunho é salvo automaticamente · Ctrl+S salva agora' : 'Ao voltar com conteúdo preenchido, o registro é salvo como rascunho.'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {locked ? (
            <Button type="button" onClick={() => setShowUnlockEditModal(true)} variant="primary" size="sm" iconLeft={<LockOpen size={14}/>}>Liberar edição</Button>
          ) : isPlano ? (
            <Button onClick={() => save()} loading={saving} variant="primary" size="sm" iconLeft={<Save size={14}/>}>Salvar plano</Button>
          ) : (
            <>
              <Button onClick={() => save()} loading={saving} variant={isAnamnese ? 'primary' : 'outline'} size="sm" iconLeft={<Save size={14}/>}>Salvar rascunho</Button>
              {!isAnamnese && <Button onClick={requestApprove} variant="success" size="sm" iconLeft={<CheckCircle2 size={14}/>}>Aprovar</Button>}
            </>
          )}
        </div>
      </div>

      {showApproveModal && (
        <PasswordModal
          title="Aprovar Registro"
          onConfirm={approve}
          onClose={() => setShowApproveModal(false)}
        />
      )}

      {showUnlockEditModal && (
        <PasswordModal
          title="Liberar edição do registro aprovado"
          onConfirm={unlockApprovedRecord}
          onClose={() => setShowUnlockEditModal(false)}
        />
      )}

      {aiPanel && (
        <AiFillPanel
          key={aiPanel.stamp}
          isOpen
          onClose={closeAiPanel}
          sections={sections}
          values={sValues}
          planGoals={planGoals}
          suggestions={aiPanel.suggestions}
          reviewPoints={aiPanel.reviewPoints}
          suggestionMeta={aiPanel.meta}
          sourcesUsed={aiPanel.sources}
          title={aiPanel.kind === 'assessment' ? (isAnamnese ? 'Revisar análise da anamnese sugerida pela IA' : 'Revisar avaliação sugerida pela IA') : 'Revisar sugestões da IA'}
          onApply={applyAiPatch}
        />
      )}

      {fillDialog && (
        <SourcesDialog
          isOpen
          onClose={() => setFillDialog(null)}
          title={fillDialog === 'assessment' ? (isAnamnese ? 'Gerar análise da anamnese com IA' : 'Montar avaliação clínica com IA') : 'Preencher a evolução com IA'}
          patientId={patientId}
          recordId={recordIdRef.current || undefined}
          hasDraft={!!strip(draft) || (fillDialog === 'evolution' && !!String(sValues.relato || '').trim()) || (isAnamnese && !!anamnesisAnswersForAi.trim())}
          hasTranscript={!!transcript.trim()}
          inUseLabels={usedSources.map(u => u.label)}
          inUseGroups={Array.from(new Set(usedSources.map(u => u.group)))}
          loading={aiFillBusy}
          confirmLabel={fillDialog === 'assessment' ? (isAnamnese ? 'Gerar análise' : 'Montar avaliação') : 'Gerar sugestões'}
          onConfirm={runFill}
        />
      )}

      <ConfirmModal
        isOpen={showRiskWarn}
        onClose={() => setShowRiskWarn(false)}
        onConfirm={() => { setShowRiskWarn(false); setShowApproveModal(true); }}
        title="Risco não avaliado"
        message="A triagem de risco (ideação suicida, autolesão, heteroagressão e vulnerabilidade) está como Não avaliado. Deseja aprovar mesmo assim?"
        confirmLabel="Aprovar mesmo assim"
        cancelLabel="Voltar e avaliar"
        variant="primary"
      />
      <ConfirmModal
        isOpen={!!dupPatch}
        onClose={() => setDupPatch(null)}
        onConfirm={() => dupPatch && applyDup(dupPatch)}
        title="Duplicar da última sessão"
        message="Alguns campos de intervenção ou tarefas já estão preenchidos e serão substituídos pelos da última sessão. O relato nunca é copiado. Continuar?"
        confirmLabel="Substituir"
        variant="primary"
      />
    </PageWrapper>
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
      size="xl"
      mobileStyle="fullscreen"
      title="Enviar Anamnese"
      subtitle={`Paciente: ${patient.full_name}`}
      footer={
        <ModalFooter>
          <Button variant="outline" size="md" onClick={onClose}>{generatedLink ? 'Fechar' : 'Cancelar'}</Button>
          {!generatedLink && (
            <Button
              variant="primary"
              size="md"
              onClick={handleSend}
              disabled={loading || !title.trim()}
              loading={loading}
              iconLeft={<Send size={14} />}
            >
              {loading ? 'Gerando link...' : 'Gerar link seguro'}
            </Button>
          )}
        </ModalFooter>
      }
    >
      <div className="space-y-4">
      {generatedLink ? (
        /* ── LINK GERADO ── */
        <div className="space-y-3 animate-in fade-in duration-500">
          <Alert variant="success" title="Link gerado com sucesso!">
            Compartilhe com o paciente pelo canal de sua preferência.
          </Alert>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-slate-600">Link seguro do paciente</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-primary-700 font-mono bg-white p-2 rounded-lg border border-primary-100 truncate">{generatedLink}</code>
              <Button size="sm" variant={copied ? 'success' : 'primary'} onClick={copyLink} iconLeft={copied ? <CheckCheck size={14}/> : <Copy size={14}/>}>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 transition text-center"
            >
              <ExternalLink size={16} className="text-slate-600" />
              <p className="text-xs font-medium text-slate-700">Copiar Link</p>
              <p className="text-[11px] text-slate-500">Cole em qualquer canal</p>
            </button>
            {whatsappLink && (patient.phone || '').replace(/\D/g, '').length >= 10 && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100 transition text-center"
              >
                <MessageSquare size={16} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700">Enviar WhatsApp</p>
                <p className="text-[11px] text-emerald-600">{patient.phone}</p>
              </a>
            )}
          </div>

          {/* Confirmação do lembrete automático */}
          {reminderHours ? (
            <Alert variant="warning" title="Lembrete automático agendado">
              Se o paciente não responder, o bot enviará um lembrete via WhatsApp automaticamente em{' '}
              <strong>
                {reminderHours === 24 ? '24 horas' :
                 reminderHours === 48 ? '2 dias' :
                 reminderHours === 72 ? '3 dias' :
                 reminderHours === 168 ? '7 dias' :
                 `${reminderHours}h`}
              </strong>.
              <span className="block text-[11px] mt-1">O lembrete é cancelado automaticamente quando o paciente responder ou se você cancelar o envio.</span>
            </Alert>
          ) : (
            <Alert variant="info">Sem lembrete automático configurado. Você pode enviar um lembrete manual a qualquer momento.</Alert>
          )}

          <p className="text-[11px] text-slate-500 text-center px-4">
            Link criptografado e de uso único por sessão. O paciente não precisa de conta no sistema.
          </p>
        </div>
      ) : (
        /* ── CONFIGURAÇÕES ── */
        <div className="space-y-3">
          <Input
            label="Título do formulário *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Anamnese Inicial — Nome do Paciente"
          />

          <Textarea
            label="Mensagem de boas-vindas (opcional)"
            rows={3}
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            placeholder="Ex: Olá! Antes da nossa primeira sessão, gostaria que você preenchesse este formulário..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo de formulário */}
            <div className="space-y-1">
              <span className="ds-label">Versão</span>
              <div className="grid grid-cols-2 gap-2">
                {([['full', 'Completa', '~15 min'], ['short', 'Rápida', '~5 min']] as const).map(([val, lab, time]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTemplateType(val as 'full' | 'short')}
                    className={`p-3 rounded-lg border text-left transition ${templateType === val ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'}`}
                  >
                    <p className="font-medium text-xs">{lab}</p>
                    <p className="text-[11px] text-slate-500">{time}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Opções */}
            <div className="space-y-2">
              <span className="ds-label">Configurações</span>
              <Switch checked={allowResume} onCheckedChange={setAllowResume} label="Continuar em etapas" description="Salva o progresso" />
              <Switch checked={allowEditAfterSubmit} onCheckedChange={setAllowEditAfterSubmit} label="Editar após envio" description="Permite correções" />

              <Select aria-label="Expiração" value={expiresHours ?? ''} onChange={e => setExpiresHours(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sem expiração</option>
                <option value="24">Expira em 24h</option>
                <option value="48">Expira em 48h</option>
                <option value="168">Expira em 7 dias</option>
                <option value="720">Expira em 30 dias</option>
              </Select>

              <Select aria-label="Lembrete" value={reminderHours ?? ''} onChange={e => setReminderHours(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sem lembrete</option>
                <option value="24">Lembrar em 24h</option>
                <option value="48">Lembrar em 48h</option>
                <option value="72">Lembrar em 3 dias</option>
                <option value="168">Lembrar em 7 dias</option>
              </Select>
            </div>
          </div>

          <Select
            label="Abordagem terapêutica (para guiar IA)"
            hint="A IA usará esta abordagem para organizar as respostas do paciente."
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
          </Select>

          <Alert variant="warning">
            As respostas do paciente <strong>não vão diretamente para o prontuário</strong>. Você receberá um aviso para revisar e aprovar antes de incorporá-las ao histórico clínico.
          </Alert>
        </div>
      )}
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ANAMNESIS RESPONSE MODAL
   Profissional revisa respostas do paciente, usa IA e converte
═══════════════════════════════════════════════════════════════ */
const RESPONSE_TABS = [
  { id: 'resumo', label: 'Resumo', icon: Info },
  { id: 'respostas', label: 'Respostas', icon: ClipboardCheck },
  { id: 'revisao', label: 'Revisão', icon: CheckCheck },
] as const;
type ResponseTabId = typeof RESPONSE_TABS[number]['id'];

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
  const [respTab, setRespTab] = useState<ResponseTabId>('resumo');
  const { pushToast } = useToast();
  const { hasPermission } = useAuth();

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
      subtitle={patientName}
      size="full"
      footer={
        <ModalFooter align="between">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <div className="flex flex-wrap items-center gap-2">
            {!hasAnswers && data?.status !== 'answered' && data?.status !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={sendReminder} iconLeft={<Bell size={14} />}>
                Enviar Lembrete
              </Button>
            )}
            {hasAnswers && reviewStatus !== 'approved' && (
              <Button variant="primary" size="sm" onClick={convertToRecord} disabled={convertLoading} loading={convertLoading} iconLeft={<ClipboardCheck size={14} />}>
                Criar Rascunho de Prontuário
              </Button>
            )}
          </div>
        </ModalFooter>
      }
    >
      {loading ? (
        <div role="status" className="py-16 flex items-center justify-center">
          <Loader2 size={24} className="text-primary-600 animate-spin" />
        </div>
      ) : !hasAnswers ? (
        <div className="py-8">
          <EmptyState
            icon={ClipboardCheck}
            title={
              data?.status === 'sent' ? 'O paciente ainda não abriu o formulário.' :
              data?.status === 'viewed' ? 'O paciente abriu o formulário mas ainda não respondeu.' :
              data?.status === 'filling' ? 'O paciente está preenchendo o formulário agora.' :
              'Nenhuma resposta registrada ainda.'
            }
            description={REVIEW_STATUS_LABELS[reviewStatus] || reviewStatus}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="sticky -top-4 z-10 -mx-4 -mt-4 bg-white px-4 pt-2">
            <Tabs<ResponseTabId> items={RESPONSE_TABS} value={respTab} onChange={setRespTab} label="Seções das respostas" />
          </div>

          {respTab === 'resumo' && (
            <div className="space-y-3">
              {/* Alerta crítico */}
              {hasCritical && (
                <Alert variant="error" title="Conteúdo crítico detectado">
                  O paciente mencionou: {alerts.join(', ')}. Avalie com atenção prioritária.
                </Alert>
              )}

              {/* Metadados */}
              <StatGrid cols={4}>
                {[
                  { label: 'Enviado', val: data?.sent_at ? new Date(data.sent_at).toLocaleString('pt-BR') : '—' },
                  { label: 'Respondido', val: data?.response?.submitted_at ? new Date(data.response.submitted_at).toLocaleString('pt-BR') : '—' },
                  { label: 'Status envio', val: data?.status },
                  { label: 'Revisão', val: REVIEW_STATUS_LABELS[reviewStatus] || reviewStatus },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-[11px] text-slate-500">{item.label}</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">{item.val}</p>
                  </div>
                ))}
              </StatGrid>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PanelCard title="Configuração do Envio" icon={Settings}>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] text-slate-500">Versão</span>
                      <p className="text-[13px] font-medium text-slate-800">{data?.template_type === 'full' ? 'Completa (~15min)' : 'Rápida (~5min)'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Abordagem (IA)</span>
                      <p className="text-[13px] text-slate-700">{data?.approach ? data.approach.toUpperCase() : 'Não especificada'}</p>
                    </div>
                    {data?.custom_message && (
                      <div>
                        <span className="text-[11px] text-slate-500">Mensagem enviada</span>
                        <p className="text-xs text-slate-600 italic leading-snug line-clamp-2">"{data.custom_message}"</p>
                      </div>
                    )}
                  </div>
                </PanelCard>

                <PanelCard title="Link do Formulário" icon={LinkIcon}>
                  {data?.status === 'answered' ? (
                    <Badge color="success" dot>Formulário concluído</Badge>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500 truncate min-w-0">{data?.public_link}</span>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Copiar link"
                          title="Copiar link"
                          onClick={() => { navigator.clipboard.writeText(data?.public_link); pushToast('success', 'Link copiado!'); }}
                          className="shrink-0"
                        >
                          <Copy size={14}/>
                        </IconButton>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="xs" variant="outline" onClick={async () => {
                           try {
                              const resp: any = await api.post(`/anamnesis-send/${sendId}/resend`, {});
                              setData((prev: any) => ({ ...prev, public_link: resp.public_link, status: 'sent', secure_token: resp.secure_token }));
                              pushToast('success', 'Novo link gerado!');
                           } catch { pushToast('error', 'Erro ao gerar novo link.'); }
                        }}>Gerar Novo Link</Button>
                        <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={async () => {
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
                </PanelCard>
              </div>

              {/* Resumo IA */}
              {(aiSummary || tccDraft) ? (
                <PanelCard title="Análise Clínica — Bia IA" icon={Brain}>
                  <div className="space-y-2">
                    {Object.entries((tccDraft || aiSummary) as Record<string, unknown>).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[11px] font-medium text-primary-600">{k.replace(/_/g, ' ')}</p>
                        <p className="text-[13px] text-slate-700 leading-relaxed">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </PanelCard>
              ) : hasPermission('access_ai_features') ? (
                <Button
                  onClick={generateAI}
                  disabled={aiLoading}
                  loading={aiLoading}
                  variant="outline"
                  size="lg"
                  className="w-full"
                  iconLeft={<Brain size={14} />}
                >
                  {aiLoading ? 'Gerando análise IA...' : 'Gerar Análise com Bia IA'}
                </Button>
              ) : null}
            </div>
          )}

          {respTab === 'respostas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-2">
                  <ClipboardCheck size={14} /> Respostas do Paciente
                </p>
                <span className="text-[11px] text-slate-500">Respostas fornecidas via link seguro</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {Object.entries(answers).map(([key, val]) => (
                  <div key={key} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                    <div className="text-[11px] font-medium text-primary-600 mb-1">
                      {ANAMNESIS_FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                    </div>
                    <p className="text-[13px] text-slate-800 leading-relaxed">
                      {Array.isArray(val) ? val.join(', ') : typeof val === 'number' ? `${val}/10` : String(val || '—')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {respTab === 'revisao' && (
            <ContentCard padding="md" className="space-y-3">
              <Textarea
                label="Anotações clínicas (uso profissional)"
                rows={8}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Impressões clínicas, observações, pontos a aprofundar na sessão..."
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="warning" onClick={() => saveReview('reviewing')}>Salvar como Em Revisão</Button>
                <Button size="sm" variant="success" onClick={() => saveReview('approved')}>Marcar como Aprovado</Button>
                <Button size="sm" variant="softDanger" className="sm:ml-auto" onClick={() => saveReview('discarded')}>Descartar</Button>
              </div>
            </ContentCard>
          )}
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
  const [activeTab, setActiveTab] = useState<RecordsTabId>(defaultTab === 'analysis' ? 'analysis' : 'history');
  
  // Filtros
  const [historySearch, setHistorySearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [globalRecords, setGlobalRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState(false);
  const [patientsError, setPatientsError] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
  const [currentRecord, setCurrentRecord] = useState<Partial<MedicalRecord> | null>(null);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [importClinicalOpen, setImportClinicalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restrictedModal, setRestrictedModal] = useState<{recordId: string; content?: string} | null>(null);
  const [showPwModal, setShowPwModal] = useState<{ type: string; recordId: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewerRecord, setViewerRecord] = useState<MedicalRecord | null>(null);
  const [shareModal, setShareModal] = useState<{ record: MedicalRecord } | null>(null);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [sendAnamnesisModal, setSendAnamnesisModal] = useState<{ record: MedicalRecord; patient: Patient } | null>(null);
  // Rascunhos criados só para abrir o envio: se o envio for cancelado, são descartados.
  const freshAnamnesisIds = useRef<Set<string>>(new Set());
  const [relatorioModal, setRelatorioModal] = useState<Patient | null>(null);
  const [encaminhamentoModal, setEncaminhamentoModal] = useState<Patient | null>(null);
  const [atestadoModal, setAtestadoModal] = useState<Patient | null>(null);
  const [anamnesisResponseModal, setAnamnesisResponseModal] = useState<{ sendId: number; patientName: string } | null>(null);
  const [anamnesisSends, setAnamnesisSends] = useState<any[]>([]);
  const [cancelAnamnesisModal, setCancelAnamnesisModal] = useState<{ sendId: number; patientName: string } | null>(null);
  const sessionHandoffOpenedRef = useRef(false);
  const [pendingSessions, setPendingSessions] = useState<{ sessions: any[]; absences: any[] }>({ sessions: [], absences: [] });
  const [backfillConfirm, setBackfillConfirm] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);
  
  useEffect(() => {
    const pid = searchParams.get('patient_id');
    if (pid) { 
        setSelectedPatientId(pid); setView('patient'); 
        fetchRecords(pid);
    } else {
        setSelectedPatientId(null); setView('grid');
        setEditorOpen(false);
        fetchGlobalRecords();
    }
  }, [searchParams]);

  // Retorno da Sala Virtual: abre uma evolução em rascunho com a transcrição.
  // A organização pela Aurora continua sendo uma ação explícita da profissional.
  useEffect(() => {
    if (sessionHandoffOpenedRef.current || searchParams.get('new_session') !== '1') return;
    const patientId = searchParams.get('patient_id');
    if (!patientId) return;
    sessionHandoffOpenedRef.current = true;
    let draft = '';
    try {
      const handoff = JSON.parse(sessionStorage.getItem('psi_session_record_draft') || '{}');
      if (String(handoff.patientId) === String(patientId)) draft = handoff.draft || '';
      sessionStorage.removeItem('psi_session_record_draft');
    } catch {}
    setSelectedPatientId(patientId);
    setView('patient');
    setSearchParams({ patient_id: patientId }, { replace: true });
    (async () => {
      // Uma evolução por data: se já existe a de hoje, abre a existente e acrescenta a transcrição ao rascunho.
      try {
        const list = await api.get<any[]>('/medical-records', { patient_id: patientId, record_type: 'Evolucao' });
        const ex = (list || []).find(r => dayOfStamp(r.created_at) === localToday());
        if (ex) {
          const full = await api.get<MedicalRecord>(`/medical-records/${ex.id}`);
          pushToast('info', 'Já existe uma evolução de hoje — abrindo o registro atual para atualizar.');
          setCurrentRecord({ ...full, id: String(full.id), tags: full.tags || [], draft_content: draft ? [strip(full.draft_content || ''), draft].filter(Boolean).join('\n\n') : full.draft_content });
          setEditorMode('edit');
          setEditorOpen(true);
          return;
        }
      } catch { /* segue para nova evolução; o servidor também impede duplicidade */ }
      setCurrentRecord({
        patient_id: patientId,
        record_type: 'Evolucao',
        title: `Evolução — ${new Date().toLocaleDateString('pt-BR')}`,
        draft_content: draft,
        status: 'Rascunho',
      });
      setEditorMode('new');
      setEditorOpen(true);
    })();
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedPatientId) fetchRecords(selectedPatientId);
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
    setPatientsError(false);
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
      await fetchGlobalRecords();
    } catch (e: any) {
      setPatientsError(true);
      pushToast('error', e?.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };


  const fetchGlobalRecords = async () => {
    setGlobalLoading(true);
    setGlobalError(false);
    try {
        // A central filtra localmente e mantém os totais reais de cada paciente.
        const data = await api.get<MedicalRecord[]>('/medical-records');
        setGlobalRecords((data || []).map(r => ({ 
            ...r, 
            id: String(r.id), 
            patient_id: String(r.patient_id),
            tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [] 
        })));
    } catch (err) {
      setGlobalError(true);
      console.error('Error fetching global records', err);
    } finally { setGlobalLoading(false); }
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
      api.get<any>('/medical-records/pending-sessions', { patient_id: pid }).then(r => setPendingSessions({ sessions: r?.sessions || [], absences: r?.absences || [] })).catch(() => {});
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


  const patientRecords = useMemo(() => records.filter(r => String(r.patient_id) === String(selectedPatientId)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [records, selectedPatientId]);

  // Trocar de aba limpa o filtro de tipo da aba "Registros" (ele filtra a busca no servidor).
  const changeRecordsTab = (v: RecordsTabId) => {
    if (v !== 'history' && filterType) setFilterType('');
    setActiveTab(v);
  };

  const openViewer = async (r: { id: string }) => {
    try { const full = await api.get<MedicalRecord>(`/api/medical-records/${r.id}`); setViewerRecord(full); }
    catch { const fallback = records.find(x => String(x.id) === String(r.id)); if (fallback) setViewerRecord(fallback); }
  };
  // Acoes de linha para as abas Sessoes e Avaliacao (mesmas acoes e travas da lista geral).
  const renderRecordActions = (r: { id: string }, opts: { view?: boolean; edit?: boolean } = { view: true, edit: true }) => (
    <>
      {opts.view && <IconButton size="sm" variant="ghost" onClick={() => openViewer(r)} title="Visualizar" aria-label="Visualizar"><Eye size={14}/></IconButton>}
      {opts.edit && <IconButton size="sm" variant="ghost" onClick={() => openEdit(r.id)} title="Editar" aria-label="Editar"><Edit3 size={14}/></IconButton>}
      <IconButton size="sm" variant="ghost" onClick={() => setShowPwModal({ type: 'restricted', recordId: r.id })} title="Restrito" aria-label="Restrito"><Lock size={14}/></IconButton>
      <IconButton size="sm" variant="ghost" onClick={() => { const rec = records.find(x => String(x.id) === String(r.id)); if (rec) setShareModal({ record: rec }); }} title="Compartilhar" aria-label="Compartilhar"><Share2 size={14}/></IconButton>
      <IconButton size="sm" variant="ghost" onClick={() => setDeleteId(r.id)} title="Excluir" aria-label="Excluir" className="text-red-600 hover:bg-red-50"><Trash2 size={14}/></IconButton>
    </>
  );

  const visibleRecords = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return patientRecords;
    return patientRecords.filter(r => (r.title || '').toLowerCase().includes(q) || strip(r.content || r.draft_content || '').toLowerCase().includes(q) || (r.tags || []).some(t => String(t).toLowerCase().includes(q)));
  }, [patientRecords, historySearch]);
  const tabRecords = useMemo(
    () => (TAB_RECORD_TYPE[activeTab] ? visibleRecords.filter(r => r.record_type === TAB_RECORD_TYPE[activeTab]) : visibleRecords),
    [visibleRecords, activeTab]
  );

  const analysisData = useMemo(() => {
    if (!patientRecords.length) return null;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    patientRecords.forEach(r => {
      const typeLabel = TYPE_LABELS[r.record_type] || r.record_type;
      byType[typeLabel] = (byType[typeLabel] || 0) + 1;
      const statusKey = r.status || 'Rascunho';
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
      const m = new Date(r.created_at + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      byMonth[m] = (byMonth[m] || 0) + 1;
      if (r.start_time && r.end_time) {
        const [sh, sm] = r.start_time.split(':').map(Number);
        const [eh, em] = r.end_time.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins > 0) { totalDuration += mins; durationCount++; }
      }
    });
    const sorted = [...patientRecords].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const firstDate = sorted[0]?.created_at;
    const lastDate = sorted[sorted.length - 1]?.created_at;
    const avgPerMonth = byMonth ? (patientRecords.length / Math.max(Object.keys(byMonth).length, 1)).toFixed(1) : '—';
    const approvedCount = byStatus['Aprovado'] || 0;
    const approvalRate = Math.round((approvedCount / patientRecords.length) * 100);
    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : null;
    const STATUS_ORDER = ['Aprovado', 'Revisado', 'Rascunho'];
    return {
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byStatus: STATUS_ORDER.map(s => ({ name: s, value: byStatus[s] || 0 })).filter(s => s.value > 0).concat(
        Object.entries(byStatus).filter(([k]) => !STATUS_ORDER.includes(k)).map(([name, value]) => ({ name, value }))
      ),
      byMonth: Object.entries(byMonth).map(([name, count]) => ({ name, count })),
      stats: { avgPerMonth, approvalRate, avgDuration, firstDate, lastDate, total: patientRecords.length }
    };
  }, [patientRecords]);

  const openNew = () => {
    setTypeSelectorOpen(true);
  };

  /* Registro vivo por paciente: Anamnese/Avaliação/Plano únicos; Evolução uma por data de consulta. */
  const liveCurrent = (t: string) => patientRecords.find(r => r.record_type === t) || null;
  const liveOlder = (t: string) => patientRecords.filter(r => r.record_type === t).slice(1);
  const evoOnDay = (day: string) => patientRecords.find(r => r.record_type === 'Evolucao' && dayOfStamp(r.created_at) === day) || null;
  const pendingMotiveCount = patientRecords.filter(r => r.record_type === 'Evolucao' && faltaPending(r.ai_organized_content)).length;
  const sessionsWithout = pendingSessions.sessions.filter(x => !evoOnDay(x.day));
  const absencesWithout = pendingSessions.absences.filter(x => !evoOnDay(x.day));
  const tabActionLabel = activeTab === 'sessions'
    ? (evoOnDay(localToday()) ? 'Atualizar evolução de hoje' : 'Nova evolução')
    : activeTab === 'assessment' ? (liveCurrent('Avaliacao') ? 'Reavaliar' : 'Criar avaliação')
    : activeTab === 'plan' ? (liveCurrent('Plano') ? 'Abrir plano' : 'Criar plano terapêutico')
    : (liveCurrent('Anamnese') ? 'Abrir anamnese' : 'Nova anamnese');
  const runTabAction = () => handleSelectType(TAB_RECORD_TYPE[activeTab], { reassess: activeTab === 'assessment' });
  // 409 RECORD_EXISTS do servidor: informa e abre o registro existente.
  const handleExists = async (e: any): Promise<boolean> => {
    if (e?.status === 409 && e?.data?.code === 'RECORD_EXISTS') {
      if (e.data.existing_id) { pushToast('info', 'Já existe — abrindo o registro atual.'); await openEdit(String(e.data.existing_id)); }
      else pushToast('info', e.data.error || 'Já existe um registro deste tipo para o paciente.');
      return true;
    }
    return false;
  };

  const createAnamnesisDraftAndSend = async () => {
    const pat = patients.find((p: Patient) => String(p.id) === String(selectedPatientId));
    if (!pat) { pushToast('error', 'Selecione o paciente para enviar a anamnese.'); return; }
    const existing = liveCurrent('Anamnese');
    if (existing) { setSendAnamnesisModal({ record: existing as MedicalRecord, patient: pat }); return; }
    try {
      const created: any = await api.post('/medical-records', {
        patient_id: pat.id, title: `Anamnese — ${pat.full_name}`, record_type: 'Anamnese', status: 'Rascunho',
        created_at: new Date().toISOString().slice(0, 10), tags: [], draft_content: '', content: '', attachments: [],
      });
      const rec = { ...(created?.record || created), patient_id: String(pat.id) } as MedicalRecord;
      if (!rec.id) { pushToast('error', 'Não foi possível iniciar a anamnese.'); return; }
      freshAnamnesisIds.current.add(String(rec.id));
      setRecords(prev => prev.some(r => String(r.id) === String(rec.id)) ? prev : [rec, ...prev]);
      setSendAnamnesisModal({ record: rec, patient: pat });
    } catch (e: any) {
      if (e?.status === 409 && e?.data?.existing_id) {
        pushToast('info', 'Já existe — usando a anamnese atual do paciente.');
        if (selectedPatientId) await fetchRecords(selectedPatientId);
        try { const full = await api.get<MedicalRecord>(`/medical-records/${e.data.existing_id}`); setSendAnamnesisModal({ record: { ...full, id: String(full.id), patient_id: String(full.patient_id) }, patient: pat }); } catch { /* ignora */ }
        return;
      }
      if (await handleExists(e)) return;
      pushToast('error', e?.message || 'Erro ao iniciar anamnese.');
    }
  };

  const handleSelectType = async (type: string, opts: { reassess?: boolean; day?: string; appointment?: { id: number | string; start_hm?: string; end_hm?: string } } = {}) => {
    const pat = patients.find((p: Patient) => String(p.id) === String(selectedPatientId));
    setTypeSelectorOpen(false);

    if (type === 'Relatorio' && pat) { setRelatorioModal(pat); return; }
    if (type === 'Encaminhamento' && pat) { setEncaminhamentoModal(pat); return; }
    if (type === 'Atestado' && pat) { setAtestadoModal(pat); return; }

    // Registros únicos: abre o existente em vez de criar outro.
    if (type === 'Anamnese' || type === 'Avaliacao' || type === 'Plano') {
      const existing = liveCurrent(type);
      if (existing) { await openEdit(existing.id, { reassess: type === 'Avaliacao' && !!opts.reassess }); return; }
    }
    const today = new Date().toLocaleDateString('pt-BR');
    const titleMap: Record<string, string> = {
      Anamnese: pat ? `Anamnese — ${pat.full_name}` : `Anamnese — ${today}`,
      Avaliacao: `Avaliação — ${today}`,
      Plano: pat ? `Plano Terapêutico — ${pat.full_name}` : `Plano Terapêutico — ${today}`,
    };
    if (type === 'Evolucao') {
      const day = opts.day || localToday();
      const existing = evoOnDay(day);
      if (existing) {
        pushToast('info', `Já existe uma evolução em ${fmtDayStr(day)} — abrindo para atualizar.`);
        await openEdit(existing.id);
        return;
      }
      setCurrentRecord({
        patient_id: selectedPatientId || '', record_type: 'Evolucao', title: `Evolução — ${fmtDayStr(day)}`,
        created_at: `${day}T12:00:00`,
        ...(opts.appointment ? { appointment_id: String(opts.appointment.id), start_time: opts.appointment.start_hm, end_time: opts.appointment.end_hm } : {}),
      } as any);
      setEditorMode('new');
      setEditorOpen(true);
      return;
    }
    setCurrentRecord({ patient_id: selectedPatientId || '', record_type: type, title: titleMap[type] || `Registro — ${today}` });
    setEditorMode('new');
    setEditorOpen(true);
  };

  const openImportedClinicalFile = (data: ImportedClinicalFile) => {
    const titles: Record<string, string> = {
      Anamnese: `Anamnese importada — ${selectedPatient?.full_name || ''}`.trim(),
      Avaliacao: `Avaliação importada — ${fmtDayStr(data.date)}`,
      Evolucao: `Evolução importada — ${fmtDayStr(data.date)}`,
    };
    const organized = { ...(data.organized || {}) } as Record<string, any>;
    // A IA nunca preenche automaticamente o campo restrito a partir de uma
    // importação. O texto original continua disponível para a profissional
    // revisar e decidir manualmente o que deve ficar restrito.
    delete organized.conteudo_restrito;
    setImportClinicalOpen(false);
    setCurrentRecord({
      patient_id: selectedPatientId || '',
      record_type: data.recordType,
      title: titles[data.recordType],
      created_at: `${data.date}T12:00:00`,
      status: 'Rascunho',
      ai_status: 'organized',
      draft_content: data.draft,
      restricted_content: '',
      ai_organized_content: JSON.stringify({ ...organized, pontos_revisao: data.reviewPoints }),
      attachments: [data.attachment],
    } as any);
    setEditorMode('new');
    setEditorOpen(true);
  };

  const openEdit = async (id: string, extra: { reassess?: boolean; section?: string } = {}) => {
    try {
      const data = await api.get<MedicalRecord>(`/medical-records/${id}`);
      setCurrentRecord({ ...data, id: String(data.id), tags: data.tags || [], ...(extra.reassess ? { __reassess: true } : {}), ...(extra.section ? { __section: extra.section } : {}) } as any);
      setEditorMode('edit');
      setEditorOpen(true);
    } catch (e) { pushToast('error', 'Erro ao carregar registro'); }
  };

  const runBackfill = async () => {
    if (!selectedPatientId) return;
    setBackfilling(true);
    try {
      const r = await api.post<any>('/medical-records/absences/backfill', { patient_id: selectedPatientId });
      pushToast('success', r?.created ? `${r.created} registro(s) de falta gerado(s).` : 'Nenhum registro novo foi necessário.');
      await fetchRecords(selectedPatientId);
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao gerar registros das faltas'); }
    finally { setBackfilling(false); setBackfillConfirm(false); }
  };

  const saveReassessDue = async (id: string, due: string) => {
    try {
      const full = await api.get<any>(`/medical-records/${id}`);
      let o: any = {};
      try { o = JSON.parse(full.ai_organized_content || '{}') || {}; } catch { o = {}; }
      if (o._estruturado) o._estruturado.meta = { ...(o._estruturado.meta || {}), proxima_reavaliacao: due };
      else o._proxima_reavaliacao = due;
      await api.put(`/medical-records/${id}`, { ai_organized_content: JSON.stringify(o) });
      pushToast('success', 'Próxima reavaliação atualizada.');
      if (selectedPatientId) await fetchRecords(selectedPatientId);
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao atualizar a data'); throw e; }
  };

  // Reúne o que não vem na lista de registros: ficha cadastral, perfil/clínica, humor por sessão, instrumentos aplicados,
  // anamneses respondidas, anexos dos registros e documentos enviados. Falha parcial nunca bloqueia a exportação.
  const collectExportData = async () => {
    const empty = { patientFull: null as any, profile: null as any, moods: [] as ExportMood[], instruments: [] as ExportInstrument[], attachments: [] as ExportAttachment[], anamnesisSends: [] as ExportAnamnesisSend[] };
    if (!selectedPatientId) return empty;
    const pid = selectedPatientId;
    const [pat, profile, moods, templates, uploads, sends] = await Promise.all([
      api.get<any>(`/patients/${pid}`).catch(() => null),
      api.get<any>('/profile/me').catch(() => null),
      api.get<any[]>(`/patients/${pid}/mood-logs`).catch(() => []),
      api.get<any[]>('/neuro-assessments').catch(() => []),
      api.get<any[]>('/documents', { patient_id: pid }).catch(() => []),
      api.get<any[]>(`/anamnesis-send?patient_id=${pid}`).catch(() => []),
    ]);

    const moodList: ExportMood[] = (Array.isArray(moods) ? moods : []).map((m: any) => ({ date: m.recorded_at || m.created_at, score: m.mood_score, emotions: m.emotions, note: m.note }));

    const instruments: ExportInstrument[] = [];
    if (Array.isArray(templates) && templates.length) {
      await Promise.all(templates.map(async (tpl: any) => {
        const res = await api.get<any[]>(`/neuro-assessments/${tpl.id}/results`, { patient_id: pid }).catch(() => []);
        (res || []).forEach((r: any) => {
          const labels: Record<string, string> = {};
          (tpl.fields || []).forEach((f: any) => { labels[f.id] = f.label; });
          const fields = Object.entries(r.data || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)
            .map(([k, v]) => ({ label: labels[k] || k.replace(/_/g, ' '), value: String(v) }));
          instruments.push({ name: tpl.name, date: r.created_at, fields });
        });
      }));
      instruments.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    }

    const attachments: ExportAttachment[] = [];
    await Promise.all(patientRecords.map(async (r) => {
      let atts = r.attachments;
      if (!atts) {
        const full = await api.get<MedicalRecord>(`/medical-records/${r.id}`).catch(() => null);
        atts = full?.attachments || [];
      }
      (atts || []).forEach((a: any) => attachments.push({ name: a.file_name || 'Arquivo', detail: `Registro: ${r.title}` }));
    }));
    (Array.isArray(uploads) ? uploads : []).forEach((u: any) => attachments.push({ name: u.file_name || u.name || u.original_name || 'Arquivo', detail: u.created_at ? `Enviado em ${fmtDate(u.created_at)}` : '' }));

    const anamnesisSends: ExportAnamnesisSend[] = (Array.isArray(sends) ? sends : []).filter((s: any) => s.status === 'answered' && s.responses).map((s: any) => {
      let resp: any = s.responses;
      if (typeof resp === 'string') { try { resp = JSON.parse(resp); } catch { resp = {}; } }
      return { title: s.title, date: s.completed_at || s.created_at, responses: resp && typeof resp === 'object' ? resp : {} };
    });

    return { patientFull: pat, profile, moods: moodList, instruments, attachments, anamnesisSends };
  };

  const finishExport = async (mode: ExportMode, format: 'pdf' | 'word') => {
    if (!selectedPatient) return;
    setIsLoading(true);
    try {
        // Anotações restritas não levam extras (mesma regra de antes); só o perfil é lido para o cabeçalho.
        const data = mode === 'restricted_only'
          ? { patientFull: null as any, profile: await api.get<any>('/profile/me').catch(() => null), moods: [] as ExportMood[], instruments: [] as ExportInstrument[], attachments: [] as ExportAttachment[], anamnesisSends: [] as ExportAnamnesisSend[] }
          : await collectExportData();
        // Clínica e profissional: GET /profile/me; o contexto de auth cobre campos ausentes
        const pf: any = data.profile || {};
        const u: any = user || {};
        const pick = (...vals: any[]) => { for (const v of vals) { if (v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'undefined' && String(v) !== 'null') return String(v).trim(); } return ''; };
        const fmtDoc = (s: string) => { const d = s.replace(/\D/g, ''); if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'); return s; };
        const profName = pick(pf.name, u.name) || 'Profissional';
        const regLabel = pick(pf.registry_label) || 'CRP';
        const regNum = pick(pf.registry_number, pf.crp, u.crp);
        const registry = regNum ? (regNum.toUpperCase().startsWith(regLabel.toUpperCase()) ? regNum : `${regLabel} ${regNum}`) : '';
        const addrParts = [pick(pf.address, u.address), [pick(pf.city), pick(pf.state)].filter(Boolean).join(' - '), pick(pf.zip_code) && `CEP ${pick(pf.zip_code)}`].filter(Boolean);
        const logoPath = pick(pf.clinic_logo_url, pf.clinicLogoUrl, u.clinicLogoUrl);
        const logo = logoPath ? await loadLogoImage(getStaticUrl(logoPath)) : null;
        const clinic: ClinicInfo = {
          name: pick(pf.company_name, u.companyName, pf.name, u.name) || 'Clínica',
          legalName: pick(pf.legal_name, pf.razao_social, pf.corporate_name),
          cnpj: pick(pf.cnpj) ? fmtDoc(pick(pf.cnpj)) : '',
          phone: pick(pf.phone, u.phone),
          email: pick(pf.email, u.email),
          address: addrParts.join(', '),
          website: pick(pf.website, pf.site),
          logo,
        };
        const professional: ProfessionalInfo = { name: profName, registry, specialty: pick(pf.area_name, pf.specialty, u.specialty, u.areaName) };
        const fullPat: Record<string, any> = data.patientFull || {};
        const patientMerged: any = { ...selectedPatient, ...Object.fromEntries(Object.entries(fullPat).filter(([, v]) => v !== null && v !== undefined && v !== '')) };
        const exportRecords = patientRecords.map(r => ({
          id: String(r.id), title: r.title, record_type: r.record_type, status: r.status, content: r.content, draft_content: r.draft_content,
          ai_organized_content: r.ai_organized_content, restricted_content: r.restricted_content, appointment_type: r.appointment_type,
          start_time: r.start_time, end_time: r.end_time, created_at: r.created_at, tags: r.tags, professional_name: r.professional_name,
        }));
        const model = buildClinicalDocModel({
          mode, clinic, professional, patient: patientMerged, records: exportRecords,
          moods: data.moods, instruments: data.instruments, attachments: data.attachments, anamnesisSends: data.anamnesisSends,
          anamnesisLabels: ANAMNESIS_FIELD_LABELS, typeLabels: TYPE_LABELS,
        });
        const modeFile: Record<ExportMode, string> = { standard: 'Resumo_Clinico', full: 'Prontuario_Completo', no_restricted: 'Prontuario_Compartilhado', restricted_only: 'Anotacoes_Restritas' };
        const baseName = `${selectedPatient.full_name.replace(/[^\p{L}\p{N}]+/gu, '_')}_${modeFile[mode]}`;

        if (format === 'pdf') {
          renderClinicalPdf(model).save(`${baseName}.pdf`);
        } else {
          saveAs(await buildClinicalDocxBlob(model), `${baseName}.docx`);
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
        pushToast('error', 'Erro na exportação:' + err.message);
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
        key={String(currentRecord?.id ?? 'new')}
        onExists={(id) => { setEditorOpen(false); openEdit(id); }}
        record={currentRecord} mode={editorMode}
        patients={patients} selectedPatientId={selectedPatientId}
        onSave={() => selectedPatientId && fetchRecords(selectedPatientId)}
        onClose={() => setEditorOpen(false)}
        onExport={() => setShowExportModal(true)}
        anamnesisSends={anamnesisSends}
        planRecordId={patientRecords.find(r => r.record_type === 'Plano')?.id}
        nextSessionNumber={patientRecords.filter(r => r.record_type === 'Evolucao').length + 1}
        patientRecords={patientRecords}
      />
    );
  }

  return (
    <PageWrapper>
     <div className="space-y-4">
      <SectionTitle
        icon={FileText}
        title="Prontuário Clínico"
        description={view === 'patient' && selectedPatient ? `Paciente: ${selectedPatient.full_name}` : 'Histórico clínico organizado por paciente: anamneses, avaliações, evoluções e planos.'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {view === 'patient' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<ArrowLeft size={14}/>}
                  onClick={() => { setSearchParams({}); setView('grid'); setSelectedPatientId(null); setRecords([]); setAnamnesisSends([]); }}
                >
                  <span className="hidden sm:inline">Voltar</span>
                </Button>

                <Button variant="outline" size="sm" iconLeft={<Download size={14}/>} onClick={exportPDF}>
                  <span className="hidden sm:inline">PDF</span>
                </Button>

                <Button variant="outline" size="sm" iconLeft={<FileUp size={14}/>} onClick={() => setImportClinicalOpen(true)}>
                  <span className="hidden sm:inline">Importar arquivo</span>
                </Button>

                <Button variant="primary" size="sm" iconLeft={<Plus size={14}/>} onClick={openNew}>
                  <span className="hidden sm:inline">Novo Registro</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {view === 'patient' && (
        <RecordsTabsBar value={activeTab} onChange={changeRecordsTab} />
      )}

      {/* Busca (sozinha no mobile) → filtros de tipo */}
      {view === 'patient' && activeTab !== 'timeline' && activeTab !== 'analysis' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <FilterLineSearch value={historySearch} onChange={setHistorySearch} placeholder="Buscar nas evoluções e notas..." className="w-full sm:max-w-[280px]" />
            {TAB_RECORD_TYPE[activeTab] && (
              <Button className="hidden sm:inline-flex" variant="primary" size="sm" iconLeft={<Plus size={14}/>} onClick={runTabAction}>
                {tabActionLabel}
              </Button>
            )}
          </div>
          {activeTab === 'history' && (
            <>
              <div className="sm:hidden">
                <Select aria-label="Tipo de registro" value={filterType || '__all__'} onChange={e => setFilterType(e.target.value === '__all__' ? '' : e.target.value)}>
                  <option value="__all__">Tudo</option>
                  {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>
              </div>
              <div className="hidden sm:block overflow-x-auto no-scrollbar">
                <FilterLineSegmented
                  value={filterType || '__all__'}
                  onChange={(v) => setFilterType(v === '__all__' ? '' : v)}
                  options={[
                    { value: '__all__', label: 'Tudo' },
                    ...Object.entries(TYPE_LABELS).map(([key, label]) => ({ value: key, label })),
                  ]}
                />
              </div>
            </>
          )}
          {TAB_RECORD_TYPE[activeTab] && (
            <Button className="w-full sm:hidden" variant="primary" size="sm" iconLeft={<Plus size={14}/>} onClick={runTabAction}>
              {tabActionLabel}
            </Button>
          )}
        </div>
      )}


      {view === 'grid' && (
        <RecordsHome
          patients={patients}
          records={globalRecords}
          loading={isLoading || globalLoading}
          error={globalError || patientsError}
          onRetry={fetchAll}
          onOpenPatient={id => {
            setActiveTab('history');
            setHistorySearch('');
            setRecords([]);
            setFilterStatus(''); setFilterType(''); setDateFrom(null); setDateTo(null);
            setSearchParams({ patient_id: id });
          }}
          onOpenRecord={async record => {
            setFilterStatus(''); setFilterType(''); setDateFrom(null); setDateTo(null);
            setHistorySearch('');
            setRecords([]);
            const tab = Object.entries(TAB_RECORD_TYPE).find(([, type]) => type === record.record_type)?.[0];
            setActiveTab((tab || 'history') as RecordsTabId);
            setSelectedPatientId(String(record.patient_id));
            setSearchParams({ patient_id: String(record.patient_id) });
            await fetchRecords(String(record.patient_id));
            await openEdit(record.id);
          }}
        />
      )}

      {/* ─── DETALHE DO PACIENTE ─── */}
      {view === 'patient' && selectedPatient && (
        <div className="space-y-4">
          {/* Stats do paciente */}
          <StatGrid cols={3} className="!grid-cols-3">
            <StatCard title="Total" value={patientRecords.length} icon={Layers} color="info" delay={0} />
            <StatCard title="Aprovados" value={patientRecords.filter(r => r.status === 'Aprovado').length} icon={CheckCircle2} color="success" delay={0.05} />
            <StatCard title="Rascunhos" value={patientRecords.filter(r => r.status === 'Rascunho').length} icon={Edit3} color="warning" delay={0.1} />
          </StatGrid>

          {/* Histórico */}
          {/* Sessoes e evolucao: linha do tempo */}
          {activeTab === 'sessions' && (
            <div className="animate-fadeIn">
              <div className="space-y-3">
                <SessionsAlerts
                  pendingMotive={pendingMotiveCount}
                  sessionsWithout={sessionsWithout}
                  absencesWithout={absencesWithout.length}
                  backfilling={backfilling}
                  onRegister={(x) => handleSelectType('Evolucao', { day: x.day, appointment: x })}
                  onBackfill={() => setBackfillConfirm(true)}
                />
                <SessionTimeline
                  records={tabRecords as any}
                  emptyFiltered={patientRecords.some(r => r.record_type === 'Evolucao')}
                  onOpen={(r) => openViewer(r)}
                  onNew={() => handleSelectType('Evolucao')}
                  renderActions={(r) => renderRecordActions(r)}
                  onFillMotive={(r) => openEdit(r.id, { section: 'estrutura' })}
                />
              </div>
            </div>
          )}

          {/* Avaliacao clinica: versoes + documento por secoes */}
          {activeTab === 'assessment' && (
            <div className="animate-fadeIn">
              <AssessmentPanel
                records={patientRecords.filter(r => r.record_type === 'Avaliacao') as any}
                fetchFull={async (id) => { try { return await api.get<any>(`/medical-records/${id}`); } catch { return null; } }}
                onNew={() => handleSelectType('Avaliacao')}
                onEdit={(id) => openEdit(id)}
                onReassess={(id) => openEdit(id, { reassess: true })}
                onSaveDue={saveReassessDue}
                onOpenOlder={(id) => openEdit(id)}
                extraActions={(r) => renderRecordActions(r, {})}
              />
            </div>
          )}

          {/* Registros / Anamnese / Plano terapeutico: lista */}
          {activeTab === 'anamnesis' && (
            <div className="animate-fadeIn">
              <AnamnesisLivePanel
                current={liveCurrent('Anamnese') as any}
                older={liveOlder('Anamnese') as any}
                sends={anamnesisSends}
                onUpdate={(id) => openEdit(id)}
                onHistory={(id) => openEdit(id, { section: 'historico' })}
                onSend={(r) => selectedPatient && setSendAnamnesisModal({ record: r as any, patient: selectedPatient })}
                onFillNow={() => handleSelectType('Anamnese')}
                onStartSend={createAnamnesisDraftAndSend}
                onViewResponses={(sendId) => setAnamnesisResponseModal({ sendId, patientName: selectedPatient?.full_name || '' })}
                onOpenOlder={(id) => openEdit(id)}
                extraActions={(r) => renderRecordActions(r, {})}
              />
            </div>
          )}
          {activeTab === 'plan' && (
            <div className="animate-fadeIn">
              <PlanLivePanel
                current={liveCurrent('Plano') as any}
                older={liveOlder('Plano') as any}
                onOpen={(id) => openEdit(id)}
                onHistory={(id) => openEdit(id, { section: 'historico' })}
                onCreate={() => handleSelectType('Plano')}
                extraActions={(r) => renderRecordActions(r, {})}
              />
            </div>
          )}
          {activeTab === 'history' && (
            <div className="animate-fadeIn">
              {activeTab !== 'history' && tabRecords.length === 0 && !historySearch.trim() ? (
                <EmptyState
                  icon={activeTab === 'plan' ? Layers : BookOpen}
                  title={activeTab === 'plan' ? 'Nenhum plano terapêutico' : 'Nenhuma anamnese'}
                  description={activeTab === 'plan' ? 'Defina necessidades, metas e intervenções do acompanhamento deste paciente.' : 'Envie o formulário de anamnese ao paciente ou registre os dados da entrevista inicial.'}
                  action={
                    <Button onClick={() => handleSelectType(TAB_RECORD_TYPE[activeTab])} variant="primary" size="sm" iconLeft={<Plus size={14}/>}>
                      {activeTab === 'plan' ? 'Novo plano' : 'Nova anamnese'}
                    </Button>
                  }
                />
              ) : patientRecords.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Nenhuma evolução registrada"
                  description="Este paciente ainda não possui registros clínicos. Inicie a primeira evolução agora."
                  action={
                    <Button onClick={openNew} variant="primary" size="sm" iconLeft={<Plus size={14}/>}>
                      Iniciar Evolução
                    </Button>
                  }
                />
              ) : tabRecords.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Nenhum registro encontrado"
                  description="Ajuste a busca ou os filtros para ver outros registros."
                  action={<Button variant="outline" size="sm" onClick={() => { setHistorySearch(''); setFilterType(''); }}>Limpar busca</Button>}
                />
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="md:hidden space-y-3">
                    {tabRecords.map((r) => {
                      const sendForThisRecord = anamnesisSends.find(s => String(s.medical_record_id) === String(r.id));
                      const pat = patients.find(p => String(p.id) === String(r.patient_id));
                      return (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100"><FileText size={16}/></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm leading-tight">{r.title}</p>
                              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{TYPE_LABELS[r.record_type] || r.record_type}{r.appointment_type ? ` · ${r.appointment_type}` : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] font-semibold text-slate-500">{fmtDate(r.created_at)}</p>
                              {r.start_time && <p className="text-[11px] text-slate-400">{r.start_time}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <Badge color={TYPE_BADGE_COLOR[TYPE_LABELS[r.record_type]] ?? 'default'}>{TYPE_LABELS[r.record_type] || r.record_type}</Badge>
                            <Badge color={STATUS_BADGE_COLOR[r.status] ?? 'default'}>{r.status}</Badge>
                            {r.ai_status === 'organized' && <Badge color="purple" icon={<Sparkles size={9}/>}>IA</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {r.record_type === 'Anamnese' && pat && (
                              sendForThisRecord ? (
                                <Button size="xs" variant={sendForThisRecord.status === 'answered' ? 'success' : 'outline'}
                                  onClick={() => setAnamnesisResponseModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}
                                  iconLeft={<ClipboardCheck size={14}/>}>
                                  {sendForThisRecord.status === 'answered' ? 'Respostas' : 'Status'}
                                </Button>
                              ) : (
                                <Button size="xs" variant="primary" onClick={() => setSendAnamnesisModal({ record: r, patient: pat })} iconLeft={<Send size={14}/>}>
                                  Enviar
                                </Button>
                              )
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              {[
                                { icon: <Eye size={14}/>, title: "Visualizar", onClick: async () => { try { const full = await api.get<MedicalRecord>(`/api/medical-records/${r.id}`); setViewerRecord(full); } catch { setViewerRecord(r); } }, color: "indigo", skip: r.record_type === 'Anamnese' },
                                { icon: <Edit3 size={14}/>, title: "Editar", onClick: () => openEdit(r.id), color: "amber" },
                                { icon: <Lock size={14}/>, title: "Restrito", onClick: () => setShowPwModal({ type: 'restricted', recordId: r.id }), color: "rose", isRose: true },
                                { icon: <Share2 size={14}/>, title: "Compartilhar", onClick: () => setShareModal({ record: r }), color: "purple" },
                                { icon: <Trash2 size={14}/>, title: "Excluir", onClick: () => setDeleteId(r.id), color: "rose" },
                              ].filter(b => !b.skip).map((btn, idx) => (
<IconButton key={idx} size="sm" variant="ghost" onClick={btn.onClick} title={btn.title} aria-label={btn.title} className={btn.title === 'Excluir' ? 'text-red-600 hover:bg-red-50' : undefined}>
  {btn.icon}
</IconButton>
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
                    data={tabRecords}

                  keyExtractor={(r) => r.id}
                  columns={[
                    {
                      header: 'Documento / Registro',
                      accessor: 'title',
                      render: (r: MedicalRecord) => (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 shadow-sm">
                            <FileText size={18}/>
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-semibold text-slate-800 text-sm truncate">{r.title}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[11px] font-semibold text-slate-400">{TYPE_LABELS[r.record_type] || r.record_type}</span>
                               {r.appointment_type && (
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                               )}
                               {r.appointment_type && (
                                  <span className="text-[11px] font-semibold text-slate-400 leading-none">{r.appointment_type}</span>
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
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                             <Calendar size={13} className="text-slate-300"/> {fmtDate(r.created_at)}
                          </div>
                          {r.start_time && (
                             <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
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
                        return (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <Badge size="md" color={TYPE_BADGE_COLOR[TYPE_LABELS[r.record_type]] ?? 'default'}>
                              {TYPE_LABELS[r.record_type] || r.record_type}
                            </Badge>
                            <Badge size="md" color={STATUS_BADGE_COLOR[r.status] ?? 'default'}>{r.status}</Badge>
                            {r.ai_status === 'organized' && <Badge size="md" color="purple" icon={<Sparkles size={9}/>}>IA</Badge>}
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
                                      <Button
                                        size="xs"
                                        variant={sendForThisRecord.status === 'answered' ? 'success' : 'outline'}
                                        iconLeft={<ClipboardCheck size={14}/>}
                                        onClick={() => setAnamnesisResponseModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}
                                        className={sendForThisRecord.status === 'cancelled' ? 'line-through opacity-60' : undefined}
                                      >
                                        <span className="hidden lg:inline">
                                          {sendForThisRecord.status === 'answered' ? 'Ver respostas' :
                                           sendForThisRecord.status === 'cancelled' ? 'Cancelado' :
                                           'Status Envio'}
                                        </span>
                                      </Button>
                                      {canCancel && (
                                        <IconButton size="sm" variant="danger" title="Cancelar envio" aria-label="Cancelar envio"
                                          onClick={() => setCancelAnamnesisModal({ sendId: sendForThisRecord.id, patientName: pat.full_name })}>
                                          <X size={14}/>
                                        </IconButton>
                                      )}
                                      <IconButton size="sm" variant="ghost" title="Enviar novamente" aria-label="Enviar novamente"
                                        onClick={() => setSendAnamnesisModal({ record: r, patient: pat })}>
                                        <Plus size={14}/>
                                      </IconButton>
                                    </>
                                  );
                                }

                                return (
                                  <Button size="xs" variant="primary" iconLeft={<Send size={14}/>}
                                    onClick={() => setSendAnamnesisModal({ record: r, patient: pat })}>
                                    <span className="hidden lg:inline">Enviar ao Paciente</span>
                                  </Button>
                                );
                              })()}
                            </div>
                          )}

                          {/* Ações de Linha Padrão */}
                          <div className="flex items-center gap-1">
                            {[
                              { icon: <Eye size={14}/>, title: "Visualizar", onClick: async () => { try { const full = await api.get<MedicalRecord>(`/api/medical-records/${r.id}`); setViewerRecord(full); } catch { setViewerRecord(r); } }, color: "indigo", skip: r.record_type === 'Anamnese' },
                              { icon: <Edit3 size={14}/>, title: "Editar", onClick: () => openEdit(r.id), color: "amber" },
                              { icon: <Lock size={14}/>, title: "Restrito", onClick: () => setShowPwModal({ type: 'restricted', recordId: r.id }), color: "rose", isRose: true },
                              { icon: <Share2 size={14}/>, title: "Compartilhar", onClick: () => setShareModal({ record: r }), color: "purple" },
                              { icon: <Trash2 size={14}/>, title: "Excluir", onClick: () => setDeleteId(r.id), color: "rose" },
                            ].filter(b => !b.skip).map((btn, idx) => (
<IconButton key={idx} size="sm" variant="ghost" onClick={btn.onClick} title={btn.title} aria-label={btn.title} className={btn.title === 'Excluir' ? 'text-red-600 hover:bg-red-50' : undefined}>
  {btn.icon}
</IconButton>
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
            <PanelCard title="Linha do Tempo" icon={Clock} description="Histórico cronológico de atendimentos" className="animate-fadeIn">
              <PatientTimeline
                patientId={String(selectedPatientId)}
                patientName={selectedPatient?.full_name}
              />
            </PanelCard>
          )}

          {/* Análise */}
          {activeTab === 'analysis' && analysisData && (
            <div className="space-y-3 animate-fadeIn">
              {/* KPI row */}
              <StatGrid cols={4}>
                <StatCard
                  title="Média / mês"
                  value={analysisData.stats.avgPerMonth}
                  icon={TrendingUp}
                  color="info"
                  description="registros por mês"
                  delay={0}
                />
                <StatCard
                  title="Taxa de aprovação"
                  value={`${analysisData.stats.approvalRate}%`}
                  icon={CheckCircle2}
                  color="success"
                  description={`${analysisData.byStatus.find(s => s.name === 'Aprovado')?.value ?? 0} de ${analysisData.stats.total} aprovados`}
                  delay={0.05}
                />
                <StatCard
                  title="Duração média"
                  value={analysisData.stats.avgDuration ? `${analysisData.stats.avgDuration} min` : '—'}
                  icon={Clock}
                  color="purple"
                  description={analysisData.stats.avgDuration ? 'por sessão registrada' : 'sem horários registrados'}
                  delay={0.1}
                />
                <StatCard
                  title="Período"
                  value={analysisData.stats.firstDate ? fmtDate(analysisData.stats.firstDate) : '—'}
                  icon={CalendarDays}
                  color="warning"
                  description={analysisData.stats.lastDate && analysisData.stats.firstDate !== analysisData.stats.lastDate ? `até ${fmtDate(analysisData.stats.lastDate)}` : 'único registro'}
                  delay={0.15}
                />
              </StatGrid>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Evolução por mês — ocupa 2 colunas */}
                <PanelCard className="lg:col-span-2" title="Registros por Mês" icon={BarChart2} description="Frequência de atendimentos ao longo do tempo">
                  <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analysisData.byMonth} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: 12, fontWeight: 500 }}
                        formatter={(v: any) => [v, 'Registros']}
                        cursor={{ fill: '#f1f5f9', radius: 8 }}
                      />
                      <Bar dataKey="count" fill="var(--c-600)" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </PanelCard>

                {/* Status donut */}
                <PanelCard title="Status" icon={Activity} description="Distribuição atual dos registros" contentClassName="flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={analysisData.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {analysisData.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: 12, fontWeight: 500 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 mt-2">
                    {analysisData.byStatus.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                          <span className="text-[11px] font-semibold text-zinc-600">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-zinc-800">{s.value}</span>
                          <span className="text-[11px] font-semibold text-zinc-300">{Math.round((s.value / analysisData.stats.total) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelCard>
              </div>

              {/* Tipo de registro — barra horizontal proporcional */}
              <PanelCard title="Tipos de Registro" icon={Layers} description="Distribuição por categoria de prontuário">
                <div className="space-y-3">
                  {analysisData.byType.map((t, i) => {
                    const pct = Math.round((t.value / analysisData.stats.total) * 100);
                    return (
                      <div key={t.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                            <span className="text-[11px] font-semibold text-zinc-700">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-800">{t.value}</span>
                            <span className="text-[11px] font-semibold text-zinc-400 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PanelCard>
            </div>
          )}
        </div>
      )}

      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteRecord}
        title="Excluir registro?"
        variant="danger"
        confirmLabel="Confirmar exclusão"
        message="Você está prestes a excluir um registro clínico. Esta operação será registrada nos logs de auditoria do sistema para conformidade com o CFP."
      />

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
        size="lg"
        footer={<ModalFooter><Button variant="outline" size="sm" onClick={() => setRestrictedModal(null)}>Fechar Visualização</Button></ModalFooter>}
      >
        <div className="space-y-4 pt-2">
          <div className="bg-rose-50 border border-rose-100/50 rounded-lg p-6 ">
            <p className="text-sm font-medium text-rose-900 leading-relaxed whitespace-pre-wrap selection:bg-rose-200">
               {restrictedModal?.content}
            </p>
          </div>
          <div className="flex items-center gap-2 px-1">
             <Shield size={12} className="text-slate-400"/>
             <p className="text-[11px] text-slate-400 font-semibold">Protegido por Criptografia de Ponta a Ponta</p>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      {importClinicalOpen && selectedPatient && selectedPatientId && (
        <ImportClinicalFileModal
          patientId={selectedPatientId}
          patientName={selectedPatient.full_name}
          onClose={() => setImportClinicalOpen(false)}
          onPrepared={openImportedClinicalFile}
        />
      )}

      {showExportModal && (
        <ExportModal
            patient={selectedPatient}
            records={patientRecords}
            onExport={finishExport}
            onClose={() => setShowExportModal(false)}
        />
      )}

      {sendAnamnesisModal && (
      <SendAnamnesisModal
        record={sendAnamnesisModal.record}
        patient={sendAnamnesisModal.patient}
        user={user as any}
        onClose={() => {
          const id = String(sendAnamnesisModal.record.id);
          setSendAnamnesisModal(null);
          if (freshAnamnesisIds.current.delete(id)) {
            api.delete(`/medical-records/${id}`)
              .then(() => setRecords(prev => prev.filter(r => String(r.id) !== id)))
              .catch(() => { /* mantém o rascunho se não for possível excluir */ });
          }
        }}
        onSent={(sendData) => {
          freshAnamnesisIds.current.delete(String(sendData.medical_record_id ?? sendAnamnesisModal.record.id));
          setAnamnesisSends(prev => {
            const exists = prev.find(s => s.id === sendData.id);
            return exists ? prev.map(s => s.id === sendData.id ? sendData : s) : [...prev, sendData];
          });
          pushToast('success', 'Anamnese enviada ao paciente com sucesso!');
        }}
      />
      )}

      <ConfirmModal
        isOpen={backfillConfirm}
        onClose={() => setBackfillConfirm(false)}
        onConfirm={runBackfill}
        title="Gerar registros das faltas pendentes"
        message={`Serão criadas ${absencesWithout.length} evolução(ões) de falta (uma por data, em rascunho, com motivo pendente) para agendamentos passados sem evolução na data. Nada existente será alterado ou apagado.`}
        confirmLabel="Gerar registros"
        variant="primary"
        loading={backfilling}
      />

      {/* Type Selector */}
      {typeSelectorOpen && (
        <RecordTypeSelector
          onSelect={(t) => handleSelectType(t)}
          existing={{
            Anamnese: liveCurrent('Anamnese') ? 'Abrir anamnese' : '',
            Avaliacao: liveCurrent('Avaliacao') ? 'Atualizar avaliação' : '',
            Plano: liveCurrent('Plano') ? 'Abrir plano' : '',
            Evolucao: evoOnDay(localToday()) ? 'Atualizar evolução de hoje' : '',
          }}
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
        <ConfirmModal
          isOpen
          onClose={() => setCancelAnamnesisModal(null)}
          onConfirm={async () => {
            try {
              await api.post(`/anamnesis-send/${cancelAnamnesisModal.sendId}/cancel`, {});
              setAnamnesisSends((prev: any[]) => prev.map((s: any) => s.id === cancelAnamnesisModal.sendId ? { ...s, status: 'cancelled' } : s));
              pushToast('success', 'Envio cancelado. Lembretes interrompidos.');
            } catch { pushToast('error', 'Erro ao cancelar envio.'); }
            finally { setCancelAnamnesisModal(null); }
          }}
          title="Cancelar envio de anamnese"
          variant="danger"
          cancelLabel="Manter ativo"
          confirmLabel="Sim, cancelar"
          message={
            <div className="space-y-3">
              <Alert variant="error" title={`Cancelar o formulário de ${cancelAnamnesisModal.patientName}?`}>
                O paciente não poderá mais responder e todos os lembretes automáticos serão interrompidos imediatamente.
              </Alert>
              <p className="text-xs text-slate-500">
                Se quiser enviar novamente no futuro, basta clicar em <strong>"+"</strong> para gerar um novo link.
              </p>
            </div>
          }
        />
      )}
    </PageWrapper>
  );
};
