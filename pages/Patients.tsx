import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Eye,
  ClipboardList,
  FolderOpen,
  BrainCircuit,
  Boxes,
  StickyNote,
  Banknote,
  Loader2
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

  // Dados
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

  // Modal/Form
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Resumo
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Patient[]>('/patients');
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao buscar pacientes', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cpf_cnpj && p.cpf_cnpj.includes(searchTerm));

      const matchesStatus = statusFilter === 'all'
        ? true
        : p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  const summaryStats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'ativo').length;
    const inactive = patients.filter(p => p.status === 'inativo').length;
    const reimburse = patients.filter(p => p.needs_reimbursement || p.needsReimbursement).length;
    return { total, active, inactive, reimburse };
  }, [patients]);

  const handleAddNew = () => {
    setEditingPatient(undefined);
    setIsWizardOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsWizardOpen(true);
  };

  const handleSavePatient = (data: Partial<Patient>) => {
    if (data.id) {
      setPatients(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Patient : p));
    } else {
      const newPatient = { ...data, id: Date.now().toString(), status: 'ativo' } as Patient;
      setPatients(prev => [newPatient, ...prev]);
    }
    setIsWizardOpen(false);
  };

  const confirmDelete = () => {
    if (deleteId) {
      setPatients(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  const safeGet = async <T,>(endpoint: string, params?: Record<string, string>): Promise<T | null> => {
    try {
      return await api.get<T>(endpoint, params);
    } catch {
      return null;
    }
  };

  const openPatientSummary = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);

    const patientId = String(patient.id);
    const now = new Date();

    const [
      appointmentsRaw,
      recordsRaw,
      neuroRaw,
      formsRaw,
      documentsRaw,
      toolsRaw,
      notesRaw
    ] = await Promise.all([
      safeGet<any[]>('/appointments', { patient_id: patientId }),
      safeGet<any[]>('/medical-records', { patient_id: patientId }),
      safeGet<any[]>('/pei', { patient_id: patientId }),
      safeGet<any[]>('/forms/responses', { patient_id: patientId }),
      safeGet<any[]>('/documents', { patient_id: patientId }),
      safeGet<any>('/clinical-tools/summary', { patient_id: patientId }),
      safeGet<any[]>('/notes', { patient_id: patientId })
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
        if (!d || Number.isNaN(d.getTime())) return null;
        if (d.getTime() < now.getTime()) return null;
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { id: String(a.id ?? `${d.getTime()}`), label, time };
      })
      .filter(Boolean)
      .slice(0, 4) as { id: string; label: string; time: string }[];

    const countFrom = (value: any): number | null => {
      if (Array.isArray(value)) return value.length;
      if (typeof value === 'number') return value;
      if (value && typeof value === 'object' && typeof value.count === 'number') return value.count;
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
      upcomingAppointments
    });

    if (!appointmentsRaw && !recordsRaw && !neuroRaw && !formsRaw && !documentsRaw && !toolsRaw && !notesRaw) {
      setSummaryError('Nao foi possivel carregar os vinculos deste paciente.');
    }

    setSummaryLoading(false);
  };

  const renderCount = (value: number | null) => value === null ? 'ND' : String(value);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
              <Users size={28} />
            </div>
            {t('patients.title')}
          </h1>
          <p className="text-slate-500 mt-2 text-lg">{t('patients.subtitle')}</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 shadow-indigo-200"
        >
          <Plus size={20} /> {t('patients.new')}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-4 z-10 backdrop-blur-xl bg-white/90">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder={t('patients.search')}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
          {[
            { id: 'all', label: t('patients.filter.all') },
            { id: 'ativo', label: t('patients.status.active') },
            { id: 'inativo', label: t('patients.status.archived') }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as any)}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                statusFilter === filter.id
                  ? 'bg-white text-indigo-600 shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: summaryStats.total },
          { label: 'Ativos', value: summaryStats.active },
          { label: 'Inativos', value: summaryStats.inactive },
          { label: 'Reembolso', value: summaryStats.reimburse }
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{stat.label}</div>
            <div className="text-2xl font-display font-bold text-slate-800 mt-2">{stat.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group flex flex-col overflow-hidden relative">
              <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${patient.status === 'ativo' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>

              <div className="p-6 flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 shadow-sm transition-colors ${
                    patient.status === 'ativo'
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {patient.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">{patient.full_name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      {patient.status === 'ativo' ? t('patients.status.active') : t('patients.status.archived')}
                    </p>
                    {(patient.needs_reimbursement || patient.needsReimbursement) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-2">
                        <Banknote size={12} /> Reembolso
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Phone size={16} className="text-slate-400" />
                    <span className="font-medium truncate">{patient.whatsapp || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Mail size={16} className="text-slate-400" />
                    <span className="font-medium truncate">{patient.email || 'Sem email'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-medium">
                  <div className="flex flex-col">
                    <span className="uppercase tracking-wider text-slate-400 mb-1">{t('patients.card.lastVisit')}</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Calendar size={14} className="text-indigo-400" /> 24 Out
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-4 gap-2">
                <button
                  onClick={() => openPatientSummary(patient)}
                  title="Ver paciente"
                  className="col-span-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> Ver paciente
                </button>

                <button
                  onClick={() => handleEdit(patient)}
                  title="Editar"
                  className="py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all flex items-center justify-center"
                >
                  <Edit2 size={18} />
                </button>

                <button
                  onClick={() => setDeleteId(patient.id)}
                  title="Excluir"
                  className="py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPatients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
          <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Search size={48} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">{t('patients.empty')}</h3>
          <p className="text-slate-500 max-w-sm">Tente buscar por outro termo ou limpe os filtros para ver todos os pacientes.</p>
          <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="mt-6 text-indigo-600 font-bold hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl h-[90vh] overflow-hidden rounded-[2rem] shadow-2xl bg-white">
            <PatientFormWizard
              initialData={editingPatient || {}}
              onSave={handleSavePatient}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('patients.deleteTitle') || 'Excluir Paciente'}</h3>
            <p className="text-slate-500 mb-8">{t('patients.deleteDesc') || 'Tem certeza? Esta acao nao pode ser desfeita.'}</p>

            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                {t('patients.btn.cancel') || 'Cancelar'}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
              >
                {t('patients.btn.confirm') || 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold border border-indigo-100">
                  {selectedPatient.full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">{selectedPatient.full_name}</div>
                  <div className="text-xs text-slate-500">{selectedPatient.email || selectedPatient.whatsapp || 'Sem contato'}</div>
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-3 py-1 rounded-full font-bold border ${selectedPatient.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {selectedPatient.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                  {(selectedPatient.needs_reimbursement || selectedPatient.needsReimbursement) && (
                    <span className="px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">Reembolso</span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <div className="text-sm font-bold text-slate-800 mb-4">Vinculos</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Agenda', value: summary?.appointmentsCount, icon: <Calendar size={18} /> },
                      { label: 'Prontuarios', value: summary?.recordsCount, icon: <FileText size={18} /> },
                      { label: 'Neuro', value: summary?.neuroCount, icon: <BrainCircuit size={18} /> },
                      { label: 'Formularios', value: summary?.formsCount, icon: <ClipboardList size={18} /> },
                      { label: 'Documentos', value: summary?.documentsCount, icon: <FolderOpen size={18} /> },
                      { label: 'Ferramentas', value: summary?.toolsCount, icon: <Boxes size={18} /> },
                      { label: 'Notas', value: summary?.notesCount, icon: <StickyNote size={18} /> }
                    ].map((item) => (
                      <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="text-slate-400 mb-2">{item.icon}</div>
                        <div className="text-xl font-bold text-slate-800">{renderCount(item.value ?? null)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {summaryError && (
                    <div className="mt-4 text-xs text-rose-600">{summaryError}</div>
                  )}
                  {summaryLoading && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Carregando vinculos...
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/agenda?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
                  >
                    Abrir agenda
                  </button>
                  <button
                    onClick={() => navigate(`/prontuario?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Ver prontuario
                  </button>
                  <button
                    onClick={() => navigate(`/neurodesenvolvimento?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Neuro
                  </button>
                  <button
                    onClick={() => navigate(`/formularios/lista?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Formularios
                  </button>
                  <button
                    onClick={() => navigate(`/documentos?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Documentos
                  </button>
                  <button
                    onClick={() => navigate(`/caixa-ferramentas?patient_id=${selectedPatient.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Ferramentas
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-sm font-bold text-slate-800 mb-4">Contato</div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Mail size={16} className="text-slate-400" /> {selectedPatient.email || 'Sem email'}</div>
                    <div className="flex items-center gap-2"><Phone size={16} className="text-slate-400" /> {selectedPatient.whatsapp || selectedPatient.phone || 'Sem telefone'}</div>
                    <div className="flex items-center gap-2"><FileText size={16} className="text-slate-400" /> {selectedPatient.cpf_cnpj || selectedPatient.cpf || 'Sem documento'}</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-sm font-bold text-slate-800 mb-4">Proximos atendimentos</div>
                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
                  ) : summary?.upcomingAppointments?.length ? (
                    <div className="space-y-2">
                      {summary.upcomingAppointments.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <span className="font-bold text-slate-700">{item.label}</span>
                          <span className="text-slate-500 text-xs">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Sem atendimentos agendados.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
