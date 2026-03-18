import React from 'react';
import { Search, LayoutGrid, List as ListIcon } from 'lucide-react';
import { DatePicker } from './DatePicker';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type FilterLineSectionAlign = 'left' | 'center' | 'right';

interface FilterLineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface FilterLineSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  grow?: boolean;
  align?: FilterLineSectionAlign;
  wrap?: boolean;
}

interface FilterLineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  grow?: boolean;
  fullOnMobile?: boolean;
  minWidth?: number | string;
}

interface FilterLineGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  compact?: boolean;
}

interface FilterSegmentOption<T extends string | number = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface FilterLineSegmentedProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterSegmentOption<T>[];
  className?: string;
  size?: 'sm' | 'md';
}

interface FilterLineViewToggleProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  gridValue: T;
  listValue: T;
  className?: string;
}

interface FilterLineSearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface FilterLineDateRangeProps {
  from: string | null;
  to: string | null;
  onFromChange: (value: string | null) => void;
  onToChange: (value: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}

export const FilterLine: React.FC<FilterLineProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={cx(
        'w-full rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:p-4',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {children}
      </div>
    </div>
  );
};

export const FilterLineSection: React.FC<FilterLineSectionProps> = ({
  children,
  className = '',
  grow = false,
  align = 'left',
  wrap = true,
  ...props
}) => {
  return (
    <div
      className={cx(
        'min-w-0',
        grow && 'flex-1',
        'flex items-center gap-3',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-start xl:justify-end',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const FilterLineItem: React.FC<FilterLineItemProps> = ({
  children,
  className = '',
  grow = false,
  fullOnMobile = true,
  minWidth,
  style,
  ...props
}) => {
  return (
    <div
      className={cx(
        fullOnMobile ? 'w-full sm:w-auto' : 'w-auto',
        grow && 'flex-1',
        className
      )}
      style={{
        minWidth: minWidth ?? undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const FilterLineGroup: React.FC<FilterLineGroupProps> = ({
  children,
  className = '',
  compact = false,
  ...props
}) => {
  return (
    <div
      className={cx(
        'inline-flex items-center rounded-2xl bg-slate-100',
        compact ? 'gap-1 p-1' : 'gap-2 p-1.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export function FilterLineSegmented<T extends string | number = string>({
  value,
  onChange,
  options,
  className = '',
  size = 'md',
}: FilterLineSegmentedProps<T>) {
  return (
    <FilterLineGroup compact={size === 'sm'} className={className}>
      {options.map((option) => {
        const active = String(option.value) === String(value);

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex items-center gap-2 rounded-xl font-medium transition-all',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
              active
                ? 'bg-white text-violet-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </FilterLineGroup>
  );
}

export function FilterLineViewToggle<T extends string | number = string>({
  value,
  onChange,
  gridValue,
  listValue,
  className = '',
}: FilterLineViewToggleProps<T>) {
  const isGrid = String(value) === String(gridValue);
  const isList = String(value) === String(listValue);

  return (
    <div
      className={cx(
        'inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange(gridValue)}
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all',
          isGrid ? 'bg-violet-50 text-violet-600' : 'text-slate-500 hover:bg-slate-50'
        )}
        aria-label="Visualização em grade"
      >
        <LayoutGrid size={16} />
      </button>

      <button
        type="button"
        onClick={() => onChange(listValue)}
        className={cx(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all',
          isList ? 'bg-violet-50 text-violet-600' : 'text-slate-500 hover:bg-slate-50'
        )}
        aria-label="Visualização em lista"
      >
        <ListIcon size={16} />
      </button>
    </div>
  );
}

export const FilterLineSearch: React.FC<FilterLineSearchProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  ...props
}) => {
  return (
    <div
      className={cx(
        'flex h-11 w-full items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 transition-all',
        'focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10',
        className
      )}
    >
      <Search size={17} className="shrink-0 text-slate-400" />
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
};

export const FilterLineDateRange: React.FC<FilterLineDateRangeProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = 'De',
  toLabel = 'Até',
  className = '',
}) => {
  return (
    <div
      className={cx(
        'flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">{fromLabel}</span>
        <div className="min-w-[150px]">
          <DatePicker value={from} onChange={onFromChange} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">{toLabel}</span>
        <div className="min-w-[150px]">
          <DatePicker value={to} onChange={onToChange} />
        </div>
      </div>
    </div>
  );
};