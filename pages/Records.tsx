import React, { useState, useMemo, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/UI/Modal';
import { PageHeader } from '../components/UI/PageHeader';
import {
  Search, Plus, FileText, Calendar, Clock, Activity, BarChart2,
  Trash2, Eye, Edit3, CheckCircle2, ChevronRight, Loader2,
  Sparkles, Lock, LockOpen, AlertTriangle, Save, Shield,
  X, ArrowLeft, Layers, User, Download, RotateCcw, Tag,
  History, BookOpen, Filter, Share2, Users
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
  Encaminhamento: 'Encaminhamento', Plano: 'Plano Terapêutico', Relatorio: 'Relatório'
};
const PIE_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const strip = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ═══════════════════════════════════════════════════════════════
   PASSWORD GATE MODAL
═══════════════════════════════════════════════════════════════ */
const PasswordModal: React.FC<{ title: string; onConfirm: (p: string) => Promise<void>; onClose: () => void }> = ({ title, onConfirm, onClose }) => {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!pw) return;
    setLoading(true); setErr('');
    try { await onConfirm(pw); onClose(); }
    catch (e: any) { setErr(e?.response?.data?.error || e?.message || 'Senha incorreta'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl p-8 w-full max-w-sm mx-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Shield size={22}/></div>
          <h3 className="font-black text-slate-800 uppercase tracking-tight">{title}</h3>
        </div>
        <p className="text-sm text-slate-500">Digite sua senha de acesso ao sistema para continuar.</p>
        <input type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-indigo-400 text-sm" placeholder="••••••••" />
        {err && <p className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-black uppercase text-xs hover:bg-slate-50">Cancelar</button>
          <button onClick={submit} disabled={loading} className="flex-1 h-11 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs hover:bg-indigo-700 transition flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Shield size={14}/>} Confirmar
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md mx-4 space-y-6 animate-zoomIn">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Download size={28}/></div>
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Exportar Documentação</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{patient?.full_name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Conteúdo</p>
          {[
            { id: 'standard', title: 'Resumo Clínico Padrão', desc: 'Informações essenciais para continuidade do cuidado.' },
            { id: 'full', title: 'Prontuário Completo', desc: 'Todo o histórico clínico e evoluções (sem campo restrito).' },
            { id: 'no_restricted', title: 'Versão Compartilhada', desc: 'Apenas os campos públicos/compartilhados.' },
            { id: 'restricted_only', title: 'Anotações Restritas', desc: 'Apenas o campo restrito (uso interno autorizado).' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setMode(opt.id as ExportMode)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${mode === opt.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200'}`}>
              <div className="font-black text-sm mb-0.5">{opt.title}</div>
              <div className={`text-[10px] font-medium leading-tight ${mode === opt.id ? 'text-indigo-100' : 'text-slate-400'}`}>{opt.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={() => onExport(mode, 'pdf')} className="h-14 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-700 shadow-xl shadow-slate-200">
            <FileText size={16}/> Gerar PDF
          </button>
          <button onClick={() => onExport(mode, 'word')} className="h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
            <Download size={16}/> Gerar Word
          </button>
        </div>
        
        <button onClick={onClose} className="w-full h-10 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Fechar</button>
      </div>
    </div>
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

const RecordViewer: React.FC<{ record: MedicalRecord; patient?: Patient; onClose: () => void; onEdit: () => void }> = ({ record, patient, onClose, onEdit }) => {
  const organized = useMemo(() => {
    if (!record.ai_organized_content) return null;
    try { return JSON.parse(record.ai_organized_content); } catch { return null; }
  }, [record]);

  const reviewPoints: string[] = organized?.pontos_revisao || [];
  const fields = ORGANIZED_FIELDS_LABELS.filter(f => organized?.[f.key]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden animate-zoomIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-8 py-6 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}/>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[record.status] || 'bg-white/20 text-white border-white/20'}`}>{record.status}</span>
                {record.ai_status === 'organized' && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 flex items-center gap-1"><Sparkles size={8}/> Organizado IA</span>}
              </div>
              <h2 className="font-black text-white text-xl leading-tight truncate">{record.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-indigo-100 text-xs font-bold">
                {patient && <span className="flex items-center gap-1"><User size={11}/>{patient.full_name}</span>}
                <span className="flex items-center gap-1"><Calendar size={11}/>{fmtDate(record.created_at)}</span>
                {record.start_time && <span className="flex items-center gap-1"><Clock size={11}/>{record.start_time}{record.end_time ? ` – ${record.end_time}` : ''}</span>}
                <span className="bg-white/20 px-2 py-0.5 rounded-lg">{TYPE_LABELS[record.record_type] || record.record_type}</span>
                {record.appointment_type && <span className="bg-white/20 px-2 py-0.5 rounded-lg capitalize">{record.appointment_type}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onEdit} className="h-9 px-4 bg-white/20 hover:bg-white/30 text-white rounded-xl font-black text-xs uppercase transition flex items-center gap-2 border border-white/30">
                <Edit3 size={13}/> Editar
              </button>
              <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition border border-white/30">
                <X size={16}/>
              </button>
            </div>
          </div>
          {record.tags && record.tags.length > 0 && (
            <div className="relative flex flex-wrap gap-1.5 mt-3">
              {record.tags.map((tag, i) => <span key={i} className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold border border-white/20">{tag}</span>)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Review points */}
          {reviewPoints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0"/>
              <div>
                <p className="font-black text-amber-800 text-xs uppercase tracking-wide mb-1">Pontos para revisão humana</p>
                <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-medium">• {p}</li>)}</ul>
              </div>
            </div>
          )}

          {/* Organized fields */}
          {organized && fields.length > 0 ? (
            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.key} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{f.icon}</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{f.label}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{organized[f.key]}</p>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback: raw content */
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conteúdo da Sessão</p>
              <div className="text-sm text-slate-700 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: record.content || record.draft_content || '<em>Sem conteúdo</em>' }}/>
            </div>
          )}

          {/* Draft content if has organized */}
          {organized && record.draft_content && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition list-none flex items-center gap-2">
                <ChevronRight size={12} className="group-open:rotate-90 transition-transform"/> Ver Rascunho Original
              </summary>
              <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{strip(record.draft_content)}</p>
              </div>
            </details>
          )}

          {/* Version info footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
            <span>ID: {record.id}</span>
            {record.updated_at && <span>Atualizado: {fmtDate(record.updated_at)}</span>}
            {record.version_count && <span className="flex items-center gap-1"><History size={10}/> {record.version_count} versões</span>}
          </div>
        </div>
      </div>
    </div>
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
      pushToast('success', 'Acesso compartilhado!');
      onShared();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao compartilhar');
    } finally { setSaving(false); }
  };

  const revoke = async (uid: string) => {
    try {
      await api.delete(`/medical-records/${recordId}/share/${uid}`);
      setShared(prev => prev.filter(id => id !== uid));
      pushToast('success', 'Acesso removido.');
      onShared();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao remover acesso');
    }
  };

  const availableProfessionals = professionals.filter(p => !shared.includes(String(p.id)));
  const sharedProfessionals = professionals.filter(p => shared.includes(String(p.id)));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-zoomIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={18} className="text-indigo-200"/>
                <h3 className="font-black text-white uppercase tracking-tight text-sm">Compartilhar Prontuário</h3>
              </div>
              <p className="text-indigo-200 text-xs font-medium truncate max-w-[260px]">{recordTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition">
              <X size={15}/>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Who already has access */}
          {sharedProfessionals.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Com acesso</p>
              <div className="space-y-2">
                {sharedProfessionals.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-800 text-sm truncate">{p.name}</div>
                      {p.email && <div className="text-[10px] text-slate-400">{p.email}</div>}
                    </div>
                    <button onClick={() => revoke(String(p.id))} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition shrink-0">
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Adicionar profissional</p>
            {availableProfessionals.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl p-4 text-center">Todos os profissionais já têm acesso.</p>
            ) : (
              <div className="flex gap-2">
                <select
                  className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300"
                  value={selectedId} onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">Selecione um profissional...</option>
                  {availableProfessionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
                <button onClick={share} disabled={!selectedId || saving}
                  className="h-11 px-5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 shrink-0">
                  {saving ? <Loader2 size={14} className="animate-spin"/> : <Share2 size={14}/>}
                  Compartilhar
                </button>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Apenas profissionais do mesmo tenant com acesso ao sistema aparecem aqui. O dono do prontuário mantém controle total.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RECORD EDITOR (modal completo: rascunho → IA → revisão → aprovação)
   Suporta os modos exigidos pelo CFP
═══════════════════════════════════════════════════════════════ */
const RecordEditor: React.FC<{
  record: Partial<MedicalRecord> | null; mode: 'new' | 'edit';
  patients: Patient[]; selectedPatientId: string | null;
  onSave: () => void; onClose: () => void;
  onExport: () => void;
}> = ({ record, mode, patients, selectedPatientId, onSave, onClose, onExport }) => {
  const { pushToast } = useToast();
  const [step, setStep] = useState<'draft' | 'ai_result' | 'approve'>(
    record?.ai_organized_content ? 'ai_result' : 'draft'
  );
  const [patientId, setPatientId] = useState(record?.patient_id || selectedPatientId || '');
  const [title, setTitle] = useState(record?.title || `Evolução — ${new Date().toLocaleDateString('pt-BR')}`);
  const [recordType, setRecordType] = useState(record?.record_type || 'Evolucao');
  const [appointmentType, setAppointmentType] = useState(record?.appointment_type || 'individual');
  const [sessionDate, setSessionDate] = useState(record?.created_at ? record.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(record?.start_time || '');
  const [endTime, setEndTime] = useState(record?.end_time || '');
  const [status, setStatus] = useState(record?.status || 'Rascunho');
  const [tags, setTags] = useState((record?.tags || []).join(', '));

  const [draft, setDraft] = useState(strip(record?.draft_content || ''));
  const [privateNotes, setPrivateNotes] = useState(strip(record?.restricted_content || ''));
  const [organized, setOrganized] = useState<any>(null);
  const [reviewPoints, setReviewPoints] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);

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
        patient_context: patient ? `Paciente: ${patient.full_name}` : undefined
      });
      setOrganized(resp.organized);
      setReviewPoints(resp.organized?.pontos_revisao || []);
      setStep('ai_result');
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao organizar com IA');
    } finally {
      setAiLoading(false);
    }
  };

  const buildContent = () => {
    if (!organized) return `<p>${draft}</p>`;
    const fields = [
      ['Motivo da Consulta', organized.motivo_consulta],
      ['Contexto Relevante', organized.contexto_relevante],
      ['Observações Clínicas', organized.observacoes_clinicas],
      ['Intervenções Realizadas', organized.intervencoes_realizadas],
      ['Evolução / Resposta', organized.evolucao_resposta],
      ['Plano Terapêutico', organized.plano_terapeutico],
      ['Encaminhamentos', organized.encaminhamentos],
      ['Observação Complementar', organized.observacao_complementar],
    ].filter(([, v]) => v).map(([k, v]) => `<h3>${k}</h3><p>${v}</p>`).join('');
    return fields || `<p>${draft}</p>`;
  };

  const save = async (finalStatus?: string) => {
    if (!patientId) { pushToast('error', 'Selecione um paciente.'); return; }
    setSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        title, record_type: recordType, appointment_type: appointmentType,
        start_time: startTime || null, end_time: endTime || null,
        status: finalStatus || status,
        draft_content: draft,
        ai_organized_content: organized ? JSON.stringify(organized) : null,
        ai_status: organized ? 'organized' : 'pending',
        content: buildContent(),
        restricted_content: privateNotes || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (mode === 'edit' && record?.id) {
        await api.put(`/medical-records/${record.id}`, payload);
      } else {
        await api.post('/medical-records', payload);
      }
      pushToast('success', 'Prontuário salvo!');
      onSave();
      onClose();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-6 flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose} 
            className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-100 hover:border-rose-100 transition-all shadow-sm"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Voltar / Cancelar</span>
          </button>
          <div className="w-px h-10 bg-slate-100" />
          <div>
            <h2 className="font-black text-slate-900 uppercase tracking-tighter text-lg leading-none">{mode === 'new' ? 'Nova Evolução Clínica' : 'Editar Registro'}</h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{title}</p>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Etapa: {step === 'draft' ? 'Rascunho' : 'Revisão IA'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Step tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 mr-2">
            {(['draft', 'ai_result'] as const).map((s, i) => (
              <button key={s} onClick={() => setStep(s)} disabled={s === 'ai_result' && !organized}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${step === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
                {i + 1}. {s === 'draft' ? 'Rascunho' : 'Revisão IA'}
              </button>
            ))}
          </div>
          <button onClick={() => save()} disabled={saving} className="h-9 px-5 bg-slate-800 text-white rounded-xl font-black text-xs uppercase hover:bg-slate-700 transition flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
          </button>
          <button onClick={() => setShowApproveModal(true)} className="h-9 px-5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition flex items-center gap-2">
            <CheckCircle2 size={14}/> Aprovar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadados */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Paciente</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                <input type="date" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={sessionDate} onChange={e => setSessionDate(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Título</label>
                <input className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300" value={title} onChange={e => setTitle(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Tipo de Registro</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={recordType} onChange={e => setRecordType(e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Modalidade</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={appointmentType} onChange={e => setAppointmentType(e.target.value)}>
                  {['individual','casal','familiar','grupo','online','presencial'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Início</label>
                <input type="time" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={startTime} onChange={e => setStartTime(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Fim</label>
                <input type="time" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={endTime} onChange={e => setEndTime(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Tags (vírgula)</label>
                <input className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" placeholder="ansiedade, fobia..." value={tags} onChange={e => setTags(e.target.value)}/>
              </div>
            </div>
          </div>

          {/* STEP 1 — Rascunho */}
          {step === 'draft' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest">Rascunho Bruto da Sessão</h3>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg font-bold">Escreva livremente — a IA vai organizar</span>
                </div>
                <RichTextEditor
                  value={draft}
                  onChange={setDraft}
                  placeholder="Escreva tudo o que aconteceu na sessão de forma livre. A paciente relatou... Trabalhamos com... Realizei a intervenção... A resposta foi..."
                  minHeight="300px"
                />
                <button onClick={organizeWithAI} disabled={aiLoading || !draft.trim()}
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  {aiLoading ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                  {aiLoading ? 'Organizando com IA...' : 'Organizar Evolução com IA'}
                </button>
              </div>

              {/* Campo Restrito */}
              <div className="bg-rose-50/50 rounded-[24px] border border-rose-100 p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-rose-500"/>
                  <h3 className="font-black text-rose-700 text-xs uppercase tracking-widest">Observações Privadas (Campo Restrito)</h3>
                </div>
                <p className="text-[11px] text-rose-600/70 font-medium">Este campo NÃO entra no prontuário compartilhado nem nas exportações padrão. Acesso exclusivo seu.</p>
                <textarea className="w-full p-4 rounded-2xl bg-white border border-rose-100 text-sm leading-relaxed resize-none outline-none focus:border-rose-300 transition font-medium min-h-[120px]"
                  placeholder="Hipóteses clínicas, impressões pessoais, formulações iniciais, conteúdos que não devem circular..."
                  value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 2 — Revisão IA */}
          {step === 'ai_result' && organized && (
            <div className="space-y-4 animate-slideUpFade">
              {reviewPoints.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0"/>
                  <div>
                    <p className="font-black text-amber-800 text-xs uppercase tracking-wide mb-1">Pontos para revisão humana</p>
                    <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-medium">• {p}</li>)}</ul>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {ORGANIZED_FIELDS.map(f => (
                  <div key={f.key} className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm space-y-2">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{f.label}</label>
                    <textarea
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium resize-none outline-none focus:bg-white focus:border-indigo-300 transition min-h-[80px]"
                      value={organized[f.key] || ''}
                      onChange={e => setOrganized({ ...organized, [f.key]: e.target.value })}
                    />
                  </div>
                ))}

                {organized.conteudo_restrito && (
                  <div className="bg-rose-50/60 rounded-[20px] border border-rose-100 p-5 space-y-2">
                    <div className="flex items-center gap-2"><Lock size={14} className="text-rose-500"/><label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Conteúdo Restrito (sugerido pela IA)</label></div>
                    <textarea className="w-full p-3 rounded-xl bg-white border border-rose-100 text-sm font-medium resize-none outline-none min-h-[80px]"
                      value={organized.conteudo_restrito} onChange={e => setOrganized({ ...organized, conteudo_restrito: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-10 border-t border-slate-100">
                <button 
                  onClick={onClose} 
                  className="h-14 px-8 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-xs uppercase hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <X size={18} /> Descartar Alterações
                </button>
                <button onClick={() => setStep('draft')} className="h-14 px-8 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-50 transition-all shrink-0">
                  <RotateCcw size={18}/> Retornar ao Rascunho
                </button>
                <div className="flex-1" />
                <button onClick={() => save('Revisado')} disabled={saving} className="h-14 px-10 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3">
                  {saving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} Finalizar Revisão e Salvar
                </button>
              </div>
            </div>
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
    </div>
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
  const [activeTab, setActiveTab] = useState<'history' | 'analysis'>(defaultTab === 'analysis' ? 'analysis' : 'history');
  
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restrictedModal, setRestrictedModal] = useState<{recordId: string; content?: string} | null>(null);
  const [showPwModal, setShowPwModal] = useState<{ type: string; recordId: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewerRecord, setViewerRecord] = useState<MedicalRecord | null>(null);
  const [shareModal, setShareModal] = useState<{ record: MedicalRecord } | null>(null);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; email?: string }[]>([]);

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
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao buscar prontuários');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPatient = useMemo(() => patients.find(p => String(p.id) === selectedPatientId), [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => patients.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf || '').includes(search)
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
    setCurrentRecord({ patient_id: selectedPatientId || '' });
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
                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-2xl border border-slate-200 shadow-sm">
                  {(['history', 'analysis'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${activeTab === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {tab === 'history' ? <><History size={13}/> Histórico</> : <><BarChart2 size={13}/> Análise</>}
                    </button>
                  ))}
                </div>
                <button onClick={exportPDF} className="h-9 px-4 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <Download size={14}/> PDF
                </button>
                <button onClick={openNew} className="h-9 px-5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow hover:bg-indigo-700 flex items-center gap-2">
                  <Plus size={14}/> Nova Evolução
                </button>
              </>
            )}
          </div>
        }
      />

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

          {/* Charts */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats.byMonth?.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Registros por Mês</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.byMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }}/>
                      <YAxis tick={{ fontSize: 11 }}/>
                      <Tooltip/>
                      <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {stats.byType?.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4">Por Tipo</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={stats.byType} dataKey="count" nameKey="record_type" cx="50%" cy="50%" outerRadius={70} label={({ record_type }) => TYPE_LABELS[record_type] || record_type}>
                        {stats.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Grid de pacientes ou Últimos Registros */}
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={() => setShowLatestRecords(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${!showLatestRecords ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Pacientes</button>
                <button onClick={() => setShowLatestRecords(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${showLatestRecords ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Últimos Registros</button>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:border-indigo-300 font-medium"
                  placeholder={showLatestRecords ? "Buscar no histórico..." : "Buscar paciente..."} value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={28} className="text-indigo-400 animate-spin"/></div>
            ) : showLatestRecords ? (
                <div className="space-y-3">
                    {globalRecords.filter(r => strip(r.content || '').toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase())).map(r => (
                        <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-[20px] p-4 flex items-center gap-4 hover:bg-indigo-50 hover:border-indigo-100 transition cursor-pointer"
                             onClick={() => { setSearchParams({ patient_id: String(r.patient_id) }); setSelectedPatientId(String(r.patient_id)); setView('patient'); }}>
                             <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-sm"><FileText size={18}/></div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-black text-slate-800 text-sm truncate">{r.title}</h4>
                                    <span className="text-[10px] font-medium text-slate-400">— {r.patient_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <Calendar size={10}/> {fmtDate(r.created_at)}
                                    <span className={`px-1.5 py-0.5 rounded-md ${STATUS_COLORS[r.status] || 'bg-slate-200 text-slate-500'}`}>{r.status}</span>
                                </div>
                             </div>
                             <ChevronRight size={16} className="text-slate-300"/>
                        </div>
                    ))}
                    {globalRecords.length === 0 && <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum registro encontrado nos filtros atuais.</div>}
                </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredPatients.map(p => (
                  <button key={p.id} onClick={() => { setSearchParams({ patient_id: String(p.id) }); setSelectedPatientId(String(p.id)); setView('patient'); }}
                    className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-[20px] p-4 text-left transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                        {(p.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 text-sm leading-tight truncate group-hover:text-indigo-700">{p.full_name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{p.cpf || 'CPF não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {p.status || 'ativo'}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition"/>
                    </div>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="col-span-full text-center py-10 text-slate-400 font-bold">Nenhum paciente encontrado.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DETALHE DO PACIENTE ─── */}
      {view === 'patient' && selectedPatient && (
        <div className="space-y-6">
          {/* Stats do paciente */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total', value: patientRecords.length, icon: <Layers size={18}/>, color: 'indigo' },
              { label: 'Aprovados', value: patientRecords.filter(r => r.status === 'Aprovado').length, icon: <CheckCircle2 size={18}/>, color: 'emerald' },
              { label: 'Rascunhos', value: patientRecords.filter(r => r.status === 'Rascunho').length, icon: <Edit3 size={18}/>, color: 'amber' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-[20px] border border-${s.color}-100 p-4 shadow-sm flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center shrink-0`}>{s.icon}</div>
                <div>
                  <div className="text-xl font-black text-slate-800">{s.value}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Histórico */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {patientRecords.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-slate-100 p-16 shadow-sm text-center">
                  <BookOpen size={32} className="text-slate-200 mx-auto mb-4"/>
                  <p className="font-bold text-slate-400">Nenhuma evolução registrada.</p>
                  <button onClick={openNew} className="mt-4 h-10 px-6 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 inline-flex items-center gap-2">
                    <Plus size={13}/> Nova Evolução
                  </button>
                </div>
              ) : patientRecords.map(r => (
                <div key={r.id} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 group relative hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText size={18}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-black text-slate-800 text-sm">{r.title}</h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span>
                        {r.ai_status === 'organized' && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1"><Sparkles size={9}/> IA</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-2">
                        <span className="flex items-center gap-1"><Calendar size={11}/>{fmtDate(r.created_at)}</span>
                        {r.start_time && <span className="flex items-center gap-1"><Clock size={11}/>{r.start_time}</span>}
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{TYPE_LABELS[r.record_type] || r.record_type}</span>
                        {r.appointment_type && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{r.appointment_type}</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{strip(r.content || '').slice(0, 200)}</p>
                      {r.tags && r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.tags.map((tag, i) => <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{tag}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setViewerRecord(r)} title="Visualizar prontuário"
                        className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition">
                        <Eye size={13}/>
                      </button>
                      <button onClick={() => setShareModal({ record: r })} title="Compartilhar acesso"
                        className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-500 hover:text-white flex items-center justify-center transition">
                        <Share2 size={13}/>
                      </button>
                      <button onClick={() => setShowPwModal({ type: 'restricted', recordId: r.id })} title="Ver campo restrito"
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition">
                        <Lock size={13}/>
                      </button>
                      <button onClick={() => openEdit(r.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition">
                        <Edit3 size={13}/>
                      </button>
                      <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-8 w-full max-w-sm mx-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600"><Trash2 size={22}/></div>
              <h3 className="font-black text-slate-800">Excluir Registro?</h3>
            </div>
            <p className="text-sm text-slate-500">Esta ação é irreversível. O registro será excluído permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-black uppercase text-xs hover:bg-slate-50">Cancelar</button>
              <button onClick={deleteRecord} className="flex-1 h-11 bg-rose-600 text-white rounded-xl font-black uppercase text-xs hover:bg-rose-700 transition">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Restricted Content Password Modal */}
      {showPwModal && (
        <PasswordModal
          title="Acessar Campo Restrito"
          onConfirm={accessRestricted}
          onClose={() => setShowPwModal(null)}
        />
      )}

      {/* Restricted Content View */}
      {restrictedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-8 w-full max-w-lg mx-4 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500"><Lock size={22}/></div>
                <h3 className="font-black text-slate-800">Conteúdo Restrito</h3>
              </div>
              <button onClick={() => setRestrictedModal(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={16}/></button>
            </div>
            <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-5">
              <p className="text-sm font-medium text-rose-900 leading-relaxed whitespace-pre-wrap">{restrictedModal.content}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Este conteúdo é de uso exclusivo e não entra em exportações padrão.</p>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
            patient={selectedPatient}
            records={patientRecords}
            onExport={finishExport}
            onClose={() => setShowExportModal(false)}
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
    </div>
  );
};
