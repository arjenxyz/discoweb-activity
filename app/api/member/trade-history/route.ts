/**
 * GET /api/member/trade-history?guild_id=<id>&page=0&limit=20
 *
 * Returns authenticated user's trade history for a specific server.
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

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));

  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  const { data, count, error } = await supabase
    .from('trades')
    .select('id, lot_count, price_per_lot, total_mari, fee_mari, trade_type, traded_at', { count: 'exact' })
    .eq('guild_id', guildId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('traded_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    guild_id: guildId,
    page,
    limit,
    total: count ?? 0,
    trades: (data ?? []).map((t) => ({
      id: t.id,
      trade_type: t.trade_type,
      lot_count: t.lot_count,
      price_per_lot: Number(t.price_per_lot),
      total_mari: Number(t.total_mari),
      fee_mari: Number(t.fee_mari),
      traded_at: t.traded_at,
    })),
  });
}
