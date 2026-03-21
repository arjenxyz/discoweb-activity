-- Raffle Entries: Çekilişe katılım kayıtları
create table if not exists public.raffle_entries (
  id           uuid primary key default gen_random_uuid(),
  raffle_id    uuid not null references public.raffles(id) on delete cascade,
  guild_id     text not null,
  user_id      text not null,
  tag_days_at_entry integer not null default 0,
  joined_at    timestamptz default now(),
  unique(raffle_id, user_id)
);

-- RLS
alter table public.raffle_entries enable row level security;

do $$ begin
  create policy "raffle_entries_select" on public.raffle_entries
    for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "raffle_entries_insert" on public.raffle_entries
    for insert with check (true);
exception when duplicate_object then null;
end $$;
