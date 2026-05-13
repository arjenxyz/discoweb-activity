import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';

type DiscordUser = { id: string; username: string; avatar?: string | null; global_name?: string | null };
type DiscordMember = { nick?: string | null; user?: DiscordUser | null };

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const url = new URL(request.url);
  const targetId = url.searchParams.get('user_id')?.trim();
  if (!targetId) {
    return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  let member: DiscordMember | null = null;
  if (process.env.DISCORD_BOT_TOKEN) {
    const memberRes = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${targetId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    if (!memberRes.ok) {
      return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 });
    }
    member = (await memberRes.json()) as DiscordMember;
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('nickname,displayName')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', targetId)
    .maybeSingle();

  let user: DiscordUser | null = member?.user ?? null;
  if (!user) {
    const { data } = await supabase
      .from('users')
      .select('discord_id,username,avatar')
      .eq('discord_id', targetId)
      .maybeSingle();
    if (data) {
      user = { id: data.discord_id, username: data.username, avatar: data.avatar ?? null };
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 });
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${targetId}/${user.avatar}.png?size=96`
    : `https://cdn.discordapp.com/embed/avatars/${Number(targetId) % 5}.png`;

  return NextResponse.json({
    userId: targetId,
    username: user.username,
    displayName: user.global_name ?? profile?.displayName ?? null,
    nickname: member?.nick ?? profile?.nickname ?? null,
    avatarUrl,
  });
}
