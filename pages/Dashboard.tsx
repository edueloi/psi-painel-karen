
import React, { useMemo, useState } from 'react';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS } from '../constants';
import { 
  Users, Calendar, DollarSign, Activity, ArrowUp, Clock, CheckCircle, Video, 
  Sparkles, Plus, Search, ChevronRight, Settings2, X, Globe, Music, 
  ExternalLink, Newspaper, Link as LinkIcon, Trash2, GripVertical, Play, Layout,
  Cake, ChevronUp, ChevronDown, Check, Palette
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';

// --- MOCK NEWS DATA ---
const CRP_NEWS = [
    { id: 1, title: 'Nova Resolução sobre Telemedicina', date: 'Há 2 horas', tag: 'Normativa', color: 'bg-blue-100 text-blue-700' },
    { id: 2, title: 'Anuidade 2024: Descontos antecipados', date: 'Ontem', tag: 'Financeiro', color: 'bg-emerald-100 text-emerald-700' },
    { id: 3, title: 'Workshop Gratuito: Manejo do Luto', date: '22 Set', tag: 'Evento', color: 'bg-purple-100 text-purple-700' },
];

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
  
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(['stats', 'nextAppointment', 'birthdays', 'shortcuts', 'news', 'insight']);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>({
      stats: true,
      nextAppointment: true,
      shortcuts: true,
      news: true,
      insight: true,
      birthdays: true
  });

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([
      { id: 'crp', title: 'Portal CRP', url: 'https://site.cfp.org.br/', icon: 'globe', color: 'bg-blue-600', isSystem: true },
      { id: 'spotify', title: 'Playlist Relax', url: 'https://open.spotify.com/genre/focus-page', icon: 'music', color: 'bg-emerald-500', isSystem: true },
  ]);
  
  const [newShortcut, setNewShortcut] = useState({ title: '', url: '', color: 'bg-indigo-600' });
  const [isAddingShortcut, setIsAddingShortcut] = useState(false);

  const today = new Date();
  const todaysAppointments = MOCK_APPOINTMENTS.filter(a => 
    a.start.getDate() === today.getDate() &&
    a.start.getMonth() === today.getMonth() &&
    a.start.getFullYear() === today.getFullYear()
  );
  
  const nextAppointment = todaysAppointments.find(a => a.status === 'scheduled' && a.start > new Date());
  
  const dailySummary = useMemo(() => {
      const count = todaysAppointments.length;
      const online = todaysAppointments.filter(a => a.modality === 'online').length;
      if (count === 0) return "Você não tem atendimentos agendados para hoje. Aproveite para organizar seus prontuários.";
      return `Você tem ${count} atendimentos hoje (${online} online). Seu dia termina às ${todaysAppointments[todaysAppointments.length-1]?.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) || '??:??'}.`;
  }, [todaysAppointments]);

  const formattedDate = today.toLocaleDateString(
    language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', 
    { weekday: 'long', day: 'numeric', month: 'long' }
  );

  const getGreeting = () => {
      const hour = today.getHours();
      if (hour < 12) return 'Bom dia';
      if (hour < 18) return 'Boa tarde';
      return 'Boa noite';
  };

  const birthdays = useMemo(() => {
      const currentMonth = today.getMonth();
      return MOCK_PATIENTS.filter(p => {
          if (!p.birthDate) return false;
          const d = new Date(p.birthDate);
          return d.getMonth() === currentMonth;
      }).sort((a, b) => {
          const dayA = new Date(a.birthDate!).getDate();
          const dayB = new Date(b.birthDate!).getDate();
          return dayA - dayB;
      });
  }, []);

  const handleAddShortcut = () => {
      if (!newShortcut.title || !newShortcut.url) return;
      let finalUrl = newShortcut.url;
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

      setShortcuts([...shortcuts, {
          id: Math.random().toString(36),
          title: newShortcut.title,
          url: finalUrl,
          icon: 'link',
          color: newShortcut.color,
          isSystem: false
      }]);
      setNewShortcut({ title: '', url: '', color: 'bg-indigo-600' });
      setIsAddingShortcut(false);
  };

  const removeShortcut = (id: string) => setShortcuts(shortcuts.filter(s => s.id !== id));

  const renderIcon = (iconName: string, size = 20) => {
      if (iconName === 'globe') return <Globe size={size} />;
      if (iconName === 'music') return <Music size={size} />;
      return <LinkIcon size={size} />;
  };

  const moveWidget = (id: WidgetId, direction: 'up' | 'down') => {
      const index = widgetOrder.indexOf(id);
      if (index === -1) return;
      const newOrder = [...widgetOrder];
      if (direction === 'up' && index > 0) [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      else if (direction === 'down' && index < newOrder.length - 1) [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setWidgetOrder(newOrder);
  };

  // --- WIDGET COMPONENTS ---
  const InsightWidget = () => (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                <Sparkles size={20} className="text-yellow-300" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-100 mb-0.5">Resumo Inteligente</h3>
                <p className="text-base font-medium leading-relaxed">{dailySummary}</p>
            </div>
        </div>
    </div>
  );

  const StatsWidget = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
            { label: t('dashboard.totalPatients'), val: MOCK_PATIENTS.length, icon: <Users size={18} />, color: 'blue', trend: '12%' },
            { label: t('dashboard.today'), val: todaysAppointments.length, icon: <Calendar size={18} />, color: 'purple', trend: null },
            { label: t('dashboard.revenue'), val: '12.4k', icon: <DollarSign size={18} />, color: 'emerald', trend: null },
            { label: t('dashboard.attendance'), val: '94%', icon: <Activity size={18} />, color: 'orange', trend: 'Alta' }
        ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all hover:-translate-y-0.5 group">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        {stat.icon}
                    </div>
                </div>
                <h3 className="text-xl font-display font-bold text-slate-800">{stat.val}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
        ))}
    </div>
  );

  const NextAppointmentWidget = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[300px]">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500" />
                {t('dashboard.nextAppointments')}
            </h3>
            <button onClick={() => navigate('/agenda')} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors">
                {t('dashboard.viewAgenda')}
            </button>
        </div>
        <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            {todaysAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Calendar size={32} className="opacity-20 mb-3" />
                    <p className="text-xs font-medium">Agenda livre hoje.</p>
                </div>
            ) : (
                todaysAppointments.map(app => (
                <div key={app.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all duration-300 group">
                    <div className="w-12 flex flex-col items-center justify-center mr-3 border-r border-slate-100 pr-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{app.start.getHours()}:{app.start.getMinutes().toString().padStart(2,'0')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{app.patient_name}</h4>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase">{app.modality}</span>
                    </div>
                </div>
                ))
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out] pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900">
                {getGreeting()}, Karen <span className="text-2xl">👋</span>
            </h1>
            <p className="text-slate-500 text-sm capitalize">{formattedDate}</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setIsCustomizeOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 h-10 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
                <Settings2 size={16} /> <span className="hidden sm:inline">Personalizar</span>
            </button>
            <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 h-10 rounded-lg font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
                <Plus size={16} /> <span className="hidden sm:inline">{t('patients.new')}</span>
            </button>
        </div>
      </div>

      {visibleWidgets.insight && <InsightWidget />}
      {visibleWidgets.stats && <StatsWidget />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
              {visibleWidgets.nextAppointment && <NextAppointmentWidget />}
          </div>
          <div className="space-y-6">
              {visibleWidgets.shortcuts && (
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
              )}
          </div>
      </div>
      <AuroraAssistant />
    </div>
  );
};
