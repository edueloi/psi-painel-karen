import React from "react";
import { cn } from "@/src/lib/utils";
import { Loader2 } from "lucide-react";
import { uiTheme, iconButtonVariants } from "./theme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "soft"
  | "softDanger"
  | "warning";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  /** Alias de loading (API legada). */
  isLoading?: boolean;
  loadingText?: React.ReactNode;
  iconLeft?: React.ReactNode;
  /** Alias de iconLeft (API legada). */
  leftIcon?: React.ReactNode;
  /** Alias de iconLeft (API do padrão). */
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Alias de iconRight (API legada). */
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Botão quadrado só com ícone. */
  iconOnly?: boolean;
  /** Aceito por compatibilidade; o padrão usa sempre rounded-md. */
  radius?: "md" | "lg" | "xl" | "full";
  /** Aceito por compatibilidade; o padrão não usa sombras. */
  elevation?: "none" | "sm" | "md" | "lg";
}

const extraVariants: Record<string, string> = {
  soft: "bg-slate-100 border-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-200 hover:text-slate-800",
  softDanger: "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 hover:border-rose-200 hover:text-rose-800",
  warning: "bg-amber-500 border-amber-600 text-white hover:bg-amber-600 hover:border-amber-700",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      loadingText,
      iconLeft: iconLeftProp,
      leftIcon,
      icon,
      iconRight: iconRightProp,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      radius: _radius,
      elevation: _elevation,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const resolvedLoading = loading || isLoading;
    const iconLeft = iconLeftProp ?? leftIcon ?? icon;
    const iconRight = iconRightProp ?? rightIcon;
    const variants: Record<string, string> = { ...uiTheme.button, ...extraVariants };
    const sizes: Record<string, string> = uiTheme.buttonSize;
    const iconSizes: Record<string, string> = uiTheme.iconButtonSize;

    const spinnerSize = size === "lg" ? 16 : size === "md" ? 15 : 13;

    return (
      <button
        ref={ref}
        disabled={disabled || resolvedLoading}
        className={cn(
          "ui-button relative inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap border",
          "font-medium leading-none select-none transition-all duration-150 active:scale-[.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/50 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
          fullWidth && "w-full",
          variants[variant] ?? variants.primary,
          iconOnly ? cn(iconSizes[size], "p-0 min-w-0") : sizes[size],
          className
        )}
        {...props}
      >
        {resolvedLoading ? (
          <>
            <Loader2 size={spinnerSize} className="animate-spin shrink-0" />
            {!iconOnly && (loadingText ?? children) != null && (
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap leading-none">
                {loadingText ?? children}
              </span>
            )}
          </>
        ) : (
          <>
            {iconLeft && (
              <span className="flex shrink-0 items-center justify-center">{iconLeft}</span>
            )}

            {children !== undefined && children !== null && (
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap leading-none [&>svg]:shrink-0">
                {children}
              </span>
            )}

            {iconRight && (
              <span className="flex shrink-0 items-center justify-center">{iconRight}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// ── IconButton ────────────────────────────────────────────────

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  /** Alias de loading (API legada). */
  isLoading?: boolean;
  /** Aceito por compatibilidade. */
  radius?: "md" | "lg" | "xl" | "full";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      loading = false,
      isLoading = false,
      radius: _radius,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const resolvedLoading = loading || isLoading;
    const variants: Record<string, string> = iconButtonVariants;
    const sizes: Record<string, string> = uiTheme.iconButtonSize;
    const spinnerSize = size === "lg" ? 16 : size === "md" ? 15 : 13;

    return (
      <button
        ref={ref}
        disabled={disabled || resolvedLoading}
        className={cn(
          "ui-icon-button inline-flex items-center justify-center shrink-0 border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/50 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {resolvedLoading ? <Loader2 size={spinnerSize} className="animate-spin" /> : children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default Button;
