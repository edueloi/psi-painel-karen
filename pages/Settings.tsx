import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone, 
  Check, ChevronRight, Database, CreditCard, UserPlus, ShieldCheck, Mail,
  Zap, Save, AlertTriangle, ChevronDown, Clock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../translations';

export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('aparencia');
  const [selectedColor, setSelectedColor] = useState('Indigo');
  const { mode: selectedMode, setMode } = useTheme();
  
  // Mock States for Toggles
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true, marketing: false });
  const [integrations, setIntegrations] = useState({ calendar: true, drive: false, zoom: true });

  // Theme definition
  const THEME_COLORS = [
    { name: 'Indigo', hex: '#6366f1', label: t('theme.modern'), gradient: 'from-indigo-500 to-violet-600',
      vars: { 
        '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', 
        '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81' 
      } 
    },
    { name: 'Emerald', hex: '#10b981', label: t('theme.health'), gradient: 'from-emerald-400 to-teal-600',
      vars: {
        '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
        '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b'
      }
    },
    { name: 'Rose', hex: '#f43f5e', label: t('theme.cozy'), gradient: 'from-rose-400 to-pink-600',
      vars: {
        '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
        '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337'
      }
    },
    { name: 'Amber', hex: '#f59e0b', label: t('theme.energy'), gradient: 'from-amber-400 to-orange-600',
      vars: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f'
      }
    },
    { name: 'Blue', hex: '#3b82f6', label: t('theme.trust'), gradient: 'from-blue-400 to-cyan-600',
      vars: {
        '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
        '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a'
      }
    },
    { name: 'Violet', hex: '#8b5cf6', label: t('theme.creative'), gradient: 'from-violet-400 to-fuchsia-600',
      vars: {
        '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
        '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6', '900': '#4c1d95'
      }
    }
  ];

  const changeThemeColor = (colorName: string, vars: Record<string, string>) => {
    setSelectedColor(colorName);
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(`--c-${key}`, value);
    });
  };

  const MENU_ITEMS = [
    { id: 'aparencia', label: t('settings.menu.appearance'), icon: <Palette size={20} />, desc: t('settings.menu.appearance.desc') },
    { id: 'geral', label: t('settings.menu.general'), icon: <SettingsIcon size={20} />, desc: t('settings.menu.general.desc') },
    { id: 'notificacoes', label: t('settings.menu.notifications'), icon: <Bell size={20} />, desc: t('settings.menu.notifications.desc') },
    { id: 'assinatura', label: t('settings.menu.subscription'), icon: <CreditCard size={20} />, desc: t('settings.menu.subscription.desc') },
    { id: 'equipe', label: t('settings.menu.team'), icon: <UserPlus size={20} />, desc: t('settings.menu.team.desc') },
    { id: 'integracoes', label: t('settings.menu.integrations'), icon: <Database size={20} />, desc: t('settings.menu.integrations.desc') },
  ];

  // Helper Toggle Switch Component
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out] px-4 font-sans">
      
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">{t('settings.title')}</h1>
            <p className="text-slate-500 mt-2 text-lg max-w-2xl">{t('settings.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-sm">{t('settings.secure')}</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Modern Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
            {MENU_ITEMS.map(item => (
            <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden border ${
                activeTab === item.id 
                    ? 'bg-white border-indigo-100 shadow-lg shadow-indigo-100/50' 
                    : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-100 hover:shadow-md'
                }`}
            >
                {/* Active Indicator */}
                {activeTab === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
                )}
                
                <div className={`p-2.5 rounded-xl transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                    {item.icon}
                </div>
                <div>
                    <span className={`block font-bold text-sm ${activeTab === item.id ? 'text-indigo-900' : 'text-slate-600'}`}>{item.label}</span>
                    <span className="block text-[10px] opacity-70 font-medium text-slate-500">{item.desc}</span>
                </div>
                {activeTab === item.id && <ChevronRight size={16} className="ml-auto text-indigo-400" />}
            </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 lg:p-10 min-h-[600px] relative overflow-hidden">
          
          {/* APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <div className="space-y-10 animate-fadeIn max-w-3xl">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Palette size={24} /></div>
                        {t('settings.appearance.title')}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base leading-relaxed">{t('settings.appearance.subtitle')}</p>
                </div>
                
                {/* Theme Color Selector */}
                <section className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">
                        {t('settings.appearance.color')}
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {THEME_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => changeThemeColor(color.name, color.vars)}
                                className={`
                                    relative p-1 rounded-2xl transition-all duration-300 group
                                    ${selectedColor === color.name ? 'ring-4 ring-indigo-100 scale-[1.02]' : 'hover:scale-[1.02]'}
                                `}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient} rounded-2xl opacity-10`} />
                                <div className={`
                                    relative bg-white border h-full rounded-xl p-4 flex flex-col items-center gap-3
                                    ${selectedColor === color.name ? 'border-transparent shadow-md' : 'border-slate-200'}
                                `}>
                                    <div 
                                        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-gradient-to-br ${color.gradient}`}
                                    >
                                        {selectedColor === color.name && (
                                            <Check className="text-white drop-shadow-md animate-[scaleIn_0.2s_ease-out]" size={24} strokeWidth={3} />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className={`block text-sm font-bold ${selectedColor === color.name ? 'text-slate-900' : 'text-slate-600'}`}>{color.name}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{color.label}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Theme Mode */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">
                        {t('settings.appearance.mode')}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { id: 'light', label: t('settings.appearance.light'), icon: <Monitor size={24} />, bg: 'bg-white' },
                            { id: 'dark', label: t('settings.appearance.dark'), icon: <Moon size={24} />, bg: 'bg-slate-800 text-white' },
                            { id: 'auto', label: t('settings.appearance.auto'), icon: <Smartphone size={24} />, bg: 'bg-gradient-to-br from-slate-100 to-slate-300' }
                        ].map((mode) => (
                            <button 
                                key={mode.id}
                                onClick={() => setMode(mode.id as any)}
                                className={`
                                    relative group overflow-hidden rounded-2xl border-2 transition-all duration-300
                                    ${selectedMode === mode.id 
                                        ? 'border-indigo-600 shadow-lg shadow-indigo-100 scale-[1.02]' 
                                        : 'border-slate-100 hover:border-slate-300'}
                                `}
                            >
                                <div className="p-6 flex flex-col items-center gap-4 relative z-10">
                                    <div className={`p-4 rounded-full shadow-md transition-transform group-hover:scale-110 ${mode.bg} ${mode.id === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                                        {mode.icon}
                                    </div>
                                    <span className={`font-bold text-sm ${selectedMode === mode.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                                        {mode.label}
                                    </span>
                                </div>
                                {selectedMode === mode.id && (
                                    <div className="absolute top-3 right-3 text-indigo-600 bg-indigo-50 rounded-full p-1">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
          )}

          {/* GERAL */}
          {activeTab === 'geral' && (
             <div className="space-y-8 animate-fadeIn max-w-3xl">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><SettingsIcon size={24} /></div>
                        {t('settings.general.title')}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base">{t('settings.general.subtitle')}</p>
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('settings.general.language')}</label>
                            <div className="relative group">
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as Language)}
                                    className="w-full pl-11 pr-10 py-4 bg-white rounded-xl border border-slate-200 outline-none font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:border-indigo-300"
                                >
                                    <option value="pt">Português (Brasil)</option>
                                    <option value="en">English (US)</option>
                                    <option value="es">Español</option>
                                </select>
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('settings.general.timezone')}</label>
                            <div className="relative group">
                                <select className="w-full pl-11 pr-10 py-4 bg-white rounded-xl border border-slate-200 outline-none font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:border-indigo-300">
                                    <option>(GMT-03:00) Brasília - São Paulo</option>
                                    <option>(GMT-04:00) Manaus</option>
                                    <option>(GMT-00:00) UTC</option>
                                </select>
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                            </div>
                        </div>
                    </div>

                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('settings.general.currency')}</label>
                        <div className="relative group">
                            <select className="w-full pl-11 pr-10 py-4 bg-white rounded-xl border border-slate-200 outline-none font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm hover:border-indigo-300">
                                <option>BRL (R$) - Real Brasileiro</option>
                                <option>USD ($) - Dólar Americano</option>
                                <option>EUR (€) - Euro</option>
                            </select>
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95">
                        <Save size={18} /> {t('common.save')}
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} /> {t('settings.danger.zone')}
                    </h3>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-red-900">{t('settings.danger.delete')}</h4>
                            <p className="text-sm text-red-700/70 mt-1">{t('settings.danger.desc')}</p>
                        </div>
                        <button className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                            {t('settings.danger.endSub')}
                        </button>
                    </div>
                </div>
             </div>
          )}

          {/* NOTIFICAÇÕES */}
          {activeTab === 'notificacoes' && (
              <div className="space-y-8 animate-fadeIn max-w-3xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Bell size={24} /></div>
                        {t('settings.notifications.title')}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base">{t('settings.notifications.subtitle')}</p>
                  </div>

                  <div className="space-y-4">
                      {/* Email */}
                      <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-5">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                  <Mail size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.email')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.email.desc')}</p>
                              </div>
                          </div>
                          <ToggleSwitch checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} />
                      </div>

                      {/* SMS */}
                      <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-5">
                              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                                  <Smartphone size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.sms')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.sms.desc')}</p>
                              </div>
                          </div>
                          <ToggleSwitch checked={notifications.sms} onChange={() => setNotifications({...notifications, sms: !notifications.sms})} />
                      </div>

                      {/* Push */}
                      <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-5">
                              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-100 transition-colors">
                                  <Bell size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.push')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.push.desc')}</p>
                              </div>
                          </div>
                          <ToggleSwitch checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} />
                      </div>
                  </div>
              </div>
          )}

          {/* ASSINATURA */}
          {activeTab === 'assinatura' && (
              <div className="space-y-8 animate-fadeIn max-w-3xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><CreditCard size={24} /></div>
                        {t('settings.menu.subscription')}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base">{t('settings.menu.subscription.desc')}</p>
                  </div>

                  {/* Plan Card */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white shadow-2xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 rounded-full border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-3">
                                  <Zap size={12} className="text-yellow-400 fill-yellow-400" /> Plano Profissional
                              </div>
                              <h3 className="text-3xl font-display font-bold mb-1">R$ 149,90 <span className="text-base font-medium text-slate-400">/mês</span></h3>
                              <p className="text-slate-300 text-sm">Próxima cobrança em 15 de Outubro de 2023</p>
                          </div>
                          <button className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
                              Alterar Plano
                          </button>
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Pacientes</p>
                              <p className="text-xl font-bold">450 <span className="text-slate-500 text-sm">/ ∞</span></p>
                          </div>
                          <div>
                              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Armazenamento</p>
                              <p className="text-xl font-bold">12GB <span className="text-slate-500 text-sm">/ 50GB</span></p>
                          </div>
                          <div>
                              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Usuários</p>
                              <p className="text-xl font-bold">3 <span className="text-slate-500 text-sm">/ 5</span></p>
                          </div>
                          <div>
                              <p className="text-slate-400 text-xs font-bold uppercase mb-1">Status</p>
                              <p className="text-xl font-bold text-emerald-400 flex items-center gap-1"><Check size={16} /> Ativo</p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-600">
                              <CreditCard size={24} />
                          </div>
                          <div>
                              <p className="font-bold text-slate-800">Mastercard terminada em 8842</p>
                              <p className="text-xs text-slate-500">Expira em 12/25</p>
                          </div>
                      </div>
                      <button className="text-indigo-600 font-bold text-sm hover:underline">Editar</button>
                  </div>
              </div>
          )}

          {/* EQUIPE */}
          {activeTab === 'equipe' && (
              <div className="space-y-8 animate-fadeIn max-w-3xl">
                  <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><UserPlus size={24} /></div>
                            {t('settings.menu.team')}
                        </h2>
                        <p className="text-slate-500 text-sm md:text-base">{t('settings.menu.team.desc')}</p>
                    </div>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 text-sm">
                        <UserPlus size={18} /> Convidar
                    </button>
                  </div>

                  <div className="space-y-4">
                      {[
                          { name: 'Karen Gomes', email: 'karen@clinica.com', role: 'Administrador', avatar: 'K', active: true },
                          { name: 'João Silva', email: 'joao@clinica.com', role: 'Psicólogo', avatar: 'J', active: true },
                          { name: 'Ana Costa', email: 'ana@clinica.com', role: 'Secretária', avatar: 'A', active: false }
                      ].map((member, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-600 border-2 border-white shadow-sm">
                                      {member.avatar}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{member.name}</h4>
                                      <p className="text-xs text-slate-500">{member.email}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${member.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                      {member.active ? 'Ativo' : 'Pendente'}
                                  </span>
                                  <span className="text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                      {member.role}
                                  </span>
                                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                                      <SettingsIcon size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* INTEGRAÇÕES (Placeholder Funcional) */}
          {activeTab === 'integracoes' && (
              <div className="space-y-8 animate-fadeIn max-w-3xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600"><Database size={24} /></div>
                        {t('settings.menu.integrations')}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base">{t('settings.menu.integrations.desc')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-colors group">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold group-hover:scale-110 transition-transform">G</div>
                              <ToggleSwitch checked={integrations.calendar} onChange={() => setIntegrations({...integrations, calendar: !integrations.calendar})} />
                          </div>
                          <h4 className="font-bold text-slate-800">Google Calendar</h4>
                          <p className="text-xs text-slate-500 mt-1 mb-4">Sincronize sua agenda automaticamente.</p>
                          <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded">
                              <Check size={12} /> Conectado
                          </div>
                      </div>

                      <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-colors group">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">Z</div>
                              <ToggleSwitch checked={integrations.zoom} onChange={() => setIntegrations({...integrations, zoom: !integrations.zoom})} />
                          </div>
                          <h4 className="font-bold text-slate-800">Zoom Meetings</h4>
                          <p className="text-xs text-slate-500 mt-1 mb-4">Crie links de reunião automaticamente.</p>
                          <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded">
                              <Check size={12} /> Conectado
                          </div>
                      </div>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};
