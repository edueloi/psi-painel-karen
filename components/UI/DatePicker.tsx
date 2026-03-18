import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

const weekDays = ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa', 'Do'];
const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function parseISODate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(dateStr?: string | null) {
  const date = parseISODate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateDisabled(date: Date, min?: string, max?: string) {
  const iso = formatISODate(date);
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

function getCalendarDays(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekDay = firstDayOfMonth.getDay(); // 0 domingo ... 6 sábado

  const sundayBasedOffset = startWeekDay;
  const gridStartDate = new Date(year, month, 1 - sundayBasedOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);
    return date;
  });
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className = '',
  disabled = false,
  min,
  max,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = useMemo(() => parseISODate(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const today = new Date();

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date, min, max)) return;
    onChange(formatISODate(date));
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`
          flex h-10 w-full items-center justify-between gap-3
          rounded-lg border border-slate-300 bg-white px-3
          text-sm text-slate-700 shadow-sm transition
          hover:border-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/20
          disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400
        `}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>

        <CalendarDays size={16} className="text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[292px] rounded-xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                )
              }
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-sm font-semibold text-slate-700">
              {monthNames[viewDate.getMonth()]}, {viewDate.getFullYear()}
            </div>

            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                )
              }
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 px-2 pt-2">
            {weekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="flex h-9 items-center justify-center text-sm font-semibold text-slate-700"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-2 py-2">
            {calendarDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const disabledDate = isDateDisabled(date, min, max);

              return (
                <button
                  key={`${date.toISOString()}-${index}`}
                  type="button"
                  disabled={disabledDate}
                  onClick={() => handleSelectDate(date)}
                  className={`
                    flex h-9 items-center justify-center rounded-md text-sm transition
                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                    ${isToday && !isSelected ? 'font-semibold text-slate-900' : ''}
                    ${isSelected ? 'bg-slate-800 font-semibold text-white' : 'hover:bg-slate-100'}
                    ${disabledDate ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate(now);
                onChange(formatISODate(now));
                setIsOpen(false);
              }}
              className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};