import React, { useState, useMemo, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { GridTable } from '../components/UI/GridTable';
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
          <input 
            type="password" 
            autoFocus 
            value={pw} 
            onChange={e => setPw(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-300 focus:bg-white transition-all text-sm placeholder:text-slate-300 shadow-inner" 
            placeholder="••••••••" 
          />
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

const RecordViewer: React.FC<{ record: MedicalRecord; patient?: Patient; onClose: () => void; onEdit: () => void }> = ({ record, patient, onClose, onEdit }) => {
  const organized = useMemo(() => {
    if (!record.ai_organized_content) return null;
    try { return JSON.parse(record.ai_organized_content); } catch { return null; }
  }, [record]);

  const reviewPoints: string[] = organized?.pontos_revisao || [];
  const fields = ORGANIZED_FIELDS_LABELS.filter(f => organized?.[f.key]);

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
              <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest">ID: {record.id.split('-')[0]}...</div>
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
        patient_id: patientId,
        patient_name: patient?.full_name,
        created_at: sessionDate
      });
      setOrganized(resp.data.organized);
      setReviewPoints(resp.data.review_points || []);
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
        draft_content: draft,
        restricted_content: privateNotes,
        ai_organized_content: organized ? JSON.stringify(organized) : null,
        content: organized ? Object.values(organized).join('\n\n') : draft
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
      title={mode === 'new' ? 'Nova Evolução Clínica' : 'Editar Registro'}
      subtitle={title}
      maxWidth="full"
      footer={
        <div className="flex items-center justify-between w-full">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-lg shadow-sm border border-indigo-100">Etapa: {step === 'draft' ? 'Rascunho' : 'Revisão IA'}</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                {(['draft', 'ai_result'] as const).map((s, i) => (
                  <button key={s} onClick={() => setStep(s)} disabled={s === 'ai_result' && !organized}
                    className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${step === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
                    {i + 1}. {s === 'draft' ? 'Rascunho' : 'Revisão IA'}
                  </button>
                ))}
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onClose} className="uppercase text-xs font-black tracking-widest">Cancelar</Button>
              <Button onClick={() => save()} isLoading={saving} variant="primary" className="h-11 px-8 gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-indigo-200">
                <Save size={16}/> Salvar Rascunho
              </Button>
              <Button onClick={() => setShowApproveModal(true)} variant="primary" className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-emerald-200">
                <CheckCircle2 size={16}/> Aprovar Registro
              </Button>
           </div>
        </div>
      }
    >
        <div className="space-y-6 max-w-5xl mx-auto py-2">
          {/* Metadados */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={14} className="text-indigo-500" /> Identificação e Metadados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Paciente</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Data</label>
                <input type="date" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={sessionDate} onChange={e => setSessionDate(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Título</label>
                <input className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-300" value={title} onChange={e => setTitle(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Tipo de Registro</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={recordType} onChange={e => setRecordType(e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Modalidade</label>
                <select className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={appointmentType} onChange={e => setAppointmentType(e.target.value)}>
                  {['individual','casal','familiar','grupo','online','presencial'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Início</label>
                <input type="time" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={startTime} onChange={e => setStartTime(e.target.value)}/>
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

          {/* STEP 1 — Rascunho */}
          {step === 'draft' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-indigo-500" /> Rascunho Bruto da Sessão
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">Escreva livremente — a IA vai organizar</span>
                </div>
                <RichTextEditor
                  value={draft}
                  onChange={setDraft}
                  placeholder="Escreva tudo o que aconteceu na sessão de forma livre. A paciente relatou... Trabalhamos com... Realizei a intervenção... A resposta foi..."
                  minHeight="350px"
                />
                <Button onClick={organizeWithAI} isLoading={aiLoading} disabled={!draft.trim()} variant="primary"
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3">
                  {!aiLoading && <Sparkles size={22} className="text-yellow-300 animate-pulse"/>}
                  {aiLoading ? 'Organizando conteúdo com Aurora IA...' : 'Organizar Evolução com Inteligência Artificial'}
                </Button>
              </div>

              {/* Campo Restrito */}
              <div className="bg-rose-50/50 rounded-[24px] border border-rose-100 p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-rose-500"/>
                  <h3 className="font-black text-rose-700 text-xs uppercase tracking-widest">Observações Privadas (Campo Restrito)</h3>
                </div>
                <p className="text-[11px] text-rose-600/70 font-medium">Este campo NÃO entra no prontuário compartilhado nem nas exportações padrão. Acesso exclusivo seu conforme normas do CFP.</p>
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
                  <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0"/>
                  <div>
                    <p className="font-black text-amber-800 text-xs uppercase tracking-wide mb-1">Pontos para revisão humana</p>
                    <ul className="space-y-1">{reviewPoints.map((p, i) => <li key={i} className="text-xs text-amber-700 font-bold">• {p}</li>)}</ul>
                  </div>
                </div>
              )}

              <div className="grid gap-4 pb-20">
                {ORGANIZED_FIELDS.map(f => (
                  <div key={f.key} className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm space-y-2 group hover:border-indigo-100 transition-all">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                       {f.label}
                    </label>
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
                                header: 'Status',
                                accessor: 'status',
                                render: (p: Patient) => (
                                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${p.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        {p.status || 'ativo'}
                                    </span>
                                )
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
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
              {patientRecords.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100">
                    <BookOpen size={32}/>
                  </div>
                  <p className="font-bold text-slate-400 mb-6 uppercase text-[11px] tracking-widest">Nenhuma evolução registrada para este paciente.</p>
                  <Button onClick={openNew} variant="primary" className="h-11 px-8 gap-2 uppercase text-xs font-black tracking-widest shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5">
                    <Plus size={18}/> Iniciar Evolução
                  </Button>
                </div>
              ) : (
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
                      header: 'Status',
                      accessor: 'status',
                      render: (r: MedicalRecord) => (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span>
                          {r.ai_status === 'organized' && <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5"><Sparkles size={11}/> IA</span>}
                        </div>
                      )
                    },
                    {
                      header: 'Ações',
                      className: 'text-right',
                      render: (r: MedicalRecord) => (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setViewerRecord(r)} title="Visualizar prontuário"
                            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition shadow-sm border border-slate-100">
                            <Eye size={16}/>
                          </button>
                          <button onClick={() => openEdit(r.id)} title="Editar"
                            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white flex items-center justify-center transition shadow-sm border border-slate-100">
                            <Edit3 size={16}/>
                          </button>
                          <button onClick={() => setShowPwModal({ type: 'restricted', recordId: r.id })} title="Ver campo restrito"
                            className="w-9 h-9 rounded-xl bg-slate-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition shadow-sm border border-rose-50">
                            <Lock size={16}/>
                          </button>
                          <button onClick={() => setShareModal({ record: r })} title="Compartilhar acesso"
                            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-purple-600 hover:text-white flex items-center justify-center transition shadow-sm border border-slate-100">
                            <Share2 size={16}/>
                          </button>
                          <button onClick={() => setDeleteId(r.id)} title="Excluir"
                            className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-sm border border-slate-100">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      )
                    }
                  ]}
                />
              )}
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
