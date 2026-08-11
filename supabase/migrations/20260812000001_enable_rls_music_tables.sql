-- Fix Supabase Security Advisor: policies exist but RLS is off on music tables.
-- Enabling RLS makes existing policies actually apply.
-- Note: "Anon write" is removed in 20260812000002_security_advisor_cleanup.sql

ALTER TABLE IF EXISTS public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.music_playback_state ENABLE ROW LEVEL SECURITY;
