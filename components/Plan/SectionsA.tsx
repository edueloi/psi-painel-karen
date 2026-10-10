import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Brain, Plus, Target, Trash2, Wrench, X } from 'lucide-react';
import { Badge, Button, IconButton, Input, Textarea } from '../UI';
import {
  AREA_LABEL, FOCUS_AREAS, OBJECTIVE_STATUS, PLAN_STATUS_OPTIONS, PRIORITY_OPTIONS, STRATEGY_LABEL, STRATEGY_STATUS, STRATEGY_TYPES,
  SUGGESTED_OBJECTIVES, formatDate, newObjective, newStrategy, syncLinks, todayISO, uid,
  type PlanObjective, type PlanStrategy,
} from './model';
import {
  ChipMulti, Empty, EthicsNote, Grid, Hint, ItemCard, ListHeader, OptSelect, SectionShell, Span, remove, update, withEmpty,
  type SectionProps,
} from './fields';

const PRIORITY_COLOR = { alta: 'danger', media: 'warning', baixa: 'default', '': 'default' } as const;
const PRIORITY_LABEL: Record<string, string> = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' };
const OBJ_STATUS_LABEL = Object.fromEntries(OBJECTIVE_STATUS.map(o => [o.value, o.label]));
const STRAT_STATUS_LABEL = Object.fromEntries(STRATEGY_STATUS.map(o => [o.value, o.label]));
const areaOptions = FOCUS_AREAS;

/* ───────────── 1. Visão geral ───────────── */
export const OverviewSection: React.FC<SectionProps> = ({ v2, patch, sessions }) => {
  const o = v2.overview;
  const [newPriority, setNewPriority] = useState('');
  const set = (changes: Partial<typeof o>) => patch(v => ({ ...v, overview: { ...v.overview, ...changes } }));
  const assessments = sessions.filter(s => /aval/i.test(s.type));
  const move = (idx: number, dir: -1 | 1) => {
    const list = [...o.priorities]; const to = idx + dir;
    if (to < 0 || to >= list.length) return;
    [list[idx], list[to]] = [list[to], list[idx]];
    set({ priorities: list });
  };
  const addPriority = () => {
    if (!newPriority.trim()) return;
    set({ priorities: [...o.priorities, { id: uid(), text: newPriority.trim() }] });
    setNewPriority('');
  };
  return (
    <SectionShell id="overview" v2={v2} patch={patch} icon={Brain}>
      <Grid>
        <Span>
          <Textarea label="Objetivo geral do plano" rows={4} maxLength={1500} value={o.general_objective}
            onChange={e => set({ general_objective: e.target.value })}
            placeholder="Descreva, em linguagem clara, o que se pretende alcançar com o processo terapêutico." />
        </Span>
        <OptSelect label="Situação do plano" value={o.status} onChange={v => set({ status: v as typeof o.status })} options={PLAN_STATUS_OPTIONS} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Início" type="date" value={o.start_date} onChange={e => set({ start_date: e.target.value })} />
          <Input label="Reavaliação prevista" type="date" value={o.review_date} onChange={e => set({ review_date: e.target.value })} hint="Opcional" />
        </div>
        <Span>
          <ChipMulti label="Áreas de foco" options={areaOptions} value={o.focus_areas} onChange={v => set({ focus_areas: v })}
            hint="Marque quantas forem necessárias. Deixe vazio se ainda não avaliado." />
        </Span>
        {o.focus_areas.includes('outro') && (
          <Span><Input label="Outra área de foco (especificar)" value={o.focus_other} onChange={e => set({ focus_other: e.target.value })} /></Span>
        )}
      </Grid>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div>
          <h4 className="text-xs font-medium text-slate-700">Prioridades terapêuticas</h4>
          <Hint>A ordem da lista representa a prioridade atual. Use as setas para reordenar.</Hint>
        </div>
        {o.priorities.length === 0 && <Hint>Nenhuma prioridade registrada (não informado).</Hint>}
        <ol className="space-y-2">
          {o.priorities.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-xs font-medium text-slate-500">{i + 1}</span>
              <Input aria-label={`Prioridade ${i + 1}`} wrapperClassName="flex-1" value={p.text}
                onChange={e => set({ priorities: o.priorities.map(x => (x.id === p.id ? { ...x, text: e.target.value } : x)) })} />
              <IconButton aria-label={`Subir prioridade ${i + 1}`} size="sm" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconButton>
              <IconButton aria-label={`Descer prioridade ${i + 1}`} size="sm" disabled={i === o.priorities.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconButton>
              <IconButton aria-label={`Remover prioridade ${i + 1}`} size="sm" onClick={() => set({ priorities: o.priorities.filter(x => x.id !== p.id) })}><Trash2 size={14} /></IconButton>
            </li>
          ))}
        </ol>
        <div className="flex items-end gap-2">
          <Input label="Nova prioridade" wrapperClassName="flex-1" value={newPriority} onChange={e => setNewPriority(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPriority(); } }} />
          <Button type="button" size="sm" variant="outline" iconLeft={<Plus size={14} />} onClick={addPriority} disabled={!newPriority.trim()}>Adicionar</Button>
        </div>
      </div>

      <div className="space-y-3">
        <Textarea label="Fundamentação clínica (vinculada à avaliação clínica)" rows={4} value={o.rationale}
          onChange={e => set({ rationale: e.target.value })}
          hint="Registre o raciocínio clínico. Hipóteses devem ser descritas como hipóteses, não como conclusões." />
        {assessments.length > 0 ? (
          <ChipMulti label="Avaliações clínicas vinculadas" value={o.rationale_sources} onChange={v => set({ rationale_sources: v })}
            options={assessments.map(a => ({ value: a.id, label: `${a.title || 'Avaliação'} — ${formatDate(a.date)}` }))} />
        ) : (
          <Hint>Nenhuma avaliação clínica encontrada no prontuário deste paciente para vincular.</Hint>
        )}
      </div>
    </SectionShell>
  );
};

/* ───────────── 2. Objetivos específicos ───────────── */
export const ObjectivesSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const [fPriority, setFPriority] = useState('');
  const [fArea, setFArea] = useState('');
  const [fStatus, setFStatus] = useState('');
  const setObj = (id: string, changes: Partial<PlanObjective>) => patch(v => ({ ...v, objectives: update(v.objectives, id, changes) }));
  const add = (description = '') => patch(v => ({ ...v, objectives: [...v.objectives, newObjective(description)] }));
  const toggleStrategy = (objId: string, stratId: string, on: boolean) => patch(v => syncLinks({
    ...v, strategies: update(v.strategies, stratId, { objective_id: on ? objId : '' }),
  }));
  const shown = useMemo(() => v2.objectives.filter(o =>
    (!fPriority || o.priority === fPriority) && (!fArea || o.area === fArea) && (!fStatus || o.status === fStatus)), [v2.objectives, fPriority, fArea, fStatus]);
  const stratOptions = v2.strategies.map(s => ({ value: s.id, label: s.type === 'outras' ? s.type_other || 'Outra estratégia' : STRATEGY_LABEL[s.type] || 'Estratégia sem tipo' }));
  const hasFilter = !!(fPriority || fArea || fStatus);

  return (
    <SectionShell id="objectives" v2={v2} patch={patch} icon={Target}>
      <EthicsNote>
        O progresso não é calculado automaticamente. A barra só aparece quando você mesma define um critério e um valor para o objetivo.
      </EthicsNote>
      <div className="space-y-1.5">
        <span className="ds-label">Objetivos sugeridos (clique para adicionar)</span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_OBJECTIVES.map(s => (
            <Button key={s.value} type="button" size="xs" variant="outline" iconLeft={<Plus size={12} />} onClick={() => add(s.value)}>{s.label}</Button>
          ))}
          <Button type="button" size="xs" variant="outline" iconLeft={<Plus size={12} />} onClick={() => add('')}>Outro</Button>
        </div>
      </div>

      <ListHeader count={v2.objectives.length} noun="objetivo(s)" onAdd={() => add('')} addLabel="Novo objetivo" />
      {v2.objectives.length > 1 && (
        <Grid cols={3}>
          <OptSelect label="Filtrar por prioridade" value={fPriority} onChange={setFPriority} options={PRIORITY_OPTIONS} emptyLabel="Todas" />
          <OptSelect label="Filtrar por área" value={fArea} onChange={setFArea} options={areaOptions} emptyLabel="Todas" />
          <OptSelect label="Filtrar por situação" value={fStatus} onChange={setFStatus} options={OBJECTIVE_STATUS} emptyLabel="Todas" />
        </Grid>
      )}
      {v2.objectives.length === 0 && <Empty icon={Target} title="Nenhum objetivo específico" description="Adicione um objetivo ou escolha uma sugestão acima. Você pode marcar a seção como “Ainda não avaliado”." />}
      {hasFilter && shown.length === 0 && v2.objectives.length > 0 && <Hint>Nenhum objetivo corresponde aos filtros.</Hint>}
      <div className="space-y-2">
        {shown.map((o, idx) => {
          const linked = v2.strategies.filter(s => s.objective_id === o.id).map(s => s.id);
          const showBar = !!o.criterion.trim() && o.progress_value !== null;
          return (
            <ItemCard key={o.id} defaultOpen={idx === 0 && !hasFilter && v2.objectives.length === 1}
              title={o.description || 'Objetivo sem descrição'}
              subtitle={`Criado em ${formatDate(o.created_at) || '—'}${o.reviewed_at ? ` · revisado em ${formatDate(o.reviewed_at)}` : ''}`}
              badges={<>
                {o.priority && <Badge color={PRIORITY_COLOR[o.priority]}>{PRIORITY_LABEL[o.priority]}</Badge>}
                <Badge color={o.status === 'alcancado' ? 'success' : o.status === 'em_andamento' ? 'primary' : 'default'}>{OBJ_STATUS_LABEL[o.status]}</Badge>
              </>}
              onRemove={() => patch(v => syncLinks({ ...v, objectives: remove(v.objectives, o.id), strategies: v.strategies.map(s => (s.objective_id === o.id ? { ...s, objective_id: '' } : s)) }))}
              removeLabel="Remover objetivo">
              <Grid>
                <Span><Textarea label="Descrição do objetivo" rows={2} value={o.description} onChange={e => setObj(o.id, { description: e.target.value })}
                  placeholder="Formule de modo observável e mensurável sempre que possível." /></Span>
                <OptSelect label="Área clínica" value={o.area} onChange={v => setObj(o.id, { area: v })} options={areaOptions} />
                <OptSelect label="Prioridade" value={o.priority} onChange={v => setObj(o.id, { priority: v as PlanObjective['priority'] })} options={PRIORITY_OPTIONS} />
                <OptSelect label="Situação" value={o.status} onChange={v => setObj(o.id, { status: v as PlanObjective['status'], reviewed_at: v === 'revisado' ? todayISO() : o.reviewed_at })} options={OBJECTIVE_STATUS} emptyLabel={null} />
                <Input label="Data da última revisão" type="date" value={o.reviewed_at} onChange={e => setObj(o.id, { reviewed_at: e.target.value })} />
                <Span><Textarea label="Indicadores de progresso" rows={2} value={o.indicators} onChange={e => setObj(o.id, { indicators: e.target.value })}
                  hint="O que você observará ou medirá para saber se houve mudança." /></Span>
                <Span>
                  {stratOptions.length > 0
                    ? <ChipMulti label="Estratégias vinculadas" options={stratOptions} value={linked}
                        onChange={next => {
                          const added = next.find(id => !linked.includes(id)); const removed = linked.find(id => !next.includes(id));
                          if (added) toggleStrategy(o.id, added, true); if (removed) toggleStrategy(o.id, removed, false);
                        }} />
                    : <Hint>Cadastre estratégias na seção 3 para vinculá-las a este objetivo.</Hint>}
                </Span>
                <Span><Textarea label="Evidências observadas" rows={2} value={o.evidence} onChange={e => setObj(o.id, { evidence: e.target.value })}
                  hint="Registre apenas o que foi observado ou relatado, com data quando possível." /></Span>
              </Grid>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <h4 className="text-xs font-medium text-slate-700">Progresso definido manualmente (opcional)</h4>
                <Grid>
                  <Input label="Critério de progresso" value={o.criterion} onChange={e => setObj(o.id, { criterion: e.target.value })}
                    placeholder="Ex.: situações evitadas enfrentadas, em 10 propostas" />
                  <Input label="Valor atual (0 a 100)" type="number" min={0} max={100} value={o.progress_value ?? ''}
                    onChange={e => setObj(o.id, { progress_value: e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))) })} />
                </Grid>
                {showBar ? (
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={o.progress_value ?? 0} aria-label="Progresso definido pela profissional">
                      <div className="h-full bg-primary-600" style={{ width: `${o.progress_value}%` }} />
                    </div>
                    <Hint>{o.progress_value}% — valor informado pela profissional, conforme o critério acima.</Hint>
                  </div>
                ) : <Hint>Sem critério e valor definidos, nenhuma barra de progresso é exibida.</Hint>}
              </div>
            </ItemCard>
          );
        })}
      </div>
    </SectionShell>
  );
};

/* ───────────── 3. Estratégias e intervenções ───────────── */
export const StrategiesSection: React.FC<SectionProps> = ({ v2, patch, sessions }) => {
  const setS = (id: string, changes: Partial<PlanStrategy>) => patch(v => syncLinks({ ...v, strategies: update(v.strategies, id, changes) }));
  const add = (type = '') => patch(v => ({ ...v, strategies: [...v.strategies, newStrategy({ type })] }));
  const objOptions = v2.objectives.map(o => ({ value: o.id, label: (o.description || 'Objetivo sem descrição').slice(0, 70) }));
  return (
    <SectionShell id="strategies" v2={v2} patch={patch} icon={Wrench}>
      <div className="space-y-1.5">
        <span className="ds-label">Adicionar por tipo</span>
        <div className="flex flex-wrap gap-1.5">
          {STRATEGY_TYPES.map(t => (
            <Button key={t.value} type="button" size="xs" variant="outline" iconLeft={<Plus size={12} />} onClick={() => add(t.value)}>{t.label.replace(' — especificar', '')}</Button>
          ))}
        </div>
      </div>
      <ListHeader count={v2.strategies.length} noun="estratégia(s)" onAdd={() => add('')} addLabel="Nova estratégia" />
      {v2.strategies.length === 0 && <Empty icon={Wrench} title="Nenhuma estratégia registrada" description="Registre as intervenções planejadas ou já aplicadas, com a justificativa clínica." />}
      <div className="space-y-2">
        {v2.strategies.map((s, idx) => (
          <ItemCard key={s.id} defaultOpen={v2.strategies.length === 1 && idx === 0}
            title={s.type === 'outras' ? s.type_other || 'Outra estratégia' : STRATEGY_LABEL[s.type] || 'Estratégia sem tipo'}
            subtitle={s.sessions.length ? `${s.sessions.length} sessão(ões) vinculada(s)` : undefined}
            badges={<Badge color={s.status === 'concluida' ? 'success' : s.status === 'suspensa' ? 'default' : 'primary'}>{STRAT_STATUS_LABEL[s.status]}</Badge>}
            onRemove={() => patch(v => syncLinks({ ...v, strategies: remove(v.strategies, s.id) }))} removeLabel="Remover estratégia">
            <Grid>
              <OptSelect label="Tipo de estratégia" value={s.type} onChange={v => setS(s.id, { type: v })} options={STRATEGY_TYPES} />
              {s.type === 'outras' && <Input label="Qual? (especificar)" value={s.type_other} onChange={e => setS(s.id, { type_other: e.target.value })} />}
              <OptSelect label="Situação" value={s.status} onChange={v => setS(s.id, { status: v as PlanStrategy['status'] })} options={STRATEGY_STATUS} emptyLabel={null} />
              <OptSelect label="Objetivo relacionado" value={s.objective_id} onChange={v => setS(s.id, { objective_id: v })} options={objOptions} emptyLabel="Sem vínculo / não informado" />
              <Span><Textarea label="Justificativa clínica" rows={2} value={s.rationale} onChange={e => setS(s.id, { rationale: e.target.value })} /></Span>
            </Grid>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-medium text-slate-700">Sessões em que foi aplicada</h4>
                <Button type="button" size="xs" variant="outline" iconLeft={<Plus size={12} />}
                  onClick={() => setS(s.id, { sessions: [...s.sessions, { id: uid(), date: todayISO(), note: '' }] })}>Registrar sessão</Button>
              </div>
              {s.sessions.length === 0 && <Hint>Nenhuma sessão vinculada.</Hint>}
              {s.sessions.map(ss => (
                <div key={ss.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Input label="Data" type="date" value={ss.date} onChange={e => setS(s.id, { sessions: s.sessions.map(x => (x.id === ss.id ? { ...x, date: e.target.value } : x)) })} />
                  <OptSelect label="Registro do prontuário" value={ss.record_id || ''} emptyLabel="Nenhum"
                    onChange={val => setS(s.id, { sessions: s.sessions.map(x => (x.id === ss.id ? { ...x, record_id: val || undefined } : x)) })}
                    options={sessions.map(r => ({ value: r.id, label: `${formatDate(r.date)} — ${r.title || r.type}` }))} />
                  <Input label="Observação" value={ss.note} onChange={e => setS(s.id, { sessions: s.sessions.map(x => (x.id === ss.id ? { ...x, note: e.target.value } : x)) })} />
                  <IconButton aria-label="Remover sessão vinculada" size="md" onClick={() => setS(s.id, { sessions: s.sessions.filter(x => x.id !== ss.id) })}><X size={14} /></IconButton>
                </div>
              ))}
            </div>
            <Textarea label="Resultados observados" rows={2} value={s.results} onChange={e => setS(s.id, { results: e.target.value })}
              hint="Descreva apenas o que foi observado ou relatado. Deixe vazio se ainda não há resultados." />
          </ItemCard>
        ))}
      </div>
    </SectionShell>
  );
};

export { AREA_LABEL, withEmpty };
