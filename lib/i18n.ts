import trAuth from '@/locales/tr/auth.json';
import trDashboard from '@/locales/tr/dashboard.json';
import trErrors from '@/locales/tr/errors.json';
import trMail from '@/locales/tr/mail.json';
import trMisc from '@/locales/tr/misc.json';
import trNotifications from '@/locales/tr/notifications.json';
import trStore from '@/locales/tr/store.json';
import trUI from '@/locales/tr/ui.json';
import trWallet from '@/locales/tr/wallet.json';
import trPrivacy from '@/locales/tr/privacy.json';
import trDocs from '@/locales/tr/docs.json';

import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enErrors from '@/locales/en/errors.json';
import enMail from '@/locales/en/mail.json';
import enMisc from '@/locales/en/misc.json';
import enNotifications from '@/locales/en/notifications.json';
import enStore from '@/locales/en/store.json';
import enUI from '@/locales/en/ui.json';
import enWallet from '@/locales/en/wallet.json';
import enPrivacy from '@/locales/en/privacy.json';
import enDocs from '@/locales/en/docs.json';

export type SupportedLocale = 'tr' | 'en';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    ...trAuth, ...trDashboard, ...trErrors, ...trMail, ...trMisc,
    ...trNotifications, ...trStore, ...trUI, ...trWallet, ...trPrivacy, ...trDocs,
  },
  en: {
    ...enAuth, ...enDashboard, ...enErrors, ...enMail, ...enMisc,
    ...enNotifications, ...enStore, ...enUI, ...enWallet, ...enPrivacy, ...enDocs,
  },
};

/**
 * Discord locale string'ini desteklenen locale'e çevirir.
 * Örn: "tr" → "tr", "en-US" → "en", "de" → "en"
 */
export function resolveLocale(discordLocale: string | null | undefined): SupportedLocale {
  if (!discordLocale) return 'en';
  if (discordLocale.startsWith('tr')) return 'tr';
  return 'en';
}
