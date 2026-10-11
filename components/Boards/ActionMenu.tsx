import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '../UI/Button';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Linha de separação antes do item. */
  separated?: boolean;
  /** Item de cabeçalho (não clicável). */
  heading?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label: string;
  size?: 'xs' | 'sm';
  className?: string;
}

/** Menu de ações (kebab) com posição fixa: não é cortado por contêineres com rolagem. */
export const ActionMenu: React.FC<ActionMenuProps> = ({ items, label, size = 'xs', className }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [pos]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pos) return close();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 208;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const estimated = Math.min(items.length * 34 + 12, 320);
    const top = rect.bottom + estimated > window.innerHeight ? Math.max(8, rect.top - estimated) : rect.bottom + 4;
    setPos({ top, left });
  };

  return (
    <span ref={btnRef} className={`relative inline-flex ${className || ''}`} onClick={(e) => e.stopPropagation()}>
      <IconButton variant="ghost" size={size} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle}>
        <MoreHorizontal size={14} />
      </IconButton>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 208, zIndex: 1000 }}
          className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        >
          {items.map(item => item.heading ? (
            <div key={item.key} className="px-3 pb-1 pt-2 text-[11px] font-medium text-slate-500">{item.label}</div>
          ) : (
            <React.Fragment key={item.key}>
              {item.separated && <div className="my-1 border-t border-slate-100" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => { e.stopPropagation(); close(); item.onClick(); }}
                className={`flex min-h-[34px] w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs disabled:opacity-40 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {item.icon && <item.icon size={14} className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </span>
  );
};
