
import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard,
  Wallet, PieChart, ArrowUpRight, ArrowDownRight, Filter, Download, 
  Briefcase, Calculator, BookOpen, AlertCircle, Trash2, Loader2,
  Plus, Edit3, X, Tag, User, List as ListIcon, Smartphone, Banknote, Receipt, FileText, CheckCircle2, Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { FinancialTransaction, Patient } from '../types';
import { Modal } from '../components/UI/Modal';
import { Input, Select, TextArea } from '../components/UI/Input';
import { useToast } from '../contexts/ToastContext';
import { FinancialHealth } from '../components/Finance/FinancialHealth';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', icon: <Smartphone size={16} />, color: 'bg-emerald-500' },
  { id: 'credit', label: 'Crédito', icon: <CreditCard size={16} />, color: 'bg-indigo-500' },
  { id: 'debit', label: 'Débito', icon: <CreditCard size={16} />, color: 'bg-blue-500' },
  { id: 'cash', label: 'Dinheiro', icon: <Banknote size={16} />, color: 'bg-green-600' },
  { id: 'transfer', label: 'Transferência', icon: <ArrowUpRight size={16} />, color: 'bg-slate-500' },
  { id: 'check', label: 'Cheque', icon: <Receipt size={16} />, color: 'bg-amber-500' },
  { id: 'courtesy', label: 'Cortesia', icon: <Wallet size={16} />, color: 'bg-rose-400' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CATEGORIES_INCOME = [
    'Sessão Individual', 'Pacote de Sessões', 'Avaliação', 'Supervisão', 'Palestra/Curso', 'Outros'
];

const CATEGORIES_EXPENSE = [
    'Aluguel/Sublocação', 'Marketing/Anúncios', 'Impostos/CRP', 'Software/Sistemas', 'Educação/Livros', 'Material de Escritório', 'Outros'
];

export const Finance: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'tax'>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');
  
  // States para Dados Reais
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [yearMonths, setYearMonths] = useState<{ month: number; income: number; expense: number }[]>([]);

  // States para Modal de Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txPatientId, setTxPatientId] = useState('');
  const [txMethod, setTxMethod] = useState('pix');
  const [txStatus, setTxStatus] = useState<'paid' | 'pending'>('paid');
  const [txPayerName, setTxPayerName] = useState('');
  const [txPayerCpf, setTxPayerCpf] = useState('');
  const [txBeneficiaryName, setTxBeneficiaryName] = useState('');
  const [txBeneficiaryCpf, setTxBeneficiaryCpf] = useState('');
  const [txObservation, setTxObservation] = useState('');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { pushToast } = useToast();


  const fetchData = async () => {
    setIsLoading(true);
    try {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        
        const [txs, sum, pts] = await Promise.all([
            api.get<FinancialTransaction[]>('/finance', {
                start: new Date(year, month - 1, 1).toISOString().split('T')[0],
                end: new Date(year, month, 0).toISOString().split('T')[0]
            }),
            api.get<any>('/finance/summary', { month: month.toString(), year: year.toString() }),
            api.get<Patient[]>('/patients'),
        ]);

        setTransactions(txs);
        setSummary(sum);
        setPatients(pts);
        fetchYearData(year);
    } catch (err) {
        console.error('Erro ao buscar dados financeiros:', err);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchYearData = async (year: number) => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
        try {
          const sum = await api.get<any>('/finance/summary', { month: month.toString(), year: year.toString() });
          return { month, income: Number(sum.income) || 0, expense: Number(sum.expense) || 0 };
        } catch { return { month, income: 0, expense: 0 }; }
      })
    );
    setYearMonths(results);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const handleOpenModal = (type: 'income' | 'expense', tx?: FinancialTransaction) => {
      if (tx) {
          setEditingTx(tx);
          setTxType(tx.type);
          setTxAmount(tx.amount.toString());
          setTxDate(tx.date.split('T')[0]);
          setTxDescription(tx.description);
          setTxCategory(tx.category);
          setTxPatientId(tx.patient_id || '');
          setTxMethod(tx.payment_method || 'pix');
          setTxStatus(tx.status === 'pending' ? 'pending' : 'paid');
          setTxPayerName(tx.payer_name || '');
          setTxPayerCpf(tx.payer_cpf || '');
          setTxBeneficiaryName(tx.beneficiary_name || '');
          setTxBeneficiaryCpf(tx.beneficiary_cpf || '');
          setTxObservation(tx.observation || '');
      } else {
          setEditingTx(null);
          setTxType(type);
          setTxAmount('');
          setTxDate(new Date().toISOString().split('T')[0]);
          setTxDescription('');
          setTxCategory('');
          setTxPatientId('');
          setTxMethod('pix');
          setTxStatus('paid');
          setTxPayerName('');
          setTxPayerCpf('');
          setTxBeneficiaryName('');
          setTxBeneficiaryCpf('');
          setTxObservation('');
      }
      setIsModalOpen(true);
  };

  const handleRepeatTransaction = async (id: string) => {
    try {
        await api.post(`/finance/repeat/${id}`, {});
        fetchData();
    } catch (err) {
        console.error('Erro ao repetir lançamento:', err);
    }
  };

  const handleSaveTransaction = async () => {
      if (!txAmount || !txDate || !txCategory) {
          pushToast('error', 'Preencha os campos obrigatórios');
          return;
      }

      const payload = {
          type: txType,
          amount: parseFloat(txAmount),
          date: txDate,
          description: txDescription,
          category: txCategory,
          patient_id: txPatientId || null,
          payment_method: txMethod,
          status: txStatus,
          payer_name: txPayerName,
          payer_cpf: txPayerCpf,
          beneficiary_name: txBeneficiaryName,
          beneficiary_cpf: txBeneficiaryCpf,
          observation: txObservation
      };

      try {
          if (editingTx) {
              await api.put(`/finance/${editingTx.id}`, payload);
          } else {
              await api.post('/finance', payload);
          }
          setIsModalOpen(false);
          fetchData();
      } catch (err) {
          console.error('Erro ao salvar transação:', err);
          pushToast('error', 'Erro ao salvar transação');
      }
  };

  const handleDeleteTransaction = (id: string) => {
      setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
      if (!deleteConfirmId) return;
      try {
          await api.delete(`/finance/${deleteConfirmId}`);
          setDeleteConfirmId(null);
          pushToast('success', 'Lançamento excluído com sucesso');
          fetchData();
      } catch (err) {
          console.error('Erro ao excluir transação:', err);
          pushToast('error', 'Erro ao excluir transação');
      }
  };

  const stats = useMemo(() => {
      const methodTotals: Record<string, number> = {};
      PAYMENT_METHODS.forEach(m => methodTotals[m.id] = 0);
      
      transactions.forEach(tx => {
          if (tx.type === 'income') {
              const method = tx.payment_method?.toLowerCase();
              if (method && methodTotals[method] !== undefined) {
                  methodTotals[method] += tx.amount;
              }
          }
      });

      return {
          revenue: summary.income,
          expense: summary.expense,
          balance: summary.balance,
          methods: methodTotals,
      };
  }, [transactions, summary]);

  const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Annual chart data from real month-by-month fetches
  const yearData = useMemo(() => {
    const withData = yearMonths.filter(m => m.income > 0 || m.expense > 0);
    if (withData.length > 0) {
      return withData.map(m => ({
        label: MONTH_SHORT[m.month - 1],
        revenue: m.income,
        expense: m.expense,
      }));
    }
    return [{
      label: MONTH_SHORT[currentDate.getMonth()],
      revenue: summary.income,
      expense: summary.expense,
    }];
  }, [yearMonths, summary, currentDate]);

  // Category breakdown from current month's transactions
  const categoryData = useMemo(() => {
    const inc: Record<string, number> = {};
    const exp: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.category) return;
      if (tx.type === 'income') inc[tx.category] = (inc[tx.category] || 0) + tx.amount;
      else exp[tx.category] = (exp[tx.category] || 0) + tx.amount;
    });
    return {
      income: Object.entries(inc).sort(([,a],[,b]) => b - a).slice(0, 6),
      expense: Object.entries(exp).sort(([,a],[,b]) => b - a).slice(0, 6),
    };
  }, [transactions]);

  // Top payers from current month
  const topPayers = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type !== 'income') return;
      const name = tx.payer_name || tx.patient_name;
      if (name) map[name] = (map[name] || 0) + tx.amount;
    });
    return Object.entries(map).sort(([,a],[,b]) => b - a).slice(0, 6);
  }, [transactions]);

  const bestMonth = useMemo(() => {
    if (yearData.length === 0) return { label: '-', revenue: 0 };
    return yearData.reduce((best, d) => d.revenue > best.revenue ? d : best, yearData[0]);
  }, [yearData]);

  const worstMonth = useMemo(() => {
    const withRevenue = yearData.filter(d => d.revenue > 0);
    if (withRevenue.length === 0) return { label: '-', revenue: 0 };
    return withRevenue.reduce((worst, d) => d.revenue < worst.revenue ? d : worst, withRevenue[0]);
  }, [yearData]);

  const maxChartValue = Math.max(...yearData.map(d => Math.max(d.revenue, d.expense, 1)));

  // --- CARNÊ LEÃO SIMULATION LOGIC ---
  const taxSimulation = useMemo(() => {
      // Mock data taken from stats for the current month view
      const grossIncome = stats.revenue;
      
      // Expenses categorization mock
      const deductibleExpenses = stats.expense * 0.6; // Assuming 60% are deductible (Rent, CRP, Utilities)
      const nonDeductibleExpenses = stats.expense * 0.4;

      const taxBase = Math.max(0, grossIncome - deductibleExpenses);
      
      // Simple Progressive Tax Table (Brazil 2023/2024 approximation)
      let tax = 0;
      if (taxBase <= 2259.20) {
          tax = 0;
      } else if (taxBase <= 2826.65) {
          tax = (taxBase * 0.075) - 169.44;
      } else if (taxBase <= 3751.05) {
          tax = (taxBase * 0.15) - 381.44;
      } else if (taxBase <= 4664.68) {
          tax = (taxBase * 0.225) - 662.77;
      } else {
          tax = (taxBase * 0.275) - 896.00;
      }
      
      tax = Math.max(0, tax);
      const effectiveRate = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;

      return { grossIncome, deductibleExpenses, nonDeductibleExpenses, taxBase, tax, effectiveRate };
  }, [stats]);


  const renderDashboard = () => (
    <div className="space-y-6 animate-fadeIn">
        {/* Main Chart & Methods breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                             <PieChart size={14} className="text-indigo-500"/>
                             {t('finance.balance')}
                        </h3>
                        <p className="text-lg font-black text-slate-600 mt-0.5">{t('finance.year')}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-wider">
                       <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {t('finance.income')}</div>
                       <div className="flex items-center gap-2 px-2 py-1 bg-rose-50 rounded-lg text-rose-600 border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> {t('finance.expense')}</div>
                    </div>
                </div>
                
                <div className="h-64 flex items-end gap-3 md:gap-4 relative z-10">
                    {yearData.map((m, i) => (
                        <div key={i} className="flex-1 flex gap-1 justify-center items-end h-full group/bar relative">
                            {/* Bars */}
                            <div className="w-full max-w-[12px] bg-emerald-500 rounded-t-full hover:opacity-80 transition-all shadow-lg shadow-emerald-100" style={{ height: `${(m.revenue / maxChartValue) * 100}%` }}></div>
                            <div className="w-full max-w-[12px] bg-rose-400 rounded-t-full hover:opacity-80 transition-all shadow-lg shadow-rose-100" style={{ height: `${(m.expense / maxChartValue) * 100}%` }}></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-[9px] p-3 rounded-2xl opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-all z-20 whitespace-nowrap shadow-2xl border border-white/10 scale-90 group-hover/bar:scale-100">
                                <div className="font-black mb-1.5 text-indigo-300 uppercase tracking-widest">{m.label}</div>
                                <div className="flex justify-between gap-4 font-bold">
                                    <span className="text-emerald-400">REC:</span> 
                                    <span>{formatCurrency(m.revenue)}</span>
                                </div>
                                <div className="flex justify-between gap-4 font-bold border-t border-white/10 mt-1 pt-1">
                                    <span className="text-rose-400">DES:</span> 
                                    <span>{formatCurrency(m.expense)}</span>
                                </div>
                            </div>

                            {/* Label */}
                            <div className="absolute -bottom-7 text-[8px] font-black text-slate-300 uppercase tracking-tighter">{m.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Methods Breakdown */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest mb-8 flex items-center gap-2 text-indigo-500">
                    <Smartphone size={14}/>
                    {t('finance.methods')}
                </h3>
                <div className="space-y-6">
                    {PAYMENT_METHODS.filter(m => (stats.methods[m.id] || 0) > 0).map(method => {
                        const amount = stats.methods[method.id] || 0;
                        const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0;
                        
                        return (
                            <div key={method.id} className="group">
                                <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-lg ${method.color}`}>
                                            {React.cloneElement(method.icon as React.ReactElement, { size: 14 })}
                                        </div>
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{method.label}</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-800 text-right">{formatCurrency(amount)}</div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50">
                                    <div className={`h-full rounded-full ${method.color} transition-all duration-1000 group-hover:brightness-110`} style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                    {Object.values(stats.methods).every(v => v === 0) && (
                         <div className="text-center py-10 opacity-30">
                             <AlertCircle className="mx-auto mb-2" size={24}/>
                             <p className="text-[10px] font-black uppercase tracking-widest">Sem lançamentos</p>
                         </div>
                    )}
                </div>
            </div>
        </div>

        {/* Category Breakdown + Top Payers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Tag size={13} className="text-emerald-500" /> Receitas por Categoria
            </h3>
            {categoryData.income.length === 0 ? (
              <p className="text-center py-8 text-slate-300 text-[10px] font-black uppercase tracking-widest">Sem dados no mês</p>
            ) : (
              <div className="space-y-3">
                {categoryData.income.map(([cat, amount]) => {
                  const pct = summary.income > 0 ? (amount / summary.income) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-slate-600 truncate max-w-[160px]">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                          <span className="text-[11px] font-black text-emerald-600">{formatCurrency(amount)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {categoryData.expense.length > 0 && (
              <>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mt-5 mb-4 flex items-center gap-2">
                  <Tag size={13} className="text-rose-500" /> Despesas por Categoria
                </h3>
                <div className="space-y-3">
                  {categoryData.expense.map(([cat, amount]) => {
                    const pct = summary.expense > 0 ? (amount / summary.expense) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black text-slate-600 truncate max-w-[160px]">{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                            <span className="text-[11px] font-black text-rose-500">{formatCurrency(amount)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Top Payers */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <User size={13} className="text-indigo-500" /> Maiores Pagadores do Mês
            </h3>
            {topPayers.length === 0 ? (
              <p className="text-center py-8 text-slate-300 text-[10px] font-black uppercase tracking-widest">Sem pagadores identificados</p>
            ) : (
              <div className="space-y-3">
                {topPayers.map(([name, amount], idx) => {
                  const pct = summary.income > 0 ? (amount / summary.income) * 100 : 0;
                  const colors = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-400','bg-purple-500','bg-slate-500'];
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl ${colors[idx % colors.length]} flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-black text-slate-700 truncate max-w-[140px]">{name}</span>
                          <span className="text-[11px] font-black text-slate-800">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ticket médio */}
            {transactions.filter(t => t.type === 'income').length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ticket Médio</p>
                  <p className="text-lg font-black text-slate-800">
                    {formatCurrency(summary.income / transactions.filter(t => t.type === 'income').length)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Atendimentos</p>
                  <p className="text-lg font-black text-slate-800">{transactions.filter(t => t.type === 'income').length}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pendentes</p>
                  <p className="text-lg font-black text-amber-600">
                    {formatCurrency(transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((s,t) => s + t.amount, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all overflow-hidden relative">
                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 opacity-20 pointer-events-none"></div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 relative z-10">
                    <TrendingUp size={28} />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{t('finance.bestMonth')}</p>
                    <p className="text-base font-black text-slate-800 uppercase tracking-tighter">{bestMonth.label} <span className="opacity-40 text-sm font-bold bg-slate-100 px-2 py-0.5 rounded-lg ml-1">{formatCurrency(bestMonth.revenue)}</span></p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-all overflow-hidden relative">
                <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-8 -mt-8 opacity-20 pointer-events-none"></div>
                <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 relative z-10">
                    <TrendingDown size={28} />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">{t('finance.worstMonth')}</p>
                    <p className="text-base font-black text-slate-800 uppercase tracking-tighter">{worstMonth.label} <span className="opacity-40 text-sm font-bold bg-slate-100 px-2 py-0.5 rounded-lg ml-1">{formatCurrency(worstMonth.revenue)}</span></p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all overflow-hidden relative">
                <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 opacity-20 pointer-events-none"></div>
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 relative z-10">
                    <PieChart size={28} />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">{t('finance.avgMonthly')}</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">{formatCurrency(yearData.length > 0 ? yearData.reduce((s, d) => s + d.revenue, 0) / yearData.length : 0)}</p>
                </div>
            </div>
        </div>
    </div>
  );

  const renderDailyFlow = () => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
         {/* Table Header Controls */}
         <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
             <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200">
                     <ListIcon size={20}/>
                 </div>
                 <div>
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{t('finance.daily')}</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{transactions.length} LANÇAMENTOS</p>
                 </div>
             </div>
             
             <button className="h-11 px-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all uppercase tracking-widest flex items-center gap-2">
                 <Download size={14} /> {t('finance.export')}
             </button>
         </div>

         {/* Transactions List */}
         <div className="divide-y divide-slate-50 overflow-y-auto max-h-[600px] custom-scrollbar">
            {transactions.length === 0 ? (
                <div className="p-32 text-center flex flex-col items-center gap-6 text-slate-300">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 border-dashed">
                        <AlertCircle size={48} className="opacity-20" />
                    </div>
                    <p className="font-black text-[10px] uppercase tracking-[0.3em]">Nenhum lançamento encontrado</p>
                </div>
            ) : (
                transactions.map((tx) => (
                    <div key={tx.id} className="group hover:bg-slate-50 transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                        <div className="flex items-center gap-5 md:flex-1">
                            {/* Date Badge */}
                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">
                                    {new Date(tx.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                </span>
                                <span className="text-lg font-black text-slate-800 leading-none">
                                    {new Date(tx.date).getDate().toString().padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex flex-col overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`h-2 w-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    <h4 className="font-black text-slate-700 text-sm capitalize truncate max-w-[200px] md:max-w-md">{tx.description}</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                                        {tx.category}
                                    </span>
                                    {tx.patient_name && (
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50 flex items-center gap-1">
                                            <User size={10} /> {tx.patient_name}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50 flex items-center gap-1">
                                        <CreditCard size={10} /> {tx.payment_method}
                                    </span>
                                    {tx.payer_name && (
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50 flex items-center gap-1">
                                            <Banknote size={10} /> De: {tx.payer_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-10">
                            <div className="text-right">
                                <p className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${tx.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${tx.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {tx.status === 'paid' ? t('finance.status.paid') : t('finance.status.pending')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleRepeatTransaction(tx.id)}
                                    title="Repetir para próximo mês"
                                    className="p-3 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-emerald-600 transition-all border border-slate-100"
                                >
                                    <Calendar size={16} />
                                </button>
                                <button 
                                    onClick={() => handleOpenModal(tx.type, tx)}
                                    className="p-3 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-slate-100"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-3 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-rose-600 transition-all border border-slate-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
         </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><DollarSign size={20}/></div>
                  {t('finance.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('finance.subtitle')}</p>
          </div>
          <div className="flex gap-2">
              <button 
                  onClick={() => handleOpenModal('income')} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 tracking-widest"
              >
                  <Plus size={16} /> {t('finance.addIncome')}
              </button>
              <button 
                  onClick={() => handleOpenModal('expense')} 
                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-rose-100 transition-all active:scale-95 tracking-widest"
              >
                  <Plus size={16} /> {t('finance.addExpense')}
              </button>
              <button 
                  onClick={() => setActiveTab('tax')} // Or a specific AI trigger
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 tracking-widest"
              >
                  <Briefcase size={16} /> AI Insights
              </button>
          </div>
      </div>

      {/* STATS BAR (KPIs Restyled) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <TrendingUp size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">{t('finance.totalRevenue')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(summary.income)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <TrendingDown size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">{t('finance.expenses')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(summary.expense)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Wallet size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-indigo-500">{t('finance.netProfit')}</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(summary.balance)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & TABS BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center z-40">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
               {[
                   { id: 'dashboard', label: t('finance.dashboard'), icon: <PieChart size={14}/> },
                   { id: 'daily', label: t('finance.daily'), icon: <ListIcon size={14}/> },
                   { id: 'tax', label: t('finance.fiscal'), icon: <Calculator size={14}/> }
               ].map(tab => (
                   <button 
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id as any)}
                       className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 flex-1 lg:flex-none justify-center ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-indigo-400'}`}
                   >
                       {tab.icon}
                       {tab.label}
                   </button>
               ))}
           </div>

           <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button 
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all"
                >
                    <ArrowUpRight className="rotate-[225deg]" size={16}/>
                </button>
                <div className="flex items-center gap-2 px-3 text-sm font-black text-slate-700 uppercase tracking-tighter text-center">
                   <Calendar size={16} className="text-indigo-500"/>
                   {currentDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button 
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 transition-all"
                >
                    <ArrowUpRight size={16}/>
                </button>
           </div>
      </div>

      {/* Content Switch */}
      <div className="opacity-100 transition-opacity duration-300">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-40 gap-6 text-indigo-500">
                <div className="relative">
                    <Loader2 className="animate-spin" size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <DollarSign size={20} className="animate-pulse" />
                    </div>
                </div>
                <span className="font-black text-[10px] uppercase tracking-[0.4em] opacity-30">Processando Fluxo...</span>
            </div>
          ) : (
            <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'daily' && renderDailyFlow()}
                {activeTab === 'tax' && (
                  <FinancialHealth
                    monthSummaries={yearMonths.map(m => ({
                      month: m.month,
                      year: currentDate.getFullYear(),
                      income: m.income,
                      expense: m.expense,
                      balance: m.income - m.expense,
                    }))}
                    selectedYear={currentDate.getFullYear()}
                  />
                )}
            </>
          )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-lg"
        title={editingTx ? 'Revisar Lançamento' : txType === 'income' ? t('finance.addIncome') : t('finance.addExpense')}
        subtitle={txType === 'income' ? 'CREDITAR EM CAIXA' : 'DEBITAR EM CAIXA'}
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
            <button 
              onClick={handleSaveTransaction}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'}`}
            >
                <CheckCircle2 size={16}/>
                {editingTx ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR'}
            </button>
          </>
        }
      >
          <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.form.amount')}</label>
                      <div className="relative group">
                          <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 ${txType === 'income' ? 'text-emerald-500' : 'text-rose-500'}`} size={16} />
                          <input 
                            type="number"
                            value={txAmount}
                            onChange={e => setTxAmount(e.target.value)}
                            placeholder="0,00"
                            className={`w-full text-lg font-black p-3.5 pl-10 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white transition-all ${txType === 'income' ? 'focus:border-emerald-400 text-emerald-700' : 'focus:border-rose-400 text-rose-700'}`}
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.date')}</label>
                      <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="date"
                            value={txDate}
                            onChange={e => setTxDate(e.target.value)}
                            className="w-full text-xs font-black p-3.5 pl-11 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all text-slate-700"
                          />
                      </div>
                  </div>
              </div>

              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.form.category')}</label>
                  <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        value={txCategory}
                        onChange={e => setTxCategory(e.target.value)}
                        className="w-full text-xs font-black p-3.5 pl-11 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 appearance-none transition-all"
                      >
                          <option value="">Selecione uma categoria</option>
                          {(txType === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
                              <option key={c} value={c}>{c}</option>
                          ))}
                      </select>
                  </div>
              </div>
              {txType === 'income' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {!txPatientId && !editingTx ? (
                          <button 
                            type="button"
                            onClick={() => setTxPatientId('select_pending')}
                            className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                          >
                              <Plus size={14} /> Vincular Paciente
                          </button>
                      ) : (
                          <div>
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest px-1">{t('finance.form.patient')}</label>
                                  <button onClick={() => setTxPatientId('')} className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline">Remover</button>
                              </div>
                              <div className="relative group">
                                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                                  <select 
                                    value={txPatientId === 'select_pending' ? '' : txPatientId}
                                    onChange={e => setTxPatientId(e.target.value)}
                                    className="w-full text-xs font-black p-3 pl-11 rounded-xl border border-indigo-100 bg-white outline-none focus:ring-4 focus:ring-indigo-100 appearance-none transition-all"
                                  >
                                        <option value="">Selecionar paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                                        ))}
                                  </select>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Pagador (Nome)</label>
                      <Input 
                        value={txPayerName}
                        onChange={e => setTxPayerName(e.target.value)}
                        placeholder="Nome no extrato/pix"
                      />
                  </div>
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Pagador (CPF)</label>
                      <Input 
                        value={txPayerCpf}
                        onChange={e => setTxPayerCpf(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Beneficiário (Nome)</label>
                      <Input 
                        value={txBeneficiaryName}
                        onChange={e => setTxBeneficiaryName(e.target.value)}
                        placeholder="Caso não seja você"
                      />
                  </div>
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Beneficiário (CPF)</label>
                      <Input 
                        value={txBeneficiaryCpf}
                        onChange={e => setTxBeneficiaryCpf(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                  </div>
              </div>

              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Observações / Detalhes</label>
                  <TextArea 
                    value={txObservation}
                    onChange={e => setTxObservation(e.target.value)}
                    placeholder="Detalhes adicionais do lançamento..."
                  />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.form.method')}</label>
                      <select 
                        value={txMethod}
                        onChange={e => setTxMethod(e.target.value)}
                        className="w-full text-xs font-black p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white appearance-none transition-all"
                      >
                          {PAYMENT_METHODS.map(m => (
                              <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.status')}</label>
                      <select 
                        value={txStatus}
                        onChange={e => setTxStatus(e.target.value as any)}
                        className="w-full text-xs font-black p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white appearance-none transition-all"
                      >
                          <option value="paid">{t('finance.status.paid')}</option>
                          <option value="pending">{t('finance.status.pending')}</option>
                      </select>
                  </div>
              </div>

              <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">{t('finance.form.description')}</label>
                  <textarea 
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                    placeholder="Detalhes internos do lançamento..."
                    rows={2}
                    className="w-full text-xs font-bold p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all resize-none"
                  />
              </div>
          </div>
      </Modal>

      {/* DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Excluir Lançamento?</h3>
              <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
                Esta ação é irreversível e afetará seu balanço mensal.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   CANCELAR
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
