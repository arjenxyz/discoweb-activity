/**
 * GET /api/member/ipo-tiers?guild_id=<id>
 *
 * Returns IPO tier fill status for a listing.
 * Tiers are derived from the listing's circulating_lots vs public_lots.
 *
 * Tier thresholds (% of public_lots sold):
 *   Tier 1: 0–25%
 *   Tier 2: 25–50%   (+10% price bump at tier unlock)
 *   Tier 3: 50–75%   (+10% price bump)
 *   Tier 4: 75–100%  (+10% price bump)
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

const TIER_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1.0];

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  const { data: listing } = await supabase
    .from('server_listings')
    .select('status, ipo_price, market_price, public_lots, circulating_lots, founder_lots, total_lots, vesting_start_date')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });

  const publicLots = Number(listing.public_lots ?? 0);
  const circulatingLots = Number(listing.circulating_lots ?? 0);
  const ipoPrice = Number(listing.ipo_price ?? 0);
  const fillRatio = publicLots > 0 ? circulatingLots / publicLots : 0;

  // Determine current tier (1-based)
  let currentTier = 1;
  for (let i = 1; i < TIER_THRESHOLDS.length; i++) {
    if (fillRatio >= TIER_THRESHOLDS[i]) currentTier = i + 1;
  }
  if (currentTier > 4) currentTier = 4;

  const tiers = TIER_THRESHOLDS.slice(0, 4).map((start, i) => {
    const end = TIER_THRESHOLDS[i + 1];
    const tierNum = i + 1;
    const tierStart = Math.round(start * publicLots);
    const tierEnd = Math.round(end * publicLots);
    const tierFill = Math.max(0, Math.min(circulatingLots - tierStart, tierEnd - tierStart));
    const tierTotal = tierEnd - tierStart;
    // Price at tier unlock: ipo_price * (1.1)^i
    const tierPrice = Math.round(ipoPrice * Math.pow(1.1, i) * 100) / 100;

    return {
      tier: tierNum,
      price: tierPrice,
      lot_start: tierStart,
      lot_end: tierEnd,
      total_lots: tierTotal,
      sold_lots: tierFill,
      fill_pct: tierTotal > 0 ? Math.round((tierFill / tierTotal) * 10000) / 100 : 0,
      is_current: tierNum === currentTier,
      is_complete: fillRatio >= end,
    };
  });

  return NextResponse.json({
    guild_id: guildId,
    status: listing.status,
    ipo_price: ipoPrice,
    market_price: Number(listing.market_price),
    public_lots: publicLots,
    circulating_lots: circulatingLots,
    fill_pct: Math.round(fillRatio * 10000) / 100,
    current_tier: currentTier,
    tiers,
    vesting_start_date: listing.vesting_start_date,
    founder_lots: Number(listing.founder_lots ?? 0),
    total_lots: Number(listing.total_lots ?? 0),
  });
}
