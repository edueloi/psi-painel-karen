
import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Comanda, ComandaItem, ComandaStatus, ComandaSession, Patient, Service } from '../types';
import { 
  ShoppingBag, Search, Plus, Filter, Edit3, Trash2, Calendar, User, 
  Receipt, DollarSign, CheckCircle, Clock, Archive, X, ChevronDown, Package, Layers,
  LayoutGrid, List as ListIcon, Send, CreditCard, AlertCircle, Printer, MoreHorizontal, ArrowRight,
  CalendarCheck, Repeat, PlayCircle, FileText, BadgeCheck, FileCheck, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Comandas: React.FC = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
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
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
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
              description: `Atendimento #${Math.floor(Math.random() * 1000)}`
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
          <div className="flex gap-3">
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
              </div>
              <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                  <Plus size={18} /> Novo Lançamento
              </button>
          </div>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : comandas.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center text-slate-400">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
              <p>Nenhuma comanda ou pacote ativo no momento.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredComandas.map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-800">{c.patientName}</h4>
                      <p className="text-xs text-slate-500 mb-4">{c.description}</p>
                      <div className="text-right"><p className="text-xl font-bold text-indigo-600">{formatCurrency(c.totalValue)}</p></div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL SIMPLIFICADO PARA DEMONSTRAÇÃO */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-lg rounded-[24px] p-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Lançamento de Comanda</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                          <select className="w-full p-3 rounded-xl border bg-slate-50" value={editingComanda.patientId} onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}>
                              <option value="">Selecione o paciente...</option>
                              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (R$)</label>
                          <input type="number" className="w-full p-3 rounded-xl border" value={editingComanda.totalValue} onChange={e => setEditingComanda({...editingComanda, totalValue: parseFloat(e.target.value)})} />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 bg-slate-50 rounded-xl">Cancelar</button>
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-xl shadow-lg">Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
