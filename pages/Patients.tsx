import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Filter, MoreHorizontal, 
  MapPin, Phone, Mail, Calendar, ChevronRight, FileText
} from 'lucide-react';
import { api } from '../services/api';
import { Patient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Efeito para carregar dados (simulado ou real)
  useEffect(() => {
    const fetchPatients = async () => {
        try {
            const data = await api.get<Patient[]>('/patients');
            setPatients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.cpf_cnpj?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' ? true : 
                          statusFilter === 'active' ? p.status === 'ativo' : p.status !== 'ativo';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-800">{t('patients.title')}</h1>
          <p className="text-slate-500 mt-1">{t('patients.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
          <Plus size={20} /> {t('patients.new')}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
                type="text" 
                placeholder={t('patients.search')} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('patients.filter.all')}
            </button>
            <button 
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('patients.filter.active')}
            </button>
            <button 
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'inactive' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('patients.filter.inactive')}
            </button>
        </div>
      </div>

      {/* Grid de Pacientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
            <div key={patient.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 border-4 border-slate-50">
                                {patient.full_name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{patient.full_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${patient.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                    <span className="text-xs font-bold text-slate-500 uppercase">
                                        {patient.status === 'ativo' ? t('patients.status.active') : t('patients.status.archived')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        {patient.whatsapp && (
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Phone size={16} className="text-slate-400" />
                                {patient.whatsapp}
                            </div>
                        )}
                        {patient.email && (
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail size={16} className="text-slate-400" />
                                {patient.email}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                        <div className="flex flex-col">
                             <span className="uppercase tracking-wider opacity-70 mb-1">{t('patients.card.lastVisit')}</span>
                             <span className="font-bold text-slate-700 flex items-center gap-1"><Calendar size={12}/> 24 Out</span>
                        </div>
                        <div className="flex flex-col text-right">
                             <span className="uppercase tracking-wider opacity-70 mb-1">{t('patients.card.nextVisit')}</span>
                             <span className="font-bold text-indigo-600 flex items-center gap-1 justify-end">02 Nov <ChevronRight size={12}/></span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex gap-2">
                    <button className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        {t('patients.card.profile')}
                    </button>
                    <button className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm">
                        {t('patients.card.records')}
                    </button>
                </div>
            </div>
        ))}
      </div>

      {!isLoading && filteredPatients.length === 0 && (
          <div className="text-center py-20">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">{t('patients.empty')}</h3>
          </div>
      )}
    </div>
  );
};