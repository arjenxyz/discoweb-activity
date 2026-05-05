-- Add discord_message_id to announcements table for message deletion support
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS discord_message_id TEXT;
