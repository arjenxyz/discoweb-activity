/**
 * GET /api/member/market-orders — Kullanıcının açık emirleri + işlem geçmişi
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
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const [ordersRes, tradesRes, holdingRes] = await Promise.all([
    supabase
      .from('market_orders')
      .select('id, type, lot_count, remaining_lots, price_per_lot, status, created_at, expires_at')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .in('status', ['open', 'partial'])
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('market_trades')
      .select('id, lot_count, price_per_lot, total_amount, platform_fee, traded_at, buyer_user_id, seller_user_id')
      .eq('guild_id', guildId)
      .or(`buyer_user_id.eq.${userId},seller_user_id.eq.${userId}`)
      .order('traded_at', { ascending: false })
      .limit(50),

    supabase
      .from('investor_holdings')
      .select('lot_count, avg_buy_price')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    orders: ordersRes.data ?? [],
    trades: tradesRes.data ?? [],
    holding: holdingRes.data,
  });
}
