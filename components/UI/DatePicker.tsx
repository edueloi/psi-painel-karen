import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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

const weekDays = ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa'];
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
  const startWeekDay = firstDayOfMonth.getDay();

  const gridStartDate = new Date(year, month, 1 - startWeekDay);

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = useMemo(() => parseISODate(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 380; // Altura aproximada do calendário
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: shouldOpenUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const today = new Date();

  const handleSelectDate = (date: Date) => {
    if (isDateDisabled(date, min, max)) return;
    onChange(formatISODate(date));
    setIsOpen(false);
  };

  const dropdown = isOpen ? createPortal(
    <div 
        ref={dropdownRef}
        className="fixed z-[350] w-[292px] rounded-xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 duration-200"
        style={{ top: coords.top, left: coords.left }}
    >
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
            className="flex h-9 items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400"
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
                flex h-9 items-center justify-center rounded-lg text-sm transition
                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                ${isToday && !isSelected ? 'font-black text-indigo-600' : ''}
                ${isSelected ? 'bg-slate-900 font-bold text-white' : 'hover:bg-slate-100'}
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
            handleSelectDate(now);
            }}
            className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
        >
            Hoje
        </button>

        <button
            type="button"
            onClick={() => {
            onChange(null);
            setIsOpen(false);
            }}
            className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
            Limpar
        </button>
        </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`
          flex h-10 w-full items-center justify-between gap-3
          rounded-xl border border-slate-300 bg-white px-3
          text-sm text-slate-700 shadow-sm transition-all
          hover:border-slate-400 hover:bg-slate-50
          focus:outline-none focus:ring-4 focus:ring-indigo-500/10
          disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400
        `}
      >
        <span className={value ? 'text-slate-700 font-bold' : 'text-slate-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>

        <CalendarDays size={16} className="text-slate-400" />
      </button>

      {dropdown}
    </div>
  );
};