import { getDiscordSdk } from '@/lib/discordSdk';

export type RichPresenceButton = {
  label: string;
  url: string;
};

export type RichPresenceAssets = {
  large_image: string;
  large_text: string;
  small_image?: string;
  small_text?: string;
};

export type RichPresenceActivity = {
  type: 0;
  details: string;
  state: string;
  timestamps: { start: number };
  assets: RichPresenceAssets;
  buttons?: RichPresenceButton[];
  instance?: boolean;
};

export type RichPresenceConfig = {
  guildName?: string | null;
  detailsSuffix?: string;
  defaultDetails?: string;
  state: string;
  buttons?: RichPresenceButton[];
  assets?: RichPresenceAssets;
  startedAt?: number;
};

export interface IRichPresenceProvider {
  setActivity(activity: RichPresenceActivity): Promise<void>;
}

export type RichPresenceLogger = (message: string) => void;

const DETAILS_MAX = 48;
const STATE_MAX = 48;
const DEFAULT_BUTTONS: RichPresenceButton[] = [{ label: 'Open DiscoWeb', url: 'https://discoweb.tech' }];
const DEFAULT_ASSETS: RichPresenceAssets = { large_image: 'discoweb', large_text: 'DiscoWeb' };

let sessionStartMs: number | null = null;
let lastSignature = '';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const SECTION_PRESENCE_KEYS: Record<string, string> = {
  overview: 'presence_page_overview',
  store: 'presence_page_store',
  mail: 'presence_page_mail',
  profile: 'presence_page_profile',
  settings: 'presence_page_settings',
  'tag-badge': 'presence_page_tag_badge',
  duyuru: 'presence_page_duyuru',
  quiz: 'presence_page_quiz',
  'watch-earn': 'presence_page_watch_earn',
  leaderboard: 'presence_page_leaderboard',
  notifications: 'presence_page_notifications',
  transactions: 'presence_page_transactions',
  tracking: 'presence_page_tracking',
};

export function getPresenceSessionStart(): number {
  if (!sessionStartMs) sessionStartMs = Date.now();
  return sessionStartMs;
}

export function truncatePresence(text: string, max: number): string {
  const value = text.replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function presenceLabelForSection(
  section: string,
  t: (key: string) => string,
  extras?: { leaderboardOpen?: boolean },
): string {
  if (extras?.leaderboardOpen) return t('presence_page_leaderboard');
  const key = SECTION_PRESENCE_KEYS[section] ?? 'presence_page_overview';
  const label = t(key);
  return label === key ? t('presence_page_overview') : label;
}

export const buildRichPresenceActivity = (config: RichPresenceConfig): RichPresenceActivity => {
  const guild = (config.guildName ?? '').trim();
  const details = truncatePresence(guild || config.defaultDetails || 'DiscoWeb', DETAILS_MAX);
  const state = truncatePresence(config.state || 'DiscoWeb', STATE_MAX);
  const assets = config.assets ?? DEFAULT_ASSETS;

  return {
    type: 0,
    details,
    state,
    timestamps: { start: config.startedAt ?? getPresenceSessionStart() },
    assets: {
      ...assets,
      large_text: assets.large_text || state,
    },
    buttons: (config.buttons ?? DEFAULT_BUTTONS).length ? (config.buttons ?? DEFAULT_BUTTONS) : undefined,
  };
};

export const applyRichPresence = async (
  provider: IRichPresenceProvider,
  config: RichPresenceConfig,
  logger: RichPresenceLogger = () => {},
): Promise<boolean> => {
  const activity = buildRichPresenceActivity(config);
  const signature = `${activity.details}|${activity.state}`;
  if (signature === lastSignature) return true;
  try {
    await provider.setActivity(activity);
    lastSignature = signature;
    logger('Rich Presence ayarlandı');
    return true;
  } catch (error) {
    logger(`Rich Presence ayarlanamadı: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

export class DiscordSdkRichPresenceProvider implements IRichPresenceProvider {
  private sdk: { commands: { setActivity: (activity: { activity: RichPresenceActivity }) => Promise<unknown> } };

  constructor(sdk: { commands: { setActivity: (activity: { activity: RichPresenceActivity }) => Promise<unknown> } }) {
    this.sdk = sdk;
  }

  async setActivity(activity: RichPresenceActivity): Promise<void> {
    await this.sdk.commands.setActivity({ activity });
  }
}

type SyncPresenceParams = {
  guildName?: string | null;
  state: string;
  logger?: RichPresenceLogger;
  immediate?: boolean;
};

async function pushPresence(params: SyncPresenceParams): Promise<void> {
  const sdk = getDiscordSdk();
  if (!sdk) return;
  const provider = new DiscordSdkRichPresenceProvider(
    sdk as unknown as { commands: { setActivity: (activity: { activity: RichPresenceActivity }) => Promise<unknown> } },
  );
  await applyRichPresence(
    provider,
    {
      guildName: params.guildName,
      state: params.state,
      assets: {
        large_image: 'discoweb',
        large_text: params.state || 'DiscoWeb',
      },
    },
    params.logger,
  );
}

/** Update Discord profile activity to the current page. Keeps the session timer. */
export function syncDiscordRichPresence(params: SyncPresenceParams): void {
  if (typeof window === 'undefined') return;
  if (!getDiscordSdk()) return;

  if (params.immediate) {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void pushPresence(params);
    return;
  }

  if (debounceTimer) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void pushPresence(params);
  }, 200);
}
