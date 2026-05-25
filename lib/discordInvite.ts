import type { DiscordSDK } from '@discord/embedded-app-sdk';
import { getDiscordSdk } from '@/lib/discordSdk';
import { siteConfig } from '@/config/site';

export type DiscordInviteResult =
  | { ok: true; method: 'invite_dialog' | 'share_link' }
  | { ok: false; error: 'not_in_discord' | 'cancelled' | 'failed' };

function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getFrameId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('frame_id');
  if (fromUrl) {
    try {
      localStorage.setItem('discord_frame_id', fromUrl);
    } catch {
      /* ignore */
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem('discord_frame_id');
  } catch {
    return null;
  }
}

async function resolveDiscordSdk(): Promise<DiscordSDK | null> {
  const existing = getDiscordSdk();
  if (existing) return existing;

  const frameId = getFrameId();
  if (!frameId && !isInIframe()) return null;

  try {
    const { getDiscordSdk: getFromLib } = await import('@/lib/discordSdk');
    for (let i = 0; i < 8; i++) {
      const sdk = getFromLib();
      if (sdk) return sdk;
      await new Promise((r) => setTimeout(r, 400));
    }
  } catch {
    /* continue */
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!clientId || !frameId) return null;

  try {
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    return sdk;
  } catch {
    return null;
  }
}

/**
 * Discord Activity içinde arkadaş / kanal seçerek davet veya aktivite linki paylaşımı açar.
 * Sunucu bağlamında önce native invite dialog, aksi halde shareLink modal.
 */
export async function openDiscordInviteFriends(shareMessage: string): Promise<DiscordInviteResult> {
  const sdk = await resolveDiscordSdk();
  if (!sdk) {
    const botUrl = siteConfig.bot.inviteUrl;
    if (botUrl && typeof window !== 'undefined') {
      window.open(botUrl, '_blank', 'noopener,noreferrer');
    }
    return { ok: false, error: 'not_in_discord' };
  }

  if (sdk.guildId) {
    try {
      await sdk.commands.openInviteDialog();
      return { ok: true, method: 'invite_dialog' };
    } catch {
      /* DM veya izin — shareLink'e düş */
    }
  }

  try {
    const result = await sdk.commands.shareLink({ message: shareMessage });
    if (result?.success) {
      return { ok: true, method: 'share_link' };
    }
    return { ok: false, error: 'cancelled' };
  } catch {
    return { ok: false, error: 'failed' };
  }
}
