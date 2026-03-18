import React, { createContext, useContext, useEffect, useState } from 'react';

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
  agenda: {
    viewMode: 'day' | 'week' | 'month';
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
  agenda: {
    viewMode: 'week',
  },
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <T extends keyof UserPreferences>(
    screen: T,
    updates: Partial<UserPreferences[T]>
  ) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    const stored = window.localStorage.getItem('psi_user_preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preference fields
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          comandas: { ...DEFAULT_PREFERENCES.comandas, ...parsed.comandas },
          patients: { ...DEFAULT_PREFERENCES.patients, ...parsed.patients },
          agenda: { ...DEFAULT_PREFERENCES.agenda, ...parsed.agenda },
        };
      } catch (e) {
        console.error('Error parsing user preferences:', e);
      }
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('psi_user_preferences', JSON.stringify(preferences));
    }
  }, [preferences]);

  const updatePreference = <T extends keyof UserPreferences>(
    screen: T,
    updates: Partial<UserPreferences[T]>
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [screen]: { ...prev[screen], ...updates },
    }));
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreference }}>
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
