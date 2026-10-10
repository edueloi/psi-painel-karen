import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button, IconButton } from '../UI/Button';
import { Input, Textarea } from '../UI/Input';
import { Modal } from '../UI/Modal';

// ─────────────────────────────────────────────────────────────────────────────
// Wrappers escuros da sala de vídeo, construídos sobre components/UI.
// Fundo slate-900/950, bordas white/10, texto slate-100, destaque primary-500/600.
// O prefixo "!" (important do Tailwind) sobrepõe as cores claras do componente base.
// ─────────────────────────────────────────────────────────────────────────────

type DarkVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const darkButtonClass: Record<DarkVariant, string> = {
  primary: '!bg-primary-600 !border-primary-600 !text-white hover:!bg-primary-500 hover:!border-primary-500',
  secondary: '!bg-white/5 !border-white/10 !text-slate-100 hover:!bg-white/10',
  ghost: '!bg-transparent !border-transparent !text-slate-300 hover:!bg-white/10 hover:!text-white',
  danger: '!bg-red-600 !border-red-600 !text-white hover:!bg-red-500 hover:!border-red-500',
};

type ButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant'> & { variant?: DarkVariant };

export const DarkButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', className, ...props }, ref) => (
    <Button ref={ref} variant="outline" className={cn(darkButtonClass[variant], className)} {...props} />
  )
);
DarkButton.displayName = 'DarkButton';

type IconProps = Omit<React.ComponentProps<typeof IconButton>, 'variant'> & {
  'aria-label': string;
  variant?: DarkVariant;
};

export const DarkIconButton = React.forwardRef<HTMLButtonElement, IconProps>(
  ({ variant = 'ghost', className, ...props }, ref) => (
    <IconButton ref={ref} variant="ghost" className={cn(darkButtonClass[variant], className)} {...props} />
  )
);
DarkIconButton.displayName = 'DarkIconButton';

const darkField =
  '!bg-white/5 !border-white/10 !text-slate-100 placeholder:!text-slate-500 focus:!border-primary-500 focus:!bg-white/5 focus:!ring-primary-500/20';

export const DarkInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, labelClassName, ...props }, ref) => (
    <Input ref={ref} className={cn(darkField, className)} labelClassName={cn('!text-slate-300', labelClassName)} {...props} />
  )
);
DarkInput.displayName = 'DarkInput';

export const DarkTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(
  ({ className, labelClassName, ...props }, ref) => (
    <Textarea ref={ref} className={cn(darkField, '!text-[13px] !font-normal', className)} labelClassName={cn('!text-slate-300', labelClassName)} {...props} />
  )
);
DarkTextarea.displayName = 'DarkTextarea';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
const badgeTone: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-slate-300',
  primary: 'bg-primary-500/20 text-primary-200',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-300',
  danger: 'bg-red-500/15 text-red-300',
};

export const DarkBadge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({ tone = 'neutral', className, children }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none', badgeTone[tone], className)}>{children}</span>
);

// ── Painel lateral: cabeçalho (título + fechar), corpo rolável e rodapé ──────
export const DarkPanelHeader: React.FC<{ title: React.ReactNode; icon?: React.ReactNode; onClose: () => void }> = ({ title, icon, onClose }) => (
  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
    <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
      {icon && <span className="flex shrink-0 text-primary-400">{icon}</span>}
      <span className="truncate">{title}</span>
    </span>
    <DarkIconButton aria-label="Fechar painel" size="sm" onClick={onClose}><X size={16} /></DarkIconButton>
  </div>
);

export const darkPanelShell = 'flex h-full flex-col border-l border-white/10 bg-slate-900 text-slate-100';

export const DarkPanel: React.FC<{
  title: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, onClose, footer, bodyClassName, children }) => (
  <div className={darkPanelShell}>
    <DarkPanelHeader title={title} icon={icon} onClose={onClose} />
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4', bodyClassName)}>{children}</div>
    {footer && <div className="shrink-0 border-t border-white/10 px-4 py-3">{footer}</div>}
  </div>
);

export const DarkCard: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('rounded-lg border border-white/10 bg-white/[0.04] p-3', className)}>{children}</div>
);

// ── Modal escuro (sobre o Modal do UI) ───────────────────────────────────────
export const DarkModal: React.FC<React.ComponentProps<typeof Modal>> = ({ className, headerClassName, ...props }) => (
  <Modal
    className={cn('!bg-slate-900 !text-slate-100 !border !border-white/10', className)}
    headerClassName={cn('!bg-slate-900 !text-white !border-white/10', headerClassName)}
    {...props}
  />
);

// ── Abas escuras ─────────────────────────────────────────────────────────────
export interface DarkTabItem<T extends string> { id: T; label: React.ReactNode; icon?: React.ReactNode; badge?: string | number }

export function DarkTabs<T extends string>({ items, value, onChange, label, className }: {
  items: readonly DarkTabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex max-w-full gap-1 overflow-x-auto border-b border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
              active ? 'border-primary-500 text-primary-300' : 'border-transparent text-slate-400 hover:text-slate-100'
            )}
          >
            {item.icon}{item.label}
            {item.badge !== undefined && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] leading-none">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
