export type ReferralErrorCode =
  | 'invalid_code'
  | 'code_not_found'
  | 'referrer_not_found'
  | 'cannot_use_own_code'
  | 'self_referral'
  | 'already_referred'
  | 'new_account'
  | 'ip_rate_limit'
  | 'inviter_daily_limit'
  | 'update_failed'
  | 'history_failed'
  | 'missing_referrer_id'
  | 'no_guild_specified'
  | 'internal_error';

export const REFERRAL_HTTP_STATUS: Record<ReferralErrorCode, number> = {
  invalid_code: 400,
  code_not_found: 404,
  referrer_not_found: 404,
  cannot_use_own_code: 400,
  self_referral: 400,
  already_referred: 400,
  new_account: 400,
  ip_rate_limit: 429,
  inviter_daily_limit: 429,
  update_failed: 500,
  history_failed: 500,
  missing_referrer_id: 400,
  no_guild_specified: 400,
  internal_error: 500,
};
