
import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Appointment } from '../types';
import { 
  Users, Calendar, DollarSign, Activity, ArrowUp, Clock, CheckCircle, Video, 
  Sparkles, Plus, Search, ChevronRight, Settings2, X, Globe, Music, 
  ExternalLink, Newspaper, Link as LinkIcon, Trash2, GripVertical, Play, Layout,
  Cake, ChevronUp, ChevronDown, Check, Palette, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';

interface Shortcut {
    id: string;
    title: string;
    url: string;
    icon: string;
    color: string;
    isSystem?: boolean;
}

type WidgetId = 'stats' | 'nextAppointment' | 'shortcuts' | 'news' | 'insight' | 'birthdays';

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([
      { id: 'crp', title: 'Portal CRP', url: 'https://site.cfp.org.br/', icon: 'globe', color: 'bg-blue-600', isSystem: true },
      { id: 'spotify', title: 'Playlist Relax', url: 'https://open.spotify.com/genre/focus-page', icon: 'music', color: 'bg-emerald-500', isSystem: true },
  ]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [pts, apts] = await Promise.all([
              api.get<Patient[]>('/patients'),
              api.get<any[]>('/appointments')
          ]);
          setPatients(pts);
          // Converter appointments da API para o formato de interface do Dashboard
          setAppointments(apts.map(a => ({
              ...a,
              start: new Date(a.appointment_date),
              end: new Date(new Date(a.appointment_date).getTime() + (a.duration_minutes || 50) * 60000),
              patient_name: a.patient_name || 'Consulta'
          })));
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  const today = new Date();
  const todaysAppointments = appointments.filter(a => 
    a.start.getDate() === today.getDate() &&
    a.start.getMonth() === today.getMonth() &&
    a.start.getFullYear() === today.getFullYear()
  );
  
  const dailySummary = useMemo(() => {
      const count = todaysAppointments.length;
      if (count === 0) return "Você não tem atendimentos agendados para hoje. Aproveite para organizar seus prontuários.";
      return `Você tem ${count} atendimentos hoje. Seu primeiro paciente é às ${todaysAppointments[0]?.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}.`;
  }, [todaysAppointments]);

  const formattedDate = today.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const renderIcon = (iconName: string, size = 20) => {
      if (iconName === 'globe') return <Globe size={size} />;
      if (iconName === 'music') return <Music size={size} />;
      return <LinkIcon size={size} />;
  };

  const InsightWidget = () => (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-white shadow-xl relative overflow-hidden mb-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20"><Sparkles size={20} className="text-yellow-300" /></div>
            <div className="flex-1 text-center md:text-left">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-100 mb-0.5">Resumo Inteligente</h3>
                <p className="text-base font-medium leading-relaxed">{isLoading ? 'Sincronizando dados...' : dailySummary}</p>
            </div>
        </div>
    </div>
  );

  const StatsWidget = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
            { label: t('dashboard.totalPatients'), val: isLoading ? '-' : patients.length, icon: <Users size={18} /> },
            { label: t('dashboard.today'), val: isLoading ? '-' : todaysAppointments.length, icon: <Calendar size={18} /> },
            { label: t('dashboard.revenue'), val: 'R$ 12.4k', icon: <DollarSign size={18} /> },
            { label: t('dashboard.attendance'), val: '94%', icon: <Activity size={18} /> }
        ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all hover:border-indigo-100">
                <div className="flex justify-between items-start mb-2"><div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">{stat.icon}</div></div>
                <h3 className="text-xl font-display font-bold text-slate-800">{stat.val}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
        ))}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900">Olá, Bem-vindo(a) <span className="text-2xl">👋</span></h1>
            <p className="text-slate-500 text-sm capitalize">{formattedDate}</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 h-10 rounded-lg font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
                <Plus size={16} /> <span className="hidden sm:inline">{t('patients.new')}</span>
            </button>
        </div>
      </div>

      <InsightWidget />
      <StatsWidget />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> {t('dashboard.nextAppointments')}</h3>
                    <button onClick={() => navigate('/agenda')} className="text-[10px] font-bold text-indigo-600 hover:underline">{t('dashboard.viewAgenda')}</button>
                </div>
                <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-300" /></div>
                    ) : todaysAppointments.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-sm">Agenda livre para hoje.</div>
                    ) : todaysAppointments.map(app => (
                        <div key={app.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group">
                            <div className="w-12 text-[10px] font-bold text-indigo-600 uppercase pr-3 mr-3 border-r border-slate-100">{app.start.getHours()}:{app.start.getMinutes().toString().padStart(2,'0')}</div>
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 text-sm truncate">{app.patient_name}</h4><span className="text-[9px] font-bold text-indigo-500 uppercase">{app.modality}</span></div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <div className="space-y-6">
              <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wide">Acesso Rápido</h3>
                  <div className="grid grid-cols-2 gap-2">
                      {shortcuts.map(s => (
                          <a key={s.id} href={s.url} target="_blank" rel="noopener" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 transition-all text-center">
                              <div className={`w-8 h-8 ${s.color} rounded-full flex items-center justify-center text-white mb-1.5`}>{renderIcon(s.icon, 16)}</div>
                              <span className="text-[10px] font-bold text-slate-700">{s.title}</span>
                          </a>
                      ))}
                  </div>
              </div>
          </div>
      </div>
      <AuroraAssistant />
    </div>
  );
};
