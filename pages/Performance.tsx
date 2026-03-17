
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Calendar, Users, Clock, 
  DollarSign, Activity, ChevronDown, Briefcase, Filter, PieChart,
  Loader2, AlertCircle, ArrowUpRight, Sparkles, Zap, Trophy,
  ChevronRight, CalendarDays
} from 'lucide-react';
import { api } from '../services/api';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export const Performance: React.FC = () => {
  const [period, setPeriod] = useState('month'); // week, month, year
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [bestClients, setBestClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [perfResult, clientsResult] = await Promise.all([
            api.get<any>(`/finance/analytics/performance?period=${period}`),
            api.get<any[]>('/finance/analytics/best-clients')
        ]);
        setData(perfResult);
        setBestClients(clientsResult || []);
        setError(null);
      } catch (err: any) {
        setError('Erro ao carregar dados de performance.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const maxVal = useMemo(() => {
    if (!data?.series?.length) return 1;
    return Math.max(...data.series.map((d: any) => Math.max(Number(d.income) || 0, Number(d.expense) || 0)));
  }, [data]);

  const maxHours = useMemo(() => {
    if (!data?.hoursSeries?.length) return 1;
    return Math.max(...data.hoursSeries.map((d: any) => Number(d.hours) || 0));
  }, [data]);

  const maxPeak = useMemo(() => {
    if (!data?.peakDays?.length) return 1;
    return Math.max(...data.peakDays.map((d: any) => Number(d.count) || 0));
  }, [data]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analisando métricas de performance...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="text-rose-500" size={48} />
        <p className="text-slate-500 font-bold">{error || 'Nenhum dado encontrado'}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Tentar Novamente</button>
      </div>
    );
  }

  const { totals, series, hoursSeries, peakDays } = data;

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-24 px-4 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><BarChart2 size={24}/></div>
                  Performance e Analytics
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">Indicadores estratégicos para gestão da sua clínica</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
              {[
                  { id: 'week', label: 'Semana' },
                  { id: 'month', label: 'Mês' },
                  { id: 'year', label: 'Ano' }
              ].map(p => (
                  <button 
                      key={p.id}
                      onClick={() => setPeriod(p.id)}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                      {p.label}
                  </button>
              ))}
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
             title="Faturamento Bruto" 
             value={totals.income} 
             icon={<DollarSign size={20} />} 
             color="emerald" 
          />
          <KPICard 
             title="Horas em Atendimento" 
             value={totals.total_hours} 
             subtitle="Horas reais"
             icon={<Clock size={20} />} 
             color="indigo" 
             isDecimal
          />
          <KPICard 
             title="Lucro Líquido" 
             value={totals.profit} 
             icon={<TrendingUp size={20} />} 
             color="sky" 
          />
          <KPICard 
             title="Aproveitamento" 
             value={totals.income > 0 ? (totals.profit / totals.income) * 100 : 0} 
             isPercent
             icon={<PieChart size={20} />} 
             color="amber" 
          />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Main Financial Chart */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-10">
                  <div>
                      <h3 className="font-black text-slate-800 text-lg">Fluxo de Caixa</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Evolução de receitas e despesas</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> RECEITA
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span> DESPESA
                      </div>
                  </div>
              </div>

              <div className="h-64 flex items-end gap-2 px-2 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03] px-2">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed"></div>)}
                  </div>

                  {series.map((d: any, i: number) => (
                      <div key={i} className="flex-1 flex gap-0.5 justify-center items-end h-full group relative z-10">
                          <div 
                             className="w-full max-w-[12px] bg-emerald-500 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-600 shadow-sm"
                             style={{ height: `${(d.income / maxVal) * 100}%` }}
                          />
                          <div 
                             className="w-full max-w-[12px] bg-rose-400 rounded-t-lg transition-all duration-500 group-hover:bg-rose-500 shadow-sm"
                             style={{ height: `${(d.expense / maxVal) * 100}%` }}
                          />
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-300 uppercase tracking-tighter whitespace-nowrap rotate-45 origin-left">
                              {d.label.split('-').pop()}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Hours Chart */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-10">
                  <div>
                      <h3 className="font-black text-slate-800 text-lg">Carga Horária</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Horas de atendimento realizadas</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl text-indigo-600">
                     <Clock size={14}/>
                     <span className="text-[9px] font-black uppercase tracking-widest">{totals.total_hours.toFixed(1)}h Totais</span>
                  </div>
              </div>

              <div className="h-64 flex items-end gap-3 px-2 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03] px-2">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed"></div>)}
                  </div>

                  {hoursSeries && hoursSeries.map((d: any, i: number) => (
                      <div key={i} className="flex-1 flex justify-center items-end h-full group relative z-10">
                          <div 
                             className="w-full max-w-[16px] bg-indigo-400 rounded-t-xl transition-all duration-500 group-hover:bg-indigo-600 shadow-lg shadow-indigo-100"
                             style={{ height: `${(d.hours / maxHours) * 100}%` }}
                          />
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-300 uppercase tracking-tighter whitespace-nowrap rotate-45 origin-left">
                              {d.label.split('-').pop()}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* BOTTOM SECTION: Peak Days & Best Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Peak Days Chart */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <div>
                      <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                          <Zap size={18} className="text-amber-500 fill-amber-500"/>
                          Dias de Pico
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sazonalidade Semanal</p>
                  </div>
              </div>

              <div className="h-56 flex items-end gap-3 px-1">
                  {dayNamesShort.map((name, i) => {
                      const dayIdx = i + 1; // MySQL DAYOFWEEK is 1-7
                      const dataDay = peakDays?.find((d: any) => d.day_index === dayIdx);
                      const count = dataDay ? dataDay.count : 0;
                      const pct = (count / maxPeak) * 100;

                      return (
                          <div key={name} className="flex-1 flex flex-col items-center gap-3 h-full group">
                              <div className="w-full flex-1 flex items-end justify-center px-0.5">
                                  <div 
                                      className={`w-full rounded-xl transition-all duration-1000 group-hover:scale-105 shadow-xl ${count === maxPeak ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-indigo-200' : 'bg-slate-100 border border-slate-200 group-hover:bg-slate-200'}`}
                                      style={{ height: count > 0 ? `${pct}%` : '8px' }}
                                  >
                                  </div>
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-widest ${count === maxPeak ? 'text-indigo-600' : 'text-slate-400'}`}>{name}</span>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Best Clients */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Trophy size={18}/></div>
                  <div>
                      <h3 className="font-black text-slate-800 text-lg">Melhores Clientes</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ranking por faturamento</p>
                  </div>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-56">
                  {bestClients.length === 0 ? (
                      <div className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum dado real</div>
                  ) : (
                      bestClients.slice(0, 10).map((client, idx) => (
                        <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-amber-100 transition-all group">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-[10px] font-black text-slate-300 w-4">#{idx+1}</span>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 truncate">{client.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{client.appointmentCount} sessões</p>
                                </div>
                            </div>
                            <p className="text-[11px] font-black text-amber-600 shrink-0">{formatCurrency(client.totalRevenue)}</p>
                        </div>
                      ))
                  )}
              </div>
          </div>

          {/* Metrics List */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Activity size={18}/></div>
                  <h3 className="font-black text-slate-800 text-lg">Métricas Extras</h3>
              </div>

              <div className="space-y-4">
                  <EffortItem 
                     label="Dias em Clínica" 
                     value={`${totals.worked_days} dias`} 
                     icon={<Calendar size={18} />} 
                  />
                  <EffortItem 
                     label="Carga Média Dia" 
                     value={`${totals.worked_days > 0 ? (totals.total_hours / totals.worked_days).toFixed(1) : 0}h`} 
                     icon={<Clock size={18} />} 
                  />
                  <EffortItem 
                     label="Ticket Médio" 
                     value={formatCurrency(totals.sessions > 0 ? totals.income / totals.sessions : 0)} 
                     icon={<Zap size={18} />} 
                  />

                  <div className="mt-6 pt-6 border-t border-slate-50">
                      <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saúde Operacional</span>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ESTÁVEL</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden ring-1 ring-slate-200/50">
                          <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full w-[82%] shadow-sm"></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, color, isPercent = false, isDecimal = false, subtitle }: any) => {
    const colors: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        sky: 'bg-sky-50 text-sky-600 border-sky-100',
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl transition-all hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <div className={`w-full h-full rounded-full border-[10px] border-current ${colors[color].split(' ')[1]}`}></div>
            </div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`p-4 rounded-2xl shadow-sm border ${colors[color]} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {subtitle && (
                   <span className="text-[9px] font-black px-2 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg uppercase tracking-widest">{subtitle}</span>
                )}
            </div>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                {isPercent ? `${value.toFixed(1)}%` : isDecimal ? `${value.toFixed(1)}h` : formatCurrency(value)}
            </h3>
        </div>
    );
};

const EffortItem = ({ label, value, icon }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
);
