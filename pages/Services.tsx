import React, { useState, useMemo } from 'react';
import { MOCK_SERVICES, MOCK_PACKAGES } from '../constants';
import { Service, ServicePackage, ServicePackageItem } from '../types';
import { 
  Briefcase, Search, Plus, Edit3, Trash2, Clock, DollarSign, Tag, 
  Package, Check, X, Layers, Percent, CreditCard, ChevronDown
} from 'lucide-react';
import { Button } from '../components/UI/Button';

// Formatting Helper
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Services: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [packages, setPackages] = useState<ServicePackage[]>(MOCK_PACKAGES);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);

  // --- FILTERS ---
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- HANDLERS FOR SERVICES ---
  const handleOpenServiceModal = (service?: Service) => {
    setEditingService(service || { 
      duration: 50, 
      color: '#6366f1', 
      modality: 'presencial',
      category: 'Geral',
      price: 0,
      cost: 0
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = () => {
    if (!editingService?.name || !editingService.price) return alert('Preencha nome e preço');
    
    if (editingService.id) {
      setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...editingService } as Service : s));
    } else {
      setServices(prev => [...prev, { ...editingService, id: Math.random().toString(36).substr(2, 9) } as Service]);
    }
    setIsServiceModalOpen(false);
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Excluir este serviço?')) {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  };

  // --- HANDLERS FOR PACKAGES ---
  const handleOpenPackageModal = (pkg?: ServicePackage) => {
    setEditingPackage(pkg || { 
      items: [], 
      discountType: 'percentage', 
      discountValue: 0,
      totalPrice: 0
    });
    setIsPackageModalOpen(true);
  };

  const calculatePackageTotal = (items: ServicePackageItem[], discountType: 'percentage'|'fixed', discountValue: number) => {
    const subtotal = items.reduce((acc, item) => {
      const service = services.find(s => s.id === item.serviceId);
      return acc + (service ? service.price * item.quantity : 0);
    }, 0);

    let final = subtotal;
    if (discountType === 'percentage') {
      final = subtotal - (subtotal * (discountValue / 100));
    } else {
      final = subtotal - discountValue;
    }
    return Math.max(0, final);
  };

  const handlePackageItemChange = (items: ServicePackageItem[]) => {
    if (!editingPackage) return;
    const total = calculatePackageTotal(items, editingPackage.discountType || 'percentage', editingPackage.discountValue || 0);
    setEditingPackage({ ...editingPackage, items, totalPrice: total });
  };

  const handlePackageDiscountChange = (type: 'percentage'|'fixed', value: number) => {
    if (!editingPackage) return;
    const total = calculatePackageTotal(editingPackage.items || [], type, value);
    setEditingPackage({ ...editingPackage, discountType: type, discountValue: value, totalPrice: total });
  };

  const handleSavePackage = () => {
    if (!editingPackage?.name || !editingPackage.items?.length) return alert('Preencha o nome e adicione serviços');
    
    if (editingPackage.id) {
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? { ...p, ...editingPackage } as ServicePackage : p));
    } else {
      setPackages(prev => [...prev, { ...editingPackage, id: Math.random().toString(36).substr(2, 9) } as ServicePackage]);
    }
    setIsPackageModalOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    if (window.confirm('Excluir este pacote?')) {
      setPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Briefcase size={14} />
                    <span>Gestão Comercial</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Serviços e Pacotes</h1>
                <p className="text-indigo-100/70 text-lg leading-relaxed max-w-xl">
                    Configure os tipos de atendimentos, valores e crie pacotes promocionais para seus pacientes.
                </p>
            </div>
            
             <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <button 
                    onClick={() => setActiveTab('services')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Briefcase size={18} /> Serviços
                </button>
                <button 
                    onClick={() => setActiveTab('packages')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'packages' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Package size={18} /> Pacotes
                </button>
            </div>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder={activeTab === 'services' ? "Buscar serviço..." : "Buscar pacote..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 shadow-sm"
                />
            </div>
            <button 
                onClick={() => activeTab === 'services' ? handleOpenServiceModal() : handleOpenPackageModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
            >
                <Plus size={20} />
                <span className="hidden md:inline">{activeTab === 'services' ? 'Novo Serviço' : 'Novo Pacote'}</span>
            </button>
        </div>
      </div>

      {/* --- CONTENT --- */}
      {activeTab === 'services' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map(service => (
                  <div key={service.id} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                      
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-12 rounded-full" style={{ backgroundColor: service.color }}></div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{service.category}</span>
                                        <h3 className="font-bold text-lg text-slate-800">{service.name}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={() => handleOpenServiceModal(service)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                                     <button onClick={() => handleDeleteService(service.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Clock size={12} /> Duração</div>
                                  <div className="font-bold text-slate-700">{service.duration} min</div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><DollarSign size={12} /> Preço</div>
                                  <div className="font-bold text-emerald-600">{formatCurrency(service.price)}</div>
                              </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                             <span className="flex items-center gap-1"><CreditCard size={12} /> Custo: {formatCurrency(service.cost)}</span>
                             <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${service.modality === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{service.modality}</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPackages.map(pkg => (
                  <div key={pkg.id} className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg transition-all flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                   <Package size={24} />
                               </div>
                               <div>
                                   <h3 className="font-bold text-xl text-slate-800">{pkg.name}</h3>
                                   <p className="text-sm text-slate-500">{pkg.items.reduce((acc, i) => acc + i.quantity, 0)} sessões inclusas</p>
                               </div>
                           </div>
                           <div className="flex gap-2">
                                <button onClick={() => handleOpenPackageModal(pkg)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                                <button onClick={() => handleDeletePackage(pkg.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                           </div>
                      </div>

                      <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 space-y-2">
                          {pkg.items.slice(0, 3).map((item, idx) => {
                              const s = services.find(serv => serv.id === item.serviceId);
                              return (
                                  <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-slate-600">{item.quantity}x {s?.name}</span>
                                      <span className="font-medium text-slate-400">{s ? formatCurrency(s.price * item.quantity) : '-'}</span>
                                  </div>
                              );
                          })}
                          {pkg.items.length > 3 && <p className="text-xs text-slate-400 pt-1">+ {pkg.items.length - 3} itens...</p>}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Tag size={16} className="text-amber-500" />
                              <span>
                                {pkg.discountType === 'percentage' ? `${pkg.discountValue}% OFF` : `-${formatCurrency(pkg.discountValue)} OFF`}
                              </span>
                          </div>
                          <div className="text-right">
                              <div className="text-2xl font-display font-bold text-indigo-700">{formatCurrency(pkg.totalPrice)}</div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- SERVICE MODAL --- */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                    <button onClick={() => setIsServiceModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Serviço</label>
                        <input 
                            type="text" 
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" 
                            placeholder="Ex: Terapia de Casal"
                            value={editingService.name || ''}
                            onChange={e => setEditingService({...editingService, name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
                            <input 
                                type="text"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700"
                                placeholder="Geral"
                                value={editingService.category || ''}
                                onChange={e => setEditingService({...editingService, category: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duração (min)</label>
                            <input 
                                type="number" step="5" min="0" max="720"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700"
                                value={editingService.duration || 0}
                                onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preço (R$)</label>
                            <input 
                                type="number"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700"
                                value={editingService.price || 0}
                                onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custo (R$)</label>
                            <input 
                                type="number"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700"
                                value={editingService.cost || 0}
                                onChange={e => setEditingService({...editingService, cost: parseFloat(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor na Agenda</label>
                        <div className="flex gap-2">
                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setEditingService({...editingService, color: c})}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${editingService.color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modalidade</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" name="modality" value="presencial"
                                    checked={editingService.modality === 'presencial'}
                                    onChange={() => setEditingService({...editingService, modality: 'presencial'})}
                                    className="accent-indigo-600 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-slate-700">Presencial</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" name="modality" value="online"
                                    checked={editingService.modality === 'online'}
                                    onChange={() => setEditingService({...editingService, modality: 'online'})}
                                    className="accent-indigo-600 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-slate-700">Online</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
                        <textarea 
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 resize-none h-24"
                            value={editingService.description || ''}
                            onChange={e => setEditingService({...editingService, description: e.target.value})}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsServiceModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
                    <button onClick={handleSaveService} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg">Salvar</button>
                </div>
            </div>
        </div>
      )}

      {/* --- PACKAGE MODAL --- */}
      {isPackageModalOpen && editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">{editingPackage.id ? 'Editar Pacote' : 'Novo Pacote'}</h3>
                    <button onClick={() => setIsPackageModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Pacote</label>
                             <input 
                                type="text" 
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" 
                                placeholder="Ex: Pacote Semestral"
                                value={editingPackage.name || ''}
                                onChange={e => setEditingPackage({...editingPackage, name: e.target.value})}
                            />
                        </div>
                         <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
                             <input 
                                type="text" 
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" 
                                value={editingPackage.description || ''}
                                onChange={e => setEditingPackage({...editingPackage, description: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    {/* Items Builder */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700">Itens do Pacote</h4>
                            <div className="relative group">
                                <button className="text-xs font-bold text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-50">
                                    <Plus size={14} /> Adicionar Serviço
                                </button>
                                {/* Simple Dropdown for adding services */}
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-focus-within:block z-10 max-h-48 overflow-y-auto">
                                    {services.map(s => (
                                        <button 
                                            key={s.id}
                                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-600 truncate"
                                            onClick={() => {
                                                const newItems = [...(editingPackage.items || [])];
                                                const existing = newItems.find(i => i.serviceId === s.id);
                                                if(existing) existing.quantity += 1;
                                                else newItems.push({ serviceId: s.id, quantity: 1 });
                                                handlePackageItemChange(newItems);
                                            }}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {editingPackage.items?.length === 0 && <p className="text-center text-sm text-slate-400 py-4">Nenhum serviço adicionado</p>}
                            {editingPackage.items?.map((item, idx) => {
                                const s = services.find(serv => serv.id === item.serviceId);
                                return (
                                    <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                                        <div className="flex-1 text-sm font-medium text-slate-700 truncate">{s?.name}</div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" min="1" 
                                                className="w-12 p-1 text-center border rounded bg-slate-50 text-sm"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...(editingPackage.items || [])];
                                                    newItems[idx].quantity = parseInt(e.target.value) || 1;
                                                    handlePackageItemChange(newItems);
                                                }}
                                            />
                                            <div className="text-xs text-slate-400 w-16 text-right">
                                                {s ? formatCurrency(s.price * item.quantity) : '-'}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const newItems = editingPackage.items!.filter((_, i) => i !== idx);
                                                    handlePackageItemChange(newItems);
                                                }}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Discount & Totals */}
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desconto</label>
                            <div className="flex gap-2">
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => handlePackageDiscountChange('percentage', editingPackage.discountValue || 0)}
                                        className={`p-2 rounded-md ${editingPackage.discountType === 'percentage' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >
                                        <Percent size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handlePackageDiscountChange('fixed', editingPackage.discountValue || 0)}
                                        className={`p-2 rounded-md ${editingPackage.discountType === 'fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                    >
                                        <DollarSign size={16} />
                                    </button>
                                </div>
                                <input 
                                    type="number" 
                                    className="flex-1 p-2 border border-slate-200 rounded-lg outline-none"
                                    value={editingPackage.discountValue || 0}
                                    onChange={(e) => handlePackageDiscountChange(editingPackage.discountType || 'percentage', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="text-right p-4 bg-indigo-50 rounded-xl w-full md:w-auto min-w-[200px]">
                            <div className="text-xs font-bold text-indigo-400 uppercase">Valor Final</div>
                            <div className="text-2xl font-display font-bold text-indigo-700">{formatCurrency(editingPackage.totalPrice || 0)}</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsPackageModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
                    <button onClick={handleSavePackage} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg">Salvar Pacote</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};