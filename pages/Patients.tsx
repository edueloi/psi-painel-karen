import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Filter, MoreHorizontal, 
  MapPin, Phone, Mail, Calendar, ChevronRight, FileText,
  Edit2, Trash2, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Patient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard'; // Importando o Wizard que criamos

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  
  // Estados de Dados
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

  // Estados de Modal/Formulário
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null); // Se não for null, mostra modal de delete

  // Carregar Dados (Simulação)
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
        // Aqui chamaria sua API real
        const data = await api.get<Patient[]>('/patients');
        setPatients(data);
    } catch (error) {
        console.error("Erro ao buscar pacientes", error);
    } finally {
        setIsLoading(false);
    }
  };

  // Lógica de Filtragem
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

  // Ações CRUD
  const handleAddNew = () => {
      setEditingPatient(undefined); // Limpa para novo cadastro
      setIsWizardOpen(true);
  };

  const handleEdit = (patient: Patient) => {
      setEditingPatient(patient);
      setIsWizardOpen(true);
  };

  const handleSavePatient = (data: Partial<Patient>) => {
      // Simulação de salvar na API
      if (data.id) {
          // Editar existente
          setPatients(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Patient : p));
      } else {
          // Criar novo (gerando ID fake)
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

  // Renderização
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn min-h-screen">
      
      {/* --- HEADER --- */}
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

      {/* --- FILTROS --- */}
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

      {/* --- GRID DE PACIENTES --- */}
      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                  <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
              ))}
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
                <div key={patient.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group flex flex-col overflow-hidden relative">
                    
                    {/* Status Dot */}
                    <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${patient.status === 'ativo' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>

                    <div className="p-6 flex-1">
                        {/* Avatar & Nome */}
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
                            </div>
                        </div>

                        {/* Informações de Contato */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <Phone size={16} className="text-slate-400" />
                                <span className="font-medium truncate">{patient.whatsapp || 'Sem telefone'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <Mail size={16} className="text-slate-400" />
                                <span className="font-medium truncate">{patient.email || 'Sem e-mail'}</span>
                            </div>
                        </div>

                        {/* Stats Rápidos */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-medium">
                            <div className="flex flex-col">
                                <span className="uppercase tracking-wider text-slate-400 mb-1">{t('patients.card.lastVisit')}</span>
                                <span className="font-bold text-slate-700 flex items-center gap-1">
                                    <Calendar size={14} className="text-indigo-400"/> 24 Out
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-4 gap-2">
                        <button title={t('patients.card.profile')} className="col-span-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                             <FileText size={16} /> {t('patients.card.records')}
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

      {/* --- EMPTY STATE --- */}
      {!isLoading && filteredPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
              <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Search size={48} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">{t('patients.empty')}</h3>
              <p className="text-slate-500 max-w-sm">Tente buscar por outro termo ou limpe os filtros para ver todos os pacientes.</p>
              <button onClick={() => {setSearchTerm(''); setStatusFilter('all');}} className="mt-6 text-indigo-600 font-bold hover:underline">
                  Limpar Filtros
              </button>
          </div>
      )}

      {/* --- MODAL WIZARD (NOVO/EDITAR) --- */}
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

      {/* --- MODAL CONFIRM DELETE --- */}
      {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <AlertCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('patients.deleteTitle') || 'Excluir Paciente'}</h3>
                  <p className="text-slate-500 mb-8">{t('patients.deleteDesc') || 'Tem certeza? Esta ação não pode ser desfeita.'}</p>
                  
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

    </div>
  );
};