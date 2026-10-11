import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Download, Eye, Inbox, RotateCcw, Users, Wallet, CalendarClock,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import {
  Button, IconButton, ConfirmModal, Modal, ModalFooter, FormRow, Input, Select, StatGrid, StatCard, ContentCard, Badge, EmptyState,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSelect, FilterLineSegmented, GridTable, usePagination,
} from '../UI';
import type { Column } from '../UI';
import {
  MonthNavigator, PayModal, PAYMENT_METHOD_OPTIONS, currentMonthKey, downloadCsv, formatCurrency, formatDateBR, todayISO,
} from './accountsShared';
import type { PayFormValues } from './accountsShared';

type RowStatus = 'paid' | 'partial' | 'pending' | 'overdue';

interface PatientRow {
  key: string;
  source: 'comanda' | 'ledger';
  source_id: number;
  patient_id: number;
  patient_name: string;
  professional_id: number | null;
  professional_name: string | null;
  description: string;
  due_date: string;
  total: number;
  paid: number;
  balance: number;
  status: RowStatus;
  payment_method: string | null;
  sessions_total: number | null;
  sessions_used: number | null;
  cash_book: boolean;
  payments: { id: number; amount: number; date: string; method: string | null }[];
  sessions: { date: string; status: string }[];
}

interface Response { month: string; rows: PatientRow[] }

const STATUS_FILTER = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'unpaid', label: 'Não pagos' },
  { value: 'overdue', label: 'Atrasados' },
  { value: 'partial', label: 'Parciais' },
];

const SORT_OPTIONS = [
  { value: 'due_date', label: 'Vencimento' },
  { value: 'patient_name', label: 'Paciente' },
  { value: 'total', label: 'Valor' },
  { value: 'balance', label: 'Saldo' },
];

const VIEW_OPTIONS = [
  { value: 'group', label: 'Por paciente' },
  { value: 'list', label: 'Por vencimento' },
];

const STATUS_META: Record<RowStatus, { label: string; color: 'success' | 'warning' | 'danger' | 'info' }> = {
  paid: { label: 'Pago', color: 'success' },
  partial: { label: 'Parcial', color: 'info' },
  pending: { label: 'Registrado, não pago', color: 'warning' },
  overdue: { label: 'Atrasado', color: 'danger' },
};
const STATUS_RANK: Record<RowStatus, number> = { overdue: 3, partial: 2, pending: 1, paid: 0 };

const SESSION_STATUS: Record<string, string> = {
  scheduled: 'Agendada', confirmed: 'Confirmada', completed: 'Realizada', no_show: 'Faltou', 'no-show': 'Faltou', pending: 'Pendente',
};

const StatusBadge = ({ status }: { status: RowStatus }) => <Badge color={STATUS_META[status].color}>{STATUS_META[status].label}</Badge>;

interface Props { canManage: boolean }

export const PatientReceivables: React.FC<Props> = ({ canManage }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('all');
  const [professional, setProfessional] = useState('all');
  const [sortKey, setSortKey] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<'group' | 'list'>('group');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payRow, setPayRow] = useState<PatientRow | null>(null);
  const [detail, setDetail] = useState<PatientRow | null>(null);
  const [undo, setUndo] = useState<{ row: PatientRow; paymentId: number } | null>(null);
  const [bulkPay, setBulkPay] = useState(false);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkMethod, setBulkMethod] = useState('Pix');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get<Response>('/finance/accounts/patient-receivables', { month });
      setRows(res.rows);
      setSelected(new Set());
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar os recebimentos dos pacientes.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useRealtimeSync('finance.created', () => load());
  useRealtimeSync('finance.updated', () => load());
  useRealtimeSync('finance.deleted', () => load());

  const kpis = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return {
      total, paid, balance: total - paid,
      overdue: rows.filter(r => r.status === 'overdue').reduce((s, r) => s + r.balance, 0),
      patients: new Set(rows.map(r => r.patient_id)).size,
    };
  }, [rows]);

  const methods = useMemo(() => Array.from(new Set(rows.map(r => r.payment_method).filter(Boolean) as string[])), [rows]);
  const professionals = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach(r => r.professional_id && r.professional_name && map.set(r.professional_id, r.professional_name));
    return Array.from(map, ([id, name]) => ({ value: String(id), label: name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter(r =>
      (status === 'all' || (status === 'paid' ? r.status === 'paid' : status === 'unpaid' ? r.status !== 'paid' : status === 'partial' ? r.paid > 0 && r.balance > 0.004 : r.status === status)) &&
      (method === 'all' || r.payment_method === method) &&
      (professional === 'all' || String(r.professional_id) === professional) &&
      (!q || r.patient_name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)));
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR');
      return cmp * dir || a.due_date.localeCompare(b.due_date);
    });
  }, [rows, status, method, professional, search, sortKey, sortOrder]);

  const groups = useMemo(() => {
    const map = new Map<number, { patient_id: number; name: string; rows: PatientRow[] }>();
    filtered.forEach(r => {
      if (!map.has(r.patient_id)) map.set(r.patient_id, { patient_id: r.patient_id, name: r.patient_name, rows: [] });
      map.get(r.patient_id)!.rows.push(r);
    });
    return Array.from(map.values()).map(g => ({
      ...g,
      total: g.rows.reduce((s, r) => s + r.total, 0),
      paid: g.rows.reduce((s, r) => s + r.paid, 0),
      status: g.rows.reduce<RowStatus>((w, r) => (STATUS_RANK[r.status] > STATUS_RANK[w] ? r.status : w), 'paid'),
    }));
  }, [filtered]);

  const pagination = usePagination(filtered, 15);
  const groupPagination = usePagination(groups, 10);

  const onSort = (key: string) => {
    if (key === sortKey) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder('asc'); }
  };

  // Baixa: comanda usa a MESMA rota da Agenda/Comandas (grava comanda_payments, recalcula o saldo da comanda e, quando a
  // comanda sincroniza com o Livro Caixa, cria o lançamento do pagamento e ajusta a previsão do saldo). Nada é gravado
  // em paralelo aqui — por isso o valor nunca é contado duas vezes.
  const pay = async (row: PatientRow, v: { amount: number; date: string; method: string; notes: string }) => {
    if (row.source === 'comanda') {
      await api.post(`/finance/comandas/${row.source_id}/payments`, {
        amount: v.amount, payment_date: v.date, payment_method: v.method, notes: v.notes || null, status: 'paid',
      });
    } else {
      await api.post(`/finance/accounts/patient-receivables/ledger/${row.source_id}/settle`, {
        amount: v.amount, payment_date: v.date, payment_method: v.method, notes: v.notes || null,
      });
    }
  };

  const submitPay = async (v: PayFormValues) => {
    if (!payRow) return;
    await pay(payRow, v);
    pushToast('success', 'Pagamento registrado.');
    await load();
  };

  const submitBulk = async () => {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const r of filtered.filter(x => selected.has(x.key) && x.balance > 0.004)) {
      try { await pay(r, { amount: r.balance, date: bulkDate, method: bulkMethod, notes: '' }); ok++; } catch { fail++; }
    }
    setBusy(false);
    setBulkPay(false);
    pushToast(fail ? 'warning' : 'success', `${ok} pagamento(s) registrado(s)${fail ? `, ${fail} com falha` : ''}.`);
    await load();
  };

  const doUndo = async () => {
    if (!undo) return;
    setBusy(true);
    try {
      await api.delete(`/finance/comandas/${undo.row.source_id}/payments/${undo.paymentId}`);
      pushToast('success', 'Pagamento desfeito.');
      setUndo(null);
      setDetail(null);
      await load();
    } catch (err: any) {
      pushToast('error', err?.message || 'Não foi possível desfazer.');
    } finally {
      setBusy(false);
    }
  };

  const copyReminder = async (r: PatientRow) => {
    const first = r.patient_name.split(' ')[0];
    const msg = `Olá, ${first}! Passando para lembrar do pagamento de ${r.description}, no valor de ${formatCurrency(r.balance)}, com vencimento em ${formatDateBR(r.due_date)}. Qualquer dúvida, estou à disposição.`;
    try {
      await navigator.clipboard.writeText(msg);
      pushToast('success', 'Mensagem copiada. Cole no WhatsApp ou e-mail.');
    } catch {
      pushToast('error', 'Não foi possível copiar a mensagem.');
    }
  };

  const toggleSelect = (key: string) => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleAll = () => setSelected(prev => (prev.size === filtered.length ? new Set() : new Set(filtered.map(r => r.key))));
  const selectedOpen = filtered.filter(r => selected.has(r.key) && r.balance > 0.004).length;

  const exportCsv = () => downloadCsv(`recebimentos-pacientes-${month}.csv`, [
    ['Paciente', 'Origem', 'Vencimento', 'Valor', 'Pago', 'Saldo', 'Status', 'Forma de pagamento'],
    ...filtered.map(r => [r.patient_name, r.description, formatDateBR(r.due_date), r.total.toFixed(2).replace('.', ','), r.paid.toFixed(2).replace('.', ','),
      r.balance.toFixed(2).replace('.', ','), STATUS_META[r.status].label, r.payment_method || '']),
  ]);

  const actions = (r: PatientRow) => (
    <div className="flex items-center justify-end gap-1">
      {canManage && r.balance > 0.004 && (
        <Button variant="outline" size="xs" iconLeft={<CheckCircle2 size={14} />} onClick={e => { e.stopPropagation(); setPayRow(r); }}>Receber</Button>
      )}
      {r.balance > 0.004 && (
        <IconButton variant="outline" size="sm" aria-label="Copiar mensagem de lembrete" title="Copiar mensagem de lembrete" onClick={e => { e.stopPropagation(); copyReminder(r); }}>
          <Clipboard size={14} />
        </IconButton>
      )}
      <IconButton variant="outline" size="sm" aria-label="Ver parcelas e pagamentos" title="Ver parcelas e pagamentos" onClick={e => { e.stopPropagation(); setDetail(r); }}>
        <Eye size={14} />
      </IconButton>
      {hasPermission('view_patients') && (
        <IconButton variant="outline" size="sm" aria-label="Abrir paciente" title="Abrir paciente" onClick={e => { e.stopPropagation(); navigate(`/pacientes/${r.patient_id}`); }}>
          <Users size={14} />
        </IconButton>
      )}
    </div>
  );

  const columns: Column<PatientRow>[] = [
    { header: 'Paciente', sortKey: 'patient_name', render: r => <span className="text-xs font-medium text-slate-800">{r.patient_name}</span> },
    {
      header: 'Origem',
      render: r => (
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-700">{r.description}</p>
          {r.sessions_total ? <p className="text-[11px] text-slate-500">{r.sessions_used ?? 0}/{r.sessions_total} sessões</p> : null}
        </div>
      ),
    },
    { header: 'Vencimento', sortKey: 'due_date', className: 'whitespace-nowrap', render: r => <span className="text-xs text-slate-700">{formatDateBR(r.due_date)}</span> },
    { header: 'Valor', sortKey: 'total', className: 'text-right whitespace-nowrap', headerClassName: 'text-right', render: r => <span className="text-xs text-slate-800">{formatCurrency(r.total)}</span> },
    { header: 'Pago', className: 'text-right whitespace-nowrap', headerClassName: 'text-right', hideOnMobile: true, render: r => <span className="text-xs text-emerald-700">{formatCurrency(r.paid)}</span> },
    { header: 'Saldo', sortKey: 'balance', className: 'text-right whitespace-nowrap', headerClassName: 'text-right', render: r => <span className="text-xs font-medium text-slate-800">{formatCurrency(r.balance)}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    { header: 'Forma', hideOnMobile: true, render: r => <span className="text-xs text-slate-600">{r.payment_method || '-'}</span> },
    { header: 'Ações', className: 'text-right', headerClassName: 'text-right', render: actions },
  ];

  const hasFilters = status !== 'all' || method !== 'all' || professional !== 'all' || search;

  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <StatCard title="Previsto no mês" value={formatCurrency(kpis.total)} icon={CalendarClock} color="info" />
        <StatCard title="Recebido" value={formatCurrency(kpis.paid)} icon={CheckCircle2} color="success" />
        <StatCard title="A receber" value={formatCurrency(kpis.balance)} icon={Wallet} color="warning" />
        <StatCard title="Em atraso" value={formatCurrency(kpis.overdue)} description={`${kpis.patients} paciente${kpis.patients === 1 ? '' : 's'} no mês`} icon={AlertTriangle} color="danger" />
      </StatGrid>

      <FilterLine>
        <FilterLineSection>
          <MonthNavigator value={month} onChange={setMonth} />
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={exportCsv} disabled={!filtered.length}>CSV</Button>
        </FilterLineSection>
      </FilterLine>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar paciente ou serviço" className="sm:w-60" />
          <FilterLineSelect label="Situação" value={status} onChange={setStatus} options={STATUS_FILTER} />
          <FilterLineSelect label="Forma de pagamento" value={method} onChange={setMethod} options={[{ value: 'all', label: 'Todas' }, ...methods.map(m => ({ value: m, label: m }))]} />
          {professionals.length > 1 && (
            <FilterLineSelect label="Profissional" value={professional} onChange={setProfessional} options={[{ value: 'all', label: 'Todos' }, ...professionals]} />
          )}
          <FilterLineSelect label="Ordenar por" value={sortKey} onChange={setSortKey} options={SORT_OPTIONS} />
        </FilterLineSection>
        <FilterLineSection align="right">
          <FilterLineSegmented value={view} onChange={v => setView(v as 'group' | 'list')} options={VIEW_OPTIONS} size="sm" />
        </FilterLineSection>
      </FilterLine>

      {canManage && view === 'list' && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
          <span className="text-xs font-medium text-primary-700">{selected.size} selecionado{selected.size === 1 ? '' : 's'}</span>
          <Button variant="success" size="sm" iconLeft={<CheckCircle2 size={14} />} disabled={!selectedOpen || busy} onClick={() => setBulkPay(true)}>Registrar pagamento do saldo</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
        </div>
      )}

      {loadError ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description={loadError} action={<Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>} />
      ) : view === 'list' ? (
        <ContentCard padding="none">
          <GridTable<PatientRow>
            noDesktopCard
            data={pagination.paginatedData}
            columns={columns}
            keyExtractor={r => r.key}
            isLoading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={onSort}
            selectedIds={canManage ? selected : undefined}
            onToggleSelect={canManage ? toggleSelect : undefined}
            onToggleSelectAll={canManage ? toggleAll : undefined}
            getMobileBorderClass={r => r.status === 'overdue' ? 'border-red-200' : r.status === 'paid' ? 'border-emerald-200' : 'border-slate-200'}
            emptyMessage={<EmptyState icon={Inbox} title={hasFilters ? 'Nenhum registro com esses filtros' : 'Nenhuma cobrança de paciente neste mês'}
              description={hasFilters ? undefined : 'As cobranças vêm das comandas, pacotes e lançamentos de pacientes do Livro Caixa.'} />}
            pagination={{ total: filtered.length, page: pagination.page, pageSize: pagination.pageSize, onPageChange: pagination.setPage, onPageSizeChange: pagination.setPageSize }}
          />
        </ContentCard>
      ) : loading ? (
        <div role="status" className="py-10 text-center text-xs text-slate-500">Carregando…</div>
      ) : groups.length === 0 ? (
        <ContentCard>
          <EmptyState icon={Inbox} title={hasFilters ? 'Nenhum paciente com esses filtros' : 'Nenhuma cobrança de paciente neste mês'}
            description={hasFilters ? undefined : 'As cobranças vêm das comandas, pacotes e lançamentos de pacientes do Livro Caixa.'} />
        </ContentCard>
      ) : (
        <div className="space-y-2">
          {groupPagination.paginatedData.map(g => {
            const open = expanded.has(g.patient_id);
            return (
              <ContentCard key={g.patient_id} padding="none">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(g.patient_id) ? n.delete(g.patient_id) : n.add(g.patient_id); return n; })}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-primary-500"
                >
                  {open ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">{g.name}</span>
                  <span className="text-[11px] text-slate-500">{g.rows.length} cobrança{g.rows.length === 1 ? '' : 's'}</span>
                  <span className="text-[11px] text-slate-500">Pago {formatCurrency(g.paid)} de {formatCurrency(g.total)}</span>
                  <span className="text-xs font-medium text-slate-800">Saldo {formatCurrency(g.total - g.paid)}</span>
                  <StatusBadge status={g.status} />
                </button>
                {open && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.rows.map(r => (
                      <div key={r.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:pl-9">
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate text-xs text-slate-800">{r.description}</p>
                          <p className="text-[11px] text-slate-500">
                            Vence {formatDateBR(r.due_date)}{r.payment_method ? ` · ${r.payment_method}` : ''}{r.sessions_total ? ` · ${r.sessions_used ?? 0}/${r.sessions_total} sessões` : ''}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <p>{formatCurrency(r.total)}</p>
                          <p className="text-emerald-700">Pago {formatCurrency(r.paid)}</p>
                        </div>
                        <span className="w-24 text-right text-xs font-medium text-slate-800">{formatCurrency(r.balance)}</span>
                        <StatusBadge status={r.status} />
                        {actions(r)}
                      </div>
                    ))}
                  </div>
                )}
              </ContentCard>
            );
          })}
          {groups.length > groupPagination.pageSize && (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>Página {groupPagination.page} de {groupPagination.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="xs" disabled={groupPagination.page <= 1} onClick={() => groupPagination.setPage(groupPagination.page - 1)}>Anterior</Button>
                <Button variant="outline" size="xs" disabled={groupPagination.page >= groupPagination.totalPages} onClick={() => groupPagination.setPage(groupPagination.page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <PayModal
        isOpen={!!payRow}
        onClose={() => setPayRow(null)}
        title="Registrar pagamento"
        subtitle={payRow ? `${payRow.patient_name} · ${payRow.description}` : undefined}
        suggestedAmount={payRow?.balance ?? 0}
        defaultMethod={payRow?.payment_method}
        allowPartial
        confirmLabel="Registrar pagamento"
        tone="income"
        footnote={payRow && !payRow.cash_book ? 'Esta comanda não está sincronizada com o Livro Caixa; o pagamento fica registrado apenas na comanda.' : 'O pagamento é lançado automaticamente no Livro Caixa, uma única vez, pela mesma regra das comandas.'}
        onSubmit={submitPay}
      />

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        size="md"
        title={detail?.patient_name || ''}
        subtitle={detail ? `${detail.description} · vence em ${formatDateBR(detail.due_date)}` : undefined}
        footer={<ModalFooter align="right"><Button variant="outline" size="sm" onClick={() => setDetail(null)}>Fechar</Button></ModalFooter>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-[11px] text-slate-500">Valor</p><p className="text-sm font-medium text-slate-800">{formatCurrency(detail.total)}</p></div>
              <div><p className="text-[11px] text-slate-500">Pago</p><p className="text-sm font-medium text-emerald-700">{formatCurrency(detail.paid)}</p></div>
              <div><p className="text-[11px] text-slate-500">Saldo</p><p className="text-sm font-medium text-slate-800">{formatCurrency(detail.balance)}</p></div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Pagamentos registrados</p>
              {detail.payments.length === 0 ? <p className="text-[11px] text-slate-500">Nenhum pagamento registrado.</p> : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detail.payments.map(p => (
                    <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 text-xs text-slate-700">{formatDateBR(p.date)}{p.method ? ` · ${p.method}` : ''}</span>
                      <span className="text-xs font-medium text-emerald-700">{formatCurrency(p.amount)}</span>
                      {canManage && detail.source === 'comanda' && (
                        <IconButton variant="outline" size="sm" aria-label="Desfazer pagamento" title="Desfazer pagamento" onClick={() => setUndo({ row: detail, paymentId: p.id })}>
                          <RotateCcw size={14} />
                        </IconButton>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {detail.source === 'ledger' && <p className="mt-1 text-[11px] text-slate-500">Lançamento do Livro Caixa: para estornar, edite-o lá.</p>}
            </div>
            {detail.sessions.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Sessões da comanda</p>
                <ul className="flex flex-wrap gap-1.5">
                  {detail.sessions.map((s, i) => (
                    <li key={i}><Badge color={s.status === 'completed' ? 'success' : s.status === 'no_show' || s.status === 'no-show' ? 'danger' : 'default'}>{formatDateBR(s.date)} · {SESSION_STATUS[s.status] || s.status}</Badge></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!undo} onClose={() => setUndo(null)} loading={busy} title="Desfazer pagamento" confirmLabel="Desfazer"
        message="O pagamento é removido da comanda e o lançamento correspondente sai do Livro Caixa. O saldo volta a ficar em aberto."
        onConfirm={doUndo}
      />

      <Modal
        isOpen={bulkPay} onClose={busy ? () => {} : () => setBulkPay(false)} size="sm"
        title="Registrar pagamento em lote" subtitle={`${selectedOpen} cobrança${selectedOpen === 1 ? '' : 's'} em aberto, pelo saldo total`}
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setBulkPay(false)} disabled={busy}>Cancelar</Button>
            <Button variant="success" size="sm" loading={busy} onClick={submitBulk}>Confirmar</Button>
          </ModalFooter>
        }
      >
        <FormRow>
          <Input label="Data" type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
          <Select label="Forma de pagamento" value={bulkMethod} onChange={e => setBulkMethod(e.target.value)}>
            {PAYMENT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FormRow>
      </Modal>
    </div>
  );
};

