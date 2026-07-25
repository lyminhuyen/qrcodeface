'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import vi from '@/i18n/vi.json';
import en from '@/i18n/en.json';
import zh from '@/i18n/zh.json';

export type Locale = 'vi' | 'en' | 'zh';

type Translations = typeof vi;

const translations: Record<Locale, Translations> = { vi, en, zh };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Translations) => string;
}

// Default context value for SSR
const defaultContext: LanguageContextType = {
  locale: 'vi',
  setLocale: () => {},
  t: (key) => translations.vi[key] || key,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      const saved = localStorage.getItem('locale') as Locale;
      if (saved && translations[saved]) setLocaleState(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (mounted) {
      localStorage.setItem('locale', newLocale);
    }
  };

  const t = (key: keyof Translations): string => {
    return translations[locale][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
