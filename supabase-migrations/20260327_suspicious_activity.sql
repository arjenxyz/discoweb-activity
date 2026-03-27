-- Suspicious Activity Log
-- Tracks flagged events detected by automated rules.
-- Severity: low | medium | high | critical
-- Status: open | reviewed | dismissed | actioned

CREATE TABLE IF NOT EXISTS public.suspicious_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text,
  user_id text,
  rule_key text NOT NULL,          -- e.g. 'wash_trading', 'rapid_earn', 'vote_flood'
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text,
  data jsonb,                       -- raw context for this event
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  discord_alerted boolean NOT NULL DEFAULT false,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suspicious_activity_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS suspicious_activity_log_guild_idx ON public.suspicious_activity_log (guild_id);
CREATE INDEX IF NOT EXISTS suspicious_activity_log_user_idx  ON public.suspicious_activity_log (user_id);
CREATE INDEX IF NOT EXISTS suspicious_activity_log_status_idx ON public.suspicious_activity_log (status);
CREATE INDEX IF NOT EXISTS suspicious_activity_log_created_idx ON public.suspicious_activity_log (created_at DESC);
