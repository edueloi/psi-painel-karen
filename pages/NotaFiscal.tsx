import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Download, RefreshCw, Loader2, CheckCircle2, Clock,
  AlertCircle, XCircle, Ban, Archive, Mail, MessageCircle, HelpCircle, Repeat,
  Search as SearchIcon, CalendarRange, ListFilter, Layers, MousePointerClick,
} from 'lucide-react';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Button, IconButton } from '../components/UI/Button';
import { GridTable, Column } from '../components/UI/GridTable';
import { EmptyState } from '../components/UI/EmptyState';
import { Modal } from '../components/UI/Modal';
import { Combobox } from '../components/UI/Combobox';
import {
  FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSearch, FilterLineDateRange,
} from '../components/UI/FilterLine';
import { api, API_BASE_URL } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type NfseStatus = 'pending' | 'processing' | 'authorized' | 'rejected' | 'error' | 'cancelled';

interface NfseInvoiceRow {
  id: number;
  financial_transaction_id: number;
  status: NfseStatus;
  environment: string;
  serie: number;
  numero: number;
  chave_acesso?: string | null;
  valor_servico: number;
  descricao_servico?: string | null;
  rejection_reason?: string | null;
  authorized_at?: string | null;
  substituted_chave_acesso?: string | null;
  substitution_reason?: string | null;
  whatsapp_sent_at?: string | null;
  whatsapp_send_error?: string | null;
  created_at: string;
  transaction_description?: string | null;
  transaction_date?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  patient_whatsapp?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NfseStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pendente',    color: 'bg-slate-100 text-slate-600 border-slate-200',     icon: Clock },
  processing: { label: 'Processando', color: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Loader2 },
  authorized: { label: 'Autorizada',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected:   { label: 'Rejeitada',   color: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle },
  error:      { label: 'Erro',        color: 'bg-rose-50 text-rose-700 border-rose-200',          icon: AlertCircle },
  cancelled:  { label: 'Cancelada',   color: 'bg-slate-100 text-slate-500 border-slate-200',      icon: Ban },
};

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const formatDateTime = (v?: string | null) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Data local em ISO (yyyy-mm-dd), sem o deslocamento de fuso que `toISOString()` causaria.
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Período padrão da tela: sempre o mês corrente (do dia 1 até hoje o mês inteiro).
function currentMonthRange() {
  const now = new Date();
  return {
    from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

const STATUS_FILTER_OPTIONS = (Object.keys(STATUS_CONFIG) as NfseStatus[]).map(value => ({
  value, label: STATUS_CONFIG[value].label,
}));

// Códigos oficiais de justificativa do evento de substituição (e105102), confirmados
// no XSD do Sistema Nacional NFS-e (enum TSCodJustSubst).
const SUBSTITUTION_REASON_OPTIONS = [
  { value: '99', label: '99 — Outros (ex: descrição ou valor incorretos)' },
  { value: '05', label: '05 — Rejeição da NFS-e pelo tomador/intermediário' },
  { value: '01', label: '01 — Desenquadramento do Simples Nacional' },
  { value: '02', label: '02 — Enquadramento no Simples Nacional' },
  { value: '03', label: '03 — Inclusão retroativa de imunidade/isenção' },
  { value: '04', label: '04 — Exclusão retroativa de imunidade/isenção' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const NotaFiscal: React.FC = () => {
  const { pushToast } = useToast();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<NfseInvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'' | NfseStatus>('');
  const [{ from: defaultFrom, to: defaultTo }] = useState(currentMonthRange);
  const [dateFrom, setDateFrom] = useState<string | null>(defaultFrom);
  const [dateTo, setDateTo] = useState<string | null>(defaultTo);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<NfseInvoiceRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [substTarget, setSubstTarget] = useState<NfseInvoiceRow | null>(null);
  const [substDescricao, setSubstDescricao] = useState('');
  const [substValor, setSubstValor] = useState('');
  const [substMotivo, setSubstMotivo] = useState('');
  const [substCodigo, setSubstCodigo] = useState('99');
  const [substituting, setSubstituting] = useState(false);

  // Busca por texto é debounced para não disparar uma requisição a cada tecla digitada.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (debouncedSearch) params.q = debouncedSearch;

      const data = await api.get<{ invoices: NfseInvoiceRow[]; total: number }>('/nfse', params);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch {
      pushToast('error', 'Erro ao carregar notas fiscais');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, dateFrom, dateTo, debouncedSearch, pushToast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Reseta para a primeira página quando os filtros mudam
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo, debouncedSearch]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.size === invoices.length ? new Set() : new Set(invoices.map(i => String(i.id))));
  };

  const selectedInvoices = useMemo(
    () => invoices.filter(i => selectedIds.has(String(i.id))),
    [invoices, selectedIds]
  );

  const handleBatchRetry = async () => {
    const ids = Array.from(selectedIds).map(Number);
    if (!ids.length) return;
    setBatchRunning(true);
    try {
      const result = await api.post<{ retried: number[]; skipped: number[] }>('/nfse/batch/retry', { ids });
      pushToast('success', `${result.retried.length} nota(s) reenviada(s)${result.skipped.length ? `, ${result.skipped.length} já autorizada(s) ignorada(s)` : ''}.`);
      setSelectedIds(new Set());
      setTimeout(fetchInvoices, 1500);
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao reenviar notas selecionadas');
    } finally {
      setBatchRunning(false);
    }
  };

  const handleBatchDownload = async (kind: 'xml' | 'pdf') => {
    const ids = Array.from(selectedIds).map(Number);
    if (!ids.length) return;
    setBatchRunning(true);
    try {
      const token = localStorage.getItem('psi_token');
      const res = await fetch(`${API_BASE_URL}/nfse/batch/${kind}.zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Falha ao gerar ${kind.toUpperCase()} em lote`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nfse-${kind}-lote.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      pushToast('error', e?.message || `Erro ao baixar ${kind.toUpperCase()} em lote`);
    } finally {
      setBatchRunning(false);
    }
  };

  // Downloads de XML/PDF exigem o header Authorization — um <a href> aberto direto no
  // navegador não envia o token, por isso baixamos via fetch e criamos um blob local.
  const downloadFile = async (path: string, filename: string) => {
    try {
      const token = localStorage.getItem('psi_token');
      const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Arquivo não disponível');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao baixar arquivo');
    }
  };

  const sendInvoice = async (inv: NfseInvoiceRow, channel: 'email' | 'whatsapp') => {
    try {
      await api.post(`/nfse/${inv.financial_transaction_id}/send-${channel}`, {});
      pushToast('success', channel === 'email' ? 'Nota fiscal enviada por e-mail.' : 'Nota fiscal enviada por WhatsApp.');
    } catch (e: any) { pushToast('error', e?.message || `Erro ao enviar por ${channel}.`); }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await api.post(`/nfse/${cancelTarget.financial_transaction_id}/cancel`, { motivo: cancelReason.trim() });
      pushToast('success', 'NFS-e cancelada. Agora você já pode emitir uma nova nota corrigida para este lançamento.');
      setCancelTarget(null);
      setCancelReason('');
      fetchInvoices();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao cancelar a NFS-e');
    } finally {
      setCancelling(false);
    }
  };

  const openSubstitute = (inv: NfseInvoiceRow) => {
    setSubstTarget(inv);
    setSubstDescricao(inv.descricao_servico || inv.transaction_description || '');
    setSubstValor(String(inv.valor_servico ?? ''));
    setSubstMotivo('');
    setSubstCodigo('99');
  };

  const handleConfirmSubstitute = async () => {
    if (!substTarget || !substDescricao.trim() || !substValor) return;
    setSubstituting(true);
    try {
      await api.post(`/nfse/${substTarget.financial_transaction_id}/substitute`, {
        descricao_servico: substDescricao.trim(),
        valor_servico: Number(substValor),
        cMotivo: substCodigo,
        motivo: substMotivo.trim() || undefined,
      });
      pushToast('success', 'NFS-e substituída com sucesso — a nota antiga foi cancelada e a nova já está autorizada.');
      setSubstTarget(null);
      fetchInvoices();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao substituir a NFS-e');
    } finally {
      setSubstituting(false);
    }
  };

  const renderStatusBadge = (inv: NfseInvoiceRow) => {
    const cfg = STATUS_CONFIG[inv.status];
    const Icon = cfg.icon;
    return (
      <div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold ${cfg.color}`}>
          <Icon size={11} className={inv.status === 'processing' ? 'animate-spin' : ''} />
          {cfg.label}
        </span>
        {['rejected', 'error'].includes(inv.status) && inv.rejection_reason && (
          <p className="text-[10px] text-rose-500 mt-1 max-w-[200px] truncate" title={inv.rejection_reason}>{inv.rejection_reason}</p>
        )}
        {inv.status === 'authorized' && (
          inv.whatsapp_sent_at ? (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1" title={formatDateTime(inv.whatsapp_sent_at)}>
              <MessageCircle size={10} /> Enviado por WhatsApp
            </p>
          ) : inv.whatsapp_send_error ? (
            <p className="text-[10px] text-rose-500 mt-1 max-w-[200px] truncate flex items-center gap-1" title={inv.whatsapp_send_error}>
              <MessageCircle size={10} /> Não enviado — {inv.whatsapp_send_error}
            </p>
          ) : null
        )}
      </div>
    );
  };

  const renderActions = (inv: NfseInvoiceRow, opts: { mobile?: boolean } = {}) => {
    if (inv.status !== 'authorized') return <span className="text-slate-200 text-lg leading-none select-none">—</span>;
    const size = opts.mobile ? 'w-9 h-9' : 'w-7 h-7';
    const iconSize = opts.mobile ? 15 : 12;
    return (
      <div className={`flex items-center gap-1.5 ${opts.mobile ? 'flex-wrap' : 'justify-center'}`}>
        <button
          onClick={() => downloadFile(`/nfse/${inv.financial_transaction_id}/xml`, `nfse-${inv.chave_acesso || inv.numero}.xml`)}
          title="Baixar XML" className={`${size} flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all`}>
          <Download size={iconSize} />
        </button>
        <button
          onClick={() => downloadFile(`/nfse/${inv.financial_transaction_id}/pdf`, `nfse-${inv.chave_acesso || inv.numero}.pdf`)}
          title="Baixar PDF" className={`${size} flex items-center justify-center rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all`}>
          <FileText size={iconSize} />
        </button>
        {inv.patient_email && <button onClick={() => sendInvoice(inv, 'email')} title={`Enviar por e-mail: ${inv.patient_email}`} className={`${size} flex items-center justify-center rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all`}><Mail size={iconSize} /></button>}
        {inv.patient_whatsapp && (
          <button
            onClick={() => sendInvoice(inv, 'whatsapp')}
            title={inv.whatsapp_sent_at ? `Já enviado por WhatsApp em ${formatDateTime(inv.whatsapp_sent_at)} — clique para reenviar` : 'Enviar por WhatsApp'}
            className={`relative ${size} flex items-center justify-center rounded-lg transition-all ${
              inv.whatsapp_sent_at ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            <MessageCircle size={iconSize} />
            {inv.whatsapp_sent_at && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />}
          </button>
        )}
        <button
          onClick={() => openSubstitute(inv)}
          title="Substituir NFS-e (corrigir descrição/valor)" className={`${size} flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all`}>
          <Repeat size={iconSize} />
        </button>
        <button
          onClick={() => { setCancelTarget(inv); setCancelReason(''); }}
          title="Cancelar NFS-e" className={`${size} flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all`}>
          <Ban size={iconSize} />
        </button>
      </div>
    );
  };

  const columns: Column<NfseInvoiceRow>[] = [
    {
      header: 'Emitida em',
      render: (inv) => (
        <div>
          <p className="text-xs font-bold text-slate-700">{formatDate(inv.created_at)}</p>
          {inv.authorized_at && <p className="text-[10px] text-slate-400">Autorizada: {formatDateTime(inv.authorized_at)}</p>}
        </div>
      ),
    },
    {
      header: 'NFS-e',
      render: (inv) => (
        <div>
          <p className="text-xs font-bold text-slate-700">nº {inv.numero} · Série {inv.serie}</p>
          {inv.chave_acesso && <p className="text-[10px] text-slate-400 truncate max-w-[160px]" title={inv.chave_acesso}>{inv.chave_acesso}</p>}
          {inv.substituted_chave_acesso && (
            <p
              className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1 max-w-[160px] truncate"
              title={`Substitui a NFS-e de chave ${inv.substituted_chave_acesso}${inv.substitution_reason ? ` — Motivo: ${inv.substitution_reason}` : ''}`}
            >
              <Repeat size={9} className="shrink-0" /> Nota substituta{inv.substitution_reason ? ` — ${inv.substitution_reason}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Paciente',
      render: (inv) => (
        <p className="text-xs font-bold text-slate-700 max-w-[160px] truncate" title={inv.patient_name || undefined}>
          {inv.patient_name || '—'}
        </p>
      ),
    },
    {
      header: 'Descrição / Lançamento',
      render: (inv) => (
        <div className="max-w-[240px]">
          <p className="text-xs font-bold text-slate-700 truncate">{inv.descricao_servico || inv.transaction_description || '—'}</p>
          <p className="text-[10px] text-slate-400">{formatCurrency(inv.valor_servico)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: renderStatusBadge,
    },
    {
      header: 'Ambiente',
      render: (inv) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          inv.environment === 'producao' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
        }`}>
          {inv.environment === 'producao' ? 'Produção' : 'Homologação'}
        </span>
      ),
    },
    {
      header: 'Ações',
      headerClassName: 'text-center',
      render: (inv) => renderActions(inv),
    },
  ];

  if (!user?.nfseEnabled) {
    return (
      <PageWrapper className="space-y-4 sm:space-y-6">
        <SectionTitle icon={FileText} title="Nota Fiscal" description="Acompanhe as NFS-e emitidas, veja erros e baixe XML/PDF" />
        <div className="px-3 sm:px-5 lg:px-6 xl:px-8">
          <EmptyState
            icon={FileText}
            title="NFS-e desativada para esta clínica"
            description='Ative em Configurações > Dados Fiscais para começar a emitir notas fiscais.'
          />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="space-y-4 sm:space-y-6">
      <SectionTitle
        icon={FileText}
        title="Nota Fiscal"
        description="Acompanhe as NFS-e emitidas, veja erros e baixe XML/PDF"
        action={
          <div className="flex items-center gap-2">
            <IconButton variant="outline" size="sm" title="Como usar esta tela" onClick={() => setIsHelpOpen(true)}>
              <HelpCircle size={15} />
            </IconButton>
            <Button variant="outline" size="sm" iconLeft={<RefreshCw size={14} />} onClick={fetchInvoices}>
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">
        <FilterLine>
          <FilterLineSection grow wrap>
            <FilterLineItem grow minWidth={200}>
              <FilterLineSearch
                value={search}
                onChange={setSearch}
                placeholder="Buscar por paciente, descrição ou número..."
              />
            </FilterLineItem>
            <FilterLineItem minWidth={260}>
              <FilterLineDateRange from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineItem minWidth={180}>
              <Combobox
                value={statusFilter}
                onChange={(v) => setStatusFilter((v as string) as any)}
                placeholder="Todos os status"
                searchPlaceholder="Buscar status..."
                options={STATUS_FILTER_OPTIONS}
                size="sm"
              />
            </FilterLineItem>
          </FilterLineSection>
        </FilterLine>

        {/* Barra de ações em lote */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-violet-200 bg-violet-50">
            <span className="text-xs font-bold text-violet-700">{selectedIds.size} nota(s) selecionada(s)</span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" disabled={batchRunning} iconLeft={<RefreshCw size={13} />} onClick={handleBatchRetry}>
              Tentar novamente
            </Button>
            <Button variant="outline" size="sm" disabled={batchRunning} iconLeft={<Archive size={13} />} onClick={() => handleBatchDownload('xml')}>
              Baixar XMLs (.zip)
            </Button>
            <Button variant="outline" size="sm" disabled={batchRunning} iconLeft={<Archive size={13} />} onClick={() => handleBatchDownload('pdf')}>
              Baixar PDFs (.zip)
            </Button>
          </div>
        )}

        {invoices.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma NFS-e encontrada"
            description="As notas fiscais emitidas pelo Livro Caixa aparecerão aqui. Experimente ajustar o período ou os filtros acima."
          />
        ) : (
          <GridTable
            data={invoices}
            columns={columns}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onToggleSelect={(id) => toggleSelect(String(id))}
            onToggleSelectAll={toggleSelectAll}
            renderMobileItem={(inv) => (
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-zinc-900 truncate">nº {inv.numero} · {inv.patient_name || 'Sem paciente'}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {renderStatusBadge(inv)}
                  <span className="text-xs font-semibold text-zinc-500">{formatCurrency(inv.valor_servico)}</span>
                </div>
              </div>
            )}
            renderMobileExpandedContent={(inv) => (
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Descrição</p>
                  <p className="text-xs font-semibold text-zinc-700">{inv.descricao_servico || inv.transaction_description || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Emitida em</p>
                    <p className="text-xs font-semibold text-zinc-700">{formatDate(inv.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Ambiente</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      inv.environment === 'producao' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {inv.environment === 'producao' ? 'Produção' : 'Homologação'}
                    </span>
                  </div>
                </div>
                {inv.status === 'authorized' && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Ações</p>
                    {renderActions(inv, { mobile: true })}
                  </div>
                )}
              </div>
            )}
            pagination={{
              total, page, pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            }}
          />
        )}
      </div>

      <Modal
        isOpen={!!cancelTarget}
        onClose={() => { if (!cancelling) { setCancelTarget(null); setCancelReason(''); } }}
        title="Cancelar NFS-e"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" disabled={cancelling} onClick={() => { setCancelTarget(null); setCancelReason(''); }}>
              Voltar
            </Button>
            <Button variant="danger" disabled={cancelling || !cancelReason.trim()} onClick={handleConfirmCancel}>
              {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              A NFS-e nº <strong>{cancelTarget.numero}</strong> (Série {cancelTarget.serie}) será cancelada junto ao Sistema Nacional NFS-e.
              Essa ação não pode ser desfeita — depois de cancelada, emita uma nova nota com os dados corretos para este mesmo lançamento.
            </p>
            <div className="flex gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <AlertCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                O prazo de cancelamento varia por prefeitura, e o governo às vezes recusa esse pedido sem detalhar o motivo.
                Se isso acontecer, use <strong>Substituir</strong> nesta nota em vez de cancelar — o prazo de substituição é bem mais generoso e resolve o mesmo problema.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Motivo do cancelamento</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Nota emitida em duplicidade"
                rows={3}
                maxLength={255}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!substTarget}
        onClose={() => { if (!substituting) setSubstTarget(null); }}
        title="Substituir NFS-e"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" disabled={substituting} onClick={() => setSubstTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={substituting || !substDescricao.trim() || !substValor || Number(substValor) <= 0}
              onClick={handleConfirmSubstitute}
            >
              {substituting ? 'Substituindo...' : 'Confirmar substituição'}
            </Button>
          </div>
        }
      >
        {substTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Corrija os dados abaixo e confirme: o governo cancela automaticamente a NFS-e nº <strong>{substTarget.numero}</strong> e autoriza uma nova, já com as informações certas, numa única operação. Nada se perde se der errado — a nota atual só muda quando a substituta for aceita.
            </p>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Descrição do serviço</label>
              <textarea
                value={substDescricao}
                onChange={(e) => setSubstDescricao(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Valor do serviço (R$)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={substValor}
                onChange={(e) => setSubstValor(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">Se você é optante do Simples Nacional, o governo não permite mudar o valor numa substituição — mantenha o mesmo valor da nota original.</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Motivo da substituição (oficial)</label>
              <Combobox
                value={substCodigo}
                onChange={(v) => setSubstCodigo(v as string)}
                options={SUBSTITUTION_REASON_OPTIONS}
                size="sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Observação (opcional)</label>
              <textarea
                value={substMotivo}
                onChange={(e) => setSubstMotivo(e.target.value)}
                placeholder="Ex: Descrição do serviço estava incorreta"
                rows={2}
                maxLength={255}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Como funciona esta tela"
        size="md"
      >
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0"><SearchIcon size={15} className="text-sky-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Busca</p>
              <p className="text-xs text-slate-500">Digite o nome do paciente, a descrição do serviço ou o número da nota para filtrar a lista.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0"><CalendarRange size={15} className="text-violet-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Período (De / Até)</p>
              <p className="text-xs text-slate-500">Filtra pela data de emissão da nota. Por padrão a tela mostra o mês atual — altere as datas para ver meses anteriores.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0"><ListFilter size={15} className="text-amber-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Status</p>
              <p className="text-xs text-slate-500">
                <strong>Pendente</strong> aguarda envio; <strong>Processando</strong> está em análise no governo; <strong>Autorizada</strong> foi emitida com sucesso;
                {' '}<strong>Rejeitada</strong>/<strong>Erro</strong> falharam (veja o motivo abaixo do status); <strong>Cancelada</strong> foi cancelada junto ao Sistema Nacional NFS-e.
                {' '}Quando autorizada, aparece também se o <strong>WhatsApp</strong> para o paciente foi enviado ou não.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0"><MessageCircle size={15} className="text-teal-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Envio automático por WhatsApp</p>
              <p className="text-xs text-slate-500">
                Assim que uma nota é autorizada (emissão ou substituição), o robô do WhatsApp envia o PDF para o paciente automaticamente — não precisa clicar em nada.
                Se o paciente não tiver WhatsApp cadastrado ou o envio falhar, isso aparece abaixo do status; use o botão de WhatsApp nas ações para reenviar manualmente.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0"><Layers size={15} className="text-emerald-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Ambiente</p>
              <p className="text-xs text-slate-500"><strong>Produção</strong> é uma nota fiscal real e válida. <strong>Homologação</strong> é o ambiente de testes do governo — não tem valor fiscal.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0"><MousePointerClick size={15} className="text-rose-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Ações (por nota autorizada)</p>
              <p className="text-xs text-slate-500">
                Baixar XML, baixar PDF, enviar por e-mail ou WhatsApp (quando o paciente tiver contato cadastrado), <strong>substituir</strong> e <strong>cancelar</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0"><Repeat size={15} className="text-amber-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-700">Substituir x Cancelar</p>
              <p className="text-xs text-slate-500">
                <strong>Cancelar</strong> anula a nota (ela deixa de existir); use quando a nota nem deveria ter sido emitida (duplicidade, serviço não prestado).
                {' '}<strong>Substituir</strong> corrige a descrição/valor mantendo o vínculo com a nota original — o governo cancela a antiga e autoriza a nova, tudo numa operação só. Use substituir quando o serviço foi mesmo prestado e só um dado (como a descrição) está errado.
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Prazos</p>
              <p className="text-xs text-amber-800 mt-0.5">
                O prazo de <strong>cancelamento</strong> varia conforme a prefeitura de cada emissor — o governo pode recusar sem detalhar o motivo quando ele já passou.
                O prazo de <strong>substituição</strong> costuma ser bem mais generoso. Se o cancelamento for recusado, use Substituir na mesma nota — resolve o mesmo problema sem depender do prazo apertado.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
