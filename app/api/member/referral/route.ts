import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const MILESTONE_REWARDS: Record<number, number> = {
  5: 500,
  10: 1500,
  20: 3000,
  50: 10000,
  100: 25000,
};

// Bir davetçinin günde kabul edebileceği maksimum referral (farming koruması)
const MAX_DAILY_INVITES_PER_INVITER = Number(process.env.REFERRAL_MAX_DAILY ?? 20);
// Aynı IP'den günde kabul edilebilecek maksimum referral (alt account koruması)
const MAX_DAILY_PER_IP = Number(process.env.REFERRAL_MAX_DAILY_IP ?? 5);

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  null;

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    // Hesap yaşı kontrolü (Discord snowflake)
    const accountCreationMs = Number((BigInt(userId) >> BigInt(22)) + BigInt('1420070400000'));
    const minAgeMs = Number(process.env.REFERRAL_MIN_ACCOUNT_AGE_MS ?? 1000 * 60 * 60 * 24 * 3);
    if (Date.now() - accountCreationMs < minAgeMs) {
      return NextResponse.json({ error: 'new_account' }, { status: 400 });
    }

    // IP bazlı günlük limit (alt account farm koruması)
    const clientIp = getClientIp(request);
    if (clientIp) {
      const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
      const { count: ipCount } = await supabase
        .from('referral_history')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', selectedGuildId)
        .eq('invitee_ip', clientIp)
        .gte('created_at', oneDayAgo);
      if ((ipCount ?? 0) >= MAX_DAILY_PER_IP) {
        return NextResponse.json({ error: 'ip_rate_limit' }, { status: 429 });
      }
    }

    // Kod sahibini bul
    const { data: ownerProfile } = await supabase
      .from('member_profiles')
      .select('user_id, total_invites')
      .eq('guild_id', selectedGuildId)
      .eq('referral_code', code)
      .maybeSingle();

    if (!ownerProfile?.user_id) {
      return NextResponse.json({ error: 'code_not_found' }, { status: 404 });
    }
    if (ownerProfile.user_id === userId) {
      return NextResponse.json({ error: 'cannot_use_own_code' }, { status: 400 });
    }

    // Davetçinin günlük limitini kontrol et (farming koruması)
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { count: dailyCount } = await supabase
      .from('referral_history')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', selectedGuildId)
      .eq('inviter_id', ownerProfile.user_id)
      .gte('created_at', oneDayAgo);
    if ((dailyCount ?? 0) >= MAX_DAILY_INVITES_PER_INVITER) {
      return NextResponse.json({ error: 'inviter_daily_limit' }, { status: 429 });
    }

    const now = new Date().toISOString();

    // ATOMIK: referred_by IS NULL kontrolü + güncelleme tek sorguda
    // Race condition'ı önler — iki eşzamanlı istek sadece biri geçer
    const { data: updatedRows, error: updateProfileError } = await supabase
      .from('member_profiles')
      .update({ referred_by: ownerProfile.user_id, updated_at: now })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .is('referred_by', null)
      .select('user_id');

    if (updateProfileError) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    if (!updatedRows || updatedRows.length === 0) {
      // Başka bir istek zaten tamamladı
      return NextResponse.json({ error: 'already_referred' }, { status: 400 });
    }

    // Geçmiş kaydı
    await supabase.from('referral_history').insert({
      inviter_id: ownerProfile.user_id,
      invitee_id: userId,
      guild_id: selectedGuildId,
      status: 'accepted',
      created_at: now,
      status_changed_at: now,
      invitee_ip: clientIp,
    });

    // Ödül miktarı
    const { data: serverRow } = await supabase
      .from('servers')
      .select('referral_reward')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();
    const reward = Math.max(0, Number(serverRow?.referral_reward ?? 500));

    // ATOMIK: total_invites artır (stale read race'ini önler), yeni sayıyı al
    const { data: newCountRow } = await supabase
      .rpc('increment_total_invites', {
        p_guild_id: selectedGuildId,
        p_user_id: ownerProfile.user_id,
      });
    const newInviteCount: number = Number(newCountRow ?? (ownerProfile.total_invites ?? 0) + 1);

    // ATOMIK: cüzdan güncelleme (ON CONFLICT ... DO UPDATE SET balance = balance + amount)
    await supabase.rpc('add_to_wallet', { p_guild_id: selectedGuildId, p_user_id: userId, p_amount: reward });
    await supabase.rpc('add_to_wallet', { p_guild_id: selectedGuildId, p_user_id: ownerProfile.user_id, p_amount: reward });

    // Milestone kontrolü — UNIQUE constraint zaten çift ödülü önler, extra SELECT gerek yok
    let milestoneReached: number | null = null;
    let milestoneBonus = 0;
    const milestoneForCount = MILESTONE_REWARDS[newInviteCount];
    if (milestoneForCount !== undefined) {
      const { error: claimError } = await supabase.from('referral_milestone_claims').insert({
        guild_id: selectedGuildId,
        user_id: ownerProfile.user_id,
        milestone: newInviteCount,
        bonus: milestoneForCount,
        claimed_at: now,
      });

      // claimError.code === '23505' → zaten claimed (unique violation) → skip
      if (!claimError) {
        await supabase.rpc('add_to_wallet', {
          p_guild_id: selectedGuildId,
          p_user_id: ownerProfile.user_id,
          p_amount: milestoneForCount,
        });
        void Promise.resolve(supabase.from('wallet_ledger').insert({
          guild_id: selectedGuildId,
          user_id: ownerProfile.user_id,
          amount: milestoneForCount,
          type: 'referral_milestone',
          description: `Referral milestone: ${newInviteCount} davet`,
          created_at: now,
        })).catch(() => {});
        milestoneReached = newInviteCount;
        milestoneBonus = milestoneForCount;
      }
    }

    // Ledger (fire-and-forget)
    for (const uid of [userId, ownerProfile.user_id]) {
      void Promise.resolve(supabase.from('wallet_ledger').insert({
        guild_id: selectedGuildId,
        user_id: uid,
        amount: reward,
        type: 'referral_reward',
        description: 'Referral kodu kullanım ödülü',
        created_at: now,
      })).catch(() => {});
    }

    return NextResponse.json({ success: true, reward, milestone_reached: milestoneReached, milestone_bonus: milestoneBonus });
  } catch (err) {
    console.error('referral route error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
