import React from 'react';
import { Badge } from '../../../components/UI/Badge';
import { INSTRUMENT_ORDER, INSTRUMENTS, type InstrumentId } from './instruments';
import type { Answers } from './scoring';
import type { AppStatus, LinkState, SchemaApplication } from './api';

export interface PatientRef { id: string; name: string; phone?: string }

export const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
export const fmtDay = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
};

export const StatusBadge: React.FC<{ status: AppStatus }> = ({ status }) =>
  status === 'completed' ? <Badge color="success" size="sm">Concluído</Badge>
    : status === 'in_progress' ? <Badge color="warning" size="sm">Em andamento</Badge>
      : <Badge color="default" size="sm">Não iniciado</Badge>;

export const LinkBadge: React.FC<{ state: LinkState }> = ({ state }) =>
  state === 'active' ? <Badge color="primary" size="sm">Ativo</Badge>
    : state === 'completed' ? <Badge color="success" size="sm">Respondido</Badge>
      : state === 'expired' ? <Badge color="warning" size="sm">Expirado</Badge>
        : <Badge color="danger" size="sm">Cancelado</Badge>;

export const originLabel = (a: SchemaApplication) =>
  a.status === 'completed'
    ? (a.answered_by === 'patient' ? 'Paciente (link)' : 'Profissional')
    : a.last_saved_by === 'patient' ? 'Paciente (link)' : a.link_id ? 'Link enviado' : 'Profissional';

export const ProgressBar: React.FC<{ answered: number; total: number; label: string }> = ({ answered, total, label }) => {
  const p = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500"><span>{answered}/{total}</span><span>{p}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label={label}>
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
};

/** Data de referência da aplicação (conclusão, senão último salvamento). */
export const appDate = (a: SchemaApplication) => a.completed_at || a.last_saved_at || a.created_at;
const ts = (a: SchemaApplication) => { const d = new Date(appDate(a)).getTime(); return isNaN(d) ? 0 : d; };

/** Aplicação mais recente de cada instrumento (por padrão só as concluídas). */
export function latestByInstrument(apps: SchemaApplication[], onlyCompleted = true): Partial<Record<InstrumentId, SchemaApplication>> {
  const out: Partial<Record<InstrumentId, SchemaApplication>> = {};
  [...apps].sort((a, b) => ts(b) - ts(a)).forEach(a => {
    if (onlyCompleted && a.status !== 'completed') return;
    if (!onlyCompleted && a.answered_count === 0) return;
    if (!out[a.instrument_id]) out[a.instrument_id] = a;
  });
  return out;
}

export function answersMap(latest: Partial<Record<InstrumentId, SchemaApplication>>): Partial<Record<InstrumentId, Answers>> {
  const out: Partial<Record<InstrumentId, Answers>> = {};
  INSTRUMENT_ORDER.forEach(id => { const a = latest[id]; if (a) out[id] = a.answers; });
  return out;
}

export const instrumentTitle = (id: InstrumentId) => `${INSTRUMENTS[id].name} - ${INSTRUMENTS[id].fullName}`;
