import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  blockedDates: string[];
  onDateToggle: (date: string) => void;
}

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const toIsoDate = (year: number, month: number, day: number) => {
  return [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
};

export const Calendar: React.FC<CalendarProps> = ({ blockedDates, onDateToggle }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const blockedDatesSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const monthLabel = useMemo(() => {
    const label = currentDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dias especificos</p>
          <h3 className="text-sm font-black text-slate-800">{monthLabel}</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50"
            aria-label="Proximo mes"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 rounded-[1.4rem] bg-slate-100/80 p-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="flex h-9 items-center justify-center rounded-xl">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: startDay }).map((_, index) => (
          <div key={'empty-' + index} className="h-11 rounded-2xl" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
          const dayNumber = dayIndex + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
          const dateString = toIsoDate(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
          const isBlocked = blockedDatesSet.has(dateString);
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();

          return (
            <button
              key={dateString}
              type="button"
              disabled={isPast}
              onClick={() => onDateToggle(dateString)}
              className={
                isPast
                  ? 'h-11 rounded-2xl text-sm font-black text-slate-300'
                  : isBlocked
                    ? 'h-11 rounded-2xl border border-slate-900 bg-slate-900 text-sm font-black text-white shadow-sm transition-all hover:bg-slate-800'
                    : isToday
                      ? 'h-11 rounded-2xl border border-indigo-300 bg-indigo-50 text-sm font-black text-indigo-700 transition-all hover:bg-indigo-100'
                      : 'h-11 rounded-2xl border border-transparent bg-white text-sm font-black text-slate-600 transition-all hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600'
              }
              title={isBlocked ? 'Dia fechado' : 'Dia disponivel'}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-[1.4rem] bg-slate-100/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>Branco: livre</span>
        <span>Escuro: fechado</span>
      </div>
    </div>
  );
};
