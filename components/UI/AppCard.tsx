import React from 'react';
import { Check, MoreHorizontal } from 'lucide-react';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type CardTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface CardAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'outline' | 'soft' | 'danger';
  disabled?: boolean;
}

interface CardBadge {
  label: string;
  tone?: CardTone;
  icon?: React.ReactNode;
}

interface CardMetaItem {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}

interface CardStatItem {
  label: string;
  value: React.ReactNode;
  tone?: CardTone;
  align?: 'left' | 'right';
}

interface CardSection {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
}

interface AppCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  avatarText?: string;
  avatarIcon?: React.ReactNode;
  badge?: CardBadge;
  badges?: CardBadge[];
  meta?: CardMetaItem[];
  sections?: CardSection[];
  stats?: CardStatItem[];
  topActions?: CardAction[];
  bottomActions?: CardAction[];
  progressValue?: number;
  progressMax?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
  id?: string;
}

const toneMap: Record<CardTone, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
};

const statToneMap: Record<CardTone, string> = {
  default: 'text-slate-800',
  primary: 'text-primary-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
};

const actionVariantMap = {
  ghost:
    'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700',
  outline:
    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800',
  soft:
    'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
  danger:
    'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100',
};

const BadgePill: React.FC<CardBadge> = ({ label, tone = 'default', icon }) => (
  <div
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
      toneMap[tone]
    )}
  >
    {icon}
    <span>{label}</span>
  </div>
);

const ActionButton: React.FC<CardAction & { compact?: boolean }> = ({
  label,
  icon,
  onClick,
  variant = 'outline',
  disabled,
  compact = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={cx(
      'inline-flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
      compact ? 'h-9 w-9' : 'h-10 px-4 gap-2 text-sm font-medium',
      actionVariantMap[variant]
    )}
  >
    {icon}
    {!compact && <span>{label}</span>}
  </button>
);

export const AppCard: React.FC<AppCardProps> = ({
  title,
  subtitle,
  description,
  imageUrl,
  avatarText,
  avatarIcon,
  badge,
  badges,
  meta = [],
  sections = [],
  stats = [],
  topActions = [],
  bottomActions = [],
  progressValue,
  progressMax = 100,
  selectable = false,
  selected = false,
  onSelect,
  onClick,
  className = '',
  compact = false,
  children,
  id,
}) => {
  const progressPercent =
    typeof progressValue === 'number'
      ? Math.max(0, Math.min(100, (progressValue / (progressMax || 1)) * 100))
      : null;

  return (
    <div
      id={id}
      onClick={onClick}
      className={cx(
        'relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all text-left',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
        compact ? 'p-4' : 'p-5',
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          {selectable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              className={cx(
                'absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg border transition text-left',
                selected
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-slate-300 bg-white text-transparent hover:border-primary-400'
              )}
              aria-label="Selecionar card"
            >
              <Check size={14} />
            </button>
          )}

          {/* HEADER */}
          <div className="flex items-start justify-between gap-3 text-left">
            <div className={cx('flex min-w-0 items-start gap-3 text-left', selectable && 'pl-6')}>
              <div className="shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title || ''}
                    className={cx(
                      'object-cover rounded-2xl border border-slate-200',
                      compact ? 'h-12 w-12' : 'h-14 w-14'
                    )}
                  />
                ) : (
                  <div
                    className={cx(
                      'flex items-center justify-center rounded-2xl bg-primary-100 text-primary-700 font-bold border border-primary-100',
                      compact ? 'h-12 w-12 text-base' : 'h-14 w-14 text-lg'
                    )}
                  >
                    {avatarIcon || avatarText || (typeof title === 'string' && title.length > 0 ? title.charAt(0) : '?')}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-left">
                <h3
                  className={cx(
                    'truncate font-semibold text-slate-800 text-left',
                    compact ? 'text-[15px]' : 'text-base'
                  )}
                >
                  {title}
                </h3>

                {subtitle && (
                  <p className="mt-0.5 text-sm text-slate-400 truncate text-left">{subtitle}</p>
                )}

                {(badge || badges?.length) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-left">
                    {badge && <BadgePill {...badge} />}
                    {badges?.map((item, index) => (
                      <BadgePill key={index} {...item} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {topActions.length > 0 && (
              <div
                className="flex shrink-0 gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {topActions.map((action, index) => (
                  <ActionButton
                    key={action.id || `${action.label}-${index}`}
                    {...action}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          {/* META */}
          {meta.length > 0 && (
            <div className="mt-4 space-y-2 text-left">
              {meta.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-slate-500 text-left"
                >
                  {item.icon && <span className="text-slate-400">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                  {item.value && (
                    <span className="ml-auto shrink-0 font-medium text-slate-700">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DESCRIPTION */}
          {description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-500 text-left">
              {description}
            </p>
          )}

          {/* SECTIONS */}
          {sections.length > 0 && (
            <div className="mt-4 space-y-3 text-left">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left"
                >
                  {(section.icon || section.title || section.subtitle) && (
                    <div className="mb-2 flex items-start gap-2 text-left">
                      {section.icon && (
                        <div className="mt-0.5 text-primary-500">{section.icon}</div>
                      )}

                      <div className="min-w-0 text-left">
                        {section.title && (
                          <p className="truncate text-sm font-medium text-slate-800 text-left">
                            {section.title}
                          </p>
                        )}
                        {section.subtitle && (
                          <p className="text-xs text-slate-400 text-left">{section.subtitle}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {section.content}
                </div>
              ))}
            </div>
          )}

          {/* PROGRESS */}
          {progressPercent !== null && (
            <div className="mt-4 text-left">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Progresso</span>
                <span>
                  {progressValue}/{progressMax}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* STATS */}
          {stats.length > 0 && (
            <div
              className={cx(
                'mt-4 grid gap-3 border-t border-slate-100 pt-4 text-left',
                stats.length === 1
                  ? 'grid-cols-1'
                  : stats.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              )}
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={cx(
                    'min-w-0 overflow-hidden',
                    stat.align === 'right' && 'text-right'
                  )}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{stat.label}</p>
                  <p
                    className={cx(
                      'text-base font-black truncate',
                      statToneMap[stat.tone || 'default']
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* BOTTOM ACTIONS */}
          {bottomActions.length > 0 && (
            <div
              className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {bottomActions.map((action, index) => (
                <ActionButton
                  key={action.id || `${action.label}-${index}`}
                  {...action}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};