/**
 * GET /api/member/referral-leaderboard
 *
 * Top 10 davetçi + kullanıcının kendi sırası.
 * Privacy safe: kullanıcı adı yerine Discord snowflake son 4 hane gösterilir.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

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

    // Top 10 by total_invites
    const { data: topProfiles } = await supabase
      .from('member_profiles')
      .select('user_id, total_invites')
      .eq('guild_id', selectedGuildId)
      .gt('total_invites', 0)
      .order('total_invites', { ascending: false })
      .limit(10);

    const topList = topProfiles ?? [];
    const topUserIds = topList.map((p) => p.user_id);

    // Total earned per user from referral ledger entries
    let earnedMap: Record<string, number> = {};
    if (topUserIds.length > 0) {
      const { data: ledger } = await supabase
        .from('wallet_ledger')
        .select('user_id, amount')
        .eq('guild_id', selectedGuildId)
        .in('user_id', topUserIds)
        .in('type', ['referral_reward', 'referral_milestone']);

      for (const row of ledger ?? []) {
        earnedMap[row.user_id] = (earnedMap[row.user_id] ?? 0) + Number(row.amount ?? 0);
      }
    }

    const entries = topList.map((p, i) => ({
      rank: i + 1,
      user_label: `Kullanıcı #${String(p.user_id).slice(-4)}`,
      total_invites: Number(p.total_invites ?? 0),
      total_earned: earnedMap[p.user_id] ?? 0,
      is_me: p.user_id === userId,
    }));

    // Kullanıcı top 10'da değilse, kendi sırasını bul
    const myInTopTen = topList.findIndex((p) => p.user_id === userId);
    let myRank: number | null = null;
    let myInvites = 0;

    if (myInTopTen !== -1) {
      myRank = myInTopTen + 1;
      myInvites = Number(topList[myInTopTen].total_invites ?? 0);
    } else {
      // Kendi profilini çek
      const { data: myProfile } = await supabase
        .from('member_profiles')
        .select('total_invites')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId)
        .maybeSingle();

      myInvites = Number(myProfile?.total_invites ?? 0);

      if (myInvites > 0) {
        // Kaç kişi benden fazla davet yaptı?
        const { count } = await supabase
          .from('member_profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('guild_id', selectedGuildId)
          .gt('total_invites', myInvites);

        myRank = (count ?? 0) + 1;
      }
    }

    return NextResponse.json({
      entries,
      my_rank: myRank,
      my_invites: myInvites,
    });
  } catch (err) {
    console.error('[referral-leaderboard]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
