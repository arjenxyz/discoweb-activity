/**
 * POST /api/member/referral-by-user
 *
 * Handles Discord SDK referrerId-based referrals.
 * When a user clicks a shared Activity link, Discord passes the sharer's
 * Discord user ID as `sdk.referrerId`. This endpoint looks up the referrer's
 * referral_code from their profile and applies the referral.
 *
 * Body: { referrer_discord_id: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const referrerDiscordId = String(body.referrer_discord_id ?? '').trim();
    if (!referrerDiscordId) {
      return NextResponse.json({ error: 'missing_referrer_id' }, { status: 400 });
    }

    // Prevent self-referral
    if (referrerDiscordId === userId) {
      return NextResponse.json({ error: 'self_referral' }, { status: 400 });
    }

    // Age check
    const accountCreationMs = Number((BigInt(userId) >> BigInt(22)) + BigInt('1420070400000'));
    const minAgeMs = Number(process.env.REFERRAL_MIN_ACCOUNT_AGE_MS ?? 1000 * 60 * 60 * 24 * 3);
    if (Date.now() - accountCreationMs < minAgeMs) {
      return NextResponse.json({ error: 'new_account' }, { status: 400 });
    }

    // Check current user hasn't been referred yet
    const { data: currentProfile } = await supabase
      .from('member_profiles')
      .select('referred_by')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (currentProfile?.referred_by) {
      return NextResponse.json({ error: 'already_referred' }, { status: 400 });
    }

    // Find the referrer's profile in this guild
    const { data: referrerProfile } = await supabase
      .from('member_profiles')
      .select('user_id, total_invites')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', referrerDiscordId)
      .maybeSingle();

    if (!referrerProfile) {
      return NextResponse.json({ error: 'referrer_not_found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const reward = 500;

    await supabase
      .from('member_profiles')
      .update({ referred_by: referrerDiscordId, updated_at: now })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId);

    await supabase.from('referral_history').insert({
      inviter_id: referrerDiscordId,
      invitee_id: userId,
      guild_id: selectedGuildId,
      status: 'accepted',
      created_at: now,
      status_changed_at: now,
    });

    await supabase
      .from('member_profiles')
      .update({ total_invites: (referrerProfile.total_invites ?? 0) + 1 })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', referrerDiscordId);

    // Credit both wallets
    for (const uid of [userId, referrerDiscordId]) {
      const { data: wallet } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', uid)
        .maybeSingle();

      if (!wallet) {
        await supabase.from('member_wallets').insert({ guild_id: selectedGuildId, user_id: uid, balance: reward });
      } else {
        await supabase
          .from('member_wallets')
          .update({ balance: (wallet.balance ?? 0) + reward })
          .eq('guild_id', selectedGuildId)
          .eq('user_id', uid);
      }
    }

    return NextResponse.json({ success: true, reward });
  } catch (err) {
    console.error('[referral-by-user]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
