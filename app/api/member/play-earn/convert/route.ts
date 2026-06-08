import { NextResponse } from 'next/server';
import { bumpDailyStats, getOrCreateConfig, getTodayStats } from '@/lib/playEarn/db';
import { requirePlayEarnContext } from '@/lib/playEarn/context';

export async function POST(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, userId, guildId, server } = ctx;
  const body = (await request.json()) as { amountJeton?: number };
  const amountJeton = Math.floor(Number(body.amountJeton));
  if (!Number.isFinite(amountJeton) || amountJeton <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  const config = await getOrCreateConfig(supabase, server.id);
  if (amountJeton < config.min_convert_jeton) {
    return NextResponse.json({ error: 'below_minimum', min: config.min_convert_jeton }, { status: 400 });
  }

  const papelToAdd = Math.floor(amountJeton / config.jeton_per_papel);
  if (papelToAdd <= 0) {
    return NextResponse.json({ error: 'amount_too_small_for_papel' }, { status: 400 });
  }

  const stats = await getTodayStats(supabase, server.id, userId);
  const convertedToday = Number(stats?.papel_converted_today ?? 0);
  if (convertedToday + papelToAdd > config.daily_papel_cap) {
    return NextResponse.json(
      { error: 'daily_papel_cap', remaining: Math.max(0, config.daily_papel_cap - convertedToday) },
      { status: 429 },
    );
  }

  const jetonSpent = papelToAdd * config.jeton_per_papel;

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance, fish_token_balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentJeton = Number(wallet?.fish_token_balance ?? 0);
  const currentPapel = Number(wallet?.balance ?? 0);

  if (currentJeton < jetonSpent) {
    return NextResponse.json({ error: 'insufficient_jeton' }, { status: 400 });
  }

  const nextJeton = currentJeton - jetonSpent;
  const nextPapel = Number((currentPapel + papelToAdd).toFixed(2));

  await supabase.from('member_wallets').upsert(
    {
      guild_id: guildId,
      user_id: userId,
      balance: nextPapel,
      fish_token_balance: nextJeton,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  await supabase.from('wallet_ledger').insert({
    guild_id: guildId,
    user_id: userId,
    amount: papelToAdd,
    type: 'play_earn_convert',
    balance_after: nextPapel,
    metadata: { jeton_spent: jetonSpent, jeton_per_papel: config.jeton_per_papel },
  });

  await bumpDailyStats(supabase, server.id, userId, { papel_converted_today: papelToAdd });

  return NextResponse.json({
    papelAdded: papelToAdd,
    jetonSpent,
    fishTokenBalance: nextJeton,
    papelBalance: nextPapel,
  });
}
