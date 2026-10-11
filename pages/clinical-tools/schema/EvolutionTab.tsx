import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { PanelCard } from '../../../components/UI/PanelCard';
import { Select } from '../../../components/UI/Input';
import { Alert } from '../../../components/UI/Alert';
import { EmptyState } from '../../../components/UI/EmptyState';
import { Badge } from '../../../components/UI/Badge';
import { CREDITS, INSTRUMENTS, SCREENING_NOTE, YSQ_CUTOFF, type InstrumentId } from './instruments';
import { fmt, scoreInstrument, type ScaleScore } from './scoring';
import type { PatientInventories, SchemaApplication } from './api';
import { appDate, fmtDay } from './common';

const EVOLUTION_IDS: InstrumentId[] = ['ysq', 'yami', 'yci', 'yrai'];
const MAX_COLS = 8;

const Sparkline: React.FC<{ values: (number | null)[]; label: string }> = ({ values, label }) => {
  const w = 90; const h = 24; const pts = values.map((v, i) => (v === null ? null : [values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 6) + 3, h - 3 - ((v - 1) / 5) * (h - 6)] as const));
  const path = pts.filter(Boolean).map(p => p!.join(',')).join(' ');
  return (
    <svg width={w} height={h} role="img" aria-label={label} className="block">
      <polyline points={path} className="fill-none stroke-primary-600" strokeWidth={1.5} />
      {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={2} className="fill-primary-600" />)}
    </svg>
  );
};

interface Props { inv: PatientInventories | null; onGoInventories: () => void }

export const EvolutionTab: React.FC<Props> = ({ inv, onGoInventories }) => {
  const [id, setId] = useState<InstrumentId>('ysq');
  const inst = INSTRUMENTS[id];

  const done: SchemaApplication[] = useMemo(
    () => (inv?.applications || []).filter(a => a.instrument_id === id && a.status === 'completed')
      .sort((a, b) => new Date(appDate(a)).getTime() - new Date(appDate(b)).getTime()).slice(-MAX_COLS),
    [inv, id],
  );
  const scores = useMemo(() => done.map(a => scoreInstrument(id, a.answers) as ScaleScore), [done, id]);
  const rows = inst.subscales.map((s, i) => ({ s, values: scores.map(sc => sc.subscales[i]?.mean ?? null) }));

  return (
    <div className="space-y-3">
      <PanelCard title="Evolução ao longo do tempo" description="Compara as aplicações concluídas do mesmo inventário (médias de 1 a 6)." icon={TrendingUp}
        action={<Select aria-label="Inventário" wrapperClassName="w-44" value={id} onChange={e => setId(e.target.value as InstrumentId)}>{EVOLUTION_IDS.map(i => <option key={i} value={i}>{INSTRUMENTS[i].name}</option>)}</Select>}>
        {done.length < 2 ? (
          <EmptyState icon={TrendingUp} title={done.length === 0 ? `Nenhuma aplicação concluída de ${inst.name}` : 'Só há uma aplicação concluída'}
            description="A evolução aparece a partir de duas aplicações concluídas do mesmo inventário, em datas diferentes."
            action={<button type="button" onClick={onGoInventories} className="text-xs font-medium text-primary-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">Ir para Inventários</button>} />
        ) : (
          <div className="space-y-3">
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-slate-200 px-2 py-1.5 text-left text-[11px] font-medium text-slate-500">{id === 'ysq' ? 'Esquema' : id === 'yami' ? 'Modo' : 'Média geral'}</th>
                    {done.map(a => <th key={a.id} scope="col" className="border-b border-slate-200 px-2 py-1.5 text-right text-[11px] font-medium text-slate-500">{fmtDay(appDate(a))}</th>)}
                    <th scope="col" className="border-b border-slate-200 px-2 py-1.5 text-right text-[11px] font-medium text-slate-500">Variação</th>
                    <th scope="col" className="border-b border-slate-200 px-2 py-1.5 text-left text-[11px] font-medium text-slate-500">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ s, values }) => {
                    const first = values.find(v => v !== null) ?? null; const last = [...values].reverse().find(v => v !== null) ?? null;
                    const delta = first !== null && last !== null ? last - first : null;
                    return (
                      <tr key={s.id}>
                        <td className="border-b border-slate-100 px-2 py-1.5 font-medium text-slate-800">{s.name}</td>
                        {values.map((v, i) => (
                          <td key={i} className={`border-b border-slate-100 px-2 py-1.5 text-right tabular-nums ${id === 'ysq' && v !== null && v >= YSQ_CUTOFF ? 'bg-amber-50 font-medium text-amber-800' : 'text-slate-700'}`}>{fmt(v)}</td>
                        ))}
                        <td className={`border-b border-slate-100 px-2 py-1.5 text-right tabular-nums ${delta === null ? 'text-slate-400' : delta > 0.005 ? 'text-amber-700' : delta < -0.005 ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {delta === null ? '-' : `${delta > 0 ? '+' : ''}${fmt(delta)}`}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-1.5"><Sparkline values={values} label={`Tendência de ${s.name}`} /></td>
                      </tr>
                    );
                  })}
                  {id === 'ysq' && (
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-slate-800">Esquemas ativados</td>
                      {scores.map((sc, i) => <td key={i} className="px-2 py-1.5 text-right"><Badge color={sc.activatedIds.length ? 'warning' : 'default'} size="sm">{sc.activatedIds.length}</Badge></td>)}
                      <td colSpan={2} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">Variação = última aplicação menos a primeira exibida. Para esquemas e modos, queda tende a indicar menor intensidade; interprete sempre no contexto clínico.{id === 'ysq' ? ` Células em âmbar: média >= ${fmt(YSQ_CUTOFF, 1)} (ATIVADO).` : ''}</p>
          </div>
        )}
      </PanelCard>
      <Alert variant="info">{SCREENING_NOTE}</Alert>
      <p className="text-[11px] text-slate-500">{CREDITS}</p>
    </div>
  );
};
