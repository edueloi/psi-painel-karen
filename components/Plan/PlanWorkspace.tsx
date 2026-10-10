import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, History, Info, Save } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Alert, Badge, Button, Input, PanelCard, Tabs } from '../UI';
import {
  ORIGIN_OPTIONS, SECTIONS, addVersion, ensurePlanV2, formatDateTime, migrateLegacy, normalizeV2, sectionProgress, snapshotOf, syncLinks, uid,
  type PlanV2, type SectionId, type TheraPlan,
} from './model';
import { BarriersSection, IndicatorsSection, TasksSection } from './SectionsB';
import { ObjectivesSection, OverviewSection, StrategiesSection } from './SectionsA';
import { DischargeSection, NotesSection, ParticipationSection, ReviewsSection } from './SectionsC';
import { AIPanel, SummaryPanel } from './Panels';
import { HistoryModal } from './HistoryModal';
import { suggestFromSession, suggestionsFromAI, stripHtml, type PlanSuggestion, type SessionContext } from './suggestions';
import type { SessionRef } from './fields';

export interface PlanEditorProps {
  plan: TheraPlan;
  onChange: (updater: TheraPlan | ((prev: TheraPlan) => TheraPlan)) => void;
  patientId: string;
  recordId?: string;
  /** Rodapé fixo: os botões só aparecem quando o handler correspondente é informado. */
  onCancel?: () => void;
  onSaveDraft?: () => void | Promise<void>;
  onSaveContinue?: () => void | Promise<void>;
  saving?: boolean;
  /** Sessão recém-salva: gera sugestões (nunca aplicadas sem aprovação). Ver suggestions.ts. */
  sessionContext?: SessionContext;
}

interface SourceRecord {
  id: number | string; title: string; record_type: string; created_at: string; content_preview?: string; ai_organized_content?: string | null;
}

const NAV_TABS = SECTIONS.map(s => ({ id: s.id, label: `${s.n}. ${s.short}` })) as ReadonlyArray<{ id: SectionId; label: string }>;
const PANE_BASE = [
  { id: 'secao', label: 'Seção' },
  { id: 'ia', label: 'Assistente IA' },
  { id: 'resumo', label: 'Resumo e origem' },
] as const;
type Pane = typeof PANE_BASE[number]['id'];

function useIsDesktop() {
  const query = '(min-width: 1280px)';
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

function recordText(r: SourceRecord): string {
  let extra = '';
  if (r.ai_organized_content) {
    try {
      const obj = JSON.parse(r.ai_organized_content);
      if (obj && typeof obj === 'object' && !obj.v2 && !obj.approach) extra = Object.values(obj).filter(v => typeof v === 'string').join(' ');
    } catch { /* ignora */ }
  }
  return stripHtml(`${r.content_preview || ''} ${extra}`);
}

export const PlanWorkspace: React.FC<PlanEditorProps> = ({
  plan, onChange, patientId, onCancel, onSaveDraft, onSaveContinue, saving, sessionContext,
}) => {
  const { user } = useAuth() as { user?: { name?: string } | null };
  const { pushToast } = useToast();
  const author = user?.name || '';
  const isDesktop = useIsDesktop();
  const editSession = useRef(uid()).current;

  const [active, setActive] = useState<SectionId>('overview');
  const [pane, setPane] = useState<Pane>('secao');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [analyzed, setAnalyzed] = useState<number | null>(null);

  const legacy = !plan.v2;
  const v2: PlanV2 = useMemo(() => (plan.v2 ? normalizeV2(plan.v2, author) : migrateLegacy(plan, author)), [plan, author]);

  /** Único ponto de escrita: migra se preciso, preserva o estado anterior ao 1º edit da sessão e carimba autoria. */
  const patch = useCallback((fn: (v: PlanV2) => PlanV2) => {
    onChange(prev => {
      const base = ensurePlanV2(prev, author).v2 as PlanV2;
      let next = syncLinks(fn(base));
      if (base.meta.updated_at && base.meta.edit_session !== editSession) {
        const last = base.versions[base.versions.length - 1];
        const baseSnap = snapshotOf(base);
        if (!last || JSON.stringify(last.snapshot) !== JSON.stringify(baseSnap)) {
          next = addVersion(next, 'auto', 'Estado anterior à edição', base.meta.updated_by || '', baseSnap, base.meta.updated_at).v2;
        }
      }
      next = { ...next, meta: { ...next.meta, updated_at: new Date().toISOString(), updated_by: author || next.meta.updated_by, edit_session: editSession } };
      return { ...prev, v2: next, summary: next.overview.general_objective || prev.summary };
    });
  }, [onChange, author, editSession]);

  /* Registros do paciente (apenas leitura; usa a rota existente e suas permissões) */
  useEffect(() => {
    let cancelled = false;
    setSources([]); setSuggestions([]); setAnalyzed(null);
    if (!patientId) return;
    api.get<{ records: SourceRecord[] }>(`/therapeutic-plans/patient/${patientId}/sources`)
      .then(r => { if (!cancelled) setSources(Array.isArray(r?.records) ? r.records : []); })
      .catch(() => { if (!cancelled) setSources([]); });
    return () => { cancelled = true; };
  }, [patientId]);

  const sessions: SessionRef[] = useMemo(() => sources.map(r => ({
    id: String(r.id), title: r.title || '', type: r.record_type || '', date: r.created_at ? String(r.created_at).slice(0, 10) : '',
  })), [sources]);

  const pending = useMemo(() => suggestions.filter(s => !v2.dismissed.includes(s.id)), [suggestions, v2.dismissed]);

  const mergeSuggestions = useCallback((list: PlanSuggestion[]) => {
    setSuggestions(prev => [...prev, ...list.filter(n => !prev.some(p => p.id === n.id))]);
  }, []);

  useEffect(() => {
    if (!sessionContext) return;
    mergeSuggestions(suggestFromSession(v2, sessionContext));
    setAnalyzed(a => (a ?? 0) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionContext?.id]);

  const analyze = () => {
    const list = sources.filter(r => r.record_type !== 'Plano').slice(0, 15);
    const found = list.flatMap(r => suggestFromSession(v2, { id: String(r.id), date: String(r.created_at || '').slice(0, 10), label: r.title || r.record_type, text: recordText(r) }));
    mergeSuggestions(found);
    setAnalyzed(list.length);
    if (!found.length) pushToast('info', 'Nenhuma sugestão nova nos registros analisados.');
  };

  const generateAI = async () => {
    if (!patientId) return;
    setAiLoading(true); setAiError('');
    try {
      const resp = await api.post<{ suggestion?: Record<string, unknown> }>('/therapeutic-plans/ai-suggest', {
        patient_id: patientId, approach: plan.approach || 'TCC', current_plan: { summary: v2.overview.general_objective },
      });
      const list = resp?.suggestion ? suggestionsFromAI(v2, resp.suggestion) : [];
      mergeSuggestions(list);
      setAnalyzed(sources.length);
      pushToast('info', list.length ? 'Sugestões geradas. Revise cada uma antes de aceitar.' : 'A IA não trouxe nada novo.');
    } catch (e: any) {
      setAiError(e?.response?.data?.error || e?.message || 'Não foi possível gerar sugestões agora.');
    } finally { setAiLoading(false); }
  };

  const applySuggestion = (s: PlanSuggestion, text: string) => {
    patch(v => s.apply(v, text));
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    pushToast('success', 'Sugestão aplicada ao plano.');
  };
  const dismissSuggestion = (s: PlanSuggestion) => {
    patch(v => ({ ...v, dismissed: [...v.dismissed, s.id] }));
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
  };

  const common = { v2, patch, sessions };
  const renderSection = () => {
    switch (active) {
      case 'overview': return <OverviewSection {...common} />;
      case 'objectives': return <ObjectivesSection {...common} />;
      case 'strategies': return <StrategiesSection {...common} />;
      case 'tasks': return <TasksSection {...common} />;
      case 'indicators': return <IndicatorsSection {...common} />;
      case 'barriers': return <BarriersSection {...common} />;
      case 'reviews': return <ReviewsSection {...common} author={author} />;
      case 'discharge': return <DischargeSection {...common} />;
      case 'participation': return <ParticipationSection {...common} />;
      default: return <NotesSection {...common} />;
    }
  };

  const idx = SECTIONS.findIndex(s => s.id === active);
  const goNext = () => { if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id); };
  const saveContinue = async () => {
    if (onSaveContinue) await onSaveContinue();
    goNext();
  };

  /* Origem das informações */
  const originBox = (
    <PanelCard title="Origem das informações" description="De onde partem os dados deste plano.">
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Origem das informações</legend>
        {ORIGIN_OPTIONS.map(o => (
          <label key={o.value} className="flex min-h-[32px] cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-primary-600" checked={v2.origins.includes(o.value)}
              onChange={e => patch(v => ({ ...v, origins: e.target.checked ? [...v.origins, o.value] : v.origins.filter(x => x !== o.value) }))} />
            {o.label}
          </label>
        ))}
        {v2.origins.includes('outro') && (
          <Input aria-label="Outra origem (especificar)" placeholder="Especifique" value={v2.origin_other} onChange={e => patch(v => ({ ...v, origin_other: e.target.value }))} />
        )}
      </fieldset>
    </PanelCard>
  );

  const nav = (
    <PanelCard title="Plano terapêutico" contentClassName="p-1.5">
      <nav aria-label="Seções do plano terapêutico">
        <ul className="space-y-0.5">
          {SECTIONS.map(s => {
            const p = sectionProgress(v2, s.id);
            const on = s.id === active;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setActive(s.id)} aria-current={on ? 'page' : undefined}
                  className={cn('flex min-h-[36px] w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-primary-500',
                    on ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-700 hover:bg-slate-50')}>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                    p.status === 'preenchido' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : on ? 'border-primary-300 bg-white text-primary-700' : 'border-slate-200 bg-white text-slate-500')}>
                    {p.status === 'preenchido' ? <CheckCircle2 size={12} aria-label="Preenchido" /> : s.n}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  {on && <ChevronRight size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </PanelCard>
  );

  const aiPanel = (
    <AIPanel suggestions={pending} loading={aiLoading} canAnalyze={!!patientId} analyzedCount={analyzed}
      onAnalyze={analyze} onGenerateAI={generateAI} onApply={applySuggestion} onDismiss={dismissSuggestion} error={aiError} />
  );
  const summary = <SummaryPanel v2={v2} active={active} onSelect={id => { setActive(id); setPane('secao'); }} />;

  const center = (
    <div className="min-w-0 space-y-3">
      {legacy && (
        <Alert variant="info" title="Plano no formato anterior">
          O conteúdo foi convertido para a nova estrutura e nada foi descartado. Trechos sem campo equivalente estão em “Observações adicionais”. A conversão é gravada quando você salvar.
        </Alert>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-3 lg:p-4" key={active}>{renderSection()}</div>
    </div>
  );

  const paneTabs = PANE_BASE.map(p => (p.id === 'ia' && pending.length ? { ...p, badge: pending.length } : p));

  const meta = v2.meta;
  const footer = (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
      <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
        <Info size={12} className="shrink-0" />
        <span className="truncate">{meta.updated_at ? `Última atualização ${formatDateTime(meta.updated_at)}${meta.updated_by ? ` por ${meta.updated_by}` : ''}` : 'Plano ainda não salvo nesta versão'}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        {onSaveDraft && <Button type="button" size="sm" variant="outline" iconLeft={<Save size={14} />} loading={saving} onClick={() => onSaveDraft()}>Salvar rascunho</Button>}
        {onSaveContinue && <Button type="button" size="sm" iconRight={<ChevronRight size={14} />} loading={saving} onClick={saveContinue}>Salvar e continuar</Button>}
        {!onSaveContinue && idx < SECTIONS.length - 1 && (
          <Button type="button" size="sm" variant="outline" iconRight={<ChevronRight size={14} />} onClick={goNext}>Próxima seção</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Plano construído de forma colaborativa, com sugestões apenas mediante sua aprovação.</p>
        <Button type="button" size="sm" variant="outline" iconLeft={<History size={14} />} onClick={() => setHistoryOpen(true)}>
          Ver histórico{v2.versions.length ? ` (${v2.versions.length})` : ''}
        </Button>
      </div>

      {isDesktop ? (
        <div className="grid grid-cols-[240px_minmax(0,1fr)_320px] items-start gap-3">
          <div className="sticky top-2 space-y-3">{nav}{originBox}</div>
          {center}
          <div className="space-y-3">{aiPanel}{summary}</div>
        </div>
      ) : (
        <div className="space-y-3">
          <Tabs<SectionId> items={NAV_TABS} value={active} onChange={id => { setActive(id); setPane('secao'); }} label="Seções do plano terapêutico" />
          <Tabs<Pane> items={paneTabs} value={pane} onChange={setPane} label="Painéis do plano" />
          {pane === 'secao' && center}
          {pane === 'ia' && aiPanel}
          {pane === 'resumo' && <div className="space-y-3">{summary}{originBox}</div>}
        </div>
      )}

      {footer}
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} v2={v2}
        onCreateVersion={() => { patch(v => addVersion(v, 'manual', 'Versão criada manualmente', author || 'Profissional').v2); pushToast('success', 'Versão criada.'); }} />
    </div>
  );
};
