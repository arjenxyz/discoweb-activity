-- Add author metadata to announcements for developer-sent announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
