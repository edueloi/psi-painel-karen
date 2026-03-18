import React from 'react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'warning'
  | 'soft'
  | 'softDanger'
  | 'link';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonRadius = 'md' | 'lg' | 'xl' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
  elevation?: 'none' | 'sm' | 'md';
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  radius = 'lg',
  className = '',
  isLoading = false,
  loadingText,
  disabled,
  fullWidth = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  elevation = 'sm',
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 select-none whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99]';

  const radiusStyles: Record<ButtonRadius, string> = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    xs: iconOnly ? 'h-7 w-7 text-xs' : 'h-7 px-2.5 text-xs',
    sm: iconOnly ? 'h-8 w-8 text-xs' : 'h-8 px-3 text-xs',
    md: iconOnly ? 'h-10 w-10 text-sm' : 'h-10 px-4 text-sm',
    lg: iconOnly ? 'h-11 w-11 text-sm' : 'h-11 px-5 text-sm',
    xl: iconOnly ? 'h-12 w-12 text-base' : 'h-12 px-6 text-base',
  };

  const elevationStyles: Record<NonNullable<ButtonProps['elevation']>, string> = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-500',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    warning:
      'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400',
    soft:
      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:ring-indigo-400',
    softDanger:
      'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400',
    link:
      'bg-transparent text-indigo-600 hover:text-indigo-700 hover:underline shadow-none focus-visible:ring-indigo-400 px-0 h-auto',
  };

  const content = (
    <>
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0A12 12 0 000 12h4zm2 5.291A7.958 7.958 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {!isLoading && leftIcon ? (
        <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
      ) : null}

      {!iconOnly && (
        <span className="inline-flex items-center">
          {isLoading && loadingText ? loadingText : children}
        </span>
      )}

      {!isLoading && rightIcon && !iconOnly ? (
        <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
      ) : null}
    </>
  );

  return (
    <button
      type={type}
      className={cx(
        baseStyles,
        radiusStyles[radius],
        sizeStyles[size],
        variantStyles[variant],
        variant !== 'ghost' && variant !== 'link' && elevation !== 'none' && elevationStyles[elevation],
        fullWidth && 'w-full',
        iconOnly && 'px-0',
        className
      )}
      disabled={isDisabled}
      aria-busy={isLoading}
      {...props}
    >
      {content}
    </button>
  );
};