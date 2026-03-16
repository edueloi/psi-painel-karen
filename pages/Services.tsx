import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { MOCK_SERVICES, MOCK_PACKAGES } from '../constants';
import { Service, ServicePackage, ServicePackageItem } from '../types';
import { 
  Briefcase, Search, Plus, Edit3, Trash2, Clock, DollarSign, Tag, 
  Package, X, Percent, CreditCard, ChevronRight, Layers,
  LayoutGrid, Sparkles, Building2, ExternalLink, AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Services: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [packages, setPackages] = useState<ServicePackage[]>(MOCK_PACKAGES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);
  const [deleteId, setDeleteId] = useState<{id: string, type: 'service' | 'package'} | null>(null);

  // Carregar Dados
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [srvs, pkgs] = await Promise.allSettled([
          api.get<Service[]>('/services'),
          api.get<ServicePackage[]>('/packages')
        ]);

        if (srvs.status === 'fulfilled') setServices(srvs.value || MOCK_SERVICES);
        if (pkgs.status === 'fulfilled') setPackages(pkgs.value || MOCK_PACKAGES);
      } catch (e) {
        console.error('Erro ao buscar serviços/pacotes:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const filteredServices = useMemo(() => services.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [services, searchTerm]);

  const filteredPackages = useMemo(() => packages.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [packages, searchTerm]);

  const stats = useMemo(() => ({
    totalServices: services.length,
    totalPackages: packages.length,
    avgPrice: services.length ? services.reduce((acc, s) => acc + s.price, 0) / services.length : 0
  }), [services, packages]);

  const handleOpenServiceModal = (service?: Service) => {
    setEditingService(service || { 
      duration: 50, 
      color: '#6366f1', 
      modality: 'presencial',
      category: t('services.category.general'),
      price: 0,
      cost: 0
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!editingService?.name || !editingService.price) return;
    
    try {
      if (editingService.id) {
        // api.put...
        setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...editingService } as Service : s));
      } else {
        // api.post...
        setServices(prev => [...prev, { ...editingService, id: Math.random().toString(36).substr(2, 9) } as Service]);
      }
      setIsServiceModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    if (deleteId.type === 'service') {
      setServices(prev => prev.filter(s => s.id !== deleteId.id));
    } else {
      setPackages(prev => prev.filter(p => p.id !== deleteId.id));
    }
    setDeleteId(null);
  };

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
    if (!editingPackage?.name || !editingPackage.items?.length) return;
    
    if (editingPackage.id) {
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? { ...p, ...editingPackage } as ServicePackage : p));
    } else {
      setPackages(prev => [...prev, { ...editingPackage, id: Math.random().toString(36).substr(2, 9) } as ServicePackage]);
    }
    setIsPackageModalOpen(false);
  };

  const TabButton = ({ id, label, icon, active }: { id: any, label: string, icon: any, active: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap ${
        active 
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-y-[-2px]' 
        : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-slate-100'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      
      {/* Header & Hero */}
      <div className="relative overflow-hidden rounded-[3rem] p-8 md:p-12 bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
           <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>{t('services.management')}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-none">{t('services.title')}</h1>
              <p className="text-slate-400 text-sm md:text-base font-bold leading-relaxed max-w-lg">{t('services.subtitle')}</p>
              
              <div className="flex flex-wrap items-center gap-6 mt-8">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Serviços</span>
                    <span className="text-2xl font-black text-white">{stats.totalServices}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pacotes</span>
                    <span className="text-2xl font-black text-white">{stats.totalPackages}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Valor Médio</span>
                    <span className="text-2xl font-black text-white">{formatCurrency(stats.avgPrice)}</span>
                 </div>
              </div>
           </div>
           
           <div className="flex flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={() => activeTab === 'services' ? handleOpenServiceModal() : handleOpenPackageModal()} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                  {activeTab === 'services' ? t('services.newService') : t('services.newPackage')}
              </button>
           </div>
        </div>
      </div>

      {/* Tabs & Filters Area */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-center bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-40 backdrop-blur-md bg-white/90">
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto">
             <TabButton id="services" label={t('services.services')} icon={<Briefcase size={16}/>} active={activeTab === 'services'} />
             <TabButton id="packages" label={t('services.packages')} icon={<Package size={16}/>} active={activeTab === 'packages'} />
          </div>

          <div className="flex gap-4 w-full lg:w-auto lg:flex-1 lg:max-w-xl">
              <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input 
                      type="text" 
                      placeholder={t('services.search')} 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
                  />
              </div>
          </div>
      </div>

      {/* Main Grid Content */}
      <div className="w-full">
        {activeTab === 'services' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredServices.map(service => (
                    <div key={service.id} className="group bg-white rounded-[2.5rem] p-7 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-40 group-hover:scale-110 transition-transform"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-4 h-14 rounded-full shadow-sm" style={{ backgroundColor: service.color }}></div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{service.category}</span>
                                        <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{service.name}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 translate-y-[-4px]">
                                     <button onClick={() => handleOpenServiceModal(service)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={14} /></button>
                                     <button onClick={() => setDeleteId({id: service.id, type: 'service'})} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                                <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-3xl">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Clock size={12} className="text-indigo-400"/> Duração</span>
                                    <div className="font-black text-slate-700 text-sm">{service.duration} <span className="text-[10px] font-bold text-slate-400 uppercase">min</span></div>
                                </div>
                                <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-3xl">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2"><DollarSign size={12}/> Preço</span>
                                    <div className="font-black text-emerald-600 text-sm">{formatCurrency(service.price)}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                               <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <CreditCard size={14} className="text-slate-300"/>
                                  Custo: <span className="text-slate-600">{formatCurrency(service.cost || 0)}</span>
                               </div>
                               <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                 service.modality === 'online' 
                                 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                 : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                               }`}>
                                   {service.modality === 'online' ? t('agenda.online') : t('agenda.presential')}
                               </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredPackages.map(pkg => (
                    <div key={pkg.id} className="bg-white rounded-[3rem] p-8 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all flex flex-col group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start mb-8 relative z-10">
                             <div className="flex items-center gap-5">
                                 <div className="h-16 w-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-lg shadow-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:scale-105">
                                    <Package size={28} />
                                 </div>
                                 <div>
                                     <h3 className="font-black text-2xl text-slate-800 tracking-tight leading-tight">{pkg.name}</h3>
                                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">{pkg.items.reduce((acc, i) => acc + i.quantity, 0)} SESSÕES INCLUÍDAS</p>
                                 </div>
                             </div>
                             <div className="flex gap-2">
                                  <button onClick={() => handleOpenPackageModal(pkg)} className="p-3 bg-slate-50 hover:bg-indigo-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={16} /></button>
                                  <button onClick={() => setDeleteId({id: pkg.id, type: 'package'})} className="p-3 bg-slate-50 hover:bg-red-50 rounded-2xl text-slate-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                             </div>
                        </div>

                        <div className="flex-1 bg-slate-50/80 rounded-[2rem] p-6 mb-8 border border-slate-100 space-y-4 relative z-10">
                            {pkg.items.map((item, idx) => {
                                const s = services.find(serv => serv.id === item.serviceId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                           <span className="font-bold text-slate-700">{item.quantity}x {s?.name}</span>
                                        </div>
                                        <span className="font-black text-slate-400 tabular-nums">{s ? formatCurrency(s.price * item.quantity) : '-'}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                                   <Tag size={18} />
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desconto Aplicado</p>
                                   <p className="text-xs font-black text-amber-600 uppercase">
                                      {pkg.discountType === 'percentage' ? `${pkg.discountValue}% OFF` : `-${formatCurrency(pkg.discountValue)}`}
                                   </p>
                                </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Valor do Pacote</p>
                               <div className="text-3xl font-black text-indigo-700 tracking-tighter">{formatCurrency(pkg.totalPrice)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Modal de Serviço */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl animate-bounceIn overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                       <h3 className="text-xl font-black text-slate-800">{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Configurações Base</p>
                    </div>
                    <button onClick={() => setIsServiceModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all"><X size={20} /></button>
                </div>
                
                <div className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Nome do Serviço</label>
                        <input type="text" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all font-bold text-slate-700" value={editingService.name || ''} onChange={e => setEditingService({...editingService, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Categoria</label>
                            <input type="text" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-indigo-400 font-bold text-slate-700 transition-all" value={editingService.category || ''} onChange={e => setEditingService({...editingService, category: e.target.value})} />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Duração (min)</label>
                            <div className="relative">
                               <input type="number" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-indigo-400 font-bold text-slate-700 transition-all" value={editingService.duration || 0} onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})} />
                               <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Valor Cobrado</label>
                            <div className="relative">
                               <input type="number" className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-emerald-400 font-black text-emerald-600 transition-all text-lg" value={editingService.price || 0} onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})} />
                               <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">Custo Profissional</label>
                            <div className="relative">
                               <input type="number" className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-amber-400 font-black text-amber-600 transition-all text-lg" value={editingService.cost || 0} onChange={e => setEditingService({...editingService, cost: parseFloat(e.target.value)})} />
                               <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={20} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Cor Identificadora na Agenda</label>
                        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'].map(c => (
                                <button key={c} onClick={() => setEditingService({...editingService, color: c})} className={`w-10 h-10 rounded-2xl border-2 transition-all shadow-sm ${editingService.color === c ? 'border-indigo-600 scale-110 shadow-indigo-100' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Modalidade Atendimento</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                               onClick={() => setEditingService({...editingService, modality: 'presencial'})}
                               className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${editingService.modality === 'presencial' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'}`}
                            >
                                Presencial
                            </button>
                            <button 
                               onClick={() => setEditingService({...editingService, modality: 'online'})}
                               className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${editingService.modality === 'online' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white text-slate-400 border-slate-100'}`}
                            >
                                Online
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-4 px-10 pb-10">
                    <button onClick={() => setIsServiceModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
                    <button onClick={handleSaveService} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group transform active:scale-95">
                       <CheckCircle2 size={18} /> SALVAR SERVIÇO
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal de Pacote */}
      {isPackageModalOpen && editingPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl animate-bounceIn overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-8 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingPackage.id ? 'Refinar Pacote' : 'Estruturar Novo Pacote'}</h3>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Gestão de Combos e Descontos</p>
                    </div>
                    <button onClick={() => setIsPackageModalOpen(false)} className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all"><X size={20} /></button>
                </div>

                <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Título do Pacote</label>
                            <input type="text" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all font-black text-slate-700 text-lg" value={editingPackage.name || ''} placeholder="Ex: Pacote Terapia Mensal" onChange={e => setEditingPackage({...editingPackage, name: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-indigo-50/30 p-8 rounded-[2.5rem] border border-indigo-100/50">
                        <div className="flex justify-between items-center mb-6 px-1">
                            <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Layers size={16}/></div>
                               Serviços no Combo
                            </h4>
                            <div className="relative group">
                                <button className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-200 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                    <Plus size={16} /> ADICIONAR
                                </button>
                                <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-[2rem] shadow-2xl border border-slate-100 hidden group-focus-within:block z-50 p-3 max-h-60 overflow-y-auto animate-fadeIn">
                                    {services.map(s => (
                                        <button key={s.id} className="w-full text-left p-3.5 hover:bg-slate-50 text-[11px] font-black text-slate-600 rounded-xl mb-1 flex items-center gap-3 group transition-all" onClick={() => {const newItems = [...(editingPackage.items || [])]; const existing = newItems.find(i => i.serviceId === s.id); if(existing) existing.quantity += 1; else newItems.push({ serviceId: s.id, quantity: 1 }); handlePackageItemChange(newItems);}}>
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                                            {s.name}
                                            <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all text-indigo-400" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {editingPackage.items?.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-indigo-200/50 rounded-3xl bg-white/50">
                                   <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Nenhum serviço adicionado ainda</p>
                                </div>
                            ) : (
                                editingPackage.items?.map((item, idx) => {
                                    const s = services.find(serv => serv.id === item.serviceId);
                                    return (
                                        <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm animate-slideIn">
                                            <div className="w-4 h-10 rounded-full" style={{backgroundColor: s?.color}}></div>
                                            <div className="flex-1 text-[13px] font-black text-slate-700 truncate">{s?.name}</div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                                   <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Qtd:</span>
                                                   <input type="number" min="1" className="w-12 bg-white border-0 rounded-lg text-center font-black text-slate-700 text-sm focus:ring-0" value={item.quantity} onChange={(e) => {const newItems = [...(editingPackage.items || [])]; newItems[idx].quantity = parseInt(e.target.value) || 1; handlePackageItemChange(newItems);}} />
                                                </div>
                                                <div className="text-sm font-black text-indigo-600 w-24 text-right tabular-nums">{s ? formatCurrency(s.price * item.quantity) : '-'}</div>
                                                <button onClick={() => {const newItems = editingPackage.items!.filter((_, i) => i !== idx); handlePackageItemChange(newItems);}} className="p-2 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all border border-transparent"><X size={18} /></button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end p-2">
                        <div className="space-y-4">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Configurar Desconto</label>
                            <div className="flex gap-3 bg-slate-50 p-2.5 rounded-3xl border border-slate-100">
                                <div className="flex bg-white shadow-sm p-1 rounded-2xl border border-slate-100 flex-1">
                                    <button 
                                      onClick={() => handlePackageDiscountChange('percentage', editingPackage.discountValue || 0)} 
                                      className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black transition-all ${editingPackage.discountType === 'percentage' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                       <Percent size={14} /> PORCETAGEM
                                    </button>
                                    <button 
                                      onClick={() => handlePackageDiscountChange('fixed', editingPackage.discountValue || 0)} 
                                      className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black transition-all ${editingPackage.discountType === 'fixed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                       <DollarSign size={14} /> VALOR FIXO
                                    </button>
                                </div>
                                <input 
                                  type="number" 
                                  className="w-28 bg-white border-2 border-slate-100 rounded-2xl text-center font-black text-indigo-700 outline-none focus:border-indigo-400 transition-all text-xl p-2" 
                                  value={editingPackage.discountValue || 0} 
                                  placeholder="0"
                                  onChange={(e) => handlePackageDiscountChange(editingPackage.discountType || 'percentage', parseFloat(e.target.value) || 0)} 
                                />
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-[40px]"></div>
                            <div className="relative z-10 flex flex-col items-end">
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-2 leading-none">Venda o Pacote por:</span>
                                <div className="text-4xl font-black tabular-nums tracking-tighter">{formatCurrency(editingPackage.totalPrice || 0)}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 md:p-10 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-5 px-12 pb-12">
                    <button onClick={() => setIsPackageModalOpen(false)} className="px-8 py-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
                    <button onClick={handleSavePackage} className="px-14 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-[1.8rem] shadow-2xl shadow-indigo-200 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                        <CheckCircle2 size={24} /> FINALIZAR E SALVAR
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Deleção */}
      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fadeIn">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg shadow-red-50">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Remover item?</h3>
              <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">
                Você está prestes a excluir este {deleteId.type === 'service' ? 'serviço' : 'pacote'}. Agendamentos e históricos não serão alterados, mas o item não estará mais disponível para novos lançamentos.
              </p>
              <div className="flex flex-col gap-4">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.1em] shadow-xl shadow-red-100 transition-all transform active:scale-95"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteId(null)}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 text-[11px] font-black uppercase tracking-[0.1em] transition-all"
                 >
                   MANTER ITEM
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};