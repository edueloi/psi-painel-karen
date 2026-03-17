
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Calendar, Users, Clock, 
  DollarSign, Activity, ChevronDown, Briefcase, Filter, PieChart,
  Loader2, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Performance: React.FC = () => {
  const [period, setPeriod] = useState('month'); // week, month, year
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await api.get<any>(`/finance/analytics/performance?period=${period}`);
        setData(result);
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

  const { totals, series } = data;

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24 px-4 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><BarChart2 size={20}/></div>
                  Performance da Clínica
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">Business Intelligence e indicadores de saúde do negócio</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {[
                  { id: 'week', label: 'Semana' },
                  { id: 'month', label: 'Mês' },
                  { id: 'year', label: 'Ano' }
              ].map(p => (
                  <button 
                      key={p.id}
                      onClick={() => setPeriod(p.id)}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-indigo-400'}`}
                  >
                      {p.label}
                  </button>
              ))}
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
             title="Faturamento Total" 
             value={totals.income} 
             icon={<DollarSign size={20} />} 
             color="emerald" 
          />
          <KPICard 
             title="Despesas Operacionais" 
             value={totals.expense} 
             icon={<Activity size={20} />} 
             color="rose" 
          />
          <KPICard 
             title="Lucro Líquido" 
             value={totals.profit} 
             icon={<TrendingUp size={20} />} 
             color="indigo" 
          />
          <KPICard 
             title="Margem Operacional" 
             value={totals.income > 0 ? (totals.profit / totals.income) * 100 : 0} 
             isPercent
             icon={<PieChart size={20} />} 
             color="amber" 
          />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                  <div>
                      <h3 className="font-black text-slate-800 text-lg">Fluxo Financeiro</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparativo de entrada e saída</p>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> RECEITA
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> DESPESA
                      </div>
                  </div>
              </div>

              {/* Enhanced Bar Chart */}
              <div className="h-72 flex items-end gap-3 px-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 px-2">
                      {[1, 2, 3, 4].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed h-0"></div>)}
                  </div>

                  {series.map((d: any, i: number) => (
                      <div key={i} className="flex-1 flex gap-1 justify-center items-end h-full group relative z-10">
                          {/* Income Bar */}
                          <div 
                             className="w-full max-w-[20px] bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:bg-emerald-600 shadow-md transform hover:scale-x-110"
                             style={{ height: `${(d.income / maxVal) * 100}%` }}
                          >
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold py-1.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20 pointer-events-none">
                                   {formatCurrency(d.income)}
                               </div>
                          </div>
                          
                          {/* Expense Bar */}
                          <div 
                             className="w-full max-w-[20px] bg-rose-400 rounded-t-xl transition-all duration-700 group-hover:bg-rose-500 shadow-sm"
                             style={{ height: `${(d.expense / maxVal) * 100}%` }}
                          >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold py-1.5 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20 pointer-events-none">
                                   -{formatCurrency(d.expense)}
                               </div>
                          </div>

                          {/* Label */}
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                              {d.label.split('-').pop()}
                          </div>
                      </div>
                  ))}
                  {series.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                          Nenhum dado para o período
                      </div>
                  )}
              </div>
          </div>

          {/* Effort Stats */}
          <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm h-full">
                  <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Briefcase size={18}/></div>
                      <h3 className="font-black text-slate-800 text-lg">Métricas Operacionais</h3>
                  </div>

                  <div className="space-y-4">
                      <EffortItem 
                         label="Dias Trabalhados" 
                         value={`${totals.worked_days} dias`} 
                         icon={<Calendar size={18} />} 
                      />
                      <EffortItem 
                         label="Sessões Realizadas" 
                         value={`${totals.sessions} sessões`} 
                         icon={<Users size={18} />} 
                      />
                      <EffortItem 
                         label="Ticket Médio" 
                         value={formatCurrency(totals.sessions > 0 ? totals.income / totals.sessions : 0)} 
                         icon={<Activity size={18} />} 
                      />

                      <div className="mt-8 pt-8 border-t border-slate-50">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saúde Financeira</span>
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ÓTIMA</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-2 rounded-full w-[85%]"></div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-3 leading-relaxed">
                              Sua margem de lucro está acima da média do setor. Continue monitorando suas despesas fixas.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, color, isPercent = false }: any) => {
    const colors: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl border ${colors[color]} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div className="p-1 bg-slate-50 rounded-lg">
                    <ArrowUpRight size={14} className="text-slate-300"/>
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
                {isPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
            </h3>
        </div>
    );
};

const EffortItem = ({ label, value, icon }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                {icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
);
