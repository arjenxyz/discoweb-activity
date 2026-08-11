import { cookies } from 'next/headers';
import {
  isLocalDev,
  isLocalDevRequest,
  LOCAL_DEV_GUILD_ID,
} from '@/lib/localDev';

const normalizeGuildId = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Determine the "selected" guild ID for the current request.
 *
 * Priority:
 * 1) query param `guild_id` (used by Activity iframe)
 * 2) cookie `selected_guild_id` (legacy selection mechanism)
 * 3) env DISCORD_GUILD_ID
 * 4) localhost fallback: LOCAL_DEV_GUILD_ID
 *
 * Returns null only if none of the above are available.
 */
export const getSelectedGuildId = async (request?: Request): Promise<string | null> => {
  if (request) {
    try {
      const url = new URL(request.url);
      const guildId = normalizeGuildId(url.searchParams.get('guild_id'));
      if (guildId) return guildId;
    } catch {
      // ignore invalid URLs
    }
  }

  const cookieStore = await cookies();
  const selectedGuildId = normalizeGuildId(cookieStore.get('selected_guild_id')?.value);
  if (selectedGuildId) return selectedGuildId;

  const envGuildId = normalizeGuildId(process.env.DISCORD_GUILD_ID ?? process.env.NEXT_PUBLIC_DISCORD_GUILD_ID);
  if (envGuildId) return envGuildId;

  const defaultGuildId = normalizeGuildId(process.env.DEFAULT_DISCORD_GUILD_ID);
  if (defaultGuildId) return defaultGuildId;

  if ((request && isLocalDevRequest(request)) || (!request && (await isLocalDev()))) {
    return LOCAL_DEV_GUILD_ID;
  }

  return null;
};
