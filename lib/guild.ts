import { cookies } from 'next/headers';

/**
 * Determine the "selected" guild ID for the current request.
 *
 * Priority:
 * 1) query param `guild_id` (used by Activity iframe)
 * 2) cookie `selected_guild_id` (legacy selection mechanism)
 * 3) env DISCORD_GUILD_ID
 *
 * Returns null only if none of the above are available.
 */
export const getSelectedGuildId = async (request?: Request): Promise<string | null> => {
  if (request) {
    try {
      const url = new URL(request.url);
      const guildId = url.searchParams.get('guild_id');
      if (guildId) return guildId;
    } catch {
      // ignore invalid URLs
    }
  }

  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  if (selectedGuildId) return selectedGuildId;

  return process.env.DISCORD_GUILD_ID ?? null;
};
