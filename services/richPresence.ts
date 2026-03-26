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
  type: 0; // Discord activity type for "Playing"
  details: string;
  state: string;
  timestamps: { start: number };
  assets: RichPresenceAssets;
  buttons?: RichPresenceButton[];
};

export type RichPresenceConfig = {
  guildName?: string | null;
  detailsSuffix?: string;
  defaultDetails?: string;
  state: string;
  buttons: RichPresenceButton[];
  assets: RichPresenceAssets;
};

export interface IRichPresenceProvider {
  setActivity(activity: RichPresenceActivity): Promise<void>;
}

export type RichPresenceLogger = (message: string) => void;

export const buildRichPresenceActivity = (config: RichPresenceConfig): RichPresenceActivity => {
  const detailsBase = config.guildName ? `${config.guildName} · Server Dashboard` : (config.defaultDetails ?? 'Server Dashboard');

  return {
    type: 0,
    details: detailsBase,
    state: config.state,
    timestamps: { start: Date.now() },
    assets: config.assets,
    buttons: config.buttons.length ? config.buttons : undefined,
  };
};

export const applyRichPresence = async (
  provider: IRichPresenceProvider,
  config: RichPresenceConfig,
  logger: RichPresenceLogger = () => {},
): Promise<boolean> => {
  const activity = buildRichPresenceActivity(config);
  try {
    await provider.setActivity(activity);
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
