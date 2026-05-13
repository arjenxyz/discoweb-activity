-- Mari görevleri: reklamdan sunucuya katýlým ile ödül
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS target_guild_id text,
  ADD COLUMN IF NOT EXISTS mari_reward decimal(18,6) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS task_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.mari_task_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  reward_mari decimal(18,6) NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  verification_source text NOT NULL DEFAULT 'discord_member_check',
  UNIQUE (ad_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mari_task_claims_user_claimed_at
  ON public.mari_task_claims(user_id, claimed_at DESC);

ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'mari_task_reward';
