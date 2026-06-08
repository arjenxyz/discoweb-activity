import { NextResponse } from 'next/server';
import { requirePlayEarnContext } from '@/lib/playEarn/context';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { validateCatch } from '@/lib/playEarn/validateCatch';

export async function POST(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, userId, guildId, server } = ctx;
  const body = (await request.json()) as { sessionId?: string; spawnId?: string; elapsedMs?: number };
  const sessionId = body.sessionId?.trim();
  const spawnId = body.spawnId?.trim();
  const elapsedMs = Number(body.elapsedMs);

  if (!sessionId || !spawnId || !Number.isFinite(elapsedMs)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('play_earn_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('server_id', server.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
  }

  const manifest = (session.spawn_manifest ?? []) as SpawnEntry[];
  const caughtIds = (session.caught_spawn_ids ?? []) as string[];
  const validation = validateCatch(
    manifest,
    caughtIds,
    spawnId,
    elapsedMs,
    session.last_catch_at ? new Date(session.last_catch_at) : null,
  );

  if (!validation.ok) {
    return NextResponse.json({ ok: false, reason: validation.reason }, { status: 400 });
  }

  const tokens = validation.entry.tokenValue;
  const nextCaught = [...caughtIds, spawnId];
  const nextTokens = Number(session.tokens_earned ?? 0) + tokens;

  await supabase
    .from('play_earn_sessions')
    .update({
      caught_spawn_ids: nextCaught,
      tokens_earned: nextTokens,
      last_catch_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  await supabase.from('play_earn_catches').insert({
    session_id: sessionId,
    spawn_id: spawnId,
    fish_type: validation.entry.fishType,
    tokens,
    client_elapsed_ms: Math.round(elapsedMs),
  });

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('fish_token_balance, balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentJeton = Number(wallet?.fish_token_balance ?? 0);
  const currentPapel = Number(wallet?.balance ?? 0);
  await supabase.from('member_wallets').upsert(
    {
      guild_id: guildId,
      user_id: userId,
      balance: currentPapel,
      fish_token_balance: currentJeton + tokens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  return NextResponse.json({
    ok: true,
    tokens,
    sessionTokens: nextTokens,
    fishTokenBalance: currentJeton + tokens,
  });
}
