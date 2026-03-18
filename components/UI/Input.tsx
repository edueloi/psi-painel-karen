import React from 'react';

type FieldSize = 'sm' | 'md' | 'lg';

interface BaseFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  size?: FieldSize;
  containerClassName?: string;
  labelClassName?: string;
}

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    BaseFieldProps {}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<BaseFieldProps, 'prefix' | 'suffix'> {}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const sizeMap: Record<FieldSize, { height: string; text: string; px: string }> = {
  sm: {
    height: 'h-9',
    text: 'text-sm',
    px: 'px-3',
  },
  md: {
    height: 'h-10',
    text: 'text-sm',
    px: 'px-3.5',
  },
  lg: {
    height: 'h-12',
    text: 'text-base',
    px: 'px-4',
  },
};

const getFieldShellClasses = (hasError?: boolean, disabled?: boolean) =>
  cx(
    'relative flex w-full items-center rounded-xl border bg-white transition-all duration-200',
    hasError
      ? 'border-red-300 ring-4 ring-red-500/10'
      : 'border-slate-300 hover:border-slate-400 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10',
    disabled && 'cursor-not-allowed bg-slate-50 opacity-70'
  );

const FieldMeta: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  labelClassName?: string;
}> = ({ label, required, error, hint, labelClassName }) => (
  <>
    <label
      className={cx(
        'mb-1.5 block text-[12px] font-medium text-slate-600',
        labelClassName
      )}
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    {(error || hint) && (
      <div className="mt-1 min-h-[16px]">
        {error ? (
          <span className="text-[11px] font-medium text-red-500">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-slate-400">{hint}</span>
        ) : null}
      </div>
    )}
  </>
);

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  size = 'md',
  className = '',
  containerClassName = '',
  labelClassName = '',
  disabled,
  ...props
}) => {
  const sizeStyle = sizeMap[size];

  return (
    <div className={cx('w-full', containerClassName)}>
      <FieldMeta
        label={label}
        required={required}
        error={error}
        hint={hint}
        labelClassName={labelClassName}
      />

      <div className={getFieldShellClasses(!!error, disabled)}>
        {leftIcon && (
          <div className="pointer-events-none pl-3 text-slate-400">
            {leftIcon}
          </div>
        )}

        {prefix && (
          <div className="border-r border-slate-200 px-3 text-sm font-medium text-slate-500">
            {prefix}
          </div>
        )}

        <input
          disabled={disabled}
          className={cx(
            'w-full bg-transparent outline-none placeholder:text-slate-400 text-slate-700',
            sizeStyle.height,
            sizeStyle.text,
            !leftIcon && !prefix ? sizeStyle.px : 'px-3',
            className
          )}
          {...props}
        />

        {suffix && (
          <div className="border-l border-slate-200 px-3 text-sm font-medium text-slate-500">
            {suffix}
          </div>
        )}

        {rightIcon && (
          <div className="pr-3 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
};

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  prefix,
  suffix,
  size = 'md',
  className = '',
  containerClassName = '',
  labelClassName = '',
  disabled,
  children,
  ...props
}) => {
  const sizeStyle = sizeMap[size];

  return (
    <div className={cx('w-full', containerClassName)}>
      <FieldMeta
        label={label}
        required={required}
        error={error}
        hint={hint}
        labelClassName={labelClassName}
      />

      <div className={getFieldShellClasses(!!error, disabled)}>
        {leftIcon && (
          <div className="pointer-events-none pl-3 text-slate-400">
            {leftIcon}
          </div>
        )}

        {prefix && (
          <div className="border-r border-slate-200 px-3 text-sm font-medium text-slate-500">
            {prefix}
          </div>
        )}

        <select
          disabled={disabled}
          className={cx(
            'w-full appearance-none bg-transparent outline-none text-slate-700',
            sizeStyle.height,
            sizeStyle.text,
            !leftIcon && !prefix ? sizeStyle.px : 'px-3',
            (suffix || rightIcon) ? 'pr-10' : 'pr-9',
            className
          )}
          {...props}
        >
          {children}
        </select>

        {suffix && (
          <div className="border-l border-slate-200 px-3 text-sm font-medium text-slate-500">
            {suffix}
          </div>
        )}

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {rightIcon || (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  size = 'md',
  className = '',
  containerClassName = '',
  labelClassName = '',
  disabled,
  rows = 4,
  ...props
}) => {
  const sizeStyle = sizeMap[size];

  return (
    <div className={cx('w-full', containerClassName)}>
      <FieldMeta
        label={label}
        required={required}
        error={error}
        hint={hint}
        labelClassName={labelClassName}
      />

      <div
        className={cx(
          'relative rounded-xl border bg-white transition-all duration-200',
          error
            ? 'border-red-300 ring-4 ring-red-500/10'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10',
          disabled && 'cursor-not-allowed bg-slate-50 opacity-70'
        )}
      >
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-3 text-slate-400">
            {leftIcon}
          </div>
        )}

        {rightIcon && (
          <div className="pointer-events-none absolute right-3 top-3 text-slate-400">
            {rightIcon}
          </div>
        )}

        <textarea
          disabled={disabled}
          rows={rows}
          className={cx(
            'w-full resize-none bg-transparent outline-none placeholder:text-slate-400 text-slate-700',
            sizeStyle.text,
            leftIcon ? 'pl-10' : 'pl-3.5',
            rightIcon ? 'pr-10' : 'pr-3.5',
            'py-3',
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

export * from './Combobox';