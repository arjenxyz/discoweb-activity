-- Who created each promotion code (shown on redeem receipt mails)
alter table public.promotions
  add column if not exists created_by text;

alter table public.promotions
  add column if not exists created_by_username text;

alter table public.promotions
  add column if not exists created_by_avatar_url text;
