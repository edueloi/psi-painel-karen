import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckSquare,
  Plus,
  Clock,
  Video,
  Ban,
  Briefcase,
  CheckCircle2,
  Circle,
  Sparkles,
  CalendarClock,
  DollarSign,
  Package,
  MapPin,
} from 'lucide-react';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export type AgendaPlannerView = 'day' | 'week';

export type AgendaPlannerEventType = 'consulta' | 'pessoal' | 'bloqueio';
export type AgendaPlannerEventStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'no_show'
  | 'rescheduled'
  | 'falta_justificada';

export interface AgendaPlannerEvent {
  id: string | number;
  title: string;
  subtitle?: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  type?: AgendaPlannerEventType;
  status?: AgendaPlannerEventStatus;
  modality?: 'presencial' | 'online';
  color?: string;
  recurrenceIndex?: number;
  recurrenceCount?: number;
  serviceName?: string;
  comandaId?: string | number;
}

export interface AgendaPlannerTask {
  id: string | number;
  title: string;
  description?: string;
  dueDate?: Date | string;
  done?: boolean;
  color?: string;
  tag?: string;
}

export interface WorkScheduleDay {
  dayKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  active: boolean;
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
}

export interface AgendaPlannerProps {
  currentDate: Date;
  onCurrentDateChange: (date: Date) => void;
  view: AgendaPlannerView;
  onViewChange: (view: AgendaPlannerView) => void;
  events: AgendaPlannerEvent[];
  tasks?: AgendaPlannerTask[];
  locale?: string;
  startHour?: number;
  endHour?: number;
  hourHeight?: number;
  slotMinutes?: 30 | 60;
  className?: string;
  showTasksPanel?: boolean;
  onSlotClick?: (date: Date) => void;
  onEventClick?: (event: AgendaPlannerEvent) => void;
  onTaskClick?: (task: AgendaPlannerTask) => void;
  onCreateTask?: () => void;
  onCreateEvent?: () => void;
  hideHeader?: boolean;
  hideStats?: boolean;
  workSchedule?: WorkScheduleDay[];
  skippedHours?: number[];
  closedDates?: { date: string; label: string }[];
}

type NormalizedEvent = AgendaPlannerEvent & {
  startDate: Date;
  endDate: Date;
};

type PositionedEvent = NormalizedEvent & {
  top: number;
  height: number;
  col: number;
  colCount: number;
};

const HEADER_HEIGHT = 56;
const TIME_COL_WIDTH = 56;
const COLLAPSE_HEIGHT = 0; // Horários pulados agora são totalmente escondidos (0px)

const typeMeta: Record<
  AgendaPlannerEventType,
  {
    label: string;
    dot: string;
    icon: React.ReactNode;
    defaultColor: string;
  }
> = {
  consulta: {
    label: 'Consulta',
    dot: 'bg-indigo-500',
    icon: <Briefcase size={11} />,
    defaultColor: '#6366f1',
  },
  pessoal: {
    label: 'Pessoal',
    dot: 'bg-amber-500',
    icon: <CalendarDays size={11} />,
    defaultColor: '#f59e0b',
  },
  bloqueio: {
    label: 'Bloqueio',
    dot: 'bg-slate-500',
    icon: <Ban size={11} />,
    defaultColor: '#64748b',
  },
};

const statusMeta: Record<AgendaPlannerEventStatus, { label: string; dot: string }> = {
  scheduled:         { label: 'Agendado',         dot: 'bg-slate-400' },
  confirmed:         { label: 'Confirmado',        dot: 'bg-emerald-500' },
  completed:         { label: 'Realizado',         dot: 'bg-indigo-500' },
  cancelled:         { label: 'Cancelado',         dot: 'bg-rose-500' },
  'no-show':         { label: 'Faltou',            dot: 'bg-amber-500' },
  no_show:           { label: 'Faltou',            dot: 'bg-amber-500' },
  rescheduled:       { label: 'Reagendado',        dot: 'bg-violet-500' },
  falta_justificada: { label: 'Falta Justificada', dot: 'bg-orange-400' },
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const isSameDay = (a: Date, b: Date) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatHourLabel = (hour: number) => {
  return `${String(hour).padStart(2, '0')}:00`;
};

const toLocalDateInputValue = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const normalizeEvent = (event: AgendaPlannerEvent): NormalizedEvent => ({
  ...event,
  type: event.type || 'consulta',
  status: event.status || 'scheduled',
  startDate: event.start instanceof Date ? event.start : new Date(event.start),
  endDate: event.end instanceof Date ? event.end : new Date(event.end),
});

const eventsOverlap = (a: NormalizedEvent, b: NormalizedEvent) =>
  a.startDate < b.endDate && b.startDate < a.endDate;

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean;

  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const minutesToTop = (
  totalMinutes: number,
  startHour: number,
  hourHeight: number,
  skippedHours: number[],
  collapseHeight: number
): number => {
  const targetHour = Math.floor(totalMinutes / 60);
  const targetMin = totalMinutes % 60;
  let top = 0;
  for (let h = startHour; h < targetHour; h++) {
    top += skippedHours.includes(h) ? collapseHeight : hourHeight;
  }
  const thisHourH = skippedHours.includes(targetHour) ? collapseHeight : hourHeight;
  top += (targetMin / 60) * thisHourH;
  return top;
};

const topToMinutes = (
  y: number,
  startHour: number,
  hourHeight: number,
  skippedHours: number[],
  collapseHeight: number
): number => {
  let currentTop = 0;
  for (let h = startHour; h < 24; h++) {
    const hHeight = skippedHours.includes(h) ? collapseHeight : hourHeight;
    if (hHeight > 0 && y < currentTop + hHeight) {
      const minInHour = ((y - currentTop) / hHeight) * 60;
      return h * 60 + minInHour;
    }
    currentTop += hHeight;
  }
  return 23 * 60 + 59;
};

const layoutDayEvents = (
  events: NormalizedEvent[],
  startHour: number,
  hourHeight: number,
  skippedHours: number[] = [],
  collapseHeight: number = 8
): PositionedEvent[] => {
  if (!events.length) return [];

  const sorted = [...events].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  const groups: NormalizedEvent[][] = [];
  let currentGroup: NormalizedEvent[] = [];
  let currentGroupMaxEnd = 0;

  sorted.forEach((event) => {
    const start = event.startDate.getTime();
    const end = event.endDate.getTime();

    if (!currentGroup.length) {
      currentGroup = [event];
      currentGroupMaxEnd = end;
      return;
    }

    if (start < currentGroupMaxEnd) {
      currentGroup.push(event);
      currentGroupMaxEnd = Math.max(currentGroupMaxEnd, end);
    } else {
      groups.push(currentGroup);
      currentGroup = [event];
      currentGroupMaxEnd = end;
    }
  });

  if (currentGroup.length) groups.push(currentGroup);

  const positioned: PositionedEvent[] = [];

  groups.forEach((group) => {
    const columns: NormalizedEvent[][] = [];

    group.forEach((event) => {
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (!eventsOverlap(last, event)) {
          columns[i].push(event);
          placed = true;
          break;
        }
      }

      if (!placed) columns.push([event]);
    });

    const colCount = columns.length;

    columns.forEach((column, colIndex) => {
      column.forEach((event) => {
        const startMinutes =
          event.startDate.getHours() * 60 + event.startDate.getMinutes();

        // Calcula duração pelo diff de timestamps para evitar bugs de meia-noite/timezone
        const durationMs = event.endDate.getTime() - event.startDate.getTime();
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

        const top = minutesToTop(startMinutes, startHour, hourHeight, skippedHours, collapseHeight);
        const endMinutes = startMinutes + durationMinutes;
        const rawHeight = minutesToTop(endMinutes, startHour, hourHeight, skippedHours, collapseHeight) - top;

        positioned.push({
          ...event,
          top,
          height: Math.max(rawHeight, 28),
          col: colIndex,
          colCount,
        });
      });
    });
  });

  return positioned;
};

export const AgendaPlanner: React.FC<AgendaPlannerProps> = ({
  currentDate,
  onCurrentDateChange,
  view,
  onViewChange,
  events,
  tasks = [],
  locale = 'pt-BR',
  startHour = 6,
  endHour = 22,
  hourHeight = 68,
  slotMinutes = 60,
  className,
  showTasksPanel = true,
  onSlotClick,
  onEventClick,
  onTaskClick,
  onCreateTask,
  onCreateEvent,
  hideHeader,
  hideStats,
  workSchedule,
  skippedHours = [],
  closedDates = [],
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<{
    dayIndex: number;
    top: number;
    rawTop: number;
    label: string;
    rawLabel: string;
    slotDate: Date;
  } | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | number | null>(null);

  const normalizedEvents = useMemo(
    () => events.map(normalizeEvent),
    [events]
  );

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);

  const visibleDays = useMemo(() => {
    if (view === 'day') return [currentDate];
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [currentDate, view, weekStart]);

  const hours = useMemo(
    () =>
      Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
    [startHour, endHour]
  );

  const dayEvents = useMemo(() => {
    return visibleDays.map((day) => {
      const eventsForDay = normalizedEvents.filter((event) =>
        isSameDay(event.startDate, day)
      );
      return layoutDayEvents(eventsForDay, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT);
    });
  }, [visibleDays, normalizedEvents, startHour, hourHeight, skippedHours]);

  const stats = useMemo(() => {
    const today = normalizedEvents.filter((event) =>
      isSameDay(event.startDate, new Date())
    );

    return {
      appointmentsToday: today.length,
      confirmed: today.filter((event) => event.status === 'confirmed').length,
      tasksOpen: tasks.filter((task) => !task.done).length,
    };
  }, [normalizedEvents, tasks]);

  const handleNavigate = (direction: number) => {
    const next = new Date(currentDate);
    if (view === 'day') next.setDate(next.getDate() + direction);
    else next.setDate(next.getDate() + direction * 7);
    onCurrentDateChange(next);
  };

  const handleToday = () => onCurrentDateChange(new Date());

  const rangeLabel = useMemo(() => {
    if (view === 'day') {
      return currentDate.toLocaleDateString(locale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }

    const start = visibleDays[0];
    const end = visibleDays[visibleDays.length - 1];

    return `${start.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    })} - ${end.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [currentDate, locale, view, visibleDays]);

  const gridHeight = hours.reduce((acc, h) => acc + (skippedHours.includes(h) ? COLLAPSE_HEIGHT : hourHeight), 0);
  const today = new Date();

  const currentTimeTop = useMemo(() => {
    const totalMinutes = today.getHours() * 60 + today.getMinutes();
    return minutesToTop(totalMinutes, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT);
  }, [today, startHour, hourHeight, skippedHours]);

  const getSlotInfo = (
    clientY: number,
    element: HTMLDivElement,
    day: Date
  ) => {
    const rect = element.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height);
    
    // Converte a posição Y para minutos reais considerando as horas puladas
    const realMinutes = topToMinutes(y, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT);
    
    // Snap para os intervalos (30 ou 60 min)
    let snappedMinutes = Math.floor(realMinutes / slotMinutes) * slotMinutes;
    
    // Se o horário resultante cair em uma hora escondida, pular para o próximo ou anterior visível
    const resHour = Math.floor(snappedMinutes / 60);
    if (skippedHours.includes(resHour)) {
      // Se estamos na metade de cima da hora pulada, volta pro fim da hora anterior
      // Se estamos na metade de baixo, vai pro início da próxima hora visível
      const minInH = snappedMinutes % 60;
      if (minInH < 30) {
        snappedMinutes = (resHour) * 60 - slotMinutes;
      } else {
        snappedMinutes = (resHour + 1) * 60;
      }
      
      // Re-valida se a nova hora também está escondida (recursivo simples)
      while (skippedHours.includes(Math.floor(snappedMinutes / 60)) && snappedMinutes > 0 && snappedMinutes < 1440) {
          snappedMinutes += slotMinutes;
      }
    }

    const clampedMinutes = clamp(
      snappedMinutes,
      startHour * 60,
      endHour * 60
    );

    const slotHour = Math.floor(clampedMinutes / 60);
    const slotMinute = clampedMinutes % 60;

    const slotDate = new Date(day);
    slotDate.setHours(slotHour, slotMinute, 0, 0);

    // Calcula o TOP visual correto usando a mesma função de layout
    const top = minutesToTop(clampedMinutes, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT);

    const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
    const dayStr = slotDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    
    // Calcula o horário exato baseado na posição do mouse (sem snap)
    const rawClamped = clamp(realMinutes, startHour * 60, endHour * 60);
    const rawHour = Math.floor(rawClamped / 60);
    const rawMinute = Math.floor(rawClamped % 60);
    const rawTimeStr = `${String(rawHour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;

    return {
      top,
      slotDate,
      label: `${dayStr} · ${timeStr}`,
      rawLabel: `${dayStr} · ${rawTimeStr}`,
    };
  };

  return (
    <div className={cx('space-y-6', className)}>
      {!hideHeader && (
        <div className="rounded-[30px] border border-slate-200 bg-gradient-to-r from-white to-slate-50/70 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-[20px] border border-slate-200 bg-slate-100/80 p-1.5 shadow-inner">
                <button
                  onClick={() => handleNavigate(-1)}
                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white hover:text-primary-600"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  onClick={handleToday}
                  className="px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700"
                >
                  Hoje
                </button>

                <button
                  onClick={() => handleNavigate(1)}
                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white hover:text-primary-600"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <h2 className="px-1 text-lg font-bold tracking-tight text-slate-800">
                {rangeLabel}
              </h2>

              <div className="relative">
                <input
                  type="date"
                  value={toLocalDateInputValue(currentDate)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    onCurrentDateChange(new Date(`${e.target.value}T12:00:00`));
                  }}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-500"
                />
                <CalendarClock
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-[18px] bg-slate-100 p-1.5 shadow-inner">
                <button
                  onClick={() => onViewChange('day')}
                  className={cx(
                    'rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition',
                    view === 'day'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500'
                  )}
                >
                  Dia
                </button>

                <button
                  onClick={() => onViewChange('week')}
                  className={cx(
                    'rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition',
                    view === 'week'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500'
                  )}
                >
                  Semana
                </button>
              </div>

              {onCreateEvent && (
                <button
                  onClick={onCreateEvent}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:brightness-110"
                >
                  <Plus size={16} />
                  Novo agendamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!hideStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm">
                <CalendarDays size={20} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sessões hoje
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.appointmentsToday}</p>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Confirmados
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.confirmed}</p>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
                <CheckSquare size={20} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tarefas abertas
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.tasksOpen}</p>
          </div>
        </div>
      )}

      <div
        className={cx(
          'grid gap-5',
          showTasksPanel ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px]' : 'grid-cols-1'
        )}
      >
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-auto custom-scrollbar">
            <div className="min-w-[420px]">
              <div className="flex">
                {/* Coluna do horário */}
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-slate-200 bg-white"
                  style={{ width: TIME_COL_WIDTH }}
                >
                  <div
                    className="sticky top-0 z-40 border-b border-slate-200 bg-white"
                    style={{ height: HEADER_HEIGHT }}
                  />
                  {hours.map((hour) => {
                    const isSkipped = skippedHours.includes(hour);
                    return isSkipped ? (
                      <div
                        key={hour}
                        className="relative flex items-center justify-center border-b border-dashed border-slate-200/60 bg-slate-50/80"
                        style={{ height: COLLAPSE_HEIGHT }}
                      />
                    ) : (
                      <div
                        key={hour}
                        className="relative flex justify-center border-b border-slate-200/60"
                        style={{ height: hourHeight }}
                      >
                        <span className="absolute top-1.5 text-[10px] font-bold tabular-nums tracking-wide text-slate-400">
                          {formatHourLabel(hour)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Área dos dias */}
                <div className="flex-1">
                  <div
                    className="sticky top-0 z-20 flex border-b border-slate-200 bg-white"
                    style={{ height: HEADER_HEIGHT }}
                  >
                    {visibleDays.map((day) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const dayIso = [
                        day.getFullYear(),
                        String(day.getMonth() + 1).padStart(2, '0'),
                        String(day.getDate()).padStart(2, '0'),
                      ].join('-');
                      const closedEntry = closedDates.find(c => c.date === dayIso);
                      return (
                      <div
                        key={day.toISOString()}
                        className={cx(
                          'flex min-w-[80px] flex-1 flex-col items-center justify-center border-r border-slate-200 px-1',
                          closedEntry
                            ? 'bg-rose-50'
                            : isSameDay(day, new Date())
                            ? 'bg-indigo-50'
                            : isWeekend
                            ? 'bg-slate-100'
                            : 'bg-white'
                        )}
                      >
                        <span className={cx(
                          'text-[9px] font-bold uppercase tracking-[0.18em]',
                          closedEntry ? 'text-rose-400' : isWeekend ? 'text-slate-400' : 'text-slate-400'
                        )}>
                          {day
                            .toLocaleDateString(locale, { weekday: 'short' })
                            .replace('.', '')}
                        </span>
                        <span
                          className={cx(
                            'text-[15px] font-bold tracking-tight',
                            closedEntry
                              ? 'text-rose-500'
                              : isSameDay(day, new Date())
                              ? 'text-indigo-600'
                              : isWeekend ? 'text-slate-400' : 'text-slate-800'
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {closedEntry && (
                          <span className="mt-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-500 leading-tight max-w-full truncate">
                            {closedEntry.label || 'Fechado'}
                          </span>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  <div className="relative flex" style={{ height: gridHeight }}>
                    {/* linhas principais */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col">
                      {hours.map((hour) => {
                        const isSkipped = skippedHours.includes(hour);
                        return isSkipped ? (
                          <div
                            key={hour}
                            className="relative w-full border-b border-dashed border-slate-300/60 bg-slate-100/40"
                            style={{ height: COLLAPSE_HEIGHT }}
                          />
                        ) : (
                          <div
                            key={hour}
                            className="relative w-full border-b border-slate-200/60"
                            style={{ height: hourHeight }}
                          >
                            {/* Linha sutil de meia hora */}
                            <div className="absolute left-0 right-0 top-1/2 border-b border-dotted border-slate-100/50" />
                          </div>
                        );
                      })}
                    </div>

                    {visibleDays.map((day, dayIndex) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const dayKeyMap: Record<number, WorkScheduleDay['dayKey']> = {
                        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
                        4: 'thursday', 5: 'friday', 6: 'saturday',
                      };
                      const schedDay = workSchedule?.find((s: WorkScheduleDay) => s.dayKey === dayKeyMap[day.getDay()]);
                      const schedInactive = schedDay ? !schedDay.active : false;
                      const dayIso2 = [
                        day.getFullYear(),
                        String(day.getMonth() + 1).padStart(2, '0'),
                        String(day.getDate()).padStart(2, '0'),
                      ].join('-');
                      const isClosed = closedDates.some(c => c.date === dayIso2);
                      const closedLabel = closedDates.find(c => c.date === dayIso2)?.label || 'Fechado';
                      const schedStartMinutes = schedDay?.active ? parseInt(schedDay.start.split(':')[0]) * 60 + parseInt(schedDay.start.split(':')[1]) : null;
                      const schedEndMinutes = schedDay?.active ? parseInt(schedDay.end.split(':')[0]) * 60 + parseInt(schedDay.end.split(':')[1]) : null;

                      // Punch holes in overlay where appointments exist on this day
                      const dayApts = dayEvents[dayIndex] || [];
                      const aptStartMin = dayApts.length > 0
                        ? Math.min(...dayApts.map(e => e.startDate.getHours() * 60 + e.startDate.getMinutes()))
                        : null;
                      const aptEndMin = dayApts.length > 0
                        ? Math.max(...dayApts.map(e => e.endDate.getHours() * 60 + e.endDate.getMinutes()))
                        : null;

                      // Before-work overlay ends at earliest appointment (if it's before work start)
                      const effectiveBeforeEnd = schedStartMinutes !== null
                        ? (aptStartMin !== null && aptStartMin < schedStartMinutes ? aptStartMin : schedStartMinutes)
                        : null;
                      const beforeOverlayHeight = effectiveBeforeEnd !== null
                        ? Math.max(0, minutesToTop(effectiveBeforeEnd, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT))
                        : 0;

                      // After-work overlay starts at latest appointment end (if it's after work end)
                      const effectiveAfterStart = schedEndMinutes !== null
                        ? (aptEndMin !== null && aptEndMin > schedEndMinutes ? aptEndMin : schedEndMinutes)
                        : null;
                      const afterOverlayTop = effectiveAfterStart !== null
                        ? Math.max(0, minutesToTop(effectiveAfterStart, startHour, hourHeight, skippedHours, COLLAPSE_HEIGHT))
                        : gridHeight;
                      const afterOverlayHeight = gridHeight - afterOverlayTop;
                      return (
                      <div
                        key={day.toISOString()}
                        className={cx(
                          'relative min-w-[80px] flex-1 border-r border-slate-200 transition cursor-crosshair',
                          isWeekend && !isSameDay(day, new Date()) ? 'bg-slate-100' : 'bg-transparent'
                        )}
                        style={isSameDay(day, new Date()) ? { backgroundColor: 'color-mix(in srgb, var(--c-100) 35%, transparent)' } : undefined}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const rawY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
                          const info = getSlotInfo(e.clientY, e.currentTarget, day);
                          setHoveredSlot({
                            dayIndex,
                            top: info.top,
                            rawTop: rawY,
                            label: info.label,
                            rawLabel: info.rawLabel,
                            slotDate: info.slotDate,
                          });
                        }}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={(e) => {
                          const info = getSlotInfo(e.clientY, e.currentTarget, day);
                          onSlotClick?.(info.slotDate);
                        }}
                      >
                        {/* overlay dia fechado (closed_dates do perfil) */}
                        {isClosed && (
                          <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col items-center justify-center gap-2"
                            style={{ background: 'rgba(254,226,226,0.55)', backdropFilter: 'blur(1px)' }}>
                            <Ban size={22} className="text-rose-300" strokeWidth={1.5} />
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-500 text-center max-w-[90%] truncate">
                              {closedLabel}
                            </span>
                          </div>
                        )}
                        {/* overlay horário fora do expediente */}
                        {!isClosed && workSchedule && schedInactive && (
                          <div className="pointer-events-none absolute inset-0 z-[3]" style={{ background: 'rgba(148,163,184,0.13)' }} />
                        )}
                        {!isClosed && workSchedule && !schedInactive && beforeOverlayHeight > 0 && (
                          <div className="pointer-events-none absolute left-0 right-0 top-0 z-[3]" style={{ height: beforeOverlayHeight, background: 'rgba(148,163,184,0.13)' }} />
                        )}
                        {!isClosed && workSchedule && !schedInactive && afterOverlayHeight > 0 && (
                          <div className="pointer-events-none absolute left-0 right-0 z-[3]" style={{ top: afterOverlayTop, height: afterOverlayHeight, background: 'rgba(148,163,184,0.13)' }} />
                        )}

                        {/* ── hover slot estilo GlowCut ── */}
                        {hoveredSlot?.dayIndex === dayIndex && !hoveredEvent && (
                          <>
                            {/* Caixa afundada com borda dashed + "+" centralizado na cor do tema */}
                            <div
                              className="pointer-events-none absolute z-[6] flex items-center justify-center rounded-xl"
                              style={{
                                top: hoveredSlot.top + 2,
                                left: 3,
                                right: 3,
                                height: hourHeight - 4,
                                border: '2px dashed var(--c-400)',
                                background: 'var(--c-50)',
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                                style={{ background: 'var(--c-500)' }}
                              >
                                <Plus size={14} className="text-white" strokeWidth={3} />
                              </div>
                            </div>

                            {/* Tooltip dark flutuando acima do slot */}
                            <div
                              className="pointer-events-none absolute left-1/2 z-30"
                              style={{
                                top: hoveredSlot.top - 46,
                                transform: 'translateX(-50%)',
                              }}
                            >
                              <div className="relative flex items-center gap-2 bg-zinc-900 text-white text-[11px] font-black rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap">
                                <div
                                  className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
                                  style={{ background: 'var(--c-500)' }}
                                >
                                  <Plus size={10} className="text-white" strokeWidth={3} />
                                </div>
                                {(() => {
                                  const parts = hoveredSlot.label.split(' · ');
                                  const datePart = parts[0]?.replace(',', '').trim() ?? '';
                                  const timePart = parts[1]?.slice(0, 5) ?? '';
                                  return `${datePart} • ${timePart}`;
                                })()}
                                {/* seta para baixo */}
                                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900 rotate-45" />
                              </div>
                            </div>
                          </>
                        )}

                        {/* linha do horário atual */}
                        {isSameDay(day, today) &&
                          currentTimeTop >= 0 &&
                          currentTimeTop <= gridHeight && (
                            <div
                              className="pointer-events-none absolute left-0 right-0 z-10"
                              style={{ top: currentTimeTop }}
                            >
                              <div className="relative flex items-center">
                                <div className="ml-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-200" />
                                <div className="ml-1.5 h-[2px] flex-1 bg-rose-400/80" />
                              </div>
                            </div>
                          )}

                        {dayEvents[dayIndex]?.map((event) => {
                          const meta = typeMeta[event.type || 'consulta'];
                          const status = statusMeta[event.status || 'scheduled'];

                          // Status-based color só se aplica a consultas.
                          // Bloqueio = sempre cinza. Pessoal = sempre âmbar.
                          const statusAccent = event.type === 'consulta'
                            ? (event.status === 'confirmed') ? '#10b981' :
                              (event.status === 'completed') ? '#059669' :
                              (event.status === 'cancelled' || event.status === 'no-show') ? '#ef4444' :
                              null
                            : null;

                          // Online consultas get a teal accent; presencial keep indigo default
                          const modalityDefaultColor = event.type === 'consulta' && event.modality === 'online'
                            ? '#0891b2'  // cyan-600 — online
                            : meta.defaultColor; // indigo — presencial / default

                          const accent =
                            event.type === 'bloqueio'
                              ? '#94a3b8'   // cinza
                              : event.type === 'pessoal'
                                ? '#f59e0b' // âmbar fixo
                                : statusAccent || event.color || modalityDefaultColor;

                          const durationMinutes = Math.max(
                            1,
                            Math.round(
                              (event.endDate.getTime() - event.startDate.getTime()) / 60000
                            )
                          );

                          const leftPercent = (event.col / event.colCount) * 100;
                          const widthPercent = 100 / event.colCount;

                          return (
                            /* Wrapper: controla posição + tooltip (overflow-visible) */
                            <div
                              key={event.id}
                              className="absolute z-[12] group/card"
                              style={{
                                top: event.top,
                                left: `calc(${leftPercent}% + 4px)`,
                                width: `calc(${widthPercent}% - 8px)`,
                                height: event.height,
                              }}
                              onMouseEnter={() => setHoveredEvent(event.id)}
                              onMouseLeave={() => setHoveredEvent(null)}
                            >
                              {/* ── Tooltip Premium Glassmorphic ── */}
                              <div className={cx(
                                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none transition-all duration-200 origin-bottom',
                                hoveredEvent === event.id ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
                              )}>
                                <div className="relative bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] min-w-[210px] max-w-[280px] space-y-2 border border-white/10 ring-1 ring-white/5">
                                  {/* Seta */}
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-b border-r border-white/10" />
                                  {/* Dia completo */}
                                  <p className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-400">
                                    {event.startDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
                                  </p>
                                  {/* Horário */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
                                    <p className="text-[13px] font-black tabular-nums tracking-tight" style={{ color: accent }}>
                                      {event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      <span className="text-white/40 mx-1">→</span>
                                      {event.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <span className="text-[9px] text-slate-500 font-bold ml-auto">{durationMinutes}min</span>
                                  </div>
                                  {/* Nome */}
                                  <p className="font-black text-[13px] text-white leading-tight truncate">{event.title}</p>
                                  {/* Serviço */}
                                  {event.serviceName && (
                                    <p className="text-[10px] text-slate-400 font-semibold truncate">{event.serviceName}</p>
                                  )}
                                  {/* Sessão */}
                                  {event.recurrenceIndex !== undefined && event.recurrenceCount !== undefined && (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ backgroundColor: `${accent}20`, color: accent }}>
                                      Sessão {event.recurrenceIndex}/{event.recurrenceCount}
                                    </div>
                                  )}
                                  {/* Footer */}
                                  <div className="flex items-center gap-2 pt-1.5 border-t border-white/10">
                                    <div className={cx('w-1.5 h-1.5 rounded-full shrink-0', status.dot)} />
                                    <span className="text-slate-300 text-[9px] font-bold">{status.label}</span>
                                    {event.modality && (
                                      <span className={cx(
                                        'text-[8px] font-black uppercase ml-auto px-1.5 py-0.5 rounded-full',
                                        event.modality === 'online' ? 'text-cyan-300 bg-cyan-500/15' : 'text-slate-400 bg-slate-500/15'
                                      )}>
                                        {event.modality === 'online' ? '● Online' : '● Presencial'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ── Card do agendamento (overflow-hidden separado) ── */}
                              <button
                                className="absolute inset-0 overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-150 hover:z-[14] hover:shadow-lg active:scale-[0.995] w-full"
                                style={{
                                  background:
                                    event.type === 'bloqueio'
                                      ? 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)'
                                      : hexToRgba(accent, 0.10),
                                  borderColor:
                                    event.type === 'bloqueio'
                                      ? '#cbd5e1'
                                      : hexToRgba(accent, 0.28),
                                  color: event.type === 'bloqueio' ? '#334155' : '#1e293b',
                                  boxShadow:
                                    event.type === 'bloqueio'
                                      ? '0 6px 20px rgba(15,23,42,0.05)'
                                      : `0 10px 24px ${hexToRgba(accent, 0.12)}`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(event);
                                }}
                              >
                                <div
                                  className="absolute bottom-0 left-0 top-0 w-1"
                                  style={{ backgroundColor: accent }}
                                />

                                <div className="flex h-full flex-col px-1.5 py-0.5 pl-2.5">
                                  {/* Row 1: Time + Session + Status dot */}
                                  <div className="flex items-center justify-between gap-1 leading-none">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[9px] font-black tabular-nums text-slate-500/80">
                                        {event.startDate.toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      {(event.recurrenceIndex !== undefined && event.recurrenceCount !== undefined) && (
                                        <span className="rounded-sm bg-indigo-50 px-1 py-px text-[7px] font-black text-indigo-600 border border-indigo-100/50 leading-none">
                                          {event.recurrenceIndex}/{event.recurrenceCount}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <div className="flex items-center gap-0.5 leading-none">
                                        {event.modality === 'online' ? (
                                          <>
                                            <Video size={8} style={{ color: '#0891b2' }} />
                                            <span className="text-[7px] font-black text-cyan-600 uppercase">On</span>
                                          </>
                                        ) : event.modality === 'presencial' ? (
                                          <>
                                            <MapPin size={8} className="text-slate-400" />
                                            <span className="text-[7px] font-black text-slate-400 uppercase">Pre</span>
                                          </>
                                        ) : null}
                                      </div>
                                      <div className={cx('h-1.5 w-1.5 rounded-full shrink-0', status.dot)} />
                                    </div>
                                  </div>

                                  {/* Row 2: Patient Name */}
                                  <p className="truncate text-[10px] font-black leading-tight text-slate-900 tracking-tight">
                                    {event.title}
                                  </p>

                                  {/* Row 3: Service */}
                                  {event.serviceName && (
                                    <p className="truncate text-[8px] font-semibold text-slate-500/80 leading-none">
                                      {event.serviceName}
                                    </p>
                                  )}

                                  {event.height > 50 && event.description && (
                                    <p className="line-clamp-1 text-[7px] leading-relaxed text-slate-400 font-medium">
                                      {event.description}
                                    </p>
                                  )}

                                  {/* Footer: Status label + icon */}
                                  {event.height > 40 && (
                                    <div className="mt-auto flex items-center justify-between gap-1 pt-px">
                                      <div className="flex items-center gap-1">
                                        <span className={cx('h-1 w-1 rounded-full', status.dot)} />
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wide">{status.label}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {event.comandaId && (
                                          <span className="text-[7px] font-black bg-emerald-50/60 px-1 py-px rounded text-emerald-500 border border-emerald-100/30">$</span>
                                        )}
                                        <span className="inline-flex items-center text-[8px] text-slate-400/50">
                                          {meta.icon}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showTasksPanel && (
          <div className="space-y-4">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-800">
                    Minhas tarefas
                  </h3>
                  <p className="text-sm text-slate-400">
                    Organize lembretes e pendências
                  </p>
                </div>

                {onCreateTask && (
                  <button
                    onClick={onCreateTask}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus size={14} />
                    Nova
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                    <Sparkles size={22} className="mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">Nenhuma tarefa</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Adicione tarefas para acompanhar a rotina.
                    </p>
                  </div>
                )}

                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cx(
                            'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full',
                            task.done
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          {task.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={cx(
                              'truncate text-sm font-semibold',
                              task.done ? 'text-slate-400 line-through' : 'text-slate-800'
                            )}
                          >
                            {task.title}
                          </p>

                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {task.tag && (
                        <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-600">
                          {task.tag}
                        </span>
                      )}
                    </div>

                    {task.dueDate && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Clock size={12} />
                        {new Date(task.dueDate).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};
