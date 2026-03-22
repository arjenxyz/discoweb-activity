-- Aşama 4: Yatırım Borsası Temeli
-- server_listings, ipo_applications, investor_holdings

-- Borsada listelenen sunucular
create table if not exists public.server_listings (
  id                    uuid primary key default gen_random_uuid(),
  guild_id              text not null unique,
  status                text not null default 'pending',  -- pending | approved | suspended | delisted
  total_lots            integer not null default 1000000,
  founder_lots          integer not null,
  public_lots           integer not null,
  founder_user_id       text not null,
  founder_vesting_start timestamptz,
  founder_vested_lots   integer not null default 0,
  base_price            numeric not null default 1,
  market_price          numeric not null default 1,
  ipo_price             numeric not null default 1,
  circuit_breaker_until timestamptz,
  listed_at             timestamptz,
  delisted_at           timestamptz,
  created_at            timestamptz not null default now(),
  constraint valid_lot_counts check (founder_lots + public_lots = total_lots),
  constraint valid_status check (status in ('pending','approved','suspended','delisted')),
  constraint positive_price check (market_price >= 1)
);

-- IPO başvuruları
create table if not exists public.ipo_applications (
  id                     uuid primary key default gen_random_uuid(),
  guild_id               text not null,
  applicant_user_id      text not null,
  proposed_price         numeric not null,
  proposed_founder_ratio numeric not null,   -- 0.51 – 0.80
  guild_stats_snapshot   jsonb,
  status                 text not null default 'pending',  -- pending | approved | rejected
  discord_message_id     text,
  reviewer_user_id       text,
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  constraint valid_founder_ratio check (proposed_founder_ratio >= 0.51 and proposed_founder_ratio <= 0.80),
  constraint valid_ipo_status check (status in ('pending','approved','rejected'))
);

-- Yatırımcıların portföyü
create table if not exists public.investor_holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  guild_id      text not null,
  lot_count     integer not null default 0,
  avg_buy_price numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint investor_holdings_unique unique (user_id, guild_id),
  constraint non_negative_lots check (lot_count >= 0)
);

-- Temettü dağıtım kayıtları
create table if not exists public.dividend_payouts (
  id                   uuid primary key default gen_random_uuid(),
  guild_id             text not null,
  week_id              text not null,   -- örn. '2026-W12'
  total_amount         numeric not null default 0,
  per_lot_amount       numeric not null default 0,
  holdings_snapshot    jsonb,
  triggered_by         text not null default 'auto',  -- auto | admin | liquidation
  triggered_by_user_id text,
  distributed_at       timestamptz not null default now(),
  constraint dividend_payouts_unique unique (guild_id, week_id)
);

-- Index: fiyat-zaman önceliği için (Aşama 5'te kullanılacak)
create index if not exists idx_server_listings_status
  on public.server_listings (status, market_price desc);
