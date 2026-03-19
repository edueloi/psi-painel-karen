import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check, UserPlus, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string | number;
  label: string;
}

interface ComboboxProps {
  label: string;
  options: Option[];
  value: string | number | (string | number)[];
  onChange: (value: any, label?: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  allowCustom?: boolean;
  onCustomAdd?: (name: string) => void;
  disabled?: boolean;
  className?: string;
  noResultsText?: string;
  size?: 'sm' | 'md';
  showSelectedBadge?: boolean;
  showResultCount?: boolean;
  multiple?: boolean;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  icon,
  placeholder = 'Pesquisar...',
  allowCustom = false,
  onCustomAdd,
  disabled = false,
  className = '',
  noResultsText = 'Nenhum resultado encontrado',
  size = 'sm',
  showSelectedBadge = true,
  showResultCount = true,
  multiple = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return options.filter((option) => value.includes(option.id));
    }
    const single = options.find((option) => String(option.id) === String(value));
    return single ? [single] : [];
  }, [options, value, multiple]);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const ui = {
    inputHeight: size === 'sm' ? 'min-h-[40px]' : 'min-h-[44px]',
    inputText: size === 'sm' ? 'text-sm' : 'text-sm',
    inputPadding: size === 'sm' ? 'pl-9 pr-10' : 'pl-10 pr-12',
    dropdownRounded: size === 'sm' ? 'rounded-xl' : 'rounded-2xl',
    dropdownTop: size === 'sm' ? 'top-[calc(100%+6px)]' : 'top-[calc(100%+8px)]',
    headerPadding: size === 'sm' ? 'px-3 py-2' : 'px-4 py-3',
    listPadding: size === 'sm' ? 'p-1.5' : 'p-2',
    listMaxHeight: size === 'sm' ? 'max-h-[220px]' : 'max-h-[260px]',
    itemPadding: size === 'sm' ? 'px-3 py-2' : 'px-3 py-3',
    itemTitle: size === 'sm' ? 'text-[14px]' : 'text-sm',
    itemMeta: size === 'sm' ? 'text-[9px]' : 'text-[10px]',
    checkSize: size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
    clearSize: size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
    chevronSize: size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
  };

  useEffect(() => {
    if (multiple) return;
    if (selectedOptions.length > 0) {
      setQuery(selectedOptions[0].label);
    } else if (value && allowCustom && !multiple) {
      setQuery(String(value));
    } else if (!value) {
      setQuery('');
    }
  }, [selectedOptions, value, allowCustom, multiple]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || (multiple && selectedOptions.some(o => o.label.toLowerCase() === normalizedQuery))) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query, multiple, selectedOptions]);

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [query, filteredOptions.length, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        if (multiple) {
            setQuery('');
        } else if (selectedOptions.length > 0) {
          setQuery(selectedOptions[0].label);
        } else if (!allowCustom) {
          setQuery('');
          onChange('', '');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOptions, allowCustom, onChange, multiple]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const activeItem = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement | null;
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const openDropdown = () => {
    if (!disabled) setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleSelect = (option: Option) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(option.id)
        ? currentValues.filter((v) => v !== option.id)
        : [...currentValues, option.id];
      onChange(newValue);
      setQuery('');
      inputRef.current?.focus();
    } else {
      onChange(option.id, option.label);
      setQuery(option.label);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange(multiple ? [] : '', '');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (nextValue: string) => {
    setQuery(nextValue);
    setIsOpen(true);
    if (!multiple) {
      const exactMatch = options.find((option) => option.label.toLowerCase() === nextValue.trim().toLowerCase());
      if (exactMatch) {
        onChange(exactMatch.id, exactMatch.label);
      } else if (allowCustom) {
        onChange(nextValue, nextValue);
      } else if (!nextValue) {
        onChange('', '');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) setIsOpen(true);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => filteredOptions.length === 0 ? -1 : prev < filteredOptions.length - 1 ? prev + 1 : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => filteredOptions.length === 0 ? -1 : prev > 0 ? prev - 1 : filteredOptions.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
        return;
      }
      if (allowCustom && query.trim() && onCustomAdd) {
        onCustomAdd(query.trim());
        setIsOpen(multiple);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      if (!multiple && selectedOptions.length > 0) setQuery(selectedOptions[0].label);
      else setQuery('');
    }
  };

  const showAddCustom = allowCustom && query.trim() && filteredOptions.length === 0 && typeof onCustomAdd === 'function';

  return (
    <div ref={containerRef} className={cx('w-full relative', className)} style={{ zIndex: isOpen ? 130 : 'auto' }}>
      <label className="mb-1 block text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">
        {label}
      </label>

      <div className="relative">
        <div
          className={cx(
            'relative flex items-center rounded-xl border bg-white transition-all',
            ui.inputHeight,
            disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70' : isOpen ? 'border-violet-500 ring-4 ring-violet-500/10' : 'border-slate-300 hover:border-slate-400'
          )}
        >
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon || <Search size={15} />}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1 pl-9 pr-10">
            {multiple && selectedOptions.map((opt) => (
               <span key={opt.id} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-violet-100">
                  {opt.label}
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className="hover:text-violet-900">
                    <X size={10} />
                  </button>
               </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                disabled={disabled}
                value={query}
                placeholder={selectedOptions.length > 0 && multiple ? '' : placeholder}
                onFocus={openDropdown}
                onClick={openDropdown}
                onKeyDown={handleKeyDown}
                onChange={(e) => handleInputChange(e.target.value)}
                className={cx('flex-1 bg-transparent outline-none placeholder:text-slate-400 text-slate-700 w-px min-w-[40px]', ui.inputText, size === 'sm' ? 'h-9' : 'h-10')}
            />
          </div>

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {!!(query || selectedOptions.length > 0) && !disabled && (
              <button type="button" onClick={handleClear} className={cx('flex items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600', ui.clearSize)} aria-label="Limpar">
                <X size={13} />
              </button>
            )}
            <button type="button" onClick={() => (isOpen ? closeDropdown() : openDropdown())} disabled={disabled} className={cx('flex items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed', ui.chevronSize)} aria-label="Abrir opções">
              <ChevronDown size={14} className={cx('transition-transform', isOpen && 'rotate-180')} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={cx('absolute left-0 right-0 z-[200] overflow-hidden border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]', ui.dropdownRounded, ui.dropdownTop)}>
            {showResultCount && (
              <div className={cx('border-b border-slate-100', ui.headerPadding)}>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {filteredOptions.length > 0 ? `${filteredOptions.length} resultado(s)` : 'Busca'}
                </p>
              </div>
            )}
            <div ref={listRef} className={cx(ui.listMaxHeight, 'overflow-y-auto custom-scrollbar', ui.listPadding)}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedOptions.some(o => o.id === option.id);
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button key={option.id} type="button" data-index={index} onClick={() => handleSelect(option)} className={cx('flex w-full items-center justify-between text-left transition', ui.itemPadding, size === 'sm' ? 'rounded-lg' : 'rounded-xl', isSelected ? 'bg-violet-50 text-violet-700' : isHighlighted ? 'bg-slate-50 text-slate-800' : 'text-slate-700 hover:bg-slate-50')}>
                      <div className="min-w-0 pr-2">
                        <p className={cx('truncate font-bold', ui.itemTitle)}>{option.label}</p>
                        {isSelected && (
                          <p className={cx('mt-0.5 font-bold uppercase tracking-wide text-violet-500', ui.itemMeta)}>
                            {multiple ? 'Ativado' : 'Selecionado'}
                          </p>
                        )}
                      </div>
                      <div className={cx('ml-2 flex shrink-0 items-center justify-center rounded-lg border transition', ui.checkSize, isSelected ? 'border-violet-600 bg-violet-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-100')}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                    </button>
                  );
                })
              ) : showAddCustom ? (
                <button type="button" onClick={() => { onCustomAdd?.(query.trim()); if (!multiple) setIsOpen(false); }} className={cx('flex w-full items-center gap-3 text-left text-violet-700 transition hover:bg-violet-50', size === 'sm' ? 'rounded-lg px-3 py-3' : 'rounded-xl px-4 py-4')}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600"><UserPlus size={15} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Não encontrado</p>
                    <p className="text-sm font-bold">Adicionar "{query.trim()}"</p>
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Search size={16} /></div>
                  <p className="text-sm font-bold text-slate-500">{noResultsText}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};