import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) {
      return session.response;
    }
    const userId = session.userId;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    // Reject very new accounts to prevent fake / throwaway referrals.
    // Snowflake timestamp: (id >> 22) + 1420070400000
    const accountCreationMs = Number((BigInt(userId) >> BigInt(22)) + BigInt('1420070400000'));
    const ageMs = Date.now() - accountCreationMs;
    const minAgeMs = Number(process.env.REFERRAL_MIN_ACCOUNT_AGE_MS ?? 1000 * 60 * 60 * 24 * 3); // 3 days default
    if (ageMs < minAgeMs) {
      return NextResponse.json({ error: 'new_account' }, { status: 400 });
    }

    // Ensure user has not already been referred
    const { data: currentProfile } = await supabase
      .from('member_profiles')
      .select('referred_by')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (currentProfile?.referred_by) {
      return NextResponse.json({ error: 'already_referred' }, { status: 400 });
    }

    // Find the owner of the referral code
    const { data: ownerProfile } = await supabase
      .from('member_profiles')
      .select('user_id, total_invites')
      .eq('guild_id', selectedGuildId)
      .eq('referral_code', code)
      .maybeSingle();

    if (!ownerProfile || !ownerProfile.user_id) {
      return NextResponse.json({ error: 'code_not_found' }, { status: 404 });
    }

    if (ownerProfile.user_id === userId) {
      return NextResponse.json({ error: 'cannot_use_own_code' }, { status: 400 });
    }

    // Mark this user as referred, and create a history row.
    const now = new Date().toISOString();

    const { error: updateProfileError } = await supabase
      .from('member_profiles')
      .update({ referred_by: ownerProfile.user_id, updated_at: now })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId);

    if (updateProfileError) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    const { error: insertHistoryError } = await supabase.from('referral_history').insert({
      inviter_id: ownerProfile.user_id,
      invitee_id: userId,
      guild_id: selectedGuildId,
      status: 'accepted',
      created_at: now,
      status_changed_at: now,
    });

    if (insertHistoryError) {
      return NextResponse.json({ error: 'history_failed' }, { status: 500 });
    }

    const reward = 500;

    // Increment inviter's total_invites and credit both wallets.
    const { error: incrementError } = await supabase
      .from('member_profiles')
      .update({ total_invites: (ownerProfile.total_invites ?? 0) + 1 })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', ownerProfile.user_id);

    if (incrementError) {
      return NextResponse.json({ error: 'increment_failed' }, { status: 500 });
    }

    const ensureWallet = async (uid: string) => {
      const { data: wallet } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', uid)
        .maybeSingle();

      if (!wallet) {
        await supabase.from('member_wallets').insert({
          guild_id: selectedGuildId,
          user_id: uid,
          balance: reward,
        });
      } else {
        await supabase
          .from('member_wallets')
          .update({ balance: (wallet.balance ?? 0) + reward })
          .eq('guild_id', selectedGuildId)
          .eq('user_id', uid);
      }
    };

    await ensureWallet(userId);
    await ensureWallet(ownerProfile.user_id);

    return NextResponse.json({ success: true, reward });
  } catch (err) {
    console.error('referral route error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
