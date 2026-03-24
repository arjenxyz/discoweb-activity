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
        .select('id, event_type, type, severity, title, description, price_impact, created_at, expires_at')
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
      events: (eventsRes.data ?? []).map((ev: any) => ({
        ...ev,
        event_type: ev.event_type ?? ev.type ?? 'news',
      })),
      treasury: treasuryRes.data,
    });
  }

  // Tüm borsadaki sunucular — V2: activity_score ve Mari fiyatları
  const { data: listings } = await supabase
    .from('server_listings')
    .select('guild_id, status, market_price, ipo_price, total_lots, founder_lots, public_lots, listed_at, activity_score')
    .in('status', ['approved', 'suspended'])
    .order('market_price', { ascending: false });

  const guildIds = (listings ?? []).map((l) => l.guild_id);

  const botToken = process.env.DISCORD_BOT_TOKEN;

  // Paralel: cezalar + sunucu bilgileri (mari_rate dahil) + Discord ikonları
  const [penaltiesRes, serversRes, ...iconResults] = await Promise.all([
    guildIds.length > 0
      ? supabase.from('server_penalties').select('guild_id, type').in('guild_id', guildIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
    guildIds.length > 0
      ? supabase.from('servers').select('discord_id, name, daily_papel_cap, mari_rate_override').in('discord_id', guildIds)
      : Promise.resolve({ data: [] }),
    ...(botToken && guildIds.length > 0
      ? guildIds.map((id) =>
          fetch(`https://discord.com/api/guilds/${id}`, {
            headers: { Authorization: `Bot ${botToken}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { icon: string | null } | null) => ({
              guild_id: id,
              icon_url: d?.icon
                ? `https://cdn.discordapp.com/icons/${id}/${d.icon}.webp?size=64`
                : null,
            }))
            .catch(() => ({ guild_id: id, icon_url: null }))
        )
      : []),
  ]);

  const penaltyMap: Record<string, string[]> = {};
  for (const p of penaltiesRes.data ?? []) {
    penaltyMap[p.guild_id] = penaltyMap[p.guild_id] ?? [];
    penaltyMap[p.guild_id].push(p.type);
  }

  const serverMap: Record<string, { name: string; mari_rate: number }> = {};
  for (const s of (serversRes.data ?? []) as Array<{
    discord_id: string; name: string;
    daily_papel_cap: number; mari_rate_override: number | null;
  }>) {
    const mariRate = s.mari_rate_override ?? ((s.daily_papel_cap ?? 500) / 2);
    serverMap[s.discord_id] = { name: s.name ?? s.discord_id, mari_rate: mariRate };
  }

  const iconMap: Record<string, string | null> = {};
  for (const r of iconResults as Array<{ guild_id: string; icon_url: string | null }>) {
    iconMap[r.guild_id] = r.icon_url;
  }

  const result = (listings ?? []).map((l) => ({
    ...l,
    active_penalties: penaltyMap[l.guild_id] ?? [],
    has_warning: (penaltyMap[l.guild_id] ?? []).length > 0,
    name: serverMap[l.guild_id]?.name ?? l.guild_id,
    mari_rate: serverMap[l.guild_id]?.mari_rate ?? 1, // 1 MRI = X papel
    icon_url: iconMap[l.guild_id] ?? null,
  }));

  return NextResponse.json({ listings: result });
}
