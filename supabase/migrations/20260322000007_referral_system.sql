-- 20260322000007_referral_system.sql
-- Aşama 3 — Referral Sistemi
-- referral_codes + referral_usages (pasif gelir modeli)

-- ─── 1. referral_codes tablosu ───────────────────────────────────────────────

create table if not exists public.referral_codes (
  id         uuid        primary key default gen_random_uuid(),
  guild_id   text        not null,
  user_id    text        not null,
  code       text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint referral_codes_code_unique unique (code),
  constraint referral_codes_user_guild  unique (guild_id, user_id)
);

create index if not exists referral_codes_code_idx on public.referral_codes (code);
create index if not exists referral_codes_user_idx on public.referral_codes (guild_id, user_id);

-- ─── 2. referral_usages tablosu ──────────────────────────────────────────────

create table if not exists public.referral_usages (
  id                   uuid        primary key default gen_random_uuid(),
  code_id              uuid        references public.referral_codes(id) on delete cascade,
  referred_user_id     text        not null,
  guild_id             text        not null,
  activated_at         timestamptz,                      -- ilk harcama anında set edilir
  passive_income_until timestamptz,                      -- activated_at + 3 ay
  passive_income_rate  numeric     not null default 0.10,
  pending_amount       numeric     not null default 0,   -- hazine yetersizliğinde birikir
  constraint referral_usages_unique unique (referred_user_id, guild_id)
);

create index if not exists referral_usages_code_idx on public.referral_usages (code_id);
create index if not exists referral_usages_guild_idx on public.referral_usages (guild_id);

-- ─── 3. referral_passive_income_log — idempotency (cron için) ────────────────

create table if not exists public.referral_passive_income_log (
  id               uuid        primary key default gen_random_uuid(),
  referral_usage_id uuid       references public.referral_usages(id) on delete cascade,
  week_id          text        not null,                 -- örn. '2026-W12' (UTC ISO)
  amount           numeric     not null default 0,
  paid_at          timestamptz not null default now(),
  constraint referral_income_log_unique unique (referral_usage_id, week_id)
);
