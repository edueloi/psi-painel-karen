
import React, { useState, useMemo } from 'react';
import { MOCK_PATIENTS } from '../constants';
import { Patient } from '../types';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { 
  Plus, Search, Filter, Edit3, Trash2, Eye, MapPin, Phone, 
  Users, Activity, UserCheck, UserX, CreditCard, MoreHorizontal 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Stats Logic ---
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.active).length;
    const inactive = total - active;
    // Mocking "new this month"
    const newThisMonth = Math.floor(total * 0.1); 

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

  const handleSave = (data: Partial<Patient>) => {
    if (data.id) {
      setPatients(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Patient : p));
    } else {
      const newPatient = { ...data, id: Math.random().toString(36).substr(2, 9) } as Patient;
      setPatients(prev => [...prev, newPatient]);
    }
    setView('list');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('common.delete') + '?')) {
      setPatients(prev => prev.filter(p => p.id !== id));
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

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Users size={14} />
                    <span>Gestão de Pacientes</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('patients.title')}</h1>
                <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">
                    {t('patients.subtitle')}
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    onClick={handleAddNew}
                    className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <Plus size={20} />
                    {t('patients.new')}
                </button>
            </div>
        </div>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Pacientes</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          {stats.total}
                      </div>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Users size={20} />
                  </div>
              </div>
              <p className="text-xs text-slate-400">
                  <span className="text-emerald-500 font-bold">+{stats.newThisMonth}</span> novos este mês
              </p>
          </div>

          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Ativos</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          {stats.active}
                      </div>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <UserCheck size={20} />
                  </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(stats.active / stats.total) * 100}%` }}></div>
              </div>
          </div>

           <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Inativos</h3>
                      <div className="text-3xl font-display font-bold text-slate-800 mt-1">
                          {stats.inactive}
                      </div>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
                      <UserX size={20} />
                  </div>
              </div>
              <p className="text-xs text-slate-400">Pacientes arquivados ou em alta</p>
          </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            
            {/* Search Bar */}
            <div className="relative w-full lg:max-w-lg group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder={t('patients.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>

            {/* Filter Button */}
            <button className="px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm hover:border-indigo-200 hover:text-indigo-600">
              <Filter size={18} />
              <span>{t('patients.filters')}</span>
            </button>
        </div>
      </div>

      {/* --- PATIENTS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-indigo-200 transition-all duration-300 relative flex flex-col hover:-translate-y-1">
             
             {/* Header */}
             <div className="flex items-start gap-4 mb-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 p-0.5 flex-shrink-0">
                   <div className="h-full w-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                       {patient.photoUrl ? (
                           <img src={patient.photoUrl} className="h-full w-full object-cover" /> 
                        ) : (
                           <span className="font-display font-bold text-2xl text-indigo-400">{patient.name.charAt(0)}</span>
                        )}
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-lg text-slate-800 truncate leading-tight mb-1">{patient.name}</h3>
                   <div className="flex flex-wrap gap-2">
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                           patient.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                       }`}>
                          {patient.active ? t('patients.active') : t('patients.inactive')}
                       </span>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                           patient.paymentType === 'Particular' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                       }`}>
                          {patient.paymentType === 'Particular' ? t('wizard.private') : t('wizard.insurance')}
                       </span>
                   </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
             </div>

             {/* Info List */}
             <div className="space-y-3 mb-6 flex-1 bg-slate-50/50 rounded-xl p-4 border border-slate-100/50">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone size={14} className="text-indigo-400" />
                    <span className="font-medium">{patient.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin size={14} className="text-indigo-400" />
                    <span className="font-medium truncate">{patient.address.city ? `${patient.address.city}/${patient.address.state}` : 'Sem endereço'}</span>
                </div>
                {patient.paymentType === 'Convênio' && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CreditCard size={14} className="text-purple-400" />
                        <span className="font-medium truncate">{patient.insuranceProvider}</span>
                    </div>
                )}
             </div>

             {/* Actions Footer */}
             <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                    onClick={() => handleEdit(patient)} 
                    className="flex items-center justify-center py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-bold text-xs gap-2"
                >
                   <Edit3 size={16} /> {t('common.edit')}
                </button>
                <button 
                    onClick={() => handleDelete(patient.id)} 
                    className="flex items-center justify-center py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all font-bold text-xs gap-2"
                >
                   <Trash2 size={16} /> {t('common.delete')}
                </button>
             </div>
          </div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Search size={32} className="opacity-50" />
            </div>
            <p className="text-xl font-bold text-slate-700 mb-1">{t('patients.noResults')}</p>
            <p className="text-sm mb-6">{t('patients.noResultsDesc')}</p>
            <button 
                onClick={handleAddNew}
                className="text-indigo-600 font-bold hover:underline"
            >
                Adicionar novo paciente agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
