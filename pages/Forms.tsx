
import React from 'react';
import { MOCK_FORM_STATS, MOCK_FORMS, MOCK_PATIENTS } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HeartPulse, FilePlus, Inbox, Trophy, Wand2, PlusCircle, ListChecks, PieChart, 
  Calendar, Bolt, ChartLine, Eye, Clock, CheckCircle, ChevronRight, FileText
} from 'lucide-react';

export const Forms: React.FC = () => {
  const navigate = useNavigate();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Mock Recent Responses
  const recentResponses = [
      { id: 1, patient: 'Carlos Oliveira', form: 'Anamnese Adulto Inicial', date: 'Hoje, 10:30', status: 'Novo' },
      { id: 2, patient: 'Mariana Souza', form: 'Diário de Sono Semanal', date: 'Ontem, 14:15', status: 'Lido' },
      { id: 3, patient: 'Pedro Santos', form: 'Termo de Consentimento', date: '22 Set, 09:00', status: 'Lido' },
      { id: 4, patient: 'Ana Clara', form: 'Avaliação de Humor', date: '20 Set, 16:45', status: 'Novo' },
  ];

  const quickTemplates = [
      { title: 'Anamnese Geral', desc: 'Questionário completo para novos pacientes.' },
      { title: 'Inventário de Beck', desc: 'Escala de Depressão e Ansiedade.' },
      { title: 'Diário de Emoções', desc: 'Registro diário para TCC.' },
  ];

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-10">
      
      {/* --- HEADER PRINCIPAL --- */}
      <div className="relative overflow-hidden rounded-[26px] p-6 md:p-10 bg-slate-900 border border-slate-700/50 shadow-[0_22px_45px_-20px_rgba(15,23,42,0.55)]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900"></div>
        <div className="absolute -top-[60px] -right-[40px] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-center">
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
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[140px] p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Formulários</div>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <FilePlus size={20} className="text-sky-400" /> {MOCK_FORM_STATS.totalForms}
                        </div>
                    </div>
                    <div className="flex-1 min-w-[140px] p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Respostas</div>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <Inbox size={20} className="text-emerald-400" /> {MOCK_FORM_STATS.totalResponses}
                        </div>
                    </div>
                </div>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda: Ações e Templates */}
          <div className="space-y-8">
              {/* Quick Actions */}
              <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Bolt size={20} className="text-indigo-600"/> Acesso Rápido</h2>
                  <div className="grid grid-cols-1 gap-4">
                        <Link to="/forms/new" className="flex items-center p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all group">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                                <PlusCircle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Criar Novo</h4>
                                <p className="text-indigo-100 text-xs">Do zero ou template</p>
                            </div>
                            <ChevronRight className="ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/forms/list" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                                <ListChecks size={24} className="text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold text-slate-800">Meus Forms</h4>
                                <p className="text-xs text-slate-500">Gerenciar todos</p>
                            </Link>
                            <Link to="/forms/list" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                                <PieChart size={24} className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold text-slate-800">Resultados</h4>
                                <p className="text-xs text-slate-500">Ver estatísticas</p>
                            </Link>
                        </div>
                  </div>
              </div>

              {/* Quick Templates */}
              <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Wand2 size={20} className="text-purple-600"/> Modelos Populares</h2>
                  <div className="space-y-3">
                      {quickTemplates.map((tpl, i) => (
                          <div key={i} className="group flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                  {tpl.title.charAt(0)}
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-sm text-slate-700 group-hover:text-purple-700 transition-colors">{tpl.title}</h4>
                                  <p className="text-xs text-slate-500 line-clamp-1">{tpl.desc}</p>
                              </div>
                              <button className="text-slate-300 hover:text-purple-600"><PlusCircle size={18} /></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Coluna Direita: Respostas Recentes (Larga) */}
          <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Inbox size={20} className="text-emerald-600"/> Respostas Recentes</h2>
                  <button className="text-xs font-bold text-indigo-600 hover:underline">Ver todas</button>
              </div>

              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-400 font-bold tracking-wider">
                                  <th className="px-6 py-4">Paciente</th>
                                  <th className="px-6 py-4">Formulário</th>
                                  <th className="px-6 py-4">Data</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4 text-right">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {recentResponses.map((res) => (
                                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                                  {res.patient.charAt(0)}
                                              </div>
                                              <span className="font-bold text-slate-700 text-sm">{res.patient}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2 text-sm text-slate-600">
                                              <FileText size={14} className="text-slate-400" />
                                              {res.form}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                              <Clock size={12} /> {res.date}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                              res.status === 'Novo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                                          }`}>
                                              {res.status === 'Novo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                              {res.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Ver Resposta">
                                              <Eye size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
                      <p className="text-xs text-slate-400">Mostrando as últimas 4 respostas</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
