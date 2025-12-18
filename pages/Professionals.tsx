
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  UserCheck, Search, Plus, Filter, Edit3, Trash2, Shield, Calendar, 
  Briefcase, Percent, CheckCircle, X, DollarSign, Users, Lock, Key, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Professionals: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'team' | 'permissions' | 'commissions'>('team');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<any>(null);

  const fetchPros = async () => {
    setIsLoading(true);
    try {
        const data = await api.get<any[]>('/users');
        setProfessionals(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPros();
  }, []);

  const handleSave = async () => {
    try {
        if (editingPro.id) {
            await api.put(`/users/${editingPro.id}`, editingPro);
        } else {
            await api.post('/users', editingPro);
        }
        fetchPros();
        setIsModalOpen(false);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="max-w-2xl text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{t('professionals.title')}</h1>
                <p className="text-indigo-200">{t('professionals.subtitle')}</p>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('team')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Users size={18} /> {t('professionals.team')}
                </button>
                <button onClick={() => setActiveTab('permissions')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Key size={18} /> {t('professionals.permissions')}
                </button>
                <button onClick={() => setActiveTab('commissions')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'commissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Percent size={18} /> {t('professionals.commissions')}
                </button>
            </div>
        </div>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionals.map(pro => (
                  <div key={pro.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{pro.name.charAt(0)}</div>
                              <div>
                                  <h3 className="font-bold text-slate-800 truncate max-w-[150px]">{pro.name}</h3>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500`}>{pro.role}</span>
                              </div>
                          </div>
                          <button onClick={() => { setEditingPro(pro); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                      </div>
                      <div className="space-y-2 mb-4 text-sm text-slate-500">
                          <p className="truncate">{pro.email}</p>
                          <p>{pro.phone || 'Sem telefone'}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                          <span className={`text-xs font-bold ${pro.is_active ? 'text-emerald-600' : 'text-rose-500'}`}>{pro.is_active ? 'ATIVO' : 'INATIVO'}</span>
                          {/* Fix: Replaced fetchData() with fetchPros() as fetchData was not defined */}
                          <button onClick={() => fetchPros()} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
              <button onClick={() => { setEditingPro({ role: 'profissional', is_active: true }); setIsModalOpen(true); }} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all min-h-[180px]">
                  <Plus size={32} className="mb-2" />
                  <span className="font-bold">{t('professionals.new')}</span>
              </button>
          </div>
      )}

      {isModalOpen && editingPro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingPro.id ? 'Editar' : 'Novo'} Usuário</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label><input type="text" className="w-full p-3 rounded-xl border" value={editingPro.name || ''} onChange={e => setEditingPro({...editingPro, name: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" className="w-full p-3 rounded-xl border" value={editingPro.email || ''} onChange={e => setEditingPro({...editingPro, email: e.target.value})} /></div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl">{t('common.cancel')}</button>
                      <button onClick={handleSave} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-xl shadow-lg">{t('common.save')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
