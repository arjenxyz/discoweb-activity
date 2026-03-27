create table if not exists bug_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  section     text not null default '',
  description text not null,
  status      text not null default 'pending',
  -- pending | reviewing | resolved | not_found
  channel_id  text not null,
  message_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists bug_reports_user_id_idx on bug_reports(user_id);
create index if not exists bug_reports_status_idx  on bug_reports(status);
