-- ============================================================
-- Referral Güvenlik Düzeltmeleri
-- ============================================================

-- 1. add_to_wallet: atomik upsert (race condition'ı önler)
CREATE OR REPLACE FUNCTION add_to_wallet(
  p_guild_id text,
  p_user_id  text,
  p_amount   numeric
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;
  INSERT INTO member_wallets (guild_id, user_id, balance)
  VALUES (p_guild_id, p_user_id, p_amount)
  ON CONFLICT (guild_id, user_id)
  DO UPDATE SET balance = member_wallets.balance + p_amount;
END;
$$;

-- 2. increment_total_invites: atomik sayaç (stale read'i önler)
--    Yeni değeri döner (milestone kontrolü için)
CREATE OR REPLACE FUNCTION increment_total_invites(
  p_guild_id text,
  p_user_id  text
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE member_profiles
     SET total_invites = COALESCE(total_invites, 0) + 1
   WHERE guild_id = p_guild_id
     AND user_id  = p_user_id
  RETURNING total_invites INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

-- 3. referral_history'ye IP sütunu ekle (farming tespiti için)
ALTER TABLE public.referral_history
  ADD COLUMN IF NOT EXISTS invitee_ip text;

-- 4. IP bazlı hızlı arama için index
CREATE INDEX IF NOT EXISTS referral_history_ip_idx
  ON public.referral_history (invitee_ip, created_at)
  WHERE invitee_ip IS NOT NULL;
