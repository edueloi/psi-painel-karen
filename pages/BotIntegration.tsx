import React, { useState } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Clock, Calendar, DollarSign, Gift, User, FileText, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const BotIntegration: React.FC = () => {
  const { t } = useLanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState({
    patient: {
      remind24h: true,
      remind1h: true,
      billing: false,
      bday: true
    },
    pro: {
      dailySummary: true,
      nextPatient: true,
      financialAlert: false
    }
  });

  const toggleConfig = (section: 'patient' | 'pro', key: string) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        // @ts-ignore
        [key]: !prev[section][key]
      }
    }));
  };

  const handleSimulateConnection = () => {
    setTimeout(() => {
        setIsConnected(true);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-emerald-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Smartphone size={14} />
                    <span>WhatsApp Bot</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('bot.title')}</h1>
                <p className="text-emerald-100/70 text-lg leading-relaxed max-w-xl">
                    {t('bot.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: QR Code & Status */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <h3 className="font-bold text-slate-800 mb-6">{t('bot.connect')}</h3>
                  
                  {isConnected ? (
                      <div className="flex flex-col items-center justify-center py-10 animate-fadeIn">
                          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                              <CheckCircle size={48} />
                          </div>
                          <h4 className="text-xl font-bold text-emerald-600 mb-2">{t('bot.connected')}</h4>
                          <p className="text-sm text-slate-500">Karen Gomes (11) 99999-8888</p>
                          <button onClick={() => setIsConnected(false)} className="mt-6 text-xs text-red-500 hover:underline">Desconectar</button>
                      </div>
                  ) : (
                      <div className="w-full flex flex-col items-center group cursor-pointer" onClick={handleSimulateConnection}>
                          <div className="relative bg-slate-900 p-4 rounded-xl shadow-lg mb-6 group-hover:scale-105 transition-transform duration-300">
                              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                                  {/* Simulated QR Pattern */}
                                  <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-2">
                                      {Array.from({length: 36}).map((_, i) => (
                                          <div key={i} className={`bg-slate-900 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'} rounded-[1px]`}></div>
                                      ))}
                                      {/* Corner Markers */}
                                      <div className="absolute top-4 left-4 w-10 h-10 border-4 border-slate-900 rounded-md"></div>
                                      <div className="absolute top-4 right-4 w-10 h-10 border-4 border-slate-900 rounded-md"></div>
                                      <div className="absolute bottom-4 left-4 w-10 h-10 border-4 border-slate-900 rounded-md"></div>
                                  </div>
                                  {/* Loading/Scan Overlay */}
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-[2px] group-hover:opacity-0 transition-opacity">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                  </div>
                              </div>
                          </div>
                          <p className="text-sm font-bold text-slate-700 mb-1">{t('bot.scan')}</p>
                          <p className="text-xs text-slate-400">Clique no QR Code para simular</p>
                      </div>
                  )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                      <AlertCircle size={16} className="text-indigo-500" /> Instruções
                  </h4>
                  <ol className="space-y-3 text-xs text-slate-600 list-decimal pl-4">
                      <li>{t('bot.instruction1')}</li>
                      <li>{t('bot.instruction2')}</li>
                      <li>{t('bot.instruction3')}</li>
                      <li>{t('bot.instruction4')}</li>
                  </ol>
              </div>
          </div>

          {/* Right Column: Configuration */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Patient Configs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={20} /></div>
                      <h3 className="font-bold text-lg text-slate-800">{t('bot.configPatient')}</h3>
                  </div>
                  
                  <div className="space-y-4">
                      <ToggleItem 
                          label={t('bot.remind24h')} 
                          icon={<Calendar size={18} />} 
                          checked={config.patient.remind24h} 
                          onChange={() => toggleConfig('patient', 'remind24h')} 
                      />
                      <ToggleItem 
                          label={t('bot.remind1h')} 
                          icon={<Clock size={18} />} 
                          checked={config.patient.remind1h} 
                          onChange={() => toggleConfig('patient', 'remind1h')} 
                      />
                      <ToggleItem 
                          label={t('bot.billing')} 
                          icon={<DollarSign size={18} />} 
                          checked={config.patient.billing} 
                          onChange={() => toggleConfig('patient', 'billing')} 
                      />
                      <ToggleItem 
                          label={t('bot.bday')} 
                          icon={<Gift size={18} />} 
                          checked={config.patient.bday} 
                          onChange={() => toggleConfig('patient', 'bday')} 
                      />
                  </div>
              </div>

              {/* Pro Configs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Bell size={20} /></div>
                      <h3 className="font-bold text-lg text-slate-800">{t('bot.configPro')}</h3>
                  </div>
                  
                  <div className="space-y-4">
                      <ToggleItem 
                          label={t('bot.dailySummary')} 
                          icon={<FileText size={18} />} 
                          checked={config.pro.dailySummary} 
                          onChange={() => toggleConfig('pro', 'dailySummary')} 
                      />
                      <ToggleItem 
                          label={t('bot.nextPatient')} 
                          icon={<User size={18} />} 
                          checked={config.pro.nextPatient} 
                          onChange={() => toggleConfig('pro', 'nextPatient')} 
                      />
                      <ToggleItem 
                          label={t('bot.financialAlert')} 
                          icon={<DollarSign size={18} />} 
                          checked={config.pro.financialAlert} 
                          onChange={() => toggleConfig('pro', 'financialAlert')} 
                      />
                  </div>
              </div>

              <div className="flex justify-end pt-4">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                      <CheckCircle size={18} /> {t('bot.saveConfig')}
                  </button>
              </div>

          </div>
      </div>
    </div>
  );
};

const ToggleItem = ({ label, icon, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 text-slate-700">
            <div className="text-slate-400">{icon}</div>
            <span className="font-medium text-sm">{label}</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
    </div>
);
