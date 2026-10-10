/** Padrões extraídos das telas aprovadas; as páginas continuam podendo personalizar className. */
export const uiTheme = {
  surface: 'rounded-lg border border-slate-200 bg-white',
  popover: 'bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden',
  focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300/50 focus-visible:ring-offset-1',
  button: {
    primary: 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700 hover:border-primary-700 shadow-none',
    // Neste sistema "secondary" é o botão branco com borda (mesmo visual de outline).
    secondary: 'bg-white border-slate-200 text-slate-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700',
    success: 'bg-[#4f8d67] border-[#3d6c50] text-white hover:bg-[#3d6c50] hover:border-[#325641]',
    danger: 'bg-[#aa403d] border-[#7f3431] text-white hover:bg-[#7f3431] hover:border-[#642d2a]',
    outline: 'bg-white border-slate-200 text-slate-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700',
    ghost: 'bg-transparent border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-700',
  },
  buttonSize: {
    xs: 'h-7 min-w-[52px] px-2 text-[11px] rounded-md',
    sm: 'h-8 min-w-[60px] px-2.5 text-[12px] rounded-md',
    md: 'h-8 min-w-[60px] px-3 text-[12px] rounded-md',
    lg: 'h-9 min-w-[72px] px-3.5 text-[13px] rounded-md',
  },
  iconButtonSize: {
    xs: 'h-7 w-7 rounded-md', sm: 'h-8 w-8 rounded-md',
    md: 'h-9 w-9 rounded-md', lg: 'h-10 w-10 rounded-md',
  },
  table: {
    surface: 'bg-white sm:border border-zinc-200 sm:rounded-lg sm:shadow-sm',
    header: 'bg-zinc-50 border-b border-zinc-200',
  },
  alert: {
    info: 'border-primary-100 bg-primary-50 text-primary-700',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-red-200 bg-red-50 text-red-700',
  },
} as const;

// Os botões somente com ícone mantêm as bordas das telas já aprovadas.
export const iconButtonVariants = {
  ...uiTheme.button,
  primary: 'bg-primary-600 border-primary-700 text-white hover:bg-primary-700 hover:border-primary-800',
  outline: 'bg-white border-primary-600 text-primary-600 hover:bg-primary-50 hover:border-primary-700 hover:text-primary-700',
} as const;
