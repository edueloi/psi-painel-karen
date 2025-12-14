import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone, 
  Check, ChevronRight, Lock, Database 
} from 'lucide-react';

const THEME_COLORS = [
  { name: 'Indigo', hex: '#6366f1', 
    vars: { 
      '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', 
      '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81' 
    } 
  },
  { name: 'Emerald', hex: '#10b981', 
    vars: {
      '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
      '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b'
    }
  },
  { name: 'Rose', hex: '#f43f5e', 
    vars: {
      '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
      '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337'
    }
  },
  { name: 'Amber', hex: '#f59e0b', 
    vars: {
      '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
      '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f'
    }
  },
  { name: 'Blue', hex: '#3b82f6', 
    vars: {
      '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
      '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a'
    }
  },
  { name: 'Violet', hex: '#8b5cf6', 
    vars: {
      '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
      '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6', '900': '#4c1d95'
    }
  }
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('geral');
  const [selectedColor, setSelectedColor] = useState('Indigo');
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });

  const changeThemeColor = (colorName: string, vars: Record<string, string>) => {
    setSelectedColor(colorName);
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(`--c-${key}`, value);
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out]">
      
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500">Personalize o sistema e gerencie suas preferências.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
           <nav className="space-y-1">
              {[
                { id: 'geral', label: 'Geral', icon: <SettingsIcon size={18} /> },
                { id: 'aparencia', label: 'Aparência', icon: <Palette size={18} /> },
                { id: 'notificacoes', label: 'Notificações', icon: <Bell size={18} /> },
                { id: 'integracoes', label: 'Integrações', icon: <Database size={18} /> },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
           </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <div className="space-y-6 animate-fadeIn">
                
                {/* Theme Color */}
                <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Cor de Destaque</h3>
                    <p className="text-sm text-slate-500 mb-6">Escolha a cor principal para botões, links e ícones do sistema.</p>
                    
                    <div className="flex flex-wrap gap-4">
                        {THEME_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => changeThemeColor(color.name, color.vars)}
                                className={`group relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${selectedColor === color.name ? 'ring-4 ring-offset-2 ring-slate-200 scale-105' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color.hex }}
                            >
                                {selectedColor === color.name && (
                                    <Check className="text-white drop-shadow-md" size={24} strokeWidth={3} />
                                )}
                                <span className="absolute -bottom-8 text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{color.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Theme Mode (Visual Only for Demo) */}
                <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Tema da Interface</h3>
                    <p className="text-sm text-slate-500 mb-6">Selecione o modo de visualização preferido.</p>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <button className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 flex flex-col items-center gap-3 transition-all">
                            <div className="w-full h-24 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
                                <div className="space-y-2 w-2/3">
                                    <div className="h-2 w-full bg-slate-100 rounded"></div>
                                    <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <span className="font-bold text-indigo-700 text-sm flex items-center gap-2"><Monitor size={14} /> Claro</span>
                        </button>
                        <button className="p-4 rounded-xl border-2 border-transparent hover:border-slate-200 bg-slate-50 flex flex-col items-center gap-3 transition-all opacity-60">
                            <div className="w-full h-24 bg-slate-900 rounded-lg shadow-sm flex items-center justify-center">
                                <div className="space-y-2 w-2/3">
                                    <div className="h-2 w-full bg-slate-700 rounded"></div>
                                    <div className="h-2 w-2/3 bg-slate-700 rounded"></div>
                                </div>
                            </div>
                            <span className="font-bold text-slate-600 text-sm flex items-center gap-2"><Moon size={14} /> Escuro</span>
                        </button>
                         <button className="p-4 rounded-xl border-2 border-transparent hover:border-slate-200 bg-slate-50 flex flex-col items-center gap-3 transition-all opacity-60">
                            <div className="w-full h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                                 <span className="text-xs font-bold text-slate-400">Auto</span>
                            </div>
                            <span className="font-bold text-slate-600 text-sm flex items-center gap-2"><Smartphone size={14} /> Sistema</span>
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* GERAL */}
          {activeTab === 'geral' && (
             <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Preferências Regionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Idioma</label>
                            <select className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-slate-700">
                                <option>Português (Brasil)</option>
                                <option>English (US)</option>
                                <option>Español</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fuso Horário</label>
                            <select className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-slate-700">
                                <option>(GMT-03:00) Brasília</option>
                                <option>(GMT-04:00) Manaus</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Moeda</label>
                            <select className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none font-medium text-slate-700">
                                <option>BRL (R$)</option>
                                <option>USD ($)</option>
                                <option>EUR (€)</option>
                            </select>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* NOTIFICAÇÕES */}
          {activeTab === 'notificacoes' && (
              <div className="bg-white p-8 rounded-[24px] border border-slate-100 shadow-sm animate-fadeIn">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Canais de Notificação</h3>
                  <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                              <h4 className="font-bold text-slate-700">E-mail</h4>
                              <p className="text-xs text-slate-500">Receba resumos diários e alertas de segurança.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                              <h4 className="font-bold text-slate-700">SMS / WhatsApp</h4>
                              <p className="text-xs text-slate-500">Avisos urgentes sobre agendamentos.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.sms} onChange={() => setNotifications({...notifications, sms: !notifications.sms})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                              <h4 className="font-bold text-slate-700">Notificações Push</h4>
                              <p className="text-xs text-slate-500">Alertas no navegador e app móvel.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                      </div>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};