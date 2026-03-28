import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { getSelectedGuildId } from '@/lib/guild';

export async function POST(request: NextRequest) {
  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  let body: { raffle_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { raffle_id } = body;
  if (!raffle_id) {
    return NextResponse.json({ error: 'raffle_id_required' }, { status: 400 });
  }

  // Fetch raffle — must belong to same guild and be active
  const { data: raffle, error: raffleErr } = await supabase
    .from('raffles')
    .select('id,guild_id,min_tag_days,is_active,end_date,eligibility_type,required_badge_tier_id')
    .eq('id', raffle_id)
    .eq('guild_id', selectedGuildId)
    .single();

  if (raffleErr || !raffle) {
    return NextResponse.json({ error: 'raffle_not_found' }, { status: 404 });
  }

  if (!raffle.is_active) {
    return NextResponse.json({ error: 'raffle_not_active' }, { status: 400 });
  }

  if (raffle.end_date && new Date(raffle.end_date) < new Date()) {
    return NextResponse.json({ error: 'raffle_ended' }, { status: 400 });
  }

  const eligibilityType: string = raffle.eligibility_type ?? 'tag';

  // Fetch profile once for eligibility checks
  const { data: profile } = await supabase
    .from('member_profiles')
    .select('has_tag,tag_granted_at,is_booster,current_badge_tier_id')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .single();

  const tagGrantedAt = profile?.tag_granted_at ?? null;
  const hasTag = profile?.has_tag === true || Boolean(tagGrantedAt);
  let tagDays = 0;
  if (hasTag && tagGrantedAt) {
    tagDays = Math.floor((Date.now() - new Date(tagGrantedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  if (eligibilityType === 'booster') {
    if (!profile?.is_booster) {
      return NextResponse.json({ error: 'not_eligible', reason: 'booster_required' }, { status: 403 });
    }
  } else if (eligibilityType === 'tag') {
    if (tagDays < raffle.min_tag_days) {
      return NextResponse.json(
        { error: 'not_eligible', required: raffle.min_tag_days, current: tagDays, remaining: raffle.min_tag_days - tagDays },
        { status: 403 },
      );
    }
    // Optional: specific badge tier requirement
    if (raffle.required_badge_tier_id) {
      const { data: tiers } = await supabase
        .from('badge_tiers')
        .select('days_required')
        .eq('id', raffle.required_badge_tier_id)
        .maybeSingle();
      if (tiers && tagDays < tiers.days_required) {
        return NextResponse.json(
          { error: 'not_eligible', reason: 'badge_tier_required', required_days: tiers.days_required, current: tagDays },
          { status: 403 },
        );
      }
    }
  }
  // eligibilityType === 'everyone': no additional check needed

  // Insert entry (unique constraint prevents double-entry)
  const { error: insertErr } = await supabase.from('raffle_entries').insert({
    raffle_id,
    guild_id: selectedGuildId,
    user_id: userId,
    tag_days_at_entry: tagDays,
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'already_joined' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, tag_days: tagDays });
}
