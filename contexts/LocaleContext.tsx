'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { resolveLocale, translations, type SupportedLocale } from '@/lib/i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  setDiscordLocale: (discordLocale: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setDiscordLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language : '';
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('dashboard_locale');
        if (stored) return resolveLocale(stored);
      } catch {
        // ignore storage errors
      }
    }
    return resolveLocale(browserLocale);
  });

  const setDiscordLocale = useCallback((discordLocale: string) => {
    const next = resolveLocale(discordLocale);
    setLocale(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('dashboard_locale', next);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const raw = translations[locale][key] ?? translations['en'][key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        raw,
      );
    },
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setDiscordLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Sadece t() fonksiyonunu almak için kısayol. */
export function useT() {
  return useContext(LocaleContext).t;
}
