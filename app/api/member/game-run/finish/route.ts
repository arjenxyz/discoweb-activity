import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { checkMaintenance } from '@/lib/maintenance';

type Payload = {
  runId?: string;
  score?: number;
  durationMs?: number;
  obstaclesPassed?: number;
};

const SCORE_TO_PAPEL = 50;
const MAX_PAPEL_PER_RUN = 250;

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const payload = (await request.json().catch(() => ({}))) as Payload;
  const runId = payload.runId?.trim();
  const score = Math.floor(Number(payload.score ?? 0));
  const durationMs = Math.floor(Number(payload.durationMs ?? 0));
  const obstaclesPassed = Math.floor(Number(payload.obstaclesPassed ?? 0));

  if (!runId || !Number.isFinite(score) || !Number.isFinite(durationMs) || score < 0 || durationMs <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server?.id) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: run } = await supabase
    .from('game_runs')
    .select('id,status,started_at')
    .eq('id', runId)
    .eq('guild_id', server.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ error: 'run_not_found' }, { status: 404 });
  }
  if (run.status !== 'started') {
    return NextResponse.json({ error: 'run_already_finished' }, { status: 409 });
  }

  const maxAllowedScore = Math.max(300, Math.floor((durationMs / 1000) * 220));
  if (score > maxAllowedScore || durationMs < 3000 || durationMs > 30 * 60 * 1000) {
    await supabase.from('game_runs').update({
      status: 'rejected',
      finished_at: new Date().toISOString(),
      score,
      duration_ms: durationMs,
      obstacles_passed: Math.max(0, obstaclesPassed),
      metadata: { reason: 'anti_cheat' },
    }).eq('id', runId);
    return NextResponse.json({ error: 'score_rejected' }, { status: 400 });
  }

  const awardedPapel = Math.min(MAX_PAPEL_PER_RUN, Math.floor(score / SCORE_TO_PAPEL));

  const { data: walletRow } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', server.id)
    .eq('user_id', userId)
    .maybeSingle();

  const currentBalance = Number(walletRow?.balance ?? 0);
  const newBalance = Number((currentBalance + awardedPapel).toFixed(2));

  const { error: walletErr } = await supabase.from('member_wallets').upsert({
    guild_id: server.id,
    user_id: userId,
    balance: newBalance,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'guild_id,user_id' });

  if (walletErr) {
    return NextResponse.json({ error: 'wallet_update_failed' }, { status: 500 });
  }

  if (awardedPapel > 0) {
    await supabase.from('wallet_ledger').insert({
      guild_id: server.id,
      user_id: userId,
      amount: awardedPapel,
      type: 'promotion',
      balance_after: newBalance,
      metadata: {
        source: 'play_earn',
        run_id: runId,
        score,
        duration_ms: durationMs,
      },
    });
  }

  await supabase.from('game_runs').update({
    status: 'finished',
    finished_at: new Date().toISOString(),
    score,
    duration_ms: durationMs,
    obstacles_passed: Math.max(0, obstaclesPassed),
    awarded_papel: awardedPapel,
  }).eq('id', runId);

  return NextResponse.json({
    ok: true,
    awardedPapel,
    score,
    balance: newBalance,
  });
}
