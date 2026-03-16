import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Phone, Mail, Calendar, FileText,
  Edit2, Trash2, X, AlertCircle, Eye, ClipboardList,
  FolderOpen, BrainCircuit, Boxes, StickyNote, Loader2, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Patient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { useNavigate } from 'react-router-dom';

interface PatientSummary {
  appointmentsCount: number | null;
  recordsCount: number | null;
  neuroCount: number | null;
  formsCount: number | null;
  documentsCount: number | null;
  toolsCount: number | null;
  notesCount: number | null;
  upcomingAppointments: { id: string; label: string; time: string }[];
}

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/patients');
      const mapped = (data || []).map(p => ({
        ...p,
        full_name: p.name || p.full_name || '',
        whatsapp: p.phone || p.whatsapp || '',
        cpf_cnpj: p.cpf || p.cpf_cnpj || '',
        birth_date: p.birth_date || p.birthDate || '',
        // Normaliza status do banco (active/inactive) para o padrão do frontend (ativo/inativo)
        status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : p.status,
      })) as Patient[];
      setPatients(mapped);
    } catch (error) {
      console.error('Erro ao buscar pacientes', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (p.full_name || '').toLowerCase().includes(term) ||
        (p.cpf_cnpj && p.cpf_cnpj.includes(searchTerm)) ||
        (p.whatsapp && p.whatsapp.includes(searchTerm)) ||
        (p.email && p.email.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  const summaryStats = useMemo(() => ({
    total: patients.length,
    active: patients.filter(p => p.status === 'ativo').length,
    inactive: patients.filter(p => p.status === 'inativo').length,
  }), [patients]);

  const handleSavePatient = async (data: Partial<Patient>) => {
    try {
      const payload = {
        name: data.full_name,
        email: data.email || null,
        phone: data.whatsapp || data.phone || null,
        birth_date: data.birth_date || null,
        cpf: data.cpf_cnpj || data.cpf || null,
        rg: data.rg || null,
        address: data.street ? `${data.street}${data.house_number ? ', ' + data.house_number : ''}` : null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.address_zip || null,
        status: data.status || 'ativo',
        health_plan: data.convenio ? data.convenio_name || 'Sim' : null,
        responsible_professional_id: data.psychologist_id || null,
      };
      if (data.id) {
        await api.put(`/patients/${data.id}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      await fetchPatients();
      setIsWizardOpen(false);
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      alert('Erro ao salvar paciente. Verifique os dados e tente novamente.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/patients/${deleteId}`);
      await fetchPatients();
      if (selectedPatient && String(selectedPatient.id) === deleteId) setSelectedPatient(null);
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      alert('Erro ao excluir paciente.');
    } finally {
      setDeleteId(null);
    }
  };

  const safeGet = async <T,>(endpoint: string, params?: Record<string, string>): Promise<T | null> => {
    try { return await api.get<T>(endpoint, params); } catch { return null; }
  };

  const openPatientSummary = async (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetails(false);
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    const patientId = String(patient.id);
    const now = new Date();
    const [appointmentsRaw, recordsRaw, neuroRaw, formsRaw, documentsRaw, toolsRaw, notesRaw] = await Promise.all([
      safeGet<any[]>('/appointments', { patient_id: patientId }),
      safeGet<any[]>('/medical-records', { patient_id: patientId }),
      safeGet<any[]>('/pei', { patient_id: patientId }),
      safeGet<any[]>('/forms/responses', { patient_id: patientId }),
      safeGet<any[]>('/documents', { patient_id: patientId }),
      safeGet<any>('/clinical-tools/summary', { patient_id: patientId }),
      safeGet<any[]>('/notes', { patient_id: patientId }),
    ]);
    const appointmentsList = Array.isArray(appointmentsRaw) ? appointmentsRaw : [];
    const patientAppointments = appointmentsList.filter(a => {
      const pid = String(a.patient_id ?? a.patientId ?? '');
      return pid ? pid === patientId : true;
    });
    const upcomingAppointments = patientAppointments
      .map((a: any) => {
        const raw = a.appointment_date || a.start || a.date || a.scheduled_start;
        const d = raw ? new Date(raw) : null;
        if (!d || Number.isNaN(d.getTime()) || d.getTime() < now.getTime()) return null;
        return {
          id: String(a.id ?? d.getTime()),
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      })
      .filter(Boolean).slice(0, 4) as { id: string; label: string; time: string }[];

    const countFrom = (v: any): number | null => {
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object' && typeof v.count === 'number') return v.count;
      return null;
    };
    setSummary({
      appointmentsCount: countFrom(patientAppointments),
      recordsCount: countFrom(recordsRaw),
      neuroCount: countFrom(neuroRaw),
      formsCount: countFrom(formsRaw),
      documentsCount: countFrom(documentsRaw),
      toolsCount: countFrom(toolsRaw),
      notesCount: countFrom(notesRaw),
      upcomingAppointments,
    });
    if (!appointmentsRaw && !recordsRaw && !neuroRaw && !formsRaw && !documentsRaw && !toolsRaw && !notesRaw) {
      setSummaryError('Não foi possível carregar os vínculos deste paciente.');
    }
    setSummaryLoading(false);
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  };

  const calcAge = (value?: string) => {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
  };

  const isActive = (p: Patient) => p.status === 'ativo' || p.status === 'active';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{t('patients.title')}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{t('patients.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingPatient(undefined); setIsWizardOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> {t('patients.new')}
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-5">
        {[
          { label: 'Total', value: summaryStats.total, color: 'text-slate-700' },
          { label: 'Ativos', value: summaryStats.active, color: 'text-emerald-600' },
          { label: 'Inativos', value: summaryStats.inactive, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm">
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-5 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={t('patients.search')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          {[
            { id: 'all', label: t('patients.filter.all') },
            { id: 'ativo', label: t('patients.status.active') },
            { id: 'inativo', label: t('patients.status.archived') },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === f.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPatients.map(patient => (
            <div
              key={patient.id}
              className="bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isActive(patient) ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {(patient.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">{patient.full_name || 'Sem nome'}</h3>
                      <span className={`shrink-0 inline-block w-2 h-2 rounded-full ${isActive(patient) ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {patient.whatsapp && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">{patient.whatsapp}</span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={12} className="text-slate-300 shrink-0" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                      {patient.birth_date && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar size={12} className="text-slate-300 shrink-0" />
                          <span>{calcAge(patient.birth_date)} anos · {formatDate(patient.birth_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 px-3 py-2 flex items-center gap-1.5 bg-slate-50/50">
                <button
                  onClick={() => openPatientSummary(patient)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-all flex-1 justify-center"
                >
                  <Eye size={13} /> Ver
                </button>
                <button
                  onClick={() => { setEditingPatient(patient); setIsWizardOpen(true); }}
                  title="Editar"
                  className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:text-amber-600 transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(patient.id)}
                  title="Excluir"
                  className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPatients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Search size={28} className="text-slate-300" />
          </div>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">{t('patients.empty')}</h3>
          <p className="text-xs text-slate-400 max-w-xs">Tente buscar por outro termo ou limpe os filtros.</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="mt-4 text-xs text-indigo-600 font-semibold hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Form Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-white flex flex-col">
            <PatientFormWizard
              initialData={editingPatient || {}}
              onSave={handleSavePatient}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir paciente</h3>
                <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0 border border-indigo-100">
                  {(selectedPatient.full_name || '?').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{selectedPatient.full_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${isActive(selectedPatient) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {isActive(selectedPatient) ? 'Ativo' : 'Inativo'}
                    </span>
                    {selectedPatient.health_plan && (
                      <span className="text-[11px] text-slate-400">{selectedPatient.health_plan}</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Quick info */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Nascimento</div>
                  <div className="text-xs font-semibold text-slate-700">{formatDate(selectedPatient.birth_date || selectedPatient.birthDate)}</div>
                  {calcAge(selectedPatient.birth_date || selectedPatient.birthDate) && (
                    <div className="text-[11px] text-slate-400">{calcAge(selectedPatient.birth_date || selectedPatient.birthDate)} anos</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Telefone</div>
                  <div className="text-xs font-semibold text-slate-700">{selectedPatient.whatsapp || selectedPatient.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Email</div>
                  <div className="text-xs font-semibold text-slate-700 truncate">{selectedPatient.email || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">CPF</div>
                  <div className="text-xs font-semibold text-slate-700">{selectedPatient.cpf_cnpj || selectedPatient.cpf || '—'}</div>
                </div>
              </div>

              {/* Links */}
              <div className="p-4">
                <div className="text-xs font-bold text-slate-600 mb-3">Vínculos do paciente</div>
                {summaryLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 size={13} className="animate-spin" /> Carregando...
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[
                      { label: 'Agenda', value: summary?.appointmentsCount, icon: <Calendar size={16} /> },
                      { label: 'Prontuários', value: summary?.recordsCount, icon: <FileText size={16} /> },
                      { label: 'Neuro', value: summary?.neuroCount, icon: <BrainCircuit size={16} /> },
                      { label: 'Formulários', value: summary?.formsCount, icon: <ClipboardList size={16} /> },
                      { label: 'Documentos', value: summary?.documentsCount, icon: <FolderOpen size={16} /> },
                      { label: 'Ferramentas', value: summary?.toolsCount, icon: <Boxes size={16} /> },
                      { label: 'Notas', value: summary?.notesCount, icon: <StickyNote size={16} /> },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                        <div className="text-slate-400 flex justify-center mb-1">{item.icon}</div>
                        <div className="text-sm font-bold text-slate-800">
                          {item.value === null ? <span className="text-slate-300 text-xs">—</span> : item.value}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {summaryError && <p className="text-xs text-rose-500 mt-2">{summaryError}</p>}
              </div>

              {/* Upcoming */}
              {(summary?.upcomingAppointments?.length ?? 0) > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-xs font-bold text-slate-600 mb-2">Próximos atendimentos</div>
                  <div className="space-y-1.5">
                    {summary!.upcomingAppointments.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="text-slate-400">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra details toggle */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => setShowDetails(p => !p)}
                  className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
                >
                  <ChevronRight size={13} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                  {showDetails ? 'Ocultar dados completos' : 'Ver dados completos'}
                </button>
                {showDetails && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    {[
                      { label: 'RG', value: selectedPatient.rg },
                      { label: 'Profissão', value: selectedPatient.profession },
                      { label: 'Estado civil', value: selectedPatient.marital_status },
                      { label: 'Escolaridade', value: selectedPatient.education },
                      { label: 'Convênio', value: selectedPatient.health_plan || (selectedPatient.convenio ? selectedPatient.convenio_name || 'Sim' : 'Não') },
                      { label: 'Contato emergência', value: selectedPatient.emergency_contact },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{row.label}</div>
                        <div className="text-slate-700 font-medium mt-0.5">{row.value || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/agenda?patient_id=${selectedPatient.id}`)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Agenda
              </button>
              {[
                { label: 'Prontuário', path: `/prontuario?patient_id=${selectedPatient.id}` },
                { label: 'Neuro', path: `/neurodesenvolvimento?patient_id=${selectedPatient.id}` },
                { label: 'Formulários', path: `/formularios/lista?patient_id=${selectedPatient.id}` },
                { label: 'Documentos', path: `/documentos?patient_id=${selectedPatient.id}` },
                { label: 'Ferramentas', path: `/caixa-ferramentas?patient_id=${selectedPatient.id}` },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={() => navigate(btn.path)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  {btn.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => { setEditingPatient(selectedPatient); setSelectedPatient(null); setIsWizardOpen(true); }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-600 transition-all flex items-center gap-1"
              >
                <Edit2 size={12} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
