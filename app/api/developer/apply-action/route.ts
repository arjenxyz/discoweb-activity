import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDeveloper } from '@/lib/developerAuth';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 5;

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  const dev = await requireDeveloper(request);
  if (!dev.ok) return dev.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = await request.json();
  const { type, payload } = body;
  if (!type || !payload) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  // Daily limit check
  const today = new Date().toISOString().split('T')[0];
  const limitKey = `dev_ai_actions_${today}`;
  const { data: limitRow } = await supabase.from('app_config').select('value').eq('key', limitKey).maybeSingle();
  const currentCount = parseInt(limitRow?.value ?? '0', 10);

  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json({ error: 'daily_limit_exceeded', limit: DAILY_LIMIT }, { status: 429 });
  }

  if (type === 'market_event') {
    const { guild_id, type: eventType, title, description, price_impact, expires_at, severity } = payload;
    if (!guild_id || !eventType || !title) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const { error } = await supabase.from('market_events').insert({
      guild_id,
      type: eventType,
      severity: severity ?? 'info',
      title,
      description: description ?? '',
      price_impact: price_impact ?? 0,
      is_active: true,
      created_by_user_id: dev.userId,
      expires_at: expires_at ?? null,
    });
    if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });

  } else if (type === 'market_penalty') {
    const { guild_id, type: penaltyType, reason, fine_amount } = payload;
    if (!guild_id || !penaltyType || !reason) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const multipliers: Record<string, number> = { warning: 0.90, fine: 0.80, suspension: 1.0, delist: 1.0 };
    const { error } = await supabase.from('server_penalties').insert({
      guild_id,
      type: penaltyType,
      reason,
      fine_amount: fine_amount ?? null,
      price_multiplier: multipliers[penaltyType] ?? 1.0,
      is_active: true,
      issued_by_user_id: dev.userId,
    });
    if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });

    if (penaltyType === 'suspension') {
      await supabase.from('server_listings').update({ status: 'suspended' }).eq('guild_id', guild_id);
    } else if (penaltyType === 'delist') {
      await supabase.from('server_listings').update({ status: 'delisted', delisted_at: new Date().toISOString() }).eq('guild_id', guild_id);
    }

  } else if (type === 'listing_update') {
    const { guild_id, market_price, status, circuit_breaker_until } = payload;
    if (!guild_id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (market_price !== undefined) updates.market_price = market_price;
    if (status !== undefined) updates.status = status;
    if (circuit_breaker_until !== undefined) updates.circuit_breaker_until = circuit_breaker_until;

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'no_changes' }, { status: 400 });

    const { error } = await supabase.from('server_listings').update(updates).eq('guild_id', guild_id);
    if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });

  } else {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  // Increment counter
  if (limitRow) {
    await supabase.from('app_config').update({ value: String(currentCount + 1) }).eq('key', limitKey);
  } else {
    await supabase.from('app_config').insert({ key: limitKey, value: '1' });
  }

  return NextResponse.json({ success: true, remaining: DAILY_LIMIT - currentCount - 1 });
}
