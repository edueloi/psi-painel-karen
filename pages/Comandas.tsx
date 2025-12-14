import React, { useState, useEffect } from 'react';
import { MOCK_COMANDAS, MOCK_SERVICES, MOCK_PACKAGES, MOCK_PATIENTS } from '../constants';
import { Comanda, ComandaStatus } from '../types';
import { 
  ShoppingBag, Search, Plus, Filter, Edit3, Trash2, Calendar, User, 
  Receipt, DollarSign, CheckCircle, Clock, Archive, X, ChevronDown, Package, Layers
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Comandas: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ComandaStatus>('aberta');
  const [comandas, setComandas] = useState<Comanda[]>(MOCK_COMANDAS);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);

  const filteredComandas = comandas.filter(c => {
      const matchesTab = c.status === activeTab;
      const matchesSearch = c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilters = true;
      if (activeTab === 'fechada') {
          const dateToCheck = new Date(c.endDate || c.createdAt);
          matchesFilters = dateToCheck.getMonth().toString() === filterMonth && 
                           dateToCheck.getFullYear().toString() === filterYear;
      }

      return matchesTab && matchesSearch && matchesFilters;
  });

  const handleDelete = (id: string) => {
      if (window.confirm(t('common.delete') + '?')) {
          setComandas(prev => prev.filter(c => c.id !== id));
      }
  };

  const handleOpenModal = (comanda?: Comanda) => {
      if (comanda) {
          setEditingComanda({ ...comanda });
      } else {
          setEditingComanda({
              status: 'aberta',
              type: 'servico',
              items: [],
              subtotal: 0,
              discountType: 'percentage',
              discountValue: 0,
              totalValue: 0,
              paidValue: 0,
              startDate: new Date().toISOString().split('T')[0],
              frequency: 'unica'
          });
      }
      setIsModalOpen(true);
  };

  const handleSaveComanda = () => {
      if (!editingComanda?.patientId || !editingComanda.description) {
          alert(t('comandas.fillError'));
          return;
      }

      const patient = MOCK_PATIENTS.find(p => p.id === editingComanda.patientId);
      const finalComanda = {
          ...editingComanda,
          patientName: patient?.name || 'Cliente',
          id: editingComanda.id || Math.random().toString(36).substr(2, 9),
          createdAt: editingComanda.createdAt || new Date().toISOString()
      } as Comanda;

      if (editingComanda.id) {
          setComandas(prev => prev.map(c => c.id === finalComanda.id ? finalComanda : c));
      } else {
          setComandas(prev => [...prev, finalComanda]);
      }
      setIsModalOpen(false);
  };

  useEffect(() => {
      if (!editingComanda) return;
      const sub = editingComanda.items?.reduce((acc, item) => acc + item.total, 0) || 0;
      let final = sub;
      if (editingComanda.discountType === 'percentage') {
          final = sub - (sub * ((editingComanda.discountValue || 0) / 100));
      } else {
          final = sub - (editingComanda.discountValue || 0);
      }
      if (sub !== editingComanda.subtotal || final !== editingComanda.totalValue) {
          setEditingComanda(prev => ({
              ...prev!,
              subtotal: sub,
              totalValue: Math.max(0, final)
          }));
      }
  }, [editingComanda?.items, editingComanda?.discountType, editingComanda?.discountValue]);

  const handleAddItem = (serviceId: string, qty: number) => {
      const service = MOCK_SERVICES.find(s => s.id === serviceId);
      if (!service || !editingComanda) return;

      const newItem = {
          id: Math.random().toString(36).substr(2, 5),
          serviceId: service.id,
          serviceName: service.name,
          quantity: qty,
          unitPrice: service.price,
          total: service.price * qty
      };

      setEditingComanda(prev => ({
          ...prev!,
          items: [...(prev?.items || []), newItem]
      }));
  };

  const handleSelectPackage = (packageId: string) => {
      const pkg = MOCK_PACKAGES.find(p => p.id === packageId);
      if (!pkg || !editingComanda) return;

      const newItems = pkg.items.map(pi => {
          const s = MOCK_SERVICES.find(serv => serv.id === pi.serviceId);
          return {
              id: Math.random().toString(36).substr(2, 5),
              serviceId: pi.serviceId,
              serviceName: s?.name || 'Serviço',
              quantity: pi.quantity,
              unitPrice: s?.price || 0,
              total: (s?.price || 0) * pi.quantity
          };
      });
      
      setEditingComanda(prev => ({
          ...prev!,
          items: newItems,
          description: pkg.name,
          discountType: pkg.discountType,
          discountValue: pkg.discountValue
      }));
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-emerald-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <ShoppingBag size={14} />
                    <span>{t('comandas.finance')}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('comandas.title')}</h1>
                <p className="text-emerald-100/70 text-lg leading-relaxed max-w-xl">{t('comandas.subtitle')}</p>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <button onClick={() => setActiveTab('aberta')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'aberta' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Clock size={18} /> {t('comandas.open')}
                </button>
                <button onClick={() => setActiveTab('fechada')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'fechada' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Archive size={18} /> {t('comandas.closed')}
                </button>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex flex-1 w-full gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-emerald-500 transition-colors" />
                    <input type="text" placeholder={t('comandas.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all text-slate-600 shadow-sm" />
                </div>
                <button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 whitespace-nowrap">
                    <Plus size={20} /> <span className="hidden md:inline">{t('comandas.new')}</span>
                </button>
            </div>
            {activeTab === 'fechada' && (
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full xl:w-auto">
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase border-r border-slate-100 flex items-center gap-2"><Filter size={14} /> {t('common.filters')}</div>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1">
                        {Array.from({length: 12}, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>))}
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1">
                        <option value="2023">2023</option><option value="2024">2024</option>
                    </select>
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredComandas.map(comanda => {
              const progress = Math.min((comanda.paidValue / comanda.totalValue) * 100, 100);
              const isFullyPaid = comanda.paidValue >= comanda.totalValue;
              return (
                  <div key={comanda.id} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${comanda.status === 'aberta' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                      <div className="pl-3 mb-4">
                          <div className="flex justify-between items-start mb-2">
                              <div><h3 className="font-bold text-lg text-slate-800 leading-tight">{comanda.description}</h3><div className="flex items-center gap-2 mt-1 text-sm text-slate-500"><User size={14} /> {comanda.patientName}</div></div>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${comanda.type === 'pacote' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>{comanda.type === 'pacote' ? t('comandas.package') : t('comandas.service')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(comanda.startDate).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Layers size={12} /> {comanda.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                          </div>
                      </div>
                      <div className="pl-3 mt-auto pt-4 border-t border-slate-50">
                          <div className="flex justify-between items-end mb-2">
                              <div><div className="text-[10px] uppercase font-bold text-slate-400">{t('comandas.paid')}</div><div className="text-sm font-bold text-emerald-600">{formatCurrency(comanda.paidValue)}</div></div>
                              <div className="text-right"><div className="text-[10px] uppercase font-bold text-slate-400">{t('comandas.total')}</div><div className="text-lg font-display font-bold text-slate-800">{formatCurrency(comanda.totalValue)}</div></div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isFullyPaid ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div></div>
                          <div className="flex gap-2">
                              <button onClick={() => handleOpenModal(comanda)} className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"><Edit3 size={14} /> {t('comandas.details')}</button>
                              <button onClick={() => handleDelete(comanda.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredComandas.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400"><Receipt size={48} className="mx-auto mb-4 opacity-30" /><p className="font-medium">{t('comandas.noResults')}</p></div>
          )}
      </div>

      {isModalOpen && editingComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-3xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h3 className="text-xl font-display font-bold text-slate-800">{editingComanda.id ? t('comandas.edit') : t('comandas.new')}</h3>
                        <p className="text-xs text-slate-500 mt-1">{t('comandas.config')}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('comandas.desc')}</label>
                             <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-emerald-100" placeholder="Ex: Tratamento..." value={editingComanda.description || ''} onChange={e => setEditingComanda({...editingComanda, description: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('comandas.patient')}</label>
                             <div className="relative">
                                <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none font-medium text-slate-700 appearance-none focus:ring-2 focus:ring-emerald-100" value={editingComanda.patientId || ''} onChange={e => setEditingComanda({...editingComanda, patientId: e.target.value})}>
                                    <option value="">{t('common.search')}</option>
                                    {MOCK_PATIENTS.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('comandas.type')}</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setEditingComanda({...editingComanda, type: 'servico', items: []})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${editingComanda.type === 'servico' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{t('comandas.service')}</button>
                                <button onClick={() => setEditingComanda({...editingComanda, type: 'pacote', items: []})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${editingComanda.type === 'pacote' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>{t('comandas.package')}</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            {editingComanda.type === 'servico' ? <Layers size={18} /> : <Package size={18} />}
                            {editingComanda.type === 'servico' ? t('comandas.addItems') : t('comandas.selectPackage')}
                        </h4>
                        {editingComanda.type === 'servico' ? (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <select id="service-select" className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none text-sm">
                                            <option value="">{t('comandas.selectService')}</option>
                                            {MOCK_SERVICES.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                    <input type="number" id="service-qty" defaultValue={1} min={1} className="w-20 p-3 rounded-xl border border-slate-200 text-center" />
                                    <button onClick={() => {
                                            const sel = document.getElementById('service-select') as HTMLSelectElement;
                                            const qty = document.getElementById('service-qty') as HTMLInputElement;
                                            if (sel.value) handleAddItem(sel.value, parseInt(qty.value));
                                        }} className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700"><Plus size={20} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                     <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">{t('comandas.frequency')}</label>
                                        <select value={editingComanda.frequency || 'unica'} onChange={e => setEditingComanda({...editingComanda, frequency: e.target.value as any})} className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm">
                                            <option value="unica">{t('comandas.freq.unique')}</option>
                                            <option value="semanal">{t('comandas.freq.weekly')}</option>
                                            <option value="quinzenal">{t('comandas.freq.biweekly')}</option>
                                            <option value="mensal">{t('comandas.freq.monthly')}</option>
                                        </select>
                                     </div>
                                     <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">{t('comandas.recurrenceDay')}</label>
                                        <select value={editingComanda.recurrenceDay || ''} onChange={e => setEditingComanda({...editingComanda, recurrenceDay: e.target.value})} className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-sm" disabled={editingComanda.frequency === 'unica'}>
                                            <option value="">{t('comandas.na')}</option>
                                            <option value="Segunda">{t('comandas.days.monday')}</option>
                                            <option value="Terça">{t('comandas.days.tuesday')}</option>
                                            <option value="Quarta">{t('comandas.days.wednesday')}</option>
                                            <option value="Quinta">{t('comandas.days.thursday')}</option>
                                            <option value="Sexta">{t('comandas.days.friday')}</option>
                                        </select>
                                     </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none" onChange={(e) => handleSelectPackage(e.target.value)}>
                                    <option value="">{t('comandas.selectPrePackage')}</option>
                                    {MOCK_PACKAGES.map(p => (<option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.totalPrice)}</option>))}
                                </select>
                            </div>
                        )}
                        <div className="mt-6 space-y-2">
                            {editingComanda.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex-1"><div className="text-sm font-bold text-slate-700">{item.serviceName}</div><div className="text-xs text-slate-400">{item.quantity}x {formatCurrency(item.unitPrice)}</div></div>
                                    <div className="flex items-center gap-4"><span className="font-bold text-slate-700">{formatCurrency(item.total)}</span><button onClick={() => {const newItems = editingComanda.items?.filter((_, i) => i !== idx); setEditingComanda({...editingComanda, items: newItems});}} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div>
                                </div>
                            ))}
                            {(!editingComanda.items || editingComanda.items.length === 0) && (<div className="text-center text-slate-400 text-sm py-2">{t('comandas.noItems')}</div>)}
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('comandas.discount')}</label>
                                     <div className="flex gap-2">
                                        <select value={editingComanda.discountType} onChange={e => setEditingComanda({...editingComanda, discountType: e.target.value as any})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"><option value="percentage">%</option><option value="fixed">R$</option></select>
                                        <input type="number" value={editingComanda.discountValue} onChange={e => setEditingComanda({...editingComanda, discountValue: parseFloat(e.target.value)})} className="flex-1 p-3 border border-slate-200 rounded-xl outline-none" />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('comandas.paid')}</label>
                                     <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="number" value={editingComanda.paidValue} onChange={e => setEditingComanda({...editingComanda, paidValue: parseFloat(e.target.value)})} className="w-full pl-10 pr-4 p-3 border border-slate-200 rounded-xl outline-none font-bold text-emerald-600" /></div>
                                 </div>
                             </div>
                             <div className="bg-slate-50 rounded-2xl p-6 flex flex-col justify-center space-y-2">
                                 <div className="flex justify-between text-sm text-slate-500"><span>{t('comandas.subtotal')}</span><span>{formatCurrency(editingComanda.subtotal || 0)}</span></div>
                                 <div className="flex justify-between text-sm text-red-400"><span>{t('comandas.discount')}</span><span>- {editingComanda.discountType === 'percentage' ? `${editingComanda.discountValue}%` : formatCurrency(editingComanda.discountValue || 0)}</span></div>
                                 <div className="border-t border-slate-200 my-2"></div>
                                 <div className="flex justify-between text-xl font-bold text-slate-800"><span>{t('comandas.total')}</span><span>{formatCurrency(editingComanda.totalValue || 0)}</span></div>
                                 <div className="flex justify-between text-sm font-bold text-emerald-600 pt-1"><span>{t('comandas.remaining')}</span><span>{formatCurrency(Math.max(0, (editingComanda.totalValue || 0) - (editingComanda.paidValue || 0)))}</span></div>
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={editingComanda.status === 'fechada'} onChange={e => setEditingComanda({...editingComanda, status: e.target.checked ? 'fechada' : 'aberta'})} className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="font-bold text-slate-700">{t('comandas.markClosed')}</span>
                        </label>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">{t('common.cancel')}</button>
                    <button onClick={handleSaveComanda} className="px-8 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg flex items-center gap-2"><CheckCircle size={18} /> {t('comandas.save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
