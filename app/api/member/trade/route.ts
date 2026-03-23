/**
 * POST /api/member/trade — Borsa anlık alım/satım (market order)
 *
 * Body: { guild_id: string, action: 'buy' | 'sell', lot_count: number }
 *
 * Fees: buy %1, sell %0.5
 * Fee split: 60% server_mari_treasury, 25% dividend_pool, 15% platform wallet
 * Daily sell limit: 30% of position (gross, resets at 00:00 UTC)
 * Price nudge: ±1-3% for large trades (>1% of public_lots)
 */

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

const TRADE_FEE_BUY = 0.01;   // %1
const TRADE_FEE_SELL = 0.005; // %0.5
const FEE_TREASURY_SHARE = 0.60;
const FEE_DIVIDEND_SHARE = 0.25;
// FEE_PLATFORM_SHARE = 0.15 (implicit)

const PLATFORM_GUILD_ID = process.env.PLATFORM_GUILD_ID ?? 'platform';

const getSupabase = (): SupabaseClient | null => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const getTodayStartIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

// Mari bakiyesi (global — guild_id = user_id için mari_wallet tablosu veya member_wallets platform guild)
const getMariBalance = async (supabase: SupabaseClient, userId: string): Promise<number> => {
  const { data } = await supabase
    .from('mari_wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
};

const setMariBalance = async (supabase: SupabaseClient, userId: string, balance: number) => {
  await supabase.from('mari_wallets').upsert(
    { user_id: userId, balance, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
};

// Price nudge: buy → fiyat artar, sell → fiyat düşer
// Büyük trade (>1% of public_lots) → %2, çok büyük (>3%) → %3, küçük → %1
const calcPriceNudge = (action: 'buy' | 'sell', lotCount: number, publicLots: number): number => {
  const pct = lotCount / Math.max(publicLots, 1);
  let nudge = 0.01;
  if (pct > 0.03) nudge = 0.03;
  else if (pct > 0.01) nudge = 0.02;
  return action === 'buy' ? nudge : -nudge;
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'transactions']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const payload = (await request.json()) as {
    guild_id?: string;
    action?: 'buy' | 'sell';
    lot_count?: number;
  };

  const { guild_id: guildId, action, lot_count: lotCount } = payload;

  if (!guildId || !action || typeof lotCount !== 'number' || lotCount <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (action !== 'buy' && action !== 'sell') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
  if (!Number.isInteger(lotCount)) {
    return NextResponse.json({ error: 'lot_count_must_be_integer' }, { status: 400 });
  }

  // ── 1. Listing bilgisi ──────────────────────────────────────────────────
  const { data: listing } = await supabase
    .from('server_listings')
    .select(
      'id, guild_id, status, market_price, ipo_price, total_lots, founder_lots, public_lots, circulating_lots, current_day_high, current_day_low',
    )
    .eq('guild_id', guildId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });

  const marketPrice: number = Number(listing.market_price);
  const publicLots: number = Number(listing.public_lots);
  const circulatingLots: number = Number(listing.circulating_lots ?? 0);

  // ── 2. Satım için: holdings ve günlük limit kontrol ────────────────────
  let holding: { lot_count: number; avg_buy_price: number; daily_sell_used: number } | null = null;

  if (action === 'sell') {
    const { data } = await supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price, daily_sell_used')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .maybeSingle();

    if (!data || Number(data.lot_count) < lotCount) {
      return NextResponse.json({ error: 'insufficient_lots' }, { status: 400 });
    }
    holding = {
      lot_count: Number(data.lot_count),
      avg_buy_price: Number(data.avg_buy_price ?? marketPrice),
      daily_sell_used: Number(data.daily_sell_used ?? 0),
    };

    // Günlük satış limiti: pozisyonun %30'u (brüt)
    const dailyLimit = Math.floor(holding.lot_count * 0.3);
    const alreadySold = holding.daily_sell_used;
    if (alreadySold + lotCount > dailyLimit) {
      return NextResponse.json(
        { error: 'daily_sell_limit_exceeded', daily_limit: dailyLimit, already_sold: alreadySold },
        { status: 400 },
      );
    }
  }

  // Alım için: piyasada yeterli lot var mı?
  if (action === 'buy') {
    const availableLots = publicLots - circulatingLots;
    if (availableLots < lotCount) {
      return NextResponse.json(
        { error: 'insufficient_market_lots', available: availableLots },
        { status: 400 },
      );
    }
  }

  // ── 3. Fee ve toplam maliyet hesabı ───────────────────────────────────
  const feeRate = action === 'buy' ? TRADE_FEE_BUY : TRADE_FEE_SELL;
  const grossValue = Math.round(marketPrice * lotCount * 100) / 100;
  const feeAmount = Math.round(grossValue * feeRate * 100) / 100;

  const treasuryFee = Math.round(feeAmount * FEE_TREASURY_SHARE * 100) / 100;
  const dividendFee = Math.round(feeAmount * FEE_DIVIDEND_SHARE * 100) / 100;
  // platform fee = remaining (avoid float drift)
  const platformFee = Math.round((feeAmount - treasuryFee - dividendFee) * 100) / 100;

  // ── 4. Mari bakiyesi kontrol (alım için) ──────────────────────────────
  const mariBalance = await getMariBalance(supabase, userId);
  if (action === 'buy') {
    const totalCost = grossValue + feeAmount;
    if (mariBalance < totalCost) {
      return NextResponse.json(
        { error: 'insufficient_mari', required: totalCost, balance: mariBalance },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();

  // ── 5. Mari bakiyesi güncelle ──────────────────────────────────────────
  let newMariBalance: number;
  if (action === 'buy') {
    newMariBalance = Math.round((mariBalance - grossValue - feeAmount) * 100) / 100;
  } else {
    newMariBalance = Math.round((mariBalance + grossValue - feeAmount) * 100) / 100;
  }
  await setMariBalance(supabase, userId, newMariBalance);

  // ── 6. investor_holdings upsert ────────────────────────────────────────
  if (action === 'buy') {
    const { data: existingHolding } = await supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .maybeSingle();

    const prevLots = Number(existingHolding?.lot_count ?? 0);
    const prevAvg = Number(existingHolding?.avg_buy_price ?? 0);
    const newLots = prevLots + lotCount;
    // Ağırlıklı ortalama alım fiyatı
    const newAvg = prevLots === 0
      ? marketPrice
      : Math.round(((prevAvg * prevLots + marketPrice * lotCount) / newLots) * 100) / 100;

    await supabase.from('investor_holdings').upsert(
      {
        user_id: userId,
        guild_id: guildId,
        lot_count: newLots,
        avg_buy_price: newAvg,
        updated_at: now,
      },
      { onConflict: 'user_id,guild_id' },
    );
  } else {
    // sell
    const newLots = holding!.lot_count - lotCount;
    const newDailySellUsed = holding!.daily_sell_used + lotCount;

    await supabase.from('investor_holdings').upsert(
      {
        user_id: userId,
        guild_id: guildId,
        lot_count: newLots,
        avg_buy_price: holding!.avg_buy_price,
        daily_sell_used: newDailySellUsed,
        updated_at: now,
      },
      { onConflict: 'user_id,guild_id' },
    );
  }

  // ── 7. server_listings: circulating_lots + fiyat güncellemesi ─────────
  const newCirculatingLots = action === 'buy'
    ? circulatingLots + lotCount
    : Math.max(0, circulatingLots - lotCount);

  const nudge = calcPriceNudge(action, lotCount, publicLots);
  const newPrice = Math.round(marketPrice * (1 + nudge) * 100) / 100;
  const newDayHigh = Math.max(Number(listing.current_day_high ?? 0), newPrice);
  const newDayLow = listing.current_day_low
    ? Math.min(Number(listing.current_day_low), newPrice)
    : newPrice;

  await supabase
    .from('server_listings')
    .update({
      market_price: newPrice,
      circulating_lots: newCirculatingLots,
      current_day_high: newDayHigh,
      current_day_low: newDayLow,
      updated_at: now,
    })
    .eq('guild_id', guildId);

  // ── 8. price_history kaydı ────────────────────────────────────────────
  await supabase.from('price_history').insert({
    guild_id: guildId,
    price: newPrice,
    volume: lotCount,
    recorded_at: now,
  });

  // ── 9. trades kaydı ───────────────────────────────────────────────────
  await supabase.from('trades').insert({
    guild_id: guildId,
    user_id: userId,
    action,
    lot_count: lotCount,
    price_per_lot: marketPrice,
    fee_amount: feeAmount,
    total_value: grossValue,
    created_at: now,
  });

  // ── 10. Fee dağıtımı: server_mari_treasury + dividend_pool ───────────
  if (treasuryFee > 0) {
    const { data: existingTreasury } = await supabase
      .from('server_mari_treasury')
      .select('balance')
      .eq('guild_id', guildId)
      .maybeSingle();

    const newTreasuryBalance = Math.round(
      (Number(existingTreasury?.balance ?? 0) + treasuryFee) * 100,
    ) / 100;

    await supabase.from('server_mari_treasury').upsert(
      { guild_id: guildId, balance: newTreasuryBalance, updated_at: now },
      { onConflict: 'guild_id' },
    );
  }

  if (dividendFee > 0) {
    const { data: existingPool } = await supabase
      .from('dividend_pool')
      .select('balance')
      .eq('guild_id', guildId)
      .maybeSingle();

    const newPoolBalance = Math.round(
      (Number(existingPool?.balance ?? 0) + dividendFee) * 100,
    ) / 100;

    await supabase.from('dividend_pool').upsert(
      { guild_id: guildId, balance: newPoolBalance, updated_at: now },
      { onConflict: 'guild_id' },
    );
  }

  // Platform fee → platform treasury (opsiyonel: platform_treasury tablosu)
  if (platformFee > 0) {
    const { data: existingPlatform } = await supabase
      .from('platform_treasury')
      .select('balance')
      .maybeSingle();

    if (existingPlatform !== undefined) {
      const newPlatformBalance = Math.round(
        (Number(existingPlatform?.balance ?? 0) + platformFee) * 100,
      ) / 100;
      await supabase
        .from('platform_treasury')
        .upsert({ id: 1, balance: newPlatformBalance, updated_at: now }, { onConflict: 'id' });
    }
  }

  return NextResponse.json({
    status: 'ok',
    action,
    lot_count: lotCount,
    price_per_lot: marketPrice,
    gross_value: grossValue,
    fee_amount: feeAmount,
    new_price: newPrice,
    new_mari_balance: newMariBalance,
  });
}
