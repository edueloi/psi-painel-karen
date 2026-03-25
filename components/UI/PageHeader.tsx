import React from 'react';
const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  containerClassName?: string;
  maxWidth?: string;
  iconGradient?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  actions,
  containerClassName = "mb-6",
  maxWidth = "max-w-[1600px]",
  iconGradient = "from-primary-600 to-violet-600",
}) => {
  return (
    <div className={cx(
      "bg-white border border-slate-200 px-6 py-5 rounded-[28px] shadow-sm",
      containerClassName
    )}>
      <div className={cx("mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6", maxWidth)}>
        <div className="flex items-center gap-4">
          <div className={cx(
            "w-12 h-12 bg-gradient-to-br rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-100 shrink-0 transition-all hover:scale-105 duration-300",
            iconGradient
          )}>
            {React.cloneElement(icon as React.ReactElement, { size: 24 })}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-bold uppercase tracking-[0.15em] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
