import React, { useMemo, useState } from 'react';
import { CalendarCheck, CalendarX, Clock, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Appointment } from '../../types';
import { PanelCard } from '../UI/PanelCard';
import { Button } from '../UI/Button';

// ─────────────────────────────────────────────────────────────────────────────
// Mês à frente: o mês atual sempre (inteiro, com o que já está agendado e quantos horários ainda
// estão livres em cada dia) e o mês seguinte somente quando já houver agendamentos nele. Os horários
// livres seguem os dias/horários abertos da agenda (Configurações da agenda).
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthWorkDay {
  dayKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  active: boolean;
  start: string;
  end: string;
  breaks?: { start: string; end: string }[];
  lunchStart?: string;
  lunchEnd?: string;
}

const DOW_KEYS: MonthWorkDay['dayKey'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const HEADER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const toMinutes = (hhmm?: string) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};

const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
};
const nameOf = (a: Appointment) => (a.patient_name || a.patientName || a.patient_name_text || a.title || '').trim() || 'Paciente';
const fmtHour = (h: number) => `${String(h).padStart(2, '0')}h`;

interface MonthSlotsProps {
  appointments: Appointment[];
  workSchedule?: MonthWorkDay[];
  /** Agenda no dia/hora escolhidos (abre o novo agendamento). */
  onPickSlot?: (date: Date) => void;
}

export const MonthSlots: React.FC<MonthSlotsProps> = ({ appointments, workSchedule, onPickSlot }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { months, byDay, openHoursFor, hasSchedule } = useMemo(() => {
    const active = appointments.filter((a) => a.status !== 'cancelled' && a.start instanceof Date && !isNaN(a.start.getTime()));
    const byDayMap = new Map<string, Appointment[]>();
    for (const a of active) {
      const k = dayKeyOf(a.start);
      const list = byDayMap.get(k) ?? [];
      list.push(a);
      byDayMap.set(k, list);
    }
    for (const list of byDayMap.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());

    const sched = (workSchedule ?? []).filter((d) => d && d.dayKey);
    const cfgByDow = new Map<number, MonthWorkDay>();
    for (const d of sched) {
      const dow = DOW_KEYS.indexOf(d.dayKey);
      if (dow >= 0) cfgByDow.set(dow, d);
    }
    const hasSched = sched.length > 0;

    // horas (cheias) abertas num dia da semana, sem intervalos
    const openHours = (dow: number): number[] => {
      let startMin = 8 * 60;
      let endMin = 18 * 60;
      let breaks: { start: string; end: string }[] = [];
      if (hasSched) {
        const cfg = cfgByDow.get(dow);
        if (!cfg?.active) return [];
        startMin = toMinutes(cfg.start) ?? startMin;
        endMin = toMinutes(cfg.end) ?? endMin;
        breaks = cfg.breaks ?? (cfg.lunchStart && cfg.lunchEnd ? [{ start: cfg.lunchStart, end: cfg.lunchEnd }] : []);
      } else if (dow === 0 || dow === 6) {
        return [];
      }
      const hours: number[] = [];
      for (let h = Math.floor(startMin / 60); h * 60 < endMin; h++) {
        if (h * 60 < startMin) continue;
        const inBreak = breaks.some((b) => {
          const bs = toMinutes(b.start);
          const be = toMinutes(b.end);
          return bs !== null && be !== null && h * 60 >= bs && h * 60 < be;
        });
        if (!inBreak) hours.push(h);
      }
      return hours;
    };

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextHasAppointments = active.some((a) => a.start.getFullYear() === nextMonth.getFullYear() && a.start.getMonth() === nextMonth.getMonth());
    const monthList = nextHasAppointments ? [currentMonth, nextMonth] : [currentMonth];

    return { months: monthList, byDay: byDayMap, openHoursFor: openHours, hasSchedule: hasSched };
  }, [appointments, workSchedule]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const freeHoursOf = (date: Date): number[] => {
    const booked = new Set((byDay.get(dayKeyOf(date)) ?? []).map((a) => a.start.getHours()));
    const isToday = date.getTime() === today.getTime();
    return openHoursFor(date.getDay()).filter((h) => !booked.has(h) && (!isToday || h > new Date().getHours()));
  };

  const selectedDate = selectedDay ? new Date(`${selectedDay}T12:00:00`) : null;
  const selectedAppointments = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const selectedFree = selectedDate ? (selectedDate.getTime() >= today.getTime() ? freeHoursOf(selectedDate) : []) : [];

  const pick = (date: Date, hour: number) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    onPickSlot?.(d);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        {months.map((monthStart) => {
          const year = monthStart.getFullYear();
          const month = monthStart.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const offset = (monthStart.getDay() + 6) % 7; // segunda = 0
          const cells: (Date | null)[] = [];
          for (let i = 0; i < offset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
          while (cells.length % 7 !== 0) cells.push(null);

          let monthSessions = 0;
          let monthFree = 0;
          for (const date of cells) {
            if (!date) continue;
            monthSessions += (byDay.get(dayKeyOf(date)) ?? []).length;
            if (date.getTime() >= today.getTime()) monthFree += freeHoursOf(date).length;
          }

          return (
            <div key={`${year}-${month}`} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                <h3 className="text-sm font-medium capitalize text-slate-900">
                  {monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><CalendarCheck size={12} /> {monthSessions} atendimento{monthSessions !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-emerald-700"><CalendarX size={12} /> {monthFree} horário{monthFree !== 1 ? 's' : ''} livre{monthFree !== 1 ? 's' : ''} à frente</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                    {HEADER.map((h) => (
                      <div key={h} className="px-2 py-1.5 text-center text-[11px] font-medium text-slate-500">{h}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {cells.map((date, idx) => {
                      if (!date) return <div key={`e-${idx}`} className="min-h-[92px] border-b border-r border-slate-50 bg-slate-50/50" />;
                      const key = dayKeyOf(date);
                      const list = byDay.get(key) ?? [];
                      const isPast = date.getTime() < today.getTime();
                      const isToday = date.getTime() === today.getTime();
                      const open = openHoursFor(date.getDay()).length > 0;
                      const free = isPast ? 0 : freeHoursOf(date).length;
                      const isSelected = selectedDay === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          className={cn(
                            'flex min-h-[92px] flex-col items-stretch gap-0.5 border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                            isPast && 'bg-slate-50/60',
                            !open && list.length === 0 && 'bg-slate-50',
                            isSelected && 'bg-primary-50 ring-2 ring-inset ring-primary-400'
                          )}
                        >
                          <span className="flex items-center justify-between">
                            <span className={cn('flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-medium', isToday ? 'bg-primary-600 text-white' : isPast ? 'text-slate-400' : 'text-slate-700')}>
                              {date.getDate()}
                            </span>
                            {!open && list.length === 0 ? (
                              <span className="text-[9px] text-slate-400">fechado</span>
                            ) : free > 0 ? (
                              <span className="rounded-md bg-emerald-50 px-1 text-[9px] font-medium text-emerald-700">{free} livre{free !== 1 ? 's' : ''}</span>
                            ) : !isPast && open ? (
                              <span className="rounded-md bg-primary-100 px-1 text-[9px] font-medium text-primary-700">cheio</span>
                            ) : null}
                          </span>
                          {list.slice(0, 3).map((a) => (
                            <span key={a.id} className={cn('truncate rounded px-1 py-px text-[10px] leading-tight', a.type === 'consulta' || !a.type ? 'bg-primary-100 text-primary-900' : 'bg-slate-200 text-slate-700', isPast && 'opacity-70')}>
                              <span className="tabular-nums">{fmtHour(a.start.getHours())}</span> {shortName(nameOf(a))}
                            </span>
                          ))}
                          {list.length > 3 && <span className="px-1 text-[10px] text-slate-500">+{list.length - 3} mais</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {months.length === 1 && (
          <p className="text-[11px] text-slate-500">O mês seguinte aparece aqui assim que houver agendamentos nele.</p>
        )}
        {!hasSchedule && (
          <p className="text-[11px] text-amber-700">Configure os dias e horários de atendimento em Configurações da agenda para o cálculo de horários livres seguir a sua agenda.</p>
        )}
      </div>

      <PanelCard
        title={selectedDate ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Detalhes do dia'}
        description={selectedDate ? `${selectedAppointments.length} atendimento${selectedAppointments.length !== 1 ? 's' : ''} · ${selectedFree.length} horário${selectedFree.length !== 1 ? 's' : ''} livre${selectedFree.length !== 1 ? 's' : ''}` : 'Clique em um dia do calendário.'}
        icon={Clock}
        className="h-fit"
      >
        {selectedDate ? (
          <div className="space-y-3 text-xs">
            {selectedAppointments.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {selectedAppointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate font-medium text-slate-800">{nameOf(a)}</span>
                    <span className="shrink-0 tabular-nums text-[11px] text-slate-500">
                      {a.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {selectedFree.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">Horários livres</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFree.map((h) => (
                    <Button key={h} size="xs" variant="outline" iconLeft={<Plus size={12} />} onClick={() => pick(selectedDate, h)} className="!border-emerald-200 !text-emerald-700 hover:!bg-emerald-50">
                      {fmtHour(h)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {selectedAppointments.length === 0 && selectedFree.length === 0 && (
              <p className="text-slate-500">Sem atendimentos e sem horários livres neste dia (agenda fechada ou dia passado).</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Veja quem está agendado e os horários livres de cada dia; daqui você agenda em um horário livre.</p>
        )}
      </PanelCard>
    </div>
  );
};

export default MonthSlots;
