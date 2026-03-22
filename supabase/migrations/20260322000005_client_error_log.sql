create table if not exists client_error_log (
  id uuid primary key default gen_random_uuid(),
  error_key text not null unique,          -- hata parmak izi (mesaj özeti)
  message text not null,
  type text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  total_hits integer not null default 1,
  unique_ips text[] not null default '{}', -- IP listesi (unique user proxy)
  critical_alerted boolean not null default false
);

create index if not exists client_error_log_key on client_error_log (error_key);
