import React, { useMemo } from 'react';
import { Activity, ClipboardList, LifeBuoy, Plus, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, IconButton, Input, Textarea } from '../UI';
import {
  BARRIER_LABEL, BARRIER_TYPES, TASK_STATUS, formatDate, newBarrier, newIndicator, newTask, todayISO, uid,
  type PlanBarrier, type PlanIndicator, type PlanTask,
} from './model';
import { Empty, EthicsNote, Grid, Hint, ItemCard, ListHeader, OptSelect, SectionShell, Span, remove, update, type SectionProps } from './fields';

const TASK_LABEL = Object.fromEntries(TASK_STATUS.map(o => [o.value, o.label]));
const objectiveOptions = (v2: SectionProps['v2']) => v2.objectives.map(o => ({ value: o.id, label: (o.description || 'Objetivo sem descrição').slice(0, 70) }));

/* ───────────── 4. Tarefas e exercícios ───────────── */
export const TasksSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const setT = (id: string, changes: Partial<PlanTask>) => patch(v => ({ ...v, tasks: update(v.tasks, id, changes) }));
  const add = () => patch(v => ({ ...v, tasks: [...v.tasks, newTask()] }));
  return (
    <SectionShell id="tasks" v2={v2} patch={patch} icon={ClipboardList}>
      <EthicsNote>
        “Não realizada” descreve o que aconteceu, não o comprometimento da pessoa. Use os campos de dificuldades e aprendizado para compreender o que dificultou a tarefa.
      </EthicsNote>
      <ListHeader count={v2.tasks.length} noun="tarefa(s)" onAdd={add} addLabel="Nova tarefa" />
      {v2.tasks.length === 0 && <Empty icon={ClipboardList} title="Nenhuma tarefa registrada" description="Registre atividades propostas entre as sessões e o que foi aprendido com elas." />}
      <div className="space-y-2">
        {v2.tasks.map((t, idx) => (
          <ItemCard key={t.id} defaultOpen={v2.tasks.length === 1 && idx === 0}
            title={t.activity || 'Tarefa sem descrição'}
            subtitle={[t.date && `Proposta em ${formatDate(t.date)}`, t.due && `prazo ${formatDate(t.due)}`].filter(Boolean).join(' · ') || undefined}
            badges={<Badge color={t.status === 'realizada' ? 'success' : t.status === 'parcial' ? 'warning' : t.status === 'em_andamento' ? 'primary' : 'default'}>{TASK_LABEL[t.status]}</Badge>}
            onRemove={() => patch(v => ({ ...v, tasks: remove(v.tasks, t.id) }))} removeLabel="Remover tarefa">
            <Grid>
              <Span><Input label="Atividade" value={t.activity} onChange={e => setT(t.id, { activity: e.target.value })} /></Span>
              <OptSelect label="Objetivo relacionado" value={t.objective_id} onChange={v => setT(t.id, { objective_id: v })} options={objectiveOptions(v2)} emptyLabel="Sem vínculo / não informado" />
              <OptSelect label="Situação" value={t.status} onChange={v => setT(t.id, { status: v as PlanTask['status'] })} options={TASK_STATUS} emptyLabel={null} />
              <Input label="Data da proposta" type="date" value={t.date} onChange={e => setT(t.id, { date: e.target.value })} />
              <Input label="Prazo" type="date" value={t.due} onChange={e => setT(t.id, { due: e.target.value })} hint="Opcional" />
              <Span><Textarea label="Orientações" rows={2} value={t.instructions} onChange={e => setT(t.id, { instructions: e.target.value })} /></Span>
              <Textarea label="Dificuldades encontradas" rows={2} value={t.difficulties} onChange={e => setT(t.id, { difficulties: e.target.value })} />
              <Textarea label="Resultado e aprendizado" rows={2} value={t.result} onChange={e => setT(t.id, { result: e.target.value })} />
            </Grid>
          </ItemCard>
        ))}
      </div>
    </SectionShell>
  );
};

/* ───────────── 5. Indicadores ───────────── */
const IndicatorChart: React.FC<{ indicator: PlanIndicator }> = ({ indicator }) => {
  const data = useMemo(() => indicator.records
    .map(r => ({ date: r.date, label: formatDate(r.date), value: Number(String(r.value).replace(',', '.')) }))
    .filter(r => r.date && Number.isFinite(r.value))
    .sort((a, b) => a.date.localeCompare(b.date)), [indicator.records]);
  if (data.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h4 className="mb-2 text-xs font-medium text-slate-700">Registros ao longo do tempo{indicator.unit ? ` (${indicator.unit})` : ''}</h4>
      <div className="h-48 w-full" role="img" aria-label={`Gráfico de ${indicator.name || 'indicador'} com ${data.length} registro(s)`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" name={indicator.name || 'Valor'} stroke="var(--c-600)" strokeWidth={2} dot={{ r: 3, fill: 'var(--c-600)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Hint>Apenas os valores registrados por você; nenhuma média, tendência ou percentual é calculado automaticamente.</Hint>
    </div>
  );
};

export const IndicatorsSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const setI = (id: string, changes: Partial<PlanIndicator>) => patch(v => ({ ...v, indicators: update(v.indicators, id, changes) }));
  const add = () => patch(v => ({ ...v, indicators: [...v.indicators, newIndicator()] }));
  return (
    <SectionShell id="indicators" v2={v2} patch={patch} icon={Activity}>
      <EthicsNote>Indicadores ajudam a acompanhar mudanças, não a classificar a pessoa. Nenhum percentual de progresso é calculado automaticamente.</EthicsNote>
      <ListHeader count={v2.indicators.length} noun="indicador(es)" onAdd={add} addLabel="Novo indicador" />
      {v2.indicators.length === 0 && <Empty icon={Activity} title="Nenhum indicador definido" description="Defina como a mudança será observada (qualitativo) ou medida (quantitativo)." />}
      <div className="space-y-2">
        {v2.indicators.map((ind, idx) => (
          <ItemCard key={ind.id} defaultOpen={v2.indicators.length === 1 && idx === 0}
            title={ind.name || 'Indicador sem nome'}
            subtitle={ind.records.length ? `${ind.records.length} registro(s)` : 'Sem registros'}
            badges={ind.kind ? <Badge color="primary">{ind.kind === 'quantitativo' ? 'Quantitativo' : 'Qualitativo'}</Badge> : undefined}
            onRemove={() => patch(v => ({ ...v, indicators: remove(v.indicators, ind.id) }))} removeLabel="Remover indicador">
            <Grid>
              <Input label="Nome do indicador" value={ind.name} onChange={e => setI(ind.id, { name: e.target.value })} />
              <OptSelect label="Tipo" value={ind.kind} onChange={v => setI(ind.id, { kind: v as PlanIndicator['kind'] })}
                options={[{ value: 'qualitativo', label: 'Qualitativo' }, { value: 'quantitativo', label: 'Quantitativo' }]} />
              <OptSelect label="Objetivo relacionado" value={ind.objective_id} onChange={v => setI(ind.id, { objective_id: v })} options={objectiveOptions(v2)} emptyLabel="Sem vínculo / não informado" />
              <Input label="Fonte da informação" value={ind.source} onChange={e => setI(ind.id, { source: e.target.value })} placeholder="Ex.: relato do paciente, escala, diário" />
              <Span><Textarea label="Definição operacional" rows={2} value={ind.definition} onChange={e => setI(ind.id, { definition: e.target.value })}
                hint="O que exatamente conta como ocorrência deste indicador." /></Span>
              <Input label="Forma de mensuração" value={ind.method} onChange={e => setI(ind.id, { method: e.target.value })} />
              <Input label="Linha de base" value={ind.baseline} onChange={e => setI(ind.id, { baseline: e.target.value })} hint="Situação inicial; deixe vazio se ainda não avaliada." />
              {ind.kind === 'quantitativo' && <Input label="Unidade" value={ind.unit} onChange={e => setI(ind.id, { unit: e.target.value })} placeholder="Ex.: pontos, vezes por semana" />}
            </Grid>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-medium text-slate-700">Registros</h4>
                <Button type="button" size="xs" variant="outline" iconLeft={<Plus size={12} />}
                  onClick={() => setI(ind.id, { records: [...ind.records, { id: uid(), date: todayISO(), value: '', note: '' }] })}>Novo registro</Button>
              </div>
              {ind.records.length === 0 && <Hint>Nenhum registro. O gráfico só aparece quando houver valores numéricos.</Hint>}
              {ind.records.map(r => (
                <div key={r.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[150px_140px_minmax(0,1fr)_auto]">
                  <Input label="Data" type="date" value={r.date} onChange={e => setI(ind.id, { records: ind.records.map(x => (x.id === r.id ? { ...x, date: e.target.value } : x)) })} />
                  <Input label={ind.kind === 'quantitativo' ? 'Valor' : 'Valor / descrição breve'} value={r.value}
                    onChange={e => setI(ind.id, { records: ind.records.map(x => (x.id === r.id ? { ...x, value: e.target.value } : x)) })} />
                  <Input label="Observação" value={r.note} onChange={e => setI(ind.id, { records: ind.records.map(x => (x.id === r.id ? { ...x, note: e.target.value } : x)) })} />
                  <IconButton aria-label="Remover registro" size="md" onClick={() => setI(ind.id, { records: ind.records.filter(x => x.id !== r.id) })}><X size={14} /></IconButton>
                </div>
              ))}
            </div>
            <IndicatorChart indicator={ind} />
          </ItemCard>
        ))}
      </div>
    </SectionShell>
  );
};

/* ───────────── 6. Dificuldades e barreiras ───────────── */
export const BarriersSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const setB = (id: string, changes: Partial<PlanBarrier>) => patch(v => ({ ...v, barriers: update(v.barriers, id, changes) }));
  const add = (type = '') => patch(v => ({ ...v, barriers: [...v.barriers, newBarrier({ type })] }));
  return (
    <SectionShell id="barriers" v2={v2} patch={patch} icon={LifeBuoy}>
      <EthicsNote>Descreva fatores contextuais e possíveis estratégias, sem atribuir culpa ou julgamento à pessoa atendida.</EthicsNote>
      <ListHeader count={v2.barriers.length} noun="barreira(s)" onAdd={() => add('')} addLabel="Nova barreira" />
      {v2.barriers.length === 0 && <Empty icon={LifeBuoy} title="Nenhuma barreira registrada" description="Registre fatores que dificultam o processo ou marque a seção como “Não se aplica”." />}
      <div className="space-y-2">
        {v2.barriers.map((b, idx) => (
          <ItemCard key={b.id} defaultOpen={v2.barriers.length === 1 && idx === 0}
            title={b.type === 'outras' ? b.other || 'Outra barreira' : BARRIER_LABEL[b.type] || 'Barreira sem tipo'}
            subtitle={b.context ? b.context.slice(0, 80) : undefined}
            onRemove={() => patch(v => ({ ...v, barriers: remove(v.barriers, b.id) }))} removeLabel="Remover barreira">
            <Grid>
              <OptSelect label="Tipo" value={b.type} onChange={v => setB(b.id, { type: v })} options={BARRIER_TYPES} />
              {b.type === 'outras' && <Input label="Qual? (especificar)" value={b.other} onChange={e => setB(b.id, { other: e.target.value })} />}
              <Textarea label="Fatores contextuais" rows={3} value={b.context} onChange={e => setB(b.id, { context: e.target.value })} />
              <Textarea label="Estratégias para lidar com a barreira" rows={3} value={b.strategy} onChange={e => setB(b.id, { strategy: e.target.value })} />
            </Grid>
          </ItemCard>
        ))}
      </div>
      <Textarea label="Observações gerais sobre barreiras" rows={2} value={v2.barriers_notes} onChange={e => patch(v => ({ ...v, barriers_notes: e.target.value }))} />
    </SectionShell>
  );
};
