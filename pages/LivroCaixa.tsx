
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, ArrowLeft, Search,
  TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight,
  Edit3, Trash2, RefreshCw, CheckCircle2, Clock, X, FileText,
  User, AlertCircle, Loader2, Download, Upload, DollarSign,
  Calendar, CreditCard, Filter, LayoutGrid, List,
  Sparkles, ShoppingBag,
  Edit2, Pin, PinOff,
  Check,
  Lock as LockIcon, Unlock as UnlockIcon,
  Receipt, CircleDashed,
  CalendarCheck, CalendarClock, UserCheck,
} from 'lucide-react';
import { PageHeader } from '../components/UI/PageHeader';
import { Modal } from '../components/UI/Modal';
import { ActionDrawer } from '../components/UI/ActionDrawer';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { DatePicker } from '../components/UI/DatePicker';
import { GridTable, Column } from '../components/UI/GridTable';
import { AppCard } from '../components/UI/AppCard';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { FinancialHealth } from '../components/Finance/FinancialHealth';
import { AuraContabil } from '../components/AI/AuraContabil';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  due_date?: string;
  payment_method: string;
  status: 'paid' | 'pending' | 'cancelled' | 'confirmed' | 'waiting' | 'overdue';
  payer_name?: string;
  payer_cpf?: string;
  beneficiary_name?: string;
  beneficiary_cpf?: string;
  patient_name?: string;
  observation?: string;
  comanda_id?: string | number;
  comanda_total?: number;
  comanda_paid_value?: number;
  comanda_status?: string;
  // Receita Saúde receipt control
  rs_receipt_issued?: boolean | number;
  rs_receipt_issued_at?: string | null;
  rs_receipt_issued_by?: number | null;
  rs_receipt_note?: string | null;
}

interface MonthSummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  pending: number;
  count: number;
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

// Categorias de receita clínica elegíveis para Receita Saúde
const RS_ELIGIBLE_CATEGORIES = new Set([
  'Geral', 'Sessão Individual', 'Pacote de Sessões', 'Avaliação', 'Supervisão',
]);

const isRsEligible = (tx: { type: string; category?: string; patient_name?: string; payer_name?: string; beneficiary_name?: string }) =>
  tx.type === 'income' &&
  RS_ELIGIBLE_CATEGORIES.has(tx.category || '') &&
  !!(tx.patient_name || tx.beneficiary_name || tx.payer_name);

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

const STATUS_INFO: Record<string, { label: string; color: string; icon: any }> = {
  paid:      { label: 'PAGO',      color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  pending:   { label: 'PENDENTE',  color: 'bg-amber-50 text-amber-700 border-amber-100',    icon: Clock },
  waiting:   { label: 'AGUARDANDO',color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Clock },
  confirmed: { label: 'CONFIRMADO',color: 'bg-blue-50 text-blue-700 border-blue-100',      icon: CheckCircle2 },
  cancelled: { label: 'CANCELADO', color: 'bg-rose-50 text-rose-700 border-rose-100',      icon: X },
  overdue:   { label: 'ATRASADO',  color: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse', icon: AlertCircle },
};

const STATUS_OPTIONS = [
  { id: 'pending',   label: 'Pendente' },
  { id: 'paid',      label: 'Pago' },
  { id: 'confirmed', label: 'Confirmado' },
  { id: 'waiting',   label: 'Aguardando' },
  { id: 'cancelled', label: 'Cancelado' },
];

const getStatus = (tx: Transaction): Transaction['status'] => {
  if (tx.status === 'cancelled' || tx.status === 'paid' || tx.status === 'confirmed') return tx.status;
  
  const now = new Date();
  now.setHours(0,0,0,0);
  
  // Use due_date if available (for future payments), otherwise use competence date
  const targetDate = safeDate(tx.due_date || tx.date);
  
  if (targetDate && targetDate < now) {
    return 'overdue';
  }
  return tx.status || 'pending';
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

const safeDate = (dateStr: string | Date | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
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
  const header = ['DATA', 'VENCIMENTO', 'DESCRIÇÃO', 'CATEGORIA', 'TIPO', 'PAGADOR', 'CPF', 'MÉTODO', 'STATUS', 'VALOR'];
  const rows = data.map(tx => [
    formatDate(tx.date),
    formatDate(tx.due_date || tx.date),
    tx.description || '',
    tx.category || '',
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.payer_name || tx.patient_name || '',
    tx.payer_cpf || '',
    METHOD_LABEL[tx.payment_method] || tx.payment_method || '',
    STATUS_INFO[getStatus(tx)]?.label || tx.status,
    tx.amount.toFixed(2).replace('.', ','),
  ]);
  
  // Use semicolon as separator (standard for Brazilian CSV) and include UTF-8 BOM
  const csvContent = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
    
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `livro-caixa-${monthLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportXLS = async (data: Transaction[], monthLabel: string, summary: { income: number; expense: number; balance: number; pending: number }) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PsiFlux';
  workbook.lastModifiedBy = 'PsiFlux';
  workbook.created = new Date();
  
  // --- SHEET 1: RESUMO (SUMMARY) ---
  const summarySheet = workbook.addWorksheet('Resumo Financeiro', {
    views: [{ showGridLines: false }]
  });

  summarySheet.getCell('A1').value = `RESUMO FINANCEIRO — ${monthLabel.toUpperCase()}`;
  summarySheet.getCell('A1').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF1E293B' } };
  
  summarySheet.mergeCells('A3:B3');
  summarySheet.getCell('A3').value = 'MÉTRICAS GERAIS';
  summarySheet.getCell('A3').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };

  // Summary Cards
  const cards = [
    { label: 'TOTAL DE ENTRADAS', value: summary.income, color: 'FF059669', bg: 'FFECFDF5' },
    { label: 'TOTAL DE SAÍDAS',   value: summary.expense, color: 'FFDC2626', bg: 'FFFEF2F2' },
    { label: 'TOTAL PENDENTE',    value: summary.pending, color: 'FFD97706', bg: 'FFFBEBEE' },
    { label: 'SALDO FINAL',     value: summary.balance, color: 'FF4F46E5', bg: 'FFEFF6FF' },
  ];

  cards.forEach((card, i) => {
    const r = 4 + (i * 3);
    const cellValue = summarySheet.getCell(`A${r+1}`);
    const cellLabel = summarySheet.getCell(`A${r}`);
    
    cellLabel.value = card.label;
    cellLabel.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
    
    cellValue.value = card.value;
    cellValue.numFmt = '"R$ " #,##0.00';
    cellValue.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: card.color } };
    
    // Fill background for card area
    summarySheet.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    summarySheet.getCell(`A${r+1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    summarySheet.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    summarySheet.getCell(`B${r+1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
  });

  // Category Breakdown
  summarySheet.getCell('D3').value = 'DISTRIBUIÇÃO POR CATEGORIA';
  summarySheet.getCell('D3').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };

  const catTotals: Record<string, number> = {};
  data.forEach(tx => {
    const cat = tx.category || 'Outros';
    catTotals[cat] = (catTotals[cat] || 0) + (tx.type === 'income' ? tx.amount : -tx.amount);
  });

  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  catEntries.forEach(([cat, val], i) => {
    const r = 4 + i;
    summarySheet.getCell(`D${r}`).value = cat;
    summarySheet.getCell(`E${r}`).value = val;
    summarySheet.getCell(`E${r}`).numFmt = '"R$ " #,##0.00';
    summarySheet.getCell(`E${r}`).font = { color: { argb: val >= 0 ? 'FF059669' : 'FFDC2626' } };
  });

  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 15;
  summarySheet.getColumn('D').width = 30;
  summarySheet.getColumn('E').width = 20;

  // --- SHEET 2: LANÇAMENTOS (TRANSACTIONS) ---
  const dataSheet = workbook.addWorksheet('Lista de Lançamentos');
  
  dataSheet.columns = [
    { header: 'DATA',       key: 'date',      width: 12 },
    { header: 'VENCIMENTO', key: 'due_date',  width: 12 },
    { header: 'DESCRIÇÃO',  key: 'desc',      width: 40 },
    { header: 'CATEGORIA',  key: 'cat',       width: 20 },
    { header: 'TIPO',       key: 'type',      width: 12 },
    { header: 'PAGADOR',    key: 'payer',     width: 30 },
    { header: 'CPF',        key: 'cpf',       width: 15 },
    { header: 'MÉTODO',     key: 'method',    width: 15 },
    { header: 'STATUS',     key: 'status',    width: 15 },
    { header: 'VALOR',      key: 'amount',    width: 18 },
  ];

  // Header Styling
  const headerRow = dataSheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF3730A3' } } };
  });

  // Adding Data
  data.forEach(tx => {
    const status = getStatus(tx);
    const row = dataSheet.addRow({
      date: safeDate(tx.date),
      due_date: safeDate(tx.due_date || tx.date),
      desc: tx.description || '',
      cat: tx.category || '',
      type: tx.type === 'income' ? 'Receita' : 'Despesa',
      payer: tx.payer_name || tx.patient_name || '',
      cpf: tx.payer_cpf || '',
      method: METHOD_LABEL[tx.payment_method] || tx.payment_method || '',
      status: STATUS_INFO[status]?.label || tx.status,
      amount: tx.amount,
    });

    // Formatting
    row.getCell('date').numFmt = 'dd/mm/yyyy';
    row.getCell('due_date').numFmt = 'dd/mm/yyyy';
    row.getCell('amount').numFmt = '"R$ " #,##0.00';
    
    // Conditional Coloring for Amount
    row.getCell('amount').font = { bold: true, color: { argb: tx.type === 'income' ? 'FF059669' : 'FFDC2626' } };
    
    // Status Coloring
    if (status === 'paid' || status === 'confirmed') row.getCell('status').font = { color: { argb: 'FF059669' } };
    else if (status === 'overdue' || status === 'cancelled') row.getCell('status').font = { color: { argb: 'FFDC2626' } };
    else row.getCell('status').font = { color: { argb: 'FFD97706' } };
  });

  // Filters and Freezing
  dataSheet.autoFilter = 'A1:J1';
  dataSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Save File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `livro-caixa-${monthLabel}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


const exportPDF = async (data: Transaction[], summary: { income: number; expense: number; balance: number; pending: number }, monthLabel: string) => {
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
    { label: 'Pendente', value: formatCurrency(summary.pending), color: [217, 119, 6] as [number,number,number] },
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
  const { preferences, updatePreference } = useUserPreferences();
  const stickyStats = preferences.livroCaixa.stickyStats ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();

  // ── View ─────────────────────────────────────────────────────────────────────
  const [view, setView]               = useState<'archive' | 'detail'>('archive');
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear());

  const { lockedMonths, toggleLockMonth } = useUserPreferences();

  const handleToggleLock = async (monthKey: string) => {
    try {
      await toggleLockMonth(monthKey);
      const isNowLocked = !lockedMonths.includes(monthKey);
      if (isNowLocked) {
        pushToast('success', 'Período Fechado', 'O Livro Caixa deste mês foi trancado para todos os usuários.');
      } else {
        pushToast('success', 'Período Aberto', 'O Livro Caixa deste mês foi destrancado.');
      }
    } catch (err) {
      pushToast('error', 'Erro ao alterar status do mês');
    }
  };

  const currentMonthKey = selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : '';
  const isMonthLocked = lockedMonths.includes(currentMonthKey);

  const checkLock = () => {
    if (currentMonthKey && isMonthLocked) {
      pushToast('error', 'LIVRO CAIXA FECHADO', 'Este período foi fechado. Para adicionar algo ou editar mude o botão de "FECHADO" para "ABERTO" no período selecionado.');
      return false;
    }
    return true;
  };

  // ── Archive layout (grid/list) persisted to localStorage ─────────────────────
  const [archiveLayout, setArchiveLayout] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('livrocaixa_layout') as 'grid' | 'list') || 'grid'
  );

  // ── Archive ───────────────────────────────────────────────────────────────────
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [deleteMonthConfirm, setDeleteMonthConfirm] = useState<MonthSummary | null>(null);

  // ── Detail ────────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]           = useState({ income: 0, expense: 0, balance: 0, pending: 0 });
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [flowFilter, setFlowFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [sortKey, setSortKey]           = useState<string>(() => localStorage.getItem('lc_sort_key') ?? 'date');
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>(() => (localStorage.getItem('lc_sort_order') as 'asc' | 'desc') ?? 'desc');
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = preferences.livroCaixa.itemsPerPage;

  const handleSort = (key: string) => {
    const next = key === sortKey && sortOrder === 'asc' ? 'desc' : 'asc';
    const nextKey = key;
    setSortKey(nextKey);
    setSortOrder(next);
    localStorage.setItem('lc_sort_key', nextKey);
    localStorage.setItem('lc_sort_order', next);
  };

  // ── Modal de pagamento rápido ─────────────────────────────────────────────────
  const [quickPayTx, setQuickPayTx] = useState<Transaction | null>(null);
  const [quickPayValue, setQuickPayValue] = useState('');
  const [quickPayDate, setQuickPayDate] = useState('');
  const [quickPayMethod, setQuickPayMethod] = useState('Pix');
  const [quickPayReceipt, setQuickPayReceipt] = useState('');

  // ── Modals ────────────────────────────────────────────────────────────────────
  const [isAuraContabilOpen, setIsAuraContabilOpen] = useState(false);
  const [isImportOpen, setIsImportOpen]   = useState(false);
  const [isNewTxOpen, setIsNewTxOpen]     = useState(false);
  const [isExtraMode, setIsExtraMode]     = useState(false);
  const [editingTx, setEditingTx]         = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteStats, setBulkDeleteStats] = useState({ count: 0, income: 0, expense: 0, balance: 0 });
  const [exceedConfirmData, setExceedConfirmData] = useState<{ amount: number, base: number } | null>(null);
  const [duplicateConfirmData, setDuplicateConfirmData] = useState<{ patientName: string; amount: number } | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<Transaction | null>(null);
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
  const [txStatus, setTxStatus]           = useState<Transaction['status']>('paid');
  const [txDueDate, setTxDueDate]         = useState<string | null>(null);

  // ── Patients combobox ─────────────────────────────────────────────────────────
  const [patients, setPatients] = useState<Array<{
    id: number; 
    name: string; 
    cpf: string;
    is_payer?: boolean;
    payer_name?: string;
    payer_cpf?: string;
    payer_phone?: string;
  }>>([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  // ── Comanda linking ───────────────────────────────────────────────────────────
  const [txPatientComandas, setTxPatientComandas] = useState<Array<{id: string; description: string; totalValue: number; paidValue: number; status: string}>>([]);
  const [txSelectedComandaId, setTxSelectedComandaId] = useState<string>('');

  // ── Services / Packages combobox ──────────────────────────────────────────────
  const [txServices, setTxServices] = useState<Array<{id: string; name: string; price: number; type: 'service' | 'package'}>>([]);
  const [txServiceQuery, setTxServiceQuery] = useState('');
  const [txServiceDropdownOpen, setTxServiceDropdownOpen] = useState(false);
  const [txSelectedService, setTxSelectedService] = useState<{id: string; name: string; price: number; type: 'service' | 'package'} | null>(null);
  const [txBaseAmount, setTxBaseAmount] = useState('');
  const [txDiscount, setTxDiscount] = useState('');
  const [txDiscountType, setTxDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const serviceRef = useRef<HTMLDivElement>(null);

  // ── Package Sessions (Drawer detail) ─────────────────────────────────────────
  interface PkgSession { id: number; date: string | null; time: string | null; status: string; professional_name: string | null; modality: string | null; notes: string | null; }
  interface PkgSessionsData { eligible: boolean; reason?: string; comanda?: { id: number; description: string | null; sessions_total: number | null; sessions_used: number | null; }; completed: PkgSession[]; upcoming: PkgSession[]; no_show: PkgSession[]; cancelled: PkgSession[]; }
  const [pkgSessions, setPkgSessions] = useState<PkgSessionsData | null>(null);
  const [pkgSessionsLoading, setPkgSessionsLoading] = useState(false);

  const fetchPkgSessions = async (txId: number) => {
    setPkgSessions(null);
    setPkgSessionsLoading(true);
    try {
      const data = await api.get<PkgSessionsData>(`/finance/${txId}/package-sessions`);
      setPkgSessions(data);
    } catch {
      setPkgSessions(null);
    } finally {
      setPkgSessionsLoading(false);
    }
  };

  // ── History Drawer ────────────────────────────────────────────────────────────
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyData, setHistoryData] = useState<{comanda?: any; payments?: any[]} | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (comandaId: string | number) => {
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const [comandasData, paymentsData] = await Promise.all([
        api.get<any[]>('/finance/comandas'),
        api.get<any[]>(`/finance/comandas/${comandaId}/payments`).catch(() => [])
      ]);
      const comanda = comandasData.find(c => String(c.id) === String(comandaId));
      setHistoryData({ comanda, payments: paymentsData });
    } catch {
      pushToast('error', 'Erro ao carregar histórico');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Receita Saúde receipt control ────────────────────────────────────────────
  const [rsFilter, setRsFilter] = useState<'all' | 'issued' | 'pending' | 'na'>('all');
  const [rsConfirm, setRsConfirm] = useState<{ tx: Transaction; newValue: boolean } | null>(null);
  const [rsLoading, setRsLoading] = useState<number | null>(null);

  const handleToggleRsReceipt = async (tx: Transaction, newValue: boolean) => {
    setRsLoading(tx.id);
    try {
      const updated = await api.patch<Transaction>(`/finance/${tx.id}/rs-receipt`, { issued: newValue });
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ...updated } : t));
      pushToast('success', newValue ? 'Recibo marcado como emitido' : 'Recibo desmarcado');
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao atualizar recibo');
    } finally {
      setRsLoading(null);
      setRsConfirm(null);
    }
  };

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

  // ─── Close service dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setTxServiceDropdownOpen(false);
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
          is_payer: p.is_payer !== undefined ? !!p.is_payer : true,
          payer_name: p.payer_name || '',
          payer_cpf: p.payer_cpf || '',
          payer_phone: p.payer_phone || '',
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
            if (sum.income > 0 || sum.expense > 0 || sum.pending > 0) {
              results.push({
                month, year: selectedYear,
                income: sum.income, expense: sum.expense, balance: sum.balance,
                pending: sum.pending,
                count: sum.count || 0,
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

  const handleQuickPay = (tx: Transaction) => {
    if (!checkLock()) return;
    // Pré-preenche com o valor pendente da transação
    const pending = tx.comanda_total !== undefined && tx.comanda_paid_value !== undefined
      ? Math.max(0, Number(tx.comanda_total) - Number(tx.comanda_paid_value))
      : Number(tx.amount || 0);
    setQuickPayTx(tx);
    setQuickPayValue(pending > 0 ? pending.toFixed(2).replace('.', ',') : String(tx.amount || '').replace('.', ','));
    setQuickPayDate(new Date().toISOString().split('T')[0]);
    setQuickPayMethod(tx.payment_method || 'Pix');
    setQuickPayReceipt('');
  };

  const handleSaveQuickPay = async () => {
    if (!quickPayTx) return;
    const amount = parseFloat(quickPayValue.replace(/\./g, '').replace(',', '.'));
    if (!amount || amount <= 0) {
      pushToast('error', 'Informe um valor válido.');
      return;
    }
    try {
      setIsSaving(true);
      await api.put(`/finance/${quickPayTx.id}`, {
        ...quickPayTx,
        status: 'paid',
        amount,
        date: quickPayDate,
        payment_method: quickPayMethod,
        observation: quickPayReceipt || quickPayTx.observation,
      });
      pushToast('success', 'Pagamento efetuado!', `"${quickPayTx.description}" marcado como PAGO.`);
      setQuickPayTx(null);
      fetchDetail();
      if (selectedTxForDetails?.id === quickPayTx.id) setSelectedTxForDetails(null);
    } catch {
      pushToast('error', 'Erro ao efetivar pagamento');
    } finally {
      setIsSaving(false);
    }
  };

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
    if (lockedMonths.includes(`${deleteMonthConfirm.year}-${deleteMonthConfirm.month}`)) {
      pushToast('error', 'LIVRO CAIXA FECHADO', 'Este período está fechado e não pode ser excluído.');
      return;
    }
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
      if (rsFilter !== 'all') {
        const eligible = isRsEligible(tx);
        if (rsFilter === 'na' && eligible) return false;
        if (rsFilter === 'na' && !eligible) return true;
        if (!eligible) return false;
        if (rsFilter === 'issued' && !tx.rs_receipt_issued) return false;
        if (rsFilter === 'pending' && tx.rs_receipt_issued) return false;
      }
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
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return (dateA - dateB) * dir;
      }
      if (sortKey === 'due_date') {
        const dateA = new Date(a.due_date || a.date).getTime();
        const dateB = new Date(b.due_date || b.date).getTime();
        return (dateA - dateB) * dir;
      }
      if (sortKey === 'amount') {
        return (Number(a.amount) - Number(b.amount)) * dir;
      }
      if (sortKey === 'payer') {
        return ((a.payer_name || a.patient_name || '').localeCompare(b.payer_name || b.patient_name || '')) * dir;
      }
      return 0;
    });

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, flowFilter, rsFilter, selectedMonth]);

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
    if (!checkLock()) return;
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
    setTxPatientComandas([]); setTxSelectedComandaId('');
    setEditingTx(null);
    setIsExtraMode(false);
    setTxStatus('paid');
    const today = new Date().toISOString().split('T')[0];
    setTxDueDate(today);
  };

  const openNewTx = () => {
    resetForm();
    if (selectedMonth) {
      const { month, year } = selectedMonth;
      const d = `${year}-${String(month).padStart(2,'0')}-01`;
      setTxDate(d);
      setTxDueDate(d);
    }
    setIsNewTxOpen(true);
  };

  const openNewExtra = (tx: Transaction) => {
    resetForm();
    setIsExtraMode(true);
    setIsNewTxOpen(true);
    setTxType('income');
    const d = new Date().toISOString().split('T')[0];
    setTxDate(d);
    setTxDueDate(d);
    setTxSelectedComandaId(String(tx.comanda_id));
    setTxPatientName(tx.patient_name || tx.payer_name || tx.beneficiary_name || '');
    setTxDescription(`Nova parcela - Comanda #${tx.comanda_id}`);
    
    if (tx.comanda_total !== undefined && tx.comanda_paid_value !== undefined) {
      const pending = Math.max(0, Number(tx.comanda_total) - Number(tx.comanda_paid_value));
      if (pending > 0) {
        const pendingStr = pending.toFixed(2).replace('.', ',');
        setTxBaseAmount(pendingStr);
        setTxAmount(pendingStr);
      }
    }
  };

  const openEditTx = (tx: Transaction) => {
    if (!checkLock()) return;
    setEditingTx(tx);
    setTxSelectedComandaId(tx.comanda_id ? String(tx.comanda_id) : '');
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
    setTxStatus(tx.status || 'paid');
    setTxDueDate(tx.due_date ? tx.due_date.slice(0, 10) : null);
    setPatientQuery(tx.beneficiary_name || tx.payer_name || '');
    setPatientDropdownOpen(false);
    setIsNewTxOpen(true);
  };

  const executeSaveTx = async () => {
    const parsedAmount = parseDisplayAmount(txAmount);
    setExceedConfirmData(null);
    setDuplicateConfirmData(null);
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
        observation: txObservation || null, status: txStatus,
        due_date: txDueDate || null,
        comanda_id: txSelectedComandaId || undefined,
        source: 'livrocaixa',
      };
      if (editingTx) {
        await api.put(`/finance/${editingTx.id}`, payload);
        pushToast('success', 'Lançamento atualizado!');
      } else {
        await api.post('/finance', payload);
        pushToast('success', 'Lançamento criado!');
      }
      setIsNewTxOpen(false); resetForm(); 
      if (view === 'archive') {
        fetchArchive();
      } else {
        fetchDetail();
      }
    } catch (err: any) {
      pushToast('error', err.message || 'Erro ao salvar lançamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTx = async () => {
    const parsedAmount = parseDisplayAmount(txAmount);
    if (!txAmount || parsedAmount <= 0) { pushToast('error', 'Informe um valor válido'); return; }
    if (!txDate) { pushToast('error', 'Informe a data'); return; }

    const [y, m] = txDate.split('-');
    if (lockedMonths.includes(`${Number(y)}-${Number(m)}`)) {
      pushToast('error', 'LIVRO CAIXA FECHADO', 'O período da data selecionada está fechado. Destranque-o para adicionar um lançamento.');
      return;
    }

    if (txSelectedComandaId && txBaseAmount) {
      const parsedBase = parseDisplayAmount(txBaseAmount);
      if (parsedAmount > parsedBase) {
        setExceedConfirmData({ amount: parsedAmount, base: parsedBase });
        return;
      }
    }

    // Duplicate detection: same patient + same value + same month (only for new transactions, not edits)
    if (!editingTx && txPatientName && txType === 'income') {
      const txMonth = txDate ? new Date(txDate).getMonth() : -1;
      const txYear = txDate ? new Date(txDate).getFullYear() : -1;
      const duplicate = transactions.find(t =>
        t.type === 'income' &&
        t.status !== 'cancelled' &&
        Math.abs(t.amount - parsedAmount) < 0.01 &&
        new Date(t.date).getMonth() === txMonth &&
        new Date(t.date).getFullYear() === txYear &&
        (
          (t.payer_name || '').toLowerCase() === txPatientName.toLowerCase() ||
          (t.beneficiary_name || '').toLowerCase() === txPatientName.toLowerCase()
        )
      );
      if (duplicate) {
        setDuplicateConfirmData({ patientName: txPatientName, amount: parsedAmount });
        return;
      }
    }

    await executeSaveTx();
  };

  const handleDelete = async (id: number) => {
    if (!checkLock()) return;
    try {
      await api.delete(`/finance/${id}`);
      pushToast('success', 'Lançamento removido');
      setDeleteConfirmId(null); fetchDetail();
    } catch { pushToast('error', 'Erro ao remover lançamento'); }
  };

  const handleRepeat = async (id: number) => {
    if (!checkLock()) return;
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

  const executeBulkDelete = async () => {
    if (!selectedTxIds.size) return;
    setIsBulkDeleteConfirmOpen(false);
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

  const handleBulkDelete = () => {
    if (!checkLock()) return;
    if (!selectedTxIds.size) return;
    
    const selectedTxs = filtered.filter(tx => selectedTxIds.has(String(tx.id)));
    const stats = selectedTxs.reduce((acc, curr) => {
      const amt = Number(curr.amount);
      if (curr.type === 'income') {
        acc.income += amt;
        acc.balance += amt;
      } else {
        acc.expense += amt;
        acc.balance -= amt;
      }
      return acc;
    }, { count: selectedTxIds.size, income: 0, expense: 0, balance: 0 });

    setBulkDeleteStats(stats);
    setIsBulkDeleteConfirmOpen(true);
  };

  const handleBulkRepeat = async () => {
    if (!checkLock()) return;
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
      header: 'Vencimento',
      sortKey: 'due_date',
      render: (tx) => {
        const d = safeDate(tx.due_date || tx.date);
        const isActuallyDifferent = tx.due_date && tx.due_date.slice(0, 10) !== tx.date.slice(0, 10);
        const status = getStatus(tx);
        
        return (
          <div className="flex flex-col min-w-[70px]">
            <span className={`text-[10px] font-black uppercase tracking-tight ${isActuallyDifferent ? 'text-amber-600' : 'text-slate-400'}`}>
              {formatDate(tx.due_date || tx.date)}
            </span>
            {status === 'overdue' && (
              <span className="text-[8px] font-black text-rose-500 uppercase animate-pulse">Atrasado</span>
            )}
            {isActuallyDifferent && status !== 'overdue' && (
              <span className="text-[8px] font-black text-slate-300 uppercase">Programado</span>
            )}
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
            {tx.comanda_id && (
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                <ShoppingBag size={9} /> Comanda #{tx.comanda_id}
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
        <div className="text-right flex flex-col items-end">
          <p className={`text-base font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.comanda_id && tx.comanda_paid_value !== undefined ? Number(tx.comanda_paid_value) : tx.amount)}
          </p>
          
          <div className="flex flex-col items-end">
          {/* Status Badge */}
          <div className="flex items-center justify-end mt-1">
            {(() => {
              const status = getStatus(tx);
              const info = STATUS_INFO[status] || STATUS_INFO.pending;
              const Icon = info.icon;
              return (
                <div title={info.label} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${info.color}`}>
                  <Icon size={9} />
                  {info.label}
                </div>
              );
            })()}
          </div>

            {tx.comanda_id && (
              <span className="text-[10px] font-bold text-slate-400 mt-1 leading-none italic">
                (Desta entrada: {formatCurrency(tx.amount)})
              </span>
            )}
          </div>

          {tx.comanda_id && tx.comanda_total !== undefined && tx.comanda_paid_value !== undefined && (
            <span className="text-[10px] font-bold text-slate-400 mt-1 leading-none italic">
              (Total da comanda: {formatCurrency(tx.comanda_total)})
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Recibo RS',
      headerClassName: 'text-center w-[90px]',
      render: (tx) => {
        const eligible = isRsEligible(tx);
        const issued = !!tx.rs_receipt_issued;
        const isLoading = rsLoading === tx.id;

        if (!eligible) {
          return (
            <div className="flex justify-center">
              <span title="Este lançamento não se aplica a recibo Receita Saúde" className="text-slate-200 cursor-default select-none text-lg leading-none">—</span>
            </div>
          );
        }

        const tooltip = issued
          ? `Recibo emitido${tx.rs_receipt_issued_at ? ` em ${new Date(tx.rs_receipt_issued_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}${tx.rs_receipt_note ? `\n${tx.rs_receipt_note}` : ''}`
          : 'Recibo Receita Saúde ainda não emitido';

        return (
          <div className="flex justify-center">
            {isLoading ? (
              <Loader2 size={18} className="animate-spin text-slate-300" />
            ) : (
              <button
                title={tooltip}
                onClick={(e) => { e.stopPropagation(); setRsConfirm({ tx, newValue: !issued }); }}
                className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                  issued
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                }`}
              >
                {issued ? <Receipt size={14} /> : <CircleDashed size={14} />}
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: '',
      headerClassName: 'w-[180px] text-right',
      render: (tx) => (
        <div className="flex items-center justify-end gap-1.5 min-w-[150px]">
          {tx.comanda_id && (
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openHistory(tx.comanda_id!); }}
              title="Histórico da Comanda"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-500 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <ShoppingBag size={14} />
            </button>
          )}
          {hasPermission('manage_payments') && tx.status !== 'paid' && tx.status !== 'confirmed' && (
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleQuickPay(tx); }}
              title="Efetivar Pagamento Agora"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-lg shadow-emerald-200 transition-all"
            >
              <Check size={14} />
            </button>
          )}
          {hasPermission('manage_payments') && (
            <>
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditTx(tx); }}
                title="Editar Lançamento"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200 hover:shadow-sm transition-all"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRepeat(tx.id); }}
                title="Repetir no Próximo Mês"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirmId(tx.id); }}
                title="Excluir Lançamento"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:shadow-sm transition-all"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ─── Render Archive ───────────────────────────────────────────────────────────

  const renderArchive = () => (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 space-y-6 animate-fadeIn font-sans">
      <PageHeader
        icon={<BookOpen />}
        title="Arquivo Financeiro"
        subtitle="GESTÃO DE PERÍODOS CONSOLIDADOS"
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-2">
            {/* Year selector */}
            <div className="flex items-center gap-1 bg-slate-900 text-white rounded-2xl px-3 py-2 font-black text-[10px] uppercase tracking-widest h-10">
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
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 h-10">
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
              className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
            >
              <Upload size={14} /> Importar
            </button>

            <button
              onClick={() => openNewTx()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-10 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 tracking-widest"
            >
              <Plus size={16} /> Novo Lançamento
            </button>
          </div>
        }
      />

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
              subtitle={
                lockedMonths.includes(`${ms.year}-${ms.month}`) ? (
                  <span className="text-rose-500 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">FECHADO</span>
                ) : (
                  <span className="text-emerald-500 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">ABERTO</span>
                )
              }
              avatarIcon={<BookOpen size={20} />}
              topActions={[
                {
                  label: 'Excluir mês',
                  icon: <Trash2 size={13} />,
                  variant: 'danger',
                  onClick: () => {
                    if (lockedMonths.includes(`${ms.year}-${ms.month}`)) {
                      pushToast('error', 'LIVRO CAIXA FECHADO', 'Este período está fechado e não pode ser excluído.');
                      return;
                    }
                    setDeleteMonthConfirm(ms);
                  },
                },
              ]}
              stats={[
                { label: 'Receitas',    value: formatCurrency(ms.income),  tone: 'success' },
                { label: 'Despesas',    value: formatCurrency(ms.expense), tone: 'danger'  },
                { label: 'Pendente',    value: formatCurrency(ms.pending), tone: 'default' },
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
                    <div className="text-[10px] font-bold uppercase tracking-widest mt-1">
                      {lockedMonths.includes(`${ms.year}-${ms.month}`) ? (
                        <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Fechado</span>
                      ) : (
                        <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">Aberto</span>
                      )}
                    </div>
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
              header: 'Pendente',
              render: (ms) => (
                <p className="font-black text-amber-600">{formatCurrency(ms.pending)}</p>
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
                    onClick={(e: React.MouseEvent) => { 
                      e.stopPropagation(); 
                      if (lockedMonths.includes(`${ms.year}-${ms.month}`)) {
                        pushToast('error', 'LIVRO CAIXA FECHADO', 'Este período está fechado e não pode ser excluído.');
                        return;
                      }
                      setDeleteMonthConfirm(ms); 
                    }}
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
      <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 space-y-6 animate-fadeIn font-sans">
        <PageHeader
            icon={<BookOpen />}
            title="Livro Caixa"
            subtitle={displayMonth}
            containerClassName="mb-0"
            showBackButton
            onBackClick={() => goToArchive()}
            actions={
                <div className="flex items-center gap-2">
                    {/* Export dropdown */}
                    <div className="relative" ref={exportRef}>
                      <button
                        onClick={() => setShowExportMenu(v => !v)}
                        className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
                      >
                        <Download size={14} /> Exportar
                      </button>
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                          {[
                            { label: 'CSV', action: () => { exportCSV(filtered, displayMonth); setShowExportMenu(false); } },
                            { label: 'Excel (XLSX)', action: () => { exportXLS(filtered, displayMonth, summary); setShowExportMenu(false); } },
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

                    {/* Lock toggle button */}
                    {isAdmin && (
                      <button
                        onClick={() => handleToggleLock(currentMonthKey)}
                        className={`flex items-center gap-2 px-4 h-10 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                          isMonthLocked 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        {isMonthLocked ? <><LockIcon size={14} /> Fechado</> : <><UnlockIcon size={14} /> Aberto</>}
                      </button>
                    )}

                    {hasPermission('view_financial_reports') && (
                      <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all shadow-sm"
                      >
                        <Upload size={14} /> Importar
                      </button>
                    )}

                    {hasPermission('manage_payments') && (
                      <button
                        onClick={() => { handleOpenNewTxFromArchive(); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-10 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 tracking-widest"
                      >
                        <Plus size={16} /> Novo
                      </button>
                    )}
                  </div>
            }
        />

        {/* KPI + Search — sticky wrapper */}
        <div className={stickyStats ? 'sticky top-[88px] z-30 space-y-3 bg-slate-50/95 backdrop-blur-md pt-3 pb-3 -mx-6 px-6 shadow-md shadow-slate-200/60 rounded-b-3xl' : 'space-y-3'}>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entradas (Pagos)</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.income)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all">
              <TrendingDown size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Saídas (Pagos)</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.expense)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Total Pendente</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(summary.pending)}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-slate-300 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <Wallet size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo Líquido</p>
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
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de fluxo */}
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

            {/* Filtro Receita Saúde */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <Receipt size={10} className="text-slate-400 ml-1 shrink-0" />
              {[
                { value: 'all',     label: 'Todos' },
                { value: 'pending', label: 'Pendente' },
                { value: 'issued',  label: 'Emitido' },
                { value: 'na',      label: 'N/A' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setRsFilter(f.value as any)}
                  title={f.value === 'pending' ? 'Recibo ainda não emitido' : f.value === 'issued' ? 'Recibo já emitido' : f.value === 'na' ? 'Não se aplica' : 'Todos os lançamentos'}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    rsFilter === f.value
                      ? f.value === 'pending'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : f.value === 'issued'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Botão fixar barra */}
            <button
              onClick={() => updatePreference('livroCaixa', { stickyStats: !stickyStats })}
              title={stickyStats ? 'Desafixar barra' : 'Fixar barra ao rolar'}
              className={`p-1.5 rounded-xl border transition-all ${stickyStats ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300'}`}
            >
              {stickyStats ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
          </div>
        </div>
        </div>{/* end sticky wrapper */}

        {/* Bulk action bar */}
        {selectedTxIds.size > 0 && (
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {selectedTxIds.size} selecionado(s)
            </span>
            <div className="flex-1" />
            {hasPermission('manage_payments') && (
              <>
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
              </>
            )}
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
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
          const safePage   = Math.min(currentPage, totalPages);
          const paginated  = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
          return (
            <>
              <GridTable<Transaction>
                data={paginated}
                columns={columns}
                keyExtractor={(tx) => tx.id}
                selectedIds={selectedTxIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                emptyMessage="Nenhum lançamento encontrado para este período."
                sortKey={sortKey}
                sortOrder={sortOrder}
                 onSort={handleSort}
                onRowClick={(tx) => { setSelectedTxForDetails(tx); fetchPkgSessions(tx.id); }}
              />
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white rounded-b-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Linhas por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        updatePreference('livroCaixa', { itemsPerPage: Number(e.target.value) });
                        setCurrentPage(1);
                      }}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none"
                    >
                      {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="text-xs text-slate-400">{filtered.length} total</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">Página {safePage} de {totalPages}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 transition-all"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
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
        maxWidth="2xl"
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
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tipo de Movimentação</label>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => { setTxType('income'); setTxCategory('Geral'); setTxSelectedService(null); setTxServiceQuery(''); setTxBaseAmount(''); setTxDiscount(''); }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${txType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>
                  Receita
                </button>
                <button onClick={() => { setTxType('expense'); setTxCategory(CATEGORIES_EXPENSE[0]); setTxSelectedService(null); setTxServiceQuery(''); setTxBaseAmount(''); setTxDiscount(''); }}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${txType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-500'}`}>
                  Despesa
                </button>
              </div>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Data da Operação</label>
              <DatePicker value={txDate} onChange={setTxDate} placeholder="Selecionar data" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Data de Vencimento</label>
              <DatePicker value={txDueDate} onChange={setTxDueDate} placeholder="Quando vence?" />
            </div>
          </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Status do Lançamento</label>
            <div className={`grid grid-cols-${STATUS_OPTIONS.length} gap-2 bg-slate-100 p-1.5 rounded-2xl`}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTxStatus(opt.id as any)}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    txStatus === opt.id
                      ? (opt.id === 'cancelled' ? 'bg-rose-500 text-white shadow-sm' : opt.id === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm')
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Identification — MOVED UP */}
          {!isExtraMode && (
            <div className="border-2 border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Identificação do Atendimento</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={txPayerIsPatient} onChange={(e) => setTxPayerIsPatient(e.target.checked)} className="accent-slate-900 w-4 h-4" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pagador é o Paciente</span>
              </label>
            </div>
            <div ref={patientRef} className="relative">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                {txPayerIsPatient ? 'Paciente / Pagador' : 'Paciente'}
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={patientQuery}
                  onChange={(e) => { setPatientQuery(e.target.value); setPatientDropdownOpen(true); if (!e.target.value) { setTxPatientName(''); setTxPatientCpf(''); } }}
                  onFocus={() => setPatientDropdownOpen(true)}
                  placeholder="Buscar paciente..."
                  className="w-full p-3 pl-9 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                />
                {patientQuery && (
                  <button type="button" onClick={() => { setPatientQuery(''); setTxPatientName(''); setTxPatientCpf(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><X size={14} /></button>
                )}
              </div>
              {patientDropdownOpen && patientQuery.length >= 1 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {patients.filter(p => p.name.toLowerCase().includes(patientQuery.toLowerCase()) || p.cpf.includes(patientQuery)).slice(0, 8).map(p => (
                    <button key={p.id} type="button" onClick={() => {
                        setTxPatientName(p.name);
                        setTxPatientCpf(maskCpf(p.cpf.replace(/\D/g,'')));
                        
                        // Auto-fill payer info if patient is not the payer
                        if (!p.is_payer && p.payer_name) {
                          setTxPayerIsPatient(false);
                          setTxPayerName(p.payer_name);
                          if (p.payer_cpf) setTxPayerCpf(maskCpf(p.payer_cpf.replace(/\D/g,'')));
                        } else {
                          setTxPayerIsPatient(true);
                          setTxPayerName('');
                          setTxPayerCpf('');
                        }

                        setPatientQuery(p.name);
                        setPatientDropdownOpen(false);
                        setTxSelectedComandaId('');
                        setTxPatientComandas([]);
                        api.get<any[]>('/finance/comandas').then((all: any[]) => {
                          const open = (Array.isArray(all) ? all : [])
                            .filter((c: any) => {
                              const isPatient = String(c.patient_id || c.patientId || '') === String(p.id);
                              const isOpen = c.status === 'open';
                              const totalVal = Number(c.totalValue || c.total || 0);
                              const paidVal = Number(c.paidValue || c.paid_value || 0);
                              const hasPending = totalVal > paidVal;
                              return isPatient && isOpen && hasPending;
                            })
                            .map((c: any) => {
                              const items: any[] = c.items || [];
                              const serviceLabel = items.length > 0
                                ? items.map((i: any) => i.serviceName || i.name || '').filter(Boolean).join(', ')
                                : '';
                              const descLabel = serviceLabel || c.description || `Comanda #${c.id}`;
                              return {
                                id: String(c.id),
                                description: descLabel,
                                totalValue: Number(c.totalValue || c.total || 0),
                                paidValue: Number(c.paidValue || c.paid_value || 0),
                                status: c.status,
                              };
                            });
                          setTxPatientComandas(open);
                        }).catch(() => {});
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
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
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                CPF {txPayerIsPatient ? 'do Paciente / Pagador' : 'do Paciente'}
              </label>
              <input type="text" value={txPatientCpf} onChange={(e) => setTxPatientCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14}
                className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400" />
            </div>
            {!txPayerIsPatient && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nome do Pagador</label>
                  <input type="text" value={txPayerName} onChange={(e) => setTxPayerName(e.target.value)} placeholder="Nome completo do pagador"
                    className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">CPF do Pagador</label>
                  <input type="text" value={txPayerCpf} onChange={(e) => setTxPayerCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14}
                    className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400" />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Comanda linking — aparece quando há comandas abertas para o paciente ou se for edição com comanda já vinculada */}
          {(editingTx && editingTx.comanda_id) || (isExtraMode && txSelectedComandaId) ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={12}/> Pagamento Vinculado</p>
              <p className="text-xs font-bold text-indigo-900 leading-tight">
                {isExtraMode 
                  ? `Novo pagamento sendo lançado para abater o saldo da Comanda #${txSelectedComandaId}. O paciente já está preenchido automaticamente.` 
                  : `Você está editando o recibo da Comanda #${editingTx?.comanda_id}. Para corrigir este lançamento, basta alterar o valor abaixo. A alteração será repassada automaticamente à Comanda.`}
              </p>
            </div>
          ) : !isExtraMode && txPatientComandas.length > 0 ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
              <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                Vincular Comanda Aberta
              </label>
              <select
                value={txSelectedComandaId}
                onChange={(e) => {
                  const id = e.target.value;
                  setTxSelectedComandaId(id);
                  if (id) {
                    const c = txPatientComandas.find(x => x.id === id);
                    if (c) {
                      const pending = Math.max(0, c.totalValue - c.paidValue);
                      if (pending > 0) {
                        const pendingStr = pending.toFixed(2).replace('.', ',');
                        setTxBaseAmount(pendingStr);
                        setTxAmount(pendingStr);
                        setTxDiscount('');
                      }
                      if (!txDescription) setTxDescription(c.description);
                    }
                  }
                }}
                className="w-full p-3 rounded-xl border border-indigo-200 bg-white outline-none focus:border-indigo-400 text-sm font-bold text-slate-700 appearance-none"
              >
                <option value="">— Selecionar comanda —</option>
                {txPatientComandas.map(c => {
                  const pending = Math.max(0, c.totalValue - c.paidValue);
                  return (
                    <option key={c.id} value={c.id}>
                      #{c.id} · {c.description} · Pendente: R$ {pending.toFixed(2).replace('.', ',')}
                    </option>
                  );
                })}
              </select>
              {txSelectedComandaId && (
                <p className="text-[10px] font-black text-indigo-500">
                  Lançamento será vinculado a esta comanda para rastreio contábil.
                </p>
              )}
            </div>
          ) : null}

          {/* Service / Package combobox (income) OR Category tags (expense) */}
          {!isExtraMode && (
            <>
              {txType === 'income' ? (
                <div ref={serviceRef} className="relative">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Serviço / Pacote</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={txServiceQuery}
                  onChange={(e) => { setTxServiceQuery(e.target.value); setTxServiceDropdownOpen(true); if (!e.target.value) { setTxSelectedService(null); setTxBaseAmount(''); setTxDiscount(''); } }}
                  onFocus={() => setTxServiceDropdownOpen(true)}
                  placeholder="Buscar serviço ou pacote..."
                  className="w-full p-3 pl-9 rounded-2xl border-2 border-slate-100 bg-white outline-none focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                />
                {txSelectedService && (
                  <button type="button" onClick={() => { setTxSelectedService(null); setTxServiceQuery(''); setTxBaseAmount(''); setTxDiscount(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><X size={14} /></button>
                )}
              </div>
              {txServiceDropdownOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {txServices.filter(s => !txServiceQuery || s.name.toLowerCase().includes(txServiceQuery.toLowerCase())).slice(0, 15).map(s => (
                    <button key={s.id} type="button" onClick={() => {
                        setTxSelectedService(s);
                        setTxServiceQuery(s.name);
                        setTxServiceDropdownOpen(false);
                        setTxCategory(s.type === 'package' ? 'Pacote de Sessões' : 'Sessão Individual');
                        setTxDescription(s.name);
                        const priceStr = s.price.toFixed(2).replace('.', ',');
                        setTxBaseAmount(priceStr);
                        setTxAmount(priceStr);
                        setTxDiscount('');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{s.name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${s.type === 'package' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-600'}`}>
                          {s.type === 'package' ? 'Pacote' : 'Serviço'}
                        </span>
                      </div>
                      <span className="text-sm font-black text-slate-700">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                    </button>
                  ))}
                  {txServices.filter(s => s.name.toLowerCase().includes(txServiceQuery.toLowerCase())).length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400 font-bold">Nenhum resultado encontrado</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES_EXPENSE.map((cat) => (
                  <button key={cat} type="button" onClick={() => setTxCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${txCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Descrição Detalhada</label>
            <input type="text" value={txDescription} onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Ex: Pacote Mensal – Paciente João Silva"
              className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-slate-400 transition-all text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400" />
          </div>

          {/* Amount + Discount + Method */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 flex items-center justify-between">
                  <span>VALOR {txSelectedComandaId && txBaseAmount ? '(Da Parcela)' : '(R$)'}</span>
                  {txType === 'income' && txSelectedComandaId && txBaseAmount && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md leading-none ${parseDisplayAmount(txAmount) < parseDisplayAmount(txBaseAmount) ? 'bg-amber-100 text-amber-700' : parseDisplayAmount(txAmount) === parseDisplayAmount(txBaseAmount) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200'}`}>
                      {parseDisplayAmount(txAmount) < parseDisplayAmount(txBaseAmount) ? `NOVO SALDO RESTANTE: R$ ${(parseDisplayAmount(txBaseAmount) - parseDisplayAmount(txAmount)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : parseDisplayAmount(txAmount) === parseDisplayAmount(txBaseAmount) ? 'QUITARÁ A COMANDA' : `CRÉDITO EXCEDIDO: R$ ${(parseDisplayAmount(txAmount) - parseDisplayAmount(txBaseAmount)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black ${txType === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>R$</span>
                  <input type="text" inputMode="numeric" value={txAmount} onChange={(e) => setTxAmount(maskCurrency(e.target.value))} placeholder="0,00"
                    className={`w-full text-lg font-black p-3.5 pl-11 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white transition-all ${txType === 'income' ? (txSelectedComandaId && txBaseAmount ? (parseDisplayAmount(txAmount) < parseDisplayAmount(txBaseAmount) ? 'focus:border-amber-400 text-amber-700' : parseDisplayAmount(txAmount) === parseDisplayAmount(txBaseAmount) ? 'focus:border-emerald-400 text-emerald-700' : 'focus:border-rose-400 text-rose-700') : 'focus:border-emerald-400 text-emerald-700') : 'focus:border-rose-400 text-rose-700'}`} />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Meio de Recebimento</label>
                <select value={txMethod} onChange={(e) => setTxMethod(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-slate-400 transition-all text-sm font-bold text-slate-700 appearance-none">
                  {PAYMENT_METHODS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              </div>
            </div>

            {/* Discount row — only for income with service selected */}
            {txType === 'income' && txBaseAmount && (
              <div className="flex items-end gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 px-1">Desconto</label>
                  <input type="text" inputMode="numeric" value={txDiscount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9,]/g, '');
                      setTxDiscount(v);
                      const base = parseFloat(txBaseAmount.replace(',', '.')) || 0;
                      const disc = parseFloat(v.replace(',', '.')) || 0;
                      const final = txDiscountType === 'percentage'
                        ? Math.max(0, base - (base * disc / 100))
                        : Math.max(0, base - disc);
                      setTxAmount(final.toFixed(2).replace('.', ','));
                    }}
                    placeholder="0,00"
                    className="w-full p-2.5 rounded-xl border border-amber-200 bg-white outline-none focus:border-amber-400 text-sm font-bold text-amber-700 placeholder:font-normal placeholder:text-amber-300"
                  />
                </div>
                <div className="flex bg-white border border-amber-200 rounded-xl overflow-hidden shrink-0">
                  <button type="button" onClick={() => {
                      setTxDiscountType('fixed');
                      const base = parseFloat(txBaseAmount.replace(',', '.')) || 0;
                      const disc = parseFloat(txDiscount.replace(',', '.')) || 0;
                      setTxAmount(Math.max(0, base - disc).toFixed(2).replace('.', ','));
                    }}
                    className={`px-3 py-2.5 text-[10px] font-black transition-all ${txDiscountType === 'fixed' ? 'bg-amber-500 text-white' : 'text-amber-500 hover:bg-amber-50'}`}>R$</button>
                  <button type="button" onClick={() => {
                      setTxDiscountType('percentage');
                      const base = parseFloat(txBaseAmount.replace(',', '.')) || 0;
                      const disc = parseFloat(txDiscount.replace(',', '.')) || 0;
                      setTxAmount(Math.max(0, base - (base * disc / 100)).toFixed(2).replace('.', ','));
                    }}
                    className={`px-3 py-2.5 text-[10px] font-black transition-all ${txDiscountType === 'percentage' ? 'bg-amber-500 text-white' : 'text-amber-500 hover:bg-amber-50'}`}>%</button>
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

      {/* ── Exceed Value Confirm Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={exceedConfirmData !== null}
        onClose={() => setExceedConfirmData(null)}
        title="Lançamento Excedente"
        maxWidth="lg"
        footer={
          <>
            <button
              onClick={() => setExceedConfirmData(null)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeSaveTx}
              disabled={isSaving}
              className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
            >
              <CheckCircle2 size={14} /> Confirmar Lançamento
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight mb-2">
                O valor informado ({exceedConfirmData && <strong className="font-black text-amber-600">R$ {exceedConfirmData.amount.toFixed(2).replace('.', ',')}</strong>}) ultrapassa o saldo devedor apontado nesta Comanda em {exceedConfirmData && <strong className="font-black text-amber-600">R$ {(exceedConfirmData.amount - exceedConfirmData.base).toFixed(2).replace('.', ',')}</strong>}.
              </p>
              <p className="text-sm font-medium text-slate-500 leading-tight">
                Deseja lançar esse montante maior e abater a diferença como um <strong className="text-slate-700">crédito extra na comanda</strong>?
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Duplicate Transaction Confirm Modal ──────────────────────────────── */}
      <Modal
        isOpen={duplicateConfirmData !== null}
        onClose={() => setDuplicateConfirmData(null)}
        title="Lançamento Duplicado?"
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setDuplicateConfirmData(null)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setDuplicateConfirmData(null); executeSaveTx(); }}
              disabled={isSaving}
              className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
            >
              <CheckCircle2 size={14} /> Sim, Lançar Mesmo Assim
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight mb-2">
                Já existe um lançamento de{' '}
                <strong className="text-amber-600">
                  {duplicateConfirmData && formatCurrency(duplicateConfirmData.amount)}
                </strong>{' '}
                para <strong className="text-slate-800">{duplicateConfirmData?.patientName}</strong> neste mês.
              </p>
              <p className="text-sm font-medium text-slate-500 leading-tight">
                Tem certeza que deseja lançar novamente? Pode ser um lançamento duplicado.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal Efetivar Pagamento ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!quickPayTx}
        onClose={() => setQuickPayTx(null)}
        title="Lançar Novo Pagamento"
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <button
              onClick={() => setQuickPayTx(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveQuickPay}
              disabled={isSaving}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Efetivar pagamento
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Valor do pagamento</label>
            <input
              value={quickPayValue}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d,]/g, '');
                setQuickPayValue(raw);
              }}
              placeholder="0,00"
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Data</label>
              <DatePicker
                value={quickPayDate}
                onChange={(val) => setQuickPayDate(val || '')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Método</label>
              <select
                value={quickPayMethod}
                onChange={(e) => setQuickPayMethod(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Débito">Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Código de transação / comprovante</label>
            <input
              value={quickPayReceipt}
              onChange={(e) => setQuickPayReceipt(e.target.value)}
              placeholder="Ex: 123ABC..."
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
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
              <Trash2 size={14} /> Excluir permanentemente
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <AlertCircle size={24} className="text-rose-500 shrink-0" />
            <div>
              <p className="text-sm font-black text-rose-700 uppercase tracking-wider mb-1">Atenção!</p>
              <p className="text-sm font-bold text-rose-600 leading-snug">
                Você está prestes a excluir um lançamento do sistema. Esta ação não poderá ser desfeita.
              </p>
            </div>
          </div>

          {deleteConfirmId && transactions.find(t => t.id === deleteConfirmId) && (
            <div className="px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item sendo removido:</p>
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-700 truncate">{transactions.find(t => t.id === deleteConfirmId)?.description}</p>
                    <p className="text-[10px] font-bold text-slate-400">{transactions.find(t => t.id === deleteConfirmId)?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${transactions.find(t => t.id === deleteConfirmId)?.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {transactions.find(t => t.id === deleteConfirmId)?.type === 'income' ? '+' : '-'}{formatCurrency(transactions.find(t => t.id === deleteConfirmId)?.amount || 0)}
                    </p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── RS Receipt Confirm Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={rsConfirm !== null}
        onClose={() => setRsConfirm(null)}
        title={rsConfirm?.newValue ? 'Marcar recibo como emitido' : 'Desmarcar recibo'}
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setRsConfirm(null)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => rsConfirm && handleToggleRsReceipt(rsConfirm.tx, rsConfirm.newValue)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 ${
                rsConfirm?.newValue ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'
              }`}
            >
              <Receipt size={14} /> Confirmar
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div className={`flex items-start gap-4 p-4 rounded-2xl border ${rsConfirm?.newValue ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <Receipt size={22} className={rsConfirm?.newValue ? 'text-emerald-500 shrink-0' : 'text-amber-500 shrink-0'} />
            <div>
              <p className={`text-sm font-black uppercase tracking-wider mb-1 ${rsConfirm?.newValue ? 'text-emerald-700' : 'text-amber-700'}`}>
                {rsConfirm?.newValue ? 'Confirmar emissão do recibo' : 'Desmarcar recibo emitido'}
              </p>
              <p className="text-sm font-bold text-slate-600 leading-snug">
                {rsConfirm?.newValue
                  ? 'Confirme que o recibo do Receita Saúde deste lançamento já foi emitido no portal.'
                  : 'Deseja marcar este lançamento como recibo ainda não emitido?'}
              </p>
            </div>
          </div>
          {rsConfirm?.tx && (
            <div className="px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lançamento:</p>
              <p className="text-sm font-black text-slate-700">{rsConfirm.tx.description}</p>
              <p className="text-[10px] font-bold text-slate-400">{rsConfirm.tx.patient_name || rsConfirm.tx.payer_name} · {formatCurrency(rsConfirm.tx.amount)}</p>
            </div>
          )}
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
              <Trash2 size={14} /> Sim, excluir tudo
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-3">
          <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 flex items-center justify-center shadow-sm shrink-0">
               <AlertCircle size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 px-0.5">Operação Crítica</p>
               <p className="text-sm font-bold text-rose-700 leading-snug">
                  Você está prestes a apagar <span className="font-black underline">todos os registros</span> de {deleteMonthConfirm?.label}.
               </p>
            </div>
          </div>

          {deleteMonthConfirm && (
             <div className="grid grid-cols-2 gap-3 px-1">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total de Registros</p>
                   <p className="text-lg font-black text-slate-700 leading-none">{deleteMonthConfirm.count} linhas</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Saldo Movimentado</p>
                   <p className="text-lg font-black text-slate-700 leading-none">{formatCurrency(deleteMonthConfirm.balance)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 col-span-1">
                   <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 leading-none">Entradas</p>
                   <p className="text-base font-black text-emerald-600 leading-none">+{formatCurrency(deleteMonthConfirm.income)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 col-span-1">
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 leading-none">Saídas</p>
                   <p className="text-base font-black text-rose-600 leading-none">-{formatCurrency(deleteMonthConfirm.expense)}</p>
                </div>
             </div>
          )}

          <p className="text-xs font-medium text-slate-500 text-center px-4 leading-relaxed">
            Esta ação é irreversível e irá afetar os relatórios anuais e o saldo acumulado do sistema. Tem certeza?
          </p>
        </div>
      </Modal>

      {/* ── History Drawer ─────────────────────────────────────────────────────── */}
      <ActionDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title="Histórico de Pagamentos"
        subtitle="DETALHES E VINCULAÇÕES DA COMANDA"
      >
        <div className="p-6">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={32} className="animate-spin mb-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Buscando histórico...</span>
            </div>
          ) : historyData?.comanda ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Comanda Summary Box */}
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Status Atual</p>
                <h3 className="text-xl font-black text-indigo-800 mb-4">{historyData.comanda.description || "Comanda #" + historyData.comanda.id}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Total</p>
                    <p className="text-sm font-black text-slate-700">{formatCurrency(Number(historyData.comanda.total || 0))}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-indigo-100/50">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Recebido (Pago)</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(Number(historyData.comanda.paid_value || 0))}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-indigo-100/50 col-span-2 shadow-sm shadow-amber-100">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Saldo Restante (Pendente)</p>
                      <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Number(historyData.comanda.total || 0) - Number(historyData.comanda.paid_value || 0) <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {Number(historyData.comanda.total || 0) - Number(historyData.comanda.paid_value || 0) <= 0 ? 'QUITADO' : 'EM ABERTO'}
                      </p>
                    </div>
                    <p className={`text-xl font-black mt-1 ${Number(historyData.comanda.total || 0) - Number(historyData.comanda.paid_value || 0) <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {formatCurrency(Math.max(0, Number(historyData.comanda.total || 0) - Number(historyData.comanda.paid_value || 0)))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payments List */}
              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  <Clock size={12} />
                  Transações Pixadas / Pagas
                </h4>
                
                {historyData.payments && historyData.payments.length > 0 ? (
                  <div className="space-y-3">
                    {historyData.payments.map((p: any, i: number) => (
                      <div key={p.id || i} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-700">{formatCurrency(Number(p.amount))}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{formatDate(p.payment_date || p.date)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{METHOD_LABEL[p.payment_method] || p.payment_method}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400">Nenhum pagamento registrado</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle size={32} className="mb-4 opacity-50 text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Comanda não encontrada ou dados indisponíveis.</span>
            </div>
          )}
        </div>
      </ActionDrawer>

      {/* ── Bulk Delete Confirm Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        title="Excluir Selecionados"
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeBulkDelete}
              disabled={isBulkProcessing}
              className="px-8 py-3 rounded-2xl text-[10px] font-black text-white bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-100 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={14} /> Sim, excluir selecionados
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5 py-3">
          <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 flex items-center justify-center shadow-sm shrink-0">
               <AlertCircle size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 px-0.5">Ação Irreversível</p>
               <p className="text-sm font-bold text-rose-700 leading-snug">
                  Você está prestes a excluir <span className="font-black">{bulkDeleteStats.count} lançamentos</span> selecionados no Livro Caixa.
               </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Registros</p>
                  <p className="text-lg font-black text-slate-700 leading-none">{bulkDeleteStats.count}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Saldo em Risco</p>
                  <p className="text-lg font-black text-slate-700 leading-none">{formatCurrency(bulkDeleteStats.balance)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 leading-none">Entradas</p>
                  <p className="text-base font-black text-emerald-600 leading-none">+{formatCurrency(bulkDeleteStats.income)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 leading-none">Saídas</p>
                  <p className="text-base font-black text-rose-600 leading-none">-{formatCurrency(bulkDeleteStats.expense)}</p>
              </div>
          </div>

          <p className="text-[11px] font-medium text-slate-500 text-center px-4 leading-relaxed">
            Considere que a exclusão em massa afeta múltiplos registros de uma vez e não pode ser desfeita.
          </p>
        </div>
      </Modal>

      {/* ── Transaction Details Drawer ────────────────────────────────────────── */}
      <ActionDrawer
        isOpen={selectedTxForDetails !== null}
        onClose={() => { setSelectedTxForDetails(null); setPkgSessions(null); }}
        title="Detalhes do Lançamento"
        subtitle={selectedTxForDetails?.description?.toUpperCase() || 'RESUMO DA TRANSAÇÃO'}
        size="md"
      >
        {selectedTxForDetails && (
          <div className="p-6 space-y-8 animate-fadeIn font-sans">
            {/* Header / Info Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Referência Financeira</p>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-2xl ${selectedTxForDetails.type === 'income' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                    {selectedTxForDetails.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-800 leading-none">{selectedTxForDetails.description || selectedTxForDetails.category}</h3>
                     <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedTxForDetails.category}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                {(() => {
                  const status = getStatus(selectedTxForDetails);
                  const info = STATUS_INFO[status] || STATUS_INFO.pending;
                  const Icon = info.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${info.color}`}>
                      <Icon size={10} />
                      {info.label}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Price Box */}
            <div className="p-6 rounded-[2rem] bg-slate-100/50 border border-slate-200/60 text-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <Wallet size={120} />
               </div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">VALOR REGISTRADO</p>
               <h2 className={`text-4xl font-black ${selectedTxForDetails.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                 {selectedTxForDetails.type === 'income' ? '+' : '-'}{formatCurrency(selectedTxForDetails.amount)}
               </h2>
               {selectedTxForDetails.comanda_id && (
                  <div className="mt-2 text-[10px] font-bold text-indigo-500 italic">
                     Vinculado à Comanda #{selectedTxForDetails.comanda_id}
                  </div>
               )}
            </div>

            {/* Grid Infos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2"><Calendar size={12} /> Data do Fluxo</p>
                <p className="text-sm font-black text-slate-700">{formatDate(selectedTxForDetails.date)}</p>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2"><CreditCard size={12} /> Forma de Pagto</p>
                <p className="text-sm font-black text-slate-700">{METHOD_LABEL[selectedTxForDetails.payment_method] || selectedTxForDetails.payment_method || '—'}</p>
              </div>
            </div>

            {/* Patient/Payer Section */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">Envolvidos na Transação</p>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 shrink-0">
                  <User size={20} />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Pagador Original</p>
                   <p className="text-base font-black text-slate-800 leading-tight">{selectedTxForDetails.payer_name || selectedTxForDetails.patient_name || 'Não identificado'}</p>
                   {selectedTxForDetails.payer_cpf && <p className="text-xs font-bold text-slate-400 mt-1">CPF: {maskCpf(selectedTxForDetails.payer_cpf)}</p>}
                </div>
              </div>

              {selectedTxForDetails.beneficiary_name && (
                <div className="flex items-start gap-4 pt-4 border-t border-slate-50">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center border border-indigo-100 shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Paciente Beneficiário</p>
                    <p className="text-base font-black text-slate-800 leading-tight">{selectedTxForDetails.beneficiary_name || selectedTxForDetails.patient_name}</p>
                    {selectedTxForDetails.beneficiary_cpf && <p className="text-xs font-bold text-slate-400 mt-1">CPF: {maskCpf(selectedTxForDetails.beneficiary_cpf)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Observations */}
            {selectedTxForDetails.observation && (
              <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={12}/> Observações</p>
                 <p className="text-sm font-medium text-amber-700/80 leading-relaxed italic">{selectedTxForDetails.observation}</p>
              </div>
            )}

            {/* ── Sessões do Pacote ───────────────────────────────────────────── */}
            {pkgSessionsLoading && (
              <div className="flex items-center gap-3 py-4 px-5 rounded-[2rem] bg-slate-50 border border-slate-100">
                <Loader2 size={16} className="animate-spin text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Carregando sessões do pacote...</span>
              </div>
            )}

            {!pkgSessionsLoading && pkgSessions?.eligible && (() => {
              const { comanda, completed, upcoming, no_show } = pkgSessions;
              const total = comanda?.sessions_total ?? null;
              const done  = completed.length;
              const pct   = total ? Math.round((done / total) * 100) : null;

              const fmtDate = (d: string | null) => d
                ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';

              return (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  {/* Header da seção */}
                  <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <CalendarCheck size={13} className="text-indigo-500" />
                        Sessões realizadas neste pacote
                      </p>
                      {total && (
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          done >= total ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          {done}/{total} sessões
                        </span>
                      )}
                    </div>
                    {/* Barra de progresso */}
                    {total && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${done >= total ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                        />
                      </div>
                    )}
                    {comanda?.description && (
                      <p className="text-[10px] font-bold text-slate-400 mt-2 truncate">{comanda.description}</p>
                    )}
                  </div>

                  {/* Lista de sessões concluídas */}
                  <div className="divide-y divide-slate-50">
                    {completed.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <CalendarClock size={28} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Nenhum atendimento realizado ainda para este pacote.
                        </p>
                      </div>
                    ) : (
                      completed.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <UserCheck size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-700">
                              {fmtDate(s.date)}{s.time ? ` às ${s.time}` : ''}
                            </p>
                            {s.professional_name && (
                              <p className="text-[9px] font-bold text-slate-400 truncate">{s.professional_name}</p>
                            )}
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                            Realizado
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Faltas */}
                  {no_show.length > 0 && (
                    <div className="border-t border-slate-50">
                      <p className="px-5 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Faltas ({no_show.length})</p>
                      {no_show.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-400 flex items-center justify-center shrink-0">
                            <X size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-600">
                              {fmtDate(s.date)}{s.time ? ` às ${s.time}` : ''}
                            </p>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                            Faltou
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Próximas sessões */}
                  {upcoming.length > 0 && (
                    <div className="border-t border-slate-50">
                      <p className="px-5 pt-3 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CalendarClock size={10} /> Próximas agendadas ({upcoming.length})
                      </p>
                      {upcoming.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center shrink-0">
                            <CalendarClock size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-600">
                              {fmtDate(s.date)}{s.time ? ` às ${s.time}` : ''}
                            </p>
                            {s.professional_name && (
                              <p className="text-[9px] font-bold text-slate-400 truncate">{s.professional_name}</p>
                            )}
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                            {s.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer Actions in Drawer */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => { setSelectedTxForDetails(null); openEditTx(selectedTxForDetails); }}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <Edit2 size={15} /> Editar Dados
              </button>
              
              {selectedTxForDetails.comanda_id && (
                <button
                  onClick={() => {
                    setSelectedTxForDetails(null);
                    navigate('/finance/comandas', { state: { openComandaId: String(selectedTxForDetails.comanda_id) } });
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  <ShoppingBag size={15} /> Abrir Comanda
                </button>
              )}

              {selectedTxForDetails.status !== 'paid' && selectedTxForDetails.status !== 'confirmed' && (
                <button
                  onClick={() => handleQuickPay(selectedTxForDetails)}
                  className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all col-span-2 lg:col-span-1"
                >
                  <Check size={16} /> Efetivar Pagto
                </button>
              )}
            </div>
          </div>
        )}
      </ActionDrawer>
    </div>
  );
};
