// Modelo e helpers de users.closed_dates (férias, feriados, folgas e bloqueios de horário).
// Mantém o mesmo contrato de backend/utils/closedDates.js.
// Entradas antigas { date, label } continuam válidas = dia inteiro.

export type ClosedType = 'ferias' | 'feriado_nacional' | 'feriado_local' | 'facultativo' | 'folga' | 'recesso' | 'outro';

export interface ClosedEntry {
  date: string; // YYYY-MM-DD
  label: string;
  type?: ClosedType;
  allDay?: boolean;
  from?: string; // HH:mm (allDay === false)
  to?: string;
  groupId?: string;
  groupStart?: string;
  groupEnd?: string;
  source?: 'manual' | 'auto';
  year?: number;
}

export const CLOSED_TYPE_OPTIONS: { value: ClosedType; label: string }[] = [
  { value: 'ferias', label: 'Férias' },
  { value: 'folga', label: 'Folga' },
  { value: 'recesso', label: 'Recesso' },
  { value: 'feriado_local', label: 'Feriado local (municipal/estadual)' },
  { value: 'feriado_nacional', label: 'Feriado nacional' },
  { value: 'facultativo', label: 'Ponto facultativo' },
  { value: 'outro', label: 'Outro' },
];

export const CLOSED_TYPE_LABEL: Record<ClosedType, string> = {
  ferias: 'Férias',
  folga: 'Folga',
  recesso: 'Recesso',
  feriado_local: 'Feriado local',
  feriado_nacional: 'Feriado nacional',
  facultativo: 'Facultativo',
  outro: 'Outro',
};

export const MAX_CLOSED_ITEMS = 1500;
export const MAX_LABEL = 120;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tipo exibido: usa o salvo; senão infere por palavra-chave do rótulo (somente exibição). */
export function inferType(e: ClosedEntry): ClosedType {
  if (e.type) return e.type;
  const l = norm(e.label || '');
  if (/\bferias\b/.test(l)) return 'ferias';
  if (/recesso/.test(l)) return 'recesso';
  if (/facultativ/.test(l)) return 'facultativo';
  if (/folga/.test(l)) return 'folga';
  if (/feriado/.test(l)) return 'feriado_local';
  return 'outro';
}

export const isPartial = (e: ClosedEntry) => e.allDay === false && isValidTime(e.from) && isValidTime(e.to) && toMinutes(e.from!) < toMinutes(e.to!);
export const isAllDay = (e: ClosedEntry) => !isPartial(e);

export function isValidTime(t?: string) { return !!t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
export function toMinutes(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); }

/** Normaliza o valor cru vindo da API (string JSON, array, entradas antigas). */
export function parseClosedDates(raw: unknown): ClosedEntry[] {
  let v: unknown = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = []; } }
  if (!Array.isArray(v)) return [];
  const out: ClosedEntry[] = [];
  for (const item of v) {
    const e: any = typeof item === 'string' ? { date: item } : item;
    if (!e || !e.date) continue;
    const date = String(e.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const entry: ClosedEntry = { date, label: String(e.label ?? '') };
    if (e.type) entry.type = e.type;
    if (e.allDay === false) { entry.allDay = false; entry.from = e.from; entry.to = e.to; }
    else if (e.allDay === true) entry.allDay = true;
    if (e.groupId) { entry.groupId = String(e.groupId); entry.groupStart = e.groupStart; entry.groupEnd = e.groupEnd; }
    if (e.source) entry.source = e.source;
    if (e.year) entry.year = Number(e.year);
    out.push(entry);
  }
  return out;
}

const keyOf = (e: ClosedEntry) => `${e.date}|${isPartial(e) ? e.from : ''}|${isPartial(e) ? e.to : ''}`;

/** Remove duplicatas por date+from+to (a última entrada vence) e ordena por data/hora. */
export function dedupeClosed(list: ClosedEntry[]): ClosedEntry[] {
  const map = new Map<string, ClosedEntry>();
  list.forEach(e => map.set(keyOf(e), e));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date) || (a.from || '').localeCompare(b.from || ''));
}

export function findClosedDay(list: ClosedEntry[], dateISO: string): ClosedEntry | undefined {
  return list.find(e => e.date === dateISO && isAllDay(e));
}

export interface BlockedInterval { start: number; end: number; from: string; to: string; label: string; type: ClosedType }

export function blockedIntervals(list: ClosedEntry[], dateISO: string): BlockedInterval[] {
  return list
    .filter(e => e.date === dateISO && isPartial(e))
    .map(e => ({ start: toMinutes(e.from!), end: toMinutes(e.to!), from: e.from!, to: e.to!, label: e.label, type: inferType(e) }))
    .sort((a, b) => a.start - b.start);
}

/** Bloqueio (dia inteiro ou parcial) que intersecta [startMin, endMin) em dateISO. */
export function findBlock(list: ClosedEntry[], dateISO: string, startMin: number, endMin: number):
  { allDay: boolean; label: string; from?: string; to?: string } | null {
  const whole = findClosedDay(list, dateISO);
  if (whole) return { allDay: true, label: whole.label };
  const part = blockedIntervals(list, dateISO).find(b => startMin < b.end && endMin > b.start);
  return part ? { allDay: false, label: part.label, from: part.from, to: part.to } : null;
}

// ── datas ─────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const todayISO = () => toISO(new Date());
export const formatBR = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
export const formatShort = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Dias ISO entre from e to (inclusive). Ignora dias sem atendimento (rotina semanal) salvo includeAll. */
export function expandPeriod(from: string, to: string, schedule: { dayKey: string; active: boolean }[] | null, includeAll: boolean): { days: string[]; skipped: string[] } {
  const days: string[] = []; const skipped: string[] = [];
  if (!from || !to || to < from) return { days, skipped };
  const cur = fromISO(from); const end = fromISO(to);
  let guard = 0;
  while (cur <= end && guard++ < 800) {
    const iso = toISO(cur);
    const wd = cur.getDay();
    const cfg = schedule?.find(s => s.dayKey === DAY_KEYS[wd]);
    const works = cfg ? cfg.active : wd !== 0 && wd !== 6;
    if (includeAll || works) days.push(iso); else skipped.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return { days, skipped };
}

// ── agrupamento para exibição ────────────────────────────────────────────────
export interface ClosedItem {
  key: string;
  entries: ClosedEntry[];
  start: string;
  end: string;
  count: number;
  isGroup: boolean;
  type: ClosedType;
  label: string;
  partial: boolean;
  from?: string;
  to?: string;
  source: 'manual' | 'auto';
  groupId?: string;
}

/** Agrupa entradas com mesmo groupId em um único item; demais viram itens de um dia. */
export function groupClosed(list: ClosedEntry[]): ClosedItem[] {
  const groups = new Map<string, ClosedEntry[]>();
  const items: ClosedItem[] = [];
  for (const e of list) {
    if (e.groupId) { const g = groups.get(e.groupId) || []; g.push(e); groups.set(e.groupId, g); continue; }
    items.push({
      key: keyOf(e), entries: [e], start: e.date, end: e.date, count: 1, isGroup: false, type: inferType(e), label: e.label,
      partial: isPartial(e), from: e.from, to: e.to, source: e.source || 'manual',
    });
  }
  groups.forEach((entries, id) => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    items.push({
      key: `g:${id}`, entries: sorted, start: first.groupStart || first.date, end: first.groupEnd || sorted[sorted.length - 1].date,
      count: sorted.length, isGroup: true, type: inferType(first), label: first.label, partial: isPartial(first), from: first.from, to: first.to,
      source: first.source || 'manual', groupId: id,
    });
  });
  return items.sort((a, b) => a.start.localeCompare(b.start) || (a.from || '').localeCompare(b.from || ''));
}

export const newGroupId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function periodText(item: ClosedItem): string {
  if (item.isGroup && item.count > 1) {
    const days = `${item.count} ${item.count === 1 ? 'dia' : 'dias'}`;
    return `${formatShort(item.start)} – ${formatShort(item.end)} (${days})${item.partial ? ` · das ${item.from} às ${item.to}` : ''}`;
  }
  return item.partial ? `${formatShort(item.start)} · das ${item.from} às ${item.to}` : formatShort(item.start);
}
