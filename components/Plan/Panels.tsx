import React, { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Pencil, Sparkles, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Alert, Badge, Button, EmptyState, PanelCard, Textarea } from '../UI';
import { SECTIONS, STATUS_LABEL, formatDate, sectionProgress, type PlanV2, type SectionId } from './model';
import type { PlanSuggestion } from './suggestions';

/* ───────────── Assistente IA ───────────── */
const SuggestionCard: React.FC<{
  s: PlanSuggestion; onApply: (s: PlanSuggestion, text: string) => void; onDismiss: (s: PlanSuggestion) => void;
}> = ({ s, onApply, onDismiss }) => {
  const [showOrigin, setShowOrigin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(s.proposed);
  const sec = SECTIONS.find(x => x.id === s.section);
  const verb = s.action === 'update' ? 'Atualizar' : 'Adicionar';
  return (
    <article className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-white p-3" aria-label={s.title}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color={s.action === 'update' ? 'info' : 'primary'}>{s.action === 'update' ? 'Atualização' : 'Novo item'}</Badge>
        <Badge>{sec ? `${sec.n}. ${sec.short}` : ''}</Badge>
        <Badge color="warning">Sugestão</Badge>
      </div>
      <h4 className="text-xs font-medium text-slate-800">{s.title}</h4>
      <div>
        <p className="text-[11px] text-slate-500">Informação identificada</p>
        <p className="border-l-2 border-primary-200 pl-2 text-xs italic text-slate-700 break-words">“{s.identified}”</p>
      </div>
      {showOrigin && (
        <dl className="space-y-1.5 rounded-md bg-slate-50 p-2 text-xs">
          <div><dt className="text-[11px] text-slate-500">Sessão/registro de origem</dt><dd className="text-slate-800">{s.origin.label}{s.origin.date ? ` — ${formatDate(s.origin.date)}` : ''}</dd></div>
          <div><dt className="text-[11px] text-slate-500">Campo relacionado</dt><dd className="text-slate-800">{s.field}</dd></div>
          <div><dt className="text-[11px] text-slate-500">Justificativa</dt><dd className="text-slate-800">{s.justification}</dd></div>
        </dl>
      )}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="min-w-0"><p className="text-[11px] text-slate-500">Texto atual</p><p className="whitespace-pre-wrap break-words text-slate-700">{s.current}</p></div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">Texto proposto</p>
          {editing
            ? <Textarea aria-label="Editar texto proposto" rows={3} value={text} onChange={e => setText(e.target.value)} />
            : <p className="whitespace-pre-wrap break-words font-medium text-slate-900">{text || '(vazio)'}</p>}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Nada é alterado no plano até você aprovar.</p>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="xs" iconLeft={<Check size={12} />} onClick={() => onApply(s, text)} disabled={!text.trim() && s.action === 'add'}>{verb}</Button>
        <Button type="button" size="xs" variant="outline" iconLeft={<Pencil size={12} />} onClick={() => setEditing(e => !e)}>{editing ? 'Concluir edição' : 'Editar'}</Button>
        <Button type="button" size="xs" variant="ghost" iconLeft={showOrigin ? <EyeOff size={12} /> : <Eye size={12} />} onClick={() => setShowOrigin(o => !o)}>Ver origem</Button>
        <Button type="button" size="xs" variant="ghost" iconLeft={<X size={12} />} onClick={() => onDismiss(s)}>Dispensar</Button>
      </div>
    </article>
  );
};

export const AIPanel: React.FC<{
  suggestions: PlanSuggestion[];
  loading: boolean;
  canAnalyze: boolean;
  analyzedCount: number | null;
  onAnalyze: () => void;
  onGenerateAI: () => void;
  onApply: (s: PlanSuggestion, text: string) => void;
  onDismiss: (s: PlanSuggestion) => void;
  error?: string;
}> = ({ suggestions, loading, canAnalyze, analyzedCount, onAnalyze, onGenerateAI, onApply, onDismiss, error }) => (
  <PanelCard title="Assistente IA" icon={Sparkles} description="Sugestões a partir dos registros do prontuário. Você decide o que entra no plano."
    action={
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="xs" variant="outline" onClick={onAnalyze} disabled={!canAnalyze || loading}>Analisar sessões</Button>
        <Button type="button" size="xs" loading={loading} onClick={onGenerateAI} disabled={!canAnalyze}>Gerar com IA</Button>
      </div>
    } contentClassName="space-y-2">
    {error && <Alert variant="error">{error}</Alert>}
    {!canAnalyze && <Alert variant="info">Salve o registro e selecione o paciente para habilitar as sugestões.</Alert>}
    {analyzedCount !== null && suggestions.length === 0 && !loading && (
      <EmptyState title="Nenhuma sugestão pendente" description={`${analyzedCount} registro(s) analisado(s). Nada novo identificado para o plano.`} />
    )}
    {analyzedCount === null && suggestions.length === 0 && canAnalyze && (
      <p className="text-xs text-slate-500">Use “Analisar sessões” para uma checagem local por palavras-chave ou “Gerar com IA” para uma proposta mais completa. Sugestões são hipóteses de trabalho, não conclusões.</p>
    )}
    <div className="space-y-2">
      {suggestions.map(s => <SuggestionCard key={s.id} s={s} onApply={onApply} onDismiss={onDismiss} />)}
    </div>
  </PanelCard>
);

/* ───────────── Resumo da seção ───────────── */
export const SummaryPanel: React.FC<{ v2: PlanV2; active: SectionId; onSelect: (id: SectionId) => void }> = ({ v2, active, onSelect }) => {
  const rows = useMemo(() => SECTIONS.map(s => ({ s, p: sectionProgress(v2, s.id) })), [v2]);
  const cur = rows.find(r => r.s.id === active)!;
  const doneAll = rows.reduce((n, r) => n + r.p.done, 0);
  const totalAll = rows.reduce((n, r) => n + r.p.total, 0);
  const color = (st: string) => (st === 'preenchido' ? 'success' : st === 'andamento' ? 'warning' : 'default') as 'success' | 'warning' | 'default';
  return (
    <PanelCard title="Resumo da seção" description="Indicador de preenchimento do formulário, não de evolução clínica.">
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">{cur.s.n}. {cur.s.short}</span>
            <span className="text-slate-500">{cur.p.done} de {cur.p.total} itens</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={cur.p.total} aria-valuenow={cur.p.done} aria-label="Preenchimento da seção">
            <div className="h-full bg-primary-600" style={{ width: `${cur.p.total ? (cur.p.done / cur.p.total) * 100 : 0}%` }} />
          </div>
        </div>
        <ul className="space-y-0.5">
          {rows.map(({ s, p }) => (
            <li key={s.id}>
              <button type="button" onClick={() => onSelect(s.id)} aria-current={s.id === active ? 'true' : undefined}
                className={cn('flex min-h-[32px] w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-slate-50 focus-visible:outline-primary-500', s.id === active && 'bg-primary-50')}>
                <span className="min-w-0 truncate text-slate-700">{s.n}. {s.short}</span>
                <Badge color={color(p.status)}>{p.mark ? 'Marcada' : STATUS_LABEL[p.status]}</Badge>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">Plano completo: {doneAll} de {totalAll} itens preenchidos.</p>
      </div>
    </PanelCard>
  );
};
