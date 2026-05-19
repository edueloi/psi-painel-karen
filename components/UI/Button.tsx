import React from "react";
import { cn } from "@/src/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success"
    | "soft"
    | "softDanger";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  radius?: "md" | "lg" | "xl" | "full";
  elevation?: "none" | "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      loadingText,
      iconLeft,
      iconRight,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      radius = "xl",
      elevation = "none",
      children,
      disabled,
      ...props
    },
    ref
    ) => {
    const resolvedLoading = loading || isLoading;
    const resolvedLeftIcon = iconLeft ?? leftIcon;
    const resolvedRightIcon = iconRight ?? rightIcon;

    const variants: Record<string, string> = {
      primary:
        "bg-[#2a74ac] border-[#295b85] text-white hover:bg-[#295b85] hover:border-[#264a6c]",
      secondary:
        "bg-[#295b85] border-[#143a59] text-white hover:bg-[#143a59] hover:border-[#0b2942]",
      success:
        "bg-[#4f8d67] border-[#3d6c50] text-white hover:bg-[#3d6c50] hover:border-[#325641]",
      danger:
        "bg-[#aa403d] border-[#7f3431] text-white hover:bg-[#7f3431] hover:border-[#642d2a]",
      outline:
        "bg-white border-[#2a74ac] text-[#2a74ac] hover:bg-[#e6e7e8] hover:border-[#487295] hover:text-[#487295]",
      ghost:
        "bg-transparent border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-700",
      soft:
        "bg-slate-100 border-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-200 hover:text-slate-800",
      softDanger:
        "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 hover:border-rose-200 hover:text-rose-800",
    };

    const sizes: Record<string, string> = {
      xs: "h-7 min-w-[74px] px-2.5 text-[11px] rounded-[20px]",
      sm: "h-8 min-w-[82px] px-3 text-[12px] rounded-[20px]",
      md: "h-9 min-w-[90px] px-4 text-[13px] rounded-[20px]",
      lg: "h-10 min-w-[110px] px-5 text-[14px] rounded-[20px]",
    };

    const iconOnlySizes: Record<string, string> = {
      xs: "h-7 w-7 rounded-[10px] p-0 min-w-0",
      sm: "h-8 w-8 rounded-[10px] p-0 min-w-0",
      md: "h-9 w-9 rounded-[12px] p-0 min-w-0",
      lg: "h-10 w-10 rounded-[12px] p-0 min-w-0",
    };

    const radiusClasses: Record<string, string> = {
      md: "rounded-xl",
      lg: "rounded-2xl",
      xl: "rounded-[20px]",
      full: "rounded-full",
    };

    const elevationClasses: Record<string, string> = {
      none: "",
      sm: "shadow-sm",
      md: "shadow-md shadow-slate-200/70",
      lg: "shadow-lg shadow-slate-200/80",
    };

    const spinnerSize = size === "lg" ? 16 : size === "md" ? 15 : 13;
    const showOnlyIcon = iconOnly;

    return (
      <button
        ref={ref}
        disabled={disabled || resolvedLoading}
        className={cn(
          "relative inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap border-2",
          "font-semibold leading-none select-none transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
          fullWidth && "w-full",
          variants[variant],
          showOnlyIcon ? iconOnlySizes[size] : sizes[size],
          !showOnlyIcon && radiusClasses[radius],
          elevationClasses[elevation],
          className
        )}
        {...props}
      >
        {resolvedLoading ? (
          <>
            <Loader2 size={spinnerSize} className="animate-spin shrink-0" />
            {!showOnlyIcon && (
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap leading-none">
                {loadingText ?? children}
              </span>
            )}
          </>
        ) : (
          <>
            {resolvedLeftIcon && (
              <span className="flex shrink-0 items-center justify-center">
                {resolvedLeftIcon}
              </span>
            )}

            {children !== undefined && children !== null && (
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap leading-none [&>svg]:shrink-0">
                {children}
              </span>
            )}

            {resolvedRightIcon && (
              <span className="flex shrink-0 items-center justify-center">
                {resolvedRightIcon}
              </span>
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
  isLoading?: boolean;
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
      radius = "md",
      children,
      disabled,
      ...props
    },
    ref
    ) => {
    const resolvedLoading = loading || isLoading;

    const variants: Record<string, string> = {
      primary:
        "bg-[#2a74ac] border-[#295b85] text-white hover:bg-[#295b85] hover:border-[#264a6c]",
      secondary:
        "bg-[#295b85] border-[#143a59] text-white hover:bg-[#143a59] hover:border-[#0b2942]",
      success:
        "bg-[#4f8d67] border-[#3d6c50] text-white hover:bg-[#3d6c50] hover:border-[#325641]",
      danger:
        "bg-[#aa403d] border-[#7f3431] text-white hover:bg-[#7f3431] hover:border-[#642d2a]",
      outline:
        "bg-white border-[#2a74ac] text-[#2a74ac] hover:bg-[#e6e7e8] hover:border-[#487295] hover:text-[#487295]",
      ghost:
        "bg-transparent border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-700",
    };

    const sizes: Record<string, string> = {
      xs: "h-7 w-7 rounded-[10px]",
      sm: "h-8 w-8 rounded-[10px]",
      md: "h-9 w-9 rounded-[12px]",
      lg: "h-10 w-10 rounded-[12px]",
    };

    const radiusClasses: Record<string, string> = {
      md: "rounded-xl",
      lg: "rounded-2xl",
      xl: "rounded-[20px]",
      full: "rounded-full",
    };

    const spinnerSize = size === "lg" ? 16 : size === "md" ? 15 : 13;

    return (
      <button
        ref={ref}
        disabled={disabled || resolvedLoading}
        className={cn(
          "inline-flex items-center justify-center shrink-0 border-2 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
          variants[variant],
          sizes[size],
          radiusClasses[radius],
          className
        )}
        {...props}
      >
        {resolvedLoading ? (
          <Loader2 size={spinnerSize} className="animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
