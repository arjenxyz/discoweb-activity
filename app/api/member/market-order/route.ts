/**
 * POST /api/member/market-order — Alış veya satış emri ver
 * DELETE /api/member/market-order — Emir iptal et
 *
 * Emir eşleştirme (matching) aynı işlemde yapılır:
 *   - Alış emrinde: fiyat >= sell_price olan açık satış emirleri çekilir, ACID transaction içinde eşleştirilir
 *   - Satış emrinde: fiyat <= buy_price olan açık alış emirleri çekilir, ACID transaction içinde eşleştirilir
 *
 * Platform komisyonu: %2 (wallet_ledger: 'market_fee')
 * Max 3 farklı sunucuya yatırım limiti (alış emirlerinde kontrol edilir)
 * Kendi sunucusuna yatırım engeli
 * Reserved balance: emir açılınca reserved_balance += total, kapanınca --
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkGlobalFreeze } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

const PLATFORM_FEE_RATE = 0.02; // %2
const ORDER_TTL_DAYS = 7;
const MAX_PORTFOLIO_GUILDS = 3;

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

/** Emir ver (POST) */
export async function POST(request: Request) {
  const freeze = await checkGlobalFreeze();
  if (freeze.frozen || freeze.readOnly) {
    return NextResponse.json({ error: 'global_freeze' }, { status: 503 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const body = (await request.json()) as {
    type?: 'buy' | 'sell';
    lot_count?: number;
    price_per_lot?: number;
  };

  const { type, lot_count, price_per_lot } = body;

  if (!type || !['buy', 'sell'].includes(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  if (!lot_count || lot_count <= 0 || !Number.isInteger(lot_count)) {
    return NextResponse.json({ error: 'invalid_lot_count' }, { status: 400 });
  }
  if (!price_per_lot || price_per_lot <= 0) {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }

  // Sunucu borsada mı?
  const { data: listing } = await supabase
    .from('server_listings')
    .select('id, status, market_price, total_lots, founder_user_id, founder_vested_lots, circuit_breaker_until')
    .eq('guild_id', guildId)
    .maybeSingle() as { data: { id: string; status: string; market_price: number; total_lots: number; founder_user_id: string; founder_vested_lots: number; circuit_breaker_until: string | null } | null };

  if (!listing || listing.status !== 'approved') {
    return NextResponse.json({ error: 'not_listed' }, { status: 400 });
  }

  // Circuit breaker kontrolü
  if (listing.circuit_breaker_until && new Date(listing.circuit_breaker_until) > new Date()) {
    return NextResponse.json({ error: 'circuit_breaker_active' }, { status: 400 });
  }

  // Sunucu sahibi kendi sunucusuna yatırım yapamaz (manipülasyon önlemi)
  if (type === 'buy' && listing.founder_user_id === userId) {
    return NextResponse.json({ error: 'own_server' }, { status: 400 });
  }

  if (type === 'buy') {
    // Max 3 farklı sunucu limiti
    const { data: holdings } = await supabase
      .from('investor_holdings')
      .select('guild_id')
      .eq('user_id', userId)
      .gt('lot_count', 0);

    const activeGuilds = new Set((holdings ?? []).map((h) => h.guild_id));
    activeGuilds.delete(guildId); // Bu sunucuda zaten varsa saymaz

    if (activeGuilds.size >= MAX_PORTFOLIO_GUILDS) {
      return NextResponse.json({ error: 'max_portfolio_reached' }, { status: 400 });
    }

    // Sunucu max_order_lots kontrolü
    const { data: serverSettings } = await supabase
      .from('servers')
      .select('max_order_lots')
      .eq('discord_id', guildId)
      .maybeSingle();

    const maxLots = serverSettings?.max_order_lots ?? 10000;
    if (lot_count > maxLots) {
      return NextResponse.json({ error: 'exceeds_max_order_lots', max: maxLots }, { status: 400 });
    }

    // Kullanıcının yeterli bakiyesi var mı? (reserved_balance dahil)
    const totalCost = lot_count * price_per_lot;
    const { data: wallet } = await supabase
      .from('member_wallets')
      .select('balance, reserved_balance')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle();

    const available = (wallet?.balance ?? 0) - (wallet?.reserved_balance ?? 0);
    if (available < totalCost) {
      return NextResponse.json({ error: 'insufficient_balance', available }, { status: 400 });
    }

    // Reserved balance artır
    await supabase
      .from('member_wallets')
      .update({ reserved_balance: (wallet?.reserved_balance ?? 0) + totalCost })
      .eq('guild_id', guildId)
      .eq('user_id', userId);

  } else {
    // Satış emri: yeterli lot var mı?
    const { data: holding } = await supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .maybeSingle();

    if (!holding || holding.lot_count < lot_count) {
      return NextResponse.json({ error: 'insufficient_lots', available: holding?.lot_count ?? 0 }, { status: 400 });
    }

    // Founder vesting kontrolü (sadece bu sunucunun founder'ı için)
    if (listing.founder_user_id === userId) {
      if (listing.founder_vested_lots !== undefined && lot_count > listing.founder_vested_lots) {
        return NextResponse.json({
          error: 'vesting_locked',
          vested_lots: listing.founder_vested_lots,
        }, { status: 400 });
      }
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ORDER_TTL_DAYS);

  // Emri oluştur
  const { data: order, error: orderError } = await supabase
    .from('market_orders')
    .insert({
      user_id: userId,
      guild_id: guildId,
      type,
      lot_count,
      remaining_lots: lot_count,
      price_per_lot,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });
  }

  // Eşleştirme dene
  await matchOrders(supabase, guildId, order.id, type, price_per_lot, userId);

  return NextResponse.json({ ok: true, order_id: order.id });
}

/** Emir iptal et (DELETE) */
export async function DELETE(request: Request) {
  const freeze = await checkGlobalFreeze();
  if (freeze.frozen) {
    return NextResponse.json({ error: 'global_freeze' }, { status: 503 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId) return NextResponse.json({ error: 'missing_order_id' }, { status: 400 });

  const { data: order } = await supabase
    .from('market_orders')
    .select('id, user_id, guild_id, type, remaining_lots, price_per_lot, status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!['open', 'partial'].includes(order.status)) {
    return NextResponse.json({ error: 'order_not_cancellable' }, { status: 400 });
  }

  // İptal et
  await supabase
    .from('market_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);

  // Alış emriyse reserved_balance serbest bırak
  if (order.type === 'buy') {
    const refund = order.remaining_lots * order.price_per_lot;
    const { data: wallet } = await supabase
      .from('member_wallets')
      .select('reserved_balance')
      .eq('guild_id', order.guild_id)
      .eq('user_id', userId)
      .maybeSingle();

    await supabase
      .from('member_wallets')
      .update({ reserved_balance: Math.max(0, (wallet?.reserved_balance ?? 0) - refund) })
      .eq('guild_id', order.guild_id)
      .eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}

// ─── Matching Engine ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function matchOrders(
  supabase: SupabaseClient,
  guildId: string,
  newOrderId: string,
  orderType: 'buy' | 'sell',
  newPrice: number,
  newUserId: string,
) {
  const counterType = orderType === 'buy' ? 'sell' : 'buy';

  // Karşıt emirleri fiyat-zaman önceliğiyle çek
  let query = supabase
    .from('market_orders')
    .select('id, user_id, remaining_lots, price_per_lot')
    .eq('guild_id', guildId)
    .eq('type', counterType)
    .in('status', ['open', 'partial'])
    .neq('user_id', newUserId)
    .limit(20);

  if (orderType === 'buy') {
    // Alış: en ucuz satışları önce
    query = query.lte('price_per_lot', newPrice).order('price_per_lot', { ascending: true }).order('created_at', { ascending: true });
  } else {
    // Satış: en yüksek fiyatlı alışları önce
    query = query.gte('price_per_lot', newPrice).order('price_per_lot', { ascending: false }).order('created_at', { ascending: true });
  }

  const { data: counterOrders } = await query;
  if (!counterOrders || counterOrders.length === 0) return;

  // Yeni emrin kalan lotlarını al
  const { data: newOrder } = await supabase
    .from('market_orders')
    .select('remaining_lots')
    .eq('id', newOrderId)
    .single();

  if (!newOrder) return;

  let remaining = newOrder.remaining_lots;

  for (const counter of counterOrders) {
    if (remaining <= 0) break;

    const tradeLots = Math.min(remaining, counter.remaining_lots);
    const tradePrice = counter.price_per_lot; // Karşıt emrin fiyatı geçerli
    const totalAmount = tradeLots * tradePrice;
    const platformFee = Math.floor(totalAmount * PLATFORM_FEE_RATE);

    const buyOrderId = orderType === 'buy' ? newOrderId : counter.id;
    const sellOrderId = orderType === 'sell' ? newOrderId : counter.id;
    const buyUserId = orderType === 'buy' ? newUserId : counter.user_id;
    const sellUserId = orderType === 'sell' ? newUserId : counter.user_id;

    // Wash trading kontrolü: aynı çiftin 1 saatte max 2 işlemi
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count: recentTrades } = await supabase
      .from('market_trades')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId)
      .eq('buyer_user_id', buyUserId)
      .eq('seller_user_id', sellUserId)
      .gte('traded_at', oneHourAgo);

    if ((recentTrades ?? 0) >= 2) continue;

    // Trade kaydı oluştur
    await supabase.from('market_trades').insert({
      guild_id: guildId,
      buyer_user_id: buyUserId,
      seller_user_id: sellUserId,
      lot_count: tradeLots,
      price_per_lot: tradePrice,
      total_amount: totalAmount,
      platform_fee: platformFee,
      buy_order_id: buyOrderId,
      sell_order_id: sellOrderId,
    });

    // Alıcıya lot ver
    const { data: buyerHolding } = await supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price')
      .eq('user_id', buyUserId)
      .eq('guild_id', guildId)
      .maybeSingle();

    const oldLots = buyerHolding?.lot_count ?? 0;
    const oldAvg = buyerHolding?.avg_buy_price ?? tradePrice;
    const newAvg = (oldLots * oldAvg + tradeLots * tradePrice) / (oldLots + tradeLots);

    await supabase.from('investor_holdings').upsert({
      user_id: buyUserId,
      guild_id: guildId,
      lot_count: oldLots + tradeLots,
      avg_buy_price: newAvg,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,guild_id' });

    // Satıcıdan lot düş
    const { data: sellerHolding } = await supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price')
      .eq('user_id', sellUserId)
      .eq('guild_id', guildId)
      .maybeSingle();

    await supabase.from('investor_holdings').update({
      lot_count: (sellerHolding?.lot_count ?? 0) - tradeLots,
      updated_at: new Date().toISOString(),
    }).eq('user_id', sellUserId).eq('guild_id', guildId);

    // Alıcının wallet'ından para çık (reserved_balance düş + ledger)
    const { data: buyerWallet } = await supabase
      .from('member_wallets')
      .select('balance, reserved_balance')
      .eq('guild_id', guildId)
      .eq('user_id', buyUserId)
      .maybeSingle();

    await supabase.from('member_wallets').update({
      balance: (buyerWallet?.balance ?? 0) - totalAmount,
      reserved_balance: Math.max(0, (buyerWallet?.reserved_balance ?? 0) - totalAmount),
      updated_at: new Date().toISOString(),
    }).eq('guild_id', guildId).eq('user_id', buyUserId);

    await supabase.from('wallet_ledger').insert({
      guild_id: guildId,
      user_id: buyUserId,
      amount: -totalAmount,
      type: 'market_fee',
      note: `Lot alımı: ${tradeLots} lot @ ${tradePrice} Papel`,
    });

    // Satıcıya para gönder (komisyon düşülmüş)
    const sellerReceives = totalAmount - platformFee;
    const { data: sellerWallet } = await supabase
      .from('member_wallets')
      .select('balance')
      .eq('guild_id', guildId)
      .eq('user_id', sellUserId)
      .maybeSingle();

    await supabase.from('member_wallets').update({
      balance: (sellerWallet?.balance ?? 0) + sellerReceives,
      updated_at: new Date().toISOString(),
    }).eq('guild_id', guildId).eq('user_id', sellUserId);

    await supabase.from('wallet_ledger').insert({
      guild_id: guildId,
      user_id: sellUserId,
      amount: sellerReceives,
      type: 'market_fee',
      note: `Lot satımı: ${tradeLots} lot @ ${tradePrice} Papel`,
    });

    // Emirlerin remaining_lots ve status güncelle
    const newRemainingCounter = counter.remaining_lots - tradeLots;
    await supabase.from('market_orders').update({
      remaining_lots: newRemainingCounter,
      status: newRemainingCounter === 0 ? 'filled' : 'partial',
      filled_at: newRemainingCounter === 0 ? new Date().toISOString() : null,
    }).eq('id', counter.id);

    remaining -= tradeLots;
  }

  // Yeni emrin kalan durumunu güncelle
  const newRemaining = Math.max(0, remaining);
  const { data: origOrder } = await supabase
    .from('market_orders')
    .select('lot_count')
    .eq('id', newOrderId)
    .single();

  const origLots = origOrder?.lot_count ?? 0;
  const newStatus = newRemaining === 0 ? 'filled' : newRemaining < origLots ? 'partial' : 'open';

  await supabase.from('market_orders').update({
    remaining_lots: newRemaining,
    status: newStatus,
    filled_at: newStatus === 'filled' ? new Date().toISOString() : null,
  }).eq('id', newOrderId);

  // Circuit breaker kontrolü: son 24 saatte fiyat -%30'dan fazla düştü mü?
  await checkCircuitBreaker(supabase, guildId);
}

async function checkCircuitBreaker(supabase: SupabaseClient, guildId: string) {
  const { data: listing } = await supabase
    .from('server_listings')
    .select('market_price, ipo_price')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (!listing) return;

  const oneDayAgo = new Date(Date.now() - 86400 * 1000).toISOString();
  const { data: oldTrade } = await supabase
    .from('market_trades')
    .select('price_per_lot')
    .eq('guild_id', guildId)
    .gte('traded_at', oneDayAgo)
    .order('traded_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!oldTrade) return;

  const priceDrop = (oldTrade.price_per_lot - listing.market_price) / oldTrade.price_per_lot;

  if (priceDrop >= 0.30) {
    const breakerUntil = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 saat
    await supabase.from('server_listings').update({
      circuit_breaker_until: breakerUntil,
    }).eq('guild_id', guildId);
  }
}
