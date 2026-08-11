/**
 * Discord SDK singleton — DiscordActivityAuth tarafından set edilir,
 * logout ve diğer yerler buradan okur.
 */

import type { DiscordSDK } from '@discord/embedded-app-sdk';

let _sdk: DiscordSDK | null = null;

export function setDiscordSdk(sdk: DiscordSDK) {
  _sdk = sdk;
}

export function getDiscordSdk(): DiscordSDK | null {
  return _sdk;
}

/** Discord Activity iframe / WebView içinde miyiz? (localhost hariç) */
export function isDiscordActivityClient(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return false;
  if (_sdk) return true;
  const hasFrameId = new URLSearchParams(window.location.search).has('frame_id');
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return (
    host.includes('discordsays.com') ||
    host.includes('discord.com') ||
    hasFrameId ||
    ua.includes('Discord')
  );
}

export type DiscordOrientationLock = 'landscape' | 'portrait' | 'unlocked';

/**
 * Discord Activity içinde cihaz yönünü kilitle.
 * Tarayıcı `screen.orientation.lock` / Fullscreen API Activity iframe'de çalışmaz;
 * Discord SDK `setOrientationLockState` kullanmak gerekir.
 */
export async function setDiscordOrientationLock(lock: DiscordOrientationLock): Promise<boolean> {
  const sdk = _sdk;
  if (!sdk) return false;
  try {
    const { Common } = await import('@discord/embedded-app-sdk');
    const map = {
      landscape: Common.OrientationLockStateTypeObject.LANDSCAPE,
      portrait: Common.OrientationLockStateTypeObject.PORTRAIT,
      unlocked: Common.OrientationLockStateTypeObject.UNLOCKED,
    } as const;
    await sdk.commands.setOrientationLockState({ lock_state: map[lock] });
    return true;
  } catch {
    return false;
  }
}

/** Activity'yi kapat. Başarısız olursa false döner. */
export async function closeDiscordActivity(): Promise<boolean> {
  try {
    const sdk = _sdk;
    if (sdk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commands = sdk.commands as any;
      if (typeof commands?.closeActivity === 'function') {
        await commands.closeActivity();
        return true;
      }
      if (typeof commands?.close === 'function') {
        await commands.close();
        return true;
      }
    }
  } catch {
    // SDK çağrısı başarısız — fallback
  }
  return false;
}
