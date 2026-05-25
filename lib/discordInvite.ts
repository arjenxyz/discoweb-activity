import type { DiscordSDK } from '@discord/embedded-app-sdk';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { getDiscordSdk } from '@/lib/discordSdk';
import { siteConfig } from '@/config/site';

export type DiscordInviteOptions = {
  message: string;
  title: string;
  description: string;
};

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

async function fetchActivityLinkId(title: string, description: string): Promise<string | null> {
  try {
    const res = await fetchWithCreds('/api/member/discord-share-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { link_id?: string | null };
    return data.link_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Discord Activity içinde arkadaş / kanal seçerek davet veya aktivite linki paylaşımı açar.
 */
export async function openDiscordInviteFriends(
  options: DiscordInviteOptions,
): Promise<DiscordInviteResult> {
  const sdk = await resolveDiscordSdk();
  if (!sdk) {
    const botUrl = siteConfig.bot.inviteUrl;
    if (botUrl && typeof window !== 'undefined') {
      window.open(botUrl, '_blank', 'noopener,noreferrer');
    }
    return { ok: false, error: 'not_in_discord' };
  }

  const linkId = await fetchActivityLinkId(options.title, options.description);

  try {
    const args = linkId
      ? { message: options.message, link_id: linkId }
      : { message: options.message };

    const result = await sdk.commands.shareLink(args);
    if (result?.success) {
      return { ok: true, method: 'share_link' };
    }
  } catch {
    /* shareLink başarısız — sunucu davetine düş */
  }

  if (sdk.guildId) {
    try {
      await sdk.commands.openInviteDialog();
      return { ok: true, method: 'invite_dialog' };
    } catch {
      /* ignore */
    }
  }

  if (linkId) {
    return { ok: false, error: 'cancelled' };
  }
  return { ok: false, error: 'failed' };
}
