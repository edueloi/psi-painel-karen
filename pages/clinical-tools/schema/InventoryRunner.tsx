import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, ListChecks, Info } from 'lucide-react';
import { Button } from '../../../components/UI/Button';
import { Input, Textarea } from '../../../components/UI/Input';
import { Switch } from '../../../components/UI/Switch';
import { INSTRUMENTS, RNE_FIGURES, RNE_PERSONS, domainById, type Instrument, type InstrumentId } from './instruments';
import { answerKey, firstUnansweredIndex, getProgress, isItemAnswered, parentNA, type Answers, type FigureId } from './scoring';
import type { AnswerPatch } from './api';

interface RunnerProps {
  instrumentId: InstrumentId;
  answers: Answers;
  onAnswer: (patch: AnswerPatch) => void;
  readOnly?: boolean;
  /** Bloco inicial; por padrão, o primeiro bloco com item sem resposta (retomar de onde parou). */
  initialBlock?: number;
  onBlockChange?: (block: number) => void;
  /** Ação do último bloco (ex.: concluir). */
  onFinish?: () => void;
  finishLabel?: string;
  finishLoading?: boolean;
  footerExtra?: React.ReactNode;
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500';

/** Linha de botões 1..6 acessível (radiogroup). */
const ScaleButtons: React.FC<{
  inst: Instrument; value: number | null; label: string; disabled?: boolean; onPick: (v: number | null) => void; compactLabel?: boolean;
}> = ({ inst, value, label, disabled, onPick }) => (
  <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1.5">
    {inst.scale.map(opt => {
      const on = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={on}
          aria-label={`${opt.value} - ${opt.label}`}
          title={opt.label}
          disabled={disabled}
          onClick={() => onPick(on ? null : opt.value)}
          className={`min-h-[44px] rounded-lg border text-sm font-medium transition-colors ${focusRing} disabled:cursor-not-allowed disabled:opacity-60 ${
            on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-primary-400 hover:bg-primary-50 active:bg-primary-100'
          }`}
        >
          {opt.value}
        </button>
      );
    })}
  </div>
);

const ScaleHint: React.FC<{ inst: Instrument; value: number | null }> = ({ inst, value }) => {
  const sel = value !== null ? inst.scale.find(s => s.value === value) : null;
  if (sel) return <p className="mt-1.5 text-[11px] font-medium text-primary-700">{sel.value} - {sel.label}</p>;
  const first = inst.scale[0]; const last = inst.scale[inst.scale.length - 1];
  return (
    <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-slate-500">
      <span className="min-w-0">1 - {first.label}</span>
      <span className="min-w-0 text-right">{last.value} - {last.label}</span>
    </div>
  );
};

export const InventoryRunner: React.FC<RunnerProps> = ({
  instrumentId, answers, onAnswer, readOnly, initialBlock, onBlockChange, onFinish, finishLabel = 'Revisar e concluir', finishLoading, footerExtra,
}) => {
  const inst = INSTRUMENTS[instrumentId];
  const blockCount = Math.max(1, Math.ceil(inst.items.length / inst.blockSize));
  const startBlock = () => {
    if (initialBlock !== undefined) return Math.min(blockCount - 1, Math.max(0, initialBlock));
    const idx = firstUnansweredIndex(instrumentId, answers);
    return idx === null ? 0 : Math.floor(idx / inst.blockSize);
  };
  const [block, setBlock] = useState<number>(startBlock);
  const topRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // troca de instrumento: recomeça do ponto em que parou
  useEffect(() => { setBlock(startBlock()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [instrumentId]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    onBlockChange?.(block);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block]);

  const from = block * inst.blockSize;
  const items = inst.items.slice(from, from + inst.blockSize);
  const progress = getProgress(instrumentId, answers);
  const pct = Math.round(progress.progress * 100);

  const blockState = useMemo(() => Array.from({ length: blockCount }, (_, b) => {
    const its = inst.items.slice(b * inst.blockSize, (b + 1) * inst.blockSize);
    const done = its.filter(it => isItemAnswered(instrumentId, answers, it.n)).length;
    return done === its.length ? 'done' : done > 0 ? 'partial' : 'empty';
  }), [answers, blockCount, inst, instrumentId]);

  const pendingInBlock = items.filter(it => !isItemAnswered(instrumentId, answers, it.n)).length;
  const isLast = block === blockCount - 1;
  const nextPending = firstUnansweredIndex(instrumentId, answers);
  const goTo = (b: number) => setBlock(Math.min(blockCount - 1, Math.max(0, b)));
  const pick = (key: string, v: number | null) => { if (!readOnly) onAnswer({ [key]: v }); };

  return (
    <div className="min-w-0 space-y-3">
      <div ref={topRef} className="scroll-mt-2" />
      {/* progresso */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-700">{progress.answered} de {progress.total} {inst.responseType === 'needs' ? 'necessidades' : 'respostas'}</span>
          <span className="font-medium text-primary-700">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Progresso do inventário ${inst.name}`}>
          <div className="h-full rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Blocos de itens">
          {blockState.map((s, b) => (
            <button
              key={b}
              type="button"
              onClick={() => goTo(b)}
              aria-label={`Bloco ${b + 1} de ${blockCount}${s === 'done' ? ', completo' : s === 'partial' ? ', parcial' : ''}`}
              aria-current={b === block ? 'step' : undefined}
              className={`h-8 min-w-[32px] shrink-0 rounded-md border px-1.5 text-[11px] font-medium transition-colors ${focusRing} ${
                b === block ? 'border-primary-600 bg-primary-600 text-white'
                  : s === 'done' ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : s === 'partial' ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {b + 1}
            </button>
          ))}
        </div>
      </div>

      {/* escala (referência) */}
      {inst.responseType !== 'needs' && (
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <summary className={`cursor-pointer select-none font-medium text-slate-700 ${focusRing}`}>
            {inst.questionPrompt ? `${inst.questionPrompt} - ver escala` : 'Ver escala de respostas'}
          </summary>
          <ul className="mt-2 space-y-1">
            {inst.scale.map(s => <li key={s.value}><span className="font-medium text-slate-800">{s.value}.</span> {s.description}</li>)}
          </ul>
        </details>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Itens {from + 1} a {from + items.length} de {inst.items.length}{inst.period ? ` - ${inst.period}` : ''}</span>
        {pendingInBlock > 0 ? <span className="text-amber-700">{pendingInBlock} sem resposta neste bloco</span> : <span className="inline-flex items-center gap-1 text-primary-700"><CheckCircle2 size={13} /> Bloco completo</span>}
      </div>

      {/* YPI: figuras que não existiram */}
      {inst.responseType === 'parents' && (
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
          <Switch checked={parentNA(answers, 'm')} disabled={readOnly} onCheckedChange={c => onAnswer({ [answerKey.parentNA('m')]: c ? 1 : null })} label="Não tive mãe (ou figura materna)" />
          <Switch checked={parentNA(answers, 'p')} disabled={readOnly} onCheckedChange={c => onAnswer({ [answerKey.parentNA('p')]: c ? 1 : null })} label="Não tive pai (ou figura paterna)" />
        </div>
      )}

      {/* RNE: pessoas significativas */}
      {inst.responseType === 'needs' && block === 0 && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <h3 className="text-sm font-medium text-slate-800">Imagem mental - processo de avaliação</h3>
            <p className="text-[11px] text-slate-500">Opcional: registre até três pessoas significativas e a síntese da cena.</p>
          </div>
          {RNE_PERSONS.map(k => (
            <div key={k} className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_140px]">
              <Input label={`Pessoa significativa 0${k}`} value={String(answers[answerKey.person(k, 'name')] ?? '')} disabled={readOnly} maxLength={120}
                onChange={e => onAnswer({ [answerKey.person(k, 'name')]: e.target.value })} />
              <Input label="Idade aproximada" value={String(answers[answerKey.person(k, 'age')] ?? '')} disabled={readOnly} maxLength={20}
                onChange={e => onAnswer({ [answerKey.person(k, 'age')]: e.target.value })} />
              <div className="sm:col-span-2">
                <Textarea label="Síntese da cena" rows={2} value={String(answers[answerKey.person(k, 'scene')] ?? '')} disabled={readOnly} maxLength={2000}
                  onChange={e => onAnswer({ [answerKey.person(k, 'scene')]: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* itens */}
      <ol className="space-y-2.5" aria-label={`Itens ${from + 1} a ${from + items.length}`}>
        {items.map(it => {
          const done = isItemAnswered(instrumentId, answers, it.n);
          return (
            <li key={it.n} className={`rounded-lg border bg-white p-3 transition-colors ${done ? 'border-primary-200' : 'border-slate-200'}`}>
              <div className="mb-2.5 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-[11px] font-medium text-slate-600">{it.n}</span>
                <div className="min-w-0 flex-1">
                  {inst.responseType === 'needs' && (
                    <p className="mb-0.5 text-[11px] text-slate-500">{domainById(it.domainId || '')?.name}{it.needLabel ? ` - necessidade: ${it.needLabel}` : ''}</p>
                  )}
                  <p className="text-[13px] leading-snug text-slate-800">{it.text}</p>
                </div>
              </div>

              {inst.responseType === 'scale' && (() => {
                const v = answers[answerKey.scale(it.n)];
                const value = typeof v === 'number' ? v : v ? Number(v) : null;
                return (
                  <>
                    <ScaleButtons inst={inst} value={value} label={`Resposta do item ${it.n}`} disabled={readOnly} onPick={val => pick(answerKey.scale(it.n), val)} />
                    <ScaleHint inst={inst} value={value} />
                  </>
                );
              })()}

              {inst.responseType === 'parents' && (
                <div className="space-y-2">
                  {([['m', 'Mãe'], ['p', 'Pai']] as const).map(([side, name]) => {
                    const na = parentNA(answers, side);
                    const v = answers[answerKey.parent(side, it.n)];
                    const value = typeof v === 'number' ? v : v ? Number(v) : null;
                    return (
                      <div key={side} className="grid grid-cols-[48px_1fr] items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">{name}</span>
                        {na ? <span className="text-[11px] text-slate-400">Não se aplica</span> : (
                          <div>
                            <ScaleButtons inst={inst} value={value} label={`${name} - resposta do item ${it.n}`} disabled={readOnly} onPick={val => pick(answerKey.parent(side, it.n), val)} />
                            {value !== null && <p className="mt-1 text-[11px] font-medium text-primary-700">{value} - {inst.scale.find(s => s.value === value)?.label}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!parentNA(answers, 'm') && !parentNA(answers, 'p') && (
                    <p className="text-[11px] text-slate-500">1 - {inst.scale[0].label} ... 6 - {inst.scale[5].label}</p>
                  )}
                </div>
              )}

              {inst.responseType === 'needs' && (
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Figuras em cujo ambiente a necessidade ${it.n} não foi atendida`}>
                  {RNE_FIGURES.map(f => {
                    const on = Number(answers[answerKey.need(it.n, f.id as FigureId)]) === 1;
                    return (
                      <button key={f.id} type="button" aria-pressed={on} disabled={readOnly}
                        onClick={() => !readOnly && onAnswer({ [answerKey.need(it.n, f.id as FigureId)]: on ? null : 1, ...(on ? {} : { [answerKey.needNone(it.n)]: null }) })}
                        className={`min-h-[40px] rounded-lg border px-3 text-xs font-medium transition-colors ${focusRing} disabled:opacity-60 ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-primary-400 hover:bg-primary-50'}`}>
                        {f.label}
                      </button>
                    );
                  })}
                  {(() => {
                    const on = Number(answers[answerKey.needNone(it.n)]) === 1;
                    return (
                      <button type="button" aria-pressed={on} disabled={readOnly}
                        onClick={() => {
                          if (readOnly) return;
                          const patch: AnswerPatch = { [answerKey.needNone(it.n)]: on ? null : 1 };
                          if (!on) RNE_FIGURES.forEach(f => { patch[answerKey.need(it.n, f.id as FigureId)] = null; });
                          onAnswer(patch);
                        }}
                        className={`min-h-[40px] rounded-lg border px-3 text-xs font-medium transition-colors ${focusRing} disabled:opacity-60 ${on ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                        Nenhuma / não se aplica
                      </button>
                    );
                  })()}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* navegação */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variant="outline" size="md" iconLeft={<ChevronLeft size={14} />} disabled={block === 0} onClick={() => goTo(block - 1)}>Anterior</Button>
        <div className="flex flex-wrap items-center gap-2">
          {footerExtra}
          {nextPending !== null && Math.floor(nextPending / inst.blockSize) !== block && (
            <Button variant="ghost" size="md" iconLeft={<ListChecks size={14} />} onClick={() => goTo(Math.floor(nextPending / inst.blockSize))}>Ir ao primeiro sem resposta</Button>
          )}
          {!isLast ? (
            <Button variant="primary" size="md" iconRight={<ChevronRight size={14} />} onClick={() => goTo(block + 1)}>Próximo bloco</Button>
          ) : onFinish ? (
            <Button variant="primary" size="md" iconLeft={<CheckCircle2 size={14} />} onClick={onFinish} loading={finishLoading}>{finishLabel}</Button>
          ) : null}
        </div>
      </div>
      {isLast && pendingInBlock === 0 && progress.answered < progress.total && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700"><Info size={13} /> Ainda há itens sem resposta em outros blocos.</p>
      )}
    </div>
  );
};
