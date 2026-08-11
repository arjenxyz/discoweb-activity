-- Per-user Papel transfer count limit (day/week/month period)
alter table public.servers
  add column if not exists transfer_count_limit integer null,
  add column if not exists transfer_count_period text null;

comment on column public.servers.transfer_count_limit is
  'Max transfer_out count per user in the selected period; null/0 = disabled';
comment on column public.servers.transfer_count_period is
  'day | week | month — rolling window for transfer_count_limit';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'servers_transfer_count_period_check'
  ) then
    alter table public.servers
      add constraint servers_transfer_count_period_check
      check (
        transfer_count_period is null
        or transfer_count_period in ('day', 'week', 'month')
      );
  end if;
end $$;
