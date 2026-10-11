import React, { useMemo, useState } from 'react';
import { Check, Pencil, Sparkles, X } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Alert } from '../UI/Alert';
import { Badge } from '../UI/Badge';
import { Input, Select, Textarea } from '../UI/Input';
import { type FieldDef, type SectionDef, type StructuredValues, fieldToText, hasValue } from './specialtyTemplates';

interface Row { section: SectionDef; field: FieldDef; suggested: any }
type Decision = 'accepted' | 'ignored';

const asText = (f: FieldDef, v: any) => (hasValue(v) ? fieldToText(f, v) : '');

/** Editor do valor sugerido, conforme o tipo do campo. */
const SuggestionEditor: React.FC<{ f: FieldDef; value: any; goals: string[]; onChange: (v: any) => void }> = ({ f, value, goals, onChange }) => {
  if (f.type === 'multi' || f.type === 'goals') {
    const list: string[] = Array.isArray(value) ? value : [];
    const base = f.type === 'goals' ? goals : (f.options || []);
    const all = [...base, ...list.filter(v => !base.includes(v))];
    return (
      <div className="flex flex-wrap gap-1.5">
        {all.map(o => {
          const on = list.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? list.filter(x => x !== o) : [...list, o])}
              className={`inline-flex min-h-[28px] items-center gap-1 rounded-lg border px-2 text-[11px] transition-colors ${on ? 'border-primary-500 bg-primary-50 font-medium text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}
            >
              {on && <Check size={11} />}{o}
            </button>
          );
        })}
      </div>
    );
  }
  if (f.type === 'select') {
    return (
      <Select aria-label={f.label} value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">{f.emptyLabel || 'Selecione...'}</option>
        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </Select>
    );
  }
  if (f.type === 'textarea') return <Textarea aria-label={f.label} rows={4} value={value || ''} onChange={e => onChange(e.target.value)} />;
  return <Input aria-label={f.label} value={value || ''} onChange={e => onChange(e.target.value)} />;
};

/** Painel de revisão: valor atual x sugerido, com Aceitar / Editar / Ignorar por campo. */
export const AiFillPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  sections: SectionDef[];
  values: StructuredValues;
  planGoals: string[];
  suggestions: Record<string, any>;
  reviewPoints: string[];
  /** Aplica os valores nos campos e os marca como "Sugerido por IA". */
  onApply: (patch: Record<string, any>) => void;
}> = ({ isOpen, onClose, sections, values, planGoals, suggestions, reviewPoints, onApply }) => {
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    sections.forEach(section => section.fields.forEach(field => {
      if (field.type === 'followups' || field.type === 'rows') return;
      if (hasValue(suggestions[field.key])) out.push({ section, field, suggested: suggestions[field.key] });
    }));
    return out;
  }, [sections, suggestions]);

  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});

  const current = (r: Row) => values[r.field.key];
  const valueFor = (r: Row) => (r.field.key in edits ? edits[r.field.key] : r.suggested);
  const pendingEmpty = rows.filter(r => !decisions[r.field.key] && !hasValue(current(r)));

  const accept = (r: Row) => {
    onApply({ [r.field.key]: valueFor(r) });
    setDecisions(d => ({ ...d, [r.field.key]: 'accepted' }));
    setConfirming(c => ({ ...c, [r.field.key]: false }));
    setEditing(e => ({ ...e, [r.field.key]: false }));
  };
  const ignore = (r: Row) => setDecisions(d => ({ ...d, [r.field.key]: 'ignored' }));
  const applyAllEmpty = () => {
    const patch: Record<string, any> = {};
    const dec: Record<string, Decision> = {};
    pendingEmpty.forEach(r => { patch[r.field.key] = valueFor(r); dec[r.field.key] = 'accepted'; });
    if (Object.keys(patch).length) onApply(patch);
    setDecisions(d => ({ ...d, ...dec }));
  };

  const sectionsWithRows = sections.filter(s => rows.some(r => r.section.id === s.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={<span className="flex items-center gap-2"><Sparkles size={14} className="text-primary-600" /> Revisar sugestões da IA</span>}
      subtitle="Nada é gravado até você aceitar. Campos já preenchidos só são substituídos com a sua confirmação."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button variant="primary" size="sm" iconLeft={<Check size={14} />} onClick={applyAllEmpty} disabled={pendingEmpty.length === 0}>
            Aplicar todos os campos vazios{pendingEmpty.length ? ` (${pendingEmpty.length})` : ''}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Alert variant="warning" title="Revise antes de aprovar">
          A IA apenas organiza o que está no texto da sessão e pode errar. Campos sem base no texto ficam vazios; riscos só aparecem quando mencionados.
        </Alert>
        {reviewPoints.length > 0 && (
          <Alert variant="info" title="Pontos para revisão humana">
            <ul className="space-y-0.5">{reviewPoints.map((p, i) => <li key={i}>• {p}</li>)}</ul>
          </Alert>
        )}
        {rows.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-xs text-slate-500">A IA não encontrou informações suficientes no texto para sugerir campos.</p>}

        {sectionsWithRows.map(section => (
          <div key={section.id} className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-medium text-slate-700"><section.icon size={13} className="text-primary-600" />{section.label}</h4>
            {rows.filter(r => r.section.id === section.id).map(r => {
              const key = r.field.key;
              const cur = asText(r.field, current(r));
              const filled = !!cur;
              const decision = decisions[key];
              const isEditing = !!editing[key];
              const shown = asText(r.field, valueFor(r));
              return (
                <div key={key} className={`rounded-lg border p-2.5 ${decision === 'accepted' ? 'border-emerald-200 bg-emerald-50/40' : decision === 'ignored' ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-800">{r.field.label}</span>
                    {filled && !decision && <Badge color="warning">Já preenchido</Badge>}
                    {decision === 'accepted' && <Badge color="success">Aplicado</Badge>}
                    {decision === 'ignored' && <Badge color="default">Ignorado</Badge>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[11px] font-medium text-slate-500">Valor atual</p>
                      <p className="whitespace-pre-wrap break-words rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{cur || '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[11px] font-medium text-primary-700">Sugerido</p>
                      {isEditing ? (
                        <SuggestionEditor f={r.field} value={valueFor(r)} goals={planGoals} onChange={v => setEdits(e => ({ ...e, [key]: v }))} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words rounded-md bg-primary-50 px-2 py-1.5 text-xs text-slate-800">{shown || '—'}</p>
                      )}
                    </div>
                  </div>
                  {decision !== 'accepted' && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {confirming[key] ? (
                        <>
                          <span className="text-[11px] text-amber-700">Substituir o valor atual pelo sugerido?</span>
                          <Button size="xs" variant="primary" onClick={() => accept(r)}>Substituir</Button>
                          <Button size="xs" variant="ghost" onClick={() => setConfirming(c => ({ ...c, [key]: false }))}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size="xs" variant="primary" iconLeft={<Check size={14} />} onClick={() => (filled ? setConfirming(c => ({ ...c, [key]: true })) : accept(r))}>Aceitar</Button>
                          <Button size="xs" variant="outline" iconLeft={<Pencil size={14} />} onClick={() => setEditing(e => ({ ...e, [key]: !e[key] }))}>{isEditing ? 'Concluir edição' : 'Editar'}</Button>
                          {decision !== 'ignored' && <Button size="xs" variant="ghost" iconLeft={<X size={14} />} onClick={() => ignore(r)}>Ignorar</Button>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
};
