create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer,
  duration_ms integer,
  obstacles_passed integer,
  awarded_papel numeric,
  status text not null default 'started',
  metadata jsonb
);

create index if not exists idx_game_runs_user_guild_started
  on public.game_runs (user_id, guild_id, started_at desc);

create table if not exists public.game_themes (
  id uuid primary key default gen_random_uuid(),
  guild_id text,
  name text not null,
  image_url text not null,
  active boolean not null default true,
  weight integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_themes_active
  on public.game_themes (guild_id, active);
