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

export type SupportedLocale = 'tr';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    ...trAuth, ...trDashboard, ...trDm, ...trDocs, ...trErrors, ...trMail, ...trMisc,
    ...trNotifications, ...trPrivacy, ...trProfile, ...trStore, ...trUI, ...trWallet, ...trWelcome,
  },
};

/**
 * Discord locale string'ini desteklenen locale'e çevirir.
 * Şu anda sadece Türkçe destekleniyor.
 */
export function resolveLocale(discordLocale: string | null | undefined): SupportedLocale {
  return 'tr';
}
