-- Add target guild support and one-time join reward claims

ALTER TABLE public.weekly_tasks
  ADD COLUMN IF NOT EXISTS requirement_target_guild_id text;

CREATE TABLE IF NOT EXISTS public.weekly_task_join_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  target_guild_id text NOT NULL,
  task_id uuid,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_task_join_claims_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_task_join_claims_unique
  ON public.weekly_task_join_claims(user_id, target_guild_id);

CREATE INDEX IF NOT EXISTS idx_weekly_task_join_claims_user
  ON public.weekly_task_join_claims(user_id);
