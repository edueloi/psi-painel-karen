import React, { useState, useMemo } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Calendar, Users, Clock, 
  DollarSign, Activity, ChevronDown, Briefcase, Filter, PieChart 
} from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { UserRole } from '../types';

// Mock Data Generator for Charts
const generateChartData = (period: string) => {
    if (period === 'week') {
        return [
            { label: 'Seg', income: 850, expense: 200 },
            { label: 'Ter', income: 1200, expense: 150 },
            { label: 'Qua', income: 950, expense: 300 },
            { label: 'Qui', income: 1500, expense: 180 },
            { label: 'Sex', income: 1100, expense: 220 },
            { label: 'Sáb', income: 600, expense: 100 },
            { label: 'Dom', income: 0, expense: 50 },
        ];
    } else if (period === 'year') {
         return [
            { label: 'Jan', income: 12500, expense: 4000 },
            { label: 'Fev', income: 14200, expense: 3800 },
            { label: 'Mar', income: 13800, expense: 4200 },
            { label: 'Abr', income: 15500, expense: 4100 },
            { label: 'Mai', income: 16000, expense: 4500 },
            { label: 'Jun', income: 15200, expense: 4300 },
            { label: 'Jul', income: 17500, expense: 5000 },
            { label: 'Ago', income: 18000, expense: 4800 },
            { label: 'Set', income: 16800, expense: 4200 },
            { label: 'Out', income: 19000, expense: 4600 },
            { label: 'Nov', income: 0, expense: 0 }, // Future
            { label: 'Dez', income: 0, expense: 0 },
        ];
    } else {
        // Month (Weeks)
        return [
            { label: 'Sem 1', income: 3200, expense: 900 },
            { label: 'Sem 2', income: 4100, expense: 1100 },
            { label: 'Sem 3', income: 3800, expense: 850 },
            { label: 'Sem 4', income: 4500, expense: 1200 },
        ];
    }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Performance: React.FC = () => {
  const [period, setPeriod] = useState('month'); // today, week, month, year
  const [professionalId, setProfessionalId] = useState('all');

  const chartData = useMemo(() => generateChartData(period), [period]);
  
  // Calculate Totals based on Chart Data (Mock Logic)
  const totals = useMemo(() => {
      const inc = chartData.reduce((acc, curr) => acc + curr.income, 0);
      const exp = chartData.reduce((acc, curr) => acc + curr.expense, 0);
      return {
          income: inc,
          expense: exp,
          profit: inc - exp,
          margin: inc > 0 ? ((inc - exp) / inc) * 100 : 0
      };
  }, [chartData]);

  const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)));

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <BarChart2 size={14} />
                    <span>Business Intelligence</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Performance Financeira</h1>
                <p className="text-indigo-100/70 text-lg leading-relaxed max-w-xl">
                    Análise detalhada de receitas, despesas e esforço operacional da sua clínica.
                </p>
            </div>

            {/* Global Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative">
                    <UserRoleIcon role={UserRole.PSYCHOLOGIST} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={professionalId}
                        onChange={(e) => setProfessionalId(e.target.value)}
                        className="w-full lg:w-48 pl-10 pr-8 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium text-sm hover:bg-slate-800 transition-colors"
                    >
                        <option value="all">Todos Profissionais</option>
                        {MOCK_USERS.filter(u => u.role === UserRole.PSYCHOLOGIST).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                
                <div className="bg-slate-800/50 p-1 rounded-xl border border-slate-700 flex">
                     {['week', 'month', 'year'].map((p) => (
                         <button 
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex-1 ${period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                         >
                             {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
                         </button>
                     ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
             title="Receita Total" 
             value={totals.income} 
             trend="+12.5%" 
             icon={<DollarSign size={20} />} 
             color="emerald" 
          />
          <KPICard 
             title="Despesas" 
             value={totals.expense} 
             trend="+5.2%" 
             icon={<Activity size={20} />} 
             color="rose" 
             inverse
          />
          <KPICard 
             title="Lucro Líquido" 
             value={totals.profit} 
             trend="+8.1%" 
             icon={<TrendingUp size={20} />} 
             color="indigo" 
          />
          <KPICard 
             title="Margem de Lucro" 
             value={totals.margin} 
             isPercent
             trend="+2.4%" 
             icon={<PieChart size={20} />} 
             color="blue" 
          />
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Financial Chart */}
          <div className="lg:col-span-2 bg-white rounded-[24px] p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h3 className="font-bold text-xl text-slate-800">Balanço Financeiro</h3>
                      <p className="text-sm text-slate-500">Receitas vs. Despesas no período</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Receita
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-400"></span> Despesa
                      </div>
                  </div>
              </div>

              {/* Custom CSS Bar Chart */}
              <div className="flex-1 flex items-end gap-3 md:gap-6 min-h-[300px] border-b border-slate-100 pb-2 relative">
                  {/* Grid Lines (Background) */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                      {[1, 0.75, 0.5, 0.25, 0].map((line, i) => (
                          <div key={i} className="w-full border-t border-dashed border-slate-300 h-0"></div>
                      ))}
                  </div>

                  {chartData.map((data, index) => (
                      <div key={index} className="flex-1 flex gap-1 md:gap-2 justify-center items-end h-full group relative z-10">
                          {/* Income Bar */}
                          <div 
                             className="w-full max-w-[24px] bg-emerald-500 rounded-t-md relative hover:opacity-80 transition-all duration-500 group-hover:scale-y-105 origin-bottom"
                             style={{ height: `${(data.income / maxVal) * 100}%` }}
                          >
                               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                   {formatCurrency(data.income)}
                               </div>
                          </div>
                          
                          {/* Expense Bar */}
                          <div 
                             className="w-full max-w-[24px] bg-rose-400 rounded-t-md relative hover:opacity-80 transition-all duration-500 group-hover:scale-y-105 origin-bottom"
                             style={{ height: `${(data.expense / maxVal) * 100}%` }}
                          >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                   -{formatCurrency(data.expense)}
                               </div>
                          </div>

                          {/* Label */}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 uppercase">
                              {data.label}
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Effort / Operational Stats */}
          <div className="space-y-6">
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                      <Briefcase size={20} className="text-indigo-600" />
                      Métricas de Esforço
                  </h3>

                  <div className="space-y-6">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dias Trabalhados</p>
                              <p className="text-2xl font-bold text-slate-800">18 <span className="text-sm text-slate-400 font-medium">dias</span></p>
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <Calendar size={20} />
                          </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Atendimentos</p>
                              <p className="text-2xl font-bold text-slate-800">142 <span className="text-sm text-slate-400 font-medium">sessões</span></p>
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <Users size={20} />
                          </div>
                      </div>

                       <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horas Totais</p>
                              <p className="text-2xl font-bold text-slate-800">126h <span className="text-sm text-slate-400 font-medium">horas</span></p>
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <Clock size={20} />
                          </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-slate-600">Ticket Médio</span>
                              <span className="text-sm font-bold text-emerald-600">R$ 350,00</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-2 rounded-full w-[75%]"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

// Helper Components
const KPICard = ({ title, value, trend, icon, color, inverse = false, isPercent = false }: any) => {
    const isPositive = trend.startsWith('+');
    const trendColor = inverse 
        ? (isPositive ? 'text-rose-500' : 'text-emerald-500') 
        : (isPositive ? 'text-emerald-500' : 'text-rose-500');
    
    const colors: any = {
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        blue: 'bg-blue-50 text-blue-600',
    };

    return (
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    {icon}
                </div>
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full bg-slate-50 ${trendColor}`}>
                    {isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                    {trend}
                </div>
            </div>
            <h3 className="text-3xl font-display font-bold text-slate-800 mb-1">
                {isPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
            </h3>
            <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
    );
};

// Simplified icon wrapper if not imported from Lucide to avoid TS errors
const UserRoleIcon = ({role, ...props}: any) => <Users {...props} />;