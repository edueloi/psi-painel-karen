import React, { useMemo } from 'react';
import { Calendar, Clock, ClipboardCheck, Plus } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { EmptyState } from '../UI/EmptyState';
import { dayOfStamp, faltaPending, ocorrenciaOf, isAbsenceOc, occurrenceBadgeLabel } from './liveRecords';
import { PreviousRecordsNotice } from './LiveRecordPanels';
import { HUMOR_COLOR, normalizeHumor, RISCO_TRIAGEM, parseStructured, buildResumo } from './specialtyTemplates';

export interface SessionRecord {
  id: string;
  title: string;
  status: string;
  created_at: string;
  start_time?: string;
  end_time?: string;
  appointment_type?: string;
  content?: string;
  draft_content?: string;
  ai_organized_content?: string;
  tags?: string[];
}

const strip = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const STATUS_COLOR: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'default'> = {
  Rascunho: 'warning', Organizado: 'info', Revisado: 'purple', Aprovado: 'success', Finalizado: 'info',
};

/** Linha do tempo de sessões: número, data, modalidade, humor e resumo. */
export const SessionTimeline: React.FC<{
  records: SessionRecord[];
  onOpen: (r: SessionRecord) => void;
  onNew: () => void;
  renderActions: (r: SessionRecord) => React.ReactNode;
  emptyFiltered?: boolean;
  onFillMotive?: (r: SessionRecord) => void;
}> = ({ records: allRecords, onOpen, onNew, renderActions, emptyFiltered, onFillMotive }) => {
  // Uma evolução por data de consulta: duplicadas antigas da mesma data ficam agrupadas sob a mais recente.
  const { records, extrasByDay } = useMemo(() => {
    const seen = new Set<string>();
    const primaries: SessionRecord[] = [];
    const extras: Record<string, SessionRecord[]> = {};
    allRecords.forEach(r => {
      const day = dayOfStamp(r.created_at) || r.id;
      if (seen.has(day)) { (extras[day] = extras[day] || []).push(r); } else { seen.add(day); primaries.push(r); }
    });
    return { records: primaries, extrasByDay: extras };
  }, [allRecords]);
  // Número da sessão = posição cronológica (a lista chega ordenada do mais novo ao mais antigo).
  const items = useMemo(() => {
    const total = records.length;
    return records.map((r, i) => {
      const s = parseStructured(r.ai_organized_content);
      const v = s?.values || {};
      const numero = v.sessao_numero ? String(v.sessao_numero) : String(total - i);
      const resumo = (s?.resumo || buildResumo(v) || v.tema || v.relato || strip(r.content || r.draft_content || '')) as string;
      const riscos = RISCO_TRIAGEM.filter(x => v[`risco_${x.key}`] === 'Presente').map(x => x.label.split(' (')[0]);
      const duracao = s?.meta?.duracao_min;
      const intervencoes: string[] = Array.isArray(v.intervencoes) ? v.intervencoes : [];
      const oc = ocorrenciaOf(r.ai_organized_content);
      return { r, oc, pendente: faltaPending(r.ai_organized_content), numero, humor: normalizeHumor(v.humor) || undefined, tema: v.tema as string | undefined, resumo: strip(resumo), intervencoes, riscos, duracao, estruturado: !!s };
    });
  }, [records]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={emptyFiltered ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão registrada'}
        description={emptyFiltered ? 'Ajuste a busca para ver outras sessões.' : 'Registre a evolução de cada sessão para acompanhar o processo do paciente.'}
        action={!emptyFiltered ? <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={onNew}>Nova evolução</Button> : undefined}
      />
    );
  }

  return (
    <ol className="relative space-y-3">
      {items.map(({ r, oc, pendente, numero, humor, tema, resumo, intervencoes, riscos, duracao }) => (
        <li key={r.id} className="relative flex gap-3">
          <div className="flex w-9 shrink-0 flex-col items-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-xs font-medium text-primary-700" title={`Sessão ${numero}`}>
              {numero}
            </span>
            <span className="mt-1 w-px flex-1 bg-slate-200" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button type="button" onClick={() => onOpen(r)} className="min-w-0 text-left">
                <p className="truncate text-sm font-medium text-slate-900 hover:text-primary-700">{tema || r.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={11} /> Sessão {numero} · {fmtDate(r.created_at)}</span>
                  {r.start_time && <span className="inline-flex items-center gap-1"><Clock size={11} /> {r.start_time}{r.end_time ? ` – ${r.end_time}` : ''}{duracao ? ` (${duracao} min)` : ''}</span>}
                </p>
              </button>
              <div className="flex shrink-0 flex-wrap items-center gap-1">{renderActions(r)}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isAbsenceOc(oc) && <Badge color="warning">{occurrenceBadgeLabel(oc)}</Badge>}
              {pendente && <Badge color="danger" dot>Motivo da falta pendente</Badge>}
              {r.appointment_type && <Badge color="default">{r.appointment_type}</Badge>}
              {humor && <Badge color={HUMOR_COLOR[humor] || 'default'} dot>Humor: {humor}</Badge>}
              {riscos.length > 0 && <Badge color="danger" dot>Risco: {riscos.join(', ')}</Badge>}
              <Badge color={STATUS_COLOR[r.status] || 'default'}>{r.status}</Badge>
            </div>
            {pendente && onFillMotive && (
              <div className="mt-2"><Button variant="outline" size="xs" onClick={() => onFillMotive(r)}>Preencher motivo</Button></div>
            )}
            {extrasByDay[dayOfStamp(r.created_at)]?.length ? (
              <div className="mt-2"><PreviousRecordsNotice records={extrasByDay[dayOfStamp(r.created_at)] as any} onOpen={(id) => onOpen({ id } as SessionRecord)} noun="de evolução nesta data" /></div>
            ) : null}
            {resumo && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{resumo}</p>}
            {intervencoes.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Intervenções: {intervencoes.slice(0, 3).join(', ')}{intervencoes.length > 3 ? ` +${intervencoes.length - 3}` : ''}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
