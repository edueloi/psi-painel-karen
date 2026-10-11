import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Gauge, ListChecks, Target } from 'lucide-react';
import { PanelCard } from '../../../components/UI/PanelCard';
import { StatCard } from '../../../components/UI/StatCard';
import { StatGrid } from '../../../components/UI/PageWrapper';
import { Badge } from '../../../components/UI/Badge';
import { Alert } from '../../../components/UI/Alert';
import { FilterLineSegmented } from '../../../components/UI/FilterLine';
import {
  CREDITS, DOMAINS, INSTRUMENTS, MODE_GROUP_LABEL, RNE_FIGURES, SCREENING_NOTE, YSQ_CUTOFF,
  domainById, type InstrumentId, type ModeGroup,
} from './instruments';
import {
  buildGeneral, fmt, pct, scoreInstrument, SITUATION_ACTIVE, SITUATION_INACTIVE, YSQ_RULE_TEXT,
  type Answers, type NeedsScore, type ParentsScore, type ScaleScore, type SubscaleScore,
} from './scoring';

/* ───────────── Peças visuais ───────────── */
const CUT_PCT = (YSQ_CUTOFF / 6) * 100;

/** Barra horizontal 0-6 com linha de corte opcional. Valor nulo = ainda não calculado. */
export const MeanBar: React.FC<{ value: number | null; partial?: number | null; activated?: boolean; cutoff?: boolean; label: string }> = ({ value, partial, activated, cutoff, label }) => {
  const shown = value ?? partial ?? null;
  return (
    <div className="relative h-3 w-full rounded-full bg-slate-100" role="img" aria-label={`${label}: ${value === null ? (partial !== null && partial !== undefined ? `parcial ${fmt(partial)}` : 'sem resposta') : fmt(value)} de 6`}>
      {shown !== null && (
        <div className={`absolute left-0 top-0 h-full rounded-full ${activated ? 'bg-amber-500' : value === null ? 'bg-slate-300' : 'bg-primary-500'}`} style={{ width: `${Math.max(2, (shown / 6) * 100)}%` }} />
      )}
      {cutoff && <div className="absolute -top-0.5 h-4 w-px border-l border-dashed border-slate-700" style={{ left: `${CUT_PCT}%` }} aria-hidden="true" />}
    </div>
  );
};

const ScaleAxis: React.FC<{ cutoff?: boolean }> = () => (
  <div className="relative mt-1 h-4 text-[10px] text-slate-500" aria-hidden="true">
    {[1, 2, 3, 4, 5, 6].map(v => <span key={v} className="absolute -translate-x-1/2" style={{ left: `${(v / 6) * 100}%` }}>{v}</span>)}
  </div>
);

const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0"><table className="w-full min-w-[420px] border-collapse text-xs">{children}</table></div>
);
const Th: React.FC<{ children?: React.ReactNode; right?: boolean; className?: string }> = ({ children, right, className }) => (
  <th scope="col" className={`border-b border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-500 ${right ? 'text-right' : 'text-left'} ${className || ''}`}>{children}</th>
);
const Td: React.FC<{ children?: React.ReactNode; right?: boolean; className?: string }> = ({ children, right, className }) => (
  <td className={`border-b border-slate-100 px-2 py-1.5 align-middle text-slate-700 ${right ? 'text-right tabular-nums' : ''} ${className || ''}`}>{children}</td>
);

export const SituationBadge: React.FC<{ s: SubscaleScore }> = ({ s }) =>
  !s.complete ? <Badge color="default" size="sm">Incompleto</Badge>
    : s.activated ? <Badge color="warning" size="sm" icon={<AlertTriangle size={10} />}>{SITUATION_ACTIVE}</Badge>
      : <span className="text-[11px] text-slate-500">{SITUATION_INACTIVE}</span>;

const ProgressNotice: React.FC<{ answered: number; total: number; complete: boolean }> = ({ answered, total, complete }) =>
  complete ? null : (
    <Alert variant="warning" title="Resultado parcial">
      {answered} de {total} respostas. Médias oficiais e situação só aparecem quando todos os itens da subescala foram respondidos; enquanto isso é exibida a média dos itens já respondidos.
    </Alert>
  );

const Disclaimer: React.FC = () => (
  <p className="text-[11px] leading-relaxed text-slate-500">{SCREENING_NOTE} {CREDITS}</p>
);

/* ───────────── Radar (18 esquemas) ───────────── */
const SchemaRadar: React.FC<{ subs: SubscaleScore[] }> = ({ subs }) => {
  const size = 320; const c = size / 2; const R = 112;
  const n = subs.length;
  const pt = (i: number, v: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * (v / 6) * R, c + Math.sin(a) * (v / 6) * R] as const; };
  const poly = subs.map((s, i) => pt(i, s.mean ?? s.partialMean ?? 0).join(',')).join(' ');
  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[360px]" role="img" aria-label="Radar das médias dos 18 esquemas, com anel de corte em 3,5">
        {[1, 2, 3, 4, 5, 6].map(v => <circle key={v} cx={c} cy={c} r={(v / 6) * R} className="fill-none stroke-slate-200" strokeWidth={1} />)}
        <circle cx={c} cy={c} r={(YSQ_CUTOFF / 6) * R} className="fill-none stroke-slate-700" strokeWidth={1} strokeDasharray="4 3" />
        {subs.map((_, i) => { const [x, y] = pt(i, 6); return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-slate-200" strokeWidth={1} />; })}
        <polygon points={poly} className="fill-primary-600 stroke-primary-600" style={{ fillOpacity: 0.18 }} strokeWidth={1.5} />
        {subs.map((s, i) => { const [x, y] = pt(i, s.mean ?? s.partialMean ?? 0); return <circle key={s.id} cx={x} cy={y} r={3.5} className={s.activated ? 'fill-amber-500' : 'fill-primary-600'}><title>{`${s.name}: ${fmt(s.mean ?? s.partialMean)}`}</title></circle>; })}
        {subs.map((s, i) => { const [x, y] = pt(i, 6.9); return <text key={s.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600" fontSize={10}>{i + 1}</text>; })}
      </svg>
      <ol className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-[11px] text-slate-600 sm:grid-cols-2">
        {subs.map((s, i) => <li key={s.id}><span className="font-medium text-slate-800">{i + 1}.</span> {s.name} <span className="text-slate-500">({fmt(s.mean ?? s.partialMean)})</span></li>)}
      </ol>
      <p className="text-center text-[11px] text-slate-500">Anel tracejado = corte {fmt(YSQ_CUTOFF, 1)}. Pontos em âmbar = esquema ATIVADO.</p>
    </div>
  );
};

/* ───────────── YSQ ───────────── */
export const YsqResult: React.FC<{ score: ScaleScore }> = ({ score }) => {
  const [view, setView] = useState<'bars' | 'radar'>('bars');
  const subs = score.subscales;
  const top = [...subs].filter(s => s.mean !== null).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];
  return (
    <div className="space-y-3">
      <ProgressNotice {...score.progress} />
      <StatGrid cols={4}>
        <StatCard title="Respostas" value={`${score.progress.answered}/${score.progress.total}`} icon={ListChecks} description={`${pct(score.progress)}% concluído`} />
        <StatCard title="Esquemas ativados" value={`${score.activatedIds.length} de ${subs.length}`} icon={AlertTriangle} color="warning" description={`Média >= ${fmt(YSQ_CUTOFF, 1)}`} />
        <StatCard title="Maior média" value={top ? fmt(top.mean) : '-'} icon={Gauge} description={top?.name} />
        <StatCard title="Corte (planilha)" value={fmt(YSQ_CUTOFF, 1)} icon={Target} description="Rastreio, não é diagnóstico" />
      </StatGrid>

      <PanelCard title="Médias por esquema" description="Esquemas agrupados por domínio, conforme a aba Resultado GERAL da planilha." icon={BarChart3}
        action={<FilterLineSegmented value={view} onChange={v => setView(v as 'bars' | 'radar')} size="sm" options={[{ value: 'bars', label: 'Barras' }, { value: 'radar', label: 'Radar' }]} />}>
        {view === 'radar' ? <SchemaRadar subs={subs} /> : (
          <div className="space-y-4">
            {DOMAINS.map(d => {
              const rows = subs.filter(s => s.domainId === d.id);
              return (
                <section key={d.id} aria-label={d.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-slate-700">{d.name}</h4>
                    <span className="text-[11px] text-slate-500">{rows.filter(r => r.activated).length} ativado(s)</span>
                  </div>
                  <ul className="space-y-2">
                    {rows.map(s => (
                      <li key={s.id} className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[200px_1fr_90px]">
                        <span className={`text-xs ${s.activated ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{s.name}</span>
                        <MeanBar value={s.mean} partial={s.partialMean} activated={s.activated} cutoff label={s.name} />
                        <span className="flex items-center justify-between gap-2 sm:justify-end">
                          <span className="text-xs font-medium tabular-nums text-slate-800">{fmt(s.mean ?? s.partialMean)}</span>
                          {s.activated && <Badge color="warning" size="sm">{SITUATION_ACTIVE}</Badge>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <div>
              <ScaleAxis cutoff />
              <p className="text-[11px] text-slate-500">Linha tracejada = corte {fmt(YSQ_CUTOFF, 1)} (média 1 a 6). Agrupamento por domínio conforme a planilha de referência.</p>
            </div>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Pontuação por esquema" description={YSQ_RULE_TEXT} icon={ListChecks}>
        <TableWrap>
          <thead><tr><Th>Esquema</Th><Th>Domínio</Th><Th right>Itens</Th><Th right>Total</Th><Th right>Média</Th><Th>Situação</Th></tr></thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} className={s.activated ? 'bg-amber-50/60' : ''}>
                <Td className="font-medium text-slate-800">{s.name}</Td>
                <Td>{domainById(s.domainId || '')?.name}</Td>
                <Td right>{s.answered}/{s.itemCount}</Td>
                <Td right>{s.complete ? s.sum : '-'}</Td>
                <Td right>{s.complete ? fmt(s.mean) : fmt(s.partialMean) + '*'}</Td>
                <Td><SituationBadge s={s} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="mt-2 text-[11px] text-slate-500">* Média parcial (apenas itens respondidos). Itens de cada esquema: i, i+18, i+36, i+54 e i+72.</p>
      </PanelCard>
      <Disclaimer />
    </div>
  );
};

/* ───────────── Estilos parentais ───────────── */
export const ParentsResult: React.FC<{ score: ParentsScore }> = ({ score }) => {
  const rows = INSTRUMENTS.ypi.subscales.map((s, i) => ({ s, m: score.mother.subscales[i], p: score.father.subscales[i] }));
  const sorted = (side: 'm' | 'p') => [...rows].filter(r => (side === 'm' ? r.m.mean : r.p.mean) !== null).sort((a, b) => ((side === 'm' ? b.m.mean : b.p.mean) ?? 0) - ((side === 'm' ? a.m.mean : a.p.mean) ?? 0))[0];
  const tm = sorted('m'); const tp = sorted('p');
  return (
    <div className="space-y-3">
      <ProgressNotice {...score.progress} />
      <StatGrid cols={4}>
        <StatCard title="Respostas" value={`${score.progress.answered}/${score.progress.total}`} icon={ListChecks} description={`${pct(score.progress)}% concluído`} />
        <StatCard title="Mãe" value={score.mother.na ? 'Não se aplica' : tm ? fmt(tm.m.mean) : '-'} icon={Activity} description={score.mother.na ? undefined : tm?.s.name} />
        <StatCard title="Pai" value={score.father.na ? 'Não se aplica' : tp ? fmt(tp.p.mean) : '-'} icon={Activity} description={score.father.na ? undefined : tp?.s.name} />
        <StatCard title="Escala" value="1 a 6" icon={Gauge} description="Média por esquema" />
      </StatGrid>
      <PanelCard title="Estilos parentais por esquema" description="Média dos itens (soma / nº de itens do esquema), para mãe e pai." icon={BarChart3}>
        <ul className="space-y-3">
          {rows.map(({ s, m, p }) => (
            <li key={s.id} className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[220px_1fr]">
              <span className="text-xs text-slate-700">{s.name} <span className="text-slate-400">({s.items.length} itens)</span></span>
              <div className="space-y-1">
                {([['Mãe', m, score.mother.na], ['Pai', p, score.father.na]] as const).map(([lab, v, na]) => (
                  <div key={lab} className="grid grid-cols-[34px_1fr_44px] items-center gap-2">
                    <span className="text-[11px] text-slate-500">{lab}</span>
                    {na ? <span className="text-[11px] text-slate-400">Não se aplica</span> : <MeanBar value={v.mean} partial={v.partialMean} label={`${lab} - ${s.name}`} />}
                    <span className="text-right text-xs font-medium tabular-nums text-slate-800">{na ? '' : fmt(v.mean ?? v.partialMean)}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <ScaleAxis />
        <p className="text-[11px] text-slate-500">Os Estilos Parentais não têm ponto de corte na planilha: use as médias como apoio à compreensão da história de desenvolvimento.</p>
      </PanelCard>
      <Disclaimer />
    </div>
  );
};

/* ───────────── YAMI ───────────── */
export const ModesResult: React.FC<{ score: ScaleScore }> = ({ score }) => {
  const groups = (['child', 'parent', 'coping', 'healthy'] as ModeGroup[]).map(g => ({ g, rows: score.subscales.filter(s => s.group === g) })).filter(x => x.rows.length);
  const top = [...score.subscales].filter(s => s.mean !== null).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];
  return (
    <div className="space-y-3">
      <ProgressNotice {...score.progress} />
      <StatGrid cols={3}>
        <StatCard title="Respostas" value={`${score.progress.answered}/${score.progress.total}`} icon={ListChecks} description={`${pct(score.progress)}% concluído`} />
        <StatCard title="Modo mais frequente" value={top ? fmt(top.mean) : '-'} icon={Gauge} description={top?.name} />
        <StatCard title="Escala" value="1 a 6" icon={Activity} description="Frequência no último mês" />
      </StatGrid>
      <PanelCard title="Modos esquemáticos (YAMI)" description="Frequência = média dos itens do modo (1 = nunca ou quase nunca; 6 = quase o tempo todo)." icon={BarChart3}>
        <div className="space-y-4">
          {groups.map(({ g, rows }) => (
            <section key={g} aria-label={MODE_GROUP_LABEL[g]}>
              <h4 className="mb-1.5 text-xs font-medium text-slate-700">{MODE_GROUP_LABEL[g]} <span className="text-[11px] font-normal text-slate-400">(agrupamento teórico)</span></h4>
              <ul className="space-y-2">
                {rows.map(s => (
                  <li key={s.id} className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[180px_1fr_52px]">
                    <span className="text-xs text-slate-700">{s.name} <span className="text-slate-400">({s.itemCount})</span></span>
                    <MeanBar value={s.mean} partial={s.partialMean} label={s.name} />
                    <span className="text-xs font-medium tabular-nums text-slate-800 sm:text-right">{fmt(s.mean ?? s.partialMean)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <ScaleAxis />
        <p className="text-[11px] text-slate-500">O YAMI não tem ponto de corte na planilha; os modos são apoio à conceituação do caso.</p>
      </PanelCard>
      <Disclaimer />
    </div>
  );
};

/* ───────────── YCI / YRAI ───────────── */
export const MeanResult: React.FC<{ score: ScaleScore; answers: Answers }> = ({ score, answers }) => {
  const inst = INSTRUMENTS[score.instrumentId];
  const o = score.overall;
  const high = inst.items.filter(it => Number(answers[String(it.n)]) >= 5).slice(0, 10);
  const what = score.instrumentId === 'yci' ? 'estilo de hipercompensação' : 'estilo de evitação';
  return (
    <div className="space-y-3">
      <ProgressNotice {...score.progress} />
      <StatGrid cols={3}>
        <StatCard title="Respostas" value={`${score.progress.answered}/${score.progress.total}`} icon={ListChecks} description={`${pct(score.progress)}% concluído`} />
        <StatCard title="Média geral" value={fmt(o?.mean)} icon={Gauge} description={`Soma / ${inst.itemCount} itens`} />
        <StatCard title="Soma" value={o && o.answered > 0 ? o.sum : '-'} icon={Activity} description={`${o?.answered ?? 0} itens respondidos`} />
      </StatGrid>
      <PanelCard title={`${inst.name} - média geral`} description={`Média de todos os ${inst.itemCount} itens (${what}); escala de 1 a 6.`} icon={BarChart3}>
        <div className="space-y-1">
          <MeanBar value={o?.mean ?? null} partial={o?.partialMean} label={`${inst.name} média geral`} />
          <ScaleAxis />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Sem ponto de corte na planilha: a média indica a intensidade geral do estilo e serve como apoio à avaliação do profissional.</p>
      </PanelCard>
      {high.length > 0 && (
        <PanelCard title="Itens com resposta alta (5 ou 6)" icon={ListChecks}>
          <ul className="space-y-1 text-xs text-slate-700">
            {high.map(it => <li key={it.n}><span className="font-medium text-slate-800">{it.n}.</span> {it.text} <Badge color="default" size="sm">{String(answers[String(it.n)])}</Badge></li>)}
          </ul>
        </PanelCard>
      )}
      <Disclaimer />
    </div>
  );
};

/* ───────────── RNE ───────────── */
const Mark: React.FC<{ on: boolean }> = ({ on }) => on
  ? <span className="inline-flex items-center justify-center text-primary-700" aria-label="Marcado"><CheckCircle2 size={14} /></span>
  : <span className="text-slate-300" aria-label="Não marcado">-</span>;

export const NeedsResult: React.FC<{ score: NeedsScore }> = ({ score }) => (
  <div className="space-y-3">
    <ProgressNotice {...score.progress} />
    <StatGrid cols={4}>
      <StatCard title="Necessidades" value={`${score.progress.answered}/${score.progress.total}`} icon={ListChecks} description={`${pct(score.progress)}% revisadas`} />
      {RNE_FIGURES.map(f => <StatCard key={f.id} title={`Não atendidas - ${f.label}`} value={score.totals[f.id]} icon={Activity} description="necessidades marcadas" />)}
    </StatGrid>
    {score.persons.some(p => p.name || p.age || p.scene) && (
      <PanelCard title="Imagem mental - pessoas significativas" icon={ListChecks}>
        <ul className="space-y-2 text-xs text-slate-700">
          {score.persons.filter(p => p.name || p.age || p.scene).map(p => (
            <li key={p.k}><span className="font-medium text-slate-800">Pessoa 0{p.k}:</span> {p.name || '-'}{p.age ? ` (${p.age})` : ''}{p.scene ? <p className="mt-0.5 text-slate-600">{p.scene}</p> : null}</li>
          ))}
        </ul>
      </PanelCard>
    )}
    {DOMAINS.map(d => {
      const rows = score.rows.filter(r => r.domainId === d.id);
      return (
        <PanelCard key={d.id} title={`Domínio - ${d.name}`} icon={ListChecks}>
          <TableWrap>
            <thead><tr><Th>Necessidade emocional</Th><Th>Esquema associado</Th>{RNE_FIGURES.map(f => <Th key={f.id} right>{f.label}</Th>)}</tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.n} className={r.marks.mae || r.marks.pai || r.marks.ter ? 'bg-amber-50/50' : ''}>
                  <Td><span className="font-medium text-slate-800">{r.needLabel}</span><p className="text-[11px] text-slate-500">{r.text}</p></Td>
                  <Td>{r.schemaName}</Td>
                  {RNE_FIGURES.map(f => <Td key={f.id} right><Mark on={r.marks[f.id]} /></Td>)}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </PanelCard>
      );
    })}
    <Disclaimer />
  </div>
);

/* ───────────── Resultado GERAL ───────────── */
export const GeneralResultView: React.FC<{ all: Partial<Record<InstrumentId, Answers>> }> = ({ all }) => {
  const g = useMemo(() => buildGeneral(all), [all]);
  const modeGroups = (['child', 'parent', 'coping', 'healthy'] as ModeGroup[]).map(k => ({ k, rows: g.modes.filter(m => m.group === k) })).filter(x => x.rows.length);
  return (
    <div className="space-y-3">
      <StatGrid cols={4}>
        <StatCard title="Inventários" value={`${g.completed.length}/${Object.keys(INSTRUMENTS).length}`} icon={ListChecks} description={`${g.started.length} iniciados`} />
        <StatCard title="Esquemas ativados" value={g.activatedTotal} icon={AlertTriangle} color="warning" description={`YSQ, média >= ${fmt(YSQ_CUTOFF, 1)}`} />
        <StatCard title="YCI (média)" value={fmt(g.yci)} icon={Gauge} description="Hipercompensação" />
        <StatCard title="YRAI (média)" value={fmt(g.yrai)} icon={Gauge} description="Evitação" />
      </StatGrid>

      {DOMAINS.map(d => {
        const dom = g.domains.find(x => x.domain.id === d.id)!;
        return (
          <PanelCard key={d.id} title={`Domínio - ${d.name}`} description={`${dom.activatedCount} esquema(s) ativado(s)`} icon={BarChart3}>
            <TableWrap>
              <thead><tr><Th>Esquema</Th><Th right>YSQ (média)</Th><Th>Situação</Th><Th right>Mãe</Th><Th right>Pai</Th></tr></thead>
              <tbody>
                {dom.rows.map(r => (
                  <tr key={r.schemaId} className={r.activated ? 'bg-amber-50/60' : ''}>
                    <Td className="font-medium text-slate-800">{r.name}</Td>
                    <Td right>{r.ysqMean !== null ? fmt(r.ysqMean) : r.ysqPartialMean !== null ? `${fmt(r.ysqPartialMean)}*` : '-'}</Td>
                    <Td>{r.ysqMean === null ? <span className="text-[11px] text-slate-400">-</span> : r.activated ? <Badge color="warning" size="sm">{SITUATION_ACTIVE}</Badge> : <span className="text-[11px] text-slate-500">{SITUATION_INACTIVE}</span>}</Td>
                    <Td right>{r.hasParental ? fmt(r.mother) : <span className="text-slate-300">n/a</span>}</Td>
                    <Td right>{r.hasParental ? fmt(r.father) : <span className="text-slate-300">n/a</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            {dom.needs.length > 0 && (
              <div className="mt-3">
                <h4 className="mb-1 text-xs font-medium text-slate-700">Necessidades emocionais não atendidas (RNE)</h4>
                <TableWrap>
                  <thead><tr><Th>Necessidade</Th><Th>Esquema</Th>{RNE_FIGURES.map(f => <Th key={f.id} right>{f.label}</Th>)}</tr></thead>
                  <tbody>
                    {dom.needs.map(r => (
                      <tr key={r.n}><Td>{r.needLabel}</Td><Td>{r.schemaName}</Td>{RNE_FIGURES.map(f => <Td key={f.id} right><Mark on={r.marks[f.id]} /></Td>)}</tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            )}
          </PanelCard>
        );
      })}

      <PanelCard title="Modos esquemáticos (YAMI)" icon={Activity} description="Frequência média por modo (1 a 6).">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 lg:grid-cols-2">
          {modeGroups.map(({ k, rows }) => (
            <div key={k}>
              <h4 className="mb-1 text-xs font-medium text-slate-700">{MODE_GROUP_LABEL[k]}</h4>
              <ul className="space-y-1.5">
                {rows.map(m => (
                  <li key={m.id} className="grid grid-cols-[130px_1fr_40px] items-center gap-2 text-xs">
                    <span className="text-slate-700">{m.name}</span>
                    <MeanBar value={m.mean} label={m.name} />
                    <span className="text-right font-medium tabular-nums text-slate-800">{fmt(m.mean)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PanelCard>
      <p className="text-[11px] text-slate-500">* Média parcial do YSQ (inventário ainda incompleto). {SCREENING_NOTE}</p>
      <p className="text-[11px] text-slate-500">{CREDITS}</p>
    </div>
  );
};

/* ───────────── Despachante por instrumento ───────────── */
export const InstrumentResultView: React.FC<{ instrumentId: InstrumentId; answers: Answers }> = ({ instrumentId, answers }) => {
  const score = useMemo(() => scoreInstrument(instrumentId, answers), [instrumentId, answers]);
  if (score.kind === 'parents') return <ParentsResult score={score} />;
  if (score.kind === 'needs') return <NeedsResult score={score} />;
  if (instrumentId === 'ysq') return <YsqResult score={score} />;
  if (instrumentId === 'yami') return <ModesResult score={score} />;
  return <MeanResult score={score} answers={answers} />;
};

