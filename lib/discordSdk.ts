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
