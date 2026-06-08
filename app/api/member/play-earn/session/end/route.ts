import { NextResponse } from 'next/server';
import { requirePlayEarnContext } from '@/lib/playEarn/context';

export async function POST(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, userId, guildId, server } = ctx;
  const body = (await request.json()) as { sessionId?: string };
  const sessionId = body.sessionId?.trim();
  if (!sessionId) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { data: session } = await supabase
    .from('play_earn_sessions')
    .select('id, status, tokens_earned, caught_spawn_ids')
    .eq('id', sessionId)
    .eq('server_id', server.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'invalid_session' }, { status: 404 });
  if (session.status === 'completed') {
    return NextResponse.json({
      tokensEarned: session.tokens_earned,
      catches: (session.caught_spawn_ids ?? []).length,
    });
  }

  await supabase
    .from('play_earn_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('fish_token_balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({
    tokensEarned: session.tokens_earned,
    catches: (session.caught_spawn_ids ?? []).length,
    fishTokenBalance: Number(wallet?.fish_token_balance ?? 0),
  });
}
