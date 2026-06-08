import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { bumpDailyStats, getOrCreateConfig, getTodayStats } from '@/lib/playEarn/db';
import { requirePlayEarnContext } from '@/lib/playEarn/context';
import { generateSpawnManifest } from '@/lib/playEarn/spawnGenerator';

export async function POST(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, userId, server } = ctx;
  const config = await getOrCreateConfig(supabase, server.id);
  if (!config.game_enabled) {
    return NextResponse.json({ error: 'game_disabled' }, { status: 403 });
  }

  const stats = await getTodayStats(supabase, server.id, userId);
  if ((stats?.sessions_count ?? 0) >= config.max_sessions_per_day) {
    return NextResponse.json({ error: 'daily_session_limit' }, { status: 429 });
  }

  const { data: lastSession } = await supabase
    .from('play_earn_sessions')
    .select('started_at, ended_at, status')
    .eq('server_id', server.id)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSession) {
    const ref = lastSession.ended_at ?? lastSession.started_at;
    const elapsedSec = (Date.now() - new Date(ref).getTime()) / 1000;
    if (lastSession.status === 'active') {
      return NextResponse.json({ error: 'session_already_active' }, { status: 409 });
    }
    if (elapsedSec < config.session_cooldown_sec) {
      return NextResponse.json(
        { error: 'cooldown', retryAfterSec: Math.ceil(config.session_cooldown_sec - elapsedSec) },
        { status: 429 },
      );
    }
  }

  const seed = crypto.randomBytes(16).toString('hex');
  const manifest = generateSpawnManifest(config, seed);

  const { data: session, error } = await supabase
    .from('play_earn_sessions')
    .insert({
      server_id: server.id,
      user_id: userId,
      status: 'active',
      difficulty_seed: seed,
      spawn_manifest: manifest,
      tokens_earned: 0,
      caught_spawn_ids: [],
    })
    .select('id, started_at')
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
  }

  await bumpDailyStats(supabase, server.id, userId, { sessions_count: 1 });

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.started_at,
    durationSec: config.session_duration_sec,
    manifest,
  });
}
