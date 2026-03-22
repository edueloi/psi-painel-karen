import React, { useMemo, useState } from 'react';
import {
  Check,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  X,
} from 'lucide-react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusAlertProps {
  variant?: AlertVariant;
  title: string;
  message?: string;
  details?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const StatusAlert: React.FC<StatusAlertProps> = ({
  variant = 'success',
  title,
  message,
  details,
  collapsible = false,
  defaultExpanded = false,
  onClose,
  className = '',
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const theme = useMemo(() => {
    switch (variant) {
      case 'success':
        return {
          rail: 'bg-emerald-600',
          iconWrap: 'bg-white text-emerald-600',
          title: 'text-slate-700',
          text: 'text-slate-500',
          border: 'border-slate-200',
          soft: 'bg-emerald-50 text-emerald-700',
          icon: <Check size={compact ? 18 : 20} strokeWidth={3} />,
        };

      case 'warning':
        return {
          rail: 'bg-amber-500',
          iconWrap: 'bg-white text-amber-600',
          title: 'text-slate-700',
          text: 'text-slate-500',
          border: 'border-slate-200',
          soft: 'bg-amber-50 text-amber-700',
          icon: <AlertTriangle size={compact ? 18 : 20} strokeWidth={2.6} />,
        };

      case 'error':
        return {
          rail: 'bg-red-600',
          iconWrap: 'bg-white text-red-600',
          title: 'text-slate-700',
          text: 'text-slate-500',
          border: 'border-slate-200',
          soft: 'bg-red-50 text-red-700',
          icon: <XCircle size={compact ? 18 : 20} strokeWidth={2.4} />,
        };

      case 'info':
      default:
        return {
          rail: 'bg-sky-600',
          iconWrap: 'bg-white text-sky-600',
          title: 'text-slate-700',
          text: 'text-slate-500',
          border: 'border-slate-200',
          soft: 'bg-sky-50 text-sky-700',
          icon: <Info size={compact ? 18 : 20} strokeWidth={2.4} />,
        };
    }
  }, [variant, compact]);

  return (
    <div
      className={cx(
        'overflow-hidden rounded-2xl border bg-white shadow-sm',
        theme.border,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex min-h-[88px]">
        {/* Faixa lateral */}
        <div
          className={cx(
            'relative flex w-[54px] shrink-0 items-center justify-center',
            compact ? 'w-[48px]' : 'w-[54px]',
            theme.rail
          )}
        >
          <div
            className={cx(
              'flex items-center justify-center rounded-full shadow-sm',
              theme.iconWrap,
              compact ? 'h-10 w-10' : 'h-12 w-12'
            )}
          >
            {theme.icon}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={cx(
              'flex items-start justify-between gap-3',
              compact ? 'px-4 py-3' : 'px-5 py-4'
            )}
          >
            <div className="min-w-0 flex-1">
              <h4
                className={cx(
                  'font-semibold leading-snug',
                  compact ? 'text-sm' : 'text-[15px]',
                  theme.title
                )}
              >
                {title}
              </h4>

              {message && (
                <p
                  className={cx(
                    'mt-1 leading-relaxed',
                    compact ? 'text-xs' : 'text-sm',
                    theme.text
                  )}
                >
                  {message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {collapsible && details && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                >
                  <ChevronDown
                    size={18}
                    className={cx('transition-transform', expanded && 'rotate-180')}
                  />
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fechar alerta"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {details && expanded && (
            <div className="border-t border-slate-100 px-5 py-4">
              <div
                className={cx(
                  'rounded-xl px-3 py-3 text-sm',
                  theme.soft
                )}
              >
                {details}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};