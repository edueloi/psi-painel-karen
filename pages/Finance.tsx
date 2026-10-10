
import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, CreditCard,
  Wallet, PieChart, ArrowUpRight, ArrowDownRight, ArrowLeft, Filter, Download,
  Calculator, AlertCircle, Trash2, Loader2,
  Plus, Edit3, X, Tag, User, List as ListIcon, Smartphone, Banknote, Receipt, FileText, CheckCircle2, Sparkles,
  Inbox, CheckCircle, XCircle, Clock, Eye, Paperclip, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { FinancialTransaction, Patient } from '../types';
import {
  Button, IconButton, ConfirmModal, Modal, ModalFooter, PageWrapper, SectionTitle,
  StatGrid, StatCard, PanelCard, ContentCard, FormRow, Tabs, Badge, EmptyState,
  FilterLine, FilterLineSection, GridTable, usePagination, Input, Select, Textarea,
} from '../components/UI';
import type { Column } from '../components/UI';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useToast } from '../contexts/ToastContext';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { FinancialHealth } from '../components/Finance/FinancialHealth';
import { AuraContabil } from '../components/AI/AuraContabil';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', Icon: Smartphone, color: 'bg-emerald-500' },
  { id: 'credit', label: 'Crédito', Icon: CreditCard, color: 'bg-violet-500' },
  { id: 'debit', label: 'Débito', Icon: CreditCard, color: 'bg-sky-500' },
  { id: 'cash', label: 'Dinheiro', Icon: Banknote, color: 'bg-green-600' },
  { id: 'transfer', label: 'Transferência', Icon: ArrowUpRight, color: 'bg-slate-500' },
  { id: 'check', label: 'Cheque', Icon: Receipt, color: 'bg-amber-500' },
  { id: 'courtesy', label: 'Cortesia', Icon: Wallet, color: 'bg-rose-400' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const FINANCE_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'daily', label: 'Fluxo diário', icon: ListIcon },
  { id: 'tax', label: 'Fiscal', icon: Calculator },
  { id: 'portal', label: 'Portal', icon: Inbox },
] as const;
type FinanceTab = typeof FINANCE_TABS[number]['id'];

const TX_MODAL_TABS = [
  { id: 'lancamento', label: 'Lançamento', icon: DollarSign },
  { id: 'detalhes', label: 'Pagador e detalhes', icon: FileText },
] as const;
type TxModalTab = typeof TX_MODAL_TABS[number]['id'];

const CATEGORIES_INCOME = [
    'Sessão Individual', 'Pacote de Sessões', 'Avaliação', 'Supervisão', 'Palestra/Curso', 'Outros'
];

const CATEGORIES_EXPENSE = [
    'Aluguel/Sublocação', 'Marketing/Anúncios', 'Impostos/CRP', 'Software/Sistemas', 'Educação/Livros', 'Material de Escritório', 'Outros'
];

export const Finance: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user, isAdmin, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');
  
  // States para Dados Reais
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [yearMonths, setYearMonths] = useState<{ month: number; income: number; expense: number; sessions: number }[]>([]);

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
  
  const [txModalTab, setTxModalTab] = useState<TxModalTab>('lancamento');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAuraOpen, setIsAuraOpen] = useState(false);
  const { pushToast } = useToast();

  // States para Pagamentos do Portal
  const [portalPayments, setPortalPayments] = useState<any[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalReviewing, setPortalReviewing] = useState<string | null>(null);
  const [portalAttachModal, setPortalAttachModal] = useState<any | null>(null);
  const [portalDeleteConfirm, setPortalDeleteConfirm] = useState<string | null>(null);


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
    try {
      const rows = await api.get<any[]>('/finance/summary-year', { year: year.toString() });
      const byMonth = new Map((rows || []).map(row => [Number(row.month), row]));
      setYearMonths(Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const row = byMonth.get(month);
        return {
          month,
          income: Number(row?.income) || 0,
          expense: Number(row?.expense) || 0,
          sessions: Number(row?.sessions) || 0,
        };
      }));
    } catch {
      setYearMonths(Array.from({ length: 12 }, (_, index) => ({ month: index + 1, income: 0, expense: 0, sessions: 0 })));
    }
  };

  const fetchPortalPayments = async () => {
    setPortalLoading(true);
    try {
      const data = await api.get<any[]>('/patient-portal/admin/payments');
      setPortalPayments(data);
    } catch (err) {
      console.error('Erro ao buscar pagamentos do portal:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const reviewPortalPayment = async (id: string, status: 'confirmed' | 'rejected') => {
    setPortalReviewing(id);
    try {
      await api.patch(`/patient-portal/admin/payments/${id}`, { status });
      setPortalPayments(prev => prev.map(p => p.id === id ? { ...p, status, reviewed_at: new Date().toISOString() } : p));
      pushToast('success', status === 'confirmed' ? 'Pagamento confirmado!' : 'Pagamento recusado.');
    } catch {
      pushToast('error', 'Erro ao atualizar pagamento.');
    } finally {
      setPortalReviewing(null);
    }
  };

  const deletePortalPayment = async (id: string) => {
    try {
      await api.delete(`/patient-portal/admin/payments/${id}`);
      setPortalPayments(prev => prev.filter(p => p.id !== id));
      pushToast('success', 'Declaração removida.');
    } catch {
      pushToast('error', 'Erro ao remover pagamento.');
    } finally {
      setPortalDeleteConfirm(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    fetchPortalPayments();
  }, []);

  // Sincronização em tempo real: recarrega quando outro dispositivo/aba
  // cria, edita ou exclui um lançamento financeiro na mesma clínica.
  useRealtimeSync('finance.created', () => fetchData());
  useRealtimeSync('finance.updated', () => fetchData());
  useRealtimeSync('finance.deleted', () => fetchData());

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
      setTxModalTab('lancamento');
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

      if (isSaving) return;
      setIsSaving(true);
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
      } finally {
          setIsSaving(false);
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

  const dailyPagination = usePagination(transactions, 15);

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


  const PORTAL_METHOD_LABELS: Record<string, string> = {
    pix: 'PIX', credit: 'Crédito', debit: 'Débito', cash: 'Dinheiro', transfer: 'Transferência', check: 'Cheque',
  };

  const renderPortalPayments = () => {
    const pending = portalPayments.filter(p => p.status === 'pending');
    const reviewed = portalPayments.filter(p => p.status !== 'pending');

    const PortalStatusBadge = ({ status }: { status: string }) => {
      if (status === 'pending') return <Badge color="warning" size="sm" icon={<Clock size={10} />}>Aguardando</Badge>;
      if (status === 'confirmed') return <Badge color="success" size="sm" icon={<CheckCircle size={10} />}>Confirmado</Badge>;
      return <Badge color="danger" size="sm" icon={<XCircle size={10} />}>Recusado</Badge>;
    };

    const renderPaymentCard = (p: any) => (
      <ContentCard key={p.id} padding="md" className="flex flex-col md:flex-row md:items-center gap-3 hover:border-primary-200 transition-all">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-slate-800 text-sm tabular-nums">{formatCurrency(Number(p.amount))}</span>
            <PortalStatusBadge status={p.status} />
          </div>
          <p className="text-xs text-slate-700 font-medium">{p.patient_name}</p>
          <p className="text-[11px] text-slate-500">{new Date(p.payment_date).toLocaleDateString('pt-BR')} · {PORTAL_METHOD_LABELS[p.payment_method] || p.payment_method}</p>
          {p.notes && <p className="text-[11px] text-slate-500 italic mt-1">"{p.notes}"</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {p.attachments?.length > 0 && (
            <Button variant="outline" size="sm" iconLeft={<Paperclip size={14} />} onClick={() => setPortalAttachModal(p)}>
              {p.attachments.length} anexo{p.attachments.length > 1 ? 's' : ''}
            </Button>
          )}
          {p.status === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                loading={portalReviewing === p.id}
                disabled={portalReviewing === p.id}
                iconLeft={<CheckCircle size={14} />}
                onClick={() => reviewPortalPayment(p.id, 'confirmed')}
              >
                Confirmar
              </Button>
              <Button
                variant="softDanger"
                size="sm"
                disabled={portalReviewing === p.id}
                iconLeft={<XCircle size={14} />}
                onClick={() => reviewPortalPayment(p.id, 'rejected')}
              >
                Recusar
              </Button>
            </>
          )}
          <IconButton variant="ghost" size="sm" aria-label="Remover declaração" title="Remover declaração" onClick={() => setPortalDeleteConfirm(p.id)}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </ContentCard>
    );

    return (
      <div className="space-y-3">
        {portalLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />Carregando…
          </div>
        ) : portalPayments.length === 0 ? (
          <ContentCard>
            <EmptyState icon={Inbox} title="Nenhuma declaração ainda" description="Os pagamentos declarados pelos pacientes no portal aparecem aqui." />
          </ContentCard>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-amber-700 flex items-center gap-2">
                  <Clock size={14} /> Aguardando revisão ({pending.length})
                </h3>
                {pending.map(renderPaymentCard)}
              </div>
            )}
            {reviewed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Revisados ({reviewed.length})
                </h3>
                {reviewed.map(renderPaymentCard)}
              </div>
            )}
          </>
        )}

        {/* Modal de anexos */}
        {portalAttachModal && (
          <Modal
            isOpen={true}
            onClose={() => setPortalAttachModal(null)}
            title="Comprovantes"
            size="md"
            footer={<ModalFooter><Button variant="outline" size="sm" onClick={() => setPortalAttachModal(null)}>Fechar</Button></ModalFooter>}
          >
            <div className="space-y-3">
              {portalAttachModal.attachments.map((a: any) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.file_name || a.file_url || '');
                return (
                  <div key={a.id} className="rounded-lg border border-slate-200 overflow-hidden">
                    {isImage && (
                      <div className="bg-slate-50 border-b border-slate-100 max-h-64 overflow-hidden flex items-center justify-center">
                        <img src={a.file_url} alt={a.file_name} className="max-w-full max-h-64 object-contain" />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <Paperclip size={14} className="text-primary-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-[120px]">{a.file_name || 'Anexo'}</span>
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Visualizar"
                        className="inline-flex h-7 items-center gap-1 px-2.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                        <Eye size={14} /> Ver
                      </a>
                      <a href={a.file_url} download={a.file_name || 'comprovante'} title="Baixar"
                        className="inline-flex h-7 items-center gap-1 px-2.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                        <Download size={14} /> Baixar
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </Modal>
        )}

        {/* Confirmação de deleção */}
        <ConfirmModal
          isOpen={!!portalDeleteConfirm}
          onClose={() => setPortalDeleteConfirm(null)}
          onConfirm={() => portalDeleteConfirm && deletePortalPayment(portalDeleteConfirm)}
          title="Remover declaração"
          message="Tem certeza? Isso também removerá o lançamento no Livro Caixa se houver."
          confirmLabel="Remover"
          variant="danger"
        />
      </div>
    );
  };

  const incomeTxs = transactions.filter(tx => tx.type === 'income');

  const renderDashboard = () => (
    <div className="space-y-3">
      {/* Gráfico anual + formas de pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <PanelCard
          className="lg:col-span-2"
          title={t('finance.balance')}
          description={t('finance.year')}
          icon={PieChart}
          action={
            <div className="flex items-center gap-2">
              <Badge color="success" size="sm" dot>{t('finance.income')}</Badge>
              <Badge color="danger" size="sm" dot>{t('finance.expense')}</Badge>
            </div>
          }
        >
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={56} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'revenue' ? t('finance.income') : t('finance.expense')]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title={t('finance.methods')} icon={Smartphone}>
          <div className="space-y-3">
            {PAYMENT_METHODS.filter(m => (stats.methods[m.id] || 0) > 0).map(method => {
              const amount = stats.methods[method.id] || 0;
              const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0;
              return (
                <div key={method.id}>
                  <div className="flex justify-between items-center mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center text-white shrink-0 ${method.color}`}>
                        <method.Icon size={14} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 truncate">{method.label}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">{formatCurrency(amount)}</div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${method.color} transition-all`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.values(stats.methods).every(v => v === 0) && (
              <EmptyState icon={AlertCircle} title="Sem lançamentos" />
            )}
          </div>
        </PanelCard>
      </div>

      {/* Categorias + maiores pagadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <PanelCard title="Receitas e despesas por categoria" icon={Tag}>
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Receitas por Categoria</h4>
          {categoryData.income.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-[11px]">Sem dados no mês</p>
          ) : (
            <div className="space-y-3">
              {categoryData.income.map(([cat, amount]) => {
                const pct = summary.income > 0 ? (amount / summary.income) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-medium text-slate-600 truncate">{cat}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">{pct.toFixed(0)}%</span>
                        <span className="text-[11px] font-medium text-emerald-700 tabular-nums">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {categoryData.expense.length > 0 && (
            <>
              <h4 className="text-xs font-semibold text-slate-700 mt-4 mb-2">Despesas por Categoria</h4>
              <div className="space-y-3">
                {categoryData.expense.map(([cat, amount]) => {
                  const pct = summary.expense > 0 ? (amount / summary.expense) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium text-slate-600 truncate">{cat}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-500">{pct.toFixed(0)}%</span>
                          <span className="text-[11px] font-medium text-red-600 tabular-nums">{formatCurrency(amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PanelCard>

        <PanelCard title="Maiores Pagadores do Mês" icon={User}>
          {topPayers.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-[11px]">Sem pagadores identificados</p>
          ) : (
            <div className="space-y-3">
              {topPayers.map(([name, amount], idx) => {
                const pct = summary.income > 0 ? (amount / summary.income) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center text-[11px] font-medium shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium text-slate-700 truncate">{name}</span>
                        <span className="text-[11px] font-medium text-slate-800 tabular-nums shrink-0">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {incomeTxs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-slate-500">Ticket Médio</p>
                <p className="text-sm font-medium text-slate-800 tabular-nums">{formatCurrency(summary.income / incomeTxs.length)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Atendimentos</p>
                <p className="text-sm font-medium text-slate-800">{incomeTxs.length}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Pendentes</p>
                <p className="text-sm font-medium text-amber-700 tabular-nums">
                  {formatCurrency(incomeTxs.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0))}
                </p>
              </div>
            </div>
          )}
        </PanelCard>
      </div>

      {/* Comparativos */}
      <StatGrid cols={3}>
        <StatCard title={t('finance.bestMonth')} value={`${bestMonth.label} · ${formatCurrency(bestMonth.revenue)}`} icon={TrendingUp} color="success" />
        <StatCard title={t('finance.worstMonth')} value={`${worstMonth.label} · ${formatCurrency(worstMonth.revenue)}`} icon={TrendingDown} color="danger" />
        <StatCard title={t('finance.avgMonthly')} value={formatCurrency(yearData.length > 0 ? yearData.reduce((s, d) => s + d.revenue, 0) / yearData.length : 0)} icon={PieChart} color="info" />
      </StatGrid>
    </div>
  );

  const dailyColumns: Column<FinancialTransaction>[] = [
    {
      header: 'Data',
      className: 'whitespace-nowrap',
      render: tx => <span className="text-xs whitespace-nowrap">{new Date(tx.date).toLocaleDateString('pt-BR')}</span>,
    },
    {
      header: 'Descrição',
      render: tx => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-xs font-medium text-slate-800 truncate">{tx.description}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {[tx.patient_name, tx.payer_name ? `De: ${tx.payer_name}` : ''].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    { header: 'Categoria', render: tx => tx.category ? <Badge size="sm">{tx.category}</Badge> : <span className="text-[11px] text-slate-400">-</span> },
    { header: 'Método', render: tx => <span className="text-xs text-slate-600">{tx.payment_method}</span> },
    {
      header: 'Status',
      render: tx => (
        <Badge size="sm" dot color={tx.status === 'paid' ? 'success' : 'warning'}>
          {tx.status === 'paid' ? t('finance.status.paid') : t('finance.status.pending')}
        </Badge>
      ),
    },
    {
      header: 'Valor',
      className: 'text-right',
      headerClassName: 'text-right',
      render: tx => (
        <span className={`text-xs font-semibold tabular-nums whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-700' : 'text-red-600'}`}>
          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      header: '',
      className: 'text-right',
      render: tx => hasPermission('manage_payments') ? (
        <div className="flex justify-end gap-1">
          <IconButton variant="ghost" size="xs" aria-label="Repetir para próximo mês" title="Repetir para próximo mês" onClick={() => handleRepeatTransaction(tx.id)}>
            <Calendar size={14} />
          </IconButton>
          <IconButton variant="ghost" size="xs" aria-label="Editar lançamento" title="Editar" onClick={() => handleOpenModal(tx.type, tx)}>
            <Edit3 size={14} />
          </IconButton>
          <IconButton variant="ghost" size="xs" aria-label="Excluir lançamento" title="Excluir" onClick={() => handleDeleteTransaction(tx.id)}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ) : null,
    },
  ];

  const renderDailyFlow = () => (
    <div className="space-y-3">
      <FilterLine>
        <FilterLineSection grow>
          <span className="text-xs text-slate-500">{transactions.length} lançamento{transactions.length === 1 ? '' : 's'}</span>
        </FilterLineSection>
        {hasPermission('view_financial_reports') && (
          <FilterLineSection align="right">
            <Button variant="outline" size="sm" iconLeft={<Download size={14} />}>{t('finance.export')}</Button>
          </FilterLineSection>
        )}
      </FilterLine>
      <ContentCard padding="none">
        <GridTable<FinancialTransaction>
          noDesktopCard
          data={dailyPagination.paginatedData}
          columns={dailyColumns}
          keyExtractor={tx => tx.id}
          emptyMessage="Nenhum lançamento encontrado"
          pagination={{
            total: transactions.length,
            page: dailyPagination.page,
            pageSize: dailyPagination.pageSize,
            onPageChange: dailyPagination.setPage,
            onPageSizeChange: dailyPagination.setPageSize,
          }}
        />
      </ContentCard>
    </div>
  );

  const pendingPortalCount = portalPayments.filter(p => p.status === 'pending').length;
  const financeTabs = FINANCE_TABS.map(tab => ({
    ...tab,
    label: tab.id === 'dashboard' ? t('finance.dashboard') : tab.id === 'daily' ? t('finance.daily') : tab.id === 'tax' ? t('finance.fiscal') : 'Portal',
    badge: tab.id === 'portal' && pendingPortalCount > 0 ? pendingPortalCount : undefined,
  }));

  const typeColor = txType === 'income' ? 'success' : 'danger';

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={DollarSign}
          title={t('finance.title')}
          description={t('finance.subtitle')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/')}>
                Voltar
              </Button>
              {hasPermission('manage_payments') && (
                <>
                  <Button variant="success" size="sm" onClick={() => handleOpenModal('income')} iconLeft={<Plus size={14} />}>
                    {t('finance.addIncome')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleOpenModal('expense')} iconLeft={<Plus size={14} />}>
                    {t('finance.addExpense')}
                  </Button>
                </>
              )}
              {hasPermission('view_financial_reports') && hasPermission('access_ai_features') && (
                <Button variant="outline" size="sm" onClick={() => setIsAuraOpen(true)} iconLeft={<Sparkles size={14} />}>
                  Aura Fiscal
                </Button>
              )}
            </div>
          }
        />

        <StatGrid cols={3}>
          <StatCard title={t('finance.totalRevenue')} value={formatCurrency(summary.income)} icon={TrendingUp} color="success" />
          <StatCard title={t('finance.expenses')} value={formatCurrency(summary.expense)} icon={TrendingDown} color="danger" />
          <StatCard title={t('finance.netProfit')} value={formatCurrency(summary.balance)} icon={Wallet} color="info" />
        </StatGrid>

        <Tabs<FinanceTab> items={financeTabs} value={activeTab} onChange={setActiveTab} label="Visões financeiras">
          <div className="space-y-3">
            {activeTab !== 'portal' && (
              <FilterLine>
                <FilterLineSection>
                  <IconButton
                    variant="outline"
                    size="sm"
                    aria-label="Mês anterior"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  >
                    <ChevronLeft size={14} />
                  </IconButton>
                  <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-700 capitalize">
                    <Calendar size={14} className="text-primary-600" />
                    {currentDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <IconButton
                    variant="outline"
                    size="sm"
                    aria-label="Próximo mês"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  >
                    <ChevronRight size={14} />
                  </IconButton>
                </FilterLineSection>
              </FilterLine>
            )}

            {isLoading && activeTab !== 'portal' ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />Processando fluxo…
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
                      sessions: m.sessions,
                    }))}
                    selectedYear={currentDate.getFullYear()}
                  />
                )}
                {activeTab === 'portal' && renderPortalPayments()}
              </>
            )}
          </div>
        </Tabs>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        title={editingTx ? 'Revisar Lançamento' : txType === 'income' ? t('finance.addIncome') : t('finance.addExpense')}
        subtitle={txType === 'income' ? 'Creditar em caixa' : 'Debitar em caixa'}
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSaving}>{t('common.cancel')}</Button>
            <Button
              variant={typeColor}
              size="sm"
              loading={isSaving}
              disabled={isSaving}
              onClick={handleSaveTransaction}
              iconLeft={<CheckCircle2 size={14} />}
            >
              {editingTx ? 'Salvar alterações' : 'Confirmar'}
            </Button>
          </ModalFooter>
        }
      >
        <Tabs<TxModalTab> items={TX_MODAL_TABS} value={txModalTab} onChange={setTxModalTab} label="Seções do lançamento">
          {txModalTab === 'lancamento' && (
            <div className="space-y-3">
              <FormRow>
                <Input
                  label={t('finance.form.amount')}
                  type="number"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="0,00"
                  iconLeft={<DollarSign size={14} />}
                />
                <Input
                  label={t('finance.date')}
                  type="date"
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                />
              </FormRow>

              <Select label={t('finance.form.category')} value={txCategory} onChange={e => setTxCategory(e.target.value)} iconLeft={<Tag size={14} />}>
                <option value="">Selecione uma categoria</option>
                {(txType === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>

              {txType === 'income' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {!txPatientId && !editingTx ? (
                    <Button type="button" variant="ghost" size="sm" iconLeft={<Plus size={14} />} onClick={() => setTxPatientId('select_pending')}>
                      Vincular Paciente
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-600">{t('finance.form.patient')}</span>
                        <Button variant="ghost" size="xs" onClick={() => setTxPatientId('')}>Remover</Button>
                      </div>
                      <Select
                        aria-label={t('finance.form.patient')}
                        value={txPatientId === 'select_pending' ? '' : txPatientId}
                        onChange={e => setTxPatientId(e.target.value)}
                        iconLeft={<User size={14} />}
                      >
                        <option value="">Selecionar paciente...</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <FormRow>
                <Select label={t('finance.form.method')} value={txMethod} onChange={e => setTxMethod(e.target.value)}>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </Select>
                <Select label={t('finance.status')} value={txStatus} onChange={e => setTxStatus(e.target.value as any)}>
                  <option value="paid">{t('finance.status.paid')}</option>
                  <option value="pending">{t('finance.status.pending')}</option>
                </Select>
              </FormRow>
            </div>
          )}

          {txModalTab === 'detalhes' && (
            <div className="space-y-3">
              <FormRow>
                <Input label="Pagador (Nome)" value={txPayerName} onChange={e => setTxPayerName(e.target.value)} placeholder="Nome no extrato/pix" />
                <Input label="Pagador (CPF)" value={txPayerCpf} onChange={e => setTxPayerCpf(e.target.value)} placeholder="000.000.000-00" />
                <Input label="Beneficiário (Nome)" value={txBeneficiaryName} onChange={e => setTxBeneficiaryName(e.target.value)} placeholder="Caso não seja você" />
                <Input label="Beneficiário (CPF)" value={txBeneficiaryCpf} onChange={e => setTxBeneficiaryCpf(e.target.value)} placeholder="000.000.000-00" />
              </FormRow>
              <Textarea
                label="Observações / Detalhes"
                value={txObservation}
                onChange={e => setTxObservation(e.target.value)}
                placeholder="Detalhes adicionais do lançamento..."
              />
              <Textarea
                label={t('finance.form.description')}
                value={txDescription}
                onChange={e => setTxDescription(e.target.value)}
                placeholder="Detalhes internos do lançamento..."
                rows={2}
              />
            </div>
          )}
        </Tabs>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Excluir lançamento"
        message="Esta ação é irreversível e afetará seu balanço mensal."
        confirmLabel="Confirmar exclusão"
      />

      <AuraContabil isOpen={isAuraOpen} onClose={() => setIsAuraOpen(false)} />
    </PageWrapper>
  );
};
