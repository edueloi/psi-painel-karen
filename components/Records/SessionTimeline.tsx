import React, { useMemo } from 'react';
import { Calendar, Clock, ClipboardCheck, Plus } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { EmptyState } from '../UI/EmptyState';
import { HUMOR_COLOR, parseStructured } from './specialtyTemplates';

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
}> = ({ records, onOpen, onNew, renderActions, emptyFiltered }) => {
  // Número da sessão = posição cronológica (a lista chega ordenada do mais novo ao mais antigo).
  const items = useMemo(() => {
    const total = records.length;
    return records.map((r, i) => {
      const s = parseStructured(r.ai_organized_content);
      const v = s?.values || {};
      const numero = v.sessao_numero ? String(v.sessao_numero) : String(total - i);
      const resumo = (v.tema || v.relato || strip(r.content || r.draft_content || '')) as string;
      const intervencoes: string[] = Array.isArray(v.intervencoes) ? v.intervencoes : [];
      return { r, numero, humor: v.humor as string | undefined, tema: v.tema as string | undefined, resumo: strip(resumo), intervencoes, estruturado: !!s };
    });
  }, [records]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={emptyFiltered ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão registrada'}
        description={emptyFiltered ? 'Ajuste a busca para ver outras sessões.' : 'Registre a evolução de cada sessão para acompanhar o processo do paciente.'}
        action={!emptyFiltered ? <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={onNew}>Registrar sessão</Button> : undefined}
      />
    );
  }

  return (
    <ol className="relative space-y-3">
      {items.map(({ r, numero, humor, tema, resumo, intervencoes }) => (
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
                  {r.start_time && <span className="inline-flex items-center gap-1"><Clock size={11} /> {r.start_time}{r.end_time ? ` – ${r.end_time}` : ''}</span>}
                </p>
              </button>
              <div className="flex shrink-0 flex-wrap items-center gap-1">{renderActions(r)}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.appointment_type && <Badge color="default">{r.appointment_type}</Badge>}
              {humor && <Badge color={HUMOR_COLOR[humor] || 'default'} dot>Humor: {humor}</Badge>}
              <Badge color={STATUS_COLOR[r.status] || 'default'}>{r.status}</Badge>
            </div>
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
