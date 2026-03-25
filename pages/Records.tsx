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
  History, BookOpen, Filter
} from 'lucide-react';
import { DatePicker } from '../components/UI/DatePicker';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from 'jspdf';

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
   RECORD EDITOR (modal completo: rascunho → IA → revisão → aprovação)
═══════════════════════════════════════════════════════════════ */
const RecordEditor: React.FC<{
  record: Partial<MedicalRecord> | null; mode: 'new' | 'edit';
  patients: Patient[]; selectedPatientId: string | null;
  onSave: () => void; onClose: () => void;
}> = ({ record, mode, patients, selectedPatientId, onSave, onClose }) => {
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
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50 overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"><ArrowLeft size={16}/></button>
          <div>
            <h2 className="font-black text-slate-800 uppercase tracking-tight text-sm">{mode === 'new' ? 'Nova Evolução' : 'Editar Registro'}</h2>
            <p className="text-[11px] text-slate-400 font-medium">{title}</p>
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
                <textarea className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm leading-relaxed resize-none outline-none focus:bg-white focus:border-indigo-300 transition font-medium min-h-[280px]"
                  placeholder="Escreva tudo o que aconteceu na sessão de forma livre. A paciente relatou... Trabalhamos com... Realizei a intervenção... A resposta foi..."
                  value={draft} onChange={e => setDraft(e.target.value)} />
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

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('draft')} className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-50">
                  <RotateCcw size={14}/> Editar Rascunho
                </button>
                <button onClick={() => save('Revisado')} disabled={saving} className="flex-1 h-11 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar como Revisado
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
      const [pp, st] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<Stats>('/medical-records/stats').catch(() => null)
      ]);
      setPatients(pp.map(p => ({ ...p, full_name: p.full_name || (p as any).name || '' })));
      if (st) setStats(st);
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
    if (!selectedPatient) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(79, 70, 229);
    doc.text('Prontuário Clínico', 20, 20);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Paciente: ${selectedPatient.full_name}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 36);
    doc.setDrawColor(226, 232, 240); doc.line(20, 40, 190, 40);
    let y = 50;
    patientRecords.forEach(r => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
      doc.text(`${fmtDate(r.created_at)} — ${r.title}`, 20, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`${TYPE_LABELS[r.record_type] || r.record_type} | ${r.status}`, 20, y); y += 6;
      const lines = doc.splitTextToSize(strip(r.content || ''), 170);
      doc.setTextColor(51, 65, 85);
      doc.text(lines.slice(0, 8), 20, y); y += (Math.min(lines.length, 8) * 5) + 8;
    });
    doc.save(`Prontuario_${selectedPatient.full_name.replace(/\s+/g, '_')}.pdf`);
    pushToast('success', 'PDF gerado!');
  };

  if (editorOpen) {
    return (
      <RecordEditor
        record={currentRecord} mode={editorMode}
        patients={patients} selectedPatientId={selectedPatientId}
        onSave={() => selectedPatientId && fetchRecords(selectedPatientId)}
        onClose={() => setEditorOpen(false)}
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
    </div>
  );
};
