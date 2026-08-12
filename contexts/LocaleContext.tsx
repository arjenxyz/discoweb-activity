'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

/** SSR + ilk client paint aynı olmalı; tarayıcı dilini mount sonrası uygula. */
const SSR_SAFE_LOCALE: SupportedLocale = 'en';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(SSR_SAFE_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('dashboard_locale');
      if (stored) {
        setLocale(resolveLocale(stored));
        return;
      }
    } catch {
      // ignore storage errors
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      setLocale(resolveLocale(navigator.language));
    }
  }, []);

  const setDiscordLocale = useCallback((discordLocale: string) => {
    const next = resolveLocale(discordLocale);
    setLocale(next);
    try {
      window.localStorage.setItem('dashboard_locale', next);
    } catch {
      // ignore storage errors
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
