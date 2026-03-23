
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen, Plus, ArrowLeft, Search,
  TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight,
  Edit3, Trash2, RefreshCw, CheckCircle2, Clock, X, FileText,
  User, AlertCircle, Loader2, Download, Upload, DollarSign,
  Calendar, CreditCard, Filter, LayoutGrid, List,
  Sparkles
} from 'lucide-react';
import { Modal } from '../components/UI/Modal';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { DatePicker } from '../components/UI/DatePicker';
import { GridTable, Column } from '../components/UI/GridTable';
import { AppCard } from '../components/UI/AppCard';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FinancialHealth } from '@/components/Finance/FinancialHealth';
import { AuraContabil } from '@/components/AI/AuraContabil';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  status: 'paid' | 'pending' | 'cancelled';
  payer_name?: string;
  payer_cpf?: string;
  beneficiary_name?: string;
  beneficiary_cpf?: string;
  patient_name?: string;
  observation?: string;
}

interface MonthSummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: 'pix',      label: 'PIX (Mais comum)' },
  { id: 'credit',   label: 'Cartão de Crédito' },
  { id: 'debit',    label: 'Cartão de Débito' },
  { id: 'cash',     label: 'Dinheiro / Espécie' },
  { id: 'transfer', label: 'Transferência Bancária' },
  { id: 'check',    label: 'Cheque' },
  { id: 'courtesy', label: 'Cortesia' },
];

const CATEGORIES_INCOME = [
  'Geral', 'Sessão Individual', 'Pacote de Sessões', 'Avaliação', 'Supervisão', 'Palestra/Curso', 'Outros',
];

const CATEGORIES_EXPENSE = [
  'Aluguel/Sublocação', 'Marketing/Anúncios', 'Impostos/CRP', 'Software/Sistemas',
  'Educação/Livros', 'Material de Escritório', 'Outros',
];

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const METHOD_LABEL: Record<string, string> = {
  pix:      'PIX',
  credit:   'CRÉDITO',
  debit:    'DÉBITO',
  cash:     'DINHEIRO',
  transfer: 'TRANSFERÊNCIA',
  check:    'CHEQUE',
  courtesy: 'CORTESIA',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Masks ────────────────────────────────────────────────────────────────────

const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const maskCurrency = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const amountToDisplay = (raw: string | number) => {
  if (!raw && raw !== 0) return '';
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseDisplayAmount = (display: string) =>
  parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;

const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  // Extract only YYYY-MM-DD part in case MySQL returns full ISO datetime
  const datePart = String(dateStr).slice(0, 10);
  const d = new Date(datePart + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateStr: string) => {
  const d = safeDate(dateStr);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR');
};

const parseBrDate = (s: string): string => {
  if (!s) return '';
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length < 3) return ''; // ex: "27/02" sem ano → inválido
    const [d, m, y] = parts;
    if (!y) return '';
    const fullYear = y.length === 2 ? `20${y}` : y.padStart(4, '0');
    return `${fullYear}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return s;
};

const detectPaymentMethod = (text: string): string => {
  const t = (text || '').toLowerCase();
  if (t.includes('pix'))                                            return 'pix';
  if (t.includes('crédito') || t.includes('credito'))              return 'credit';
  if (t.includes('débito')  || t.includes('debito'))               return 'debit';
  if (t.includes('dinheiro')|| t.includes('espécie'))              return 'cash';
  if (t.includes('transfer'))                                       return 'transfer';
  if (t.includes('cheque'))                                         return 'check';
  return 'pix';
};

const detectCategory = (text: string): string => {
  const t = (text || '').toLowerCase();
  if (t.includes('avaliação') || t.includes('avaliacao'))           return 'Avaliação';
  if (t.includes('supervisão') || t.includes('supervisao'))         return 'Supervisão';
  if (t.includes('palestra') || t.includes('curso'))                return 'Palestra/Curso';
  if (t.includes('pacote') || t.includes('quinzenal') || t.includes('mensal')) return 'Pacote de Sessões';
  if (t.includes('sessão') || t.includes('sessao') || t.includes('psicoterapia') || t.includes('atendimento')) return 'Sessão Individual';
  return 'Geral';
};

// ─── Export Helpers ───────────────────────────────────────────────────────────

const exportCSV = (data: Transaction[], monthLabel: string) => {
  const header = ['Data','Descrição','Categoria','Pagador','CPF','Valor','Tipo','Método','Status'];
  const rows = data.map(tx => [
    formatDate(tx.date),
    tx.description || '',
    tx.category || '',
    tx.payer_name || tx.patient_name || '',
    tx.payer_cpf || '',
    tx.amount.toFixed(2).replace('.',','),
    tx.type === 'income' ? 'Receita' : 'Despesa',
    METHOD_LABEL[tx.payment_method] || tx.payment_method || '',
    tx.status === 'paid' ? 'Pago' : tx.status === 'pending' ? 'Pendente' : 'Cancelado',
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `livro-caixa-${monthLabel}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const exportXLS = (data: Transaction[], monthLabel: string) => {
  // Simple TSV approach (opens in Excel)
  const header = ['Data','Descrição','Categoria','Pagador','CPF','Valor','Tipo','Método','Status'];
  const rows = data.map(tx => [
    formatDate(tx.date),
    tx.description || '',
    tx.category || '',
    tx.payer_name || tx.patient_name || '',
    tx.payer_cpf || '',
    tx.amount.toFixed(2).replace('.',','),
    tx.type === 'income' ? 'Receita' : 'Despesa',
    METHOD_LABEL[tx.payment_method] || tx.payment_method || '',
    tx.status === 'paid' ? 'Pago' : tx.status === 'pending' ? 'Pendente' : 'Cancelado',
  ]);
  const tsv = [header, ...rows].map(r => r.join('\t')).join('\n');
  const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `livro-caixa-${monthLabel}.xls`; a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = async (data: Transaction[], summary: { income: number; expense: number; balance: number }, monthLabel: string) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(30, 30, 50);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Livro Caixa — ${monthLabel}`, 10, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 220, 14);

  // Summary boxes
  let sx = 10;
  [
    { label: 'Entradas', value: formatCurrency(summary.income), color: [16, 185, 129] as [number,number,number] },
    { label: 'Saídas',   value: formatCurrency(summary.expense), color: [239, 68, 68] as [number,number,number] },
    { label: 'Saldo',    value: formatCurrency(summary.balance), color: [99, 102, 241] as [number,number,number] },
  ].forEach(({ label, value, color }) => {
    doc.setFillColor(...color);
    doc.roundedRect(sx, 26, 55, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), sx + 3, 33);
    doc.setFontSize(11);
    doc.text(value, sx + 3, 39);
    sx += 60;
  });

  // Table header
  const headerY = 48;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, headerY, 277, 7, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const cols = [
    { x: 11,  w: 22,  label: 'DATA' },
    { x: 35,  w: 65,  label: 'DESCRIÇÃO' },
    { x: 102, w: 38,  label: 'PAGADOR' },
    { x: 142, w: 25,  label: 'CATEGORIA' },
    { x: 169, w: 28,  label: 'MÉTODO' },
    { x: 199, w: 30,  label: 'VALOR' },
    { x: 231, w: 22,  label: 'TIPO' },
    { x: 255, w: 22,  label: 'STATUS' },
  ];
  cols.forEach(c => doc.text(c.label, c.x, headerY + 5));

  // Rows
  let y = headerY + 10;
  data.forEach((tx, i) => {
    if (y > 190) { doc.addPage(); y = 15; }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y - 4, 277, 7, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const row = [
      formatDate(tx.date),
      (tx.description || '').slice(0, 40),
      (tx.payer_name || tx.patient_name || '—').slice(0, 22),
      (tx.category || '').slice(0, 15),
      METHOD_LABEL[tx.payment_method] || '',
      formatCurrency(tx.amount),
      tx.type === 'income' ? 'Receita' : 'Despesa',
      tx.status === 'paid' ? 'Pago' : 'Pendente',
    ];
    cols.forEach((c, ci) => doc.text(row[ci], c.x, y));
    y += 7;
  });

  doc.save(`livro-caixa-${monthLabel}.pdf`);
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LivroCaixa: React.FC = () => {
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── View ─────────────────────────────────────────────────────────────────────
  const [view, setView]               = useState<'archive' | 'detail'>('archive');
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());

  // ── Archive layout (grid/list) persisted to localStorage ─────────────────────
  const [archiveLayout, setArchiveLayout] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('livrocaixa_layout') as 'grid' | 'list') || 'grid'
  );

  // ── Archive ───────────────────────────────────────────────────────────────────
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [deleteMonthConfirm, setDeleteMonthConfirm] = useState<{ month: number; year: number } | null>(null);

  // ── Detail ────────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]           = useState({ income: 0, expense: 0, balance: 0 });
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [flowFilter, setFlowFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [sortKey, setSortKey]           = useState<string>(() => localStorage.getItem('lc_sort_key') ?? 'date');
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>(() => (localStorage.getItem('lc_sort_order') as 'asc' | 'desc') ?? 'asc');

  const handleSort = (key: string) => {
    const next = key === sortKey && sortOrder === 'asc' ? 'desc' : 'asc';
    const nextKey = key;
    setSortKey(nextKey);
    setSortOrder(next);
    localStorage.setItem('lc_sort_key', nextKey);
    localStorage.setItem('lc_sort_order', next);
  };

  // ── Modals ────────────────────────────────────────────────────────────────────
  const [isAuraContabilOpen, setIsAuraContabilOpen] = useState(false);
  const [isImportOpen, setIsImportOpen]   = useState(false);
  const [isNewTxOpen, setIsNewTxOpen]     = useState(false);
  const [editingTx, setEditingTx]         = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // ── Import ────────────────────────────────────────────────────────────────────
  const [importTab, setImportTab]   = useState<'csv' | 'paste'>('csv');
  const [pasteText, setPasteText]   = useState('');
  const [csvFile, setCsvFile]       = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importStep, setImportStep] = useState<'input' | 'preview'>('input');

  // ── Selection (bulk actions) ──────────────────────────────────────────────────
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // ── Form ──────────────────────────────────────────────────────────────────────
  const [txType, setTxType]               = useState<'income' | 'expense'>('income');
  const [txDate, setTxDate]               = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount]           = useState(''); // formatted display: "1.250,00"
  const [txMethod, setTxMethod]           = useState('pix');
  const [txCategory, setTxCategory]       = useState('Geral');
  const [txPatientName, setTxPatientName]       = useState(''); // nome do paciente (da busca)
  const [txPayerName, setTxPayerName]           = useState(''); // nome do pagador externo
  const [txPayerCpf, setTxPayerCpf]             = useState('');
  const [txPatientCpf, setTxPatientCpf]         = useState('');
  const [txPayerIsPatient, setTxPayerIsPatient] = useState(true);
  const [txObservation, setTxObservation] = useState('');

  // ── Patients combobox ─────────────────────────────────────────────────────────
  const [patients, setPatients] = useState<Array<{id: number; name: string; cpf: string}>>([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  // ── Services / Packages combobox ──────────────────────────────────────────────
  const [txServices, setTxServices] = useState<Array<{id: string; name: string; price: number; type: 'service' | 'package'}>>([]);
  const [txServiceQuery, setTxServiceQuery] = useState('');
  const [txServiceDropdownOpen, setTxServiceDropdownOpen] = useState(false);
  const [txSelectedService, setTxSelectedService] = useState<{id: string; name: string; price: number; type: 'service' | 'package'} | null>(null);
  const [txBaseAmount, setTxBaseAmount] = useState('');
  const [txDiscount, setTxDiscount] = useState('');
  const [txDiscountType, setTxDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const serviceRef = useRef<HTMLDivElement>(null);

  // ── Close export menu on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Close patient dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Fetch patients + services when modal opens ───────────────────────────────
  useEffect(() => {
    if (!isNewTxOpen) return;
    if (patients.length === 0) {
      api.get<any[]>('/patients').then(data => {
        const list = (Array.isArray(data) ? data : []).map((p: any) => ({
          id: p.id,
          name: p.name || p.full_name || '',
          cpf: p.cpf || p.cpf_cnpj || '',
        })).filter((p: any) => p.name);
        setPatients(list);
      }).catch(() => {});
    }
    if (txServices.length === 0) {
      Promise.all([
        api.get<any[]>('/services').catch(() => []),
        api.get<any[]>('/packages').catch(() => []),
      ]).then(([srvs, pkgs]) => {
        const items = [
          ...(Array.isArray(srvs) ? srvs : []).map((s: any) => ({ id: `svc_${s.id}`, name: s.name, price: Number(s.price) || 0, type: 'service' as const })),
          ...(Array.isArray(pkgs) ? pkgs : []).map((p: any) => ({ id: `pkg_${p.id}`, name: p.name, price: Number(p.totalPrice) || 0, type: 'package' as const })),
        ];
        setTxServices(items);
      });
    }
  }, [isNewTxOpen]);

  // ─── URL sync on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const m = searchParams.get('month');
    const y = searchParams.get('year');
    if (m && y) {
      setSelectedMonth({ month: Number(m), year: Number(y) });
      setView('detail');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch Archive ────────────────────────────────────────────────────────────

  const fetchArchive = useCallback(async () => {
    setIsLoadingArchive(true);
    try {
      const results: MonthSummary[] = [];
      await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
          try {
            const sum = await api.get<any>('/finance/summary', {
              month: month.toString(), year: selectedYear.toString(),
            });
            if (sum.income > 0 || sum.expense > 0) {
              results.push({
                month, year: selectedYear,
                income: sum.income, expense: sum.expense, balance: sum.balance,
                label: `${MONTH_NAMES[month - 1]} ${selectedYear}`,
              });
            }
          } catch { /* skip */ }
        })
      );
      results.sort((a, b) => b.month - a.month);
      setMonthSummaries(results);
    } finally {
      setIsLoadingArchive(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (view === 'archive') fetchArchive();
  }, [view, fetchArchive]);

  // ─── Fetch Detail ─────────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    if (!selectedMonth) return;
    setIsLoadingDetail(true);
    try {
      const { month, year } = selectedMonth;
      const start = `${year}-${String(month).padStart(2,'0')}-01`;
      const end   = new Date(year, month, 0).toISOString().split('T')[0];
      const [txs, sum] = await Promise.all([
        api.get<Transaction[]>('/finance', { start, end }),
        api.get<any>('/finance/summary', { month: month.toString(), year: year.toString() }),
      ]);
      setTransactions(txs);
      setSummary(sum);
    } catch {
      pushToast('error', 'Erro ao carregar lançamentos');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [selectedMonth, pushToast]);

  useEffect(() => {
    if (view === 'detail' && selectedMonth) fetchDetail();
  }, [view, selectedMonth, fetchDetail]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const openDetail = (month: number, year: number) => {
    setSelectedMonth({ month, year });
    setView('detail');
    setSearchQuery('');
    setFlowFilter('all');
    setSearchParams({ month: String(month), year: String(year) });
  };

  const goToArchive = () => {
    setView('archive');
    setSearchParams({});
  };

  const handleDeleteMonth = async () => {
    if (!deleteMonthConfirm) return;
    try {
      await api.delete(`/finance/month/${deleteMonthConfirm.year}/${deleteMonthConfirm.month}`);
      pushToast('success', 'Mês excluído', 'Todos os lançamentos do mês foram removidos.');
      setDeleteMonthConfirm(null);
      fetchArchive();
    } catch {
      pushToast('error', 'Erro ao excluir lançamentos do mês');
    }
  };

  const toggleArchiveLayout = () => {
    const next = archiveLayout === 'grid' ? 'list' : 'grid';
    setArchiveLayout(next);
    localStorage.setItem('livrocaixa_layout', next);
  };

  const filtered = transactions
    .filter((tx) => {
      if (flowFilter !== 'all' && tx.type !== flowFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description?.toLowerCase().includes(q) ||
          tx.payer_name?.toLowerCase().includes(q) ||
          tx.patient_name?.toLowerCase().includes(q) ||
          tx.payer_cpf?.includes(q) ||
          tx.category?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortKey === 'date') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
      }
      if (sortKey === 'amount') {
        return (Number(a.amount) - Number(b.amount)) * dir;
      }
      if (sortKey === 'payer') {
        return ((a.payer_name || a.patient_name || '').localeCompare(b.payer_name || b.patient_name || '')) * dir;
      }
      return 0;
    });

  const monthLabel = selectedMonth
    ? `${MONTH_NAMES[selectedMonth.month - 1]}-${selectedMonth.year}`
    : 'livro-caixa';

  // Parser para o formato real do Excel.
  // Aceita dois modos automaticamente:
  //   Modo COMPLETO (A→M): Data | Formato | Pagador | CPF | Valor | Descrição | Categoria | Paciente | ...
  //   Modo PARCIAL  (E→M): Valor | Descrição | Categoria | Paciente | ... (sem data/pagador)
  const parsePaste = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return [];

    // Pular linha de cabeçalho se existir
    const startIdx = lines[0] && /data|valor|pagador|formato/i.test(lines[0].split('\t')[0]) ? 1 : 0;
    const dataLines = lines.slice(startIdx).filter(l => l.trim());
    if (!dataLines.length) return [];

    // Detectar modo: se a 1ª coluna parece um valor (R$ ou número com vírgula) → modo parcial
    const firstCols = dataLines[0].split('\t').map(c => c.trim());
    const isParcial = /^R?\$?\s*[\d.,]+/.test(firstCols[0]) && !firstCols[0].includes('/');

    return dataLines.map(line => {
      const cols = line.split('\t').map(c => c.trim());

      let dateRaw: string, formatPay: string, payerName: string, payerCpf: string;
      let valueRaw: string, serviceDesc: string, category: string, patientName: string;

      if (isParcial) {
        // Modo E→M: sem data, sem pagador
        dateRaw     = '';
        formatPay   = 'pix';
        payerName   = '';
        payerCpf    = '';
        valueRaw    = cols[0] || '';   // Valor recebido
        serviceDesc = cols[1] || '';   // Descrição do Serviço
        category    = cols[2] || '';   // Categoria/Formato
        patientName = cols[3] || '';   // Paciente
      } else {
        // Modo completo A→M
        dateRaw     = cols[0] || '';
        formatPay   = cols[1] || '';
        payerName   = cols[2] || '';
        payerCpf    = cols[3] || '';
        valueRaw    = cols[4] || '';
        serviceDesc = cols[5] || '';
        category    = cols[6] || '';
        patientName = cols[7] || '';
      }

      const date   = parseBrDate(dateRaw);
      const rawVal = valueRaw.replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
      const amount = parseFloat(rawVal) || 0;

      const description     = serviceDesc || formatPay || 'Importado';
      const resolvedCategory = detectCategory(category || serviceDesc) || 'Geral';
      const resolvedPatient  = patientName || payerName;

      return {
        date: date || new Date().toISOString().split('T')[0],
        description,
        payer_name: payerName || resolvedPatient,
        payer_cpf: payerCpf,
        patient_name: resolvedPatient,
        amount,
        payment_method: detectPaymentMethod(formatPay),
        type: 'income' as const,
        category: resolvedCategory,
        status: 'paid' as const,
      };
    }).filter(r => r.amount > 0); // só filtra por valor — data tem fallback
  };

  // ─── Import ───────────────────────────────────────────────────────────────────

  const parseCsvRows = async (): Promise<any[]> => {
    if (!csvFile) return [];
    const text = await csvFile.text();
    const lines = text.trim().split('\n').filter(l => l.trim());
    const startIdx = lines[0].toLowerCase().includes('data') ? 1 : 0;
    return lines.slice(startIdx).map(line => {
      const [dateRaw, description, valueRaw, typeRaw] = line.split(',').map(c => c.trim().replace(/^"|"$/g,''));
      const date   = parseBrDate(dateRaw);
      const amount = parseFloat((valueRaw || '').replace(',','.')) || 0;
      const type   = typeRaw?.toLowerCase().includes('despesa') ? 'expense' : 'income';
      return { date, description: description || 'Importado', amount, type, category: 'Geral', payment_method: 'pix', status: 'paid' };
    }).filter((r: any) => r.date && r.amount > 0);
  };

  const handlePreview = async () => {
    let rows: any[] = [];
    if (importTab === 'paste') {
      rows = parsePaste(pasteText);
      if (!rows.length) { pushToast('error', 'Nenhuma linha válida', 'Cole os dados diretamente do Excel: Data, Formato, Pagador, CPF, Valor, Descrição, Categoria, Paciente'); return; }
    } else if (importTab === 'csv' && csvFile) {
      rows = await parseCsvRows();
      if (!rows.length) { pushToast('error', 'Nenhuma linha válida no arquivo CSV'); return; }
    } else {
      pushToast('error', 'Selecione um arquivo CSV ou cole os dados'); return;
    }
    setPreviewRows(rows);
    setImportStep('preview');
  };

  const handleImport = async () => {
    if (!previewRows.length) return;
    setIsImporting(true);
    try {
      let success = 0;
      for (const row of previewRows) {
        try { await api.post('/finance', row); success++; } catch { /* skip */ }
      }
      pushToast('success', 'Importação concluída!', `${success} lançamento(s) importado(s) com sucesso.`);
      setIsImportOpen(false); setPasteText(''); setCsvFile(null); setPreviewRows([]); setImportStep('input');
      goToArchive();
      fetchArchive();
    } catch {
      pushToast('error', 'Erro ao importar dados');
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Save Transaction ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setTxType('income'); setTxDate(new Date().toISOString().split('T')[0]);
    setTxDescription(''); setTxAmount(''); setTxMethod('pix'); setTxCategory('Geral');
    setTxPatientName(''); setTxPayerName(''); setTxPayerCpf(''); setTxPatientCpf(''); setTxPayerIsPatient(true); setTxObservation('');
    setPatientQuery(''); setPatientDropdownOpen(false);
    setTxServiceQuery(''); setTxServiceDropdownOpen(false); setTxSelectedService(null);
    setTxBaseAmount(''); setTxDiscount(''); setTxDiscountType('fixed');
    setEditingTx(null);
  };

  const openNewTx = () => {
    resetForm();
    if (selectedMonth) {
      const { month, year } = selectedMonth;
      setTxDate(`${year}-${String(month).padStart(2,'0')}-01`);
    }
    setIsNewTxOpen(true);
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxDate(tx.date?.split('T')[0] ?? tx.date);
    setTxDescription(tx.description || '');
    setTxAmount(amountToDisplay(tx.amount));
    setTxMethod(tx.payment_method || 'pix');
    setTxCategory(tx.category || 'Geral');
    const hasExternalPayer = !!(tx.beneficiary_name);
    setTxPatientName(tx.beneficiary_name || tx.payer_name || '');
    setTxPayerName(hasExternalPayer ? tx.payer_name || '' : '');
    setTxPayerCpf(hasExternalPayer ? maskCpf((tx.payer_cpf || '').replace(/\D/g,'')) : '');
    setTxPatientCpf(tx.beneficiary_cpf ? maskCpf(tx.beneficiary_cpf.replace(/\D/g,'')) : tx.payer_cpf ? maskCpf(tx.payer_cpf.replace(/\D/g,'')) : '');
    setTxPayerIsPatient(!hasExternalPayer);
    setTxObservation(tx.observation || '');
    setPatientQuery(tx.beneficiary_name || tx.payer_name || '');
    setPatientDropdownOpen(false);
    setIsNewTxOpen(true);
  };

  const handleSaveTx = async () => {
    const parsedAmount = parseDisplayAmount(txAmount);
    if (!txAmount || parsedAmount <= 0) { pushToast('error', 'Informe um valor válido'); return; }
    if (!txDate) { pushToast('error', 'Informe a data'); return; }
    setIsSaving(true);
    try {
      const payload = {
        type: txType, date: txDate,
        description: txDescription || (txType === 'income' ? 'Receita' : 'Despesa'),
        amount: parsedAmount, payment_method: txMethod, category: txCategory,
        payer_name: txPayerIsPatient ? txPatientName || null : txPayerName || null,
        payer_cpf:  txPayerIsPatient ? txPatientCpf  || null : txPayerCpf  || null,
        beneficiary_name: txPayerIsPatient ? null : txPatientName || null,
        beneficiary_cpf:  txPayerIsPatient ? null : txPatientCpf  || null,
        observation: txObservation || null, status: 'paid',
      };
      if (editingTx) {
        await api.put(`/finance/${editingTx.id}`, payload);
        pushToast('success', 'Lançamento atualizado!');
      } else {
        await api.post('/finance', payload);
        pushToast('success', 'Lançamento criado!');
      }
      setIsNewTxOpen(false); resetForm(); fetchDetail();
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao salvar lançamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/finance/${id}`);
      pushToast('success', 'Lançamento removido');
      setDeleteConfirmId(null); fetchDetail();
    } catch { pushToast('error', 'Erro ao remover lançamento'); }
  };

  const handleRepeat = async (id: number) => {
    try {
      await api.post(`/finance/repeat/${id}`, {});
      pushToast('success', 'Reprocessado com sucesso!', 'Lançamento copiado para o próximo mês.');
      fetchDetail();
    } catch { pushToast('error', 'Erro ao reprocessar lançamento'); }
  };

  // ─── Selection helpers ────────────────────────────────────────────────────────

  const handleToggleSelect = (id: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedTxIds(prev =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map(tx => String(tx.id)))
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedTxIds.size) return;
    setIsBulkProcessing(true);
    try {
      let ok = 0;
      for (const id of selectedTxIds) {
        try { await api.delete(`/finance/${id}`); ok++; } catch { /* skip */ }
      }
      pushToast('success', `${ok} excluído(s)!`, `${ok} lançamento(s) removido(s) com sucesso.`);
      setSelectedTxIds(new Set());
      fetchDetail();
    } finally { setIsBulkProcessing(false); }
  };

  const handleBulkRepeat = async () => {
    if (!selectedTxIds.size) return;
    setIsBulkProcessing(true);
    try {
      let ok = 0;
      for (const id of selectedTxIds) {
        try { await api.post(`/finance/repeat/${id}`, {}); ok++; } catch { /* skip */ }
      }
      pushToast('success', 'Reprocessados com sucesso!', `${ok} lançamento(s) copiado(s) para o próximo mês.`);
      setSelectedTxIds(new Set());
      fetchDetail();
    } finally { setIsBulkProcessing(false); }
  };

  // ─── GridTable Columns ────────────────────────────────────────────────────────

  const columns: Column<Transaction>[] = [
    {
      header: 'Data',
      sortKey: 'date',
      render: (tx) => {
        const d = safeDate(tx.date);
        return (
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">
              {d ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '—'}
            </span>
            <span className="text-base font-black text-slate-800 leading-none">
              {d ? d.getDate().toString().padStart(2, '0') : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Descrição',
      render: (tx) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2 w-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <p className="font-black text-slate-700 text-sm truncate max-w-[240px]">{tx.description || tx.category}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tx.category && (
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                {tx.category}
              </span>
            )}
            {tx.payment_method && (
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50 flex items-center gap-1">
                <CreditCard size={9} /> {METHOD_LABEL[tx.payment_method] ?? tx.payment_method}
              </span>
            )}
            {(tx.payer_name || tx.patient_name) && (
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50 flex items-center gap-1">
                <User size={9} /> {tx.payer_name || tx.patient_name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Paciente / Pagador',
      sortKey: 'payer',
      render: (tx) => {
        const hasExternalPayer = !!(tx.beneficiary_name);
        const payerName    = tx.payer_name || '—';
        const payerCpf     = tx.payer_cpf  || '';
        const patientName  = tx.beneficiary_name || tx.patient_name || tx.payer_name || '—';
        const patientCpf   = tx.beneficiary_cpf  || tx.payer_cpf   || '';
        return (
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center shrink-0">
                <User size={9} className="text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none">
                  Pagador{payerCpf ? ` · ${payerCpf.replace(/\D/g,'').slice(0,11)}` : ''}
                </p>
                <p className="text-xs font-bold text-slate-700 truncate">{payerName}</p>
              </div>
            </div>
            {hasExternalPayer && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center shrink-0">
                  <User size={9} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none">
                    Paciente{patientCpf ? ` · ${patientCpf.replace(/\D/g,'').slice(0,11)}` : ''}
                  </p>
                  <p className="text-xs font-bold text-slate-700 truncate">{patientName}</p>
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Valor',
      sortKey: 'amount',
      render: (tx) => (
        <div className="text-right">
          <p className={`text-base font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${tx.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${tx.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {tx.status === 'paid' ? 'Pago' : tx.status === 'pending' ? 'Pendente' : 'Cancelado'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Ações',
      render: (tx) => (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handleRepeat(tx.id); }}
            title="Repetir próximo mês"
            className="p-2.5 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-emerald-600 transition-all border border-slate-100"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditTx(tx); }}
            className="p-2.5 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-slate-700 transition-all border border-slate-100"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tx.id); }}
            className="p-2.5 bg-slate-50 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-rose-600 transition-all border border-slate-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // ─── Render Archive ───────────────────────────────────────────────────────────

  const renderArchive = () => (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600 border border-slate-200">
              <BookOpen size={20} />
            </div>
            Arquivo Financeiro
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-bold">GESTÃO DE PERÍODOS CONSOLIDADOS</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-slate-900 text-white rounded-2xl px-3 py-2.5 font-black text-[10px] uppercase tracking-widest">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-1 hover:bg-white/10 rounded-lg transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="mx-2">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="p-1 hover:bg-white/10 rounded-lg transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Grid/List toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => { if (archiveLayout !== 'grid') toggleArchiveLayout(); }}
              title="Visualização em grade"
              className={`p-2 rounded-lg transition-all ${archiveLayout === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => { if (archiveLayout !== 'list') toggleArchiveLayout(); }}
              title="Visualização em lista"
              className={`p-2 rounded-lg transition-all ${archiveLayout === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={() => { setImportStep('input'); setPreviewRows([]); setPasteText(''); setCsvFile(null); setIsImportOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
          >
            <Upload size={14} /> Importar
          </button>

          <button
            onClick={() => {
              const now = new Date();
              openDetail(now.getMonth() + 1, now.getFullYear());
              setTimeout(() => openNewTx(), 80);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 tracking-widest"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Month Cards */}
      {isLoadingArchive ? (
        <div className="flex flex-col items-center justify-center p-32 gap-4 text-slate-500">
          <Loader2 className="animate-spin" size={48} />
          <span className="font-black text-[10px] uppercase tracking-[0.4em] opacity-40">Carregando Períodos...</span>
        </div>
      ) : monthSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <BookOpen size={56} className="mb-4 opacity-20" />
          <p className="font-black text-lg">Nenhum lançamento em {selectedYear}</p>
          <p className="text-sm mt-2 font-bold opacity-60">Clique em "Novo Lançamento" para começar</p>
        </div>
      ) : archiveLayout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {monthSummaries.map((ms) => (
            <AppCard
              key={`${ms.year}-${ms.month}`}
              title={ms.label}
              subtitle="CONSOLIDADO"
              avatarIcon={<BookOpen size={20} />}
              topActions={[
                {
                  label: 'Excluir mês',
                  icon: <Trash2 size={13} />,
                  variant: 'danger',
                  onClick: () => setDeleteMonthConfirm({ month: ms.month, year: ms.year }),
                },
              ]}
              stats={[
                { label: 'Receitas',    value: formatCurrency(ms.income),  tone: 'success' },
                { label: 'Despesas',    value: formatCurrency(ms.expense), tone: 'danger'  },
                { label: 'Saldo',       value: formatCurrency(ms.balance), tone: ms.balance >= 0 ? 'default' : 'danger' },
              ]}
              bottomActions={[
                { label: 'Abrir Livro Caixa', variant: 'outline', onClick: () => openDetail(ms.month, ms.year) },
              ]}
            />
          ))}
        </div>
      ) : (
        <GridTable<MonthSummary>
          data={monthSummaries}
          keyExtractor={(ms) => `${ms.year}-${ms.month}`}
          onRowClick={(ms) => openDetail(ms.month, ms.year)}
          columns={[
            {
              header: 'Período',
              render: (ms) => (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                    <BookOpen size={15} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{ms.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consolidado</p>
                  </div>
                </div>
              ),
            },
            {
              header: 'Receitas',
              render: (ms) => (
                <p className="font-black text-emerald-600">{formatCurrency(ms.income)}</p>
              ),
            },
            {
              header: 'Despesas',
              render: (ms) => (
                <p className="font-black text-rose-500">{formatCurrency(ms.expense)}</p>
              ),
            },
            {
              header: 'Saldo',
              render: (ms) => (
                <p className={`font-black ${ms.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                  {formatCurrency(ms.balance)}
                </p>
              ),
            },
            {
              header: '',
              render: (ms) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDetail(ms.month, ms.year); }}
                    className="px-4 py-1.5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteMonthConfirm({ month: ms.month, year: ms.year }); }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );

  // ─── Render Detail ────────────────────────────────────────────────────────────

  const renderDetail = () => {
    const displayMonth = selectedMonth
      ? `${MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}`
      : '';

    return (
      <div className="space-y-6 animate-fadeIn font-sans pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToArchive()}
              className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600 border border-slate-200">
                  <BookOpen size={20} />
                </div>
                Livro Caixa
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-widest">{displayMonth}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
              >
                <Download size={14} /> Exportar
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {[
                    { label: 'CSV', action: () => { exportCSV(filtered, monthLabel); setShowExportMenu(false); } },
                    { label: 'Excel (XLS)', action: () => { exportXLS(filtered, monthLabel); setShowExportMenu(false); } },
                    { label: 'PDF', action: () => { exportPDF(filtered, summary, displayMonth); setShowExportMenu(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full text-left px-4 py-3 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
            >
              <Upload size={14} /> Importar
            </button>

            <button
              onClick={() => { handleOpenNewTxFromArchive(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 tracking-widest"
            >
              <Plus size={16} /> Novo
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas Totais</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.income)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all">
              <TrendingDown size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saídas Totais</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.expense)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-slate-300 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <Wallet size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Líquido</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.balance)}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nos lançamentos..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-all placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
            {[
              { value: 'all',     label: 'Todos os Fluxos' },
              { value: 'income',  label: 'Entradas' },
              { value: 'expense', label: 'Saídas' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFlowFilter(f.value as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                  flowFilter === f.value
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Filter size={10} /> {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedTxIds.size > 0 && (
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {selectedTxIds.size} selecionado(s)
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkRepeat}
              disabled={isBulkProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-emerald-500 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} />
              Reprocessar selecionados
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-rose-500 transition-all disabled:opacity-50"
            >
              <Trash2 size={13} />
              Excluir selecionados
            </button>
            <button
              onClick={() => setSelectedTxIds(new Set())}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Transactions Table */}
        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center p-32 gap-4 text-slate-500">
            <Loader2 className="animate-spin" size={48} />
            <span className="font-black text-[10px] uppercase tracking-[0.4em] opacity-30">Processando Fluxo...</span>
          </div>
        ) : (
          <GridTable<Transaction>
            data={filtered}
            columns={columns}
            keyExtractor={(tx) => tx.id}
            selectedIds={selectedTxIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            emptyMessage="Nenhum lançamento encontrado para este período."
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>
    );
  };

  const handleOpenNewTxFromArchive = () => { openNewTx(); };

  const categories = txType === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {view === 'archive' ? renderArchive() : renderDetail()}

      {/* ── Import Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); setPasteText(''); setCsvFile(null); setPreviewRows([]); setImportStep('input'); }}
        title={importStep === 'preview' ? 'Pré-análise da Importação' : 'Importar Lançamentos'}
        subtitle={importStep === 'preview' ? `${previewRows.length} LANÇAMENTO(S) IDENTIFICADO(S)` : 'SINCRONIZAÇÃO EM LOTE'}
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={() => {
                if (importStep === 'preview') { setImportStep('input'); setPreviewRows([]); }
                else { setIsImportOpen(false); setPasteText(''); setCsvFile(null); setPreviewRows([]); }
              }}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              {importStep === 'preview' ? '← Voltar' : 'Cancelar'}
            </button>
            {importStep === 'input' ? (
              <button
                onClick={handlePreview}
                className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-slate-900 hover:bg-slate-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
              >
                <Search size={14} /> Pré-visualizar
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
              >
                {isImporting && <Loader2 size={14} className="animate-spin" />}
                <CheckCircle2 size={14} /> Confirmar Importação
              </button>
            )}
          </>
        }
      >
        {importStep === 'input' ? (
          <>
            {/* Tab Selector */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5">
              {[
                { id: 'csv',   label: 'Arquivo CSV' },
                { id: 'paste', label: 'Colar Dados (Excel)' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setImportTab(tab.id as any); }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    importTab === tab.id
                      ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {importTab === 'csv' ? (
              <div>
                <div
                  onClick={() => document.getElementById('csv-upload-lc')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                >
                  <FileText size={40} className="text-slate-300 mb-3" />
                  {csvFile ? (
                    <p className="font-black text-slate-700 text-sm">{csvFile.name}</p>
                  ) : (
                    <>
                      <p className="font-black text-slate-600">Clique para selecionar seu CSV</p>
                      <p className="text-[10px] font-black text-slate-400 mt-1.5 uppercase tracking-widest">DATA, DESCRIÇÃO, VALOR, TIPO</p>
                    </>
                  )}
                </div>
                <input id="csv-upload-lc" type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-500 mb-3">
                  Selecione as linhas na sua planilha e cole abaixo (Ctrl+V). Colunas: <span className="text-slate-700">Data · Formato · Pagador · CPF · Valor · Descrição · Categoria · Paciente</span>
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  placeholder={'07/01/26\tPix recebido\tCamila Souza\t123.456.789-00\tR$ 100,00\tPsicoterapia Individual\tSessão Avulsa\tCamila'}
                  className="w-full border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 bg-slate-50 outline-none focus:border-slate-400 focus:bg-white resize-none placeholder:text-slate-300 font-mono transition-all"
                />
              </div>
            )}
          </>
        ) : (
          /* ── Preview Step ── */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Receitas</p>
                <p className="text-base font-black text-emerald-700">{previewRows.filter(r => r.type === 'income').length}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Despesas</p>
                <p className="text-base font-black text-rose-700">{previewRows.filter(r => r.type === 'expense').length}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total</p>
                <p className="text-base font-black text-slate-700">{formatCurrency(previewRows.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0))}</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-[80px_1fr_100px_90px] gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>Data</span><span>Descrição / Pagador</span><span className="text-right">Valor</span><span className="text-right">Método</span>
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {previewRows.map((r, i) => (
                  <div key={i} className="px-4 py-2.5 grid grid-cols-[80px_1fr_100px_90px] gap-2 items-center hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400">{formatDate(r.date)}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{r.description || r.payer_name || '—'}</p>
                      {r.payer_name && <p className="text-[9px] text-slate-400 truncate">{r.payer_name}</p>}
                    </div>
                    <span className={`text-xs font-black text-right ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase text-right">{METHOD_LABEL[r.payment_method] ?? r.payment_method}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700">Revise os dados acima antes de confirmar. Esta ação não pode ser desfeita automaticamente.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── New/Edit Transaction Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isNewTxOpen}
        onClose={() => { setIsNewTxOpen(false); resetForm(); }}
        title={editingTx ? 'Revisar Lançamento' : 'Novo Lançamento'}
        subtitle={txType === 'income' ? 'CREDITAR EM CAIXA' : 'DEBITAR EM CAIXA'}
        maxWidth="xl"
        footer={
          <>
            <button
              onClick={() => { setIsNewTxOpen(false); resetForm(); }}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTx}
              disabled={isSaving}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-60 ${
                txType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
              }`}
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              <CheckCircle2 size={15} />
              {editingTx ? 'Salvar Alterações' : 'Confirmar'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Tipo de Movimentação
              </label>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => { setTxType('income'); setTxCategory('Geral'); }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    txType === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-emerald-600'
                  }`}
                >
                  Receita
                </button>
                <button
                  onClick={() => { setTxType('expense'); setTxCategory(CATEGORIES_EXPENSE[0]); }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    txType === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-rose-500'
                  }`}
                >
                  Despesa
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Data Competência
              </label>
              <DatePicker
                value={txDate}
                onChange={setTxDate}
                placeholder="Selecionar data"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
              Descrição Detalhada
            </label>
            <input
              type="text"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Ex: Pacote Mensal – Paciente João Silva"
              className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Amount + Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Valor do Repasse (R$)
              </label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black ${txType === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={txAmount}
                  onChange={(e) => setTxAmount(maskCurrency(e.target.value))}
                  placeholder="0,00"
                  className={`w-full text-lg font-black p-3.5 pl-11 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white transition-all ${
                    txType === 'income'
                      ? 'focus:border-emerald-400 text-emerald-700'
                      : 'focus:border-rose-400 text-rose-700'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Meio de Recebimento
              </label>
              <select
                value={txMethod}
                onChange={(e) => setTxMethod(e.target.value)}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-slate-400 transition-all text-sm font-bold text-slate-700 appearance-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              Categoria / Serviço
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTxCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    txCategory === cat
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Identification */}
          <div className="border-2 border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                Identificação do Atendimento
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={txPayerIsPatient}
                  onChange={(e) => setTxPayerIsPatient(e.target.checked)}
                  className="accent-slate-900 w-4 h-4"
                />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pagador é o Paciente</span>
              </label>
            </div>

            {/* Patient combobox */}
            <div ref={patientRef} className="relative">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                {txPayerIsPatient ? 'Paciente / Pagador' : 'Paciente'}
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setPatientDropdownOpen(true);
                    if (!e.target.value) { setTxPatientName(''); setTxPatientCpf(''); }
                  }}
                  onFocus={() => setPatientDropdownOpen(true)}
                  placeholder="Buscar paciente..."
                  className="w-full p-3 pl-9 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                />
                {txPayerName && (
                  <button
                    type="button"
                    onClick={() => { setPatientQuery(''); setTxPatientName(''); setTxPatientCpf(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {patientDropdownOpen && patientQuery.length >= 1 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {patients
                    .filter(p => p.name.toLowerCase().includes(patientQuery.toLowerCase()) || p.cpf.includes(patientQuery))
                    .slice(0, 8)
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setTxPatientName(p.name);
                          setTxPatientCpf(maskCpf(p.cpf.replace(/\D/g, '')));
                          setPatientQuery(p.name);
                          setPatientDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <p className="text-sm font-bold text-slate-700">{p.name}</p>
                        {p.cpf && <p className="text-[10px] text-slate-400 font-bold">{maskCpf(p.cpf.replace(/\D/g,''))}</p>}
                      </button>
                    ))}
                  {patients.filter(p => p.name.toLowerCase().includes(patientQuery.toLowerCase()) || p.cpf.includes(patientQuery)).length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400 font-bold">Nenhum paciente encontrado</p>
                  )}
                </div>
              )}
            </div>

            {/* CPF do paciente (auto-preenchido ou manual) */}
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                CPF {txPayerIsPatient ? 'do Paciente / Pagador' : 'do Paciente'}
              </label>
              <input
                type="text"
                value={txPatientCpf}
                onChange={(e) => setTxPatientCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {/* Pagador separado (quando pagador ≠ paciente) */}
            {!txPayerIsPatient && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nome do Pagador</label>
                  <input
                    type="text"
                    value={txPayerName}
                    onChange={(e) => setTxPayerName(e.target.value)}
                    placeholder="Nome completo do pagador"
                    className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">CPF do Pagador</label>
                  <input
                    type="text"
                    value={txPayerCpf}
                    onChange={(e) => setTxPayerCpf(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Observation */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
              Observações Internas
            </label>
            <textarea
              value={txObservation}
              onChange={(e) => setTxObservation(e.target.value)}
              placeholder="Anotações internas sobre este lançamento..."
              rows={3}
              className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-slate-400 transition-all text-sm text-slate-700 resize-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirmar Exclusão"
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-slate-600">
            Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>

      {/* ── Aura Contábil Chat ───────────────────────────────────────────────── */}
      <AuraContabil isOpen={isAuraContabilOpen} onClose={() => setIsAuraContabilOpen(false)} />

      {/* ── Delete Month Confirm Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={deleteMonthConfirm !== null}
        onClose={() => setDeleteMonthConfirm(null)}
        title="Excluir Mês Inteiro"
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setDeleteMonthConfirm(null)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteMonth}
              className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
            >
              <Trash2 size={14} /> Excluir Tudo
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-600">
              Isso vai excluir <span className="text-rose-600">todos os lançamentos</span> de{' '}
              {deleteMonthConfirm
                ? `${MONTH_NAMES[deleteMonthConfirm.month - 1]} ${deleteMonthConfirm.year}`
                : ''}
              .
            </p>
            <p className="text-xs text-slate-400 mt-1 font-bold">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
