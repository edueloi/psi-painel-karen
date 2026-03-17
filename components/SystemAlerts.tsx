import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bell, X, Trash2, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface SystemAlert {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  link?: string;
  created_at: string;
}

export const SystemAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await api.get<SystemAlert[]>('/alerts');
      setAlerts(data || []);
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = async (id: number) => {
    try {
      await api.request(`/alerts/${id}/dismiss`, { method: 'PATCH' });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao dispensar alerta:', err);
    }
  };

  const dismissAll = async () => {
    try {
      await api.delete('/alerts/dismiss-all');
      setAlerts([]);
      setIsOpen(false);
    } catch (err) {
      console.error('Erro ao dispensar todos os alertas:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertCircle className="text-rose-500" size={18} />;
      default: return <Info className="text-sky-500" size={18} />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'error': return 'bg-rose-50 border-rose-100';
      default: return 'bg-sky-50 border-sky-100';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-100"
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[101] overflow-hidden animate-slideIn">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Bell size={14} className="text-indigo-600" /> Alertas do Sistema
              </h3>
              {alerts.length > 0 && (
                <button 
                  onClick={dismissAll}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} /> LIMPAR TUDO
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum alerta pendente</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-4 rounded-2xl border ${getTypeStyle(alert.type)} group relative`}
                  >
                    <button 
                      onClick={() => dismissAlert(alert.id)}
                      className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">{getIcon(alert.type)}</div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-1 pr-6">{alert.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2">{alert.message}</p>
                        {alert.link && (
                          <a 
                            href={alert.link}
                            className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest"
                          >
                            Ver detalhes
                          </a>
                        )}
                        <p className="text-[9px] text-slate-400 mt-2">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Psiflux Analytics & Intelligence</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
