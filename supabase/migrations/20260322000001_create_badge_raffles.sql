-- Badge Tiers: Admin tarafından sunucu başına konfigüre edilen rozet kademeleri
create table if not exists public.badge_tiers (
  id           uuid primary key default gen_random_uuid(),
  guild_id     text not null,
  name         text not null,
  emoji        text,
  days_required integer not null,
  color        text,
  description  text,
  sort_order   integer default 0,
  created_at   timestamptz default now(),
  unique(guild_id, days_required)
);

-- Raffles: Aktif ve geçmiş çekilişler
create table if not exists public.raffles (
  id           uuid primary key default gen_random_uuid(),
  guild_id     text not null,
  title        text not null,
  description  text,
  prizes       jsonb,
  start_date   timestamptz,
  end_date     timestamptz,
  min_tag_days integer default 1,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- RLS
alter table public.badge_tiers enable row level security;
alter table public.raffles enable row level security;

do $$ begin
  create policy "badge_tiers_select" on public.badge_tiers
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "raffles_select" on public.raffles
    for select using (true);
exception when duplicate_object then null;
end $$;
