/**
 * GET /api/member/price-history?guild_id=<id>&range=7d
 *
 * range: 1d | 7d | 30d | all  (default: 30d)
 *
 * Returns OHLCV candle data for charting.
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

const RANGE_DAYS: Record<string, number | null> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  all: null,
};

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  const rangeParam = url.searchParams.get('range') ?? '30d';

  if (!guildId) return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });

  const days = RANGE_DAYS[rangeParam] !== undefined ? RANGE_DAYS[rangeParam] : 30;

  let query = supabase
    .from('price_history')
    .select('date, open_price, close_price, high_price, low_price, volume_lots')
    .eq('guild_id', guildId)
    .order('date', { ascending: true });

  if (days !== null) {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days);
    query = query.gte('date', from.toISOString().slice(0, 10));
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    guild_id: guildId,
    range: rangeParam,
    candles: (data ?? []).map((row) => ({
      date: row.date,
      open: Number(row.open_price),
      close: Number(row.close_price),
      high: Number(row.high_price),
      low: Number(row.low_price),
      volume: Number(row.volume_lots),
    })),
  });
}
