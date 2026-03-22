/**
 * GET /api/member/economy-status
 * Sunucunun yüksek ekonomi durumu + admin kontrolü + oy bilgisi
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isGuildAdmin } from '@/lib/adminAuth';

/** Setup'ta atanan admin_role_id'ye sahip mi? Bot token ile kontrol. */
async function hasServerAdminRole(userId: string, guildId: string, adminRoleId: string | null): Promise<boolean> {
  if (!adminRoleId) return false;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const member = await res.json() as { roles?: string[] };
    return (member.roles ?? []).includes(adminRoleId);
  } catch { return false; }
}

/** Discord API'den gerçek üye sayısını çek */
async function fetchMemberCount(guildId: string): Promise<number> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return 0;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const guild = await res.json() as { approximate_member_count?: number };
    return guild.approximate_member_count ?? 0;
  } catch { return 0; }
}

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  // query param user_id fallback (Activity embed'de session cookie gelmeyebilir)
  const url = new URL(request.url);
  const userId = session.userId || url.searchParams.get('user_id') || '';
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const [discordAdminCheck, serverRes, appRes, memberCount] = await Promise.all([
    isGuildAdmin(userId, guildId),
    supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', guildId)
      .maybeSingle(),
    supabase
      .from('economy_applications')
      .select('status, vote_count, vote_threshold, scheduled_open_at')
      .eq('guild_id', guildId)
      .maybeSingle(),
    fetchMemberCount(guildId),
  ]);

  const adminRoleId = serverRes.data?.admin_role_id ?? null;
  // Bot API + Discord OAuth kontrolü paralel çalışır
  const roleAdminCheck = await hasServerAdminRole(userId, guildId, adminRoleId);
  const adminCheck = discordAdminCheck || roleAdminCheck;

  // Debug log — admin durumunu görmek için (production'da kaldırılabilir)
  console.log('[economy-status] userId:', userId, 'guildId:', guildId, 'adminRoleId:', adminRoleId, 'discordAdmin:', discordAdminCheck, 'roleAdmin:', roleAdminCheck);
  const app = appRes.data;

  // Kullanıcı daha önce oy verdi mi?
  let hasVoted = false;
  if (app?.status === 'voting') {
    const { data: voteRow } = await supabase
      .from('economy_votes')
      .select('id')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();
    hasVoted = !!voteRow;
  }

  return NextResponse.json({
    is_admin: adminCheck,
    member_count: memberCount,
    economy_status: app?.status ?? 'none',      // none | voting | pending | approved | rejected
    vote_count: app?.vote_count ?? 0,
    vote_threshold: app?.vote_threshold ?? 100,
    scheduled_open_at: app?.scheduled_open_at ?? null,
    has_voted: hasVoted,
  });
}

/** POST /api/member/economy-status — Başvuru başlat veya oy ver */
export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const body = (await request.json()) as { action: 'apply_direct' | 'start_vote' | 'cast_vote' };

  if (body.action === 'apply_direct' || body.action === 'start_vote') {
    // Admin yetkisi: Discord owner/Manage Server VEYA setup'taki admin rolü
    const { data: serverRow } = await supabase
      .from('servers')
      .select('admin_role_id')
      .eq('discord_id', guildId)
      .maybeSingle();

    const [discordAdmin, roleAdmin, memberCount] = await Promise.all([
      isGuildAdmin(userId, guildId),
      hasServerAdminRole(userId, guildId, serverRow?.admin_role_id ?? null),
      fetchMemberCount(guildId),
    ]);
    if (!discordAdmin && !roleAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    if (body.action === 'apply_direct') {
      if (memberCount < 500) return NextResponse.json({ error: 'not_enough_members' }, { status: 400 });

      await supabase.from('economy_applications').upsert({
        guild_id: guildId,
        status: 'pending',
        application_type: 'direct',
        submitted_at: new Date().toISOString(),
        scheduled_open_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'guild_id' });

      return NextResponse.json({ ok: true, status: 'pending' });
    }

    if (body.action === 'start_vote') {
      if (memberCount >= 500) return NextResponse.json({ error: 'use_direct_apply' }, { status: 400 });

      const { data: existing } = await supabase
        .from('economy_applications')
        .select('status')
        .eq('guild_id', guildId)
        .maybeSingle();

      if (existing && existing.status !== 'none' && existing.status !== 'rejected') {
        return NextResponse.json({ error: 'already_applied' }, { status: 400 });
      }

      await supabase.from('economy_applications').upsert({
        guild_id: guildId,
        status: 'voting',
        application_type: 'vote',
        vote_count: 0,
        vote_threshold: 100,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'guild_id' });

      return NextResponse.json({ ok: true, status: 'voting' });
    }
  }

  if (body.action === 'cast_vote') {
    const { data: app } = await supabase
      .from('economy_applications')
      .select('status, vote_count, vote_threshold')
      .eq('guild_id', guildId)
      .maybeSingle();

    if (!app || app.status !== 'voting') {
      return NextResponse.json({ error: 'not_in_voting' }, { status: 400 });
    }

    // Hesap yaşı kontrolü (30 gün)
    const DISCORD_EPOCH = 1420070400000;
    const snowflake = parseInt(userId, 10);
    const accountCreatedAt = new Date(Math.floor(snowflake / 4194304) + DISCORD_EPOCH);
    const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / 86400000);
    const isValid = accountAgeDays >= 30;

    const { error: voteErr } = await supabase.from('economy_votes').insert({
      guild_id: guildId,
      user_id: userId,
      discord_account_age_days: accountAgeDays,
      is_valid: isValid,
    });

    if (voteErr) return NextResponse.json({ error: 'already_voted' }, { status: 400 });

    const newCount = (app.vote_count ?? 0) + (isValid ? 1 : 0);

    // Eşik doldu mu?
    if (newCount >= (app.vote_threshold ?? 100)) {
      await supabase.from('economy_applications').update({
        vote_count: newCount,
        status: 'pending',
        scheduled_open_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('guild_id', guildId);
      return NextResponse.json({ ok: true, threshold_reached: true, vote_count: newCount });
    }

    await supabase.from('economy_applications').update({ vote_count: newCount }).eq('guild_id', guildId);
    return NextResponse.json({ ok: true, threshold_reached: false, vote_count: newCount, is_valid: isValid });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
