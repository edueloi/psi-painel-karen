import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, FileText, BrainCircuit, ClipboardList, FolderOpen,
  Boxes, StickyNote, MapPin, Shield, Phone, Mail, User, Edit2,
  Loader2, Download, Trash2, FileUp, TrendingUp, ExternalLink,
  ChevronRight, History, Activity, AlertTriangle, X
} from 'lucide-react';
import { api, getStaticUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Patient } from '../types';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { PatientHistoryDrawer } from '../components/Patient/PatientHistoryDrawer';
import { DatePicker } from '../components/UI/DatePicker';

const AVATAR_COLORS = [
  'from-primary-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];
const getAvatarColor = (name?: string) => AVATAR_COLORS[((name || '').charCodeAt(0) || 0) % AVATAR_COLORS.length];
const patientName = (p: Patient) => p.full_name || (p as any).name || '?';

const calcAge = (val?: string) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const formatDate = (val?: string) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

const isActive = (p: Patient) =>
  p.status === 'ativo' || p.status === 'active' || (p.active as any) === true || (p.active as any) === 1;

const safeGet = async <T,>(url: string, params?: Record<string, string>): Promise<T | null> => {
  try { return await api.get<T>(url, params); } catch { return null; }
};

type Tab = 'dados' | 'agenda' | 'documentos' | 'prontuario' | 'formularios' | 'ferramentas';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'dados',       label: 'Dados',       icon: <User size={14} /> },
  { key: 'agenda',      label: 'Agenda',      icon: <Calendar size={14} /> },
  { key: 'documentos',  label: 'Documentos',  icon: <FolderOpen size={14} /> },
  { key: 'prontuario',  label: 'Prontuário',  icon: <FileText size={14} /> },
  { key: 'formularios', label: 'Formulários', icon: <ClipboardList size={14} /> },
  { key: 'ferramentas', label: 'Ferramentas', icon: <Boxes size={14} /> },
];

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Tab data
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Summary counts
  const [summary, setSummary] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    safeGet<Patient>(`/patients/${id}`).then(data => {
      setPatient(data);
      setLoading(false);
    });
  }, [id]);

  // Load summary counts
  useEffect(() => {
    if (!id) return;
    Promise.all([
      safeGet<any[]>('/appointments', { patient_id: id }),
      safeGet<any[]>('/medical-records', { patient_id: id }),
      safeGet<any[]>('/pei', { patient_id: id }),
      safeGet<any[]>('/forms/responses', { patient_id: id }),
      safeGet<any[]>('/uploads', { patient_id: id }),
      safeGet<any>('/clinical-tools/summary', { patient_id: id }),
      safeGet<any[]>('/notes', { patient_id: id }),
    ]).then(([apts, recs, neuro, fms, docs, tools, notes]) => {
      const count = (v: any) => Array.isArray(v) ? v.length : typeof v === 'number' ? v : v?.count ?? null;
      setSummary({
        agenda: count(Array.isArray(apts) ? apts.filter((a: any) => String(a.patient_id ?? a.patientId ?? '') === id) : apts),
        prontuario: count(recs),
        neuro: count(neuro),
        formularios: count(fms),
        documentos: count(docs),
        ferramentas: count(tools),
        notas: count(notes),
      });
    });
  }, [id]);

  const loadTab = useCallback(async (tab: Tab) => {
    if (!id) return;
    setTabLoading(true);
    if (tab === 'agenda') {
      const data = await safeGet<any[]>('/appointments', { patient_id: id });
      setAppointments(Array.isArray(data) ? data.filter((a: any) => String(a.patient_id ?? a.patientId ?? '') === id) : []);
    } else if (tab === 'documentos') {
      const data = await safeGet<any[]>('/uploads', { patient_id: id });
      setDocuments(Array.isArray(data) ? data : []);
    } else if (tab === 'prontuario') {
      const data = await safeGet<any[]>('/medical-records', { patient_id: id });
      setRecords(Array.isArray(data) ? data : []);
    } else if (tab === 'formularios') {
      const data = await safeGet<any[]>('/forms/responses', { patient_id: id });
      setForms(Array.isArray(data) ? data : []);
    }
    setTabLoading(false);
  }, [id]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (['agenda', 'documentos', 'prontuario', 'formularios'].includes(tab)) {
      loadTab(tab);
    }
  };

  const handlePatientSaved = async (updated: Patient) => {
    setPatient(updated);
    setIsWizardOpen(false);
    // Refresh
    const fresh = await safeGet<Patient>(`/patients/${id}`);
    if (fresh) setPatient(fresh);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <User size={48} className="text-slate-300" />
        <p className="text-slate-500 font-medium">Paciente não encontrado</p>
        <button onClick={() => navigate('/pacientes')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          Voltar à lista
        </button>
      </div>
    );
  }

  const age = calcAge(patient.birth_date || patient.birthDate);
  const active = isActive(patient);

  return (
    <div className="-m-4 md:-m-6 lg:-m-8 bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/pacientes')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-slate-800 truncate">{patientName(patient)}</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Perfil do paciente</p>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Histórico"
          >
            <History size={16} />
          </button>
          {hasPermission('edit_patient') && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Edit2 size={13} /> Editar
            </button>
          )}
        </div>

        {/* Hero header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(patientName(patient))} flex items-center justify-center text-white text-2xl font-black shrink-0 border-4 border-white/30 overflow-hidden shadow-lg`}>
              {patient.photo_url || patient.photoUrl ? (
                <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patientName(patient)} className="w-full h-full object-cover" />
              ) : (
                (patientName(patient) || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-white flex-1 min-w-0">
              <h2 className="text-xl font-black truncate">{patientName(patient)}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  active ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-400/40' : 'bg-white/20 text-white/70'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-300' : 'bg-white/50'}`} />
                  {active ? 'Ativo' : 'Inativo'}
                </span>
                {age && <span className="text-indigo-200 text-xs font-medium">{age} anos</span>}
                {patient.health_plan && (
                  <span className="text-xs text-indigo-100 font-medium flex items-center gap-1">
                    <Shield size={11} /> {patient.health_plan}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5">
            {[
              { key: 'agenda',      label: 'Agenda',      icon: <Calendar size={13} />,      bg: 'bg-white/15' },
              { key: 'prontuario',  label: 'Prontuário',  icon: <FileText size={13} />,       bg: 'bg-white/15' },
              { key: 'neuro',       label: 'Neuro',       icon: <BrainCircuit size={13} />,   bg: 'bg-white/15' },
              { key: 'formularios', label: 'Formulários', icon: <ClipboardList size={13} />,  bg: 'bg-white/15' },
              { key: 'documentos',  label: 'Docs',        icon: <FolderOpen size={13} />,     bg: 'bg-white/15' },
              { key: 'ferramentas', label: 'Ferramentas', icon: <Boxes size={13} />,          bg: 'bg-white/15' },
              { key: 'notas',       label: 'Notas',       icon: <StickyNote size={13} />,     bg: 'bg-white/15' },
            ].map(item => (
              <div key={item.key} className="bg-white/15 backdrop-blur rounded-xl p-2 text-center text-white">
                <div className="flex justify-center mb-1 opacity-80">{item.icon}</div>
                <div className="text-base font-black leading-none">
                  {summary[item.key] === null || summary[item.key] === undefined ? '—' : summary[item.key]}
                </div>
                <div className="text-[9px] font-bold opacity-60 uppercase tracking-wide mt-1 leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-slate-100 px-4 flex gap-1 overflow-x-auto">
          {TABS.filter(tab => {
            if (tab.key === 'prontuario') return hasPermission('view_medical_records');
            if (tab.key === 'ferramentas') return hasPermission('manage_clinical_tools');
            if (tab.key === 'documentos') return hasPermission('manage_documents');
            if (tab.key === 'formularios') return hasPermission('manage_forms');
            return true;
          }).map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon} {tab.label}
              {summary[tab.key] != null && summary[tab.key]! > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {summary[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        {activeTab === 'dados' && <TabDados patient={patient} navigate={navigate} />}
        {activeTab === 'agenda' && <TabAgenda appointments={appointments} loading={tabLoading} patientId={id!} navigate={navigate} />}
        {activeTab === 'documentos' && <TabDocumentos documents={documents} loading={tabLoading} patientId={id!} onRefresh={() => loadTab('documentos')} />}
        {activeTab === 'prontuario' && <TabProntuario records={records} loading={tabLoading} patientId={id!} navigate={navigate} />}
        {activeTab === 'formularios' && <TabFormularios forms={forms} loading={tabLoading} patientId={id!} navigate={navigate} />}
        {activeTab === 'ferramentas' && <TabFerramentas patientId={id!} navigate={navigate} />}
      </div>

      {/* Edit wizard */}
      {isWizardOpen && (
        <PatientFormWizard
          patient={patient}
          onClose={() => setIsWizardOpen(false)}
          onSave={handlePatientSaved as any}
        />
      )}

      {/* History drawer */}
      <PatientHistoryDrawer
        patient={historyOpen ? patient : null}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};

// ─── Tab: Dados ───────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{value}</div>
    </div>
  ) : null;

const TabDados: React.FC<{ patient: Patient; navigate: (p: string) => void }> = ({ patient, navigate }) => (
  <div className="space-y-4">
    {/* Contato */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
        <Phone size={14} className="text-indigo-500" />
        <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Contato</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-5">
        <InfoRow label="Telefone" value={patient.whatsapp || patient.phone} />
        <InfoRow label="Telefone 2" value={patient.phone2} />
        <InfoRow label="Email" value={patient.email} />
        <InfoRow label="CPF" value={patient.cpf_cnpj || patient.cpf} />
        <InfoRow label="RG" value={patient.rg} />
      </div>
    </div>

    {/* Dados pessoais */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
        <User size={14} className="text-violet-500" />
        <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Dados Pessoais</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-5">
        <InfoRow label="Nascimento" value={formatDate(patient.birth_date || patient.birthDate)} />
        <InfoRow label="Gênero" value={patient.gender} />
        <InfoRow label="Estado civil" value={patient.marital_status} />
        <InfoRow label="Escolaridade" value={patient.education} />
        <InfoRow label="Profissão" value={patient.profession} />
        <InfoRow label="Nacionalidade" value={patient.nationality} />
        <InfoRow label="Naturalidade" value={patient.naturality} />
      </div>
    </div>

    {/* Endereço */}
    {(patient.address || patient.street || patient.city) && (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
          <MapPin size={14} className="text-emerald-500" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Endereço</span>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-5">
          <InfoRow label="Logradouro" value={patient.address || patient.street} />
          <InfoRow label="Número" value={patient.house_number} />
          <InfoRow label="Bairro" value={patient.neighborhood} />
          <InfoRow label="Cidade" value={patient.city} />
          <InfoRow label="Estado" value={patient.state} />
          <InfoRow label="CEP" value={patient.zip_code || patient.address_zip} />
        </div>
      </div>
    )}

    {/* Família */}
    {(patient.spouse_name || patient.family_contact || patient.emergency_contact) && (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
          <Activity size={14} className="text-rose-500" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Família / Contatos</span>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-5">
          <InfoRow label="Cônjuge" value={patient.spouse_name} />
          <InfoRow label="Contato familiar" value={patient.family_contact} />
          <InfoRow label="Contato emergência" value={patient.emergency_contact} />
        </div>
      </div>
    )}

    {/* Clínico */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
        <Shield size={14} className="text-amber-500" />
        <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Informações Clínicas</span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-5">
        <InfoRow label="Convênio" value={patient.health_plan || (patient.convenio ? patient.convenio_name || 'Sim' : undefined)} />
        <InfoRow label="Diagnóstico" value={patient.diagnosis} />
        {patient.notes && (
          <div className="col-span-2 sm:col-span-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Observações</div>
            <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200/60 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
              {patient.notes}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Quick nav */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-xs font-black text-slate-400 uppercase tracking-wide mb-3">Ir para</div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Prontuário', path: `/prontuario?patient_id=${patient.id}` },
          { label: 'Neuro/PEI', path: `/neurodesenvolvimento?patient_id=${patient.id}` },
          { label: 'Formulários', path: `/formularios/lista?patient_id=${patient.id}` },
          { label: 'Documentos', path: `/documentos?patient_id=${patient.id}` },
          { label: 'Ferramentas', path: `/caixa-ferramentas?patient_id=${patient.id}` },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.path)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            {btn.label} <ExternalLink size={11} />
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Tab: Agenda ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; activeCls: string; inactiveCls: string; badgeCls: string }> = {
  scheduled:   { label: 'Agendado',    activeCls: 'bg-indigo-600 text-white border-indigo-600',    inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300',   badgeCls: 'bg-indigo-100 text-indigo-700' },
  confirmed:   { label: 'Confirmado',  activeCls: 'bg-blue-600 text-white border-blue-600',         inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-blue-300',    badgeCls: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Realizado',   activeCls: 'bg-emerald-600 text-white border-emerald-600',   inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300', badgeCls: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Cancelado',   activeCls: 'bg-red-500 text-white border-red-500',           inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-red-300',     badgeCls: 'bg-red-100 text-red-700' },
  'no-show':   { label: 'Faltou',      activeCls: 'bg-amber-500 text-white border-amber-500',       inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-amber-300',   badgeCls: 'bg-amber-100 text-amber-700' },
  rescheduled: { label: 'Reagendado',  activeCls: 'bg-orange-500 text-white border-orange-500',     inactiveCls: 'bg-white text-slate-500 border-slate-200 hover:border-orange-300',  badgeCls: 'bg-orange-100 text-orange-700' },
};
const STATUS_CHIPS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TabAgenda: React.FC<{ appointments: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ appointments, loading, patientId, navigate }) => {
  const today = todayISO();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(today);
  const [dateTo, setDateTo] = useState<string | null>(null);

  if (loading) return <TabLoader />;

  // Build comanda session index map
  const comandaGroups: Record<string, any[]> = {};
  for (const a of appointments) {
    if (a.comanda_id) {
      if (!comandaGroups[a.comanda_id]) comandaGroups[a.comanda_id] = [];
      comandaGroups[a.comanda_id].push(a);
    }
  }
  const comandaIndexMap: Record<string, number> = {};
  for (const [, group] of Object.entries(comandaGroups)) {
    group.sort((a: any, b: any) => new Date(a.start || a.start_time || 0).getTime() - new Date(b.start || b.start_time || 0).getTime());
    group.forEach((a: any, i: number) => { comandaIndexMap[a.id] = i + 1; });
  }

  // Apply filters
  const filtered = appointments.filter((a: any) => {
    const dt = new Date(a.start || a.start_time || a.appointment_date || '');
    if (statusFilter.length > 0 && !statusFilter.includes(a.status)) return false;
    if (dateFrom && !isNaN(dt.getTime())) {
      if (dt < new Date(dateFrom + 'T00:00:00')) return false;
    }
    if (dateTo && !isNaN(dt.getTime())) {
      if (dt > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    new Date(a.start || a.start_time || a.appointment_date || 0).getTime() -
    new Date(b.start || b.start_time || b.appointment_date || 0).getTime()
  );

  const toggleStatus = (val: string) =>
    setStatusFilter((prev: string[]) => prev.includes(val) ? prev.filter((s: string) => s !== val) : [...prev, val]);

  const isViewingHistory = !dateFrom || dateFrom < today;
  const hasActiveFilters = statusFilter.length > 0 || dateTo !== null || isViewingHistory;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{sorted.length} atendimento{sorted.length !== 1 ? 's' : ''}</span>
        <button onClick={() => navigate(`/agenda?patient_id=${patientId}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
          Abrir na agenda <ExternalLink size={11} />
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map(key => {
            const s = STATUS_MAP[key];
            const active = statusFilter.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatus(key)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${active ? s.activeCls : s.inactiveCls}`}
              >
                {s.label}
              </button>
            );
          })}
          {statusFilter.length > 0 && (
            <button type="button" onClick={() => setStatusFilter([])} className="text-[11px] font-semibold px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors">
              Limpar
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="De" className="flex-1 text-xs" />
          <span className="text-[11px] text-slate-400 shrink-0">até</span>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="Até" className="flex-1 text-xs" />
        </div>

        {/* History toggle */}
        <div className="flex items-center justify-between pt-0.5">
          {!isViewingHistory ? (
            <button type="button" onClick={() => setDateFrom(null)} className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <History size={12} /> Ver histórico completo
            </button>
          ) : (
            <button type="button" onClick={() => { setDateFrom(today); setDateTo(null); setStatusFilter([]); }} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1">
              <Calendar size={12} /> Mostrar apenas próximos
            </button>
          )}
          {hasActiveFilters && (
            <span className="text-[10px] text-slate-400">
              {isViewingHistory ? 'Histórico ativo' : 'Filtros ativos'}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 && <EmptyState icon={<Calendar size={32} />} label="Nenhum atendimento encontrado" />}
      {sorted.map((a: any) => {
        const dt = new Date(a.start || a.start_time || a.appointment_date || '');
        const isPast = dt < new Date();
        const statusInfo = a.status ? (STATUS_MAP[a.status] || { label: a.status, badgeCls: 'bg-slate-100 text-slate-500', activeCls: '', inactiveCls: '' }) : null;

        const hasComanda = !!a.comanda_id;
        const sessionIdx = hasComanda ? comandaIndexMap[a.id] : null;
        const sessionTotal = hasComanda ? (a.comanda_sessions_total || null) : null;
        const sessionLabel = hasComanda && sessionIdx && sessionTotal ? `${sessionIdx}/${sessionTotal}` : null;

        const price = a.service_price != null ? Number(a.service_price)
          : (hasComanda && a.comanda_total && a.comanda_sessions_total)
            ? Number(a.comanda_total) / Number(a.comanda_sessions_total)
            : null;
        const priceLabel = price != null ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

        return (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center shrink-0 ${isPast ? 'bg-slate-100' : 'bg-indigo-100'}`}>
              <span className={`text-[10px] font-black uppercase ${isPast ? 'text-slate-400' : 'text-indigo-600'}`}>
                {isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR', { month: 'short' })}
              </span>
              <span className={`text-base font-black leading-none ${isPast ? 'text-slate-500' : 'text-indigo-700'}`}>
                {isNaN(dt.getTime()) ? '—' : dt.getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 truncate">{a.service_name || a.title || 'Atendimento'}</span>
                {sessionLabel && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0">
                    {sessionLabel}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                {!isNaN(dt.getTime()) && <span>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                {(a.psychologist_name || a.professional_name || a.professional_name_text) && (
                  <span>· {a.psychologist_name || a.professional_name || a.professional_name_text}</span>
                )}
                {priceLabel && <span className="text-emerald-600 font-semibold">· {priceLabel}</span>}
              </div>
            </div>
            {statusInfo && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusInfo.badgeCls}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Tab: Documentos ─────────────────────────────────────────────────────────
const TabDocumentos: React.FC<{ documents: any[]; loading: boolean; patientId: string; onRefresh: () => void }> = ({ documents, loading, patientId, onRefresh }) => {
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name);
      fd.append('category', 'Paciente');
      fd.append('patient_id', patientId);
      await api.request('/uploads', { method: 'POST', body: fd });
      onRefresh();
    } catch (e) {
      console.error('Upload error:', e);
    }
    setUploading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.request(`/uploads/${deleteTarget.id}`, { method: 'DELETE' }); } catch {}
    setDeleting(false);
    setDeleteTarget(null);
    onRefresh();
  };

  if (loading) return <TabLoader />;

  const typeIcon = (type: string) => {
    if (type === 'pdf') return '📄';
    if (type === 'image') return '🖼️';
    return '📎';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{documents.length} documento(s)</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
          Anexar
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </div>
      {documents.length === 0 && <EmptyState icon={<FolderOpen size={32} />} label="Nenhum documento anexado" />}
      {documents.map((doc: any) => (
        <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="text-2xl">{typeIcon(doc.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">{doc.title || doc.file_name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {doc.category} · {doc.size}
              {doc.date && ` · ${new Date(doc.date).toLocaleDateString('pt-BR')}`}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {doc.file_url && (
              <a
                href={doc.file_url.startsWith('/') ? `${window.location.origin.replace('3000', '3013')}${doc.file_url}` : doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Baixar"
              >
                <Download size={14} />
              </a>
            )}
            <button
              onClick={() => setDeleteTarget({ id: String(doc.id), name: doc.title || doc.file_name || 'documento' })}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir documento"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

// ─── Tab: Prontuário ──────────────────────────────────────────────────────────
const TabProntuario: React.FC<{ records: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ records, loading, patientId, navigate }) => {
  if (loading) return <TabLoader />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{records.length} registro(s)</span>
        <button onClick={() => navigate(`/prontuario?patient_id=${patientId}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
          Abrir prontuário <ExternalLink size={11} />
        </button>
      </div>
      {records.length === 0 && <EmptyState icon={<FileText size={32} />} label="Nenhum registro de prontuário" />}
      {records.map((rec: any) => (
        <div key={rec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 justify-between">
            <div className="text-xs font-bold text-slate-800">{rec.title || rec.type || 'Registro'}</div>
            <div className="text-[10px] text-slate-400">{formatDate(rec.date || rec.created_at)}</div>
          </div>
          {rec.preview && <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{rec.preview}</p>}
        </div>
      ))}
    </div>
  );
};

// ─── Tab: Formulários ─────────────────────────────────────────────────────────
const TabFormularios: React.FC<{ forms: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ forms, loading, patientId, navigate }) => {
  if (loading) return <TabLoader />;

  const goToForm = (f: any) => {
    const formId = f.form_id || f.formId;
    if (formId) {
      navigate(`/formularios/${formId}/respostas?patient_id=${patientId}`);
    } else {
      navigate(`/formularios/respostas?patient_id=${patientId}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{forms.length} resposta(s)</span>
        <button onClick={() => navigate(`/formularios/lista?patient_id=${patientId}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
          Ver todos <ExternalLink size={11} />
        </button>
      </div>
      {forms.length === 0 && <EmptyState icon={<ClipboardList size={32} />} label="Nenhuma resposta de formulário" />}
      {forms.map((f: any) => (
        <button
          key={f.id}
          onClick={() => goToForm(f)}
          className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList size={14} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                {f.form_title || f.title || 'Formulário'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {f.score != null && (
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {f.score} pts
                </span>
              )}
              <span className="text-[10px] text-slate-400">{formatDate(f.submitted_at || f.created_at)}</span>
              <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Tab: Ferramentas ─────────────────────────────────────────────────────────
const TabFerramentas: React.FC<{ patientId: string; navigate: (p: string) => void }> = ({ patientId, navigate }) => (
  <div className="space-y-3">
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
      <Boxes size={32} className="text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-semibold text-slate-600 mb-1">Ferramentas Clínicas</p>
      <p className="text-xs text-slate-400 mb-4">Acesse os instrumentos clínicos do paciente na caixa de ferramentas</p>
      <button
        onClick={() => navigate(`/caixa-ferramentas?patient_id=${patientId}`)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Abrir ferramentas <ExternalLink size={12} />
      </button>
    </div>
  </div>
);

// ─── Shared components ────────────────────────────────────────────────────────
const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 size={24} className="animate-spin text-indigo-400" />
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <div className="text-slate-200">{icon}</div>
    <p className="text-xs font-semibold text-slate-400">{label}</p>
  </div>
);

const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirmar', loading, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
