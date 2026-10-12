import React, { useMemo, useState } from 'react';
import { Activity, Users, FileText, Calendar, Edit3, CheckCircle2, Search, ChevronRight, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { PanelCard } from '../UI/PanelCard';
import { Button } from '../UI/Button';
import { Input, Select } from '../UI/Input';
import { Tabs } from '../UI/Tabs';
import { Badge } from '../UI/Badge';
import { StatGrid } from '../UI/PageWrapper';
import { StatCard } from '../UI/StatCard';
import { EmptyState } from '../UI/EmptyState';
import { Pagination } from '../UI/Pagination';
import { HOME_RECORD_TYPES, filterHomeRecords, groupHomeRecords, homeDateLabel, homeRecordDay, homeRecordStamp, isHomePatientActive, normalizeHomeSearch, type HomePatient, type HomeRecord } from './recordsHomeModel';

interface Props {
  patients: HomePatient[]; records: HomeRecord[]; loading: boolean; error?: boolean;
  onOpenPatient: (id: string) => void;
  onOpenRecord: (record: HomeRecord) => Promise<void>;
  onRetry: () => void;
}

const statusColors = { Rascunho: 'warning', Organizado: 'info', Revisado: 'purple', Aprovado: 'success', Finalizado: 'info' } as const;
const tabs = [{ id: 'patients', label: 'Por paciente', icon: Users }, { id: 'records', label: 'Últimos registros', icon: Activity }] as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

export function RecordsHome({ patients, records, loading, error, onOpenPatient, onOpenRecord, onRetry }: Props) {
  const [view, setView] = useState<'patients' | 'records'>('patients');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientStatus, setPatientStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [opening, setOpening] = useState<string | null>(null);
  const names = useMemo(() => new Map(patients.map(p => [String(p.id), p.full_name])), [patients]);
  const byPatient = useMemo(() => groupHomeRecords(records), [records]);
  const filtered = useMemo(() => filterHomeRecords(records, patients, { search, type, status, from, to }), [records, patients, search, type, status, from, to]);
  const filteredByPatient = useMemo(() => groupHomeRecords(filtered), [filtered]);
  const recordFilters = !!(type || status || from || to);
  const patientRows = useMemo(() => patients.filter(p => {
    const active = isHomePatientActive(p);
    if (patientStatus && (patientStatus === 'active' ? !active : active)) return false;
    const matchesRecord = filteredByPatient.has(String(p.id));
    if (recordFilters) return matchesRecord;
    const query = normalizeHomeSearch(search);
    const cpfQuery = query.replace(/\D/g, '');
    return normalizeHomeSearch(p.full_name).includes(query) || matchesRecord
      || (/^[\d.\-\s]+$/.test(query) && !!cpfQuery && (p.cpf || '').replace(/\D/g, '').includes(cpfQuery));
  }).sort((a, b) => {
    const lastA = byPatient.get(String(a.id))?.[0];
    const lastB = byPatient.get(String(b.id))?.[0];
    return (lastB ? homeRecordStamp(lastB) : 0) - (lastA ? homeRecordStamp(lastA) : 0) || a.full_name.localeCompare(b.full_name, 'pt-BR');
  }), [patients, filteredByPatient, recordFilters, patientStatus, search, byPatient]);
  const recordRows = filtered.filter(r => !patientStatus || (patientStatus === 'active'
    ? patients.some(p => String(p.id) === String(r.patient_id) && isHomePatientActive(p))
    : patients.some(p => String(p.id) === String(r.patient_id) && !isHomePatientActive(p))));
  const total = view === 'records' ? recordRows.length : patientRows.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const offset = (currentPage - 1) * pageSize;
  const thisMonth = homeRecordDay(new Date().toISOString()).slice(0, 7);
  const unavailable = loading || error;
  const resetPage = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1); };
  const clear = () => { setSearch(''); setType(''); setStatus(''); setFrom(''); setTo(''); setPatientStatus(''); setPage(1); };
  const hasFilters = !!(search || recordFilters || patientStatus);
  const openRecord = async (record: HomeRecord) => {
    setOpening(record.id);
    try { await onOpenRecord(record); } finally { setOpening(null); }
  };
  const patientName = (record: HomeRecord) => names.get(String(record.patient_id)) || record.patient_name || 'Paciente não identificado';

  return <div className="space-y-4 min-w-0">
    <StatGrid cols={4}>
      <StatCard title="Pacientes com registros" value={unavailable ? '—' : byPatient.size} description={unavailable ? 'Prontuários disponíveis para você' : `${records.length} registros disponíveis para você`} icon={Users} color="info" />
      <StatCard title="Registros neste mês" value={unavailable ? '—' : records.filter(r => homeRecordDay(r.created_at).startsWith(thisMonth)).length} description="Pela data de referência" icon={Calendar} color="purple" />
      <StatCard title="Rascunhos" value={unavailable ? '—' : records.filter(r => r.status === 'Rascunho').length} description="Aguardando revisão e aprovação" icon={Edit3} color="warning" />
      <StatCard title="Aprovados" value={unavailable ? '—' : records.filter(r => r.status === 'Aprovado').length} description="Registros aprovados disponíveis" icon={CheckCircle2} color="success" />
    </StatGrid>

    <PanelCard title="Encontre um prontuário" icon={Search} description="Busque pelo paciente e acompanhe os registros vinculados a ele.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input label="Paciente, título ou profissional" value={search} onChange={e => resetPage(setSearch, e.target.value)} placeholder="Nome, CPF ou título do registro..." iconLeft={<Search size={14} />} wrapperClassName="sm:col-span-2" />
        <Select label="Tipo de registro" value={type} onChange={e => resetPage(setType, e.target.value)}><option value="">Todos os tipos</option>{Object.entries(HOME_RECORD_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
        <Select label="Situação do registro" value={status} onChange={e => resetPage(setStatus, e.target.value)}><option value="">Todas as situações</option>{Object.keys(statusColors).map(label => <option key={label}>{label}</option>)}</Select>
        <Input label="Data de referência: de" type="date" value={from} max={to || undefined} onChange={e => resetPage(setFrom, e.target.value)} />
        <Input label="Até" type="date" value={to} min={from || undefined} onChange={e => resetPage(setTo, e.target.value)} />
        <Select label="Situação do paciente" value={patientStatus} onChange={e => resetPage(setPatientStatus, e.target.value)}><option value="">Todos os pacientes</option><option value="active">Em atendimento</option><option value="inactive">Inativos / outros</option></Select>
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" variant={status === 'Rascunho' ? 'primary' : 'outline'} onClick={() => resetPage(setStatus, status === 'Rascunho' ? '' : 'Rascunho')} iconLeft={<Edit3 size={14} />}>Ver rascunhos</Button>
          {hasFilters && <Button size="sm" variant="ghost" onClick={clear}>Limpar</Button>}
        </div>
      </div>
      {from && to && from > to && <p role="alert" className="mt-2 text-xs text-red-600">A data inicial deve ser anterior à data final.</p>}
    </PanelCard>

    <Tabs<'patients' | 'records'> items={tabs} value={view} onChange={value => resetPage(setView, value)} label="Visão do prontuário" />
    <PanelCard title={view === 'patients' ? 'Prontuários por paciente' : 'Últimos registros'} icon={view === 'patients' ? Users : Activity}
      description={view === 'patients' ? 'Pacientes com atividade recente aparecem primeiro. Abra o prontuário para acessar todo o histórico.' : 'Ordenados pela última atualização. A data de referência é a data informada no registro.'}
      action={<span className="text-xs text-slate-500" aria-live="polite">{total} {view === 'patients' ? 'paciente(s)' : 'registro(s)'}{hasFilters ? ' encontrados com os filtros' : ''}</span>}>
      {loading ? <div role="status" className="flex justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={20} />Carregando prontuários...</div>
        : error ? <EmptyState icon={FileText} title="Não foi possível carregar os registros" description="Tente novamente para consultar o histórico atualizado." action={<Button size="sm" variant="outline" onClick={onRetry}>Tentar novamente</Button>} />
        : !total ? <EmptyState icon={Search} title={hasFilters ? 'Nenhum resultado para esta busca' : 'Nenhum prontuário disponível'} description={hasFilters ? 'Revise o nome, o tipo, a situação ou o período selecionado.' : 'Os registros aparecerão aqui conforme forem cadastrados.'} action={hasFilters && <Button size="sm" variant="outline" onClick={clear}>Limpar filtros</Button>} />
        : view === 'patients' ? <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {patientRows.slice(offset, offset + pageSize).map(patient => {
            const all = byPatient.get(String(patient.id)) || [];
            const latest = (hasFilters ? filteredByPatient.get(String(patient.id)) : all)?.[0];
            const drafts = all.filter(r => r.status === 'Rascunho').length;
            return <article key={patient.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-200 transition-colors">
              <div className="flex items-start gap-3">
                <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-semibold text-primary-700">{initials(patient.full_name)}</div>
                <div className="min-w-0 flex-1"><h4 className="text-sm font-semibold leading-snug text-slate-900 break-words">{patient.full_name || 'Paciente sem nome'}</h4><p className="mt-1 text-xs text-slate-500">{all.length} registro(s) · {isHomePatientActive(patient) ? 'Em atendimento' : 'Inativo / outros'}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(HOME_RECORD_TYPES).filter(([key]) => all.some(r => r.record_type === key)).map(([key, label]) => <Badge key={key} color="default" size="sm">{label}</Badge>)}</div>
              <div className="my-3 rounded-lg bg-slate-50 p-3 text-xs">
                <p className="mb-1 text-slate-500">{recordFilters ? 'Último registro no filtro' : 'Último registro atualizado'}</p>
                {latest ? <><p className="font-medium text-slate-800">{HOME_RECORD_TYPES[latest.record_type] || latest.record_type} · {homeDateLabel(latest.created_at)}</p><p className="mt-1 text-slate-500">{latest.status}{latest.professional_name ? ` · ${latest.professional_name}` : ''}</p></> : <p className="text-slate-500">{all.length ? 'Nenhum registro nesta busca.' : 'Ainda sem registros. Abra o prontuário para iniciar.'}</p>}
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{drafts ? <Badge color="warning" size="sm">{drafts} rascunho(s)</Badge> : 'Sem rascunhos'}</span>
                <Button size="sm" variant="outline" iconRight={<ChevronRight size={14} />} onClick={() => onOpenPatient(String(patient.id))}>Abrir prontuário</Button>
              </div>
            </article>;
          })}
        </div> : <div className="space-y-2">
          {recordRows.slice(offset, offset + pageSize).map(record => <article key={record.id} className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 xl:grid-cols-[minmax(0,1fr)_170px_auto] xl:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 text-sm font-semibold">{initials(patientName(record))}</div>
              <div className="min-w-0"><h4 className="font-semibold text-sm leading-snug text-slate-900 break-words">{patientName(record)}</h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-2"><Badge color="info" size="sm">{HOME_RECORD_TYPES[record.record_type] || record.record_type}</Badge><Badge size="sm" color={statusColors[record.status] || 'default'}>{record.status}</Badge>{record.ai_status === 'organized' && <Badge size="sm" color="purple" icon={<Sparkles size={10} />}>Organizado com IA</Badge>}</div>
                <p className="mt-2 text-xs text-slate-600 break-words">{record.title || 'Registro sem título'}</p>
                {record.professional_name && <p className="mt-1 text-xs text-slate-500">Profissional: {record.professional_name}</p>}
              </div>
            </div>
            <div className="text-xs text-slate-600 xl:border-l xl:border-slate-100 xl:pl-4"><p className="text-slate-500">Data de referência</p><p className="mt-1 font-medium">{homeDateLabel(record.created_at)}{record.start_time ? ` · ${record.start_time.slice(0, 5)}` : ''}</p>{record.updated_at && <p className="mt-1 text-[11px] text-slate-500">Atualizado em {homeDateLabel(record.updated_at)}</p>}</div>
            <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
              <Button size="sm" variant="primary" loading={opening === record.id} disabled={opening !== null} iconLeft={<FileText size={14} />} onClick={() => openRecord(record)}>Abrir registro</Button>
              <Button size="sm" variant="ghost" iconLeft={<BookOpen size={14} />} onClick={() => onOpenPatient(String(record.patient_id))}>Ver prontuário</Button>
            </div>
          </article>)}
        </div>}
      {!loading && !error && total > 0 && <Pagination className="mt-4" total={total} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={value => resetPage(setPageSize, value)} />}
    </PanelCard>
  </div>;
}
