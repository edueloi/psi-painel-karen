import React, { useState } from 'react';
import { Brain, FileText, Link2, Plus, Trash2 } from 'lucide-react';
import { Input, Select, Textarea } from '../UI/Input';
import { Combobox } from '../UI/Combobox';
import { Tabs } from '../UI/Tabs';
import { Button, IconButton } from '../UI/Button';
import { Switch } from '../UI/Switch';
import { ColorPicker } from './ColorPicker';
import { LinkPicker } from './CardLinks';
import { BoardTypeDef, CardDraft, FieldDef, PRIORITIES, newKey } from './boardConfig';

export type CardFormTab = 'geral' | 'clinico' | 'extras';

interface PatientOption { value: string; label: string }

interface CardFormProps {
  def: BoardTypeDef;
  draft: CardDraft;
  onChange: (patch: Partial<CardDraft>) => void;
  patientOptions: PatientOption[];
  tab: CardFormTab;
  onTab: (tab: CardFormTab) => void;
  titleError?: string;
  patientError?: string;
  /** Quando informado, mostra a opção "aplicar cor a todos da coluna". */
  applyToColumn?: boolean;
  onApplyToColumn?: (value: boolean) => void;
}

const CLINICAL_EXTRA: readonly { key: string; label: string }[] = [
  { key: 'history', label: 'Histórico clínico' },
  { key: 'objectives', label: 'Objetivos terapêuticos' },
  { key: 'interventions', label: 'Intervenções realizadas' },
  { key: 'next_steps', label: 'Próximos passos' },
  { key: 'observations', label: 'Observações' },
];

const TAB_GERAL = { id: 'geral', label: 'Dados', icon: FileText } as const;
const TAB_CLINICO = { id: 'clinico', label: 'Dados clínicos', icon: Brain } as const;
const TAB_EXTRAS = { id: 'extras', label: 'Checklist e vínculos', icon: Link2 } as const;
const TABS_BASE = [TAB_GERAL, TAB_EXTRAS] as const;
const TABS_CLINICO = [TAB_GERAL, TAB_CLINICO, TAB_EXTRAS] as const;

const getFieldValue = (draft: CardDraft, f: FieldDef): string => {
  if (f.root === 'amount') return draft.amount;
  if (f.root === 'due_date') return draft.due_date;
  if (f.root === 'assignee') return draft.assignee;
  const v = draft.details[f.key];
  return v === undefined || v === null ? '' : String(v);
};

/** Formulário de cartão: os campos mudam conforme o tipo do quadro. */
export const CardForm: React.FC<CardFormProps> = ({
  def, draft, onChange, patientOptions, tab, onTab, titleError, patientError, applyToColumn, onApplyToColumn,
}) => {
  const [newItem, setNewItem] = useState('');
  const isClinical = def.key === 'clinico';

  const setField = (f: FieldDef, value: string) => {
    if (f.root === 'amount') onChange({ amount: value });
    else if (f.root === 'due_date') onChange({ due_date: value });
    else if (f.root === 'assignee') onChange({ assignee: value });
    else onChange({ details: { ...draft.details, [f.key]: value } });
  };

  const renderField = (f: FieldDef) => {
    const value = getFieldValue(draft, f);
    const wrapperClassName = f.full ? 'sm:col-span-2' : undefined;
    switch (f.kind) {
      case 'textarea':
        return <Textarea key={f.key} wrapperClassName={wrapperClassName} label={f.label} rows={2} placeholder={f.placeholder} value={value} onChange={(e) => setField(f, e.target.value)} />;
      case 'select':
        return (
          <Select key={f.key} wrapperClassName={wrapperClassName} label={f.label} value={value} onChange={(e) => setField(f, e.target.value)}>
            <option value="">Selecione...</option>
            {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
        );
      case 'date':
        return <Input key={f.key} wrapperClassName={wrapperClassName} label={f.label} type="date" value={value.slice(0, 10)} onChange={(e) => setField(f, e.target.value)} />;
      case 'datetime':
        return <Input key={f.key} wrapperClassName={wrapperClassName} label={f.label} type="datetime-local" value={value.slice(0, 16)} onChange={(e) => setField(f, e.target.value)} />;
      case 'number':
        return <Input key={f.key} wrapperClassName={wrapperClassName} label={f.label} type="number" min={0} placeholder={f.placeholder} value={value} onChange={(e) => setField(f, e.target.value)} />;
      case 'money':
        return <Input key={f.key} wrapperClassName={wrapperClassName} label={f.label} type="number" min={0} step="0.01" placeholder="0,00" value={value} onChange={(e) => setField(f, e.target.value)} />;
      default:
        return <Input key={f.key} wrapperClassName={wrapperClassName} label={f.label} placeholder={f.placeholder} value={value} onChange={(e) => setField(f, e.target.value)} />;
    }
  };

  const typeFields = def.fields.filter(f => f.kind !== 'textarea');
  const textareaFields = def.fields.filter(f => f.kind === 'textarea');

  const addChecklistItem = () => {
    const text = newItem.trim();
    if (!text) return;
    onChange({ checklist: [...draft.checklist, { id: newKey(), text, done: false }] });
    setNewItem('');
  };

  const done = draft.checklist.filter(i => i.done).length;

  const geral = (
    <div className="space-y-3">
      <Input
        label={`Título`}
        required
        error={titleError}
        placeholder={def.titlePlaceholder}
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <div>
        <Combobox
          label={def.patientLabel}
          placeholder="Buscar paciente ativo..."
          options={patientOptions}
          value={draft.patientId}
          onChange={(val: any) => {
            const id = String(val || '');
            const opt = patientOptions.find(o => o.value === id);
            onChange({ patientId: id, patientName: opt?.label || '' });
          }}
          size="md"
        />
        {patientError && <p role="alert" className="mt-1 text-[11px] text-red-600">{patientError}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {typeFields.map(renderField)}
        {def.common.priority && (
          <Select label="Prioridade" value={draft.priority} onChange={(e) => onChange({ priority: e.target.value as CardDraft['priority'] })}>
            <option value="">Selecione...</option>
            {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        )}
        {def.common.assignee && !def.fields.some(f => f.root === 'assignee') && (
          <Input label={def.assigneeLabel} placeholder="Quem acompanha" value={draft.assignee} onChange={(e) => onChange({ assignee: e.target.value })} />
        )}
        {def.common.due && !def.fields.some(f => f.root === 'due_date') && (
          <Input label={def.dueLabel} type="date" value={draft.due_date.slice(0, 10)} onChange={(e) => onChange({ due_date: e.target.value })} />
        )}
      </div>

      {textareaFields.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{textareaFields.map(renderField)}</div>}

      <Textarea
        label={def.descriptionLabel}
        rows={3}
        placeholder="Detalhes adicionais..."
        value={draft.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />
      {def.common.tags && (
        <Input label="Etiquetas" placeholder="Separe por vírgula. Ex: urgente, retorno" value={draft.tags} onChange={(e) => onChange({ tags: e.target.value })} />
      )}

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <ColorPicker label="Cor do cartão" value={draft.color} onChange={(hex) => onChange({ color: hex })} allowNone />
        {onApplyToColumn && draft.color && (
          <Switch
            checked={!!applyToColumn}
            onCheckedChange={onApplyToColumn}
            label="Aplicar esta cor a todos os cartões da coluna"
          />
        )}
      </div>
    </div>
  );

  const clinico = (
    <div className="space-y-3">
      {CLINICAL_EXTRA.map(f => (
        <Textarea
          key={f.key}
          label={f.label}
          rows={3}
          value={String(draft.details[f.key] ?? '')}
          onChange={(e) => onChange({ details: { ...draft.details, [f.key]: e.target.value } })}
        />
      ))}
    </div>
  );

  const extras = (
    <div className="space-y-4">
      {def.common.checklist && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-slate-600">Checklist</div>
            {draft.checklist.length > 0 && <span className="text-[11px] text-slate-500">{done}/{draft.checklist.length} concluídos</span>}
          </div>
          {draft.checklist.length > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={draft.checklist.length} aria-valuenow={done} aria-label="Progresso do checklist">
              <div className="h-full rounded-full bg-primary-500" style={{ width: `${(done / draft.checklist.length) * 100}%` }} />
            </div>
          )}
          <ul className="space-y-1.5">
            {draft.checklist.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`Concluir: ${item.text}`}
                  onChange={(e) => onChange({ checklist: draft.checklist.map(i => (i.id === item.id ? { ...i, done: e.target.checked } : i)) })}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-primary-600"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={`Item ${index + 1} do checklist`}
                    value={item.text}
                    showCount={false}
                    onChange={(e) => onChange({ checklist: draft.checklist.map(i => (i.id === item.id ? { ...i, text: e.target.value } : i)) })}
                  />
                </div>
                <IconButton variant="danger" size="sm" aria-label="Remover item" onClick={() => onChange({ checklist: draft.checklist.filter(i => i.id !== item.id) })}><Trash2 size={14} /></IconButton>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                aria-label="Novo item do checklist"
                placeholder="Novo item..."
                value={newItem}
                showCount={false}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={addChecklistItem}>Adicionar</Button>
          </div>
        </div>
      )}
      <LinkPicker
        patientId={draft.patientId}
        patientName={draft.patientName}
        allowed={def.links}
        links={draft.links}
        onChange={(links) => onChange({ links })}
      />
    </div>
  );

  const items = isClinical ? TABS_CLINICO : TABS_BASE;
  return (
    <Tabs<CardFormTab> items={items} value={tab} onChange={onTab} label="Seções do cartão">
      <div className="pt-3">{tab === 'geral' ? geral : tab === 'clinico' ? clinico : extras}</div>
    </Tabs>
  );
};
