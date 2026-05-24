import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_REFERRAL_REWARD,
  MAX_DAILY_INVITES_PER_INVITER,
  MAX_DAILY_PER_IP,
  REFERRAL_CODE_LENGTH,
  REFERRAL_MILESTONE_REWARDS,
  REFERRAL_MIN_ACCOUNT_AGE_MS,
} from './constants';
import type { ReferralErrorCode } from './errors';

export type ApplyReferralSuccess = {
  ok: true;
  reward: number;
  inviter_id: string;
  milestone_reached: number | null;
  milestone_bonus: number;
};

export type ApplyReferralFailure = {
  ok: false;
  error: ReferralErrorCode;
};

export type ApplyReferralResult = ApplyReferralSuccess | ApplyReferralFailure;

function discordAccountAgeOk(userId: string): boolean {
  const accountCreationMs = Number((BigInt(userId) >> BigInt(22)) + BigInt('1420070400000'));
  return Date.now() - accountCreationMs >= REFERRAL_MIN_ACCOUNT_AGE_MS;
}

async function getReferralReward(supabase: SupabaseClient, guildId: string): Promise<number> {
  const { data } = await supabase
    .from('servers')
    .select('referral_reward')
    .eq('discord_id', guildId)
    .maybeSingle();
  return Math.max(0, Number(data?.referral_reward ?? DEFAULT_REFERRAL_REWARD));
}

async function ensureInviteeProfile(
  supabase: SupabaseClient,
  guildId: string,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('member_profiles')
    .select('user_id')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return;

  await supabase.from('member_profiles').insert({
    guild_id: guildId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function checkIpDailyLimit(
  supabase: SupabaseClient,
  guildId: string,
  clientIp: string | null,
): Promise<boolean> {
  if (!clientIp) return true;
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from('referral_history')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('invitee_ip', clientIp)
    .gte('created_at', oneDayAgo);
  return (count ?? 0) < MAX_DAILY_PER_IP;
}

async function checkInviterDailyLimit(
  supabase: SupabaseClient,
  guildId: string,
  inviterId: string,
): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from('referral_history')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('inviter_id', inviterId)
    .gte('created_at', oneDayAgo);
  return (count ?? 0) < MAX_DAILY_INVITES_PER_INVITER;
}

async function processMilestone(
  supabase: SupabaseClient,
  guildId: string,
  inviterId: string,
  newInviteCount: number,
  now: string,
): Promise<{ milestone_reached: number | null; milestone_bonus: number }> {
  const bonus = REFERRAL_MILESTONE_REWARDS[newInviteCount];
  if (bonus === undefined) {
    return { milestone_reached: null, milestone_bonus: 0 };
  }

  const { error: claimError } = await supabase.from('referral_milestone_claims').insert({
    guild_id: guildId,
    user_id: inviterId,
    milestone: newInviteCount,
    bonus,
    claimed_at: now,
  });

  if (claimError) {
    return { milestone_reached: null, milestone_bonus: 0 };
  }

  await supabase.rpc('add_to_wallet', {
    p_guild_id: guildId,
    p_user_id: inviterId,
    p_amount: bonus,
  });

  void Promise.resolve(
    supabase.from('wallet_ledger').insert({
      guild_id: guildId,
      user_id: inviterId,
      amount: bonus,
      type: 'referral_milestone',
      description: `Referral milestone: ${newInviteCount} davet`,
      created_at: now,
    }),
  ).catch(() => {});

  return { milestone_reached: newInviteCount, milestone_bonus: bonus };
}

async function applyReferralCore(
  supabase: SupabaseClient,
  params: {
    guildId: string;
    inviteeUserId: string;
    inviterUserId: string;
    clientIp?: string | null;
  },
): Promise<ApplyReferralResult> {
  const { guildId, inviteeUserId, inviterUserId, clientIp = null } = params;

  if (inviterUserId === inviteeUserId) {
    return { ok: false, error: 'self_referral' };
  }

  if (!discordAccountAgeOk(inviteeUserId)) {
    return { ok: false, error: 'new_account' };
  }

  if (!(await checkIpDailyLimit(supabase, guildId, clientIp))) {
    return { ok: false, error: 'ip_rate_limit' };
  }

  const { data: inviterProfile } = await supabase
    .from('member_profiles')
    .select('user_id, total_invites')
    .eq('guild_id', guildId)
    .eq('user_id', inviterUserId)
    .maybeSingle();

  if (!inviterProfile?.user_id) {
    return { ok: false, error: 'referrer_not_found' };
  }

  if (!(await checkInviterDailyLimit(supabase, guildId, inviterUserId))) {
    return { ok: false, error: 'inviter_daily_limit' };
  }

  await ensureInviteeProfile(supabase, guildId, inviteeUserId);

  const now = new Date().toISOString();

  const { data: updatedRows, error: updateProfileError } = await supabase
    .from('member_profiles')
    .update({ referred_by: inviterUserId, updated_at: now })
    .eq('guild_id', guildId)
    .eq('user_id', inviteeUserId)
    .is('referred_by', null)
    .select('user_id');

  if (updateProfileError) {
    return { ok: false, error: 'update_failed' };
  }
  if (!updatedRows?.length) {
    return { ok: false, error: 'already_referred' };
  }

  const { error: historyError } = await supabase.from('referral_history').insert({
    inviter_id: inviterUserId,
    invitee_id: inviteeUserId,
    guild_id: guildId,
    status: 'accepted',
    created_at: now,
    status_changed_at: now,
    invitee_ip: clientIp,
  });

  if (historyError) {
    console.error('[referral] history insert failed', historyError);
    await supabase
      .from('member_profiles')
      .update({ referred_by: null, updated_at: now })
      .eq('guild_id', guildId)
      .eq('user_id', inviteeUserId)
      .eq('referred_by', inviterUserId);
    return { ok: false, error: 'history_failed' };
  }

  const reward = await getReferralReward(supabase, guildId);

  const { data: newCountRow } = await supabase.rpc('increment_total_invites', {
    p_guild_id: guildId,
    p_user_id: inviterUserId,
  });
  const newInviteCount = Number(newCountRow ?? (inviterProfile.total_invites ?? 0) + 1);

  if (reward > 0) {
    await supabase.rpc('add_to_wallet', { p_guild_id: guildId, p_user_id: inviteeUserId, p_amount: reward });
    await supabase.rpc('add_to_wallet', { p_guild_id: guildId, p_user_id: inviterUserId, p_amount: reward });

    for (const uid of [inviteeUserId, inviterUserId]) {
      void Promise.resolve(
        supabase.from('wallet_ledger').insert({
          guild_id: guildId,
          user_id: uid,
          amount: reward,
          type: 'referral_reward',
          description: 'Referral davet ödülü',
          created_at: now,
        }),
      ).catch(() => {});
    }
  }

  const { milestone_reached, milestone_bonus } = await processMilestone(
    supabase,
    guildId,
    inviterUserId,
    newInviteCount,
    now,
  );

  return {
    ok: true,
    reward,
    inviter_id: inviterUserId,
    milestone_reached,
    milestone_bonus,
  };
}

/** 6 haneli referral kodu ile davet uygula. */
export async function applyReferralByCode(
  supabase: SupabaseClient,
  params: {
    guildId: string;
    inviteeUserId: string;
    code: string;
    clientIp?: string | null;
  },
): Promise<ApplyReferralResult> {
  const code = params.code.trim().toUpperCase();
  if (!code || code.length !== REFERRAL_CODE_LENGTH) {
    return { ok: false, error: 'invalid_code' };
  }

  const { data: ownerProfile } = await supabase
    .from('member_profiles')
    .select('user_id')
    .eq('guild_id', params.guildId)
    .eq('referral_code', code)
    .maybeSingle();

  if (!ownerProfile?.user_id) {
    return { ok: false, error: 'code_not_found' };
  }

  if (ownerProfile.user_id === params.inviteeUserId) {
    return { ok: false, error: 'cannot_use_own_code' };
  }

  return applyReferralCore(supabase, {
    guildId: params.guildId,
    inviteeUserId: params.inviteeUserId,
    inviterUserId: ownerProfile.user_id,
    clientIp: params.clientIp,
  });
}

/** Discord SDK referrerId ile davet uygula. */
export async function applyReferralByInviterId(
  supabase: SupabaseClient,
  params: {
    guildId: string;
    inviteeUserId: string;
    inviterUserId: string;
    clientIp?: string | null;
  },
): Promise<ApplyReferralResult> {
  const inviterId = params.inviterUserId.trim();
  if (!inviterId) {
    return { ok: false, error: 'missing_referrer_id' };
  }

  return applyReferralCore(supabase, {
    guildId: params.guildId,
    inviteeUserId: params.inviteeUserId,
    inviterUserId: inviterId,
    clientIp: params.clientIp,
  });
}
