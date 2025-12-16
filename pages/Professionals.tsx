
import React, { useState } from 'react';
import { MOCK_PROFESSIONALS } from '../constants';
import { Professional, UserRole } from '../types';
import { 
  UserCheck, Search, Plus, Filter, Edit3, Trash2, Shield, Calendar, 
  Briefcase, Percent, CheckCircle, X, DollarSign, Wallet, Users, Lock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Professionals: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'team' | 'commissions'>('team');
  const [professionals, setProfessionals] = useState<Professional[]>(MOCK_PROFESSIONALS);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Partial<Professional>>({});
  
  // Limite do Plano (Mockado como 5 para este exemplo)
  const PLAN_LIMIT = 5;
  const licensesUsed = professionals.length;
  const licensesAvailable = PLAN_LIMIT - licensesUsed;

  const filteredProfessionals = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profession.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (pro?: Professional) => {
    // Bloqueia se atingiu o limite E não é uma edição
    if (licensesUsed >= PLAN_LIMIT && !pro) {
        alert(t('professionals.limitError'));
        return;
    }

    if (pro) {
      setEditingProfessional({ ...pro });
    } else {
      setEditingProfessional({
        role: UserRole.PSYCHOLOGIST,
        hasAgenda: true,
        active: true,
        commissionRate: 50,
        isThirdParty: false,
        color: '#6366f1'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingProfessional.name || !editingProfessional.email) {
      alert(t('professionals.fillError'));
      return;
    }

    const finalData = {
        ...editingProfessional,
        id: editingProfessional.id || Math.random().toString(36).substr(2, 9),
    } as Professional;

    if (editingProfessional.id) {
        setProfessionals(prev => prev.map(p => p.id === finalData.id ? finalData : p));
    } else {
        setProfessionals(prev => [...prev, finalData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm(t('common.delete') + "?")) {
          setProfessionals(prev => prev.filter(p => p.id !== id));
      }
  };

  const calculateCommissions = () => {
      return professionals.map(p => {
          const production = p.active ? Math.floor(Math.random() * 10000) + 2000 : 0;
          const commissionValue = (production * p.commissionRate) / 100;
          return { ...p, production, commissionValue };
      });
  };

  const commissionData = calculateCommissions();

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Header Visual */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <UserCheck size={14} />
                    <span>{t('professionals.management')}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('professionals.title')}</h1>
                <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">{t('professionals.subtitle')}</p>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <button onClick={() => setActiveTab('team')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Briefcase size={18} /> {t('professionals.team')}
                </button>
                <button onClick={() => setActiveTab('commissions')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Percent size={18} /> {t('professionals.commissions')}
                </button>
            </div>
        </div>
      </div>

      {activeTab === 'team' && (
          <div className="animate-fadeIn space-y-6">
              
              {/* Toolbar & License Status */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-20">
                  <div className="relative flex-1 max-w-md group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" placeholder={t('professionals.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 shadow-sm" />
                  </div>
                  
                  <div className="flex items-center gap-4 w-full lg:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      <div className="px-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                              <Users size={12} /> Licenças: {licensesUsed} / {PLAN_LIMIT}
                          </div>
                          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${licensesUsed >= PLAN_LIMIT ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${(licensesUsed / PLAN_LIMIT) * 100}%` }}
                              ></div>
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => handleOpenModal()} 
                        disabled={licensesUsed >= PLAN_LIMIT} 
                        className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                          <Plus size={18} /> {t('professionals.new')}
                      </button>
                  </div>
              </div>

              {/* Grid de Profissionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProfessionals.map(pro => (
                      <div key={pro.id} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: pro.color }}></div>
                          
                          <div className="flex justify-between items-start mb-4 mt-2">
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 uppercase border-2 border-white shadow-sm">
                                      {pro.avatarUrl ? <img src={pro.avatarUrl} className="w-full h-full rounded-full object-cover" /> : pro.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-slate-800 leading-tight">{pro.name}</h3>
                                      <p className="text-xs text-slate-500 font-medium">{pro.profession}</p>
                                  </div>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${pro.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{pro.active ? t('common.active') : t('common.inactive')}</span>
                          </div>
                          
                          <div className="space-y-3 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500 flex items-center gap-2"><Shield size={14} /> Permissão</span>
                                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${pro.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                                      {pro.role === UserRole.ADMIN ? 'Administrador' : pro.role === UserRole.SECRETARY ? 'Secretária' : 'Psicólogo'}
                                  </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> {t('nav.agenda')}</span>
                                  <span className={`font-bold ${pro.hasAgenda ? 'text-emerald-600' : 'text-slate-400'}`}>{pro.hasAgenda ? t('common.yes') : t('common.no')}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500 flex items-center gap-2"><Percent size={14} /> Comissão</span>
                                  <span className="font-bold text-indigo-600">{pro.commissionRate}%</span>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                              <button onClick={() => handleOpenModal(pro)} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                  <Edit3 size={14} /> {t('common.edit')}
                              </button>
                              <button onClick={() => handleDelete(pro.id)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Tab de Comissões (Inalterada para brevidade, mas mantida no contexto) */}
      {activeTab === 'commissions' && (
          <div className="animate-fadeIn space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={20} /></div>
                      <select className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"><option>Setembro 2023</option><option>Agosto 2023</option></select>
                  </div>
                  <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('professionals.totalPay')}</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(commissionData.reduce((acc, p) => acc + p.commissionValue, 0))}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                  {commissionData.filter(p => p.hasAgenda).map(pro => (
                      <div key={pro.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4 w-full md:w-auto">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 border-2 border-white shadow-sm">{pro.name.charAt(0)}</div>
                              <div><h3 className="font-bold text-lg text-slate-800">{pro.name}</h3><p className="text-xs text-slate-500 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded-md">{pro.profession}</p></div>
                          </div>
                          <div className="flex-1 grid grid-cols-3 gap-4 w-full md:w-auto text-center md:text-left">
                              <div><p className="text-xs text-slate-400 font-bold uppercase">{t('professionals.production')}</p><p className="font-bold text-slate-700">{formatCurrency(pro.production)}</p></div>
                              <div><p className="text-xs text-slate-400 font-bold uppercase">{t('professionals.rate')}</p><p className="font-bold text-indigo-600">{pro.commissionRate}%</p></div>
                              <div><p className="text-xs text-slate-400 font-bold uppercase">{t('professionals.commissions')}</p><p className="font-bold text-emerald-600 text-lg">{formatCurrency(pro.commissionValue)}</p></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- MODAL DE CADASTRO/EDIÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h3 className="text-xl font-display font-bold text-slate-800">{editingProfessional.id ? t('professionals.edit') : t('professionals.new')}</h3>
                        <p className="text-xs text-slate-500 mt-1">Configure os dados de acesso e permissões.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Dados Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.name')} <span className="text-red-500">*</span></label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" value={editingProfessional.name || ''} onChange={e => setEditingProfessional({...editingProfessional, name: e.target.value})} placeholder="Ex: Dr. João Silva" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.email')} (Login) <span className="text-red-500">*</span></label>
                            <input type="email" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" value={editingProfessional.email || ''} onChange={e => setEditingProfessional({...editingProfessional, email: e.target.value})} placeholder="joao@clinica.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.password')}</label>
                            <div className="relative">
                                <input type="text" className="w-full pl-10 p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" placeholder="Senha provisória" />
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.cpfCnpj')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100" value={editingProfessional.cpfCnpj || ''} onChange={e => setEditingProfessional({...editingProfessional, cpfCnpj: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.profession')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100" placeholder="Ex: Psicólogo" value={editingProfessional.profession || ''} onChange={e => setEditingProfessional({...editingProfessional, profession: e.target.value})} />
                        </div>
                    </div>

                    {/* Permissões e Acesso */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide"><Shield size={16} className="text-indigo-600" /> {t('professionals.permissions')}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.accessLevel')}</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all">
                                        <input 
                                            type="radio" 
                                            name="role"
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                                            checked={editingProfessional.role === UserRole.ADMIN} 
                                            onChange={() => setEditingProfessional({...editingProfessional, role: UserRole.ADMIN})} 
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">{t('professionals.role.admin')}</span>
                                            <span className="block text-[10px] text-slate-400">Acesso total ao sistema.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all">
                                        <input 
                                            type="radio" 
                                            name="role"
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                                            checked={editingProfessional.role === UserRole.PSYCHOLOGIST} 
                                            onChange={() => setEditingProfessional({...editingProfessional, role: UserRole.PSYCHOLOGIST})} 
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">{t('professionals.role.psychologist')}</span>
                                            <span className="block text-[10px] text-slate-400">Atende pacientes e agenda.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all">
                                        <input 
                                            type="radio" 
                                            name="role"
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                                            checked={editingProfessional.role === UserRole.SECRETARY} 
                                            onChange={() => setEditingProfessional({...editingProfessional, role: UserRole.SECRETARY})} 
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700">{t('professionals.role.secretary')}</span>
                                            <span className="block text-[10px] text-slate-400">Gerencia agenda e pacientes.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.color')}</label>
                                    <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit">
                                        {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#64748b'].map(c => (
                                            <button key={c} onClick={() => setEditingProfessional({...editingProfessional, color: c})} className={`w-8 h-8 rounded-full border-2 transition-all ${editingProfessional.color === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200">
                                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={editingProfessional.hasAgenda} onChange={e => setEditingProfessional({...editingProfessional, hasAgenda: e.target.checked})} />
                                        <span className="text-sm font-bold text-slate-700">{t('professionals.hasAgenda')}</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200">
                                        <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={editingProfessional.active} onChange={e => setEditingProfessional({...editingProfessional, active: e.target.checked})} />
                                        <span className="text-sm font-bold text-slate-700">{t('professionals.active')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financeiro */}
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide"><DollarSign size={16} /> {t('professionals.financial')}</h4>
                        <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">{t('professionals.rate')} (%)</label>
                                <div className="relative"><input type="number" className="w-full pl-4 pr-8 py-3 rounded-xl border border-indigo-200 outline-none font-bold text-indigo-700 bg-white" value={editingProfessional.commissionRate} onChange={e => setEditingProfessional({...editingProfessional, commissionRate: parseFloat(e.target.value)})} /><Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" /></div>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-3 p-3 w-full bg-white border border-indigo-200 rounded-xl cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={editingProfessional.isThirdParty} onChange={e => setEditingProfessional({...editingProfessional, isThirdParty: e.target.checked})} /><span className="text-sm font-bold text-indigo-700">{t('professionals.thirdParty')}</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center gap-2 transition-all hover:-translate-y-0.5"><CheckCircle size={18} /> {t('common.save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
