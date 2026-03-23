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

import enGBAuth from '@/locales/en-GB/auth.json';
import enGBDashboard from '@/locales/en-GB/dashboard.json';
import enGBErrors from '@/locales/en-GB/errors.json';
import enGBMail from '@/locales/en-GB/mail.json';
import enGBMisc from '@/locales/en-GB/misc.json';
import enGBNotifications from '@/locales/en-GB/notifications.json';
import enGBStore from '@/locales/en-GB/store.json';
import enGBUI from '@/locales/en-GB/ui.json';
import enGBWallet from '@/locales/en-GB/wallet.json';
import enGBPrivacy from '@/locales/en-GB/privacy.json';
import enGBDocs from '@/locales/en-GB/docs.json';

import deAuth from '@/locales/de/auth.json';
import deDashboard from '@/locales/de/dashboard.json';
import deErrors from '@/locales/de/errors.json';
import deMail from '@/locales/de/mail.json';
import deMisc from '@/locales/de/misc.json';
import deNotifications from '@/locales/de/notifications.json';
import deStore from '@/locales/de/store.json';
import deUI from '@/locales/de/ui.json';
import deWallet from '@/locales/de/wallet.json';
import dePrivacy from '@/locales/de/privacy.json';
import deDocs from '@/locales/de/docs.json';

import frAuth from '@/locales/fr/auth.json';
import frDashboard from '@/locales/fr/dashboard.json';
import frErrors from '@/locales/fr/errors.json';
import frMail from '@/locales/fr/mail.json';
import frMisc from '@/locales/fr/misc.json';
import frNotifications from '@/locales/fr/notifications.json';
import frStore from '@/locales/fr/store.json';
import frUI from '@/locales/fr/ui.json';
import frWallet from '@/locales/fr/wallet.json';
import frPrivacy from '@/locales/fr/privacy.json';
import frDocs from '@/locales/fr/docs.json';

import esAuth from '@/locales/es/auth.json';
import esDashboard from '@/locales/es/dashboard.json';
import esErrors from '@/locales/es/errors.json';
import esMail from '@/locales/es/mail.json';
import esMisc from '@/locales/es/misc.json';
import esNotifications from '@/locales/es/notifications.json';
import esStore from '@/locales/es/store.json';
import esUI from '@/locales/es/ui.json';
import esWallet from '@/locales/es/wallet.json';
import esPrivacy from '@/locales/es/privacy.json';
import esDocs from '@/locales/es/docs.json';

import daAuth from '@/locales/da/auth.json';
import daDashboard from '@/locales/da/dashboard.json';
import daErrors from '@/locales/da/errors.json';
import daMail from '@/locales/da/mail.json';
import daMisc from '@/locales/da/misc.json';
import daNotifications from '@/locales/da/notifications.json';
import daStore from '@/locales/da/store.json';
import daUI from '@/locales/da/ui.json';
import daWallet from '@/locales/da/wallet.json';
import daPrivacy from '@/locales/da/privacy.json';
import daDocs from '@/locales/da/docs.json';

import hiAuth from '@/locales/hi/auth.json';
import hiDashboard from '@/locales/hi/dashboard.json';
import hiErrors from '@/locales/hi/errors.json';
import hiMail from '@/locales/hi/mail.json';
import hiMisc from '@/locales/hi/misc.json';
import hiNotifications from '@/locales/hi/notifications.json';
import hiStore from '@/locales/hi/store.json';
import hiUI from '@/locales/hi/ui.json';
import hiWallet from '@/locales/hi/wallet.json';
import hiPrivacy from '@/locales/hi/privacy.json';
import hiDocs from '@/locales/hi/docs.json';

import ptBRAuth from '@/locales/pt-BR/auth.json';
import ptBRDashboard from '@/locales/pt-BR/dashboard.json';
import ptBRErrors from '@/locales/pt-BR/errors.json';
import ptBRMail from '@/locales/pt-BR/mail.json';
import ptBRMisc from '@/locales/pt-BR/misc.json';
import ptBRNotifications from '@/locales/pt-BR/notifications.json';
import ptBRStore from '@/locales/pt-BR/store.json';
import ptBRUI from '@/locales/pt-BR/ui.json';
import ptBRWallet from '@/locales/pt-BR/wallet.json';
import ptBRPrivacy from '@/locales/pt-BR/privacy.json';
import ptBRDocs from '@/locales/pt-BR/docs.json';

export type SupportedLocale = 'tr' | 'en' | 'en-GB' | 'de' | 'fr' | 'es' | 'da' | 'hi' | 'pt-BR';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    ...trAuth, ...trDashboard, ...trErrors, ...trMail, ...trMisc,
    ...trNotifications, ...trStore, ...trUI, ...trWallet, ...trPrivacy, ...trDocs,
  },
  en: {
    ...enAuth, ...enDashboard, ...enErrors, ...enMail, ...enMisc,
    ...enNotifications, ...enStore, ...enUI, ...enWallet, ...enPrivacy, ...enDocs,
  },
  'en-GB': {
    ...enGBAuth, ...enGBDashboard, ...enGBErrors, ...enGBMail, ...enGBMisc,
    ...enGBNotifications, ...enGBStore, ...enGBUI, ...enGBWallet, ...enGBPrivacy, ...enGBDocs,
  },
  de: {
    ...deAuth, ...deDashboard, ...deErrors, ...deMail, ...deMisc,
    ...deNotifications, ...deStore, ...deUI, ...deWallet, ...dePrivacy, ...deDocs,
  },
  fr: {
    ...frAuth, ...frDashboard, ...frErrors, ...frMail, ...frMisc,
    ...frNotifications, ...frStore, ...frUI, ...frWallet, ...frPrivacy, ...frDocs,
  },
  es: {
    ...esAuth, ...esDashboard, ...esErrors, ...esMail, ...esMisc,
    ...esNotifications, ...esStore, ...esUI, ...esWallet, ...esPrivacy, ...esDocs,
  },
  da: {
    ...daAuth, ...daDashboard, ...daErrors, ...daMail, ...daMisc,
    ...daNotifications, ...daStore, ...daUI, ...daWallet, ...daPrivacy, ...daDocs,
  },
  hi: {
    ...hiAuth, ...hiDashboard, ...hiErrors, ...hiMail, ...hiMisc,
    ...hiNotifications, ...hiStore, ...hiUI, ...hiWallet, ...hiPrivacy, ...hiDocs,
  },
  'pt-BR': {
    ...ptBRAuth, ...ptBRDashboard, ...ptBRErrors, ...ptBRMail, ...ptBRMisc,
    ...ptBRNotifications, ...ptBRStore, ...ptBRUI, ...ptBRWallet, ...ptBRPrivacy, ...ptBRDocs,
  },
};

/**
 * Discord locale string'ini desteklenen locale'e çevirir.
 * Örn: "tr" → "tr", "en-US" → "en", "en-GB" → "en-GB", "de" → "de"
 */
export function resolveLocale(discordLocale: string | null | undefined): SupportedLocale {
  if (!discordLocale) return 'en';
  if (discordLocale.startsWith('tr')) return 'tr';
  if (discordLocale === 'en-GB') return 'en-GB';
  if (discordLocale.startsWith('en')) return 'en';
  if (discordLocale.startsWith('de')) return 'de';
  if (discordLocale.startsWith('fr')) return 'fr';
  if (discordLocale.startsWith('es')) return 'es';
  if (discordLocale.startsWith('da')) return 'da';
  if (discordLocale.startsWith('hi')) return 'hi';
  if (discordLocale === 'pt-BR' || discordLocale.startsWith('pt')) return 'pt-BR';
  return 'en';
}
