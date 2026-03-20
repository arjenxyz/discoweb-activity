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

const toSlug = (name: string, guildId: string) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return base ? `${base}-${guildId.slice(-6)}` : `guild-${guildId.slice(-6)}`;
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

  // Bot token kontrolü
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

  // Kullanıcı sunucu sahibi veya admin mi?
  const isOwner = guild.owner_id === session.userId;
  if (!isOwner) {
    // OAuth ile de kontrol et
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

  // Zaten kayıtlı mı?
  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 });
  }

  const name = guild.name ?? `Guild ${guildId}`;
  const slug = toSlug(name, guildId);

  const { error } = await supabase.from('servers').insert({
    discord_id: guildId,
    name,
    slug,
    is_setup: false,
  });

  if (error) {
    console.error('[admin/register] insert error', error);
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, guildId, name });
}
