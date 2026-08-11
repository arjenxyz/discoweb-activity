-- Global maintenance flags (not per-server).
-- Developer panel toggles apply to every guild / activity client at once.

CREATE TABLE IF NOT EXISTS public.global_maintenance_flags (
  key text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT false,
  reason text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.global_maintenance_flags (key, is_active)
VALUES
  ('site', false),
  ('store', false),
  ('transactions', false),
  ('tracking', false),
  ('promotions', false),
  ('discounts', false),
  ('transfers', false),
  ('bot', false),
  ('activity', false)
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.maintenance_flags') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT ON (key)
      key,
      is_active,
      reason,
      updated_by,
      updated_at
    FROM public.maintenance_flags
    WHERE key IN (
      'site','store','transactions','tracking','promotions',
      'discounts','transfers','bot','activity'
    )
    ORDER BY key, is_active DESC, updated_at DESC NULLS LAST
  LOOP
    INSERT INTO public.global_maintenance_flags (key, is_active, reason, updated_by, updated_at)
    VALUES (r.key, COALESCE(r.is_active, false), r.reason, r.updated_by, COALESCE(r.updated_at, now()))
    ON CONFLICT (key) DO UPDATE SET
      is_active = EXCLUDED.is_active OR public.global_maintenance_flags.is_active,
      reason = COALESCE(EXCLUDED.reason, public.global_maintenance_flags.reason),
      updated_by = COALESCE(EXCLUDED.updated_by, public.global_maintenance_flags.updated_by),
      updated_at = GREATEST(
        COALESCE(EXCLUDED.updated_at, now()),
        COALESCE(public.global_maintenance_flags.updated_at, now())
      );
  END LOOP;
END $$;

ALTER TABLE public.global_maintenance_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_maintenance_flags_service_role" ON public.global_maintenance_flags;
CREATE POLICY "global_maintenance_flags_service_role"
  ON public.global_maintenance_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "global_maintenance_flags_select" ON public.global_maintenance_flags;
CREATE POLICY "global_maintenance_flags_select"
  ON public.global_maintenance_flags
  FOR SELECT
  USING (true);
