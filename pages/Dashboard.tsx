import React from 'react';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS } from '../constants';
import { Users, Calendar, DollarSign, Activity, ArrowUp, Clock, CheckCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const nextAppointment = MOCK_APPOINTMENTS.find(a => a.status === 'scheduled');

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="font-display font-bold text-3xl text-slate-800">
             Olá, Dr. Silva <span className="text-2xl">👋</span>
           </h1>
           <p className="text-slate-500 mt-1">Aqui está o resumo da sua clínica hoje.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <Calendar className="text-indigo-500 h-4 w-4" />
          <span className="text-sm font-semibold text-slate-700">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 card-hover">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Users size={24} />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUp size={12} className="mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-1">{MOCK_PATIENTS.length}</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Pacientes</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 card-hover">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <Calendar size={24} />
            </div>
            <span className="bg-slate-50 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">Hoje</span>
          </div>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-1">
            {MOCK_APPOINTMENTS.filter(a => a.start.getDate() === new Date().getDate()).length}
          </h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Agendamentos</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 card-hover">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-1">R$ 12.4k</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Faturamento Mês</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 card-hover">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
              <Activity size={24} />
            </div>
             <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              Alta
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold text-slate-800 mb-1">94%</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Taxa Presença</p>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Appointments Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg text-slate-800">Próximos Atendimentos</h3>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Ver Agenda</button>
          </div>
          
          <div className="space-y-4">
            {MOCK_APPOINTMENTS.map(app => (
              <div key={app.id} className="group flex items-center p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300">
                <div className="w-16 flex flex-col items-center justify-center mr-6 border-r border-slate-100 pr-6 group-hover:border-indigo-200">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{app.start.toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-2xl font-display font-bold text-slate-800">{app.start.getDate()}</span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-lg">{app.title.replace('Consulta - ', '')}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center text-sm text-slate-500 font-medium">
                      <Clock size={14} className="mr-1.5" />
                      {app.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {app.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {app.status === 'completed' ? 'Realizado' : 'Agendado'}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex">
                    <button className="p-2 rounded-full text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all">
                        <CheckCircle size={20} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel (Quick Actions / Highlights) */}
        <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
                <h3 className="font-display font-bold text-xl mb-2">Acesso Rápido</h3>
                <p className="text-indigo-100 text-sm mb-6 opacity-90">Gerencie pacientes ou verifique sua agenda com um clique.</p>
                
                <div className="grid grid-cols-2 gap-3">
                    <button className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all">
                        <Users size={20} />
                        <span className="text-xs font-bold">Pacientes</span>
                    </button>
                    <button className="bg-white text-indigo-700 p-3 rounded-xl flex flex-col items-center justify-center gap-2 font-bold shadow-lg hover:translate-y-[-2px] transition-all">
                        <Calendar size={20} />
                        <span className="text-xs">Agenda</span>
                    </button>
                </div>
            </div>
            
            {/* Next Appointment Highlight */}
            {nextAppointment && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-bl-[4rem] -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Próximo Paciente</h4>
                        <div className="flex items-center gap-3 mb-3">
                             <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                {nextAppointment.title.charAt(11)}
                             </div>
                             <div>
                                <p className="font-bold text-slate-800">{nextAppointment.title.replace('Consulta - ', '')}</p>
                                <p className="text-xs text-slate-500">Particular</p>
                             </div>
                        </div>
                        <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <Clock size={16} className="mr-2 text-orange-500" />
                            Em 15 minutos
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};