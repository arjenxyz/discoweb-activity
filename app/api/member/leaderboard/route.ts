/**
 * GET /api/member/leaderboard?guild_id=<id>
 *
 * Top 10 investors for a server by lot_count.
 * Also returns total Mari earned from dividends.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  const [holdersRes, listingRes] = await Promise.all([
    supabase
      .from('investor_holdings')
      .select('user_id, lot_count, avg_buy_price')
      .eq('guild_id', guildId)
      .gt('lot_count', 0)
      .order('lot_count', { ascending: false })
      .limit(10),

    supabase
      .from('server_listings')
      .select('market_price, circulating_lots')
      .eq('guild_id', guildId)
      .maybeSingle(),
  ]);

  const marketPrice = Number(listingRes.data?.market_price ?? 0);
  const circulatingLots = Number(listingRes.data?.circulating_lots ?? 0);

  // For each holder, sum their dividend history
  const holders = holdersRes.data ?? [];
  const userIds = holders.map((h) => h.user_id);

  let dividendTotals: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: dividends } = await supabase
      .from('dividend_history')
      .select('user_id, mari_received')
      .eq('guild_id', guildId)
      .in('user_id', userIds);

    for (const d of dividends ?? []) {
      dividendTotals[d.user_id] = (dividendTotals[d.user_id] ?? 0) + Number(d.mari_received);
    }
  }

  return NextResponse.json({
    guild_id: guildId,
    market_price: marketPrice,
    circulating_lots: circulatingLots,
    leaderboard: holders.map((h, i) => {
      const lots = Number(h.lot_count);
      const avgBuy = Number(h.avg_buy_price ?? 0);
      const unrealizedPnl = Math.round((marketPrice - avgBuy) * lots * 100) / 100;
      return {
        rank: i + 1,
        user_id: h.user_id,
        lot_count: lots,
        avg_buy_price: avgBuy,
        current_value: Math.round(lots * marketPrice * 100) / 100,
        unrealized_pnl: unrealizedPnl,
        total_dividends: Math.round((dividendTotals[h.user_id] ?? 0) * 100) / 100,
        pct_of_circulating:
          circulatingLots > 0 ? Math.round((lots / circulatingLots) * 10000) / 100 : 0,
      };
    }),
  });
}
