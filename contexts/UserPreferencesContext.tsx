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
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
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
  },
  appearance: {
    theme: 'auto',
    primaryColor: 'Indigo',
  },
};

function mergeWithDefaults(stored: any): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    comandas:  { ...DEFAULT_PREFERENCES.comandas,  ...stored?.comandas },
    patients:  { ...DEFAULT_PREFERENCES.patients,  ...stored?.patients },
    services:  { ...DEFAULT_PREFERENCES.services,  ...stored?.services },
    agenda:    { ...DEFAULT_PREFERENCES.agenda,    ...stored?.agenda },
    appearance:{ ...DEFAULT_PREFERENCES.appearance,...stored?.appearance },
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
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [formsArchived, setFormsArchivedState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // debounce timer ref so we don't spam the API on every keystroke
  // ─── Load from local storage on mount ──────────────────────────────────────────
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem('@psi_user_preferences');
      if (storedPrefs) {
        setPreferences(mergeWithDefaults(JSON.parse(storedPrefs)));
      }
      
      const storedArchived = localStorage.getItem('@psi_forms_archived');
      if (storedArchived) {
        setFormsArchivedState(JSON.parse(storedArchived));
      }
    } catch (e) {
      console.error('Failed to load preferences from storage', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // ─── Persist to local storage ──────────────────────────────────────────────────
  const persistToStorage = (prefs: UserPreferences, archived: string[]) => {
    try {
      localStorage.setItem('@psi_user_preferences', JSON.stringify(prefs));
      localStorage.setItem('@psi_forms_archived', JSON.stringify(archived));
    } catch (e) {
      console.error('Failed to save preferences to storage', e);
    }
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
      if (loaded) persistToStorage(next, formsArchived);
      return next;
    });
  };

  // ─── setFormsArchived ──────────────────────────────────────────────────────
  const setFormsArchived = (ids: string[]) => {
    setFormsArchivedState(ids);
    if (loaded) persistToStorage(preferences, ids);
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreference, formsArchived, setFormsArchived }}>
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
