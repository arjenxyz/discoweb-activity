-- @everyone duyuruları + kullanıcı bazlı okundu takibi
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS mentions_everyone BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
  ON public.announcement_reads (user_id);

-- Mevcut duyurularda @everyone geçenleri işaretle
UPDATE public.announcements a
SET mentions_everyone = true
WHERE mentions_everyone = false
  AND EXISTS (
    SELECT 1
    FROM public.announcement_translations t
    WHERE t.announcement_id = a.id
      AND (t.title ~* '@everyone' OR t.content ~* '@everyone')
  );
