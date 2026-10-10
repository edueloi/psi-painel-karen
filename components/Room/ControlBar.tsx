import React from 'react';
import { cn } from '@/src/lib/utils';
import { IconButton } from '../UI/Button';

type Tone = 'default' | 'active' | 'off' | 'danger' | 'recording';

const toneClass: Record<Tone, string> = {
  default: '!bg-white/10 !border-transparent !text-slate-100 hover:!bg-white/20',
  active: '!bg-primary-500/40 !border-transparent !text-primary-200 hover:!bg-primary-500/50',
  off: '!bg-red-500/20 !border-red-500/50 !text-red-400 hover:!bg-red-500/30',
  danger: '!bg-red-600 !border-red-600 !text-white hover:!bg-red-500',
  recording: '!bg-red-500/25 !border-transparent !text-red-400 hover:!bg-red-500/35',
};

const labelClass: Record<Tone, string> = {
  default: 'text-slate-400',
  active: 'text-primary-300',
  off: 'text-red-400',
  danger: 'text-red-400',
  recording: 'text-red-400',
};

/** Botão circular de 40px com rótulo; estados ativo/inativo/perigo. */
export const ControlItem: React.FC<{
  label: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: Tone;
  labelTone?: Tone | 'warning';
  pressed?: boolean;
  badge?: number;
  hideMobile?: boolean;
  title?: string;
}> = ({ label, ariaLabel, icon, onClick, tone = 'default', labelTone, pressed, badge, hideMobile, title }) => (
  <div className={cn('flex flex-col items-center gap-1', hideMobile && 'hide-mobile')}>
    <IconButton
      aria-label={ariaLabel || label}
      aria-pressed={pressed}
      title={title}
      size="lg"
      onClick={onClick}
      className={cn('relative !h-10 !w-10 !rounded-full', toneClass[tone])}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-slate-950 bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </IconButton>
    <span className={cn('text-[11px] leading-none', labelTone === 'warning' ? 'text-amber-400' : labelClass[labelTone || tone])}>{label}</span>
  </div>
);

/** Barra inferior de controles da chamada. */
export const ControlBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 pt-3 backdrop-blur-md"
    style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
  >
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">{children}</div>
  </div>
);
