import React from 'react';
import { History, Target } from 'lucide-react';
import { FollowupsEditor, type FollowupRow } from './StructuredForm';

export interface PreviousSession {
  /** Número e data (dd/mm/aaaa) da sessão anterior. */
  numero?: string;
  data: string;
  proxima: string;
  tarefas: string[];
}

/** Cartão "Pendências da última sessão": plano para hoje + retorno rápido por tarefa. */
export const PendingCard: React.FC<{
  previous: PreviousSession | null;
  rows: FollowupRow[];
  onChange: (rows: FollowupRow[]) => void;
}> = ({ previous, rows, onChange }) => {
  if (!previous || (!previous.proxima && previous.tarefas.length === 0 && rows.length === 0)) return null;
  return (
    <section className="space-y-3 rounded-lg border border-primary-100 bg-primary-50/40 p-3" aria-label="Pendências da última sessão">
      <h4 className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
        <History size={14} className="text-primary-600" />
        Pendências da última sessão
        <span className="text-[11px] font-normal text-slate-500">{previous.numero ? `Sessão ${previous.numero} · ` : ''}{previous.data}</span>
      </h4>
      {previous.proxima && (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5">
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Target size={11} /> Plano combinado para esta sessão</p>
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{previous.proxima}</p>
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-slate-500">Retorno das tarefas combinadas</p>
        <FollowupsEditor rows={rows} onChange={onChange} emptyHint="A sessão anterior não registrou tarefas." />
      </div>
    </section>
  );
};
