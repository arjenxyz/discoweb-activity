/**
 * GET /api/admin/market-listings — Borsadaki tüm sunucular (developer only)
 * PATCH /api/admin/market-listings — Listing status veya market_price manuel güncelle
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEVELOPER_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const isDeveloper = (userId: string) => DEVELOPER_USER_ID && userId === DEVELOPER_USER_ID;

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data: listings } = await supabase
    .from('server_listings')
    .select('*, server_penalties(type, is_active, price_multiplier)')
    .order('listed_at', { ascending: false });

  return NextResponse.json({ listings: listings ?? [] });
}

export async function PATCH(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = (await request.json()) as {
    guild_id: string;
    status?: string;
    market_price?: number;
    circuit_breaker_clear?: boolean;
  };

  if (!body.guild_id) return NextResponse.json({ error: 'missing_guild_id' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.market_price) updates.market_price = Math.max(1, body.market_price);
  if (body.circuit_breaker_clear) updates.circuit_breaker_until = null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  await supabase.from('server_listings').update(updates).eq('guild_id', body.guild_id);

  return NextResponse.json({ ok: true });
}
