import trAuth from '@/locales/tr/auth.json';
import trDashboard from '@/locales/tr/dashboard.json';
import trDm from '@/locales/tr/dm.json';
import trDocs from '@/locales/tr/docs.json';
import trErrors from '@/locales/tr/errors.json';
import trMail from '@/locales/tr/mail.json';
import trMisc from '@/locales/tr/misc.json';
import trNotifications from '@/locales/tr/notifications.json';
import trPrivacy from '@/locales/tr/privacy.json';
import trProfile from '@/locales/tr/profile.json';
import trStore from '@/locales/tr/store.json';
import trUI from '@/locales/tr/ui.json';
import trWallet from '@/locales/tr/wallet.json';
import trWelcome from '@/locales/tr/welcome.json';
import trSupport from '@/locales/tr/support.json';

import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enDm from '@/locales/en/dm.json';
import enErrors from '@/locales/en/errors.json';
import enMail from '@/locales/en/mail.json';
import enMisc from '@/locales/en/misc.json';
import enNotifications from '@/locales/en/notifications.json';
import enProfile from '@/locales/en/profile.json';
import enStore from '@/locales/en/store.json';
import enUI from '@/locales/en/ui.json';
import enWallet from '@/locales/en/wallet.json';
import enWelcome from '@/locales/en/welcome.json';
import enSupport from '@/locales/en/support.json';

export type SupportedLocale = 'tr' | 'en';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    ...trAuth, ...trDashboard, ...trDm, ...trDocs, ...trErrors, ...trMail, ...trMisc,
    ...trNotifications, ...trPrivacy, ...trProfile, ...trStore, ...trUI, ...trWallet, ...trWelcome,
    ...trSupport,
  },
  en: {
    ...enAuth, ...enDashboard, ...enDm, ...enErrors, ...enMail, ...enMisc,
    ...enNotifications, ...enProfile, ...enStore, ...enUI, ...enWallet, ...enWelcome,
    ...enSupport,
  },
};

/**
 * Discord locale string'ini desteklenen locale'e çevirir.
 * Turkish kullanıcılar Türkçe, diğerleri İngilizce görür.
 */
export function resolveLocale(discordLocale: string | null | undefined): SupportedLocale {
  if (!discordLocale) return 'en';
  const lang = discordLocale.toLowerCase().split('-')[0];
  if (lang === 'tr') return 'tr';
  return 'en';
}
