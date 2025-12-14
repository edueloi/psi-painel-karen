
import React, { useState } from 'react';
import { MOCK_PROFESSIONALS } from '../constants';
import { Professional, UserRole } from '../types';
import { 
  UserCheck, Search, Plus, Filter, Edit3, Trash2, Shield, Calendar, 
  Briefcase, Percent, CheckCircle, X, DollarSign, Wallet
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
  
  const filteredProfessionals = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profession.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (pro?: Professional) => {
    if (professionals.length >= 5 && !pro) {
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
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-20">
                  <div className="relative flex-1 max-w-md group w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" placeholder={t('professionals.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 shadow-sm" />
                  </div>
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{professionals.length} / 5 {t('professionals.licenses')}</div>
                      <button onClick={() => handleOpenModal()} disabled={professionals.length >= 5} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                          <Plus size={20} /> {t('professionals.new')}
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProfessionals.map(pro => (
                      <div key={pro.id} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: pro.color }}></div>
                          <div className="flex justify-between items-start mb-4 mt-2">
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 uppercase border-2 border-white shadow-sm">{pro.name.charAt(0)}</div>
                                  <div><h3 className="font-bold text-slate-800 leading-tight">{pro.name}</h3><p className="text-xs text-slate-500 font-medium">{pro.profession}</p></div>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${pro.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{pro.active ? t('common.active') : t('common.inactive')}</span>
                          </div>
                          <div className="space-y-3 mb-6">
                              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Shield size={14} /> {t('professionals.role')}</span><span className="font-bold text-slate-700">{t(`professionals.role.${pro.role.toLowerCase()}`)}</span></div>
                              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> {t('nav.agenda')}</span><span className={`font-bold ${pro.hasAgenda ? 'text-emerald-600' : 'text-slate-400'}`}>{pro.hasAgenda ? t('common.yes') : t('common.no')}</span></div>
                              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 flex items-center gap-2"><Percent size={14} /> {t('professionals.rate')}</span><span className="font-bold text-indigo-600">{pro.commissionRate}%</span></div>
                          </div>
                          <div className="flex gap-2 pt-4 border-t border-slate-50">
                              <button onClick={() => handleOpenModal(pro)} className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"><Edit3 size={14} /> {t('common.edit')}</button>
                              <button onClick={() => handleDelete(pro.id)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

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
                          <div className="w-full md:w-auto"><button className="w-full md:w-auto px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Wallet size={16} /> {t('comandas.details')}</button></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">{editingProfessional.id ? t('professionals.edit') : t('professionals.new')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.name')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100" value={editingProfessional.name || ''} onChange={e => setEditingProfessional({...editingProfessional, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.email')}</label>
                            <input type="email" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100" value={editingProfessional.email || ''} onChange={e => setEditingProfessional({...editingProfessional, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.password')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100" placeholder="******" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.cpfCnpj')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" value={editingProfessional.cpfCnpj || ''} onChange={e => setEditingProfessional({...editingProfessional, cpfCnpj: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.profession')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" placeholder="Ex: Psicólogo" value={editingProfessional.profession || ''} onChange={e => setEditingProfessional({...editingProfessional, profession: e.target.value})} />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2"><Shield size={18} /> {t('professionals.permissions')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.accessLevel')}</label>
                                <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none font-medium text-slate-700" value={editingProfessional.role} onChange={e => setEditingProfessional({...editingProfessional, role: e.target.value as UserRole})}>
                                    <option value={UserRole.PSYCHOLOGIST}>{t('professionals.role.psychologist')}</option>
                                    <option value={UserRole.ADMIN}>{t('professionals.role.admin')}</option>
                                    <option value={UserRole.SECRETARY}>{t('professionals.role.secretary')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('professionals.color')}</label>
                                <div className="flex gap-2">
                                    {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#64748b'].map(c => (
                                        <button key={c} onClick={() => setEditingProfessional({...editingProfessional, color: c})} className={`w-8 h-8 rounded-full border-2 transition-all ${editingProfessional.color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200">
                                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={editingProfessional.hasAgenda} onChange={e => setEditingProfessional({...editingProfessional, hasAgenda: e.target.checked})} />
                                <span className="text-sm font-bold text-slate-700">{t('professionals.hasAgenda')}</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-200">
                                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={editingProfessional.active} onChange={e => setEditingProfessional({...editingProfessional, active: e.target.checked})} />
                                <span className="text-sm font-bold text-slate-700">{t('professionals.active')}</span>
                            </label>
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-4"><DollarSign size={18} /> {t('professionals.financial')}</h4>
                        <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">{t('professionals.rate')} (%)</label>
                                <div className="relative"><input type="number" className="w-full pl-4 pr-8 py-3 rounded-xl border border-indigo-200 outline-none font-bold text-indigo-700" value={editingProfessional.commissionRate} onChange={e => setEditingProfessional({...editingProfessional, commissionRate: parseFloat(e.target.value)})} /><Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" /></div>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-3 p-3 w-full bg-white border border-indigo-200 rounded-xl cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={editingProfessional.isThirdParty} onChange={e => setEditingProfessional({...editingProfessional, isThirdParty: e.target.checked})} /><span className="text-sm font-bold text-indigo-700">{t('professionals.thirdParty')}</span></label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center gap-2"><CheckCircle size={18} /> {t('common.save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
