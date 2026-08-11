-- Supabase Security Advisor cleanups (WARN → clear)
-- 0011 function_search_path_mutable
-- 0014 extension_in_public (pg_trgm)
-- 0024 rls_policy_always_true
-- 0028/0029 anon|authenticated SECURITY DEFINER executable (reset_all_wallets)
--
-- Run in Supabase SQL Editor (entire script). Safe / idempotent where possible.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Pin search_path on flagged public functions
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  r record;
  fnames text[] := ARRAY[
    'touch_room_last_message',
    'get_or_create_dm_room',
    'increment_unread_counts',
    'archive_old_messages',
    'reset_all_wallets',
    'quiz_question_bank_set_updated_at',
    'quiz_events_set_updated_at',
    'quiz_question_translations_set_updated_at',
    'update_room_last_message',
    'update_updated_at',
    'mark_room_as_read',
    'search_messages',
    'cleanup_expired_typing',
    'vacuum_typing_indicators',
    'apply_daily_earning'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (fnames)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_temp', r.sig);
  END LOOP;
END $$;

-- Keep apply_daily_earning definition in sync for future recreates
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) reset_all_wallets: revoke public / anon / authenticated execute
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'reset_all_wallets'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Move pg_trgm out of public (ignore if already moved / locked)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm'
      AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm schema move skipped: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) Tighten overly permissive RLS policies
-- ═══════════════════════════════════════════════════════════════════════════

-- music_*: drop Anon write (USING/CHECK true ALL). Keep Public read if SELECT-only.
ALTER TABLE IF EXISTS public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.music_playback_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon write" ON public.music_tracks;
DROP POLICY IF EXISTS "Anon write" ON public.music_playback_state;

DO $$ BEGIN
  CREATE POLICY "service_role_all_music_tracks"
    ON public.music_tracks FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_music_playback_state"
    ON public.music_playback_state FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- booster_tiers: replace unrestricted ALL with service_role + public SELECT
DROP POLICY IF EXISTS "Admins can view and edit booster tiers" ON public.booster_tiers;

DO $$ BEGIN
  CREATE POLICY "booster_tiers_select_public"
    ON public.booster_tiers FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "booster_tiers_service_role_all"
    ON public.booster_tiers FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- raffle_entries: drop open INSERT; keep SELECT; ensure service_role write
DROP POLICY IF EXISTS "raffle_entries_insert" ON public.raffle_entries;

DO $$ BEGIN
  CREATE POLICY "service_role_all_raffle_entries"
    ON public.raffle_entries FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
