import React, { useState, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard, 
  Wallet, PieChart, ArrowUpRight, ArrowDownRight, Filter, Download, 
  Banknote, Smartphone, Receipt
} from 'lucide-react';

// --- MOCK DATA HELPERS ---

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', icon: <Smartphone size={16} />, color: 'bg-emerald-500' },
  { id: 'credit', label: 'Crédito', icon: <CreditCard size={16} />, color: 'bg-indigo-500' },
  { id: 'debit', label: 'Débito', icon: <CreditCard size={16} />, color: 'bg-blue-500' },
  { id: 'cash', label: 'Dinheiro', icon: <Banknote size={16} />, color: 'bg-green-600' },
  { id: 'transfer', label: 'Transferência', icon: <ArrowUpRight size={16} />, color: 'bg-slate-500' },
  { id: 'check', label: 'Cheque', icon: <Receipt size={16} />, color: 'bg-amber-500' },
  { id: 'courtesy', label: 'Cortesia', icon: <Wallet size={16} />, color: 'bg-rose-400' },
];

const generateDailyData = (year: number, month: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data = [];

  for (let i = 1; i <= daysInMonth; i++) {
    // Randomize somewhat realistic data
    const isWeekend = new Date(year, month, i).getDay() % 6 === 0;
    const baseRevenue = isWeekend ? 0 : Math.floor(Math.random() * 2000) + 500;
    const baseExpense = Math.floor(Math.random() * 800) + 100;

    // Simulate payment method distribution for this day's revenue
    const methods = PAYMENT_METHODS.reduce((acc, method) => {
        let amount = 0;
        if (baseRevenue > 0) {
            // Rough distribution
            const pct = Math.random();
            amount = Math.floor(baseRevenue * (pct / PAYMENT_METHODS.length)); 
        }
        return { ...acc, [method.id]: amount };
    }, {} as Record<string, number>);

    data.push({
      day: i,
      date: new Date(year, month, i),
      revenue: baseRevenue,
      expense: baseExpense,
      balance: baseRevenue - baseExpense,
      methods
    });
  }
  return data;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily'>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // --- DERIVED DATA ---
  const currentMonthData = useMemo(() => {
    return generateDailyData(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const yearData = useMemo(() => {
      // Generate summary for 12 months for the chart
      return Array.from({ length: 12 }, (_, i) => {
          const monthDays = generateDailyData(currentDate.getFullYear(), i);
          const totalRev = monthDays.reduce((acc, d) => acc + d.revenue, 0);
          const totalExp = monthDays.reduce((acc, d) => acc + d.expense, 0);
          return { month: i, label: new Date(2023, i, 1).toLocaleDateString('pt-BR', { month: 'short' }), revenue: totalRev, expense: totalExp };
      });
  }, [currentDate.getFullYear()]);

  // Aggregates based on Period Filter (Mock Logic)
  const stats = useMemo(() => {
      let dataSubset = currentMonthData;
      
      if (periodFilter === 'today') {
          const today = new Date().getDate();
          dataSubset = currentMonthData.filter(d => d.day === today);
      } else if (periodFilter === 'week') {
          // Simplification: first 7 days
          dataSubset = currentMonthData.slice(0, 7);
      } 
      // 'month' uses full currentMonthData
      // 'year' would use yearData, handled separately for charts

      const totalRevenue = dataSubset.reduce((acc, d) => acc + d.revenue, 0);
      const totalExpense = dataSubset.reduce((acc, d) => acc + d.expense, 0);
      
      // Aggregate Payment Methods
      const methodTotals: Record<string, number> = {};
      PAYMENT_METHODS.forEach(m => methodTotals[m.id] = 0);
      
      dataSubset.forEach(d => {
          Object.keys(d.methods).forEach(key => {
              methodTotals[key] = (methodTotals[key] || 0) + (d.methods[key] || 0);
          });
      });

      // Best/Worst (from Year Data)
      const sortedMonths = [...yearData].sort((a, b) => b.revenue - a.revenue);
      const bestMonth = sortedMonths[0];
      const worstMonth = sortedMonths[sortedMonths.length - 1];
      const avgRevenue = yearData.reduce((acc, m) => acc + m.revenue, 0) / 12;

      return {
          revenue: totalRevenue,
          expense: totalExpense,
          balance: totalRevenue - totalExpense,
          methods: methodTotals,
          bestMonth,
          worstMonth,
          avgRevenue
      };
  }, [currentMonthData, periodFilter, yearData]);

  const maxChartValue = Math.max(...yearData.map(d => Math.max(d.revenue, d.expense)));

  // --- RENDERERS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fadeIn">
       {/* Filters */}
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex bg-slate-100 p-1 rounded-xl">
               {['today', 'week', 'month', 'year'].map((p) => (
                   <button 
                       key={p}
                       onClick={() => setPeriodFilter(p as any)}
                       className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${periodFilter === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
                   </button>
               ))}
           </div>
           <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
               <Calendar size={16} />
               {periodFilter === 'year' 
                 ? currentDate.getFullYear() 
                 : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
           </div>
       </div>

       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-full group hover:-translate-y-1 transition-all duration-300">
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                       <TrendingUp size={24} />
                   </div>
                   <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                       <ArrowUpRight size={12} /> Entradas
                   </span>
               </div>
               <div>
                   <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Receita Total</span>
                   <h3 className="text-3xl font-display font-bold text-slate-800 mt-1">{formatCurrency(stats.revenue)}</h3>
               </div>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-full group hover:-translate-y-1 transition-all duration-300">
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                       <TrendingDown size={24} />
                   </div>
                   <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full flex items-center gap-1">
                       <ArrowDownRight size={12} /> Saídas
                   </span>
               </div>
               <div>
                   <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Despesas</span>
                   <h3 className="text-3xl font-display font-bold text-slate-800 mt-1">{formatCurrency(stats.expense)}</h3>
               </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg shadow-indigo-200 text-white flex flex-col justify-between h-full group hover:-translate-y-1 transition-all duration-300">
               <div className="flex justify-between items-start mb-4">
                   <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white">
                       <DollarSign size={24} />
                   </div>
                   <span className="text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-full border border-white/20">
                       Resultado
                   </span>
               </div>
               <div>
                   <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Lucro Líquido</span>
                   <h3 className="text-3xl font-display font-bold text-white mt-1">{formatCurrency(stats.balance)}</h3>
               </div>
           </div>
       </div>

       {/* Charts & Breakdown */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Main Chart */}
           <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                   <h3 className="font-bold text-lg text-slate-800">Comparativo Anual</h3>
                   <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Receita</div>
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Despesa</div>
                   </div>
               </div>
               
               <div className="h-64 flex items-end gap-2 md:gap-4">
                   {yearData.map((m, i) => (
                       <div key={i} className="flex-1 flex gap-1 justify-center items-end h-full group relative">
                           {/* Bars */}
                           <div className="w-full max-w-[16px] bg-emerald-500 rounded-t-sm hover:opacity-80 transition-all" style={{ height: `${(m.revenue / maxChartValue) * 100}%` }}></div>
                           <div className="w-full max-w-[16px] bg-rose-400 rounded-t-sm hover:opacity-80 transition-all" style={{ height: `${(m.expense / maxChartValue) * 100}%` }}></div>
                           
                           {/* Tooltip */}
                           <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-xl">
                               <div className="font-bold mb-1">{m.label}</div>
                               <div className="text-emerald-400">R: {formatCurrency(m.revenue)}</div>
                               <div className="text-rose-400">D: {formatCurrency(m.expense)}</div>
                           </div>

                           {/* Label */}
                           <div className="absolute -bottom-6 text-[10px] font-bold text-slate-400 uppercase">{m.label.charAt(0)}</div>
                       </div>
                   ))}
               </div>
           </div>

           {/* Payment Methods Breakdown */}
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
               <h3 className="font-bold text-lg text-slate-800 mb-6">Formas de Pagamento</h3>
               <div className="space-y-4">
                   {PAYMENT_METHODS.map(method => {
                       const amount = stats.methods[method.id] || 0;
                       const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0;
                       
                       if (amount === 0) return null; // Hide unused methods in dashboard view

                       return (
                           <div key={method.id}>
                               <div className="flex justify-between items-center mb-1 text-sm">
                                   <div className="flex items-center gap-2 text-slate-600 font-medium">
                                       <div className={`p-1 rounded text-white ${method.color}`}>{method.icon}</div>
                                       {method.label}
                                   </div>
                                   <div className="text-slate-800 font-bold">{formatCurrency(amount)}</div>
                               </div>
                               <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                   <div className={`h-full rounded-full ${method.color}`} style={{ width: `${percentage}%` }}></div>
                               </div>
                           </div>
                       );
                   })}
               </div>
           </div>
       </div>

       {/* Insights Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-center gap-4">
               <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                   <TrendingUp size={24} />
               </div>
               <div>
                   <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Melhor Mês</p>
                   <p className="font-bold text-slate-800">{stats.bestMonth.label} <span className="text-xs text-slate-500 font-normal">({formatCurrency(stats.bestMonth.revenue)})</span></p>
               </div>
           </div>
           
           <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 flex items-center gap-4">
               <div className="p-3 bg-white rounded-full text-rose-500 shadow-sm">
                   <TrendingDown size={24} />
               </div>
               <div>
                   <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Pior Mês</p>
                   <p className="font-bold text-slate-800">{stats.worstMonth.label} <span className="text-xs text-slate-500 font-normal">({formatCurrency(stats.worstMonth.revenue)})</span></p>
               </div>
           </div>

           <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-center gap-4">
               <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm">
                   <PieChart size={24} />
               </div>
               <div>
                   <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Média Mensal</p>
                   <p className="font-bold text-slate-800">{formatCurrency(stats.avgRevenue)}</p>
               </div>
           </div>
       </div>
    </div>
  );

  const renderDailyFlow = () => (
    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm animate-fadeIn overflow-hidden flex flex-col">
        {/* Table Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-4">
                <h3 className="font-display font-bold text-lg text-slate-800">Fluxo de Caixa Diário</h3>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    >
                        <TrendingDown className="rotate-90" size={16} />
                    </button>
                    <span className="px-4 text-sm font-bold text-slate-700 capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    >
                        <TrendingUp className="rotate-90" size={16} />
                    </button>
                </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                <Download size={16} /> Exportar CSV
            </button>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-2">Data</div>
            <div className="col-span-3 text-right">Entradas</div>
            <div className="col-span-3 text-right">Saídas</div>
            <div className="col-span-2 text-right">Saldo</div>
            <div className="col-span-2 text-center">Status</div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
            {currentMonthData.map((day) => (
                <div key={day.day} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors group">
                    <div className="col-span-2 flex flex-col">
                        <span className="font-bold text-slate-700 text-sm">
                            {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                            {day.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                    </div>
                    <div className="col-span-3 text-right font-medium text-emerald-600">
                        {formatCurrency(day.revenue)}
                    </div>
                    <div className="col-span-3 text-right font-medium text-rose-500">
                        {day.expense > 0 ? `-${formatCurrency(day.expense)}` : '-'}
                    </div>
                    <div className={`col-span-2 text-right font-bold ${day.balance >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                        {formatCurrency(day.balance)}
                    </div>
                    <div className="col-span-2 flex justify-center">
                        {day.balance > 0 ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md border border-emerald-100">Positivo</span>
                        ) : day.balance < 0 ? (
                            <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded-md border border-rose-100">Negativo</span>
                        ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[10px] font-bold uppercase rounded-md">Neutro</span>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Table Footer (Totals) */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-100 border-t border-slate-200 font-bold text-slate-800 text-sm">
            <div className="col-span-2 uppercase text-xs tracking-wider pt-1">Total Mensal</div>
            <div className="col-span-3 text-right text-emerald-700">{formatCurrency(currentMonthData.reduce((acc, d) => acc + d.revenue, 0))}</div>
            <div className="col-span-3 text-right text-rose-700">-{formatCurrency(currentMonthData.reduce((acc, d) => acc + d.expense, 0))}</div>
            <div className="col-span-2 text-right text-indigo-700">{formatCurrency(currentMonthData.reduce((acc, d) => acc + d.balance, 0))}</div>
            <div className="col-span-2"></div>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <DollarSign size={14} />
                    <span>Controle Financeiro</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Fluxo de Caixa</h1>
                <p className="text-indigo-100/70 text-lg leading-relaxed max-w-xl">
                    Monitore a saúde financeira da sua clínica com relatórios detalhados de receitas, despesas e lucratividade.
                </p>
            </div>

            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <PieChart size={18} /> Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('daily')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Filter size={18} /> Fluxo Diário
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' ? renderDashboard() : renderDailyFlow()}
    </div>
  );
};