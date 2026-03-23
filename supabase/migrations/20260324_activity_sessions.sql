create table if not exists activity_sessions (
  user_id  text        not null,
  guild_id text        not null,
  last_seen timestamptz not null default now(),
  primary key (user_id, guild_id)
);

create index if not exists idx_activity_sessions_guild_last_seen
  on activity_sessions (guild_id, last_seen);
