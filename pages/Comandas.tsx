import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { 
  ShoppingBag, Search, Plus, Edit3, Trash2, 
  DollarSign, CheckCircle, X, LayoutGrid, List as ListIcon, 
  CreditCard, Calendar, User, MoreHorizontal, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, FileText,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Comandas: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value);
  };

  // Estados
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Carregar Dados
  useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          try {
              const [ptsData, srvsData, usrsData] = await Promise.all([
                  api.get<any[]>('/patients'),
                  api.get<Service[]>('/services'),
                  api.get<any[]>('/users')
              ]);
              
              const mappedPatients = (ptsData || []).map(p => ({
                ...p,
                full_name: p.full_name || p.name || 'Sem nome'
              })) as Patient[];

              setPatients(mappedPatients);
              setServices(srvsData);
              setProfessionals(usrsData || []);
              
              // Carregar comandas reais da API
              try {
                const fetchedComandas = await api.get<Comanda[]>('/finance/comandas');
                setComandas(fetchedComandas || []);
              } catch (e) {
                console.error("Erro ao carregar comandas:", e);
              }
          } catch (e) { 
            console.error(e); 
          } finally { 
            setIsLoading(false); 
          }
      };
      fetchData();
  }, []);
  
  // Abrir comanda automaticamente se vier redirecionado da agenda
  useEffect(() => {
    const state = location.state as { openComandaId?: string };
    if (state?.openComandaId && comandas.length > 0) {
      const comanda = comandas.find(c => String(c.id) === String(state.openComandaId));
      if (comanda) {
        setEditingComanda({ 
          ...comanda,
          patientId: comanda.patient_id || comanda.patientId,
          professionalId: comanda.professional_id || comanda.professionalId,
          startDate: comanda.start_date || comanda.startDate,
          totalValue: comanda.total || comanda.totalValue
        });
        setIsModalOpen(true);
        // Limpa o state para não reabrir em refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, comandas]);

  // Lógica de Filtragem
  const filteredComandas = useMemo(() => {
      return comandas.filter(c => {
          const patientName = c.patientName || '';
          const description = c.description || '';
          const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                description.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
          return matchesSearch && matchesStatus;
      });
  }, [comandas, searchTerm, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
      const total = comandas.reduce((acc, c) => acc + (c.totalValue || 0), 0);
      const open = comandas.filter(c => c.status === 'aberta').reduce((acc, c) => acc + (c.totalValue || 0), 0);
      const paid = comandas.filter(c => c.status === 'paga').reduce((acc, c) => acc + (c.totalValue || 0), 0);
      return { total, open, paid };
  }, [comandas]);

  // Ações
  const handleOpenModal = (comanda?: Comanda) => {
      if (comanda) {
          setEditingComanda({ ...comanda });
      } else {
          setEditingComanda({
              status: 'open',
              items: [],
              totalValue: 0,
              paidValue: 0,
              description: '',
              patientId: '',
              professionalId: '',
              startDate: new Date().toISOString().slice(0, 16),
              duration_minutes: 60
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!editingComanda?.patientId) return;
      
      try {
        const payload = {
          patient_id: editingComanda.patientId,
          professional_id: editingComanda.professionalId,
          description: editingComanda.description,
          status: editingComanda.status,
          items: editingComanda.items,
          discount: 0,
          start_date: editingComanda.startDate,
          duration_minutes: editingComanda.duration_minutes || 60,
          payment_method: 'pending'
        };

        let saved: Comanda;
        if (editingComanda.id) {
            saved = await api.put<Comanda>(`/finance/comandas/${editingComanda.id}`, payload);
            setComandas(prev => prev.map(c => c.id === saved.id ? saved : c));
        } else {
            saved = await api.post<Comanda>('/finance/comandas', payload);
            setComandas(prev => [saved, ...prev]);
        }
        
        setIsModalOpen(false);
      } catch (err) {
        console.error("Erro ao salvar comanda:", err);
        alert("Erro ao salvar comanda.");
      }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setComandas(prev => prev.filter(c => c.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleAddItem = () => {
      if (!editingComanda) return;
    const newItem: any = { id: Math.random().toString(), name: '', value: 0, quantity: 1 };
      setEditingComanda({
          ...editingComanda,
          items: [...(editingComanda.items || []), newItem]
      });
  };

  const StatusBadge = ({ status }: { status: string }) => {
      const styles = {
          open: 'bg-amber-50 text-amber-600 border-amber-100',
          closed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          cancelled: 'bg-slate-50 text-slate-500 border-slate-100'
      };
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status as keyof typeof styles]}`}>
              {status}
          </span>
      );
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><ShoppingBag size={20}/></div>
                  {t('comandas.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('finance.subtitle')}</p>
          </div>
          <button 
              onClick={() => handleOpenModal()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <Plus size={18} /> {t('comandas.newEntry')}
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <FileText size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.total')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.total)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Clock size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">{t('comandas.status.open')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.open)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <CheckCircle2 size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">{t('comandas.status.paid')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.paid)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder={t('comandas.search')} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none">
                  {[
                      { id: 'all', label: t('common.all') },
                      { id: 'open', label: t('comandas.status.open') },
                      { id: 'closed', label: t('comandas.status.paid') }
                  ].map(st => (
                      <button 
                          key={st.id}
                          onClick={() => setStatusFilter(st.id as any)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === st.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {st.label}
                      </button>
                  ))}
              </div>

              {/* View Toggle */}
              <div className="flex gap-1.5 border border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm">
                  <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><ListIcon size={18}/></button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                  { id: 'open', title: t('comandas.status.open'), color: 'amber', icon: <Clock size={16}/> },
                  { id: 'closed', title: t('comandas.status.paid'), color: 'emerald', icon: <CheckCircle2 size={16}/> },
                  { id: 'cancelled', title: t('comandas.status.canceled'), color: 'slate', icon: <AlertCircle size={16}/> }
              ].map(col => (
                  <div key={col.id} className="flex flex-col gap-5">
                      <div className="flex items-center justify-between px-3">
                          <div className={`flex items-center gap-2 text-${col.color}-600 font-black text-[10px] uppercase tracking-[0.1em]`}>
                              {col.icon}
                              {col.title}
                          </div>
                          <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">
                              {filteredComandas.filter(c => c.status === col.id).length}
                          </span>
                      </div>
                      <div className="space-y-5">
                          {filteredComandas.filter(c => c.status === col.id).map(comanda => (
                              <div key={comanda.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                                  <div className="flex justify-between items-start mb-5">
                                      <div className="flex items-center gap-4">
                                          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-[12px] font-black shadow-lg shadow-indigo-100`}>
                                              {comanda.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </div>
                                          <div>
                                              <h4 className="font-black text-slate-800 text-[13px]">{comanda.patientName}</h4>
                                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{comanda.id}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-1.5">
                                          <button onClick={() => handleOpenModal(comanda)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                                          <button onClick={() => setDeleteConfirmId(comanda.id)} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                                  
                                  <div className="mb-5">
                                      <div className="bg-slate-50/50 border border-slate-100/50 p-3.5 rounded-3xl">
                                          <p className="text-xs font-bold text-slate-600 flex items-center gap-2.5 leading-relaxed">
                                              <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><FileText size={12}/></div>
                                              {comanda.description}
                                          </p>
                                      </div>
                                      <div className="mt-3 flex items-center justify-between text-[10px] font-black text-slate-400 px-1">
                                          <span className="flex items-center gap-1.5"><Calendar size={13}/> {new Date(comanda.createdAt || '').toLocaleDateString()}</span>
                                          {comanda.status === 'open' && (
                                              <span className="text-amber-500 flex items-center gap-1.5 animate-pulse"><Clock size={13}/> Pendente</span>
                                          )}
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                      <div className="text-base font-black text-indigo-600">
                                          {formatCurrency(comanda.totalValue)}
                                      </div>
                                      <button className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all transform hover:rotate-45 shadow-sm">
                                          <ArrowUpRight size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                      <tr>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5 text-center">{t('comandas.patient')}</th>
                          <th className="px-8 py-5">{t('comandas.description')}</th>
                          <th className="px-8 py-5">{t('comandas.totalValue')}</th>
                          <th className="px-8 py-5 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredComandas.map(c => (
                          <tr key={c.id} className="group hover:bg-indigo-50/30 transition-all">
                               <td className="px-8 py-5"><StatusBadge status={c.status} /></td>
                              <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100">
                                          {c.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </div>
                                      <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName}</span>
                                  </div>
                              </td>
                              <td className="px-8 py-5 font-bold text-slate-500 text-sm leading-relaxed">{c.description}</td>
                              <td className="px-8 py-5 font-black text-indigo-600 text-sm">{formatCurrency(c.totalValue)}</td>
                              <td className="px-8 py-5">
                                  <div className="flex justify-center gap-2">
                                      <button onClick={() => handleOpenModal(c)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-800 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL LANÇAMENTO */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">{t('comandas.modalTitle')}</h3>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{editingComanda.id ? `#${editingComanda.id}` : t('comandas.newEntry')}</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 ring-1 ring-slate-200 transition-all"><X size={18}/></button>
                  </div>
                  
                  <div className="p-10 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">{t('comandas.patient')}</label>
                          <div className="relative group">
                              <select 
                                  className="w-full text-sm font-black p-4 pl-12 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-8 focus:ring-indigo-100/30 transition-all appearance-none" 
                                  value={editingComanda.patientId} 
                                  onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}
                              >
                                  <option value="">{t('comandas.selectPatient')}</option>
                                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                              </select>
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={20} />
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Profissional Responsável</label>
                          <div className="relative group">
                              <select 
                                  className="w-full text-sm font-black p-4 pl-12 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-8 focus:ring-indigo-100/30 transition-all appearance-none" 
                                  value={editingComanda.professionalId} 
                                  onChange={e => setEditingComanda({...editingComanda, professionalId: e.target.value})}
                              >
                                  <option value="">Selecione o Profissional</option>
                                  {professionals.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={20} />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">{t('comandas.description')}</label>
                          <div className="relative group">
                              <input 
                                  type="text" 
                                  className="w-full text-sm font-black p-4 pl-12 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-8 focus:ring-indigo-100/30 transition-all" 
                                  placeholder={t('comandas.descriptionPlaceholder')}
                                  value={editingComanda.description || ''} 
                                  onChange={e => setEditingComanda({...editingComanda, description: e.target.value})} 
                              />
                              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={20} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Status</label>
                              <select 
                                  className="w-full text-sm font-black p-4 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all appearance-none" 
                                  value={editingComanda.status} 
                                  onChange={e => setEditingComanda({...editingComanda, status: e.target.value as any})}
                              >
                                  <option value="open">{t('comandas.status.open')}</option>
                                  <option value="closed">{t('comandas.status.paid')}</option>
                                  <option value="cancelled">{t('comandas.status.canceled')}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Valor Total</label>
                              <div className="relative group">
                                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                  <input 
                                      type="number" 
                                      className="w-full text-lg font-black p-4 pl-11 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-emerald-400 focus:ring-8 focus:ring-emerald-100/30 transition-all text-emerald-700" 
                                      value={editingComanda.totalValue} 
                                      onChange={e => setEditingComanda({...editingComanda, totalValue: parseFloat(e.target.value)})} 
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5 pt-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Data/Hora da Sessão</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="datetime-local" 
                                    className="w-full text-xs font-black p-4 pl-12 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all" 
                                    value={editingComanda.startDate?.slice(0, 16) || ''} 
                                    onChange={e => setEditingComanda({...editingComanda, startDate: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Duração (min)</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="number" 
                                    className="w-full text-xs font-black p-4 pl-12 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all" 
                                    value={editingComanda.duration_minutes || 60} 
                                    onChange={e => setEditingComanda({...editingComanda, duration_minutes: Number(e.target.value)})} 
                                />
                            </div>
                        </div>
                      </div>

                      {/* ITEMS */}
                      <div className="bg-indigo-50/40 p-6 rounded-[2rem] border border-indigo-100/50">
                          <div className="flex justify-between items-center mb-5">
                              <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                  <ListIcon size={16}/> {t('comandas.items')}
                              </h4>
                              <button onClick={handleAddItem} className="h-9 w-9 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                  <Plus size={18}/>
                              </button>
                          </div>
                          <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-3">
                              {(!editingComanda.items || editingComanda.items.length === 0) ? (
                                  <div className="text-center py-6 border-2 border-dashed border-indigo-100 rounded-3xl bg-white/50">
                                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{t('comandas.noItems')}</p>
                                  </div>
                              ) : (
                                  editingComanda.items.map((item, idx) => (
                                      <div key={idx} className="flex gap-3 items-center animate-slideIn">
                                          <input 
                                              type="text" 
                                              placeholder="Nome do Item / Serviço" 
                                              className="flex-1 text-xs font-black p-3.5 rounded-2xl border border-indigo-100 bg-white shadow-sm outline-none focus:border-indigo-400 transition-all" 
                                              value={(item as any).name || (item as any).description || ''} 
                                              onChange={e => {
                                                  const newItems = [...(editingComanda.items || [])];
                                                  (newItems[idx] as any).name = e.target.value;
                                                  (newItems[idx] as any).description = e.target.value;
                                                  setEditingComanda({...editingComanda, items: newItems});
                                              }} 
                                          />
                                          <div className="relative w-28">
                                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
                                              <input 
                                                  type="number" 
                                                  className="w-full text-right text-xs font-black p-3.5 pl-8 rounded-2xl border border-indigo-100 bg-white shadow-sm outline-none focus:border-indigo-400 transition-all text-indigo-600" 
                                                  value={item.value} 
                                                  onChange={e => {
                                                      const newItems = [...(editingComanda.items || [])];
                                                      newItems[idx].value = parseFloat(e.target.value) || 0;
                                                      setEditingComanda({...editingComanda, items: newItems});
                                                  }}
                                              />
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>

                  <div className="p-8 border-t border-slate-50 bg-slate-50/20 flex justify-end gap-4 px-10 pb-10">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
                      <button onClick={handleSave} className="px-10 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-[1.5rem] shadow-xl shadow-indigo-200 transition-all flex items-center gap-2 uppercase tracking-widest transform active:scale-95">
                          <CheckCircle size={18}/> {t('common.save')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CONFIRMAÇÃO DELEÇÃO */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Excluir Comanda?</h3>
              <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
                Esta ação é irreversível. Todas as informações ligadas a este lançamento serão perdidas.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   DESISTIR
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};