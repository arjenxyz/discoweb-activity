-- Atomic daily earning apply: avoids lost updates / double-reopen races.
-- If row is settled (claimed), start fresh with p_amount.
-- If unsettled, add p_amount to existing amount.
--
-- Run this ENTIRE script in one go in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.apply_daily_earning(
  p_guild_id text,
  p_user_id text,
  p_source text,
  p_earning_date date,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO public, pg_temp
AS $body$
DECLARE
  v_amount numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.daily_earnings AS de (
    guild_id,
    user_id,
    source,
    earning_date,
    amount,
    settled_at,
    updated_at
  )
  VALUES (
    p_guild_id,
    p_user_id,
    p_source,
    p_earning_date,
    p_amount,
    NULL,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (guild_id, user_id, source, earning_date)
  DO UPDATE SET
    amount = CASE
      WHEN de.settled_at IS NOT NULL THEN EXCLUDED.amount
      ELSE COALESCE(de.amount, 0) + EXCLUDED.amount
    END,
    settled_at = NULL,
    updated_at = CURRENT_TIMESTAMP
  RETURNING amount INTO v_amount;

  RETURN COALESCE(v_amount, 0);
END;
$body$;
