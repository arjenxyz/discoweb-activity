-- Global incident kill-switch + audit / affected-user tracking

CREATE TABLE IF NOT EXISTS public.system_incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  title text NOT NULL DEFAULT 'Emergency stop',
  public_message text NOT NULL DEFAULT 'Şu anda büyük bir sorunu çözmek için çalışıyoruz, lütfen sabırlı olun.',
  scopes jsonb NOT NULL DEFAULT '["earn_message","earn_voice","claim","store","transfers","promotions","bonuses"]'::jsonb,
  window_start timestamptz NOT NULL,
  window_end timestamptz,
  pre_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_by text,
  resolved_by text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_incident_one_active_idx
  ON public.system_incident ((status))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS system_incident_status_idx
  ON public.system_incident (status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.system_incident_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.system_incident(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_incident_actions_incident_idx
  ON public.system_incident_actions (incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.system_incident_affected_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.system_incident(id) ON DELETE CASCADE,
  guild_id text NOT NULL,
  user_id text NOT NULL,
  category text NOT NULL,
  detected_amount numeric NOT NULL DEFAULT 0,
  proposed_correction numeric NOT NULL DEFAULT 0,
  applied_correction numeric,
  waived_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'previewed', 'applied', 'skipped', 'waived')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_incident_affected_incident_idx
  ON public.system_incident_affected_users (incident_id, status);

CREATE INDEX IF NOT EXISTS system_incident_affected_user_idx
  ON public.system_incident_affected_users (guild_id, user_id);

-- Ledger type for clawbacks (enum may or may not exist depending on env)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_type') THEN
    ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'incident_clawback';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
