import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useUserPreferences } from './UserPreferencesContext';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_COLORS_VARS: Record<string, Record<string, string>> = {
  Indigo: { '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81' },
  Emerald: { '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b' },
  Rose: { '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337' },
  Amber: { '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f' },
  Blue: { '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a' },
  Violet: { '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd', '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6', '900': '#4c1d95' }
};

const resolveMode = (mode: ThemeMode): ResolvedTheme => {
  if (mode !== 'auto') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, updatePreference } = useUserPreferences();
  
  const mode = preferences.appearance.theme;
  const primaryColor = preferences.appearance.primaryColor;
  
  const [resolvedMode, setResolvedMode] = useState<ResolvedTheme>(() => resolveMode(mode));

  const setMode = (newMode: ThemeMode) => {
    updatePreference('appearance', { theme: newMode });
  };

  const setPrimaryColor = (newColor: string) => {
    updatePreference('appearance', { primaryColor: newColor });
  };

  useEffect(() => {
    const nextResolved = resolveMode(mode);
    setResolvedMode(nextResolved);
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = nextResolved;
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vars = THEME_COLORS_VARS[primaryColor] || THEME_COLORS_VARS.Indigo;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(`--c-${key}`, value);
    });
  }, [primaryColor]);

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

  const value = useMemo(() => ({ 
    mode, 
    resolvedMode, 
    setMode, 
    primaryColor, 
    setPrimaryColor 
  }), [mode, resolvedMode, primaryColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
