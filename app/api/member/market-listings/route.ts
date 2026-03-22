/**
 * GET /api/member/market-listings — Borsadaki tüm sunucular (herkese açık)
 * ?guild_id=<id> ile tek sunucu detayı da alınabilir
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

  if (guildId) {
    // Tek sunucu detayı
    const [listingRes, penaltiesRes, eventsRes, treasuryRes] = await Promise.all([
      supabase
        .from('server_listings')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle(),

      supabase
        .from('server_penalties')
        .select('id, type, reason, price_multiplier, issued_at')
        .eq('guild_id', guildId)
        .eq('is_active', true),

      supabase
        .from('market_events')
        .select('id, type, severity, title, description, price_impact, created_at, expires_at')
        .eq('guild_id', guildId)
        .eq('is_active', true),

      supabase
        .from('server_treasury')
        .select('balance, total_collected, total_burned, total_dividends_paid')
        .eq('guild_id', guildId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      listing: listingRes.data,
      penalties: penaltiesRes.data ?? [],
      events: eventsRes.data ?? [],
      treasury: treasuryRes.data,
    });
  }

  // Tüm borsadaki sunucular
  const { data: listings } = await supabase
    .from('server_listings')
    .select('guild_id, status, market_price, ipo_price, total_lots, founder_lots, public_lots, listed_at, circuit_breaker_until')
    .in('status', ['approved', 'suspended'])
    .order('market_price', { ascending: false });

  // Her listing için aktif ceza sayısını çek
  const guildIds = (listings ?? []).map((l) => l.guild_id);
  const { data: penalties } = guildIds.length > 0
    ? await supabase
        .from('server_penalties')
        .select('guild_id, type')
        .in('guild_id', guildIds)
        .eq('is_active', true)
    : { data: [] };

  const penaltyMap: Record<string, string[]> = {};
  for (const p of penalties ?? []) {
    penaltyMap[p.guild_id] = penaltyMap[p.guild_id] ?? [];
    penaltyMap[p.guild_id].push(p.type);
  }

  const result = (listings ?? []).map((l) => ({
    ...l,
    active_penalties: penaltyMap[l.guild_id] ?? [],
    has_warning: (penaltyMap[l.guild_id] ?? []).length > 0,
  }));

  return NextResponse.json({ listings: result });
}
