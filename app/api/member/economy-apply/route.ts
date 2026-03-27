/**
 * Yüksek Ekonomi Başvuru API
 *
 * POST /api/member/economy-apply
 *   - type: 'direct' → 500+ üyeli sunucular direkt başvurur
 *   - type: 'vote'   → Oylama başlatır (120 oy hedefi)
 *
 * POST /api/member/economy-apply/vote
 *   - Oylama sürecindeki sunucu için oy verir
 *
 * GET /api/member/economy-apply
 *   - Sunucunun başvuru durumunu döner
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

const VOTE_THRESHOLD = 120;
const DIRECT_MEMBER_THRESHOLD = 500;
const AUTO_APPROVE_DAYS = 7;
const MIN_ACCOUNT_AGE_DAYS = 30;

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

async function getAutoApproveFlag(supabase: ReturnType<typeof getSupabase>) {
  if (!supabase) return false;
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'economy_auto_approve')
    .maybeSingle();
  return (data?.value ?? 'false') === 'true';
}

/** Sunucu başvuru durumu */
export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const { data: app } = await supabase
    .from('economy_applications')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ status: 'none', guild_id: guildId });
  }

  // Otomatik onay kontrolü: pending + scheduled_open_at geçtiyse approved yap
  if (app.status === 'pending' && app.scheduled_open_at) {
    if (new Date(app.scheduled_open_at) <= new Date()) {
      await supabase
        .from('economy_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('guild_id', guildId);

      return NextResponse.json({ ...app, status: 'approved' });
    }
  }

  return NextResponse.json(app);
}

/** Başvur veya oylama başlat */
export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const body = (await request.json()) as { type?: 'direct' | 'vote' | 'cast_vote' };
  const { type } = body;

  // Mevcut başvuru kontrolü
  const { data: existing } = await supabase
    .from('economy_applications')
    .select('id, status')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (existing && ['pending', 'approved'].includes(existing.status)) {
    return NextResponse.json({ error: 'already_applied', status: existing.status }, { status: 400 });
  }

  // OY KULLAN
  if (type === 'cast_vote') {
    if (!existing || existing.status !== 'voting') {
      return NextResponse.json({ error: 'no_active_voting' }, { status: 400 });
    }

    // Daha önce oy vermiş mi?
    const { data: existingVote } = await supabase
      .from('economy_votes')
      .select('id')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: 'already_voted' }, { status: 400 });
    }

    // Hesap yaşını Discord snowflake'den hesapla (epoch: 2015-01-01)
    // BigInt literal yerine Number aritmetiği (ES2019 uyumlu)
    const DISCORD_EPOCH = 1420070400000;
    const snowflake = parseInt(userId, 10);
    const accountCreatedAt = new Date(Math.floor(snowflake / 4194304) + DISCORD_EPOCH);
    const accountAgeDays = Math.floor(
      (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isValid = accountAgeDays >= MIN_ACCOUNT_AGE_DAYS;

    await supabase.from('economy_votes').insert({
      guild_id: guildId,
      user_id: userId,
      discord_account_age_days: accountAgeDays,
      is_valid: isValid,
    });

    if (!isValid) {
      return NextResponse.json({
        ok: true,
        vote_counted: false,
        reason: 'account_too_new',
        account_age_days: accountAgeDays,
      });
    }

    // Geçerli oy sayısını artır
    const { data: app } = await supabase
      .from('economy_applications')
      .select('vote_count, vote_threshold')
      .eq('guild_id', guildId)
      .single();

    const newVoteCount = (app?.vote_count ?? 0) + 1;
    const threshold = app?.vote_threshold ?? VOTE_THRESHOLD;

    // Eşiğe ulaşıldı mı? → pending'e geç
    if (newVoteCount >= threshold) {
      const scheduledOpen = new Date();
      scheduledOpen.setDate(scheduledOpen.getDate() + AUTO_APPROVE_DAYS);

      const autoApprove = await getAutoApproveFlag(supabase);
      const { data: server } = await supabase
        .from('servers')
        .select('member_count, is_setup')
        .eq('discord_id', guildId)
        .maybeSingle();
      const memberCount = server?.member_count ?? 0;
      const eligible = !!server?.is_setup && (memberCount >= DIRECT_MEMBER_THRESHOLD || newVoteCount >= threshold);
      const nextStatus = autoApprove && eligible ? 'approved' : 'pending';

      await supabase
        .from('economy_applications')
        .update({
          vote_count: newVoteCount,
          status: nextStatus,
          submitted_at: new Date().toISOString(),
          scheduled_open_at: scheduledOpen.toISOString(),
          reviewed_at: nextStatus === 'approved' ? new Date().toISOString() : null,
        })
        .eq('guild_id', guildId);

      if (nextStatus === 'approved') {
        await supabase
          .from('servers')
          .update({ economy_tier: 'advanced', advanced_since: new Date().toISOString() })
          .eq('discord_id', guildId);
      }

      return NextResponse.json({
        ok: true,
        vote_counted: true,
        new_status: nextStatus,
        scheduled_open_at: scheduledOpen.toISOString(),
        message: nextStatus === 'approved'
          ? 'Eşiğe ulaşıldı ve otomatik onaylandı.'
          : 'Eşiğe ulaşıldı! Başvurunuz incelemeye alındı.',
      });
    }

    await supabase
      .from('economy_applications')
      .update({ vote_count: newVoteCount })
      .eq('guild_id', guildId);

    return NextResponse.json({
      ok: true,
      vote_counted: true,
      vote_count: newVoteCount,
      vote_threshold: threshold,
    });
  }

  // DİREKT BAŞVURU
  if (type === 'direct') {
    // Üye sayısı kontrolü (Discord API veya servers tablosundan)
    const { data: server } = await supabase
      .from('servers')
      .select('member_count, is_setup')
      .eq('discord_id', guildId)
      .maybeSingle() as { data: { member_count: number | null } | null };

    const memberCount = server?.member_count ?? 0;
    if (!server?.is_setup) {
      return NextResponse.json({ error: 'server_not_ready' }, { status: 400 });
    }
    if (memberCount < DIRECT_MEMBER_THRESHOLD) {
      return NextResponse.json({
        error: 'insufficient_members',
        required: DIRECT_MEMBER_THRESHOLD,
        current: memberCount,
      }, { status: 400 });
    }

    const scheduledOpen = new Date();
    scheduledOpen.setDate(scheduledOpen.getDate() + AUTO_APPROVE_DAYS);

    const autoApprove = await getAutoApproveFlag(supabase);
    const nextStatus = autoApprove ? 'approved' : 'pending';

    await supabase.from('economy_applications').upsert({
      guild_id: guildId,
      status: nextStatus,
      application_type: 'direct',
      submitted_at: new Date().toISOString(),
      scheduled_open_at: scheduledOpen.toISOString(),
      reviewed_at: nextStatus === 'approved' ? new Date().toISOString() : null,
    }, { onConflict: 'guild_id' });

    if (nextStatus === 'approved') {
      await supabase
        .from('servers')
        .update({ economy_tier: 'advanced', advanced_since: new Date().toISOString() })
        .eq('discord_id', guildId);
    }

    return NextResponse.json({
      ok: true,
      status: nextStatus,
      scheduled_open_at: scheduledOpen.toISOString(),
    });
  }

  // OYL AMA BAŞLAT
  if (type === 'vote') {
    await supabase.from('economy_applications').upsert({
      guild_id: guildId,
      status: 'voting',
      application_type: 'vote',
      vote_count: 0,
      vote_threshold: VOTE_THRESHOLD,
    }, { onConflict: 'guild_id' });

    return NextResponse.json({
      ok: true,
      status: 'voting',
      vote_threshold: VOTE_THRESHOLD,
    });
  }

  return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
}
