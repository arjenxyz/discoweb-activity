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
      .select('id,name,emoji,days_required,color,description,sort_order')
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

  const hasTag = profile?.has_tag ?? false;
  // Fallback: if tag_granted_at is null but has_tag is true, use profile created_at
  const tagGrantedAt = profile?.tag_granted_at ?? (hasTag ? profile?.created_at : null) ?? null;

  let tagDays = 0;
  if (hasTag && tagGrantedAt) {
    const grantedDate = new Date(tagGrantedAt);
    const now = new Date();
    tagDays = Math.floor((now.getTime() - grantedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const sortedTiers = tiers ?? [];
  const currentBadge = [...sortedTiers].reverse().find((t) => t.days_required <= tagDays) ?? null;
  const nextBadge = sortedTiers.find((t) => t.days_required > tagDays) ?? null;
  const daysToNext = nextBadge ? nextBadge.days_required - tagDays : null;

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
    activeRaffles: activeRafflesWithCount,
    eligibleRaffles,
    joinedRaffles,
  });
}
