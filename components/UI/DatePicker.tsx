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

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) { 
      // Reset mode to day when closed
      setTimeout(() => setMode('day'), 200);
    }
  }, [isOpen]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 380; 
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

  const handlePrev = () => {
      if (mode === 'day') {
          setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
      } else if (mode === 'month') {
          setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
      } else if (mode === 'year') {
          setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
      }
  };

  const handleNext = () => {
      if (mode === 'day') {
          setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
      } else if (mode === 'month') {
          setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
      } else if (mode === 'year') {
          setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
      }
  };

  const getEaster = (year: number) => {
      const f = Math.floor;
      const G = year % 19;
      const C = f(year / 100);
      const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
      const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
      const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
      const L = I - J;
      const month = 3 + f((L + 40) / 44);
      const day = L + 28 - 31 * f(month / 4);
      return new Date(year, month - 1, day);
  };

  const holidays = useMemo(() => {
      const year = viewDate.getFullYear();
      const fixed = [
          { month: 0, day: 1, name: 'Confraternização Universal' },
          { month: 3, day: 21, name: 'Tiradentes' },
          { month: 4, day: 1, name: 'Dia do Trabalhador' },
          { month: 8, day: 7, name: 'Independência do Brasil' },
          { month: 9, day: 12, name: 'Nossa Sra. Aparecida' },
          { month: 10, day: 2, name: 'Finados' },
          { month: 10, day: 15, name: 'Proclamação da República' },
          { month: 11, day: 25, name: 'Natal' },
      ].map(h => ({ date: new Date(year, h.month, h.day), name: h.name }));

      const easter = getEaster(year);
      const addDays = (d: Date, days: number) => {
          const res = new Date(d);
          res.setDate(res.getDate() + days);
          return res;
      };

      const movable = [
          { date: addDays(easter, -47), name: 'Carnaval' },
          { date: addDays(easter, -2), name: 'Paixão de Cristo' },
          { date: easter, name: 'Páscoa' },
          { date: addDays(easter, 60), name: 'Corpus Christi' },
      ];

      return [...fixed, ...movable];
  }, [viewDate.getFullYear()]);

  const yearRangeStart = Math.floor(viewDate.getFullYear() / 12) * 12;

  const dropdown = isOpen ? createPortal(
    <div 
        ref={dropdownRef}
        className="fixed z-[10000] w-[292px] rounded-xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        style={{ top: coords.top, left: coords.left }}
    >
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 bg-slate-50">
            <button
                type="button"
                onClick={handlePrev}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 transition"
            >
                <ChevronLeft size={16} />
            </button>

            <button
                type="button"
                onClick={() => {
                    if (mode === 'day') setMode('month');
                    else if (mode === 'month') setMode('year');
                }}
                className={`text-sm font-bold text-slate-700 px-3 py-1.5 rounded-md transition-colors hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center gap-1 ${mode === 'year' ? 'cursor-default pointer-events-none hover:bg-transparent' : 'cursor-pointer'}`}
            >
                {mode === 'day' && `${monthNames[viewDate.getMonth()]}, ${viewDate.getFullYear()}`}
                {mode === 'month' && viewDate.getFullYear()}
                {mode === 'year' && `${yearRangeStart} - ${yearRangeStart + 11}`}
            </button>

            <button
                type="button"
                onClick={handleNext}
                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 transition"
            >
                <ChevronRight size={16} />
            </button>
        </div>

        {mode === 'day' && (
            <div className="animate-fadeIn">
                <div className="grid grid-cols-7 border-b border-slate-100 px-2 pt-2 bg-slate-50/50">
                    {weekDays.map((day, index) => (
                        <div
                        key={`${day}-${index}`}
                        className={`flex h-9 items-center justify-center text-[10px] font-black uppercase tracking-widest ${index === 0 ? 'text-rose-500' : index === 6 ? 'text-indigo-500' : 'text-slate-400'}`}
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
                        const holiday = holidays.find(h => isSameDay(h.date, date));

                        return (
                        <button
                            key={`${date.toISOString()}-${index}`}
                            type="button"
                            title={holiday ? holiday.name : undefined}
                            disabled={disabledDate}
                            onClick={() => handleSelectDate(date)}
                            className={`
                            flex h-9 items-center justify-center rounded-lg text-sm transition font-medium relative group
                            ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                            ${holiday && !isSelected && !disabledDate ? 'text-rose-600 bg-rose-50/50 hover:bg-rose-100' : 'hover:bg-slate-100'}
                            ${isToday && !isSelected ? 'font-black text-indigo-600 bg-indigo-50 border border-indigo-100' : ''}
                            ${isSelected ? 'bg-slate-900 font-bold text-white shadow-md hover:bg-slate-800' : ''}
                            ${disabledDate ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}
                            `}
                        >
                            {date.getDate()}
                            {holiday && !isSelected && !disabledDate && (
                                <span className="absolute bottom-[4px] w-1 h-1 rounded-full bg-rose-500"></span>
                            )}
                        </button>
                        );
                    })}
                </div>
            </div>
        )}

        {mode === 'month' && (
            <div className="grid grid-cols-3 grid-rows-4 gap-2 p-3 h-[278px] animate-fadeIn">
                {monthNames.map((m, i) => (
                    <button 
                        key={i}
                        type="button"
                        onClick={() => {
                            setViewDate(new Date(viewDate.getFullYear(), i, 1));
                            setMode('day');
                        }}
                        className={`rounded-lg flex items-center justify-center font-bold text-sm transition-colors border ${viewDate.getMonth() === i ? 'bg-slate-900 text-white shadow-md border-transparent' : 'bg-slate-50 text-slate-700 hover:bg-slate-200 border-slate-100'}`}
                    >
                        {m.slice(0, 3).toUpperCase()}
                    </button>
                ))}
            </div>
        )}

        {mode === 'year' && (
            <div className="grid grid-cols-3 grid-rows-4 gap-2 p-3 h-[278px] animate-fadeIn">
                {Array.from({length: 12}).map((_, i) => {
                    const y = yearRangeStart + i;
                    return (
                        <button 
                            key={y}
                            type="button"
                            onClick={() => {
                                setViewDate(new Date(y, viewDate.getMonth(), 1));
                                setMode('month');
                            }}
                            className={`rounded-lg flex items-center justify-center font-bold text-sm transition-colors border ${viewDate.getFullYear() === y ? 'bg-slate-900 text-white shadow-md border-transparent' : 'bg-slate-50 text-slate-700 hover:bg-slate-200 border-slate-100'}`}
                        >
                            {y}
                        </button>
                    );
                })}
            </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/80">
            <button
                type="button"
                onClick={() => {
                    const now = new Date();
                    setViewDate(now);
                    if (mode === 'day') {
                        handleSelectDate(now);
                    } else {
                        setMode('day');
                    }
                }}
                className="rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
                Hoje
            </button>

            <button
                type="button"
                onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                }}
                className="rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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