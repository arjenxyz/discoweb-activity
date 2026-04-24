-- Activity access bans
-- server_bans: blocks entire guild/server from activity access
-- member_bans: blocks a user (guild-scoped or global) from activity access

create table if not exists public.server_bans (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  reason text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.member_bans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  guild_id text,
  reason text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_server_bans_guild_active
  on public.server_bans(guild_id, is_active, created_at desc);

create index if not exists idx_server_bans_expires_at
  on public.server_bans(expires_at);

create index if not exists idx_member_bans_user_active
  on public.member_bans(user_id, is_active, created_at desc);

create index if not exists idx_member_bans_user_guild_active
  on public.member_bans(user_id, guild_id, is_active, created_at desc);

create index if not exists idx_member_bans_expires_at
  on public.member_bans(expires_at);

alter table if exists public.server_bans enable row level security;
alter table if exists public.member_bans enable row level security;
