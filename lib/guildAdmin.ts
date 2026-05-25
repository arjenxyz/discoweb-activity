import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

/** Sunucu admin_role_id veya Discord sunucu sahibi */
export async function requireGuildAdmin(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return { ok: false as const, response: session.response };

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'no_guild' }, { status: 400 }),
    };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'missing_bot_token' }, { status: 500 }),
    };
  }

  const guildRes = await fetch(`https://discord.com/api/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  });
  if (guildRes.ok) {
    const guild = (await guildRes.json()) as { owner_id?: string };
    if (guild.owner_id === session.userId) {
      return { ok: true as const, userId: session.userId, guildId, botToken };
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'missing_service_role' }, { status: 500 }),
    };
  }

  const { data: server } = await supabase
    .from('servers')
    .select('admin_role_id')
    .eq('discord_id', guildId)
    .maybeSingle();

  const adminRoleId = server?.admin_role_id as string | null;
  if (!adminRoleId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }

  const memberRes = await fetch(
    `https://discord.com/api/guilds/${guildId}/members/${session.userId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!memberRes.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }
  const member = (await memberRes.json()) as { roles?: string[] };
  if (!member.roles?.includes(adminRoleId)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }

  return { ok: true as const, userId: session.userId, guildId, botToken };
}
