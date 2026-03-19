import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createDefaultFlags, getMaintenanceFlags } from '@/lib/maintenance';

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || null;
};

const getDiscordProfile = async (userId: string, guildId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const member = (await response.json()) as {
    nick?: string;
    user?: { id: string; username: string; avatar: string | null; global_name?: string | null };
  };

  const id = member.user?.id ?? userId;
  const avatarHash = member.user?.avatar;
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=96`
    : `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;

  return {
    id,
    name: member.nick ?? member.user?.global_name ?? member.user?.username ?? id,
    avatarUrl,
  };
};

export async function GET() {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ 
      flags: {},
      serverId: 'dev-mode'
    });
  }

  const selectedGuildId = await getSelectedGuildId();
  const data = await getMaintenanceFlags(selectedGuildId ?? undefined);
  if (!data) {
    // If maintenance flags cannot be loaded (missing server record, missing DB, etc.),
    // return a safe default set rather than erroring out. This prevents the UI from
    // breaking when the request is made from an embedded activity iframe.
    return NextResponse.json({ flags: createDefaultFlags(), updaterProfiles: {} });
  }

  const updaterIds = Object.values(data.flags)
    .map((flag) => flag.updated_by)
    .filter((value): value is string => Boolean(value));

  const uniqueIds = [...new Set(updaterIds)];
  const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getDiscordProfile(id, selectedGuildId ?? '')]));
  const updaterProfiles = Object.fromEntries(
    profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
  ) as Record<string, { id: string; name: string; avatarUrl: string }>;

  return NextResponse.json({ flags: data.flags, updaterProfiles });
}
