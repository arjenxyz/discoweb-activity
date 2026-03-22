-- 20260322000006_economy_foundation.sql
-- Aşama 1 — Ekonomi Temeli
-- Sunucu ekonomi kademeleri, hazine sistemi, kill switch altyapısı

-- ─── 1. servers tablosuna ekonomi alanları ───────────────────────────────────

alter table public.servers
  add column if not exists economy_tier             text        not null default 'basic',
  add column if not exists advanced_since           timestamptz,
  add column if not exists burn_rate                numeric     not null default 0.05,
  add column if not exists treasury_rate            numeric     not null default 0.10,
  add column if not exists papel_value_multiplier   numeric     not null default 1.0,
  add column if not exists earn_multiplier_override numeric     not null default 1.0,
  add column if not exists max_order_lots           integer     not null default 10000,
  add column if not exists max_price_change_pct     numeric     not null default 0.20,
  add column if not exists max_treasury_daily_use   numeric     not null default 0.10,
  add column if not exists market_open_time         time                 default '09:00',
  add column if not exists market_close_time        time                 default '22:00',
  add column if not exists market_timezone          text                 default 'Europe/Istanbul',
  add column if not exists market_hours_enabled     boolean     not null default false;

-- Yakma + hazine toplamı max %95 (en az %5 harcamaya gider)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'valid_rates' and conrelid = 'public.servers'::regclass
  ) then
    alter table public.servers
      add constraint valid_rates check (burn_rate + treasury_rate <= 0.95);
  end if;
end $$;

-- ─── 2. member_wallets tablosuna reserved_balance + constraints ──────────────

alter table public.member_wallets
  add column if not exists reserved_balance numeric not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'positive_balance' and conrelid = 'public.member_wallets'::regclass
  ) then
    alter table public.member_wallets
      add constraint positive_balance check (balance >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'non_negative_reserved' and conrelid = 'public.member_wallets'::regclass
  ) then
    alter table public.member_wallets
      add constraint non_negative_reserved check (reserved_balance >= 0);
  end if;
end $$;

-- ─── 3. server_treasury tablosu ─────────────────────────────────────────────

create table if not exists public.server_treasury (
  guild_id             text        primary key,
  balance              numeric     not null default 0,
  total_collected      numeric     not null default 0,
  total_burned         numeric     not null default 0,
  total_dividends_paid numeric     not null default 0,
  updated_at           timestamptz not null default now(),
  constraint positive_treasury check (balance >= 0)
);

-- ─── 4. app_config tablosu (kill switch / read-only mode) ───────────────────

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

insert into public.app_config (key, value) values
  ('global_freeze',  'false'),
  ('read_only_mode', 'false')
on conflict (key) do nothing;

-- ─── 5. economy_tier_applications tablosu ───────────────────────────────────

create table if not exists public.economy_tier_applications (
  id                 uuid        primary key default gen_random_uuid(),
  guild_id           text        not null,
  applicant_user_id  text        not null,
  status             text        not null default 'pending', -- pending | approved | rejected
  discord_message_id text,
  starter_package    numeric,
  reviewed_by        text,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists economy_tier_apps_guild_idx
  on public.economy_tier_applications (guild_id);
