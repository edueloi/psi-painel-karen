
import React, { useState, useMemo, useEffect } from 'react';
import api from '../api';
import { Patient, PaymentType } from '../types';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { 
  Plus, Search, Filter, Edit3, Trash2, Eye, MapPin, Phone, 
  Users, Activity, UserCheck, UserX, CreditCard, MoreHorizontal, Loader2, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapApiToPatient = (apiPatient: any): Patient => ({
    id: apiPatient.id,
    name: apiPatient.full_name,
    email: apiPatient.email,
    phone: apiPatient.whatsapp || apiPatient.phone,
    whatsapp: apiPatient.whatsapp,
    cpf: apiPatient.cpf_cnpj,
    active: apiPatient.status === 'ativo',
    // Mocking some data that is not in the backend yet
    paymentType: apiPatient.convenio ? PaymentType.INSURANCE : PaymentType.PRIVATE,
    insuranceProvider: apiPatient.convenio_name,
    address: {
      street: apiPatient.street || '',
      number: apiPatient.house_number || '',
      neighborhood: apiPatient.neighborhood || '',
      city: apiPatient.city || '',
      state: apiPatient.state || '',
      zipCode: '', // not in backend
    },
    // Add other fields from your Patient type, possibly with default values
    psychologistId: '', // not in backend
    hasChildren: apiPatient.has_children,
    birthDate: '',
  });

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/patients');
      const mappedPatients = response.data.map(mapApiToPatient);
      setPatients(mappedPatients);
    } catch (err) {
      setError('Falha ao carregar pacientes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // --- Stats Logic ---
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.active).length;
    const inactive = total - active;
    const newThisMonth = patients.filter(p => p.id && new Date(p.id.substring(0, 8), 16) > new Date(new Date().setDate(new Date().getDate() - 30))).length;

    return { total, active, inactive, newThisMonth };
  }, [patients]);

  const handleAddNew = () => {
    setSelectedPatient({});
    setView('form');
  };

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setView('form');
  };

  const handleSave = async (data: Partial<Patient>) => {
    const patientData = {
        full_name: data.name,
        email: data.email,
        whatsapp: data.whatsapp || data.phone,
        cpf_cnpj: data.cpf,
        street: data.address?.street,
        house_number: data.address?.number,
        neighborhood: data.address?.neighborhood,
        city: data.address?.city,
        state: data.address?.state,
        status: data.active ? 'ativo' : 'inativo',
        convenio: data.paymentType === 'Convênio',
        convenio_name: data.insuranceProvider,
        // map other fields
    };

    try {
        if (data.id) {
            await api.put(`/patients/${data.id}`, patientData);
        } else {
            await api.post('/patients', patientData);
        }
        await fetchPatients(); // Recarrega a lista
        setView('list');
    } catch (error) {
        console.error("Failed to save patient", error);
        setError("Falha ao salvar paciente.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.delete') + '?')) {
        try {
            await api.delete(`/patients/${id}`);
            await fetchPatients(); // Recarrega a lista
        } catch (error) {
            console.error("Failed to delete patient", error);
            setError("Falha ao remover paciente.");
        }
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone?.includes(searchTerm) ||
    p.cpf?.includes(searchTerm)
  );

  if (view === 'form') {
    return (
      <div className="h-[calc(100vh-8rem)] animate-[fadeIn_0.3s_ease-out]">
        <PatientFormWizard 
          initialData={selectedPatient} 
          onSave={handleSave} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
    );
  }

  if (error) {
      return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center">
            <AlertTriangle className="mr-3" />
            <span>{error}</span>
        </div>
      )
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Users size={12} />
                    <span>Gestão de Pacientes</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 leading-tight">{t('patients.title')}</h1>
                <p className="text-indigo-200 text-sm leading-relaxed max-w-xl">
                    {t('patients.subtitle')}
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    onClick={handleAddNew}
                    className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 h-10 rounded-lg font-bold shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0 text-sm"
                >
                    <Plus size={16} />
                    {t('patients.new')}
                </button>
            </div>
        </div>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                  <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Pacientes</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.total}
                      </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Users size={18} />
                  </div>
              </div>
              <p className="text-[10px] text-slate-400">
                  <span className="text-emerald-500 font-bold">+{stats.newThisMonth}</span> novos este mês
              </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                  <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ativos</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.active}
                      </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <UserCheck size={18} />
                  </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(stats.active / stats.total) * 100}%` }}></div>
              </div>
          </div>

           <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                  <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Inativos</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.inactive}
                      </div>
                  </div>
                  <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg">
                      <UserX size={18} />
                  </div>
              </div>
              <p className="text-[10px] text-slate-400">Pacientes arquivados ou em alta</p>
          </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-4 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-3 -my-3 px-1">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
            
            {/* Search Bar */}
            <div className="relative w-full lg:max-w-lg group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder={t('patients.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-sm text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>

            {/* Filter Button */}
            <button className="px-4 h-10 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm hover:border-indigo-200 hover:text-indigo-600 text-sm">
              <Filter size={16} />
              <span>{t('patients.filters')}</span>
            </button>
        </div>
      </div>

      {/* --- PATIENTS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-indigo-200 transition-all duration-300 relative flex flex-col hover:-translate-y-0.5">
             
             {/* Header */}
             <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-0.5 flex-shrink-0">
                   <div className="h-full w-full rounded-lg bg-white flex items-center justify-center overflow-hidden">
                       {patient.photoUrl ? (
                           <img src={patient.photoUrl} className="h-full w-full object-cover" /> 
                        ) : (
                           <span className="font-display font-bold text-xl text-indigo-400">{patient.name.charAt(0)}</span>
                        )}
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-base text-slate-800 truncate leading-tight mb-1">{patient.name}</h3>
                   <div className="flex flex-wrap gap-2">
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                           patient.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                       }`}>
                          {patient.active ? t('patients.active') : t('patients.inactive')}
                       </span>
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                           patient.paymentType === 'Particular' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                       }`}>
                          {patient.paymentType === 'Particular' ? t('wizard.private') : t('wizard.insurance')}
                       </span>
                   </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={18} />
                </button>
             </div>

             {/* Info List */}
             <div className="space-y-2 mb-5 flex-1 bg-slate-50/50 rounded-lg p-3 border border-slate-100/50">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                    <Phone size={12} className="text-indigo-400" />
                    <span className="font-medium">{patient.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                    <MapPin size={12} className="text-indigo-400" />
                    <span className="font-medium truncate">{patient.address.city ? `${patient.address.city}/${patient.address.state}` : 'Sem endereço'}</span>
                </div>
                {patient.paymentType === 'Convênio' && (
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                        <CreditCard size={12} className="text-purple-400" />
                        <span className="font-medium truncate">{patient.insuranceProvider}</span>
                    </div>
                )}
             </div>

             {/* Actions Footer */}
             <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                    onClick={() => handleEdit(patient)} 
                    className="flex items-center justify-center py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-bold text-xs gap-2"
                >
                   <Edit3 size={14} /> {t('common.edit')}
                </button>
                <button 
                    onClick={() => handleDelete(patient.id)} 
                    className="flex items-center justify-center py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all font-bold text-xs gap-2"
                >
                   <Trash2 size={14} /> {t('common.delete')}
                </button>
             </div>
          </div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Search size={24} className="opacity-50" />
            </div>
            <p className="text-lg font-bold text-slate-700 mb-1">{t('patients.noResults')}</p>
            <p className="text-xs mb-4">{t('patients.noResultsDesc')}</p>
            <button 
                onClick={handleAddNew}
                className="text-indigo-600 font-bold hover:underline text-sm"
            >
                Adicionar novo paciente agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
