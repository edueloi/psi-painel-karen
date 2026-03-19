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
  | 'no-show';

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

const typeMeta: Record<
  AgendaPlannerEventType,
  {
    label: string;
    baseBg: string;
    baseText: string;
    baseBorder: string;
    dot: string;
    icon: React.ReactNode;
  }
> = {
  consulta: {
    label: 'Consulta',
    baseBg: 'bg-white',
    baseText: 'text-slate-700',
    baseBorder: 'border-indigo-200',
    dot: 'bg-indigo-500',
    icon: <Briefcase size={12} />,
  },
  pessoal: {
    label: 'Pessoal',
    baseBg: 'bg-amber-50',
    baseText: 'text-amber-900',
    baseBorder: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: <CalendarDays size={12} />,
  },
  bloqueio: {
    label: 'Bloqueio',
    baseBg: 'bg-slate-100',
    baseText: 'text-slate-700',
    baseBorder: 'border-slate-300',
    dot: 'bg-slate-500',
    icon: <Ban size={12} />,
  },
};

const statusMeta: Record<
  AgendaPlannerEventStatus,
  { label: string; dot: string }
> = {
  scheduled: { label: 'Agendado', dot: 'bg-slate-400' },
  confirmed: { label: 'Confirmado', dot: 'bg-emerald-500' },
  completed: { label: 'Realizado', dot: 'bg-indigo-500' },
  cancelled: { label: 'Cancelado', dot: 'bg-rose-500' },
  'no-show': { label: 'Faltou', dot: 'bg-amber-500' },
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

const layoutDayEvents = (
  events: NormalizedEvent[],
  startHour: number,
  hourHeight: number
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

      if (!placed) {
        columns.push([event]);
      }
    });

    const colCount = columns.length;

    columns.forEach((column, colIndex) => {
      column.forEach((event) => {
        const startMinutes =
          event.startDate.getHours() * 60 + event.startDate.getMinutes();
        const endMinutes =
          event.endDate.getHours() * 60 + event.endDate.getMinutes();

        const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
        const rawHeight = ((endMinutes - startMinutes) / 60) * hourHeight;

        positioned.push({
          ...event,
          top,
          height: Math.max(rawHeight, 34),
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
  hourHeight = 72,
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
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<{
    dayIndex: number;
    top: number;
    label: string;
    slotDate: Date;
  } | null>(null);

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

      return layoutDayEvents(eventsForDay, startHour, hourHeight);
    });
  }, [visibleDays, normalizedEvents, startHour, hourHeight]);

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

  const gridHeight = hours.length * hourHeight;

  const getSlotInfo = (
    clientY: number,
    element: HTMLDivElement,
    day: Date
  ) => {
    const rect = element.getBoundingClientRect();
    const y = clientY - rect.top;
    const totalMinutes = (y / hourHeight) * 60 + startHour * 60;
    const snappedMinutes =
      Math.round(totalMinutes / slotMinutes) * slotMinutes;

    const slotHour = Math.floor(snappedMinutes / 60);
    const slotMinute = snappedMinutes % 60;

    const slotDate = new Date(day);
    slotDate.setHours(slotHour, slotMinute, 0, 0);

    const top = ((snappedMinutes - startHour * 60) / 60) * hourHeight;

    return {
      top,
      slotDate,
      label: `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`,
    };
  };

  return (
    <div className={cx('space-y-6', className)}>
      {/* Header / Controls */}
      {!hideHeader && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-[20px] bg-slate-100 p-1.5">
                <button
                  onClick={() => handleNavigate(-1)}
                  className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white hover:text-primary-600"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  onClick={handleToday}
                  className="px-4 text-[11px] font-bold uppercase tracking-wider text-slate-700"
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

              <h2 className="px-1 text-lg font-bold text-slate-800">{rangeLabel}</h2>

              <input
                type="date"
                value={toLocalDateInputValue(currentDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onCurrentDateChange(new Date(`${e.target.value}T12:00:00`));
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-[18px] bg-slate-100 p-1.5">
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
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <Plus size={16} />
                  Novo agendamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {!hideStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <CalendarDays size={20} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sessões hoje
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.appointmentsToday}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Confirmados
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.confirmed}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
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

      {/* Main */}
      <div
        className={cx(
          'grid gap-5',
          showTasksPanel ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'
        )}
      >
        {/* Calendar */}
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-auto custom-scrollbar">
            <div className="min-w-[900px]">
              <div className="flex">
                {/* Time column */}
                <div className="sticky left-0 z-30 w-16 shrink-0 border-r border-slate-100 bg-white">
                  <div className="sticky top-0 z-40 h-[56px] border-b border-slate-100 bg-white" />
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="relative flex items-start justify-center border-b border-slate-100/70 pt-2"
                      style={{ height: hourHeight }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {formatHourLabel(hour)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Days area */}
                <div className="flex-1">
                  {/* Day headers */}
                  <div className="sticky top-0 z-20 flex border-b border-slate-100 bg-white">
                    {visibleDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cx(
                          'flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-slate-100 py-3',
                          isSameDay(day, new Date()) && 'bg-primary-50/40'
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {day.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}
                        </span>
                        <span
                          className={cx(
                            'mt-1 text-2xl font-bold',
                            isSameDay(day, new Date()) ? 'text-primary-600' : 'text-slate-800'
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Grid */}
                  <div className="relative flex" style={{ height: gridHeight }}>
                    {/* horizontal lines */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="w-full border-b border-slate-100/70"
                          style={{ height: hourHeight }}
                        />
                      ))}
                    </div>

                    {visibleDays.map((day, dayIndex) => (
                      <div
                        key={day.toISOString()}
                        className={cx(
                          'relative min-w-[120px] flex-1 border-r border-slate-100 transition',
                          isSameDay(day, new Date()) && 'bg-slate-50/30'
                        )}
                        onMouseMove={(e) => {
                          const info = getSlotInfo(
                            e.clientY,
                            e.currentTarget,
                            day
                          );
                          setHoveredSlot({
                            dayIndex,
                            top: info.top,
                            label: info.label,
                            slotDate: info.slotDate,
                          });
                        }}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={(e) => {
                          const info = getSlotInfo(
                            e.clientY,
                            e.currentTarget,
                            day
                          );
                          onSlotClick?.(info.slotDate);
                        }}
                      >
                        {/* Hover line */}
                        {hoveredSlot?.dayIndex === dayIndex && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-10"
                            style={{ top: hoveredSlot.top }}
                          >
                            <div className="relative flex items-center">
                              <div className="ml-1 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                {hoveredSlot.label}
                              </div>
                              <div className="ml-2 h-[2px] flex-1 bg-primary-300/70" />
                            </div>
                          </div>
                        )}

                        {/* Events */}
                        {dayEvents[dayIndex]?.map((event) => {
                          const meta = typeMeta[event.type || 'consulta'];
                          const status = statusMeta[event.status || 'scheduled'];

                          const leftPercent = (event.col / event.colCount) * 100;
                          const widthPercent = 100 / event.colCount;

                          return (
                            <button
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              className={cx(
                                'absolute z-[12] overflow-hidden rounded-2xl border text-left shadow-sm transition hover:shadow-md',
                                event.type === 'bloqueio'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : event.type === 'pessoal'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-white text-slate-700 border-indigo-200'
                              )}
                              style={{
                                top: event.top,
                                left: `calc(${leftPercent}% + 4px)`,
                                width: `calc(${widthPercent}% - 8px)`,
                                height: event.height,
                                borderLeftWidth: 4,
                                borderLeftColor:
                                  event.type === 'bloqueio'
                                    ? '#64748b'
                                    : event.color || (event.type === 'pessoal' ? '#f59e0b' : '#6366f1'),
                              }}
                            >
                              <div className="flex h-full flex-col p-2.5">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cx('h-2 w-2 rounded-full', meta.dot)} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                      {event.startDate.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {event.modality === 'online' && (
                                      <Video size={11} className="opacity-70" />
                                    )}
                                    <span className={cx('h-2 w-2 rounded-full', status.dot)} />
                                  </div>
                                </div>

                                <p className="truncate text-[12px] font-bold">
                                  {event.title}
                                </p>

                                {event.subtitle && (
                                  <p className="mt-0.5 truncate text-[11px] opacity-75">
                                    {event.subtitle}
                                  </p>
                                )}

                                {event.height > 56 && event.description && (
                                  <p className="mt-1 line-clamp-2 text-[10px] opacity-60">
                                    {event.description}
                                  </p>
                                )}

                                <div className="mt-auto flex items-center justify-between pt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-70">
                                    {meta.icon}
                                    {meta.label}
                                  </span>

                                  {event.recurrenceIndex && event.recurrenceCount && (
                                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold">
                                      {event.recurrenceIndex}/{event.recurrenceCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks panel */}
        {showTasksPanel && (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Minhas tarefas</h3>
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