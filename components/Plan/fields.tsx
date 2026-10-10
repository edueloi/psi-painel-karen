import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Alert, Badge, Button, EmptyState, Select } from '../UI';
import { MARK_LABEL, SECTION_MARK_OPTIONS, SECTIONS, type Opt, type PlanV2, type SectionId, type SectionMark } from './model';

/** Atualiza o v2 de forma imutável. */
export type PatchV2 = (fn: (v: PlanV2) => PlanV2) => void;

export interface SectionProps {
  v2: PlanV2;
  patch: PatchV2;
  /** Texto de apoio para vincular sessões (registros do prontuário). */
  sessions: SessionRef[];
}

export interface SessionRef { id: string; title: string; date: string; type: string }

/** Opções com o vazio rotulado como "Não informado". */
export const withEmpty = (opts: Opt[], emptyLabel = 'Não informado'): Opt[] => [{ value: '', label: emptyLabel }, ...opts];

export const OptSelect: React.FC<{
  label: string; value: string; onChange: (v: string) => void; options: Opt[]; emptyLabel?: string | null; hint?: string; disabled?: boolean;
}> = ({ label, value, onChange, options, emptyLabel = 'Não informado', hint, disabled }) => (
  <Select label={label} value={value} onChange={e => onChange(e.target.value)} hint={hint} disabled={disabled}>
    {emptyLabel !== null && <option value="">{emptyLabel}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </Select>
);

/** Seleção múltipla em chips (toggle). */
export const ChipMulti: React.FC<{
  label: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; hint?: string;
}> = ({ label, options, value, onChange, hint }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <span className="ds-label" id={`chips-${label}`}>{label}</span>
    <div role="group" aria-labelledby={`chips-${label}`} className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on}
            onClick={() => onChange(on ? value.filter(v => v !== o.value) : [...value, o.value])}
            className={cn('min-h-[32px] rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-primary-500',
              on ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50/50')}>
            {o.label}
          </button>
        );
      })}
    </div>
    {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
  </div>
);

export const Grid: React.FC<{ children: React.ReactNode; cols?: 1 | 2 | 3; className?: string }> = ({ children, cols = 2, className }) => (
  <div className={cn('grid grid-cols-1 gap-3', cols >= 2 && 'sm:grid-cols-2', cols === 3 && 'xl:grid-cols-3', className)}>{children}</div>
);

export const Span: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="sm:col-span-2 xl:col-span-full min-w-0">{children}</div>;

/** Cartão recolhível para itens de lista (objetivo, estratégia, tarefa...). */
export const ItemCard: React.FC<{
  title: string; subtitle?: string; badges?: React.ReactNode; defaultOpen?: boolean;
  onRemove: () => void; removeLabel?: string; children: React.ReactNode;
}> = ({ title, subtitle, badges, defaultOpen = false, onRemove, removeLabel = 'Remover item', children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-primary-500">
        {open ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-slate-800">{title}</span>
          {subtitle && <span className="block truncate text-[11px] text-slate-500">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">{badges}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {children}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {confirm ? (
              <>
                <span className="text-[11px] text-slate-500">Remover este item do plano? As versões anteriores continuam preservadas.</span>
                <Button type="button" size="xs" variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button>
                <Button type="button" size="xs" variant="danger" onClick={onRemove}>Confirmar remoção</Button>
              </>
            ) : (
              <Button type="button" size="xs" variant="softDanger" iconLeft={<Trash2 size={13} />} onClick={() => setConfirm(true)}>{removeLabel}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ListHeader: React.FC<{ count: number; noun: string; onAdd: () => void; addLabel?: string; extra?: React.ReactNode }> = ({ count, noun, onAdd, addLabel = 'Adicionar', extra }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <p className="text-xs text-slate-500">{count} {noun}</p>
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      <Button type="button" size="sm" iconLeft={<Plus size={14} />} onClick={onAdd}>{addLabel}</Button>
    </div>
  </div>
);

export const Empty: React.FC<{ icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <EmptyState icon={icon} title={title} description={description} action={action} />
);

export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-[11px] leading-relaxed text-slate-500">{children}</p>;

/** Moldura de uma seção: título, descrição e marcação "Não informado / Não se aplica / Ainda não avaliado". */
export const SectionShell: React.FC<{
  id: SectionId; v2: PlanV2; patch: PatchV2; icon: React.ElementType; children: React.ReactNode; actions?: React.ReactNode;
}> = ({ id, v2, patch, icon: Icon, children, actions }) => {
  const meta = SECTIONS.find(s => s.id === id)!;
  const mark = (v2.marks[id] || '') as SectionMark;
  return (
    <section className="min-w-0 space-y-3" aria-labelledby={`sec-${id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50">
            <Icon size={14} className="text-primary-600" />
          </div>
          <div className="min-w-0">
            <h3 id={`sec-${id}`} className="text-sm font-medium text-slate-900">{meta.n}. {meta.label}</h3>
            <p className="text-xs text-slate-500">{meta.hint}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {actions}
          <Select aria-label="Situação do preenchimento da seção" wrapperClassName="w-48" value={mark}
            onChange={e => patch(v => ({ ...v, marks: { ...v.marks, [id]: e.target.value as SectionMark } }))}>
            {SECTION_MARK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>
      {mark && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="warning">{MARK_LABEL[mark]}</Badge>
          <span className="text-[11px] text-slate-500">A seção está marcada assim; você ainda pode preencher os campos abaixo se quiser.</span>
        </div>
      )}
      {children}
    </section>
  );
};

export const EthicsNote: React.FC<{ children: React.ReactNode; variant?: 'info' | 'warning' }> = ({ children, variant = 'info' }) => (
  <Alert variant={variant}>{children}</Alert>
);

export function update<T extends { id: string }>(list: T[], id: string, changes: Partial<T>): T[] {
  return list.map(i => (i.id === id ? { ...i, ...changes } : i));
}
export const remove = <T extends { id: string }>(list: T[], id: string) => list.filter(i => i.id !== id);
