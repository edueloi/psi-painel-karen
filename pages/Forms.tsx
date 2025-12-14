import React from 'react';
import { MOCK_FORM_STATS } from '../constants';
import { Link } from 'react-router-dom';
import { 
  HeartPulse, Shield, ClipboardList, Lock, FilePlus, Inbox, Trophy, 
  Wand2, PlusCircle, ListChecks, PieChart, Calendar, CircleDot, Bolt, ChartLine
} from 'lucide-react';

export const Forms: React.FC = () => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-10">
      
      {/* --- HEADER PRINCIPAL --- */}
      <div className="relative overflow-hidden rounded-[26px] p-6 md:p-10 bg-slate-900 border border-slate-700/50 shadow-[0_22px_45px_-20px_rgba(15,23,42,0.55)]">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.25),transparent_55%)] mix-blend-screen pointer-events-none"></div>
        <div className="absolute -top-[60px] -right-[40px] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-center">
            {/* Header Content */}
            <div className="max-w-[640px]">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-900/60 border border-slate-400/30 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <HeartPulse size={12} className="text-sky-400" />
                    <span>Painel clínico</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-50 mb-3 leading-tight">
                    Visão Geral dos <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">Formulários</span>
                </h1>

                <p className="text-slate-300 text-lg leading-relaxed max-w-lg mb-6">
                    Acompanhe em tempo real seus formulários criados, respostas recebidas e métricas de engajamento dos pacientes.
                </p>

                {/* Inline Stats */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[140px] p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Formulários</div>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <FilePlus size={20} className="text-sky-400" />
                            {MOCK_FORM_STATS.totalForms}
                        </div>
                    </div>

                    <div className="flex-1 min-w-[140px] p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Respostas</div>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <Inbox size={20} className="text-emerald-400" />
                            {MOCK_FORM_STATS.totalResponses}
                        </div>
                    </div>
                </div>
            </div>

            {/* Header Side (Date/Greeting) */}
            <div className="flex flex-col items-start lg:items-end lg:text-right gap-4 lg:border-l border-slate-700/50 lg:pl-8 lg:h-full lg:justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-600/50 backdrop-blur-md text-slate-200 text-sm font-semibold shadow-lg">
                    <Calendar size={16} className="text-yellow-400" />
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                
                <div className="text-indigo-100 text-base">
                    <strong className="text-white block text-xl mb-1">{getGreeting()}</strong>
                    Aqui está o resumo da sua <br/> atividade clínica recente.
                </div>
            </div>
        </div>
      </div>

      {/* --- ESTATÍSTICAS SECUNDÁRIAS --- */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
            <ChartLine size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Indicadores de Uso</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FilePlus size={80} className="text-blue-600" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                        <FilePlus size={24} />
                    </div>
                    <h3 className="text-4xl font-extrabold text-slate-800 mb-1">{MOCK_FORM_STATS.totalForms}</h3>
                    <p className="text-slate-500 font-medium">Modelos Ativos</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider cursor-pointer hover:underline">
                    Ver todos
                </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Inbox size={80} className="text-emerald-600" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <Inbox size={24} />
                    </div>
                    <h3 className="text-4xl font-extrabold text-slate-800 mb-1">{MOCK_FORM_STATS.totalResponses}</h3>
                    <p className="text-slate-500 font-medium">Total de Respostas</p>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-emerald-600 uppercase tracking-wider cursor-pointer hover:underline">
                    Ver relatórios
                </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy size={80} className="text-amber-500" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
                        <Trophy size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1 truncate" title={MOCK_FORM_STATS.mostUsed?.title}>{MOCK_FORM_STATS.mostUsed?.title || '-'}</h3>
                    <p className="text-slate-500 font-medium">Mais Utilizado ({MOCK_FORM_STATS.mostUsed?.responseCount})</p>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-amber-600 uppercase tracking-wider cursor-pointer hover:underline">
                    Detalhes
                </div>
            </div>
        </div>
      </div>

      {/* --- AÇÕES RÁPIDAS --- */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
            <Bolt size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Acesso Rápido</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/forms/new" className="flex flex-col p-6 rounded-[24px] bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors"></div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white mb-4 backdrop-blur-sm">
                    <Wand2 size={24} />
                </div>
                <h4 className="font-bold text-lg mb-1">Biblioteca</h4>
                <p className="text-indigo-100 text-sm leading-relaxed opacity-90">Modelos prontos de anamnese e humor.</p>
            </Link>

            <Link to="/forms/new" className="flex flex-col p-6 rounded-[24px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 hover:border-indigo-100 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PlusCircle size={24} />
                </div>
                <h4 className="font-bold text-lg text-slate-800 mb-1">Criar Novo</h4>
                <p className="text-slate-500 text-sm leading-relaxed">Monte um questionário do zero.</p>
            </Link>

            <Link to="/forms/list" className="flex flex-col p-6 rounded-[24px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 hover:border-indigo-100 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ListChecks size={24} />
                </div>
                <h4 className="font-bold text-lg text-slate-800 mb-1">Gerenciar</h4>
                <p className="text-slate-500 text-sm leading-relaxed">Edite ou exclua seus formulários.</p>
            </Link>

            <Link to="/forms/list" className="flex flex-col p-6 rounded-[24px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 hover:border-indigo-100 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PieChart size={24} />
                </div>
                <h4 className="font-bold text-lg text-slate-800 mb-1">Resultados</h4>
                <p className="text-slate-500 text-sm leading-relaxed">Visualize todas as respostas.</p>
            </Link>
        </div>
      </div>

    </div>
  );
};