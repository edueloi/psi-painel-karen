
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_COMANDAS, MOCK_SERVICES, MOCK_PACKAGES, MOCK_PATIENTS } from '../constants';
import { Comanda, ComandaItem, ComandaStatus, ComandaSession } from '../types';
import { 
  ShoppingBag, Search, Plus, Filter, Edit3, Trash2, Calendar, User, 
  Receipt, DollarSign, CheckCircle, Clock, Archive, X, ChevronDown, Package, Layers,
  LayoutGrid, List as ListIcon, Send, CreditCard, AlertCircle, Printer, MoreHorizontal, ArrowRight,
  CalendarCheck, Repeat, PlayCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Comandas: React.FC = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [comandas, setComandas] = useState<Comanda[]>(MOCK_COMANDAS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);
  
  // Modal Sub-tabs
  const [activeModalTab, setActiveModalTab] = useState<'items' | 'sessions'>('items');

  // Selection State for Adding Items
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // --- LOGIC & CALCULATIONS ---

  const stats = useMemo(() => {
      const totalOpen = comandas.filter(c => c.status === 'aberta').reduce((acc, c) => acc + (c.totalValue - c.paidValue), 0);
      const totalPaid = comandas.reduce((acc, c) => acc + c.paidValue, 0);
      const countOpen = comandas.filter(c => c.status === 'aberta').length;
      return { totalOpen, totalPaid, countOpen };
  }, [comandas]);

  const filteredComandas = useMemo(() => {
      return comandas.filter(c => 
          c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          c.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [comandas, searchTerm]);

  // Grouping for Kanban
  const kanbanColumns = useMemo(() => {
      return {
          aberta: filteredComandas.filter(c => c.status === 'aberta' && c.paidValue === 0),
          parcial: filteredComandas.filter(c => c.status === 'aberta' && c.paidValue > 0 && c.paidValue < c.totalValue),
          fechada: filteredComandas.filter(c => c.status === 'fechada' || c.paidValue >= c.totalValue)
      };
  }, [filteredComandas]);

  // --- HANDLERS ---

  const handleOpenModal = (comanda?: Comanda) => {
      setActiveModalTab('items'); // Reset tab
      if (comanda) {
          setEditingComanda({ ...comanda });
      } else {
          setEditingComanda({
              status: 'aberta',
              type: 'servico',
              items: [],
              sessions: [], // Initialize empty sessions
              subtotal: 0,
              discountType: 'percentage',
              discountValue: 0,
              totalValue: 0,
              paidValue: 0,
              startDate: new Date().toISOString().slice(0, 16), // Datetime-local format
              frequency: 'semanal',
              description: `Tratamento #${Math.floor(Math.random() * 1000)}`
          });
      }
      setSelectedServiceId('');
      setSelectedQty(1);
      setIsModalOpen(true);
  };

  const handleSaveComanda = () => {
      if (!editingComanda?.patientId) {
          alert("Por favor, selecione um paciente.");
          return;
      }

      const patient = MOCK_PATIENTS.find(p => p.id === editingComanda.patientId);
      
      // Auto-close if fully paid
      let finalStatus: ComandaStatus = editingComanda.status || 'aberta';
      if ((editingComanda.paidValue || 0) >= (editingComanda.totalValue || 0) && editingComanda.totalValue! > 0) {
          finalStatus = 'fechada';
      }

      const finalComanda = {
          ...editingComanda,
          patientName: patient?.name || 'Cliente',
          id: editingComanda.id || Math.random().toString(36).substr(2, 9),
          createdAt: editingComanda.createdAt || new Date().toISOString(),
          status: finalStatus
      } as Comanda;

      if (editingComanda.id) {
          setComandas(prev => prev.map(c => c.id === finalComanda.id ? finalComanda : c));
      } else {
          setComandas(prev => [...prev, finalComanda]);
      }
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('Tem certeza que deseja excluir esta comanda?')) {
          setComandas(prev => prev.filter(c => c.id !== id));
      }
  };

  const generateSessions = (startDate: string, count: number, frequency: 'unica' | 'semanal' | 'quinzenal' | 'mensal') => {
      const sessions: ComandaSession[] = [];
      let currentDate = new Date(startDate);

      for (let i = 0; i < count; i++) {
          sessions.push({
              id: Math.random().toString(36).substr(2, 9),
              number: i + 1,
              date: currentDate.toISOString(),
              status: 'pending'
          });

          // Increment date based on frequency
          if (frequency === 'semanal') currentDate.setDate(currentDate.getDate() + 7);
          else if (frequency === 'quinzenal') currentDate.setDate(currentDate.getDate() + 14);
          else if (frequency === 'mensal') currentDate.setMonth(currentDate.getMonth() + 1);
          // If 'unica', date stays the same (but usually count is 1)
      }
      return sessions;
  };

  const handleAddItem = () => {
      if (!selectedServiceId || !editingComanda) return;
      
      const service = MOCK_SERVICES.find(s => s.id === selectedServiceId);
      if (!service) return;

      const newItem: ComandaItem = {
          id: Math.random().toString(36).substr(2, 5),
          serviceId: service.id,
          serviceName: service.name,
          quantity: selectedQty,
          unitPrice: service.price,
          total: service.price * selectedQty
      };

      const newItems = [...(editingComanda.items || []), newItem];
      
      // AUTO-GENERATE SESSIONS LOGIC
      // If adding items, we might want to regenerate or append sessions.
      // For simplicity in this demo, if it's the *first* item or specific logic, we generate sessions.
      // Let's prompt user or auto-do it if sessions are empty.
      let newSessions = editingComanda.sessions || [];
      if (newSessions.length === 0 && editingComanda.startDate) {
          newSessions = generateSessions(editingComanda.startDate, selectedQty, editingComanda.frequency || 'semanal');
          setActiveModalTab('sessions'); // Switch tab to show user
      }

      setEditingComanda(prev => ({
          ...prev,
          sessions: newSessions,
          items: newItems
      }));

      recalculateTotals(newItems, editingComanda.discountType, editingComanda.discountValue);
      
      setSelectedServiceId('');
      setSelectedQty(1);
  };

  const handleRemoveItem = (itemId: string) => {
      if (!editingComanda) return;
      const newItems = editingComanda.items?.filter(i => i.id !== itemId) || [];
      recalculateTotals(newItems, editingComanda.discountType, editingComanda.discountValue);
  };

  const recalculateTotals = (items: ComandaItem[], discountType: 'percentage'|'fixed' = 'percentage', discountValue: number = 0) => {
      const subtotal = items.reduce((acc, item) => acc + item.total, 0);
      let total = subtotal;
      
      if (discountType === 'percentage') {
          total = subtotal - (subtotal * (discountValue / 100));
      } else {
          total = subtotal - discountValue;
      }

      setEditingComanda(prev => ({
          ...prev!,
          items,
          subtotal,
          discountType,
          discountValue,
          totalValue: Math.max(0, total)
      }));
  };

  const handleShareWhatsApp = (comanda: Comanda) => {
      const itemsList = comanda.items.map(i => `- ${i.quantity}x ${i.serviceName}: ${formatCurrency(i.total)}`).join('\n');
      const text = `Olá ${comanda.patientName}, segue o resumo do seu tratamento:\n\n*${comanda.description}*\n${itemsList}\n\n*Total: ${formatCurrency(comanda.totalValue)}*\nPago: ${formatCurrency(comanda.paidValue)}\nRestante: ${formatCurrency(comanda.totalValue - comanda.paidValue)}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleSessionStatus = (sessionId: string) => {
      if (!editingComanda || !editingComanda.sessions) return;
      
      const newSessions = editingComanda.sessions.map(s => {
          if (s.id === sessionId) {
              return { ...s, status: s.status === 'completed' ? 'pending' : 'completed' } as ComandaSession;
          }
          return s;
      });
      
      setEditingComanda({ ...editingComanda, sessions: newSessions });
  };

  // --- RENDER HELPERS ---

  const renderKanbanCard = (comanda: Comanda) => {
      const progress = Math.min((comanda.paidValue / comanda.totalValue) * 100, 100) || 0;
      const remaining = comanda.totalValue - comanda.paidValue;
      
      // Session Progress
      const completedSessions = comanda.sessions?.filter(s => s.status === 'completed').length || 0;
      const totalSessions = comanda.sessions?.length || 0;
      const sessionProgress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      return (
          <div key={comanda.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => handleOpenModal(comanda)}>
              {/* Payment Progress Bar Background */}
              <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
                  <div className={`h-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all`} style={{ width: `${progress}%` }}></div>
              </div>

              <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                          {comanda.patientName.charAt(0)}
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{comanda.patientName}</h4>
                          <p className="text-xs text-slate-500">{comanda.description}</p>
                      </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(comanda); }} className="text-slate-400 hover:text-emerald-600 p-1">
                      <Send size={16} />
                  </button>
              </div>

              <div className="space-y-2 mb-3">
                  {/* Items Summary */}
                  {comanda.items.slice(0, 1).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-600">
                          <span>{item.quantity}x {item.serviceName}</span>
                          <span className="font-medium">{formatCurrency(item.total)}</span>
                      </div>
                  ))}
                  
                  {/* Session Tracker Mini */}
                  {totalSessions > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-50">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span>Sessões Realizadas</span>
                              <span className="font-bold">{completedSessions}/{totalSessions}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${sessionProgress}%` }}></div>
                          </div>
                      </div>
                  )}
              </div>

              <div className="flex justify-between items-end pt-2">
                  <div className="text-xs">
                      <p className="text-slate-400 mb-0.5">Restante</p>
                      <p className={`font-bold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {remaining > 0 ? formatCurrency(remaining) : 'Quitado'}
                      </p>
                  </div>
                  <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Total</p>
                      <p className="text-lg font-display font-bold text-slate-800">{formatCurrency(comanda.totalValue)}</p>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">A Receber</p>
                  <h3 className="text-3xl font-display font-bold">{formatCurrency(stats.totalOpen)}</h3>
                  <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-400" /> {stats.countOpen} comandas abertas
                  </p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recebido (Total)</p>
              <h3 className="text-3xl font-display font-bold text-emerald-600">{formatCurrency(stats.totalPaid)}</h3>
              <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" /> Caixa atualizado
              </p>
          </div>

          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => handleOpenModal()}>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <Plus size={24} />
              </div>
              <h3 className="font-bold text-lg">Novo Tratamento</h3>
              <p className="text-indigo-200 text-sm">Abrir pacote/comanda</p>
          </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewMode('kanban')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <LayoutGrid size={16} /> Kanban
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <ListIcon size={16} /> Lista
              </button>
          </div>

          <div className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar comanda, paciente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 shadow-sm"
              />
          </div>
      </div>

      {/* VIEW MODES */}
      {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
              {/* Coluna Aberta */}
              <div className="flex flex-col gap-4 min-w-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-blue-200">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><Clock size={18} className="text-blue-500" /> Em Aberto</h3>
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{kanbanColumns.aberta.length}</span>
                  </div>
                  <div className="space-y-3">
                      {kanbanColumns.aberta.map(c => renderKanbanCard(c))}
                  </div>
              </div>

              {/* Coluna Parcial */}
              <div className="flex flex-col gap-4 min-w-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-amber-200">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><CreditCard size={18} className="text-amber-500" /> Pagamento Parcial</h3>
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{kanbanColumns.parcial.length}</span>
                  </div>
                  <div className="space-y-3">
                      {kanbanColumns.parcial.map(c => renderKanbanCard(c))}
                  </div>
              </div>

              {/* Coluna Finalizada */}
              <div className="flex flex-col gap-4 min-w-[300px]">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-200">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Finalizados</h3>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">{kanbanColumns.fechada.length}</span>
                  </div>
                  <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                      {kanbanColumns.fechada.map(c => renderKanbanCard(c))}
                  </div>
              </div>
          </div>
      ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Paciente</th>
                          <th className="px-6 py-4">Descrição</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Pago</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredComandas.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 font-bold text-slate-700">{c.patientName}</td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{c.description}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(c.totalValue)}</td>
                              <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(c.paidValue)}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.paidValue >= c.totalValue ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {c.paidValue >= c.totalValue ? 'Pago' : 'Pendente'}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenModal(c)} className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg"><Edit3 size={16} /></button>
                                  <button onClick={() => handleShareWhatsApp(c)} className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg"><Send size={16} /></button>
                                  <button onClick={() => handleDelete(c.id)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* --- MODAL PDV (Therapy Style) --- */}
      {isModalOpen && editingComanda && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
                  
                  {/* LEFT SIDE: BUILDER */}
                  <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50">
                      <div className="p-6 border-b border-slate-200 bg-white">
                          <h3 className="font-display font-bold text-xl text-slate-800 mb-4">{editingComanda.id ? 'Editar Contrato' : 'Novo Tratamento'}</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Paciente</label>
                                  <div className="relative">
                                      <select 
                                        className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 appearance-none"
                                        value={editingComanda.patientId || ''}
                                        onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}
                                      >
                                          <option value="">Selecione o paciente...</option>
                                          {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Descrição do Pacote</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    value={editingComanda.description || ''}
                                    onChange={e => setEditingComanda({...editingComanda, description: e.target.value})}
                                    placeholder="Ex: Terapia Cognitiva - 10 Sessões"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Modal Internal Tabs */}
                      <div className="flex bg-slate-100 p-1 mx-6 mt-4 rounded-xl border border-slate-200">
                          <button 
                            onClick={() => setActiveModalTab('items')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeModalTab === 'items' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                              <ShoppingBag size={16} /> Serviços
                          </button>
                          <button 
                            onClick={() => setActiveModalTab('sessions')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeModalTab === 'sessions' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                          >
                              <CalendarCheck size={16} /> Sessões
                          </button>
                      </div>

                      <div className="p-6 flex-1 overflow-y-auto">
                          
                          {/* TAB: ITEMS (SERVICES) */}
                          {activeModalTab === 'items' && (
                              <div className="space-y-6 animate-fadeIn">
                                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                      <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Plus size={18} className="text-indigo-600"/> Adicionar Serviço</h4>
                                      <div className="flex gap-2 mb-3">
                                          <div className="flex-1">
                                              <select 
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                                value={selectedServiceId}
                                                onChange={e => setSelectedServiceId(e.target.value)}
                                              >
                                                  <option value="">Selecione um serviço...</option>
                                                  {MOCK_SERVICES.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                              </select>
                                          </div>
                                          <input 
                                            type="number" 
                                            min="1" 
                                            placeholder="Qtd"
                                            className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center font-bold"
                                            value={selectedQty}
                                            onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                                          />
                                          <button 
                                            onClick={handleAddItem}
                                            disabled={!selectedServiceId}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors"
                                          >
                                              <ArrowRight size={20} />
                                          </button>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Início</label>
                                              <input 
                                                type="datetime-local" 
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                value={editingComanda.startDate?.slice(0, 16) || ''}
                                                onChange={e => setEditingComanda({...editingComanda, startDate: e.target.value})}
                                              />
                                          </div>
                                          <div>
                                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Frequência</label>
                                              <select 
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                value={editingComanda.frequency}
                                                onChange={e => setEditingComanda({...editingComanda, frequency: e.target.value as any})}
                                              >
                                                  <option value="semanal">Semanal</option>
                                                  <option value="quinzenal">Quinzenal</option>
                                                  <option value="mensal">Mensal</option>
                                                  <option value="unica">Única</option>
                                              </select>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="space-y-2">
                                      {editingComanda.items && editingComanda.items.length > 0 ? (
                                          editingComanda.items.map((item, idx) => (
                                              <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 group hover:border-indigo-200 transition-colors">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">
                                                          {item.quantity}x
                                                      </div>
                                                      <div>
                                                          <p className="font-bold text-slate-700 text-sm">{item.serviceName}</p>
                                                          <p className="text-[10px] text-slate-400">{formatCurrency(item.unitPrice)}/un</p>
                                                      </div>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                      <span className="font-bold text-slate-800">{formatCurrency(item.total)}</span>
                                                      <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                          <X size={16} />
                                                      </button>
                                                  </div>
                                              </div>
                                          ))
                                      ) : (
                                          <div className="text-center py-10 text-slate-400">
                                              <ShoppingBag size={48} className="mx-auto mb-2 opacity-20" />
                                              <p>Nenhum serviço adicionado</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}

                          {/* TAB: SESSIONS (TRACKER) */}
                          {activeModalTab === 'sessions' && (
                              <div className="space-y-4 animate-fadeIn">
                                  {(!editingComanda.sessions || editingComanda.sessions.length === 0) ? (
                                      <div className="text-center py-10 text-slate-400">
                                          <CalendarCheck size={48} className="mx-auto mb-2 opacity-20" />
                                          <p>Nenhuma sessão gerada.</p>
                                          <button 
                                            onClick={() => {
                                                const totalQty = editingComanda.items?.reduce((acc, i) => acc + i.quantity, 0) || 1;
                                                const newSessions = generateSessions(editingComanda.startDate!, totalQty, editingComanda.frequency!);
                                                setEditingComanda({...editingComanda, sessions: newSessions});
                                            }}
                                            className="mt-4 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100"
                                          >
                                              Gerar Sessões Agora
                                          </button>
                                      </div>
                                  ) : (
                                      <div className="relative pl-6 border-l-2 border-slate-200 ml-4 space-y-6">
                                          {editingComanda.sessions.map((session, idx) => (
                                              <div key={session.id} className="relative">
                                                  {/* Timeline Dot */}
                                                  <div 
                                                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-colors ${
                                                        session.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'
                                                    }`}
                                                  ></div>
                                                  
                                                  <div className="flex items-start justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                      <div>
                                                          <h5 className="font-bold text-slate-800 text-sm">Sessão #{session.number}</h5>
                                                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                              <Calendar size={12} /> {new Date(session.date).toLocaleDateString()} 
                                                              <Clock size={12} className="ml-2" /> {new Date(session.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                          </p>
                                                      </div>
                                                      <button 
                                                        onClick={() => toggleSessionStatus(session.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            session.status === 'completed' 
                                                                ? 'bg-emerald-100 text-emerald-700' 
                                                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                                                        }`}
                                                      >
                                                          {session.status === 'completed' ? 'Realizada' : 'Marcar Realizada'}
                                                      </button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          )}

                      </div>
                  </div>

                  {/* RIGHT SIDE: CHECKOUT / RECEIPT */}
                  <div className="w-full md:w-[400px] bg-white flex flex-col h-full relative shadow-[0_0_40px_rgba(0,0,0,0.05)] z-10">
                      <div className="p-6 bg-slate-900 text-white">
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                          <div className="text-4xl font-display font-bold">{formatCurrency(editingComanda.totalValue || 0)}</div>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6">
                          
                          {/* Discount Section */}
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Descontos</label>
                              <div className="flex gap-2 mb-2">
                                  {[5, 10].map(pct => (
                                      <button 
                                        key={pct}
                                        onClick={() => recalculateTotals(editingComanda.items || [], 'percentage', pct)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${editingComanda.discountType === 'percentage' && editingComanda.discountValue === pct ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                      >
                                          {pct}%
                                      </button>
                                  ))}
                                  <button 
                                    onClick={() => recalculateTotals(editingComanda.items || [], 'fixed', 0)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${editingComanda.discountValue === 0 ? 'bg-slate-100 border-slate-200 text-slate-500' : 'border-slate-200 text-slate-600'}`}
                                  >
                                      Sem Desc.
                                  </button>
                              </div>
                              <div className="flex gap-2">
                                  <select 
                                    value={editingComanda.discountType} 
                                    onChange={e => recalculateTotals(editingComanda.items || [], e.target.value as any, editingComanda.discountValue)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 text-sm outline-none"
                                  >
                                      <option value="percentage">%</option>
                                      <option value="fixed">R$</option>
                                  </select>
                                  <input 
                                    type="number" 
                                    value={editingComanda.discountValue} 
                                    onChange={e => recalculateTotals(editingComanda.items || [], editingComanda.discountType, parseFloat(e.target.value) || 0)}
                                    className="flex-1 p-2 border border-slate-200 rounded-lg outline-none text-right font-bold text-slate-700" 
                                  />
                              </div>
                          </div>

                          <div className="h-px bg-slate-100 my-4"></div>

                          {/* Payment Section */}
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pagamento Recebido</label>
                              <div className="relative mb-2">
                                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                                  <input 
                                    type="number" 
                                    value={editingComanda.paidValue} 
                                    onChange={e => setEditingComanda({...editingComanda, paidValue: parseFloat(e.target.value) || 0})}
                                    className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none font-bold text-emerald-700 text-lg focus:ring-2 focus:ring-emerald-200" 
                                  />
                              </div>
                              
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-500">Restante:</span>
                                  <span className={`font-bold ${(editingComanda.totalValue || 0) - (editingComanda.paidValue || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {formatCurrency(Math.max(0, (editingComanda.totalValue || 0) - (editingComanda.paidValue || 0)))}
                                  </span>
                              </div>
                          </div>

                          <div className="h-px bg-slate-100 my-4"></div>

                          {/* Summary */}
                          <div className="space-y-1 text-sm">
                              <div className="flex justify-between text-slate-500">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(editingComanda.subtotal || 0)}</span>
                              </div>
                              <div className="flex justify-between text-rose-500">
                                  <span>Descontos</span>
                                  <span>- {editingComanda.discountType === 'percentage' ? `${editingComanda.discountValue}%` : formatCurrency(editingComanda.discountValue || 0)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-800 text-lg pt-2">
                                  <span>Total</span>
                                  <span>{formatCurrency(editingComanda.totalValue || 0)}</span>
                              </div>
                          </div>

                      </div>

                      {/* Footer Buttons */}
                      <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                          <button 
                            onClick={handleSaveComanda}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                              <CheckCircle size={20} /> Salvar & Fechar
                          </button>
                          <button 
                            onClick={() => setIsModalOpen(false)}
                            className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                          >
                              Cancelar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
