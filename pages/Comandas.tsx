import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { 
  ShoppingBag, Search, Plus, X, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Comandas: React.FC = () => {
  const { t, language } = useLanguage();
  
  // Helper para formatação de moeda baseada no idioma
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' // Pode ser dinâmico se tiver suporte a multi-moeda no futuro
    }).format(value);
  };

  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);
  
  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [pts, srvs] = await Promise.all([
              api.get<Patient[]>('/patients'),
              api.get<Service[]>('/services')
          ]);
          setPatients(pts);
          setServices(srvs);
          // Em um sistema real, buscaríamos comandas do banco
          setComandas([]); 
      } catch (e) { 
          console.error(e); 
      } finally { 
          setIsLoading(false); 
      }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (comanda?: Comanda) => {
      if (comanda) {
          setEditingComanda({ ...comanda });
      } else {
          setEditingComanda({
              status: 'aberta',
              items: [],
              totalValue: 0,
              paidValue: 0,
              description: ''
          });
      }
      setIsModalOpen(true);
  };

  const filteredComandas = useMemo(() => {
      return comandas.filter(c => c.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [comandas, searchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-display font-bold text-slate-800">{t('nav.comandas')}</h1>
          <div className="flex gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input 
                    type="text" 
                    placeholder={t('comandas.search')} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
              </div>
              <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 whitespace-nowrap">
                  <Plus size={18} /> {t('comandas.newEntry')}
              </button>
          </div>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : comandas.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center text-slate-400 flex flex-col items-center">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('comandas.empty')}</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredComandas.map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                      <h4 className="font-bold text-slate-800">{c.patientName}</h4>
                      <p className="text-xs text-slate-500 mb-4">{c.description}</p>
                      <div className="text-right"><p className="text-xl font-bold text-indigo-600">{formatCurrency(c.totalValue)}</p></div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL SIMPLIFICADO */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-lg rounded-[24px] p-8 shadow-2xl animate-[slideUpFade_0.3s_ease-out]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{t('comandas.modalTitle')}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('comandas.patient')}</label>
                          <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={editingComanda.patientId} onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}>
                              <option value="">{t('comandas.selectPatient')}</option>
                              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('comandas.description')}</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100" 
                            placeholder={t('comandas.descriptionPlaceholder')}
                            value={editingComanda.description || ''} 
                            onChange={e => setEditingComanda({...editingComanda, description: e.target.value})} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('comandas.totalValue')}</label>
                          <input 
                            type="number" 
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-lg text-slate-800" 
                            value={editingComanda.totalValue} 
                            onChange={e => setEditingComanda({...editingComanda, totalValue: parseFloat(e.target.value)})} 
                          />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel')}</button>
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-colors">{t('common.save')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};