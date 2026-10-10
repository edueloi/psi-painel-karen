import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Select, Textarea } from '../UI/Input';
import { Button, IconButton } from '../UI/Button';
import { Tabs } from '../UI/Tabs';
import { Alert } from '../UI/Alert';
import { ContentCard } from '../UI/PageWrapper';
import { type FieldDef, type SectionDef, type StructuredValues, hasValue } from './specialtyTemplates';

interface Props {
  sections: SectionDef[];
  values: StructuredValues;
  onChange: (key: string, value: any) => void;
  /** Metas do plano terapêutico do paciente (campo type=goals). */
  planGoals?: string[];
  label: string;
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

const FieldRenderer: React.FC<{ f: FieldDef; value: any; onChange: (v: any) => void; planGoals: string[] }> = ({ f, value, onChange, planGoals }) => {
  switch (f.type) {
    case 'textarea':
      return <Textarea label={f.label} hint={f.hint} rows={f.rows || 4} placeholder={f.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'select':
      return (
        <Select label={f.label} hint={f.hint} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Selecione...</option>
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
      );
    case 'multi':
      return <MultiField f={f} value={value} onChange={onChange} />;
    case 'rows':
      return <RowsField f={f} value={value} onChange={onChange} />;
    case 'goals':
      return <GoalsField f={f} value={value} goals={planGoals} onChange={onChange} />;
    case 'number':
      return <Input label={f.label} hint={f.hint} type="number" placeholder={f.placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
    case 'date':
      return <Input label={f.label} hint={f.hint} type="date" value={value || ''} onChange={e => onChange(e.target.value)} />;
    default:
      return <Input label={f.label} hint={f.hint} placeholder={f.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />;
  }
};

const RISK_ALERT_VALUES = ['Ideação ativa sem plano', 'Ideação com plano', 'Autolesão sem intenção suicida', 'Risco a terceiros'];

/** Formulário por seções: menu lateral no desktop, Tabs no mobile. */
export const StructuredForm: React.FC<Props> = ({ sections, values, onChange, planGoals = [], label }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const index = Math.max(0, sections.findIndex(s => s.id === activeId));
  const section = sections[index] || sections[0];

  const filled = useMemo(() => {
    const m: Record<string, boolean> = {};
    sections.forEach(s => { m[s.id] = s.fields.some(f => hasValue(values[f.key])); });
    return m;
  }, [sections, values]);
  const tabItems = useMemo(() => sections.map(s => ({ id: s.id, label: s.label, icon: s.icon })), [sections]);

  if (!section) return null;
  const riskValue = section.fields.some(f => f.key === 'risco_suicida') ? values.risco_suicida : '';
  const showRisk = RISK_ALERT_VALUES.includes(riskValue);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="lg:hidden">
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
              {filled[s.id] && <Check size={12} className="shrink-0 text-emerald-600" aria-label="Preenchida" />}
            </button>
          );
        })}
      </nav>

      <ContentCard padding="md" className="min-w-0 space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <section.icon size={14} className="text-primary-600" /> {section.label}
          </h3>
          {section.description && <p className="mt-0.5 text-[11px] text-slate-500">{section.description}</p>}
        </div>
        {section.notice && <Alert variant="info">{section.notice}</Alert>}
        {showRisk && <Alert variant="warning">Risco assinalado: registre a conduta adotada e o plano de segurança.</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {section.fields.map(f => (
            <div key={f.key} className={f.full || f.type === 'textarea' || f.type === 'multi' || f.type === 'rows' || f.type === 'goals' ? 'sm:col-span-2' : ''}>
              <FieldRenderer f={f} value={values[f.key]} onChange={v => onChange(f.key, v)} planGoals={planGoals} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="ghost" size="sm" iconLeft={<ChevronLeft size={14} />} disabled={index === 0} onClick={() => setActiveId(sections[index - 1].id)}>Anterior</Button>
          <span className="text-[11px] text-slate-500">{index + 1} de {sections.length}</span>
          <Button type="button" variant="outline" size="sm" iconRight={<ChevronRight size={14} />} disabled={index === sections.length - 1} onClick={() => setActiveId(sections[index + 1].id)}>Próxima</Button>
        </div>
      </ContentCard>
    </div>
  );
};
