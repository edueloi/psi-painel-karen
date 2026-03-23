import React, { createContext, useContext, ReactNode } from 'react';
import { translations, Language } from '../translations';
import { useUserPreferences } from './UserPreferencesContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);


export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { preferences, updatePreference } = useUserPreferences();
  const language = preferences.general.language || 'pt';

  const setLanguage = (lang: Language) => {
    updatePreference('general', { language: lang });
  };

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
