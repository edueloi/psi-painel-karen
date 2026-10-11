import React, { useMemo, useState } from 'react';
import {
  CalendarCheck, CalendarClock, CalendarOff, CalendarRange, ChevronDown, ChevronRight, Coffee, Flag, MapPin, Moon, Pencil, Plane, Plus, Trash2,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { StatGrid, ContentCard } from '../UI/PageWrapper';
import { StatCard } from '../UI/StatCard';
import { Button, IconButton } from '../UI/Button';
import { Badge } from '../UI/Badge';
import { Tabs } from '../UI/Tabs';
import { EmptyState } from '../UI/EmptyState';
import { ConfirmModal } from '../UI/Modal';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented } from '../UI/FilterLine';
import { BlockPeriodModal, ScheduleDayLite } from './BlockPeriodModal';
import { HolidaysModal } from './HolidaysModal';
import {
  ClosedEntry, ClosedItem, ClosedType, CLOSED_TYPE_LABEL, MAX_CLOSED_ITEMS, MONTHS, WEEKDAYS_SHORT,
  dedupeClosed, formatBR, formatShort, fromISO, groupClosed, isAllDay, periodText, todayISO,
} from '../../src/lib/closedDates';

interface Props {
  closedDates: ClosedEntry[];
  schedule: ScheduleDayLite[];
  professionalId?: number | string | null;
  /** Persiste a lista completa (PUT /profile/me/schedule). Deve lançar erro em caso de falha. */
  onPersist: (next: ClosedEntry[]) => Promise<void>;
}

type TypeFilter = 'all' | 'ferias' | 'feriados' | 'facultativos' | 'folgas';
const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'ferias', label: 'Férias' },
  { value: 'feriados', label: 'Feriados' },
  { value: 'facultativos', label: 'Facultativos' },
  { value: 'folgas', label: 'Folgas' },
] as { value: TypeFilter; label: string }[];

const TYPE_STYLE: Record<ClosedType, { badge: React.ComponentProps<typeof Badge>['color']; icon: React.ElementType; tile: string }> = {
  ferias: { badge: 'primary', icon: Plane, tile: 'bg-primary-50 text-primary-600' },
  feriado_nacional: { badge: 'danger', icon: Flag, tile: 'bg-red-50 text-red-600' },
  feriado_local: { badge: 'orange', icon: MapPin, tile: 'bg-orange-50 text-orange-600' },
  facultativo: { badge: 'warning', icon: CalendarClock, tile: 'bg-yellow-50 text-yellow-700' },
  folga: { badge: 'purple', icon: Coffee, tile: 'bg-violet-50 text-violet-600' },
  recesso: { badge: 'teal', icon: Moon, tile: 'bg-teal-50 text-teal-600' },
  outro: { badge: 'default', icon: CalendarOff, tile: 'bg-slate-100 text-slate-500' },
};

const matchesFilter = (t: ClosedType, f: TypeFilter) => {
  if (f === 'all') return true;
  if (f === 'ferias') return t === 'ferias';
  if (f === 'feriados') return t === 'feriado_nacional' || t === 'feriado_local';
  if (f === 'facultativos') return t === 'facultativo';
  return t === 'folga' || t === 'recesso' || t === 'outro';
};

type Pending =
  | { kind: 'delete'; items: ClosedItem[] }
  | { kind: 'deleteDay'; entry: ClosedEntry }
  | { kind: 'edit'; item: ClosedItem };

export function ClosedDatesPanel({ closedDates, schedule, professionalId, onPersist }: Props) {
  const { pushToast } = useToast();
  const today = todayISO();
  const thisYear = new Date().getFullYear();

  const [yearTab, setYearTab] = useState<string>(String(thisYear));
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [blockOpen, setBlockOpen] = useState(false);
  const [editing, setEditing] = useState<ClosedItem | null>(null);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => groupClosed(closedDates), [closedDates]);

  const years = useMemo(() => {
    const set = new Set<number>([thisYear, thisYear + 1]);
    items.forEach(i => set.add(Number(i.start.slice(0, 4))));
    const all = Array.from(set);
    const future = all.filter(y => y >= thisYear).sort((a, b) => a - b);
    const past = all.filter(y => y < thisYear).sort((a, b) => b - a);
    return [...future, ...past];
  }, [items, thisYear]);

  const tabItems = useMemo(() => years.map(y => ({
    id: String(y),
    label: y === thisYear ? `${y} (atual)` : y < thisYear ? `${y} · registro` : String(y),
    icon: y < thisYear ? CalendarRange : CalendarCheck,
    badge: items.filter(i => i.start.startsWith(String(y))).length || undefined,
  })), [years, items, thisYear]);

  const yearNum = Number(yearTab);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => {
      if (!i.start.startsWith(yearTab)) return false;
      if (!matchesFilter(i.type, typeFilter)) return false;
      if (!q) return true;
      return `${i.label} ${CLOSED_TYPE_LABEL[i.type]} ${formatBR(i.start)} ${formatBR(i.end)}`.toLowerCase().includes(q);
    });
  }, [items, yearTab, typeFilter, query]);

  const byMonth = useMemo(() => {
    const map = new Map<string, ClosedItem[]>();
    visible.forEach(i => { const k = i.start.slice(0, 7); map.set(k, [...(map.get(k) || []), i]); });
    return Array.from(map.entries());
  }, [visible]);

  // Resumo do ano atual
  const stats = useMemo(() => {
    const cur = closedDates.filter(e => e.date.startsWith(String(thisYear)));
    const fullDays = new Set(cur.filter(isAllDay).map(e => e.date)).size;
    const partial = cur.filter(e => !isAllDay(e)).length;
    const next = items.find(i => i.end >= today);
    return { fullDays, partial, next };
  }, [closedDates, items, thisYear, today]);

  const blockedAllDay = useMemo(() => new Set(closedDates.filter(isAllDay).map(e => e.date)), [closedDates]);

  const persist = async (remove: ClosedEntry[], add: ClosedEntry[], okMsg: string) => {
    const rem = new Set(remove);
    const next = dedupeClosed([...closedDates.filter(e => !rem.has(e)), ...add]);
    if (next.length > MAX_CLOSED_ITEMS) { pushToast('error', `Limite de ${MAX_CLOSED_ITEMS} bloqueios atingido.`); throw new Error('limit'); }
    try { await onPersist(next); pushToast('success', okMsg); }
    catch (e: any) { pushToast('error', e?.message || 'Não foi possível salvar os bloqueios.'); throw e; }
  };

  const isPast = (i: ClosedItem) => i.end < today;
  const openNew = () => { setEditing(null); setBlockOpen(true); };
  const startEdit = (i: ClosedItem) => { if (isPast(i)) setPending({ kind: 'edit', item: i }); else { setEditing(i); setBlockOpen(true); } };
  const toggleSel = (key: string) => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleExp = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectedItems = visible.filter(i => selected.has(i.key));

  const confirmPending = async () => {
    if (!pending) return;
    if (pending.kind === 'edit') { setEditing(pending.item); setBlockOpen(true); setPending(null); return; }
    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        const entries = pending.items.flatMap(i => i.entries);
        await persist(entries, [], pending.items.length === 1 ? 'Bloqueio removido.' : `${pending.items.length} bloqueios removidos.`);
        setSelected(new Set());
      } else {
        await persist([pending.entry], [], 'Dia removido do período.');
      }
      setPending(null);
    } catch { /* toast já exibido */ } finally { setBusy(false); }
  };

  const pendingMessage = (() => {
    if (!pending) return '';
    if (pending.kind === 'edit') return 'Este bloqueio é de um período que já passou e faz parte do seu registro. Deseja editá-lo mesmo assim?';
    if (pending.kind === 'deleteDay') return `Remover o dia ${formatBR(pending.entry.date)} (${pending.entry.label || 'bloqueio'}) do período? Os demais dias continuam bloqueados.`;
    const n = pending.items.length;
    const past = pending.items.some(isPast);
    const days = pending.items.reduce((s, i) => s + i.count, 0);
    return `${n === 1 ? `Excluir "${pending.items[0].label || CLOSED_TYPE_LABEL[pending.items[0].type]}"` : `Excluir ${n} bloqueios`} (${days} ${days === 1 ? 'dia' : 'dias'})? Os horários voltam a ficar disponíveis na agenda.${past ? ' Atenção: inclui períodos que já passaram (registro).' : ''}`;
  })();

  const renderRow = (i: ClosedItem) => {
    const style = TYPE_STYLE[i.type];
    const Icon = style.icon;
    const past = isPast(i);
    const open = expanded.has(i.key);
    const wd = !i.isGroup || i.count === 1 ? ` · ${WEEKDAYS_SHORT[fromISO(i.start).getDay()]}` : '';
    return (
      <li key={i.key} className={past ? 'bg-slate-50/60' : ''}>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <input type="checkbox" aria-label={`Selecionar ${i.label || CLOSED_TYPE_LABEL[i.type]}`} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--c-600)]"
            checked={selected.has(i.key)} onChange={() => toggleSel(i.key)} />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.tile}`}><Icon size={15} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`truncate text-[13px] font-medium ${past ? 'text-slate-500' : 'text-slate-800'}`}>{i.label || CLOSED_TYPE_LABEL[i.type]}</span>
              <Badge color={style.badge}>{CLOSED_TYPE_LABEL[i.type]}</Badge>
              {i.partial && <Badge color="default" icon={<CalendarClock size={10} />}>Horário</Badge>}
              {past && <Badge color="default">Registro</Badge>}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">{periodText(i)}{wd} · {i.source === 'auto' ? 'Automático' : 'Manual'}</p>
          </div>
          <div className="flex shrink-0 items-center">
            {i.isGroup && i.count > 1 && (
              <IconButton aria-label={open ? 'Ocultar dias' : 'Ver dias do período'} aria-expanded={open} size="sm" onClick={() => toggleExp(i.key)}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </IconButton>
            )}
            <IconButton aria-label="Editar bloqueio" size="sm" onClick={() => startEdit(i)}><Pencil size={14} /></IconButton>
            <IconButton aria-label="Excluir bloqueio" size="sm" onClick={() => setPending({ kind: 'delete', items: [i] })}><Trash2 size={14} /></IconButton>
          </div>
        </div>
        {open && (
          <ul className="mb-2 ml-14 mr-3 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
            {i.entries.map(e => (
              <li key={`${e.date}|${e.from || ''}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="text-xs text-slate-600">{formatBR(e.date)} · {WEEKDAYS_SHORT[fromISO(e.date).getDay()]}{!isAllDay(e) ? ` · das ${e.from} às ${e.to}` : ''}</span>
                <IconButton aria-label={`Remover ${formatBR(e.date)} do período`} size="sm" onClick={() => setPending({ kind: 'deleteDay', entry: e })}><Trash2 size={13} /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-slate-900">Férias, feriados e folgas</h2>
            <p className="mt-0.5 text-xs text-slate-500">Dias e horários em que você não atende. Eles ficam bloqueados na Agenda, no portal do paciente e no assistente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" iconLeft={<CalendarCheck size={14} />} onClick={() => setHolidaysOpen(true)}>Gerar feriados do ano</Button>
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openNew}>Bloquear período</Button>
          </div>
        </div>
      </ContentCard>

      <StatGrid cols={3}>
        <StatCard title={`Dias bloqueados em ${thisYear}`} value={stats.fullDays} icon={CalendarOff} color="danger" description={stats.partial ? `+ ${stats.partial} bloqueio(s) de horário` : undefined} />
        <StatCard title="Próximo bloqueio" value={stats.next ? (stats.next.start <= today ? 'Em andamento' : formatShort(stats.next.start)) : 'Nenhum'} icon={CalendarClock} color="default" description={stats.next ? (stats.next.label || CLOSED_TYPE_LABEL[stats.next.type]) : undefined} />
        <StatCard title={`Férias em ${thisYear}`} value={new Set(closedDates.filter(e => e.date.startsWith(String(thisYear)) && (e.type === 'ferias')).map(e => e.date)).size} icon={Plane} color="info" />
      </StatGrid>

      <Tabs<string> items={tabItems} value={yearTab} onChange={v => { setYearTab(v); setSelected(new Set()); }} label="Anos de bloqueios">
        <div className="space-y-3 pt-3">
          <FilterLine>
            <FilterLineSection grow>
              <FilterLineItem grow minWidth={180}><FilterLineSearch value={query} onChange={setQuery} placeholder="Buscar por motivo, tipo ou data" aria-label="Buscar bloqueios" className="sm:max-w-[280px]" /></FilterLineItem>
              <FilterLineSegmented<TypeFilter> value={typeFilter} onChange={setTypeFilter} options={FILTER_OPTIONS} size="sm" className="overflow-x-auto" />
            </FilterLineSection>
          </FilterLine>

          {selectedItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
              <span className="text-xs font-medium text-primary-700">{selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}</span>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => setSelected(new Set())}>Limpar</Button>
                <Button size="xs" variant="danger" iconLeft={<Trash2 size={13} />} onClick={() => setPending({ kind: 'delete', items: selectedItems })}>Excluir selecionados</Button>
              </div>
            </div>
          )}

          {yearNum < thisYear && <p className="text-[11px] text-slate-500">Registro de {yearNum}: períodos que já passaram. Para editar ou excluir, o sistema pede confirmação.</p>}

          {visible.length === 0 ? (
            <EmptyState icon={CalendarOff}
              title={items.some(i => i.start.startsWith(yearTab)) ? 'Nenhum bloqueio encontrado com esses filtros.' : `Nenhum bloqueio em ${yearTab}.`}
              description="Bloqueie férias, folgas ou horários, ou gere os feriados do ano."
              action={<div className="flex flex-wrap justify-center gap-2"><Button size="sm" iconLeft={<Plus size={14} />} onClick={openNew}>Bloquear período</Button><Button size="sm" variant="outline" iconLeft={<CalendarCheck size={14} />} onClick={() => setHolidaysOpen(true)}>Gerar feriados</Button></div>} />
          ) : byMonth.map(([ym, list]) => (
            <section key={ym} className="space-y-1.5" aria-label={`${MONTHS[Number(ym.slice(5)) - 1]} de ${ym.slice(0, 4)}`}>
              <h3 className="text-xs font-medium text-slate-600">{MONTHS[Number(ym.slice(5)) - 1]} <span className="text-slate-400">· {list.reduce((s, i) => s + i.count, 0)} {list.reduce((s, i) => s + i.count, 0) === 1 ? 'dia' : 'dias'}</span></h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">{list.map(renderRow)}</ul>
            </section>
          ))}
        </div>
      </Tabs>

      <BlockPeriodModal isOpen={blockOpen} onClose={() => setBlockOpen(false)} editing={editing} schedule={schedule} professionalId={professionalId}
        onSave={(remove, add) => persist(remove, add, editing ? 'Bloqueio atualizado.' : add.length > 1 ? `${add.length} dias bloqueados.` : 'Dia bloqueado.')} />
      <HolidaysModal isOpen={holidaysOpen} onClose={() => setHolidaysOpen(false)} blockedDates={blockedAllDay}
        onApply={entries => persist([], entries, `${entries.length} ${entries.length === 1 ? 'data aplicada' : 'datas aplicadas'} na agenda.`)} />
      <ConfirmModal isOpen={!!pending} onClose={() => !busy && setPending(null)} onConfirm={confirmPending} loading={busy}
        title={pending?.kind === 'edit' ? 'Editar registro passado' : 'Confirmar exclusão'} message={pendingMessage}
        variant={pending?.kind === 'edit' ? 'primary' : 'danger'} confirmLabel={pending?.kind === 'edit' ? 'Editar' : 'Excluir'} />
    </div>
  );
}
