import { NextResponse } from 'next/server';
import { getOrCreateConfig, getTodayStats } from '@/lib/playEarn/db';
import { requirePlayEarnContext } from '@/lib/playEarn/context';

export async function GET(request: Request) {
  const ctx = await requirePlayEarnContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, userId, guildId, server } = ctx;
  const config = await getOrCreateConfig(supabase, server.id);
  const stats = await getTodayStats(supabase, server.id, userId);

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('fish_token_balance, balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const papelConvertedToday = Number(stats?.papel_converted_today ?? 0);
  const remainingPapelCap = Math.max(0, config.daily_papel_cap - papelConvertedToday);

  return NextResponse.json({
    fishTokenBalance: Number(wallet?.fish_token_balance ?? 0),
    papelBalance: Number(wallet?.balance ?? 0),
    papelConvertedToday,
    remainingPapelCap,
    jetonPerPapel: config.jeton_per_papel,
    minConvertJeton: config.min_convert_jeton,
  });
}
