export type VisualTheme = 'invincible' | 'soft';

export const VISUAL_THEME_STORAGE_KEY = 'visualTheme';
export const VISUAL_THEME_EVENT = 'visual-theme:change';

export const DEFAULT_VISUAL_THEME: VisualTheme = 'invincible';

export function isVisualTheme(value: string | null | undefined): value is VisualTheme {
  return value === 'invincible' || value === 'soft';
}

export function getVisualTheme(): VisualTheme {
  if (typeof window === 'undefined') return DEFAULT_VISUAL_THEME;
  try {
    const stored = localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    return isVisualTheme(stored) ? stored : DEFAULT_VISUAL_THEME;
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

export function setVisualTheme(theme: VisualTheme) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VISUAL_THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent(VISUAL_THEME_EVENT, { detail: { theme } }));
  } catch {
    /* ignore */
  }
}

export function isSoftVisualTheme(theme: VisualTheme = getVisualTheme()) {
  return theme === 'soft';
}
