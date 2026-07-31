import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Download, RefreshCw, Loader2, CheckCircle2, Clock,
  AlertCircle, XCircle, Ban, Archive,
} from 'lucide-react';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import { Button } from '../components/UI/Button';
import { GridTable, Column } from '../components/UI/GridTable';
import { EmptyState } from '../components/UI/EmptyState';
import {
  FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSegmented,
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
  created_at: string;
  transaction_description?: string | null;
  transaction_date?: string | null;
  patient_name?: string | null;
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

// ─── Component ────────────────────────────────────────────────────────────────

export const NotaFiscal: React.FC = () => {
  const { pushToast } = useToast();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<NfseInvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'all' | NfseStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await api.get<{ invoices: NfseInvoiceRow[]; total: number }>('/nfse', params);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch {
      pushToast('error', 'Erro ao carregar notas fiscais');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, dateFrom, dateTo, pushToast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Reseta para a primeira página quando os filtros mudam
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

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
      render: (inv) => {
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
          </div>
        );
      },
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
      render: (inv) => (
        <div className="flex items-center justify-center gap-1.5">
          {inv.status === 'authorized' ? (
            <>
              <button
                onClick={() => downloadFile(`/nfse/${inv.financial_transaction_id}/xml`, `nfse-${inv.chave_acesso || inv.numero}.xml`)}
                title="Baixar XML" className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all">
                <Download size={12} />
              </button>
              <button
                onClick={() => downloadFile(`/nfse/${inv.financial_transaction_id}/pdf`, `nfse-${inv.chave_acesso || inv.numero}.pdf`)}
                title="Baixar PDF" className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all">
                <FileText size={12} />
              </button>
            </>
          ) : (
            <span className="text-slate-200 text-lg leading-none select-none">—</span>
          )}
        </div>
      ),
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
          <Button variant="outline" size="sm" iconLeft={<RefreshCw size={14} />} onClick={fetchInvoices}>
            Atualizar
          </Button>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">De</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400" />
            </FilterLineItem>
            <FilterLineItem>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Até</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-violet-400" />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineSegmented
              value={statusFilter}
              onChange={v => setStatusFilter(v as any)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendente' },
                { value: 'processing', label: 'Processando' },
                { value: 'authorized', label: 'Autorizada' },
                { value: 'rejected', label: 'Rejeitada' },
                { value: 'error', label: 'Erro' },
              ]}
              size="sm"
            />
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
            description="As notas fiscais emitidas pelo Livro Caixa aparecerão aqui."
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
            pagination={{
              total, page, pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
};
