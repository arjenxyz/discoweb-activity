-- Allow multiple active community server ads
DROP INDEX IF EXISTS ads_one_active;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ads_active_sort_idx
  ON public.ads (sort_order DESC, created_at DESC)
  WHERE active = true;
