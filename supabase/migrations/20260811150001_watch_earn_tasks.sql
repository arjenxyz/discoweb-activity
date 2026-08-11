-- İzle Kazan (Watch & Earn) görevleri — developer panelden yönetilir

CREATE TABLE IF NOT EXISTS public.watch_earn_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  logo_text text NOT NULL,
  sponsor text NOT NULL,
  reward_papel numeric(18, 2) NOT NULL DEFAULT 0 CHECK (reward_papel >= 0),
  multiplier_label text NULL,
  banner_url text NOT NULL,
  video_url text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_earn_tasks_active_dates_idx
  ON public.watch_earn_tasks (active, starts_at DESC, created_at DESC)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.watch_earn_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.watch_earn_tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  guild_id text NULL,
  reward_papel numeric(18, 2) NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS watch_earn_claims_user_idx
  ON public.watch_earn_claims (user_id, claimed_at DESC);

ALTER TABLE public.watch_earn_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_earn_claims ENABLE ROW LEVEL SECURITY;

ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'watch_earn_reward';
