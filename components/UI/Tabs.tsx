import React from 'react';
import { cn } from '@/src/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Tabs — abas estilo "browser tab" (pegada Comexport: aba ativa em destaque,
// coladas na borda superior do card de conteúdo abaixo).
// ─────────────────────────────────────────────────────────────────────────────

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex items-end gap-1 overflow-x-auto no-scrollbar', className)}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-[13px] font-bold transition-colors',
              active
                ? 'bg-white border-zinc-200 text-primary-700 relative z-10 -mb-px'
                : 'bg-zinc-100 border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black',
                  active ? 'bg-primary-100 text-primary-700' : 'bg-zinc-200 text-zinc-500',
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
