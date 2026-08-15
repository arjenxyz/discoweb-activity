import type { SupabaseClient } from '@supabase/supabase-js';

export type WelcomeMailVariant = 'first' | 'returning';

type WelcomeProfileRow = {
  activity_welcome_sent_at: string | null;
  verify_access_revoked_at: string | null;
};

const TITLE_FALLBACK: Record<WelcomeMailVariant, string> = {
  first: "DiscoWeb'e Hoş Geldiniz",
  returning: 'Tekrar Hoş Geldiniz',
};

const isMissingColumnError = (message: string | undefined) =>
  Boolean(
    message &&
      (/activity_welcome_sent_at|verify_access_revoked_at/i.test(message) ||
        /column .* does not exist/i.test(message) ||
        /schema cache/i.test(message)),
  );

function resolveVariant(row: WelcomeProfileRow): WelcomeMailVariant | null {
  const sentAt = row.activity_welcome_sent_at ? Date.parse(row.activity_welcome_sent_at) : NaN;
  const revokedAt = row.verify_access_revoked_at ? Date.parse(row.verify_access_revoked_at) : NaN;

  if (!Number.isFinite(sentAt)) return 'first';
  if (Number.isFinite(revokedAt) && sentAt < revokedAt) return 'returning';
  return null;
}

/** Mark that Activity access is currently blocked (verify role missing). */
export async function markActivityAccessRevoked(
  supabase: SupabaseClient,
  guildId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('member_profiles')
    .update({
      verify_access_revoked_at: now,
      updated_at: now,
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error && !isMissingColumnError(error.message)) {
    console.warn('[welcomeMail] mark revoked failed', error.message);
  }
}

/**
 * Send a welcome mailbox mail the first time this member becomes ready,
 * and again after the verify role was lost and later restored.
 */
export async function maybeSendActivityWelcome(
  supabase: SupabaseClient,
  params: {
    guildId: string;
    userId: string;
    guildName?: string | null;
  },
): Promise<void> {
  const { guildId, userId, guildName = null } = params;

  const { data: profile, error: profileError } = await supabase
    .from('member_profiles')
    .select('activity_welcome_sent_at, verify_access_revoked_at')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    if (!isMissingColumnError(profileError.message)) {
      console.warn('[welcomeMail] profile read failed', profileError.message);
    }
    return;
  }
  if (!profile) return;

  const variant = resolveVariant(profile as WelcomeProfileRow);
  if (!variant) return;

  const previousSentAt = (profile as WelcomeProfileRow).activity_welcome_sent_at;
  const now = new Date().toISOString();
  let claim = supabase
    .from('member_profiles')
    .update({
      activity_welcome_sent_at: now,
      updated_at: now,
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  claim = previousSentAt
    ? claim.eq('activity_welcome_sent_at', previousSentAt)
    : claim.is('activity_welcome_sent_at', null);

  const { data: claimed, error: claimError } = await claim.select('user_id').maybeSingle();
  if (claimError) {
    if (!isMissingColumnError(claimError.message)) {
      console.warn('[welcomeMail] claim failed', claimError.message);
    }
    return;
  }
  if (!claimed) return;

  const { data: userRow } = await supabase
    .from('users')
    .select('username')
    .eq('discord_id', userId)
    .maybeSingle();

  const username =
    typeof userRow?.username === 'string' && userRow.username.trim()
      ? userRow.username.trim()
      : null;

  const { error: insertError } = await supabase.from('system_mails').insert({
    guild_id: guildId,
    user_id: userId,
    title: TITLE_FALLBACK[variant],
    body:
      variant === 'first'
        ? 'Activity platformuna hoş geldiniz. Üye rolünüz doğrulandı; kazanç, mağaza ve bildirim hizmetleriniz açıktır.'
        : 'Üye rolünüz yenilendi. Activity platformuna erişiminiz yeniden açılmıştır.',
    category: 'system',
    status: 'published',
    author_name: 'DiscoWeb',
    created_at: now,
    metadata: {
      kind: 'activity_welcome',
      i18nKey: 'activity_welcome',
      variant,
      username,
      guildName: guildName || null,
      guild_name: guildName || null,
    },
  });

  if (insertError) {
    console.error('[welcomeMail] insert failed', insertError.message);
  }
}
