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

const createDiscordRole = async (botToken: string, guildId: string, name: string, color: number) => {
  const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, hoist: false, mentionable: false }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord rol oluşturma hatası: ${res.status} ${err}`);
  }
  const role = (await res.json()) as { id: string; name: string };
  return role;
};

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return NextResponse.json({ error: 'missing_guild' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  // Bot sunucuda mı?
  const guildRes = await fetch(`https://discord.com/api/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  });

  if (!guildRes.ok) {
    return NextResponse.json({ error: 'bot_not_in_guild' }, { status: 403 });
  }

  const guild = (await guildRes.json()) as { name?: string; owner_id?: string };

  // Kullanıcı yetkili mi?
  const isOwner = guild.owner_id === session.userId;
  if (!isOwner) {
    const { data: userRow } = await supabase
      .from('users')
      .select('oauth_access_token')
      .eq('discord_id', session.userId)
      .maybeSingle();

    if (userRow?.oauth_access_token) {
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${userRow.oauth_access_token}` },
        cache: 'no-store',
      });
      if (guildsRes.ok) {
        const guilds = (await guildsRes.json()) as Array<{ id: string; owner?: boolean; permissions?: string }>;
        const g = guilds.find((x) => x.id === guildId);
        const ADMIN = BigInt(0x8);
        const MANAGE = BigInt(0x20);
        const isAdmin = g ? (g.owner || (g.permissions ? ((BigInt(g.permissions) & ADMIN) === ADMIN || (BigInt(g.permissions) & MANAGE) === MANAGE) : false)) : false;
        if (!isAdmin) {
          return NextResponse.json({ error: 'forbidden' }, { status: 403 });
        }
      }
    } else {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // Sunucu kayıtlı mı?
  const { data: server } = await supabase
    .from('servers')
    .select('id, is_setup, verify_role_id, admin_role_id')
    .eq('discord_id', guildId)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_registered' }, { status: 404 });
  }

  if (server.is_setup) {
    return NextResponse.json({ error: 'already_setup' }, { status: 409 });
  }

  // Rol oluştur
  let verifyRoleId = server.verify_role_id as string | null;
  let adminRoleId = server.admin_role_id as string | null;

  try {
    if (!verifyRoleId) {
      const verifyRole = await createDiscordRole(botToken, guildId, 'Doğrulandı', 0x3dc481);
      verifyRoleId = verifyRole.id;
    }
    if (!adminRoleId) {
      const adminRole = await createDiscordRole(botToken, guildId, 'Yönetici', 0x5865f2);
      adminRoleId = adminRole.id;
    }
  } catch (err) {
    console.error('[admin/setup] role creation failed', err);
    return NextResponse.json({ error: 'role_creation_failed', detail: String(err) }, { status: 500 });
  }

  // DB güncelle
  const { error } = await supabase
    .from('servers')
    .update({
      is_setup: true,
      verify_role_id: verifyRoleId,
      admin_role_id: adminRoleId,
    })
    .eq('discord_id', guildId);

  if (error) {
    console.error('[admin/setup] update error', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verifyRoleId, adminRoleId });
}
