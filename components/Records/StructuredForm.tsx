import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Input, Select, Textarea } from '../UI/Input';
import { Button, IconButton } from '../UI/Button';
import { Tabs } from '../UI/Tabs';
import { Alert } from '../UI/Alert';
import { Badge } from '../UI/Badge';
import { ContentCard } from '../UI/PageWrapper';
import {
  type FieldDef, type SectionDef, type StructuredValues, sectionStatus, overallProgress, FOLLOWUP_STATUS, RISCO_TRIAGEM, normalizeHumor,
} from './specialtyTemplates';

export interface FollowupRow { tarefa: string; status?: string; comentario?: string }

interface Props {
  sections: SectionDef[];
  values: StructuredValues;
  onChange: (key: string, value: any) => void;
  /** Metas do plano terapêutico do paciente (campo type=goals). */
  planGoals?: string[];
  label: string;
  /** Campos preenchidos por IA e ainda não confirmados/editados. */
  aiFields?: string[];
  onConfirmAi?: (key: string) => void;
  /** Origem (rótulos das fontes) por campo sugerido por IA. */
  aiSources?: Record<string, string[]>;
  /** Conteúdo extra exibido no topo de uma seção (ex.: pendências da última sessão). */
  sectionTop?: (sectionId: string) => React.ReactNode;
  /** Ações à direita da barra de progresso (ex.: Preencher com IA). */
  toolbar?: React.ReactNode;
  /** Mostra a barra de progresso geral e os indicadores por seção. */
  showProgress?: boolean;
  /** Impede alterações enquanto um registro aprovado ainda não foi destravado. */
  disabled?: boolean;
}

const MultiField: React.FC<{ f: FieldDef; value: string[]; onChange: (v: string[]) => void }> = ({ f, value, onChange }) => {
  const [custom, setCustom] = useState('');
  const list = Array.isArray(value) ? value : [];
  const options = [...(f.options || []), ...list.filter(v => !(f.options || []).includes(v))];
  const toggle = (o: string) => onChange(list.includes(o) ? list.filter(x => x !== o) : [...list, o]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!list.includes(v)) onChange([...list, v]);
    setCustom('');
  };
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-slate-600">{f.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const on = list.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o)}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${on ? 'border-primary-500 bg-primary-50 font-medium text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}
            >
              {on && <Check size={12} />}{o}
            </button>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <Input
          wrapperClassName="flex-1"
          aria-label={`Adicionar outro em ${f.label}`}
          placeholder="Adicionar outro..."
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
        />
        <Button type="button" variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={addCustom} disabled={!custom.trim()}>Adicionar</Button>
      </div>
    </div>
  );
};

const RowsField: React.FC<{ f: FieldDef; value: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void }> = ({ f, value, onChange }) => {
  const rows = Array.isArray(value) ? value : [];
  const cols = f.columns || [];
  const setCell = (i: number, k: string, v: string) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{f.label}</span>
        <Button type="button" variant="outline" size="xs" iconLeft={<Plus size={14} />} onClick={() => onChange([...rows, {}])}>
          {f.rowsAddLabel || 'Adicionar'}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-center text-[11px] text-slate-500">Nenhum item adicionado.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {cols.map(c => (
                  <Input key={c.key} label={c.label} placeholder={c.placeholder} value={r[c.key] || ''} onChange={e => setCell(i, c.key, e.target.value)} />
                ))}
              </div>
              <IconButton type="button" size="sm" variant="ghost" aria-label="Remover item" title="Remover item" className="mt-5 shrink-0 text-red-600 hover:bg-red-50" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GoalsField: React.FC<{ f: FieldDef; value: string[]; goals: string[]; onChange: (v: string[]) => void }> = ({ f, value, goals, onChange }) => {
  const list = Array.isArray(value) ? value : [];
  const all = [...goals, ...list.filter(v => !goals.includes(v))];
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-slate-600">{f.label}</span>
      {all.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-[11px] text-slate-500">
          Este paciente ainda não tem metas em um plano terapêutico. Crie o plano na aba Plano terapêutico para vincular as sessões às metas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {all.map(g => {
            const on = list.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? list.filter(x => x !== g) : [...list, g])}
                className={`flex min-h-[36px] items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${on ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white'}`}>
                  {on && <Check size={11} />}
                </span>
                <span className="min-w-0 break-words">{g}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Escala idêntica à usada no formulário remoto de anamnese. */
const ScaleField: React.FC<{ f: FieldDef; value: any; onChange: (v: number) => void }> = ({ f, value, onChange }) => {
  const selected = Number(value) || 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-[11px] text-slate-500">
        <span>{f.scaleMin || 'Muito baixo'}</span>
        <span className="text-right">{f.scaleMax || 'Muito alto'}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            type="button"
            aria-pressed={selected === n}
            onClick={() => onChange(n)}
            className={`h-9 rounded-lg border text-xs font-medium transition-colors ${selected === n ? 'border-primary-600 bg-primary-600 text-white' : n <= selected ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Retorno rápido por tarefa da sessão anterior: feita / parcial / não feita + comentário. */
export const FollowupsEditor: React.FC<{ rows: FollowupRow[]; onChange: (rows: FollowupRow[]) => void; emptyHint?: string }> = ({ rows, onChange, emptyHint }) => {
  const list = Array.isArray(rows) ? rows : [];
  const [extra, setExtra] = useState('');
  const patch = (i: number, p: Partial<FollowupRow>) => onChange(list.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const add = () => {
    const t = extra.trim();
    if (!t) return;
    onChange([...list, { tarefa: t }]);
    setExtra('');
  };
  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-[11px] text-slate-500">
          {emptyHint || 'Nenhuma tarefa da sessão anterior. Você pode adicionar uma para registrar o retorno.'}
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((r, i) => (
            <div key={`${r.tarefa}-${i}`} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-xs font-medium text-slate-700">{r.tarefa}</p>
                <IconButton type="button" size="sm" variant="ghost" aria-label="Remover tarefa" title="Remover tarefa" className="shrink-0 text-red-600 hover:bg-red-50" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Retorno da tarefa ${r.tarefa}`}>
                  {FOLLOWUP_STATUS.map(st => {
                    const on = r.status === st;
                    const tone = st === 'Feita' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : st === 'Parcial' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-red-400 bg-red-50 text-red-700';
                    return (
                      <button
                        key={st}
                        type="button"
                        aria-pressed={on}
                        onClick={() => patch(i, { status: on ? '' : st })}
                        className={`inline-flex min-h-[32px] items-center rounded-lg border px-2.5 text-xs transition-colors ${on ? `${tone} font-medium` : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
                <Input aria-label={`Comentário sobre a tarefa ${r.tarefa}`} placeholder="Comentário (opcional)" value={r.comentario || ''} onChange={e => patch(i, { comentario: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Input
          wrapperClassName="flex-1"
          aria-label="Adicionar tarefa anterior"
          placeholder="Adicionar tarefa para registrar retorno..."
          value={extra}
          onChange={e => setExtra(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={add} disabled={!extra.trim()}>Adicionar</Button>
      </div>
    </div>
  );
};

const FieldRenderer: React.FC<{ f: FieldDef; value: any; onChange: (v: any) => void; planGoals: string[] }> = ({ f, value, onChange, planGoals }) => {
  switch (f.type) {
    case 'textarea':
      return <Textarea label={f.label} hint={f.hint} rows={f.rows || 4} placeholder={f.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'select':
      return (
        <Select label={f.label} hint={f.hint} value={(f.key === 'humor' ? normalizeHumor(value) : value) || ''} onChange={e => onChange(e.target.value)}>
          <option value="">{f.emptyLabel || 'Selecione...'}</option>
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
    case 'multi':
      return <MultiField f={f} value={value} onChange={onChange} />;
    case 'rows':
      return <RowsField f={f} value={value} onChange={onChange} />;
    case 'goals':
      return <GoalsField f={f} value={value} goals={planGoals} onChange={onChange} />;
    case 'followups':
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-600">{f.label}</span>
          <FollowupsEditor rows={value} onChange={onChange} />
        </div>
      );
    case 'number':
      return <Input label={f.label} hint={f.hint} type="number" placeholder={f.placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'scale':
      return <div className="space-y-1"><span className="text-xs font-medium text-slate-600">{f.label}</span><ScaleField f={f} value={value} onChange={onChange} /></div>;
    case 'date':
      return <Input label={f.label} hint={f.hint} type="date" value={value || ''} onChange={e => onChange(e.target.value)} />;
    default:
      return <Input label={f.label} hint={f.hint} placeholder={f.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
  }
};

const RISK_ALERT_VALUES = ['Ideação ativa sem plano', 'Ideação com plano', 'Autolesão sem intenção suicida', 'Risco a terceiros'];
const wideTypes = ['textarea', 'multi', 'rows', 'goals', 'followups', 'scale'];

const StatusMark: React.FC<{ status: 'empty' | 'partial' | 'done' }> = ({ status }) => {
  if (status === 'done') return <Check size={12} className="shrink-0 text-emerald-600" aria-label="Seção completa" />;
  if (status === 'partial') return <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" role="img" aria-label="Preenchida em parte" title="Preenchida em parte" />;
  return null;
};

/** Formulário por seções: menu lateral no desktop, Tabs no mobile. */
export const StructuredForm: React.FC<Props> = ({ sections, values, onChange, planGoals = [], label, aiFields = [], onConfirmAi, aiSources = {}, sectionTop, toolbar, showProgress = false, disabled = false }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const index = Math.max(0, sections.findIndex(s => s.id === activeId));
  const section = sections[index] || sections[0];

  const statuses = useMemo(() => {
    const m: Record<string, 'empty' | 'partial' | 'done'> = {};
    sections.forEach(s => { m[s.id] = sectionStatus(s, values); });
    return m;
  }, [sections, values]);
  const progress = useMemo(() => overallProgress(sections, values), [sections, values]);
  const tabItems = useMemo(
    () => sections.map(s => ({ id: s.id, label: s.label, icon: s.icon, badge: statuses[s.id] === 'done' ? '✓' : statuses[s.id] === 'partial' ? '•' : undefined })),
    [sections, statuses]
  );

  if (!section) return null;
  const legacyRisk = section.fields.some(f => f.key === 'risco_suicida') ? values.risco_suicida : '';
  const triagePresent = RISCO_TRIAGEM.filter(r => values[`risco_${r.key}`] === 'Presente');
  const hasRiskFields = section.fields.some(f => f.key.startsWith('risco_'));
  const showRisk = hasRiskFields && (RISK_ALERT_VALUES.includes(legacyRisk) || triagePresent.length > 0);
  const visibleFields = section.fields.filter(f => !f.showIf || f.showIf(values));
  const top = sectionTop?.(section.id);

  return (
    <div className="space-y-3">
      {showProgress && (
        <ContentCard padding="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700">Preenchimento do registro</span>
                <span className="tabular-nums text-slate-500">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Preenchimento da evolução">
                <div className="h-full rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {toolbar && <fieldset disabled={disabled} className="flex shrink-0 flex-wrap items-center gap-2 border-0 p-0 m-0">{toolbar}</fieldset>}
          </div>
        </ContentCard>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="min-w-0 lg:hidden">
          <Tabs<string> items={tabItems} value={section.id} onChange={setActiveId} label={label} />
        </div>
        <nav aria-label={label} className="hidden self-start rounded-lg border border-slate-200 bg-white p-1.5 lg:sticky lg:top-3 lg:block">
          {sections.map(s => {
            const Icon = s.icon;
            const active = s.id === section.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex min-h-[36px] w-full items-center gap-2 rounded-md px-2.5 text-left text-xs transition-colors ${active ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <StatusMark status={statuses[s.id]} />
              </button>
            );
          })}
        </nav>

        <fieldset disabled={disabled} className="min-w-0 border-0 m-0 p-0">
        <ContentCard padding="md" className={`min-w-0 space-y-3 ${disabled ? 'opacity-60' : ''}`}>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <section.icon size={14} className="text-primary-600" /> {section.label}
            </h3>
            {section.description && <p className="mt-0.5 text-[11px] text-slate-500">{section.description}</p>}
          </div>
          {section.notice && <Alert variant="info">{section.notice}</Alert>}
          {top}
          {showRisk && (
            <Alert variant="error" title="Risco assinalado">
              {triagePresent.length > 0 ? `${triagePresent.map(r => r.label.split(' (')[0]).join(', ')}: ` : ''}registre a conduta adotada e o plano de segurança.
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleFields.map(f => {
              const fromAi = aiFields.includes(f.key);
              return (
                <div key={f.key} className={`min-w-0 ${f.full || wideTypes.includes(f.type) ? 'sm:col-span-2' : ''}`}>
                  {fromAi && (
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge color="purple" icon={<Sparkles size={10} />}>Sugerido por IA</Badge>
                      {onConfirmAi && (
                        <button type="button" onClick={() => onConfirmAi(f.key)} className="text-[11px] text-slate-500 underline-offset-2 hover:text-primary-700 hover:underline">
                          Confirmar
                        </button>
                      )}
                    </div>
                  )}
                  {fromAi && (aiSources[f.key] || []).length > 0 && (
                    <p className="mb-1 text-[11px] text-slate-500">Origem: {(aiSources[f.key] || []).join(', ')}</p>
                  )}
                  <FieldRenderer f={f} value={values[f.key]} onChange={v => onChange(f.key, v)} planGoals={planGoals} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="ghost" size="sm" iconLeft={<ChevronLeft size={14} />} disabled={index === 0} onClick={() => setActiveId(sections[index - 1].id)}>Anterior</Button>
            <span className="text-[11px] text-slate-500">{index + 1} de {sections.length}</span>
            <Button type="button" variant="outline" size="sm" iconRight={<ChevronRight size={14} />} disabled={index === sections.length - 1} onClick={() => setActiveId(sections[index + 1].id)}>Próxima</Button>
          </div>
        </ContentCard>
        </fieldset>
      </div>
    </div>
  );
};
