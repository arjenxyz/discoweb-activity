import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'missing_config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');

  const { data } = await supabase
    .from('users')
    .select('oauth_access_token')
    .eq('discord_id', session.userId)
    .maybeSingle();

  if (!data?.oauth_access_token) {
    return NextResponse.json({ error: 'no_token' }, { status: 404 });
  }

  // Guild adını önce DB'den, bulamazsa Discord API'den al
  let guildName: string | null = null;
  if (guildId) {
    const { data: server } = await supabase
      .from('servers')
      .select('name')
      .eq('discord_id', guildId)
      .maybeSingle();
    guildName = server?.name ?? null;

    if (!guildName) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        try {
          const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: { Authorization: `Bot ${botToken}` },
          });
          if (guildRes.ok) {
            const guildData = await guildRes.json() as { name: string };
            guildName = guildData.name ?? null;
          }
        } catch { /* opsiyonel */ }
      }
    }
  }

  // Son 5 dakikada aktif session sayısı
  let activeCount = 0;
  if (guildId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('activity_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId)
      .gte('last_seen', fiveMinutesAgo);
    activeCount = count ?? 0;
  }

  return NextResponse.json({ access_token: data.oauth_access_token, guild_name: guildName, active_count: activeCount });
}
