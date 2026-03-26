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

export type SupportedLocale = 'tr';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    ...trAuth, ...trDashboard, ...trErrors, ...trMail, ...trMisc,
    ...trNotifications, ...trStore, ...trUI, ...trWallet, ...trPrivacy, ...trDocs,
  },
};

/**
 * Discord locale string'ini desteklenen locale'e çevirir.
 * Şu anda sadece Türkçe destekleniyor.
 */
export function resolveLocale(discordLocale: string | null | undefined): SupportedLocale {
  return 'tr';
}
