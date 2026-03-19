import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Clock, Calendar, DollarSign, Gift, User, FileText, Bell, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';

export const BotIntegration: React.FC = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phone, setPhone] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<{ status: any, phone: string | null }>('/whatsapp/status');
      setStatus(data.status || 'disconnected');
      setPhone(data.phone);
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsActionLoading(true);
      const data = await api.post<{ qrcode: string, status: any }>('/whatsapp/connect', {});
      setQrCode(data.qrcode);
      setStatus('connecting');
    } catch (err) {
      console.error('Erro ao conectar:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(t('bot.disconnect') + '?')) return;
    try {
      setIsActionLoading(true);
      await api.post('/whatsapp/disconnect', {});
      setStatus('disconnected');
      setQrCode(null);
      setPhone(null);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-emerald-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Smartphone size={14} />
                    <span>{t('bot.badge')}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('bot.title')}</h1>
                <p className="text-emerald-200 text-lg leading-relaxed max-w-xl">
                    {t('bot.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: QR Code & Status */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center min-h-[440px] justify-center">
                  <h3 className="font-bold text-slate-800 mb-6">{t('bot.connect')}</h3>
                  
                  {status === 'connected' ? (
                      <div className="flex flex-col items-center justify-center py-10 animate-fadeIn w-full">
                          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                              <CheckCircle size={48} />
                          </div>
                          <h4 className="text-xl font-bold text-emerald-600 mb-2">{t('bot.connected')}</h4>
                          <p className="text-sm text-slate-500">{phone || 'Dispositivo Vinculado'}</p>
                          <button 
                            onClick={handleDisconnect} 
                            disabled={isActionLoading}
                            className="mt-6 text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            {isActionLoading ? t('common.loading') : t('bot.disconnect')}
                          </button>
                      </div>
                  ) : (
                      <div className="w-full flex flex-col items-center group">
                          <div className="relative bg-slate-900 p-4 rounded-xl shadow-lg mb-6 group-hover:scale-105 transition-transform duration-300">
                              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
                                  {qrCode ? (
                                      <img src={qrCode} alt="QR Code" className="w-full h-full object-contain p-2" />
                                  ) : (
                                    /* Placeholder pattern while not connecting */
                                    <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-2 opacity-20">
                                        {Array.from({length: 36}).map((_, i) => (
                                            <div key={i} className={`bg-slate-900 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'} rounded-[1px]`}></div>
                                        ))}
                                    </div>
                                  )}
                                  
                                  {/* Action/Loading Overlay */}
                                  {(status === 'disconnected' || isActionLoading) && (
                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center backdrop-blur-[2px] p-4">
                                        {isActionLoading ? (
                                            <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
                                        ) : (
                                            <button 
                                                onClick={handleConnect}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                                            >
                                                {t('bot.connect')}
                                            </button>
                                        )}
                                    </div>
                                  )}
                              </div>
                          </div>
                          <p className="text-sm font-bold text-slate-700 mb-1">{t('bot.scan')}</p>
                          <p className="text-xs text-slate-400">{t('bot.scanHint')}</p>
                          {status === 'connecting' && (
                            <button 
                                onClick={handleDisconnect} 
                                className="mt-4 text-[10px] text-slate-400 hover:text-red-500 underline"
                            >
                                {t('common.cancel')}
                            </button>
                          )}
                      </div>
                  )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                      <AlertCircle size={16} className="text-indigo-500" /> {t('bot.instructions')}
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

