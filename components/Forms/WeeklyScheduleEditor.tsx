import React from 'react';
import { Plus, X, Copy } from 'lucide-react';
import { Button } from '../UI/Button';

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
    <div className="space-y-2.5">
      {schedule.map((day, idx) => (
        <div key={day.dayKey} className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => toggleDay(idx)}
              className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${day.active ? 'bg-[#6355D8]' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${day.active ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
            <span className="w-28 flex-shrink-0 text-sm font-bold text-slate-700">{DAY_LABELS[day.dayKey]}</span>

            {day.active && (
              <>
                <input
                  type="time"
                  value={day.start}
                  onChange={e => updateDay(idx, { start: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="time"
                  value={day.end}
                  onChange={e => updateDay(idx, { end: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                />

                {day.breaks.map((b, bi) => (
                  <div key={bi} className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Pausa</span>
                    <input
                      type="time"
                      value={b.start}
                      onChange={e => updateBreak(idx, bi, { start: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="time"
                      value={b.end}
                      onChange={e => updateBreak(idx, bi, { end: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                    />
                    <button type="button" onClick={() => removeBreak(idx, bi)} className="text-slate-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBreak(idx)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#6355D8] hover:text-[#5447C4]"
                >
                  <Plus size={13} /> Pausa
                </button>

                <button
                  type="button"
                  onClick={() => copyDayToAll(idx)}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  title="Copiar horário para todos os dias"
                >
                  <Copy size={13} /> Copiar para todos
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
