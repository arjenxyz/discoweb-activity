import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      id: 'dev-guild',
      name: 'Development Server',
      iconUrl: '/gif/cat.gif',
      memberCount: 100,
      isSetup: true,
      features: {
        shop: true,
        daily: true,
        coupons: true,
        leaderboard: true
      }
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });
  }

  const { data: server, error } = await supabase
    .from('servers')
    .select('id, name, discord_id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (error || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Discord API'den sunucu avatarını al
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  try {
    const guildResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (guildResponse.ok) {
      const guildData = (await guildResponse.json()) as { icon: string | null; name: string };
      const iconUrl = guildData.icon
        ? `https://cdn.discordapp.com/icons/${selectedGuildId}/${guildData.icon}.png?size=64`
        : null;

      return NextResponse.json({
        id: server.discord_id,
        name: server.name,
        iconUrl,
      });
    }
  } catch (error) {
    console.error('Failed to fetch guild icon:', error);
  }

  // Fallback: Sadece veritabanından gelen bilgiler
  return NextResponse.json({
    id: server.discord_id,
    name: server.name,
    iconUrl: null,
  });
}
