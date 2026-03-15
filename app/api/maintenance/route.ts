import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMaintenanceFlags } from '@/lib/maintenance';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
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
  const data = await getMaintenanceFlags(selectedGuildId);
  if (!data) {
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }

  const updaterIds = Object.values(data.flags)
    .map((flag) => flag.updated_by)
    .filter((value): value is string => Boolean(value));

  const uniqueIds = [...new Set(updaterIds)];
  const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getDiscordProfile(id, selectedGuildId)]));
  const updaterProfiles = Object.fromEntries(
    profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
  ) as Record<string, { id: string; name: string; avatarUrl: string }>;

  return NextResponse.json({ flags: data.flags, updaterProfiles });
}
