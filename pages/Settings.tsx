import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone, 
  Check, ChevronRight, Lock, Database, CreditCard, UserPlus, ShieldCheck, Mail
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../translations';

export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('aparencia');
  const [selectedColor, setSelectedColor] = useState('Indigo');
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });

  // Theme definition moved inside component to access `t` function
  const THEME_COLORS = [
    { name: 'Indigo', hex: '#6366f1', label: t('theme.modern'),
      vars: { 
        '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', 
        '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81' 
      } 
    },
    { name: 'Emerald', hex: '#10b981', label: t('theme.health'),
      vars: {
        '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
        '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b'
      }
    },
    { name: 'Rose', hex: '#f43f5e', label: t('theme.cozy'),
      vars: {
        '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
        '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337'
      }
    },
    { name: 'Amber', hex: '#f59e0b', label: t('theme.energy'),
      vars: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f'
      }
    },
    { name: 'Blue', hex: '#3b82f6', label: t('theme.trust'),
      vars: {
        '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
        '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a'
      }
    },
    { name: 'Violet', hex: '#8b5cf6', label: t('theme.creative'),
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
    { id: 'geral', label: t('settings.menu.general'), icon: <SettingsIcon size={18} />, desc: t('settings.menu.general.desc') },
    { id: 'aparencia', label: t('settings.menu.appearance'), icon: <Palette size={18} />, desc: t('settings.menu.appearance.desc') },
    { id: 'notificacoes', label: t('settings.menu.notifications'), icon: <Bell size={18} />, desc: t('settings.menu.notifications.desc') },
    { id: 'assinatura', label: t('settings.menu.subscription'), icon: <CreditCard size={18} />, desc: t('settings.menu.subscription.desc') },
    { id: 'equipe', label: t('settings.menu.team'), icon: <UserPlus size={18} />, desc: t('settings.menu.team.desc') },
    { id: 'integracoes', label: t('settings.menu.integrations'), icon: <Database size={18} />, desc: t('settings.menu.integrations.desc') },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out] px-4">
      
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800">{t('settings.title')}</h1>
        <p className="text-slate-500 mt-2 text-lg">{t('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
        
        {/* Modern Sidebar Navigation */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-slate-50/50 border-r border-slate-100 p-6">
           <div className="space-y-2">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden ${
                    activeTab === item.id 
                      ? 'bg-white shadow-lg shadow-indigo-100/50 text-indigo-700' 
                      : 'text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                  }`}
                >
                  {/* Active Indicator Strip */}
                  {activeTab === item.id && <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-indigo-500 rounded-r-full"></div>}
                  
                  <div className={`p-2.5 rounded-xl transition-colors ${activeTab === item.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                      {item.icon}
                  </div>
                  <div>
                      <span className="block font-bold text-sm">{item.label}</span>
                      <span className="block text-[10px] opacity-70 font-medium">{item.desc}</span>
                  </div>
                  {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                </button>
              ))}
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
          
          {/* APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <div className="space-y-10 animate-fadeIn max-w-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('settings.appearance.title')}</h2>
                    <p className="text-slate-500 mb-8">{t('settings.appearance.subtitle')}</p>
                </div>
                
                {/* Theme Color Selector */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {t('settings.appearance.color')}
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {THEME_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => changeThemeColor(color.name, color.vars)}
                                className={`
                                    relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group
                                    ${selectedColor === color.name 
                                        ? 'border-slate-800 bg-slate-50 shadow-md transform scale-105' 
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}
                                `}
                            >
                                <div 
                                    className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: color.hex }}
                                >
                                    {selectedColor === color.name && (
                                        <Check className="text-white drop-shadow-md animate-[scaleIn_0.2s_ease-out]" size={20} strokeWidth={3} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <span className={`block text-sm font-bold ${selectedColor === color.name ? 'text-slate-800' : 'text-slate-500'}`}>{color.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{color.label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-100" />

                {/* Theme Mode */}
                <section>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {t('settings.appearance.mode')}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button className="relative p-1 rounded-2xl border-2 border-indigo-600 bg-indigo-50/30 overflow-hidden group">
                            <div className="p-4 flex flex-col items-center gap-3 relative z-10">
                                <div className="p-3 bg-white rounded-full shadow-md text-indigo-600">
                                    <Monitor size={24} />
                                </div>
                                <span className="font-bold text-indigo-900 text-sm">{t('settings.appearance.light')}</span>
                            </div>
                            <div className="absolute top-2 right-2 text-indigo-600">
                                <Check size={16} strokeWidth={3} />
                            </div>
                        </button>

                        <button className="relative p-1 rounded-2xl border-2 border-transparent bg-slate-100 overflow-hidden group hover:bg-slate-200 transition-colors opacity-60">
                            <div className="p-4 flex flex-col items-center gap-3 relative z-10">
                                <div className="p-3 bg-slate-800 rounded-full shadow-md text-white">
                                    <Moon size={24} />
                                </div>
                                <span className="font-bold text-slate-600 text-sm">{t('settings.appearance.dark')}</span>
                            </div>
                        </button>

                         <button className="relative p-1 rounded-2xl border-2 border-transparent bg-slate-100 overflow-hidden group hover:bg-slate-200 transition-colors opacity-60">
                            <div className="p-4 flex flex-col items-center gap-3 relative z-10">
                                <div className="p-3 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full shadow-md text-slate-700">
                                    <Smartphone size={24} />
                                </div>
                                <span className="font-bold text-slate-600 text-sm">{t('settings.appearance.auto')}</span>
                            </div>
                        </button>
                    </div>
                </section>
            </div>
          )}

          {/* GERAL */}
          {activeTab === 'geral' && (
             <div className="space-y-8 animate-fadeIn max-w-xl">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('settings.general.title')}</h2>
                    <p className="text-slate-500 mb-8">{t('settings.general.subtitle')}</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">{t('settings.general.language')}</label>
                        <div className="relative">
                            <select 
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            >
                                <option value="pt">Português (Brasil)</option>
                                <option value="en">English (US)</option>
                                <option value="es">Español</option>
                            </select>
                            <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">{t('settings.general.timezone')}</label>
                        <select className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                            <option>(GMT-03:00) Brasília - São Paulo</option>
                            <option>(GMT-04:00) Manaus</option>
                            <option>(GMT-00:00) UTC</option>
                        </select>
                    </div>

                     <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">{t('settings.general.currency')}</label>
                        <select className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                            <option>BRL (R$) - Real Brasileiro</option>
                            <option>USD ($) - Dólar Americano</option>
                            <option>EUR (€) - Euro</option>
                        </select>
                    </div>
                </div>
             </div>
          )}

          {/* NOTIFICAÇÕES */}
          {activeTab === 'notificacoes' && (
              <div className="space-y-8 animate-fadeIn max-w-2xl">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('settings.notifications.title')}</h2>
                    <p className="text-slate-500 mb-8">{t('settings.notifications.subtitle')}</p>
                  </div>

                  <div className="space-y-4">
                      {/* Email Toggle */}
                      <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                  <Mail size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.email')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.email.desc')}</p>
                              </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="sr-only peer" />
                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>

                      {/* SMS Toggle */}
                      <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                  <Smartphone size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.sms')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.sms.desc')}</p>
                              </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.sms} onChange={() => setNotifications({...notifications, sms: !notifications.sms})} className="sr-only peer" />
                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>

                      {/* Push Toggle */}
                      <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                  <Bell size={24} />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{t('settings.notifications.push')}</h4>
                                  <p className="text-sm text-slate-500">{t('settings.notifications.push.desc')}</p>
                              </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="sr-only peer" />
                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>
                  </div>
              </div>
          )}

          {/* PLACEHOLDER FOR OTHERS */}
          {['assinatura', 'equipe', 'integracoes'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 animate-fadeIn">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Lock size={32} className="opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-600 mb-2">{t('settings.advanced.title')}</h3>
                  <p className="max-w-md text-center">{t('settings.advanced.desc')}</p>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};
