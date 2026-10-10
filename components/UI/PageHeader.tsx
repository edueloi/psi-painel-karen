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
  containerClassName = "",
  maxWidth = "max-w-none",
  // Default alinhado ao ícone do SectionTitle (fundo pastel âmbar, sem
  // gradiente saturado) — mantém o mesmo "ar" visual entre as duas variantes
  // de cabeçalho que coexistem no design system. Passe iconGradient para
  // sobrescrever quando fizer sentido (ex: destaque de uma ação específica).
  iconGradient,
  showBackButton = false,
  onBackClick,
}) => {
  const hasCustomGradient = !!iconGradient;
  return (
    <div className={cx("w-full", containerClassName)}>
      <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", maxWidth)}>
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={onBackClick}
              aria-label="Voltar"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          <div
            className={cx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              hasCustomGradient
              ? cx("bg-gradient-to-br text-white", iconGradient)
                : "border border-primary-100 bg-primary-50 text-primary-600"
            )}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 15 })
              : icon}
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-medium text-slate-900 sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
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
