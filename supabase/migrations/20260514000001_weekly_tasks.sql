-- Weekly tasks for Discord-based task menu

CREATE TABLE IF NOT EXISTS public.weekly_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  week_start date NOT NULL,
  title text NOT NULL,
  description text,
  requirement_type text NOT NULL CHECK (requirement_type IN ('join_guild','message_count','voice_minutes','role','event_participation')),
  requirement_value integer,
  requirement_role_id text,
  reward_mari numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_tasks_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_guild_week
  ON public.weekly_tasks(guild_id, week_start, active);

CREATE TABLE IF NOT EXISTS public.weekly_task_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id text NOT NULL,
  guild_id text NOT NULL,
  week_start date NOT NULL,
  reward_mari numeric NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_task_claims_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_task_claims_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.weekly_tasks(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_task_claims_unique
  ON public.weekly_task_claims(task_id, user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_task_claims_user_week
  ON public.weekly_task_claims(user_id, guild_id, week_start);
