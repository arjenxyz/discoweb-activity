-- Referral milestone ödüllerini takip etmek için tablo
-- Her kullanıcı her milestone'u yalnızca bir kez talep edebilir (guild bazlı)
CREATE TABLE IF NOT EXISTS public.referral_milestone_claims (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id   text        NOT NULL,
  user_id    text        NOT NULL,
  milestone  integer     NOT NULL,   -- 5, 10, 20, 50, 100
  bonus      integer     NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_milestone_claims_unique UNIQUE (guild_id, user_id, milestone)
);

CREATE INDEX IF NOT EXISTS referral_milestone_claims_user_idx
  ON public.referral_milestone_claims (guild_id, user_id);

COMMENT ON TABLE public.referral_milestone_claims IS
  'Referral milestone ödülleri — her (guild, user, milestone) kombinasyonu yalnızca bir kez işlenir';

-- wallet_ledger type enum varsa referral türlerini ekle (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'wallet_ledger_type'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'wallet_ledger_type' AND e.enumlabel = 'referral_reward'
    ) THEN
      ALTER TYPE wallet_ledger_type ADD VALUE IF NOT EXISTS 'referral_reward';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'wallet_ledger_type' AND e.enumlabel = 'referral_milestone'
    ) THEN
      ALTER TYPE wallet_ledger_type ADD VALUE IF NOT EXISTS 'referral_milestone';
    END IF;
  END IF;
END;
$$;
