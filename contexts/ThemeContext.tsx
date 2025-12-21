import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('psi_theme') as ThemeMode | null;
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'light';
};

const resolveMode = (mode: ThemeMode): ResolvedTheme => {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialMode());
  const [resolvedMode, setResolvedMode] = useState<ResolvedTheme>(() => resolveMode(getInitialMode()));

  useEffect(() => {
    const nextResolved = resolveMode(mode);
    setResolvedMode(nextResolved);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('psi_theme', mode);
      document.documentElement.dataset.theme = nextResolved;
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'auto' || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedMode(resolveMode('auto'));
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, [mode]);

  const value = useMemo(() => ({ mode, resolvedMode, setMode: setModeState }), [mode, resolvedMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
