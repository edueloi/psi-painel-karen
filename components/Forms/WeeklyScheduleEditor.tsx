import React from 'react';
import { Plus, X, Copy } from 'lucide-react';
import { Button, IconButton, Switch, Input } from '../UI';

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type BreakPeriod = { start: string; end: string };

export type ScheduleDay = {
  dayKey: DayKey;
  active: boolean;
  start: string;
  end: string;
  breaks: BreakPeriod[];
};

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const DEFAULT_WEEKLY_SCHEDULE: ScheduleDay[] = [
  { dayKey: 'monday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'friday', active: true, start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'saturday', active: false, start: '09:00', end: '13:00', breaks: [] },
  { dayKey: 'sunday', active: false, start: '', end: '', breaks: [] },
];

interface WeeklyScheduleEditorProps {
  schedule: ScheduleDay[];
  onChange: (schedule: ScheduleDay[]) => void;
}

export const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({ schedule, onChange }) => {
  const updateDay = (index: number, patch: Partial<ScheduleDay>) => {
    onChange(schedule.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const toggleDay = (index: number) => updateDay(index, { active: !schedule[index].active });

  const copyDayToAll = (index: number) => {
    const src = schedule[index];
    onChange(schedule.map((d, i) => (i === index ? d : { ...d, start: src.start, end: src.end, breaks: src.breaks.map(b => ({ ...b })) })));
  };

  const addBreak = (index: number) => {
    updateDay(index, { breaks: [...schedule[index].breaks, { start: '12:00', end: '13:00' }] });
  };

  const removeBreak = (index: number, breakIdx: number) => {
    updateDay(index, { breaks: schedule[index].breaks.filter((_, i) => i !== breakIdx) });
  };

  const updateBreak = (index: number, breakIdx: number, patch: Partial<BreakPeriod>) => {
    updateDay(index, {
      breaks: schedule[index].breaks.map((b, i) => (i === breakIdx ? { ...b, ...patch } : b)),
    });
  };

  return (
    <div className="space-y-2">
      {schedule.map((day, idx) => (
        <div key={day.dayKey} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={day.active} onCheckedChange={() => toggleDay(idx)} aria-label={`Atender ${DAY_LABELS[day.dayKey]}`} />
            <span className="w-28 flex-shrink-0 text-[13px] font-medium text-slate-800">{DAY_LABELS[day.dayKey]}</span>

            {day.active && (
              <>
                <Input
                  type="time"
                  aria-label={`${DAY_LABELS[day.dayKey]}: início`}
                  value={day.start}
                  onChange={e => updateDay(idx, { start: e.target.value })}
                  wrapperClassName="w-28"
                />
                <span className="text-xs text-slate-500">até</span>
                <Input
                  type="time"
                  aria-label={`${DAY_LABELS[day.dayKey]}: fim`}
                  value={day.end}
                  onChange={e => updateDay(idx, { end: e.target.value })}
                  wrapperClassName="w-28"
                />

                {day.breaks.map((b, bi) => (
                  <div key={bi} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Pausa</span>
                    <Input
                      type="time"
                      aria-label="Início da pausa"
                      value={b.start}
                      onChange={e => updateBreak(idx, bi, { start: e.target.value })}
                      wrapperClassName="w-28"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      type="time"
                      aria-label="Fim da pausa"
                      value={b.end}
                      onChange={e => updateBreak(idx, bi, { end: e.target.value })}
                      wrapperClassName="w-28"
                    />
                    <IconButton variant="ghost" size="sm" aria-label="Remover pausa" onClick={() => removeBreak(idx, bi)}>
                      <X size={14} />
                    </IconButton>
                  </div>
                ))}

                <Button type="button" variant="ghost" size="xs" iconLeft={<Plus size={14} />} onClick={() => addBreak(idx)}>
                  Pausa
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="ml-auto"
                  iconLeft={<Copy size={14} />}
                  onClick={() => copyDayToAll(idx)}
                  title="Copiar horário para todos os dias"
                >
                  Copiar para todos
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
