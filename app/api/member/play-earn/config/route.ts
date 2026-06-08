import { NextResponse } from 'next/server';
import { getOrCreateConfig } from '@/lib/playEarn/db';
import { requirePlayEarnContext } from '@/lib/playEarn/context';
import { FISH_TYPES } from '@/lib/playEarn/types';

export async function GET(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const config = await getOrCreateConfig(ctx.supabase, ctx.server.id);

  return NextResponse.json({
    gameEnabled: config.game_enabled,
    sessionDurationSec: config.session_duration_sec,
    sessionCooldownSec: config.session_cooldown_sec,
    maxSessionsPerDay: config.max_sessions_per_day,
    jetonPerPapel: config.jeton_per_papel,
    dailyPapelCap: config.daily_papel_cap,
    minConvertJeton: config.min_convert_jeton,
    fishTypes: FISH_TYPES,
  });
}
