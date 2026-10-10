import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bell, X, Trash2, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, IconButton } from './UI';

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
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30 * 1000);
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

  const alertsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={alertsRef}>
      <IconButton
        variant="ghost"
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Alertas do sistema"
        className="relative"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[10px] font-medium text-white">
            {alerts.length}
          </span>
        )}
      </IconButton>

      {isOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-24px)] max-w-[340px] md:absolute md:left-auto md:right-0 md:top-auto md:translate-x-0 md:mt-2 md:w-80 bg-white rounded-lg border border-slate-200 z-[101] overflow-hidden animate-slideIn">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Bell size={14} className="text-primary-600" /> Alertas do sistema
              </h3>
              {alerts.length > 0 && (
                <Button variant="ghost" size="xs" iconLeft={<Trash2 size={12} />} onClick={dismissAll} className="text-red-600 hover:bg-red-50">
                  Limpar tudo
                </Button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-500">Nenhum alerta pendente</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getTypeStyle(alert.type)} group relative`}
                  >
                    <IconButton
                      variant="ghost"
                      size="xs"
                      onClick={() => dismissAlert(alert.id)}
                      aria-label="Dispensar alerta"
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </IconButton>

                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">{getIcon(alert.type)}</div>
                      <div>
                        <h4 className="text-xs font-medium text-slate-800 mb-1 pr-6">{alert.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2">{alert.message}</p>
                        {alert.link && (
                          <Link
                            to={alert.link}
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-medium text-primary-700 hover:underline"
                          >
                            Ver detalhes
                          </Link>
                        )}
                        <p className="text-[11px] text-slate-400 mt-2">
                          {new Date(alert.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[11px] text-slate-500">Plaelo Analytics & Intelligence</p>
            </div>
          </div>
      )}
    </div>
  );
};
