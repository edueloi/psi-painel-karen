import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Download, Eye, Filter, Inbox, Users, Wallet, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useToast } from '../../contexts/ToastContext';
import { PAGE_SIZE_OPTIONS } from '../../src/lib/usePreferences';
import {
  Badge, Button, ContentCard, EmptyState, FilterLine, FilterLineSearch, FilterLineSection,
  FilterLineSelect, Modal, ModalFooter, Pagination, StatCard, StatGrid,
} from '../UI';
import { formatCurrency, formatDateBR } from './accountsShared';
import { exportPatientReceivablesReport } from './patientReceivablesExport';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

type PatientStatus = 'all' | 'active' | 'inactive';
type PaymentSource = 'livro_caixa';

const isPatientStatus = (value: string | null): value is PatientStatus =>
  value === 'all' || value === 'active' || value === 'inactive';

const getPageSize = (value: string | null, fallback: number) => {
  const pageSize = Number(value);
  return PAGE_SIZE_OPTIONS.includes(pageSize as typeof PAGE_SIZE_OPTIONS[number]) ? pageSize : fallback;
};

const getMonthFilter = (value: string | null) => {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : null;
};

interface PaymentDetail {
  id: number;
  source: PaymentSource;
  amount: number;
  payment_date: string;
  registered_at: string | null;
  payment_method: string | null;
  description: string;
  comanda_id: number | null;
}

interface MonthValue {
  amount: number;
  payments: PaymentDetail[];
}

interface PatientAnnualRow {
  patient_id: number;
  patient_name: string;
  status: 'active' | 'inactive';
  months: MonthValue[];
  total_paid: number;
}

interface AnnualResponse {
  year: number;
  years: number[];
  patients: PatientAnnualRow[];
}

interface DetailSelection {
  patient: PatientAnnualRow;
  monthIndex: number | null;
}

const statusLabel = (status: PatientAnnualRow['status']) => status === 'active' ? 'Ativo' : 'Inativo';

const formatRegisteredAt = (value: string | null) => {
  if (!value) return 'Horário não informado';
  const [date, time] = String(value).replace('T', ' ').split(' ');
  return `${formatDateBR(date)}${time ? ` às ${time.slice(0, 5)}` : ''}`;
};

/** Visão anual dos valores efetivamente recebidos por paciente, no formato de planilha. */
export const PatientReceivables: React.FC<{ canManage: boolean }> = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferences, updatePreference } = useUserPreferences();
  const { success: showSuccess, error: showError } = useToast();
  const currentYear = new Date().getFullYear();
  const initialYear = Number(searchParams.get('ano')) || currentYear;
  const initialPageSize = getPageSize(searchParams.get('por_pagina'), preferences.patientReceivables.itemsPerPage);
  const [year, setYear] = useState(String(initialYear));
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [patients, setPatients] = useState<PatientAnnualRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientStatus, setPatientStatus] = useState<PatientStatus>(
    isPatientStatus(searchParams.get('situacao')) ? searchParams.get('situacao') as PatientStatus : 'active'
  );
  const [search, setSearch] = useState(searchParams.get('busca') || '');
  const [monthFilter, setMonthFilter] = useState<number | null>(getMonthFilter(searchParams.get('mes')));
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('pagina')) || 1));
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [exporting, setExporting] = useState(false);

  const updateGridUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const nextYear = Number(searchParams.get('ano')) || currentYear;
    const nextStatus = searchParams.get('situacao');
    const nextSearch = searchParams.get('busca') || '';
    const nextMonthFilter = getMonthFilter(searchParams.get('mes'));
    const nextPage = Math.max(1, Number(searchParams.get('pagina')) || 1);
    const nextPageSize = getPageSize(searchParams.get('por_pagina'), preferences.patientReceivables.itemsPerPage);

    setYear(String(nextYear));
    setPatientStatus(isPatientStatus(nextStatus) ? nextStatus : 'active');
    setSearch(nextSearch);
    setMonthFilter(nextMonthFilter);
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, [currentYear, preferences.patientReceivables.itemsPerPage, searchParams]);

  useEffect(() => {
    if (searchParams.has('pagina') && searchParams.has('por_pagina')) return;
    const params = new URLSearchParams(searchParams);
    if (!params.has('pagina')) params.set('pagina', String(page));
    if (!params.has('por_pagina')) params.set('por_pagina', String(pageSize));
    setSearchParams(params, { replace: true });
  }, [page, pageSize, searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AnnualResponse>('/finance/accounts/patient-receivables/annual', { year });
      setPatients(response.patients || []);
      setAvailableYears(Array.from(new Set([currentYear, ...(response.years || []), Number(year)])).sort((a, b) => b - a));
    } catch (requestError: any) {
      setError(requestError?.message || 'Não foi possível carregar os recebimentos dos pacientes.');
    } finally {
      setLoading(false);
    }
  }, [currentYear, year]);

  useEffect(() => { load(); }, [load]);
  useRealtimeSync('finance.created', load);
  useRealtimeSync('finance.updated', load);
  useRealtimeSync('finance.deleted', load);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return patients.filter(patient =>
      (patientStatus === 'all' || patient.status === patientStatus) &&
      (monthFilter === null || patient.months[monthFilter].amount > 0.004) &&
      (!term || patient.patient_name.toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [monthFilter, patients, patientStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedPatients = useMemo(
    () => filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredPatients, pageSize],
  );

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
      updateGridUrl({ pagina: String(currentPage) });
    }
  }, [currentPage, page, updateGridUrl]);

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(nextPage, totalPages));
    setPage(safePage);
    updateGridUrl({ pagina: String(safePage) });
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    const safePageSize = getPageSize(String(nextPageSize), preferences.patientReceivables.itemsPerPage);
    setPageSize(safePageSize);
    setPage(1);
    updatePreference('patientReceivables', { itemsPerPage: safePageSize });
    updateGridUrl({ pagina: '1', por_pagina: String(safePageSize) });
  };

  const handleYearChange = (nextYear: string) => {
    setYear(nextYear);
    setPage(1);
    updateGridUrl({ ano: nextYear, pagina: '1' });
  };

  const handleStatusChange = (nextStatus: PatientStatus) => {
    setPatientStatus(nextStatus);
    setPage(1);
    updateGridUrl({ situacao: nextStatus, pagina: '1' });
  };

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);
    setPage(1);
    updateGridUrl({ busca: nextSearch, pagina: '1' });
  };

  const handleMonthFilter = (monthIndex: number) => {
    const nextMonth = monthFilter === monthIndex ? null : monthIndex;
    setMonthFilter(nextMonth);
    setPage(1);
    updateGridUrl({ mes: nextMonth === null ? null : String(nextMonth + 1), pagina: '1' });
  };

  const monthTotals = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0);
    filteredPatients.forEach(patient => patient.months.forEach((month, index) => {
      totals[index] += month.amount;
    }));
    return totals.map(total => Math.round(total * 100) / 100);
  }, [filteredPatients]);

  const totalReceived = monthTotals.reduce((total, value) => total + value, 0);
  const summary = useMemo(() => {
    const received = filteredPatients.reduce((total, patient) => total + patient.total_paid, 0);
    const withPayments = filteredPatients.filter(patient => patient.total_paid > 0.004).length;
    return {
      received,
      withPayments,
      active: patients.filter(patient => patient.status === 'active').length,
      inactive: patients.filter(patient => patient.status === 'inactive').length,
    };
  }, [filteredPatients, patients]);

  const detailPayments = useMemo(() => {
    if (!detail) return [];
    const values = detail.monthIndex === null
      ? detail.patient.months.flatMap(month => month.payments)
      : detail.patient.months[detail.monthIndex]?.payments || [];
    return [...values].sort((a, b) => `${b.payment_date} ${b.registered_at || ''}`.localeCompare(`${a.payment_date} ${a.registered_at || ''}`));
  }, [detail]);

  const detailTotal = detailPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const exportAnnual = async () => {
    setExporting(true);
    try {
      await exportPatientReceivablesReport(filteredPatients, monthTotals, {
        year,
        statusLabel: patientStatus === 'active' ? 'Somente ativos' : patientStatus === 'inactive' ? 'Somente inativos' : 'Ativos e inativos',
        search,
        monthLabel: monthFilter === null ? undefined : MONTHS[monthFilter],
      });
      showSuccess('Relatório exportado', 'A planilha com dados da clínica, filtros e gráfico foi baixada.');
    } catch (exportError: any) {
      showError('Não foi possível exportar', exportError?.message || 'Tente novamente em alguns instantes.');
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = patientStatus !== 'active' || Boolean(search);

  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <StatCard title={`Recebido em ${year}`} value={formatCurrency(summary.received)} icon={Wallet} color="success" />
        <StatCard title="Pacientes com pagamento" value={String(summary.withPayments)} icon={CheckCircle2} color="info" />
        <StatCard title="Pacientes ativos" value={String(summary.active)} icon={Users} color="default" />
        <StatCard title="Pacientes inativos" value={String(summary.inactive)} icon={Users} color="default" />
      </StatGrid>

      <ContentCard padding="none">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Recebimentos por paciente</h3>
            <p className="mt-0.5 text-xs text-slate-500">Pagamentos efetivamente registrados no Livro Caixa, organizados por mês.</p>
          </div>
          <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={exportAnnual} loading={exporting} disabled={!filteredPatients.length || exporting}>Exportar relatório</Button>
        </div>

        <FilterLine className="border-b border-slate-100 px-4 py-2.5">
          <FilterLineSection>
            <FilterLineSelect
              label="Ano"
              value={year}
              onChange={handleYearChange}
              options={availableYears.map(item => ({ value: String(item), label: String(item) }))}
              className="sm:w-28"
            />
            <FilterLineSelect
              label="Situação do paciente"
              value={patientStatus}
              onChange={value => handleStatusChange(value as PatientStatus)}
              options={[
                { value: 'active', label: 'Ativos' },
                { value: 'inactive', label: 'Inativos' },
                { value: 'all', label: 'Todos' },
              ]}
              className="sm:w-44"
            />
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineSearch value={search} onChange={handleSearchChange} placeholder="Buscar paciente" className="sm:!w-56" />
            {monthFilter !== null && (
              <Button variant="outline" size="sm" iconLeft={<Filter size={14} />} iconRight={<X size={13} />} onClick={() => handleMonthFilter(monthFilter)}>
                Pagantes em {MONTHS[monthFilter]}
              </Button>
            )}
          </FilterLineSection>
        </FilterLine>

        {error ? (
          <EmptyState icon={Inbox} title="Não foi possível carregar" description={error} action={<Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>} />
        ) : loading ? (
          <div className="py-14 text-center text-xs text-slate-500">Carregando recebimentos…</div>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={hasFilters ? 'Nenhum paciente encontrado' : 'Nenhum paciente ativo cadastrado'}
            description="Altere os filtros para consultar pacientes ativos, inativos ou todos."
          />
        ) : (
          <>
            <div className="max-h-[calc(100vh-340px)] min-h-[300px] overflow-auto overscroll-contain">
              <table className="min-w-[1120px] w-full border-collapse text-left">
                <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_rgb(226_232_240)]">
                  <tr className="border-b border-slate-200">
                    <th className="sticky left-0 z-30 min-w-64 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">Paciente</th>
                    <th className="min-w-24 px-2 py-3 text-xs font-semibold text-slate-600">Status</th>
                    {MONTHS.map((month, index) => (
                      <th key={month} className="min-w-14 border-l border-slate-100 px-1 py-2 text-center text-xs font-semibold text-slate-600">
                        <button
                          type="button"
                          onClick={() => handleMonthFilter(index)}
                          aria-pressed={monthFilter === index}
                          title={monthFilter === index ? `Remover filtro de ${month}` : `Mostrar pagantes de ${month}`}
                          className={`rounded px-1.5 py-1 transition-colors ${monthFilter === index ? 'bg-primary-100 text-primary-700' : 'hover:bg-slate-200 hover:text-slate-800'}`}
                        >
                          {month}
                        </button>
                      </th>
                    ))}
                    <th className="min-w-28 border-l border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600">Total</th>
                    <th className="min-w-28 px-3 py-3 text-right text-xs font-semibold text-slate-600">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPatients.map(patient => (
                    <tr key={patient.patient_id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="sticky left-0 z-[1] bg-white px-4 py-2.5 text-xs font-medium text-slate-800 group-hover:bg-slate-50">
                        <button type="button" className="max-w-60 truncate text-left hover:text-primary-700 hover:underline" onClick={() => navigate(`/pacientes/${patient.patient_id}`)} title="Abrir paciente">
                          {patient.patient_name}
                        </button>
                      </td>
                      <td className="px-2 py-2.5"><Badge color={patient.status === 'active' ? 'success' : 'default'}>{statusLabel(patient.status)}</Badge></td>
                      {patient.months.map((month, index) => (
                        <td key={MONTHS[index]} className="border-l border-slate-100 px-1 py-2 text-center">
                          {month.amount > 0.004 ? (
                            <button
                              type="button"
                              onClick={() => setDetail({ patient, monthIndex: index })}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50 focus-visible:outline-primary-500"
                              title={`${formatCurrency(month.amount)} pago em ${MONTHS[index]} — ver detalhes`}
                            >
                              <CheckCircle2 size={18} aria-hidden="true" />
                              <span className="sr-only">{formatCurrency(month.amount)} pago em {MONTHS[index]}</span>
                            </button>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      ))}
                      <td className="border-l border-slate-200 px-3 py-2.5 text-right text-xs font-semibold text-slate-800">{formatCurrency(patient.total_paid)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="outline" size="xs" iconLeft={<Eye size={13} />} onClick={() => setDetail({ patient, monthIndex: null })}>Mais info</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 border-t-2 border-slate-300 bg-slate-50 shadow-[0_-1px_0_rgb(226_232_240)]">
                  <tr>
                    <th className="sticky bottom-0 left-0 z-20 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-800">Total do filtro</th>
                    <td className="bg-slate-50 px-2 py-3 text-xs text-slate-500">{filteredPatients.length} paciente{filteredPatients.length === 1 ? '' : 's'}</td>
                    {monthTotals.map((total, index) => (
                      <td key={MONTHS[index]} className="border-l border-slate-200 bg-slate-50 px-1 py-3 text-center text-xs font-semibold text-emerald-700">
                        {total > 0.004 ? formatCurrency(total) : '—'}
                      </td>
                    ))}
                    <td className="border-l border-slate-300 bg-slate-50 px-3 py-3 text-right text-xs font-bold text-slate-800">{formatCurrency(totalReceived)}</td>
                    <td className="bg-slate-50" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination
              total={filteredPatients.length}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </ContentCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail?.patient.patient_name || 'Detalhes do recebimento'}
        subtitle={detail ? `${detail.monthIndex === null ? `Todos os pagamentos de ${year}` : `${MONTHS[detail.monthIndex]} de ${year}`} · ${formatCurrency(detailTotal)}` : undefined}
        footer={<ModalFooter align="right"><Button variant="outline" size="sm" onClick={() => setDetail(null)}>Fechar</Button></ModalFooter>}
      >
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-800">
              <BookOpen size={15} />
              <span>Detalhes de pagamentos registrados no Livro Caixa.</span>
            </div>
            {detailPayments.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nenhum pagamento neste período" description="Este paciente não possui pagamento registrado no período selecionado." />
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {detailPayments.map(payment => (
                  <div key={`${payment.source}-${payment.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-3">
                    <div className="min-w-48 flex-1">
                      <p className="text-xs font-medium text-slate-800">{payment.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Pago em {formatDateBR(payment.payment_date)} · Registrado em {formatRegisteredAt(payment.registered_at)}
                      </p>
                    </div>
                    <Badge color="success">Livro Caixa</Badge>
                    <span className="text-xs text-slate-600">{payment.payment_method || 'Forma não informada'}</span>
                    <span className="min-w-24 text-right text-sm font-semibold text-emerald-700">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
