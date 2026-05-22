/**
 * GET /api/member/referral-stats
 *
 * Kullanıcının referral istatistiklerini döner:
 * - total_invites, total_earned_papel
 * - claimed milestones + next milestone
 * - son 10 davet geçmişi (invitee maskelenmiş)

 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

const MILESTONE_REWARDS: Record<number, number> = {
  5: 500,
  10: 1500,
  20: 3000,
  50: 10000,
  100: 25000,
};
const MILESTONES = [5, 10, 20, 50, 100];

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });

    // Paralel sorgular
    const [profileRes, milestonesRes, historyRes, ledgerRes] = await Promise.all([
      supabase
        .from('member_profiles')
        .select('total_invites')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId)
        .maybeSingle(),

      supabase
        .from('referral_milestone_claims')
        .select('milestone')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId),

      supabase
        .from('referral_history')
        .select('invitee_id, status, created_at')
        .eq('guild_id', selectedGuildId)
        .eq('inviter_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId)
        .in('type', ['referral_reward', 'referral_milestone']),
    ]);

    const totalInvites = Number(profileRes.data?.total_invites ?? 0);
    const claimedMilestones = (milestonesRes.data ?? []).map((m) => Number(m.milestone));
    const nextMilestone = MILESTONES.find((m) => m > totalInvites && !claimedMilestones.includes(m)) ?? null;
    const nextMilestoneBonus = nextMilestone ? (MILESTONE_REWARDS[nextMilestone] ?? 0) : 0;

    const totalEarnedPapel = (ledgerRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    const inviteHistory = (historyRes.data ?? []).map((row) => ({
      invitee_masked: `Kullanıcı #${String(row.invitee_id).slice(-4)}`,
      status: row.status ?? 'accepted',
      created_at: row.created_at,
    }));



    return NextResponse.json({
      total_invites: totalInvites,
      total_earned_papel: totalEarnedPapel,
      claimed_milestones: claimedMilestones,
      next_milestone: nextMilestone,
      next_milestone_bonus: nextMilestoneBonus,
      invite_history: inviteHistory,

    });
  } catch (err) {
    console.error('[referral-stats]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
