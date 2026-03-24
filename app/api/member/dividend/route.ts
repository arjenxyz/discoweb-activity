/**
 * GET /api/member/dividend?guild_id=<id>
 *
 * Returns:
 * - Current week's dividend pool
 * - User's current lot count (for estimated payout)
 * - User's dividend history (last 20 entries)
 * - Next distribution date (Monday 01:00 UTC)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const getNextMonday0100 = (): string => {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 1, 0, 0));
  return next.toISOString();
};

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  // ── Current week pool ───────────────────────────────────────────────────────
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const [poolRes, holdingRes, historyRes] = await Promise.all([
    supabase
      .from('dividend_pool')
      .select('total_mari, distributed, distributed_at')
      .eq('guild_id', guildId)
      .eq('week_start', weekStartDate)
      .maybeSingle(),

    supabase
      .from('investor_holdings')
      .select('lot_count')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .maybeSingle(),

    supabase
      .from('dividend_history')
      .select('id, week_start, lot_snapshot, mari_received, distributed_at')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .order('distributed_at', { ascending: false })
      .limit(20),
  ]);

  // Total circulating lots for share estimation
  const { data: listing } = await supabase
    .from('server_listings')
    .select('circulating_lots')
    .eq('guild_id', guildId)
    .maybeSingle();

  const circulatingLots = Number(listing?.circulating_lots ?? 0);
  const userLots = Number(holdingRes.data?.lot_count ?? 0);
  const poolTotal = Number(poolRes.data?.total_mari ?? 0);
  const estimatedPayout =
    circulatingLots > 0 && userLots > 0
      ? Math.round((poolTotal * (userLots / circulatingLots)) * 100) / 100
      : 0;

  return NextResponse.json({
    guild_id: guildId,
    week_start: weekStartDate,
    pool: {
      total_mari: poolTotal,
      distributed: poolRes.data?.distributed ?? false,
      distributed_at: poolRes.data?.distributed_at ?? null,
    },
    user_lots: userLots,
    circulating_lots: circulatingLots,
    estimated_payout: estimatedPayout,
    next_distribution: getNextMonday0100(),
    history: (historyRes.data ?? []).map((h) => ({
      id: h.id,
      week_start: h.week_start,
      lot_snapshot: h.lot_snapshot,
      mari_received: Number(h.mari_received),
      distributed_at: h.distributed_at,
    })),
  });
}
