import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export interface UserPreferences {
  comandas: {
    viewMode: 'kanban' | 'list';
    statusFilter: 'open' | 'closed';
    dateRangeFilter: 'today' | 'month' | 'year' | 'all';
  };
  patients: {
    viewMode: 'cards' | 'list';
    statusFilter: 'all' | 'ativo' | 'inativo';
  };
  services: {
    viewMode: 'cards' | 'list';
    activeTab: 'services' | 'packages';
  };
  agenda: {
    viewMode: 'day' | 'week' | 'month';
    stickyStats: boolean;
  };
  caseStudies: {
    viewMode: 'grid' | 'list';
  };
  forms: {
    activeFilter: 'Todos' | 'Ativos' | 'Arquivados' | 'Favoritos';
  };
  disc: {
    selectedPatientId: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
  };
  general: {
    timezone: string;
    language: 'pt' | 'en' | 'es';
  };
  messages: {
    viewMode: 'cards' | 'list';
    patientStatusFilter: 'all' | 'ativo' | 'inativo';
    itemsPerPage: number;
  };
  livroCaixa: {
    itemsPerPage: number;
    stickyStats: boolean;
  };
  clinicalTools: {
    orderedIds: string[];
    hiddenIds: string[];
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  comandas: {
    viewMode: 'kanban',
    statusFilter: 'open',
    dateRangeFilter: 'month',
  },
  patients: {
    viewMode: 'cards',
    statusFilter: 'all',
  },
  services: {
    viewMode: 'cards',
    activeTab: 'services',
  },
  agenda: {
    viewMode: 'week',
    stickyStats: false,
  },
  caseStudies: {
    viewMode: 'grid',
  },
  forms: {
    activeFilter: 'Todos',
  },
  disc: {
    selectedPatientId: '',
  },
  appearance: {
    theme: 'auto',
    primaryColor: 'Indigo',
  },
  general: {
    timezone: 'America/Sao_Paulo',
    language: 'pt',
  },
  messages: {
    viewMode: 'cards',
    patientStatusFilter: 'all',
    itemsPerPage: 15,
  },
  livroCaixa: {
    itemsPerPage: 15,
    stickyStats: false,
  },
  clinicalTools: {
    orderedIds: [],
    hiddenIds: [],
  },
};

function mergeWithDefaults(stored: any): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    comandas:    { ...DEFAULT_PREFERENCES.comandas,    ...stored?.comandas },
    patients:    { ...DEFAULT_PREFERENCES.patients,    ...stored?.patients },
    services:    { ...DEFAULT_PREFERENCES.services,    ...stored?.services },
    agenda:      { ...DEFAULT_PREFERENCES.agenda,      ...stored?.agenda },
    caseStudies: { ...DEFAULT_PREFERENCES.caseStudies, ...stored?.caseStudies },
    forms:       { ...DEFAULT_PREFERENCES.forms,       ...stored?.forms },
    disc:        { ...DEFAULT_PREFERENCES.disc,        ...stored?.disc },
    appearance:  { ...DEFAULT_PREFERENCES.appearance,  ...stored?.appearance },
    general:     { ...DEFAULT_PREFERENCES.general,     ...stored?.general },
    messages:    { ...DEFAULT_PREFERENCES.messages,    ...stored?.messages },
    livroCaixa:  { ...DEFAULT_PREFERENCES.livroCaixa,  ...stored?.livroCaixa },
    clinicalTools: { ...DEFAULT_PREFERENCES.clinicalTools, ...stored?.clinicalTools },
  };
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <T extends keyof UserPreferences>(
    screen: T,
    updates: Partial<UserPreferences[T]>
  ) => void;
  formsArchived: string[];
  setFormsArchived: (ids: string[]) => void;
  formsFavorites: string[];
  setFormsFavorites: (ids: string[]) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [formsArchived, setFormsArchivedState] = useState<string[]>([]);
  const [formsFavorites, setFormsFavoritesState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // debounce timer ref so we don't spam the API on every keystroke
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load from backend on mount/auth ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated) {
        setPreferences(DEFAULT_PREFERENCES);
        setFormsArchivedState([]);
        setFormsFavoritesState([]);
        setLoaded(true);
        return;
      }

      const token = localStorage.getItem('psi_token');
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3013';
        const res = await fetch(`${baseUrl}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setLoaded(true);
          return;
        }
        const profile = await res.json();
        if (profile?.ui_preferences) {
          setPreferences(mergeWithDefaults(profile.ui_preferences));
        }
        if (Array.isArray(profile?.forms_archived)) {
          setFormsArchivedState(profile.forms_archived.map(String));
        }
        if (Array.isArray(profile?.forms_favorites)) {
          setFormsFavoritesState(profile.forms_favorites.map(String));
        }
      } catch {
        // Network error — just use defaults silently
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [isAuthenticated]);


  // ─── Persist to backend (debounced 800ms) ─────────────────────────────────
  const persistToBackend = (prefs: UserPreferences, archived: string[], favorites: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.patch('/profile/preferences', {
        ui_preferences: prefs,
        forms_archived: archived,
        forms_favorites: favorites,
      }).catch(() => {/* ignore network errors silently */});
    }, 800);
  };

  // ─── updatePreference ──────────────────────────────────────────────────────
  const updatePreference = <T extends keyof UserPreferences>(
    screen: T,
    updates: Partial<UserPreferences[T]>
  ) => {
    setPreferences((prev) => {
      const next: UserPreferences = {
        ...prev,
        [screen]: { ...prev[screen], ...updates },
      };
      if (loaded) persistToBackend(next, formsArchived, formsFavorites);
      return next;
    });
  };

  // ─── setFormsArchived ──────────────────────────────────────────────────────
  const setFormsArchived = (ids: string[]) => {
    setFormsArchivedState(ids);
    if (loaded) persistToBackend(preferences, ids, formsFavorites);
  };

  // ─── setFormsFavorites ─────────────────────────────────────────────────────
  const setFormsFavorites = (ids: string[]) => {
    setFormsFavoritesState(ids);
    if (loaded) persistToBackend(preferences, formsArchived, ids);
  };

  if (!loaded) return null;

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreference, formsArchived, setFormsArchived, formsFavorites, setFormsFavorites }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};

/**
 * Hook utilitário para formatar datas usando o fuso horário salvo nas preferências do usuário.
 * Exemplo: const { formatDate } = useDateFormat();
 */
export const useDateFormat = () => {
  const { preferences } = useUserPreferences();
  const tz = preferences.general?.timezone || 'America/Sao_Paulo';

  const formatDate = (value?: string | null, opts?: Intl.DateTimeFormatOptions): string => {
    if (!value) return '';
    try {
      let dateStr = value;
      // Se vier do banco sem indicador de fuso (ex: '2026-03-20 19:56:00'), trata como UTC
      if (dateStr.includes(' ') && !dateStr.includes('T') && !dateStr.includes('Z')) {
        dateStr = dateStr.replace(' ', 'T') + 'Z';
      } else if (!dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
        dateStr = dateStr + 'Z';
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
        ...opts,
      });
    } catch {
      return value;
    }
  };

  const formatShortDate = (value?: string | null): string =>
    formatDate(value, { year: undefined, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return { formatDate, formatShortDate, timezone: tz };
};
