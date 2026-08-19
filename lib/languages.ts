export type LanguageCode =
  | 'en'
  | 'pt'
  | 'id'
  | 'es'
  | 'de'
  | 'tr'
  | 'fr'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'hu';

export type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  country: string;
};

export const DEFAULT_LANGUAGE: LanguageCode = 'tr';

/** discoweb-main ile aynı dil seti */
export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', country: 'United States' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', country: 'Brazil' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', country: 'Indonesia' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', country: 'Mexico' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', country: 'Germany' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', country: 'Türkiye' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', country: 'France' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', country: 'Italy' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar', country: 'Hungary' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', country: 'Japan' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', country: 'South Korea' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', country: 'Russia' },
] as const;

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

export function getLanguageDefinition(code: LanguageCode): LanguageDefinition {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) ?? SUPPORTED_LANGUAGES[0];
}
