/** Davet milestone bonusları (davet eden kişiye, tek seferlik). */
export const REFERRAL_MILESTONE_REWARDS: Record<number, number> = {
  5: 500,
  10: 1500,
  20: 3000,
  50: 10000,
  100: 25000,
};

export const REFERRAL_MILESTONES = [5, 10, 20, 50, 100] as const;

/** Davet kodu uzunluğu (member_profiles.referral_code). */
export const REFERRAL_CODE_LENGTH = 6;

/** Bir davetçinin günde kabul edebileceği maksimum referral. */
export const MAX_DAILY_INVITES_PER_INVITER = Number(process.env.REFERRAL_MAX_DAILY ?? 20);

/** Aynı IP'den günde kabul edilebilecek maksimum referral. */
export const MAX_DAILY_PER_IP = Number(process.env.REFERRAL_MAX_DAILY_IP ?? 5);

/** Discord hesap minimum yaşı (ms). Varsayılan: 3 gün. */
export const REFERRAL_MIN_ACCOUNT_AGE_MS = Number(
  process.env.REFERRAL_MIN_ACCOUNT_AGE_MS ?? 1000 * 60 * 60 * 24 * 3,
);

export const DEFAULT_REFERRAL_REWARD = 500;
