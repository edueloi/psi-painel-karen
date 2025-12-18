import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { Comanda, Patient, Service, ComandaItem } from '../types';
import { 
  ShoppingBag, Search, Plus, Filter, Edit3, Trash2, 
  DollarSign, CheckCircle, X, LayoutGrid, List as ListIcon, 
  CreditCard, Calendar, User, MoreHorizontal, ArrowRight
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
          const matchesSearch = c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                c.description.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
          return matchesSearch && matchesStatus;
      });
  }, [comandas, searchTerm, statusFilter]);

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

  // Renderizadores de Componentes
  const StatusBadge = ({ status }: { status: string }) => {
      const styles = {
          aberta: 'bg-amber-100 text-amber-700 border-amber-200',
          paga: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          cancelada: 'bg-slate-100 text-slate-600 border-slate-200'
      };
      const labels = {
          aberta: t('comandas.status.open'),
          paga: t('comandas.status.paid'),
          cancelada: t('comandas.status.canceled')
      };
      return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${styles[status as keyof typeof styles]}`}>
              {labels[status as keyof typeof labels] || status}
          </span>
      );
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h1 className="text-3xl font-display font-bold text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><ShoppingBag size={24}/></div>
                      {t('comandas.title')}
                  </h1>
                  <p className="text-slate-500 mt-1">{t('finance.subtitle')}</p>
              </div>
              <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  <Plus size={20} /> {t('comandas.newEntry')}
              </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="relative w-full lg:w-96 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder={t('comandas.search')} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" 
                  />
              </div>

              <div className="flex gap-2 w-full lg:w-auto">
                  {/* Status Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-xl flex-1 lg:flex-none">
                      {['all', 'aberta', 'paga'].map(st => (
                          <button 
                            key={st}
                            onClick={() => setStatusFilter(st as any)}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === st ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              {st === 'all' ? t('common.all') : st === 'aberta' ? t('comandas.status.open') : t('comandas.status.paid')}
                          </button>
                      ))}
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`} title={t('comandas.view.kanban')}><LayoutGrid size={20}/></button>
                      <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`} title={t('comandas.view.list')}><ListIcon size={20}/></button>
                  </div>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {comandas.length === 0 && !isLoading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><ShoppingBag size={40} className="opacity-30"/></div>
              <p className="text-lg font-medium">{t('comandas.empty')}</p>
          </div>
      ) : viewMode === 'kanban' ? (
          /* KANBAN VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto pb-4">
              {[
                  { id: 'aberta', title: t('comandas.status.open'), color: 'amber' },
                  { id: 'paga', title: t('comandas.status.paid'), color: 'emerald' },
                  { id: 'cancelada', title: t('comandas.status.canceled'), color: 'slate' }
              ].map(col => (
                  <div key={col.id} className="flex flex-col gap-4 min-w-[300px]">
                      <div className={`flex items-center justify-between p-4 rounded-xl bg-${col.color}-50 border border-${col.color}-100`}>
                          <h3 className={`font-bold text-${col.color}-800`}>{col.title}</h3>
                          <span className={`px-2 py-0.5 bg-white rounded-md text-xs font-bold text-${col.color}-600 shadow-sm`}>
                              {filteredComandas.filter(c => c.status === col.id).length}
                          </span>
                      </div>
                      <div className="space-y-3">
                          {filteredComandas.filter(c => c.status === col.id).map(comanda => (
                              <div key={comanda.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                                  <div className="flex justify-between items-start mb-3">
                                      <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">#{comanda.id}</span>
                                          <h4 className="font-bold text-slate-800 text-lg">{comanda.patientName}</h4>
                                      </div>
                                      <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={20}/></button>
                                  </div>
                                  
                                  <div className="space-y-2 mb-4">
                                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                                          <CreditCard size={14} className="text-slate-400"/> {comanda.description}
                                      </p>
                                      <p className="text-xs text-slate-400 flex items-center gap-1">
                                          <Calendar size={12}/> {new Date(comanda.createdAt || Date.now()).toLocaleDateString()}
                                      </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                      <div className="text-lg font-bold text-indigo-600">{formatCurrency(comanda.totalValue)}</div>
                                      <div className="flex gap-1">
                                          <button onClick={() => handleOpenModal(comanda)} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={16}/></button>
                                          <button onClick={() => handleDelete(comanda.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <tr>
                          <th className="p-6">ID</th>
                          <th className="p-6">{t('comandas.patient')}</th>
                          <th className="p-6">{t('comandas.description')}</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right">{t('comandas.totalValue')}</th>
                          <th className="p-6 text-center">{t('patients.card.actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredComandas.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6 text-slate-400 font-mono text-xs">#{c.id}</td>
                              <td className="p-6 font-bold text-slate-800">{c.patientName}</td>
                              <td className="p-6 text-slate-600">{c.description}</td>
                              <td className="p-6"><StatusBadge status={c.status} /></td>
                              <td className="p-6 text-right font-bold text-indigo-600">{formatCurrency(c.totalValue)}</td>
                              <td className="p-6 flex justify-center gap-2">
                                  <button onClick={() => handleOpenModal(c)} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                                  <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL EDIT/NEW */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-display font-bold text-slate-800">{t('comandas.modalTitle')}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('comandas.patient')}</label>
                              <div className="relative">
                                  <select className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-100 appearance-none" value={editingComanda.patientId} onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}>
                                      <option value="">{t('comandas.selectPatient')}</option>
                                      {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                  </select>
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              </div>
                          </div>
                          
                          <div className="col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('comandas.description')}</label>
                              <input 
                                type="text" 
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-100" 
                                placeholder={t('comandas.descriptionPlaceholder')}
                                value={editingComanda.description || ''} 
                                onChange={e => setEditingComanda({...editingComanda, description: e.target.value})} 
                              />
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                              <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none" value={editingComanda.status} onChange={e => setEditingComanda({...editingComanda, status: e.target.value as any})}>
                                  <option value="aberta">{t('comandas.status.open')}</option>
                                  <option value="paga">{t('comandas.status.paid')}</option>
                                  <option value="cancelada">{t('comandas.status.canceled')}</option>
                              </select>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('comandas.totalValue')}</label>
                              <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                  <input 
                                    type="number" 
                                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-lg text-emerald-700" 
                                    value={editingComanda.totalValue} 
                                    onChange={e => setEditingComanda({...editingComanda, totalValue: parseFloat(e.target.value)})} 
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Items Section (Simplificada para Demo) */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-slate-700 text-sm">{t('comandas.items')}</h4>
                              <button onClick={handleAddItem} className="text-xs font-bold text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-50 flex items-center gap-1">
                                  <Plus size={14}/> {t('comandas.addItem')}
                              </button>
                          </div>
                          {(!editingComanda.items || editingComanda.items.length === 0) ? (
                              <p className="text-center text-xs text-slate-400 py-2">{t('comandas.noItems')}</p>
                          ) : (
                              <div className="space-y-2">
                                  {editingComanda.items.map((item, idx) => (
                                      <div key={idx} className="flex gap-2 text-sm bg-white p-2 rounded border border-slate-200">
                                          <input 
                                              type="text" 
                                              placeholder="Item" 
                                              className="flex-1 outline-none" 
                                              value={(item as any).name || (item as any).description || ''} 
                                              onChange={e => {
                                                  const newItems = [...(editingComanda.items || [])];
                                                  (newItems[idx] as any).name = e.target.value;
                                                  (newItems[idx] as any).description = e.target.value;
                                                  setEditingComanda({...editingComanda, items: newItems});
                                              }} 
                                          />
                                          <input type="number" placeholder="0.00" className="w-20 text-right outline-none" value={item.value} onChange={e => {
                                              const newItems = [...(editingComanda.items || [])];
                                              newItems[idx].value = parseFloat(e.target.value);
                                              setEditingComanda({...editingComanda, items: newItems});
                                          }}/>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">{t('common.cancel')}</button>
                      <button onClick={handleSave} className="px-8 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-colors flex items-center gap-2">
                          <CheckCircle size={18}/> {t('common.save')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};