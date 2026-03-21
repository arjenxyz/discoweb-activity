create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  invite_url text not null,
  server_name text not null,
  server_description text,
  server_icon text,
  member_count integer,
  online_count integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sadece bir aktif reklam olsun
create unique index if not exists ads_one_active on ads (active) where active = true;
