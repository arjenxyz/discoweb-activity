-- Her kullanıcı sunucu başına yalnızca bir kez davet edilebilir
CREATE UNIQUE INDEX IF NOT EXISTS referral_history_guild_invitee_unique
  ON public.referral_history (guild_id, invitee_id)
  WHERE guild_id IS NOT NULL;
