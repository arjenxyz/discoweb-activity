import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance } from '@/lib/maintenance';

export async function GET(request: NextRequest) {
  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });
  }

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [{ data: tiers }, { data: profile }, { data: raffles }] = await Promise.all([
    supabase
      .from('badge_tiers')
      .select('id,name,emoji,days_required,color,description,sort_order,reward_papel,reward_earn_multiplier,reward_message,role_id,background_image')
      .eq('guild_id', selectedGuildId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('member_profiles')
      .select('has_tag,tag_granted_at,created_at')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('raffles')
      .select('id,title,description,prizes,start_date,end_date,min_tag_days,winner_count,prize_type,prize_papel_amount,prize_role_id,drawn_at')
      .eq('guild_id', selectedGuildId)
      .eq('is_active', true)
      .is('drawn_at', null)
      .or('end_date.is.null,end_date.gt.' + new Date().toISOString()),
  ]);

  // Same fallback as overview: treat tag as active if tag_granted_at is set, even if has_tag flag lags behind
  const tagGrantedAt = profile?.tag_granted_at ?? null;
  const hasTag = profile?.has_tag === true || Boolean(tagGrantedAt);

  let tagDays = 0;
  if (hasTag && tagGrantedAt) {
    const grantedDate = new Date(tagGrantedAt);
    const now = new Date();
    tagDays = Math.floor((now.getTime() - grantedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const sortedTiers = (tiers ?? []) as Array<{
    id: string; name: string; emoji: string | null; days_required: number;
    color: string | null; description: string | null; sort_order: number;
    reward_papel: number | null; reward_earn_multiplier: number | null; reward_message: string | null;
    role_id: string | null; background_image: string | null;
  }>;
  const currentBadge = [...sortedTiers].reverse().find((t) => t.days_required <= tagDays) ?? null;
  const nextBadge = sortedTiers.find((t) => t.days_required > tagDays) ?? null;
  const daysToNext = nextBadge ? nextBadge.days_required - tagDays : null;

  // Determine earn multiplier from current badge (default 1.0)
  const earnMultiplier = currentBadge?.reward_earn_multiplier ?? 1.0;

  // Trigger one-time rewards (papel + role) for newly unlocked tiers
  const unlockedTiers = sortedTiers.filter(
    (t) => t.days_required <= tagDays && ((t.reward_papel ?? 0) > 0 || t.role_id),
  );
  if (unlockedTiers.length > 0 && hasTag) {
    // Fetch already-rewarded tiers for this user/guild
    const { data: existingRewards } = await supabase
      .from('member_badge_rewards')
      .select('badge_tier_id')
      .eq('user_id', userId)
      .eq('guild_id', selectedGuildId);
    const rewardedTierIds = new Set((existingRewards ?? []).map((r: { badge_tier_id: string }) => r.badge_tier_id));

    for (const tier of unlockedTiers) {
      if (rewardedTierIds.has(tier.id)) continue;
      // Idempotent insert (UNIQUE constraint prevents duplicates)
      const { error: insertErr } = await supabase
        .from('member_badge_rewards')
        .insert({ user_id: userId, guild_id: selectedGuildId, badge_tier_id: tier.id, papel_given: tier.reward_papel });
      if (!insertErr && (tier.reward_papel ?? 0) > 0) {
        // Credit wallet: fetch current balance, upsert new balance, write ledger
        try {
          const { data: walletRow } = await supabase
            .from('member_wallets')
            .select('balance')
            .eq('guild_id', selectedGuildId)
            .eq('user_id', userId)
            .maybeSingle();
          const currentBalance = Number((walletRow as any)?.balance ?? 0);
          const newBalance = Number((currentBalance + (tier.reward_papel ?? 0)).toFixed(2));
          await (supabase.from('member_wallets') as any).upsert(
            { guild_id: selectedGuildId, user_id: userId, balance: newBalance, updated_at: new Date().toISOString() },
            { onConflict: 'guild_id,user_id' },
          );
          await (supabase.from('wallet_ledger') as any).insert({
            guild_id: selectedGuildId,
            user_id: userId,
            amount: tier.reward_papel,
            type: 'badge_reward',
            balance_after: newBalance,
            metadata: { source: 'badge_tier', badge_tier_id: tier.id, badge_name: tier.name },
          });
        } catch {
          // wallet credit is best-effort — reward row already inserted to prevent re-trigger
        }
      }

      // Assign Discord role if configured
      if (!insertErr && tier.role_id) {
        try {
          const botToken = process.env.DISCORD_BOT_TOKEN;
          if (botToken) {
            await fetch(
              `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${tier.role_id}`,
              { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } },
            );
          }
        } catch {
          // role assignment is best-effort
        }
      }
    }
  }

  // Update current_badge_tier_id on member_profiles
  if (currentBadge) {
    await supabase
      .from('member_profiles')
      .update({ current_badge_tier_id: currentBadge.id })
      .eq('user_id', userId)
      .eq('guild_id', selectedGuildId);
  }

  const activeRaffles = raffles ?? [];
  const eligibleRaffles = activeRaffles
    .filter((r) => tagDays >= r.min_tag_days)
    .map((r) => r.id);

  // Katılım sayıları ve kullanıcının katıldığı çekilişler
  let joinedRaffles: string[] = [];
  const entryCounts: Record<string, number> = {};
  if (activeRaffles.length > 0) {
    const raffleIds = activeRaffles.map((r: { id: string }) => r.id);
    const [{ data: entries }, { data: allEntries }] = await Promise.all([
      supabase
        .from('raffle_entries')
        .select('raffle_id')
        .eq('user_id', userId)
        .in('raffle_id', raffleIds),
      supabase
        .from('raffle_entries')
        .select('raffle_id')
        .in('raffle_id', raffleIds),
    ]);
    joinedRaffles = (entries ?? []).map((e: { raffle_id: string }) => e.raffle_id);
    for (const e of allEntries ?? []) {
      entryCounts[e.raffle_id] = (entryCounts[e.raffle_id] ?? 0) + 1;
    }
  }

  const activeRafflesWithCount = activeRaffles.map((r: any) => ({
    ...r,
    entry_count: entryCounts[r.id] ?? 0,
  }));

  return NextResponse.json({
    currentBadge,
    nextBadge,
    tagDays,
    daysToNext,
    hasTag,
    earnMultiplier,
    allTiers: sortedTiers,
    activeRaffles: activeRafflesWithCount,
    eligibleRaffles,
    joinedRaffles,
  });
}
