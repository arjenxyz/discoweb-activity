/**
 * GET /api/member/market-detail?guild_id=<id>
 *
 * Returns full borsa detail for a single server:
 * - listing info (price, lots, day high/low, status)
 * - top 10 holders (excluding founder, treasury)
 * - recent 20 trades
 * - lot distribution (founder / treasury / public circulating / available)
 * - treasury info
 * - price change % (vs yesterday's close)
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

  // ── 1. Listing ─────────────────────────────────────────────────────────────
  const { data: listing } = await supabase
    .from('server_listings')
    .select(
      'guild_id, status, market_price, total_lots, founder_lots, public_lots, circulating_lots, current_day_high, current_day_low, category, description, vesting_start_date, founder_vested_lots, support_threshold, support_days_below, delist_days_below, created_at',
    )
    .eq('guild_id', guildId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });

  // ── 2. Yesterday's close (for % change) ────────────────────────────────────
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data: yesterdayPH } = await supabase
    .from('price_history')
    .select('close_price')
    .eq('guild_id', guildId)
    .eq('date', yesterdayStr)
    .maybeSingle();

  const marketPrice = Number(listing.market_price);
  const yesterdayClose = Number(yesterdayPH?.close_price ?? marketPrice);
  const priceChangePct =
    yesterdayClose > 0
      ? Math.round(((marketPrice - yesterdayClose) / yesterdayClose) * 10000) / 100
      : 0;

  // ── 3. Top 10 holders ──────────────────────────────────────────────────────
  const { data: holders } = await supabase
    .from('investor_holdings')
    .select('user_id, lot_count, avg_buy_price')
    .eq('guild_id', guildId)
    .gt('lot_count', 0)
    .order('lot_count', { ascending: false })
    .limit(10);

  // ── 4. Recent 20 trades ────────────────────────────────────────────────────
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('id, buyer_id, seller_id, lot_count, price_per_lot, total_mari, fee_mari, trade_type, traded_at')
    .eq('guild_id', guildId)
    .order('traded_at', { ascending: false })
    .limit(20);



  // ── 6. Current week dividend pool ──────────────────────────────────────────
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const { data: dividendPool } = await supabase
    .from('dividend_pool')
    .select('total_mari, distributed')
    .eq('guild_id', guildId)
    .eq('week_start', weekStartDate)
    .maybeSingle();

  // ── 7. Lot distribution ────────────────────────────────────────────────────
  const totalLots = Number(listing.total_lots ?? 0);
  const founderLots = Number(listing.founder_lots ?? 0);
  const publicLots = Number(listing.public_lots ?? 0);
  const circulatingLots = Number(listing.circulating_lots ?? 0);
  const availableLots = publicLots - circulatingLots;

  return NextResponse.json({
    listing: {
      guild_id: listing.guild_id,
      status: listing.status,
      market_price: marketPrice,

      price_change_pct: priceChangePct,
      current_day_high: listing.current_day_high ? Number(listing.current_day_high) : null,
      current_day_low: listing.current_day_low ? Number(listing.current_day_low) : null,
      category: listing.category,
      description: listing.description,
      support_threshold: listing.support_threshold ? Number(listing.support_threshold) : null,
      support_days_below: listing.support_days_below ?? 0,
      delist_days_below: listing.delist_days_below ?? 0,
      vesting_start_date: listing.vesting_start_date,
      founder_vested_lots: listing.founder_vested_lots ?? 0,
      created_at: listing.created_at,
    },
    lots: {
      total: totalLots,
      founder: founderLots,
      public: publicLots,
      circulating: circulatingLots,
      available: availableLots,
    },
    dividend_pool: dividendPool
      ? {
          week_start: weekStartDate,
          total_mari: Number(dividendPool.total_mari ?? 0),
          distributed: dividendPool.distributed,
        }
      : { week_start: weekStartDate, total_mari: 0, distributed: false },
    top_holders: (holders ?? []).map((h) => ({
      user_id: h.user_id,
      lot_count: Number(h.lot_count),
      avg_buy_price: Number(h.avg_buy_price ?? 0),
      pct_of_circulating:
        circulatingLots > 0
          ? Math.round((Number(h.lot_count) / circulatingLots) * 10000) / 100
          : 0,
    })),
    recent_trades: (recentTrades ?? []).map((t) => ({
      id: t.id,
      buyer_id: t.buyer_id,
      seller_id: t.seller_id,
      lot_count: t.lot_count,
      price_per_lot: Number(t.price_per_lot),
      total_mari: Number(t.total_mari),
      fee_mari: Number(t.fee_mari),
      trade_type: t.trade_type,
      traded_at: t.traded_at,
    })),
  });
}
