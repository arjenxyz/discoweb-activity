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
    return resolveLocale(browserLocale);
  });

  const setDiscordLocale = useCallback((discordLocale: string) => {
    setLocale(resolveLocale(discordLocale));
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
