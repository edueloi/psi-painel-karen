import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { 
  ShoppingBag, Search, Plus, Edit3, Trash2, 
  DollarSign, CheckCircle, X, LayoutGrid, List as ListIcon, 
  CreditCard, Calendar, User, MoreHorizontal, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Comandas: React.FC = () => {
  const { t, language } = useLanguage();
  
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aberta' | 'paga'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);

  // Carregar Dados
  useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          try {
              const [pts, srvs] = await Promise.all([
                  api.get<Patient[]>('/patients'),
                  api.get<Service[]>('/services')
              ]);
              setPatients(pts);
              setServices(srvs);
              // Mock inicial se vazio (para visualização)
              setComandas([
                  { id: '1', patientId: '1', patientName: 'Alice Silva', totalValue: 450, status: 'aberta', description: 'Pacote Mensal', items: [], createdAt: new Date().toISOString() },
                  { id: '2', patientId: '2', patientName: 'Enzo Gabriel', totalValue: 150, status: 'paga', description: 'Sessão Avulsa', items: [], createdAt: new Date().toISOString() }
              ]); 
          } catch (e) { console.error(e); } finally { setIsLoading(false); }
      };
      fetchData();
  }, []);

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
              status: 'aberta',
              items: [],
              totalValue: 0,
              paidValue: 0,
              description: '',
              patientId: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingComanda?.patientId) return;
      
      const patient = patients.find(p => p.id === editingComanda.patientId);
      const newComanda = {
          ...editingComanda,
          patientName: patient?.full_name || 'Desconhecido',
          id: editingComanda.id || Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
      } as Comanda;

      if (editingComanda.id) {
          setComandas(prev => prev.map(c => c.id === newComanda.id ? newComanda : c));
      } else {
          setComandas(prev => [newComanda, ...prev]);
      }
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (window.confirm(t('comandas.confirmDelete'))) {
          setComandas(prev => prev.filter(c => c.id !== id));
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
          aberta: 'bg-amber-50 text-amber-600 border-amber-100',
          paga: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          cancelada: 'bg-slate-50 text-slate-500 border-slate-100'
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
              <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><ShoppingBag size={20}/></div>
                  {t('comandas.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">{t('finance.subtitle')}</p>
          </div>
          <button 
              onClick={() => handleOpenModal()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <Plus size={18} /> {t('comandas.newEntry')}
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <FileText size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('common.total')}</p>
                  <p className="text-lg font-extrabold text-slate-800">{formatCurrency(stats.total)}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Clock size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('comandas.status.open')}</p>
                  <p className="text-lg font-extrabold text-slate-800">{formatCurrency(stats.open)}</p>
              </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('comandas.status.paid')}</p>
                  <p className="text-lg font-extrabold text-slate-800">{formatCurrency(stats.paid)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder={t('comandas.search')} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:bg-white focus:border-indigo-300 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl flex-1 lg:flex-none">
                  {[
                      { id: 'all', label: t('common.all') },
                      { id: 'aberta', label: t('comandas.status.open') },
                      { id: 'paga', label: t('comandas.status.paid') }
                  ].map(st => (
                      <button 
                          key={st.id}
                          onClick={() => setStatusFilter(st.id as any)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === st.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {st.label}
                      </button>
                  ))}
              </div>

              {/* View Toggle */}
              <div className="flex gap-1 border border-slate-200 bg-white p-1 rounded-xl">
                  <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}><ListIcon size={18}/></button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                  { id: 'aberta', title: t('comandas.status.open'), color: 'amber', icon: <Clock size={16}/> },
                  { id: 'paga', title: t('comandas.status.paid'), color: 'emerald', icon: <CheckCircle2 size={16}/> },
                  { id: 'cancelada', title: t('comandas.status.canceled'), color: 'slate', icon: <AlertCircle size={16}/> }
              ].map(col => (
                  <div key={col.id} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between px-2">
                          <div className={`flex items-center gap-2 text-${col.color}-600 font-bold text-xs uppercase tracking-wider`}>
                              {col.icon}
                              {col.title}
                          </div>
                          <span className="text-xs font-bold text-slate-300">
                              {filteredComandas.filter(c => c.status === col.id).length}
                          </span>
                      </div>
                      <div className="space-y-4">
                          {filteredComandas.filter(c => c.status === col.id).map(comanda => (
                              <div key={comanda.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-3">
                                          <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                              {comanda.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-slate-800 text-sm">{comanda.patientName}</h4>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{comanda.id}</p>
                                          </div>
                                      </div>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button onClick={() => handleOpenModal(comanda)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-400"><Edit3 size={14}/></button>
                                          <button onClick={() => handleDelete(comanda.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                                  
                                  <div className="mb-4">
                                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                                              <FileText size={14} className="text-slate-400"/>
                                              {comanda.description}
                                          </p>
                                      </div>
                                      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
                                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(comanda.createdAt || '').toLocaleDateString()}</span>
                                          {comanda.status === 'aberta' && (
                                              <span className="text-amber-500 flex items-center gap-1"><Clock size={12}/> Pendente</span>
                                          )}
                                      </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                      <div className="text-sm font-extrabold text-indigo-600">
                                          {formatCurrency(comanda.totalValue)}
                                      </div>
                                      <button className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all transform hover:rotate-45">
                                          <ArrowUpRight size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">{t('comandas.patient')}</th>
                          <th className="px-6 py-4">{t('comandas.description')}</th>
                          <th className="px-6 py-4">{t('comandas.totalValue')}</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredComandas.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                          {c.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </div>
                                      <span className="font-bold text-slate-800 text-sm">{c.patientName}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-600 text-sm">{c.description}</td>
                              <td className="px-6 py-4 font-extrabold text-indigo-600 text-sm">{formatCurrency(c.totalValue)}</td>
                              <td className="px-6 py-4">
                                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleOpenModal(c)} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-400"><Edit3 size={14}/></button>
                                      <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-lg font-extrabold text-slate-800">{t('comandas.modalTitle')}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingComanda.id ? `#${editingComanda.id}` : t('comandas.newEntry')}</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-full text-slate-400 ring-1 ring-slate-100 transition-all"><X size={18}/></button>
                  </div>
                  
                  <div className="p-8 space-y-5">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comandas.patient')}</label>
                          <div className="relative group">
                              <select 
                                  className="w-full text-sm font-bold p-3 pl-11 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 transition-all appearance-none" 
                                  value={editingComanda.patientId} 
                                  onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}
                              >
                                  <option value="">{t('comandas.selectPatient')}</option>
                                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                              </select>
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comandas.description')}</label>
                          <div className="relative group">
                              <input 
                                  type="text" 
                                  className="w-full text-sm font-bold p-3 pl-11 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 transition-all" 
                                  placeholder={t('comandas.descriptionPlaceholder')}
                                  value={editingComanda.description || ''} 
                                  onChange={e => setEditingComanda({...editingComanda, description: e.target.value})} 
                              />
                              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                              <select 
                                  className="w-full text-sm font-bold p-3 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-300 transition-all" 
                                  value={editingComanda.status} 
                                  onChange={e => setEditingComanda({...editingComanda, status: e.target.value as any})}
                              >
                                  <option value="aberta">{t('comandas.status.open')}</option>
                                  <option value="paga">{t('comandas.status.paid')}</option>
                                  <option value="cancelada">{t('comandas.status.canceled')}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comandas.totalValue')}</label>
                              <div className="relative group">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                  <input 
                                      type="number" 
                                      className="w-full text-base font-extrabold p-3 pl-9 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100/50 transition-all text-emerald-700" 
                                      value={editingComanda.totalValue} 
                                      onChange={e => setEditingComanda({...editingComanda, totalValue: parseFloat(e.target.value)})} 
                                  />
                              </div>
                          </div>
                      </div>

                      {/* ITEMS */}
                      <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/50">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                  <ListIcon size={14}/> {t('comandas.items')}
                              </h4>
                              <button onClick={handleAddItem} className="h-7 w-7 rounded-full bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                                  <Plus size={14}/>
                              </button>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                              {(!editingComanda.items || editingComanda.items.length === 0) ? (
                                  <div className="text-center py-4 border-2 border-dashed border-indigo-100 rounded-2xl">
                                      <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{t('comandas.noItems')}</p>
                                  </div>
                              ) : (
                                  editingComanda.items.map((item, idx) => (
                                      <div key={idx} className="flex gap-2 items-center animate-slideIn">
                                          <input 
                                              type="text" 
                                              placeholder="Item" 
                                              className="flex-1 text-xs font-bold p-2.5 rounded-xl border border-indigo-100 bg-white shadow-sm outline-none focus:border-indigo-400 transition-all" 
                                              value={(item as any).name || (item as any).description || ''} 
                                              onChange={e => {
                                                  const newItems = [...(editingComanda.items || [])];
                                                  (newItems[idx] as any).name = e.target.value;
                                                  (newItems[idx] as any).description = e.target.value;
                                                  setEditingComanda({...editingComanda, items: newItems});
                                              }} 
                                          />
                                          <div className="relative w-24">
                                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-400" size={12} />
                                              <input 
                                                  type="number" 
                                                  className="w-full text-right text-xs font-bold p-2.5 pl-6 rounded-xl border border-indigo-100 bg-white shadow-sm outline-none focus:border-indigo-400 transition-all" 
                                                  value={item.value} 
                                                  onChange={e => {
                                                      const newItems = [...(editingComanda.items || [])];
                                                      newItems[idx].value = parseFloat(e.target.value);
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

                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 px-8 pb-8">
                      <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">{t('common.cancel')}</button>
                      <button onClick={handleSave} className="px-8 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 uppercase tracking-widest">
                          <CheckCircle size={16}/> {t('common.save')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};