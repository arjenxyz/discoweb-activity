-- Watch & Earn: videoyu bitirip henüz claim etmemiş kullanıcılar için kalıcı ilerleme

CREATE TABLE IF NOT EXISTS public.watch_earn_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.watch_earn_tasks(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  guild_id text NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS watch_earn_completions_user_idx
  ON public.watch_earn_completions (user_id, watched_at DESC);

ALTER TABLE public.watch_earn_completions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.watch_earn_completions IS
  'User finished watching a watch-earn video; claimable until watch_earn_claims row exists';
