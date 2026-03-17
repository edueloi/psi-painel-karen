import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_SERVICES, MOCK_PACKAGES } from '../constants';
import { Service, ServicePackage, ServicePackageItem } from '../types';
import { 
  Briefcase, Search, Plus, Edit3, Trash2, Clock, DollarSign, Tag, 
  Package, X, Percent, CreditCard, ChevronRight, Layers,
  LayoutGrid, Sparkles, Building2, ExternalLink, AlertCircle,
  CheckCircle2, ShoppingBag, List as ListIcon, Calendar, ArrowUpRight,
  Download, FileUp, FileDown
} from 'lucide-react';
import { api, API_BASE_URL } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Modal } from '../components/UI/Modal';
import { Input, Select, TextArea } from '../components/UI/Input';

const CurrencyInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
}> = ({ label, value, onChange, icon }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === 0 && !displayValue) return;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
    }).format(value);
    setDisplayValue(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    const num = parseInt(val || '0') / 100;
    setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num));
    onChange(num);
  };

  return (
    <Input
      label={label}
      value={displayValue}
      onChange={handleChange}
      icon={icon}
      placeholder="0,00"
    />
  );
};

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
  const [toasts, setToasts] = useState<{id: number, type: 'success' | 'error', message: string}[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

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
    avgPrice: services.length ? services.reduce((acc, s) => acc + (Number(s.price) || 0), 0) / services.length : 0
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
    if (!editingService?.name) return;
    
    try {
      const payload = {
        ...editingService,
        price: Number(editingService.price) || 0,
        cost: Number(editingService.cost) || 0,
        duration: Number(editingService.duration) || 50
      };

      if (editingService.id) {
        const updated = await api.put<Service>(`/services/${editingService.id}`, payload);
        setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const saved = await api.post<Service>('/services', payload);
        setServices(prev => [saved, ...prev]);
      }
      setIsServiceModalOpen(false);
      pushToast('success', 'Serviço salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      pushToast('error', 'Erro ao salvar serviço. Verifique os dados e tente novamente.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      if (deleteId.type === 'service') {
        await api.delete(`/services/${deleteId.id}`);
        setServices(prev => prev.filter(s => s.id !== deleteId.id));
      } else {
        await api.delete(`/packages/${deleteId.id}`);
        setPackages(prev => prev.filter(p => p.id !== deleteId.id));
      }
      setDeleteId(null);
      pushToast('success', 'Excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar:', err);
      pushToast('error', 'Erro ao excluir item.');
    }
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

  const handleSavePackage = async () => {
    if (!editingPackage?.name || !editingPackage.items?.length) return;
    try {
      const payload = {
        ...editingPackage,
        totalPrice: Number(editingPackage.totalPrice) || 0,
        discountValue: Number(editingPackage.discountValue) || 0
      };

      if (editingPackage.id) {
        const updated = await api.put<ServicePackage>(`/packages/${editingPackage.id}`, payload);
        setPackages(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const saved = await api.post<ServicePackage>('/packages', payload);
        setPackages(prev => [saved, ...prev]);
      }
      setIsPackageModalOpen(false);
      pushToast('success', 'Pacote salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar pacote:', err);
      pushToast('error', 'Erro ao salvar pacote. Verifique os dados e tente novamente.');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/export-template`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_importacao_servicos.xlsx';
      a.click();
    } catch (err) {
      console.error('Erro ao baixar modelo:', err);
      pushToast('error', 'Erro ao baixar modelo.');
    }
  };

  const handleExportServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'servicos_exportados.xlsx';
      a.click();
    } catch (err) {
      console.error('Erro ao exportar serviços:', err);
      pushToast('error', 'Erro ao exportar serviços.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api.request<any>('/services/import', { method: 'POST', body: formData });
      pushToast('success', result.message);
      if (result.errors && result.errors.length > 0) {
        console.warn('Erros na importação:', result.errors);
        pushToast('error', 'Algumas linhas tiveram erros. Verifique o console.');
      }
      // Re-fetch data
      const srvs = await api.get<Service[]>('/services');
      setServices(srvs || []);
    } catch (err) {
      console.error('Erro ao importar:', err);
      pushToast('error', 'Erro ao importar serviços.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toasts.length > 0 && (
        <div className="fixed right-6 top-6 z-[60] space-y-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                <Briefcase size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{t('services.title')}</h1>
                <p className="text-xs text-slate-500 mt-0.5">{t('services.management')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportTemplate}
                title="Baixar Modelo de Importação"
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download size={14} /> <span className="hidden sm:inline">Modelo</span>
              </button>
              <button
                onClick={handleExportServices}
                title="Exportar Serviços"
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FileDown size={14} /> <span className="hidden sm:inline">Exportar</span>
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                <FileUp size={14} /> <span className="hidden sm:inline">Importar</span>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} />
              </label>
              <button
                onClick={() => activeTab === 'services' ? handleOpenServiceModal() : handleOpenPackageModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
              >
                <Plus size={14} /> {activeTab === 'services' ? t('services.newService') : t('services.newPackage')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">


      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Briefcase size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviços</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalServices}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Package size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Pacotes</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalPackages}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <DollarSign size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Valor Médio</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.avgPrice)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & TABS BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center z-40">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder={t('services.search')} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none">
                  <button 
                      onClick={() => setActiveTab('services')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                      {t('services.services')}
                  </button>
                  <button 
                      onClick={() => setActiveTab('packages')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'packages' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                      {t('services.packages')}
                  </button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'services' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map(service => (
                  <div key={service.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[3rem] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex justify-between items-start mb-5 relative z-10">
                          <div className="flex items-center gap-4">
                              <div className="h-10 w-1 bg-indigo-500 rounded-full" style={{ backgroundColor: service.color }}></div>
                              <div>
                                  <h4 className="font-black text-slate-800 text-[13px]">{service.name}</h4>
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{service.category}</p>
                              </div>
                          </div>
                          <div className="flex gap-1.5">
                              <button onClick={() => handleOpenServiceModal(service)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                              <button onClick={() => setDeleteId({id: service.id, type: 'service'})} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                          </div>
                      </div>
                      
                      <div className="mb-5 flex-1 relative z-10">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-1">
                                      <Clock size={12} className="text-indigo-400"/>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duração</span>
                                  </div>
                                  <p className="text-sm font-black text-slate-700">{service.duration} <span className="text-[10px] text-slate-400 uppercase">min</span></p>
                              </div>
                              <div className={`p-3 rounded-2xl border ${service.modality === 'online' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                  <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Meio</div>
                                  <p className="text-xs font-black uppercase tracking-tighter">{service.modality === 'online' ? t('agenda.online') : t('agenda.presential')}</p>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 relative z-10">
                          <div className="text-lg font-black text-indigo-600">
                              {formatCurrency(service.price)}
                          </div>
                          {service.cost > 0 && (
                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                Custo: <span className="text-slate-500 font-black">{formatCurrency(service.cost)}</span>
                            </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredPackages.map(pkg => (
                  <div key={pkg.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                      <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                  <Package size={22}/>
                              </div>
                              <div>
                                  <h4 className="font-black text-slate-800 text-[13px]">{pkg.name}</h4>
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{pkg.items?.length || 0} SERVIÇOS INCLUÍDOS</p>
                              </div>
                          </div>
                          <div className="flex gap-1.5">
                              <button onClick={() => handleOpenPackageModal(pkg)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                              <button onClick={() => setDeleteId({id: pkg.id, type: 'package'})} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                          </div>
                      </div>
                      
                      <div className="mb-6">
                          <div className="bg-slate-50/50 border border-slate-100/50 p-4 rounded-[2rem] space-y-2">
                              {pkg.items.slice(0, 3).map((item, idx) => {
                                  const s = services.find(srv => srv.id === item.serviceId);
                                  return (
                                      <div key={idx} className="flex justify-between text-xs font-bold text-slate-600">
                                          <span>{item.quantity}x {s?.name}</span>
                                          <span className="text-slate-300">{s ? formatCurrency(s.price * item.quantity) : '-'}</span>
                                      </div>
                                  );
                              })}
                              {pkg.items.length > 3 && (
                                <p className="text-[10px] text-slate-400 text-center font-black pt-1">+ {pkg.items.length - 3} OUTROS ITENS</p>
                              )}
                          </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div>
                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Tag size={10}/> Desconto Realizado
                            </div>
                            <div className="text-xl font-black text-slate-800">
                                {formatCurrency(pkg.totalPrice)}
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                            {pkg.discountType === 'percentage' ? `${pkg.discountValue}% OFF` : `-${formatCurrency(pkg.discountValue)}`}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL SERVIÇO */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingService?.id ? 'Editar Serviço' : 'Novo Serviço'}
        footer={
          <div className="flex gap-4 w-full justify-end">
            <button onClick={() => setIsServiceModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
            <button onClick={handleSaveService} className="px-10 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                <CheckCircle2 size={18}/> SALVAR SERVIÇO
            </button>
          </div>
        }
      >
        {editingService && (
          <div className="space-y-5">
            <Input 
              label="Nome do Atendimento"
              value={editingService.name || ''}
              onChange={e => setEditingService({...editingService, name: e.target.value})}
              placeholder="Ex: Psicoterapia Individual"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Categoria"
                value={editingService.category || ''}
                onChange={e => setEditingService({...editingService, category: e.target.value})}
              />
              <Input 
                label="Duração (min)"
                type="number"
                value={editingService.duration || 0}
                onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value)})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CurrencyInput 
                label="Valor Venda"
                icon={<DollarSign size={16}/>}
                value={editingService.price || 0}
                onChange={val => setEditingService({...editingService, price: val})}
              />
              <CurrencyInput 
                label="Custo Prof."
                icon={<DollarSign size={16}/>}
                value={editingService.cost || 0}
                onChange={val => setEditingService({...editingService, cost: val})}
              />
            </div>

            <Select 
              label="Modalidade"
              value={editingService.modality || 'presencial'}
              onChange={e => setEditingService({...editingService, modality: e.target.value as any})}
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="geral">Geral (Ambos)</option>
            </Select>

            <TextArea 
              label="Observações / Descrição"
              value={editingService.description || ''}
              onChange={e => setEditingService({...editingService, description: e.target.value})}
              placeholder="Detalhes adicionais sobre o serviço..."
            />
          </div>
        )}
      </Modal>

      {/* MODAL PACOTE */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title="Estruturar Pacote"
        maxWidth="max-w-3xl"
        footer={
          <div className="flex gap-4 w-full justify-end">
            <button onClick={() => setIsPackageModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
            <button onClick={handleSavePackage} className="px-10 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                <CheckCircle2 size={18}/> FINALIZAR E SALVAR
            </button>
          </div>
        }
      >
        {editingPackage && (
          <div className="space-y-6">
            <Input 
              label="Título do Pacote"
              value={editingPackage.name || ''}
              onChange={e => setEditingPackage({...editingPackage, name: e.target.value})}
              placeholder="Ex: Terapia Mensal Intensiva"
            />

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={14}/> Serviços Incluídos
                    </h4>
                    <div className="relative group">
                      <button className="h-8 px-3 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5 text-[9px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest">
                          <Plus size={14}/> ADICIONAR
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 hidden group-focus-within:block z-50 p-2 animate-fadeIn max-h-48 overflow-y-auto">
                          {services.map(s => (
                              <button key={s.id} className="w-full text-left p-3 hover:bg-slate-50 text-[11px] font-bold text-slate-600 rounded-xl mb-1 flex items-center gap-2" onClick={() => {const newItems = [...(editingPackage.items || [])]; const existing = newItems.find(i => i.serviceId === s.id); if(existing) existing.quantity += 1; else newItems.push({ serviceId: s.id, quantity: 1 }); handlePackageItemChange(newItems);}}>
                                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                                  {s.name}
                              </button>
                          ))}
                      </div>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {(!editingPackage.items || editingPackage.items.length === 0) ? (
                        <div className="text-center py-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum serviço selecionado</div>
                    ) : (
                        editingPackage.items.map((item, idx) => {
                            const s = services.find(srv => srv.id === item.serviceId);
                            return (
                                <div key={idx} className="flex gap-3 items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex-1 text-[11px] font-black text-slate-700 truncate">{s?.name}</div>
                                    <div className="flex items-center gap-3">
                                        <input type="number" min="1" className="w-8 bg-slate-50 rounded-lg py-1 font-black text-slate-700 text-[10px] text-center outline-none" value={item.quantity} onChange={(e) => {const newItems = [...(editingPackage.items || [])]; newItems[idx].quantity = parseInt(e.target.value) || 1; handlePackageItemChange(newItems);}} />
                                        <span className="text-[10px] font-black text-indigo-600 w-16 text-right">{s ? formatCurrency(s.price * item.quantity) : '-'}</span>
                                        <button onClick={() => {const newItems = editingPackage.items!.filter((_, i) => i !== idx); handlePackageItemChange(newItems);}} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Configurar Desconto</label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button onClick={() => handlePackageDiscountChange('percentage', editingPackage.discountValue || 0)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${editingPackage.discountType === 'percentage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>%</button>
                      <button onClick={() => handlePackageDiscountChange('fixed', editingPackage.discountValue || 0)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${editingPackage.discountType === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>$</button>
                      
                      {editingPackage.discountType === 'percentage' ? (
                        <div className="flex items-center px-2">
                           <input 
                            type="number" 
                            className="w-12 bg-transparent border-0 font-black text-indigo-700 text-center text-sm outline-none" 
                            value={editingPackage.discountValue || 0} 
                            onChange={(e) => handlePackageDiscountChange('percentage', parseFloat(e.target.value) || 0)} 
                          />
                          <span className="text-indigo-600 font-bold text-xs">%</span>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <CurrencyInput
                            label=""
                            value={editingPackage.discountValue || 0}
                            onChange={val => handlePackageDiscountChange('fixed', val)}
                          />
                        </div>
                      )}
                  </div>
              </div>
              <div className="bg-slate-900 rounded-[1.5rem] p-4 text-white text-right">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Preço Final</p>
                  <p className="text-xl font-black">{formatCurrency(editingPackage.totalPrice || 0)}</p>
              </div>
            </div>

            <TextArea 
              label="Observações do Pacote"
              value={editingPackage.description || ''}
              onChange={e => setEditingPackage({...editingPackage, description: e.target.value})}
              placeholder="Detalhes sobre o pacote promocional..."
            />
          </div>
        )}
      </Modal>

      {/* CONFIRMA DELEÇÃO */}
      {deleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Remover item?</h3>
              <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
                Você está prestes a excluir este {deleteId.type === 'service' ? 'serviço' : 'pacote'}. Agendamentos passados não serão alterados.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteId(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   CANCELAR
                 </button>
              </div>
           </div>
        </div>
      )}
      </div>
    </div>
  );
};