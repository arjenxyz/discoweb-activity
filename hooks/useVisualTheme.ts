'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_VISUAL_THEME,
  VISUAL_THEME_EVENT,
  getVisualTheme,
  setVisualTheme,
  type VisualTheme,
} from '@/lib/visualTheme';

export function useVisualTheme() {
  const [theme, setThemeState] = useState<VisualTheme>(DEFAULT_VISUAL_THEME);

  useEffect(() => {
    setThemeState(getVisualTheme());
    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ theme: VisualTheme }>).detail?.theme;
      if (next) setThemeState(next);
    };
    window.addEventListener(VISUAL_THEME_EVENT, handler);
    return () => window.removeEventListener(VISUAL_THEME_EVENT, handler);
  }, []);

  const setTheme = useCallback((next: VisualTheme) => {
    setVisualTheme(next);
    setThemeState(next);
  }, []);

  return {
    theme,
    setTheme,
    isSoft: theme === 'soft',
  };
}
