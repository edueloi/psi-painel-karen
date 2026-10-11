import React from 'react';
import { Ban, Check } from 'lucide-react';
import { COLOR_PALETTE, isHex, resolveColor } from './boardConfig';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  /** Mostra o botão "Sem cor". */
  allowNone?: boolean;
  /** Rótulo lido por leitores de tela para o seletor personalizado. */
  customLabel?: string;
  size?: 'sm' | 'md';
}

/** Paleta de 12 cores + seletor personalizado + "Sem cor". Contraste: o ✓ usa branco sobre cor saturada. */
export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label, allowNone = false, customLabel = 'Cor personalizada', size = 'md' }) => {
  const current = value ? resolveColor(value) : '';
  const isCustom = !!current && !COLOR_PALETTE.some(c => c.hex === current);
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  return (
    <div>
      {label && <div className="mb-1.5 text-xs font-medium text-slate-600">{label}</div>}
      <div role="group" aria-label={label || 'Cor'} className="flex flex-wrap items-center gap-1.5">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Sem cor"
            aria-pressed={!value}
            title="Sem cor"
            className={`${dim} flex items-center justify-center rounded-full border bg-white text-slate-500 transition-colors ${!value ? 'border-slate-800 ring-2 ring-slate-300' : 'border-slate-300 hover:border-slate-400'}`}
          >
            <Ban size={14} />
          </button>
        )}
        {COLOR_PALETTE.map(c => {
          const selected = current === c.hex;
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange(c.hex)}
              aria-label={c.name}
              aria-pressed={selected}
              title={c.name}
              style={{ backgroundColor: c.hex }}
              className={`${dim} flex items-center justify-center rounded-full border-2 text-white transition-transform hover:scale-105 ${selected ? 'border-slate-800 ring-2 ring-slate-300' : 'border-white'}`}
            >
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          );
        })}
        <label
          className={`relative ${dim} cursor-pointer overflow-hidden rounded-full border-2 ${isCustom ? 'border-slate-800 ring-2 ring-slate-300' : 'border-slate-300'}`}
          style={{ background: isCustom ? current : 'conic-gradient(#ef4444, #f59e0b, #10b981, #3b82f6, #d946ef, #ef4444)' }}
          title={customLabel}
        >
          <span className="sr-only">{customLabel}</span>
          <input
            type="color"
            aria-label={customLabel}
            value={isHex(current) ? current : '#3b82f6'}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
};
