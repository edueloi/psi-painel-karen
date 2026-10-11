import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Download, Edit3, Plus, RotateCcw, Trash2, Wallet, Receipt, Ban } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import {
  Button, IconButton, ConfirmModal, Modal, ModalFooter, FormRow, Input, Select, StatGrid, StatCard, ContentCard, Badge,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSelect, GridTable, usePagination, EmptyState,
} from '../UI';
import type { Column } from '../UI';
import {
  MonthNavigator, PayModal, PAYMENT_METHOD_OPTIONS, currentMonthKey, downloadCsv, formatCurrency, formatDateBR, monthRange, todayISO,
} from './accountsShared';
import type { PayFormValues } from './accountsShared';
import { AccountFormModal, CATEGORIES } from './AccountFormModal';
import type { Account, AccountFormPayload, AccountKind, EditScope } from './AccountFormModal';

interface Props {
  kind: AccountKind;
  canManage: boolean;
  patients?: { id: number | string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'paid', label: 'Pagas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const DELETE_SCOPES: { value: EditScope; label: string }[] = [
  { value: 'one', label: 'Somente esta conta' },
  { value: 'following', label: 'Esta e as próximas pendentes' },
  { value: 'all', label: 'Todas as pendentes da série' },
];

export const AccountsPanel: React.FC<Props> = ({ kind, canManage, patients = [] }) => {
  const isPayable = kind === 'payable';
  const { pushToast } = useToast();
  const [month, setMonth] = useState(currentMonthKey());
  const [items, setItems] = useState<Account[]>([]);
  const [overdueAll, setOverdueAll] = useState<Account[]>([]);
  const [soon, setSoon] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [payTarget, setPayTarget] = useState<Account | null>(null);
  const [unpayTarget, setUnpayTarget] = useState<Account | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteScope, setDeleteScope] = useState<EditScope>('one');
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkPay, setBulkPay] = useState(false);
  const [bulkDate, setBulkDate] = useState(todayISO());
  const [bulkMethod, setBulkMethod] = useState('Pix');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { from, to } = monthRange(month);
      const today = todayISO();
      const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      const in7 = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      const [list, overdue, upcoming] = await Promise.all([
        api.get<Account[]>('/finance/accounts', { kind, from, to }),
        api.get<Account[]>('/finance/accounts', { kind, to: yesterday, status: 'overdue' }),
        api.get<Account[]>('/finance/accounts', { kind, from: today, to: in7, status: 'pending' }),
      ]);
      setItems(list);
      setOverdueAll(overdue);
      setSoon(upcoming);
      setSelected(new Set());
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar as contas.');
    } finally {
      setLoading(false);
    }
  }, [kind, month]);

  useEffect(() => { load(); }, [load]);
  useRealtimeSync('finance.created', () => load());
  useRealtimeSync('finance.deleted', () => load());

  const sum = (arr: Account[], pick: (a: Account) => number) => arr.reduce((s, a) => s + pick(a), 0);
  const kpis = useMemo(() => ({
    open: sum(items.filter(i => i.display_status === 'pending' || i.display_status === 'overdue'), i => i.amount),
    done: sum(items.filter(i => i.status === 'paid'), i => i.paid_amount ?? i.amount),
    overdue: sum(overdueAll, i => i.amount),
    soon: sum(soon, i => i.amount),
  }), [items, overdueAll, soon]);

  const categories = useMemo(() => {
    const set = new Set<string>(CATEGORIES[kind]);
    items.forEach(i => i.category && set.add(i.category));
    return Array.from(set);
  }, [items, kind]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i =>
      (status === 'all' || i.display_status === status) &&
      (category === 'all' || i.category === category) &&
      (!q || [i.description, i.party_name, i.patient_name, i.category].some(v => (v || '').toLowerCase().includes(q))));
  }, [items, search, status, category]);

  const pagination = usePagination(filtered, 15);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      pushToast('success', okMsg);
      await load();
    } catch (err: any) {
      pushToast('error', err?.message || 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const submitForm = async (p: AccountFormPayload) => {
    const base = {
      description: p.description, party_name: p.party_name, category: p.category || null,
      payment_method: p.payment_method || null, notes: p.notes || null, due_date: p.due_date,
    };
    if (p.id) {
      const body: Record<string, unknown> = { ...base, scope: p.scope };
      if (editing?.status !== 'paid') body.amount = p.amount;
      await api.put(`/finance/accounts/${p.id}`, body);
      pushToast('success', 'Conta atualizada.');
    } else {
      const res = await api.post<{ created: number }>('/finance/accounts', {
        ...base, kind, amount: p.amount, patient_id: p.patient_id || null, repeat: p.repeat,
      });
      pushToast('success', res.created > 1 ? `${res.created} contas geradas.` : 'Conta cadastrada.');
    }
    await load();
  };

  const submitPay = async (v: PayFormValues) => {
    if (!payTarget) return;
    await api.post(`/finance/accounts/${payTarget.id}/pay`, {
      paid_date: v.date, paid_amount: v.amount, interest: v.interest, discount: v.discount, payment_method: v.method,
    });
    pushToast('success', isPayable ? 'Pagamento registrado e lançado no Livro Caixa.' : 'Recebimento registrado e lançado no Livro Caixa.');
    await load();
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => (prev.size === filtered.length ? new Set() : new Set(filtered.map(i => String(i.id)))));
  const selectedIds = Array.from(selected).map(Number);
  const selectedPayable = filtered.filter(i => selected.has(String(i.id)) && (i.status === 'pending')).length;

  const statusBadge = (a: Account) => {
    const map = {
      paid: { color: 'success', label: isPayable ? 'Paga' : 'Recebida' },
      pending: { color: 'warning', label: 'Pendente' },
      overdue: { color: 'danger', label: 'Atrasada' },
      cancelled: { color: 'default', label: 'Cancelada' },
    } as const;
    const m = map[a.display_status];
    return <Badge color={m.color}>{m.label}</Badge>;
  };

  const rowActions = (a: Account) => canManage ? (
    <div className="flex items-center justify-end gap-1">
      {a.status === 'pending' && (
        <IconButton variant="outline" size="sm" aria-label={isPayable ? 'Dar baixa (pagar)' : 'Dar baixa (receber)'} title={isPayable ? 'Dar baixa (pagar)' : 'Dar baixa (receber)'} onClick={e => { e.stopPropagation(); setPayTarget(a); }}>
          <CheckCircle2 size={14} />
        </IconButton>
      )}
      {a.status === 'paid' && (
        <IconButton variant="outline" size="sm" aria-label="Estornar baixa" title="Estornar baixa" onClick={e => { e.stopPropagation(); setUnpayTarget(a); }}>
          <RotateCcw size={14} />
        </IconButton>
      )}
      {a.status !== 'cancelled' && (
        <IconButton variant="outline" size="sm" aria-label="Editar" title="Editar" onClick={e => { e.stopPropagation(); setEditing(a); setFormOpen(true); }}>
          <Edit3 size={14} />
        </IconButton>
      )}
      {a.status === 'pending' && (
        <IconButton variant="outline" size="sm" aria-label="Cancelar conta" title="Cancelar conta" onClick={e => { e.stopPropagation(); setCancelTarget(a); }}>
          <Ban size={14} />
        </IconButton>
      )}
      <IconButton variant="outline" size="sm" aria-label="Excluir" title="Excluir" onClick={e => { e.stopPropagation(); setDeleteScope('one'); setDeleteTarget(a); }}>
        <Trash2 size={14} className="text-red-600" />
      </IconButton>
    </div>
  ) : null;

  const columns: Column<Account>[] = [
    { header: 'Vencimento', sortKey: 'due_date', className: 'whitespace-nowrap', render: a => <span className="text-xs text-slate-700">{formatDateBR(a.due_date)}</span> },
    {
      header: 'Descrição',
      render: a => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-800">{a.description}</p>
          <p className="text-[11px] text-slate-500">
            {a.series_id ? (a.series_mode === 'installments' ? `Parcela ${a.installment_number}/${a.installments_total}` : `Recorrente (${a.installment_number}${a.installments_total ? `/${a.installments_total}` : ''})`) : 'Conta única'}
            {a.paid_date ? ` · ${isPayable ? 'paga' : 'recebida'} em ${formatDateBR(a.paid_date)}` : ''}
          </p>
        </div>
      ),
    },
    { header: isPayable ? 'Fornecedor' : 'Cliente', hideOnMobile: true, render: a => <span className="text-xs text-slate-700">{a.patient_name || a.party_name || '-'}</span> },
    { header: 'Categoria', hideOnMobile: true, render: a => <span className="text-xs text-slate-600">{a.category || '-'}</span> },
    {
      header: 'Valor', className: 'text-right whitespace-nowrap', headerClassName: 'text-right',
      render: a => (
        <div className="text-right">
          <p className="text-xs font-medium text-slate-800">{formatCurrency(a.paid_amount ?? a.amount)}</p>
          {a.status === 'paid' && a.paid_amount !== null && Math.abs(a.paid_amount - a.amount) > 0.004 && (
            <p className="text-[11px] text-slate-500">de {formatCurrency(a.amount)}</p>
          )}
        </div>
      ),
    },
    { header: 'Status', render: statusBadge },
    ...(canManage ? [{ header: 'Ações', className: 'text-right', headerClassName: 'text-right', render: rowActions } as Column<Account>] : []),
  ];

  const exportCsv = () => downloadCsv(`contas-${isPayable ? 'pagar' : 'receber'}-${month}.csv`, [
    ['Vencimento', 'Descrição', isPayable ? 'Fornecedor' : 'Cliente', 'Categoria', 'Valor', 'Valor pago', 'Data baixa', 'Forma', 'Status'],
    ...filtered.map(a => [formatDateBR(a.due_date), a.description, a.patient_name || a.party_name || '', a.category || '', a.amount.toFixed(2).replace('.', ','),
      a.paid_amount !== null ? a.paid_amount.toFixed(2).replace('.', ',') : '', formatDateBR(a.paid_date), a.payment_method || '',
      STATUS_OPTIONS.find(s => s.value === a.display_status)?.label || a.display_status]),
  ]);

  const hasFilters = search || status !== 'all' || category !== 'all';
  const noun = isPayable ? 'a pagar' : 'a receber';

  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <StatCard title={isPayable ? 'A pagar no mês' : 'A receber no mês'} value={formatCurrency(kpis.open)} icon={Wallet} color="info" />
        <StatCard title={isPayable ? 'Pago no mês' : 'Recebido no mês'} value={formatCurrency(kpis.done)} icon={CheckCircle2} color="success" />
        <StatCard title="Em atraso (total)" value={formatCurrency(kpis.overdue)} description={`${overdueAll.length} conta${overdueAll.length === 1 ? '' : 's'}`} icon={AlertTriangle} color="danger" />
        <StatCard title="Próximos 7 dias" value={formatCurrency(kpis.soon)} description={`${soon.length} conta${soon.length === 1 ? '' : 's'}`} icon={CalendarClock} color="warning" />
      </StatGrid>

      <FilterLine>
        <FilterLineSection>
          <MonthNavigator value={month} onChange={setMonth} />
        </FilterLineSection>
        <FilterLineSection align="right">
          <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar descrição ou nome" className="sm:w-56" />
          <FilterLineSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <FilterLineSelect label="Categoria" value={category} onChange={setCategory} options={[{ value: 'all', label: 'Todas' }, ...categories.map(c => ({ value: c, label: c }))]} />
          <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={exportCsv} disabled={!filtered.length}>CSV</Button>
          {canManage && <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>Nova conta</Button>}
        </FilterLineSection>
      </FilterLine>

      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
          <span className="text-xs font-medium text-primary-700">{selected.size} selecionada{selected.size === 1 ? '' : 's'}</span>
          <Button variant="success" size="sm" iconLeft={<CheckCircle2 size={14} />} disabled={!selectedPayable || busy} onClick={() => setBulkPay(true)}>
            {isPayable ? 'Marcar como paga' : 'Marcar como recebida'}
          </Button>
          <Button variant="danger" size="sm" iconLeft={<Trash2 size={14} />} disabled={busy} onClick={() => setBulkDelete(true)}>Excluir</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
        </div>
      )}

      {loadError ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível carregar" description={loadError} action={<Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>} />
      ) : (
        <ContentCard padding="none">
          <GridTable<Account>
            noDesktopCard
            data={pagination.paginatedData}
            columns={columns}
            keyExtractor={a => a.id}
            isLoading={loading}
            selectedIds={canManage ? selected : undefined}
            onToggleSelect={canManage ? toggleSelect : undefined}
            onToggleSelectAll={canManage ? toggleAll : undefined}
            getMobileBorderClass={a => a.display_status === 'overdue' ? 'border-red-200' : a.status === 'paid' ? 'border-emerald-200' : 'border-slate-200'}
            emptyMessage={
              <EmptyState icon={Receipt} title={hasFilters ? 'Nenhuma conta com esses filtros' : `Nenhuma conta ${noun} neste mês`}
                description={canManage && !hasFilters ? 'Use "Nova conta" para cadastrar, parcelar ou repetir.' : undefined} />
            }
            pagination={{
              total: filtered.length, page: pagination.page, pageSize: pagination.pageSize,
              onPageChange: pagination.setPage, onPageSizeChange: pagination.setPageSize,
            }}
          />
        </ContentCard>
      )}

      <AccountFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} kind={kind} editing={editing} patients={patients} onSubmit={submitForm} />

      <PayModal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={isPayable ? 'Registrar pagamento' : 'Registrar recebimento'}
        subtitle={payTarget ? `${payTarget.description} · vence em ${formatDateBR(payTarget.due_date)}` : undefined}
        suggestedAmount={payTarget?.amount ?? 0}
        defaultMethod={payTarget?.payment_method}
        showAdjustments
        confirmLabel={isPayable ? 'Confirmar pagamento' : 'Confirmar recebimento'}
        tone={isPayable ? 'expense' : 'income'}
        onSubmit={submitPay}
      />

      <ConfirmModal
        isOpen={!!unpayTarget} onClose={() => setUnpayTarget(null)} loading={busy} variant="primary"
        title="Estornar baixa" confirmLabel="Estornar"
        message="A conta volta a ficar pendente e o lançamento correspondente é removido do Livro Caixa."
        onConfirm={() => unpayTarget && run(async () => { await api.post(`/finance/accounts/${unpayTarget.id}/unpay`, {}); setUnpayTarget(null); }, 'Baixa estornada.')}
      />
      <ConfirmModal
        isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} loading={busy}
        title="Cancelar conta" confirmLabel="Cancelar conta"
        message="A conta deixa de contar como pendente. Você pode excluí-la depois, se quiser."
        onConfirm={() => cancelTarget && run(async () => { await api.post(`/finance/accounts/${cancelTarget.id}/cancel`, {}); setCancelTarget(null); }, 'Conta cancelada.')}
      />

      <Modal
        isOpen={!!deleteTarget} onClose={busy ? () => {} : () => setDeleteTarget(null)} size="sm" title="Excluir conta"
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancelar</Button>
            <Button variant="danger" size="sm" loading={busy} onClick={() => deleteTarget && run(async () => {
              await api.delete(`/finance/accounts/${deleteTarget.id}?scope=${deleteScope}`);
              setDeleteTarget(null);
            }, 'Conta excluída.')}>Excluir</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">
            Excluir <strong>{deleteTarget?.description}</strong>?{deleteTarget?.status === 'paid' ? ' O lançamento dela no Livro Caixa também será removido.' : ''}
          </p>
          {deleteTarget?.series_id && (
            <Select label="Aplicar a" value={deleteScope} onChange={e => setDeleteScope(e.target.value as EditScope)}>
              {DELETE_SCOPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={bulkDelete} onClose={() => setBulkDelete(false)} loading={busy}
        title="Excluir contas selecionadas" confirmLabel={`Excluir ${selected.size}`}
        message="As contas selecionadas serão excluídas e, nas que já foram baixadas, o lançamento no Livro Caixa também será removido."
        onConfirm={() => run(async () => { await api.post('/finance/accounts/bulk-delete', { ids: selectedIds }); setBulkDelete(false); }, 'Contas excluídas.')}
      />

      <Modal
        isOpen={bulkPay} onClose={busy ? () => {} : () => setBulkPay(false)} size="sm"
        title={isPayable ? 'Marcar como pagas' : 'Marcar como recebidas'}
        subtitle={`${selectedPayable} conta${selectedPayable === 1 ? '' : 's'} pendente${selectedPayable === 1 ? '' : 's'} pelo valor cadastrado`}
        footer={
          <ModalFooter align="between">
            <Button variant="outline" size="sm" onClick={() => setBulkPay(false)} disabled={busy}>Cancelar</Button>
            <Button variant="success" size="sm" loading={busy} onClick={() => run(async () => {
              const res = await api.post<{ count: number; errors: { error: string }[] }>('/finance/accounts/bulk-pay', { ids: selectedIds, paid_date: bulkDate, payment_method: bulkMethod });
              setBulkPay(false);
              if (res.errors?.length) pushToast('warning', `${res.errors.length} conta(s) não puderam ser baixadas.`);
            }, 'Baixa em lote concluída.')}>Confirmar</Button>
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

