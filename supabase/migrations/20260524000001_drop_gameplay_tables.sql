-- Play & Earn tamamen kaldırıldı; ilgili tabloları düşür.

drop index if exists public.idx_game_runs_user_guild_started;
drop index if exists public.idx_game_themes_active;

drop table if exists public.game_runs cascade;
drop table if exists public.game_themes cascade;
