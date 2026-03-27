/**
 * Bot Invite Generator
 *
 * POST /api/admin/dev-panel/invite
 *   body: { guild_id: string }
 *
 * Bot, verilen sunucunun ilk text kanalı için tek kullanımlık,
 * 10 dakika geçerli bir davet linki oluşturur.
 * Yalnızca developer rolüne sahip kullanıcılar erişebilir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID  = process.env.DEVELOPER_ROLE_ID ?? '';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

async function isDeveloper(userId: string): Promise<boolean> {
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) return false;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const member = await res.json() as { roles?: string[] };
    return Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
  } catch { return false; }
}

/**
 * Sunucunun metin kanallarını Discord API ile çekip ilk uygun kanalı döner.
 */
async function getFirstTextChannel(guildId: string, botToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return null;
    const channels = await res.json() as Array<{ id: string; type: number; position: number }>;
    // type 0 = GUILD_TEXT
    const textChannels = channels
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position);
    return textChannels[0]?.id ?? null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: 'bot_token_missing' }, { status: 500 });

  const body = await request.json() as { guild_id?: string };
  const { guild_id } = body;
  if (!guild_id) return NextResponse.json({ error: 'missing_guild_id' }, { status: 400 });

  // Supabase'den sunucunun var olduğunu doğrula
  const supabase = getSupabase();
  if (supabase) {
    const { data: server } = await supabase
      .from('servers')
      .select('discord_id, name')
      .eq('discord_id', guild_id)
      .maybeSingle();
    if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Sunucunun ilk text kanalını bul
  const channelId = await getFirstTextChannel(guild_id, botToken);
  if (!channelId) {
    return NextResponse.json({ error: 'no_text_channel_found' }, { status: 404 });
  }

  // Davet oluştur: 1 kullanım, 600 saniye (10 dk) geçerli, geçici
  const inviteRes = await fetch(`https://discord.com/api/channels/${channelId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      max_age: 600,       // 10 dakika
      max_uses: 1,        // tek kullanım
      temporary: false,   // kalıcı üyelik (sunucuyu inceleyebilmek için)
      unique: true,
    }),
  });

  if (!inviteRes.ok) {
    const err = await inviteRes.json().catch(() => ({})) as Record<string, unknown>;
    return NextResponse.json(
      { error: 'discord_invite_failed', detail: err },
      { status: inviteRes.status }
    );
  }

  const invite = await inviteRes.json() as { code: string; expires_at?: string };
  const inviteUrl = `https://discord.gg/${invite.code}`;

  // Admin action log
  if (supabase) {
    await supabase.from('admin_actions').insert({
      actor_id: session.userId,
      actor_role: 'developer',
      target_guild_id: guild_id,
      action_type: 'generate_invite',
      payload_after: { invite_code: invite.code, channel_id: channelId, expires_at: invite.expires_at },
    });
  }

  return NextResponse.json({
    ok: true,
    invite_url: inviteUrl,
    code: invite.code,
    channel_id: channelId,
    expires_at: invite.expires_at,
    max_uses: 1,
    max_age_seconds: 600,
  });
}
