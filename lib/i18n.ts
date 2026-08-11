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

import deDashboard from '@/locales/de/dashboard.json';
import deDm from '@/locales/de/dm.json';
import deErrors from '@/locales/de/errors.json';
import deNotifications from '@/locales/de/notifications.json';

import esDashboard from '@/locales/es/dashboard.json';
import esDm from '@/locales/es/dm.json';
import esErrors from '@/locales/es/errors.json';
import esNotifications from '@/locales/es/notifications.json';

import frDashboard from '@/locales/fr/dashboard.json';
import frDm from '@/locales/fr/dm.json';
import frErrors from '@/locales/fr/errors.json';
import frNotifications from '@/locales/fr/notifications.json';

import ruDashboard from '@/locales/ru/dashboard.json';
import ruDm from '@/locales/ru/dm.json';
import ruErrors from '@/locales/ru/errors.json';
import ruNotifications from '@/locales/ru/notifications.json';

import itDashboard from '@/locales/it/dashboard.json';
import itDm from '@/locales/it/dm.json';
import itErrors from '@/locales/it/errors.json';
import itNotifications from '@/locales/it/notifications.json';

import ptAuth from '@/locales/pt-br/auth.json';
import ptDashboard from '@/locales/pt-br/dashboard.json';
import ptDm from '@/locales/pt-br/dm.json';
import ptErrors from '@/locales/pt-br/errors.json';
import ptMail from '@/locales/pt-br/mail.json';
import ptMisc from '@/locales/pt-br/misc.json';
import ptNotifications from '@/locales/pt-br/notifications.json';
import ptProfile from '@/locales/pt-br/profile.json';
import ptStore from '@/locales/pt-br/store.json';
import ptUI from '@/locales/pt-br/ui.json';
import ptWallet from '@/locales/pt-br/wallet.json';
import ptWelcome from '@/locales/pt-br/welcome.json';
import ptSupport from '@/locales/pt-br/support.json';

import {
  type LanguageCode,
  isLanguageCode,
} from '@/lib/languages';

export type SupportedLocale = LanguageCode;

type TranslationMap = Record<string, string>;

const mergeBundles = (...bundles: TranslationMap[]): TranslationMap =>
  Object.assign({}, ...bundles);

const enBundle = mergeBundles(
  enAuth, enDashboard, enDm, enErrors, enMail, enMisc,
  enNotifications, enProfile, enStore, enUI, enWallet, enWelcome, enSupport,
);

const trBundle = mergeBundles(
  trAuth, trDashboard, trDm, trDocs, trErrors, trMail, trMisc,
  trNotifications, trPrivacy, trProfile, trStore, trUI, trWallet, trWelcome, trSupport,
);

export const translations: Record<LanguageCode, TranslationMap> = {
  en: enBundle,
  tr: trBundle,
  de: mergeBundles(enBundle, deDashboard, deDm, deErrors, deNotifications),
  es: mergeBundles(enBundle, esDashboard, esDm, esErrors, esNotifications),
  fr: mergeBundles(enBundle, frDashboard, frDm, frErrors, frNotifications),
  ru: mergeBundles(enBundle, ruDashboard, ruDm, ruErrors, ruNotifications),
  pt: mergeBundles(
    enBundle,
    ptAuth, ptDashboard, ptDm, ptErrors, ptMail, ptMisc,
    ptNotifications, ptProfile, ptStore, ptUI, ptWallet, ptWelcome, ptSupport,
  ),
  id: enBundle,
  hu: enBundle,
  ja: enBundle,
  ko: enBundle,
};

/**
 * Discord / tarayıcı locale string'ini desteklenen dile çevirir.
 */
export function resolveLocale(discordLocale: string | null | undefined): LanguageCode {
  if (!discordLocale) return 'en';

  const normalized = discordLocale.toLowerCase().replace('_', '-');
  if (isLanguageCode(normalized)) return normalized;

  const primary = normalized.split('-')[0];
  if (primary === 'pt') return 'pt';
  if (isLanguageCode(primary)) return primary;

  return 'en';
}
