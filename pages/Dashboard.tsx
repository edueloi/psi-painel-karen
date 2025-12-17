
import React, { useMemo } from 'react';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS } from '../constants';
import { Users, Calendar, DollarSign, Activity, ArrowUp, Clock, CheckCircle, Video, Sparkles, Plus, Search, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  // --- Automated Insights Logic ---
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
      const newPatients = todaysAppointments.filter(a => a.title.includes('Primeira') || a.title.includes('Anamnese')).length; // Mock logic
      
      if (count === 0) return "Você não tem atendimentos agendados para hoje. Aproveite para organizar seus prontuários.";
      
      return `Você tem ${count} atendimentos hoje (${online} online). ${newPatients > 0 ? `Atenção: ${newPatients} paciente(s) novo(s).` : ''} Seu dia termina às ${todaysAppointments[todaysAppointments.length-1].end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}.`;
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

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out] pb-20">
      
      {/* --- HEADER & SMART BRIEFING --- */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900">
                    {getGreeting()}, Karen <span className="text-2xl">👋</span>
                </h1>
                <p className="text-slate-500 text-sm md:text-base capitalize">{formattedDate}</p>
            </div>
            
            <div className="flex gap-3">
                <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
                    <Calendar size={18} /> <span className="hidden sm:inline">{t('nav.agenda')}</span>
                </button>
                <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
                    <Plus size={18} /> <span className="hidden sm:inline">{t('patients.new')}</span>
                </button>
            </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
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
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUp size={10} className="mr-0.5" /> 12%
            </span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-800">{MOCK_PATIENTS.length}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.totalPatients')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
              <Calendar size={20} />
            </div>
            <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">{t('dashboard.today')}</span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-800">
            {todaysAppointments.length}
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.appointments')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-800">12.4k</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.revenue')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group">
          <div className="flex justify-between items-start mb-3">
             <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
              <Activity size={20} />
            </div>
             <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Alta</span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-800">94%</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('dashboard.attendance')}</p>
        </div>
      </div>

      {/* --- MAIN CONTENT SPLIT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Next Appointments Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
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
                        <span className={`text-[10px] font-bold text-slate-400`}>
                            {app.status === 'completed' ? 'Concluído' : 'Agendado'}
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

        {/* Side Panel (Quick Actions & Highlights) */}
        <div className="space-y-6">
            
            {/* Quick Actions List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Acesso Rápido</h3>
                <div className="space-y-2">
                    <button onClick={() => navigate('/patients')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><Users size={18} /></div>
                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Novo Paciente</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                    </button>
                    <button onClick={() => navigate('/comandas')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><DollarSign size={18} /></div>
                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Lançar Pagamento</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                    </button>
                    <button onClick={() => navigate('/forms')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors"><Activity size={18} /></div>
                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Enviar Anamnese</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                    </button>
                </div>
            </div>
            
            {/* Next Appointment Highlight */}
            {nextAppointment && (
                <div className="bg-slate-900 rounded-2xl shadow-lg p-6 relative overflow-hidden text-white group cursor-pointer" onClick={() => navigate('/agenda')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/30 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> A seguir
                            </h4>
                            <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-md">
                                {nextAppointment.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                             <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg text-white border-2 border-white/10">
                                {nextAppointment.title.replace('Consulta - ', '').charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate text-lg leading-tight">{nextAppointment.title.replace('Consulta - ', '')}</p>
                                <p className="text-xs text-slate-400 capitalize">{nextAppointment.modality} • Particular</p>
                             </div>
                        </div>

                        {nextAppointment.modality === 'online' ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/meeting/${nextAppointment.id}`); }}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Video size={18} /> Iniciar Vídeo
                            </button>
                        ) : (
                            <div className="w-full py-3 bg-white/10 rounded-xl font-bold text-center text-sm text-slate-300">
                                Atendimento Presencial
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- AI ASSISTANT --- */}
      <AuroraAssistant />
    </div>
  );
};
