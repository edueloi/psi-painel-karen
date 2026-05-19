import { ChevronLeft } from "lucide-react";
import React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  containerClassName?: string;
  maxWidth?: string;
  iconGradient?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  actions,
  containerClassName = "mb-6",
  maxWidth = "max-w-none",
  iconGradient = "from-primary-600 to-violet-600",
  showBackButton = false,
  onBackClick,
}) => {
  return (
    <div className={cx("w-full", containerClassName)}>
      <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", maxWidth)}>
        <div className="flex min-w-0 items-start gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={onBackClick}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
              iconGradient
            )}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 18 })
              : icon}
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-black tracking-tight text-zinc-900 sm:text-xl lg:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
