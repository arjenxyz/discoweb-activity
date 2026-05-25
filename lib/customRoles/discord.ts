import { discordFetch } from '@/lib/discordRest';

export type DiscordRolePayload = {
  name: string;
  color: number;
  hoist?: boolean;
  mentionable?: boolean;
  unicode_emoji?: string | null;
};

export type GuildRoleInfo = {
  id: string;
  name: string;
  color: number;
  position: number;
  unicode_emoji?: string | null;
};

export async function fetchGuildRoles(
  botToken: string,
  guildId: string,
): Promise<GuildRoleInfo[]> {
  const res = await discordFetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) return [];
  const list = (await res.json()) as GuildRoleInfo[];
  return Array.isArray(list) ? list : [];
}

export async function getBotMaxRolePosition(
  botToken: string,
  guildId: string,
): Promise<number> {
  const meRes = await discordFetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!meRes.ok) return -1;
  const me = (await meRes.json()) as { id?: string };
  if (!me.id) return -1;

  const memberRes = await discordFetch(
    `https://discord.com/api/guilds/${guildId}/members/${me.id}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!memberRes.ok) return -1;
  const member = (await memberRes.json()) as { roles?: string[] };
  const roles = await fetchGuildRoles(botToken, guildId);
  let max = -1;
  for (const rid of member.roles ?? []) {
    const r = roles.find((x) => x.id === rid);
    if (r) max = Math.max(max, r.position);
  }
  return max;
}

export async function createGuildRole(
  botToken: string,
  guildId: string,
  payload: DiscordRolePayload,
): Promise<{ id: string; name: string; position: number }> {
  const body: Record<string, unknown> = {
    name: payload.name,
    color: payload.color,
    hoist: payload.hoist ?? false,
    mentionable: payload.mentionable ?? false,
  };
  if (payload.unicode_emoji) {
    body.unicode_emoji = payload.unicode_emoji;
  }

  const res = await discordFetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`role_create_failed:${res.status}:${err}`);
  }
  return (await res.json()) as { id: string; name: string; position: number };
}

export async function assignMemberRole(
  botToken: string,
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const res = await discordFetch(
    `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`role_assign_failed:${res.status}`);
  }
}

export async function deleteGuildRole(
  botToken: string,
  guildId: string,
  roleId: string,
): Promise<void> {
  const res = await discordFetch(
    `https://discord.com/api/guilds/${guildId}/roles/${roleId}`,
    { method: 'DELETE', headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`role_delete_failed:${res.status}`);
  }
}

export function canBotManageRole(botMaxPosition: number, targetPosition: number): boolean {
  if (botMaxPosition < 0) return true;
  return botMaxPosition > targetPosition;
}

/** Discord rol ikonu (base64, data: öneki olmadan) */
export async function setGuildRoleIcon(
  botToken: string,
  guildId: string,
  roleId: string,
  iconBase64: string,
): Promise<void> {
  const res = await discordFetch(`https://discord.com/api/guilds/${guildId}/roles/${roleId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ icon: iconBase64 }),
  });
  if (!res.ok) {
    throw new Error(`role_icon_failed:${res.status}`);
  }
}

export function dataUrlToIconBase64(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  return match ? match[1] : null;
}
