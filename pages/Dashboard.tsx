
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
  
  // --- STATE: CUSTOMIZATION ---
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  
  // Order of widgets in the main grid columns (mock implementation for visual order)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(['stats', 'nextAppointment', 'birthdays', 'shortcuts', 'news', 'insight']);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>({
      stats: true,
      nextAppointment: true,
      shortcuts: true,
      news: true,
      insight: true,
      birthdays: true
  });

  // --- STATE: SHORTCUTS ---
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([
      { id: 'crp', title: 'Portal CRP', url: 'https://site.cfp.org.br/', icon: 'globe', color: 'bg-blue-600', isSystem: true },
      { id: 'spotify', title: 'Playlist Relax', url: 'https://open.spotify.com/genre/focus-page', icon: 'music', color: 'bg-emerald-500', isSystem: true },
  ]);
  
  const [newShortcut, setNewShortcut] = useState({ title: '', url: '', color: 'bg-indigo-600' });
  const [isAddingShortcut, setIsAddingShortcut] = useState(false);

  // --- LOGIC ---
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

  const getBirthdays = () => {
      const currentMonth = today.getMonth();
      return MOCK_PATIENTS.filter(p => {
          if (!p.birthDate) return false;
          // Handle string or Date object if MOCK data varies
          const d = new Date(p.birthDate);
          return d.getMonth() === currentMonth;
      }).sort((a, b) => {
          const dayA = new Date(a.birthDate!).getDate();
          const dayB = new Date(b.birthDate!).getDate();
          return dayA - dayB;
      });
  };

  const birthdays = useMemo(() => getBirthdays(), []);

  const handleAddShortcut = () => {
      if (!newShortcut.title || !newShortcut.url) return;
      
      let finalUrl = newShortcut.url;
      if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
      }

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

  const removeShortcut = (id: string) => {
      setShortcuts(shortcuts.filter(s => s.id !== id));
  };

  const renderIcon = (iconName: string, size = 20) => {
      if (iconName === 'globe') return <Globe size={size} />;
      if (iconName === 'music') return <Music size={size} />;
      return <LinkIcon size={size} />;
  };

  const moveWidget = (id: WidgetId, direction: 'up' | 'down') => {
      const index = widgetOrder.indexOf(id);
      if (index === -1) return;
      
      const newOrder = [...widgetOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      setWidgetOrder(newOrder);
  };

  // --- WIDGET COMPONENTS ---

  const InsightWidget = () => (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20">
                <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-100 mb-1">Resumo Inteligente</h3>
                <p className="text-lg md:text-xl font-medium leading-relaxed">{dailySummary}</p>
            </div>
            {nextAppointment && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[200px] border border-white/10">
                    <p className="text-xs text-indigo-100 font-bold uppercase mb-1">Próximo: {nextAppointment.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    <p className="font-bold truncate">{nextAppointment.title.replace('Consulta - ', '')}</p>
                    <p className="text-xs opacity-80 mt-1 capitalize">{nextAppointment.modality}</p>
                </div>
            )}
        </div>
    </div>
  );

  const StatsWidget = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
            { label: t('dashboard.totalPatients'), val: MOCK_PATIENTS.length, icon: <Users size={20} />, color: 'blue', trend: '12%' },
            { label: t('dashboard.today'), val: todaysAppointments.length, icon: <Calendar size={20} />, color: 'purple', trend: null },
            { label: t('dashboard.revenue'), val: '12.4k', icon: <DollarSign size={20} />, color: 'emerald', trend: null },
            { label: t('dashboard.attendance'), val: '94%', icon: <Activity size={20} />, color: 'orange', trend: 'Alta' }
        ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all hover:-translate-y-1 group">
                <div className="flex justify-between items-start mb-3">
                    <div className={`p-2.5 bg-${stat.color}-50 rounded-xl text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                        {stat.icon}
                    </div>
                    {stat.trend && (
                        <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            {stat.trend.includes('%') && <ArrowUp size={10} className="mr-0.5" />} {stat.trend}
                        </span>
                    )}
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-800">{stat.val}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
            </div>
        ))}
    </div>
  );

  const NextAppointmentWidget = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[300px]">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500" />
                {t('dashboard.nextAppointments')}
            </h3>
            <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                {t('dashboard.viewAgenda')}
            </button>
        </div>
        
        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            {todaysAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Calendar size={48} className="opacity-20 mb-4" />
                    <p className="text-sm font-medium">Agenda livre hoje.</p>
                </div>
            ) : (
                todaysAppointments.map(app => (
                <div key={app.id} className="flex items-center p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all duration-300 group">
                    <div className="w-14 flex flex-col items-center justify-center mr-4 border-r border-slate-100 pr-4 group-hover:border-slate-200 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {app.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className="h-4 w-px bg-slate-200 my-1"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {app.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{app.title.replace('Consulta - ', '')}</h4>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            app.modality === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {app.modality}
                        </span>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {app.modality === 'online' && app.status !== 'completed' && (
                            <button 
                                onClick={() => navigate(`/meeting/${app.id}`)}
                                className="p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-colors"
                                title={t('dashboard.enterRoom')}
                            >
                                <Video size={16} />
                            </button>
                        )}
                        <button className="p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                            <CheckCircle size={16} />
                        </button>
                    </div>
                </div>
                ))
            )}
        </div>
    </div>
  );

  const BirthdaysWidget = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col mt-6">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Cake size={20} className="text-pink-500" />
                  Aniversariantes do Mês
              </h3>
              <span className="text-xs font-bold bg-pink-50 text-pink-600 px-2 py-1 rounded-md">{birthdays.length}</span>
          </div>
          <div className="p-4 flex gap-4 overflow-x-auto no-scrollbar">
              {birthdays.length === 0 ? (
                  <div className="w-full text-center py-8 text-slate-400 text-sm">Nenhum aniversariante este mês.</div>
              ) : (
                  birthdays.map(p => {
                      const day = new Date(p.birthDate!).getDate();
                      const isToday = day === today.getDate();
                      return (
                          <div key={p.id} className="flex flex-col items-center min-w-[80px] group">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold mb-2 border-2 transition-all ${isToday ? 'border-pink-500 shadow-md shadow-pink-200 scale-110' : 'border-slate-100 group-hover:border-pink-200'}`}>
                                  {p.photoUrl ? (
                                      <img src={p.photoUrl} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                      <span className="text-slate-400">{p.name.charAt(0)}</span>
                                  )}
                              </div>
                              <span className="text-xs font-bold text-slate-700 truncate max-w-full">{p.name.split(' ')[0]}</span>
                              <span className={`text-[10px] font-bold px-1.5 rounded ${isToday ? 'bg-pink-500 text-white' : 'text-slate-400'}`}>Dia {day}</span>
                          </div>
                      );
                  })
              )}
          </div>
      </div>
  );

  const ShortcutsWidget = () => (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full">
        <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide flex items-center justify-between">
            Acesso Rápido
            <button onClick={() => setIsAddingShortcut(true)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-50 rounded"><Plus size={16}/></button>
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
            {shortcuts.map(s => (
                <div key={s.id} className="relative group">
                    <a 
                        href={s.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 transition-all text-center h-full group/card"
                    >
                        <div className={`w-10 h-10 ${s.color} rounded-full flex items-center justify-center text-white mb-2 shadow-sm group-hover/card:scale-110 transition-transform`}>
                            {renderIcon(s.icon)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 leading-tight">{s.title}</span>
                    </a>
                    {!s.isSystem && (
                        <button 
                            onClick={(e) => { e.preventDefault(); removeShortcut(s.id); }}
                            className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            ))}
        </div>

        {isAddingShortcut && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-[fadeIn_0.2s_ease-out] relative">
                <button onClick={() => setIsAddingShortcut(false)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"><X size={14}/></button>
                <h4 className="text-xs font-bold text-slate-500 mb-3">Novo Atalho</h4>
                <div className="space-y-2">
                    <input 
                        type="text" placeholder="Nome (Ex: Google Meet)" 
                        className="w-full p-2 rounded-lg text-xs border border-slate-200 outline-none focus:border-indigo-400"
                        value={newShortcut.title}
                        onChange={e => setNewShortcut({...newShortcut, title: e.target.value})}
                    />
                    <input 
                        type="text" placeholder="URL (Ex: meet.google.com)" 
                        className="w-full p-2 rounded-lg text-xs border border-slate-200 outline-none focus:border-indigo-400"
                        value={newShortcut.url}
                        onChange={e => setNewShortcut({...newShortcut, url: e.target.value})}
                    />
                    <div className="flex gap-2 items-center">
                        <label className="text-xs text-slate-400">Cor:</label>
                        {['bg-indigo-600', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'].map(c => (
                            <button 
                                key={c}
                                onClick={() => setNewShortcut({...newShortcut, color: c})}
                                className={`w-4 h-4 rounded-full ${c} ${newShortcut.color === c ? 'ring-2 ring-offset-1 ring-slate-300' : ''}`}
                            />
                        ))}
                    </div>
                    <button onClick={handleAddShortcut} className="w-full mt-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-bold transition-colors">
                        Adicionar
                    </button>
                </div>
            </div>
        )}
    </div>
  );

  const NewsWidget = () => (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden h-full mt-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                <Newspaper size={16} className="text-blue-500" /> Atualizações & CRP
            </h3>
        </div>
        
        <div className="space-y-4">
            {CRP_NEWS.map(news => (
                <div key={news.id} className="group cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${news.color} mb-1 inline-block`}>{news.tag}</span>
                            <h4 className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">{news.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock size={10} /> {news.date}</p>
                        </div>
                        <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors mt-1" />
                    </div>
                    <div className="h-px w-full bg-slate-50 mt-3 group-last:hidden"></div>
                </div>
            ))}
        </div>
        <button className="w-full mt-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-dashed border-slate-200">
            Ver todas as notícias
        </button>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out] pb-20 relative">
      
      {/* --- HEADER & ACTIONS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900">
                {getGreeting()}, Karen <span className="text-2xl">👋</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base capitalize">{formattedDate}</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={() => setIsCustomizeOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-all"
            >
                <Settings2 size={18} /> <span className="hidden sm:inline">Personalizar</span>
            </button>
            <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
                <Plus size={18} /> <span className="hidden sm:inline">{t('patients.new')}</span>
            </button>
        </div>
      </div>

      {visibleWidgets.insight && <InsightWidget />}
      {visibleWidgets.stats && <StatsWidget />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              {visibleWidgets.nextAppointment && <NextAppointmentWidget />}
              {visibleWidgets.birthdays && <BirthdaysWidget />}
          </div>
          <div>
              {visibleWidgets.shortcuts && <ShortcutsWidget />}
              {visibleWidgets.news && <NewsWidget />}
          </div>
      </div>

      {/* --- AI ASSISTANT --- */}
      <AuroraAssistant />

      {/* --- CUSTOMIZE MODAL (POPOVER) --- */}
      {isCustomizeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 animate-[slideUpFade_0.3s_ease-out] flex flex-col max-h-[80vh]">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                              <Layout size={20} className="text-indigo-600" /> Personalizar
                          </h3>
                          <p className="text-xs text-slate-500">Arraste ou oculte widgets do seu painel.</p>
                      </div>
                      <button onClick={() => setIsCustomizeOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                      {widgetOrder.map((id, index) => {
                          const labels: Record<WidgetId, string> = {
                              stats: 'Estatísticas',
                              nextAppointment: 'Próximos Agendamentos',
                              shortcuts: 'Acesso Rápido',
                              news: 'Notícias CRP',
                              insight: 'Resumo IA',
                              birthdays: 'Aniversariantes'
                          };
                          const icons: Record<WidgetId, React.ReactNode> = {
                              stats: <Activity size={16}/>,
                              nextAppointment: <Calendar size={16}/>,
                              shortcuts: <LinkIcon size={16}/>,
                              news: <Newspaper size={16}/>,
                              insight: <Sparkles size={16}/>,
                              birthdays: <Cake size={16}/>
                          };

                          return (
                              <div key={id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${visibleWidgets[id] ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-transparent opacity-60'}`}>
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500 cursor-grab active:cursor-grabbing">
                                      <GripVertical size={16} />
                                  </div>
                                  <div className={`p-2 rounded-lg ${visibleWidgets[id] ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                      {icons[id]}
                                  </div>
                                  <span className="flex-1 font-bold text-sm text-slate-700">{labels[id]}</span>
                                  
                                  {/* Reorder Buttons (Simplified for this version) */}
                                  <div className="flex flex-col gap-1 mr-2">
                                      <button onClick={() => moveWidget(id, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ChevronUp size={12}/></button>
                                      <button onClick={() => moveWidget(id, 'down')} disabled={index === widgetOrder.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ChevronDown size={12}/></button>
                                  </div>

                                  <div className="h-6 w-px bg-slate-100 mx-1"></div>

                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={visibleWidgets[id]} onChange={() => setVisibleWidgets({...visibleWidgets, [id]: !visibleWidgets[id]})} className="sr-only peer" />
                                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                  </label>
                              </div>
                          );
                      })}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 text-center flex justify-end">
                      <button onClick={() => setIsCustomizeOpen(false)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                          <Check size={18} /> Concluir
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
