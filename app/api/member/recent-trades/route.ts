/**
 * GET /api/member/recent-trades?guild_id=<id>&limit=20
 *
 * Public feed of recent trades for a server (no auth required).
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
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  const { data, error } = await supabase
    .from('trades')
    .select('id, buyer_id, seller_id, lot_count, price_per_lot, total_mari, fee_mari, trade_type, traded_at')
    .eq('guild_id', guildId)
    .order('traded_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    guild_id: guildId,
    trades: (data ?? []).map((t) => ({
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
