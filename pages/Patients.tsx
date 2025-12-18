
import React, { useState, useEffect, useMemo } from 'react';
import { Patient } from '../types';
import { api } from '../services/api';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { Plus, Search, Filter, Edit3, Trash2, Users, UserCheck, UserX, MoreHorizontal, Phone, MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
        const data = await api.get<Patient[]>('/patients');
        setPatients(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'ativo').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [patients]);

  const handleSave = async (data: Partial<Patient>) => {
    try {
        // O data já vem formatado do Wizard conforme a interface Patient
        if (data.id) {
            await api.put(`/patients/${data.id}`, data);
        } else {
            await api.post('/patients', data);
        }
        fetchPatients();
        setView('list');
    } catch (e: any) {
        alert('Erro ao salvar paciente: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir paciente permanentemente?')) {
      try {
          await api.delete(`/patients/${id}`);
          fetchPatients();
      } catch (e) {
          alert('Erro ao excluir');
      }
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="animate-fadeIn">
        <PatientFormWizard 
          initialData={selectedPatient} 
          onSave={handleSave} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-8 rounded-3xl text-white shadow-xl gap-4">
        <div>
            <h1 className="text-3xl font-display font-bold">{t('patients.title')}</h1>
            <p className="text-indigo-200 mt-1">{t('patients.subtitle')}</p>
        </div>
        <button onClick={() => { setSelectedPatient({ status: 'ativo', has_children: false, convenio: false, needs_reimbursement: false }); setView('form'); }} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
            <Plus size={20} /> {t('patients.new')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Ativos</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Inativos</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.inactive}</h3>
          </div>
      </div>

      <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" placeholder={t('patients.searchPlaceholder')} value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm" 
          />
      </div>

      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Carregando pacientes...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
              <div key={patient.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-indigo-200 transition-all flex flex-col group">
                 <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {patient.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-slate-800 truncate">{patient.full_name}</h3>
                       <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${patient.status === 'ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {patient.status === 'ativo' ? 'Ativo' : 'Inativo'}
                       </span>
                    </div>
                 </div>
                 <div className="space-y-2 mb-5 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><Phone size={14} className="text-slate-300"/> {patient.whatsapp || 'N/A'}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-300"/> {patient.city || 'Sem cidade'}</div>
                 </div>
                 <div className="flex gap-2 pt-4 border-t border-slate-50 mt-auto">
                    <button onClick={() => { setSelectedPatient(patient); setView('form'); }} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-all">Editar</button>
                    <button onClick={() => handleDelete(patient.id)} className="p-2 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={18}/></button>
                 </div>
              </div>
            ))}
            {filteredPatients.length === 0 && !isLoading && (
                <div className="col-span-full py-20 text-center text-slate-400">
                    Nenhum paciente encontrado.
                </div>
            )}
          </div>
      )}
    </div>
  );
};
