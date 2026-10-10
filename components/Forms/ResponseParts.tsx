import React from 'react';
import { Badge } from '../UI';

export type AnswerEntry = { key: string; label: string; display: string; points: number; maxPossible: number };

/** Linha de resposta de uma pergunta (com pontuação opcional). */
export const AnswerRow: React.FC<AnswerEntry> = ({ label, display, points, maxPossible }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500 leading-tight break-words">{label}</p>
        <p className="mt-1 text-[13px] font-medium text-slate-800 leading-relaxed break-words">
          {display || <span className="text-slate-400 font-normal">Sem resposta</span>}
        </p>
      </div>
      {(points > 0 || maxPossible > 0) && (
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Pontuação</span>
          <Badge color={points > 0 ? 'primary' : 'default'} size="sm">{points} / {maxPossible}</Badge>
        </div>
      )}
    </div>
  </div>
);

/** Bloco de score + resultado de interpretação. */
export const ScoreBlock: React.FC<{ score: number; title: string; scoreLabel?: string; resultLabel?: string }> = ({
  score, title, scoreLabel = 'Score', resultLabel = 'Resultado',
}) => (
  <div className="flex items-center gap-4 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
    <div className="pr-4 border-r border-primary-100 shrink-0 text-center">
      <p className="text-[11px] text-slate-500">{scoreLabel}</p>
      <p className="text-base font-medium text-primary-700">{score}</p>
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500">{resultLabel}</p>
      <p className="text-[13px] font-medium text-slate-800 break-words">{title}</p>
    </div>
  </div>
);

/** Calcula pontos de uma resposta a partir das opções da pergunta. */
export function computePoints(rawOptions: any, value: unknown): { points: number; maxPossible: number } {
  let points = 0;
  let possiblePoints: number[] = [];
  if (rawOptions) {
    const opts = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
    if (Array.isArray(opts)) {
      possiblePoints = opts.map((o: any) => o.value || 0);
      if (Array.isArray(value)) {
        points = value.reduce((sum: number, val: any) => {
          const opt = opts.find((o: any) => o.label === val);
          return sum + (opt?.value || 0);
        }, 0);
      } else {
        const opt = opts.find((o: any) => o.label === value);
        points = opt?.value || 0;
      }
    }
  }
  return { points, maxPossible: possiblePoints.length > 0 ? Math.max(...possiblePoints) : 0 };
}
