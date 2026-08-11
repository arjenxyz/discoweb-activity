-- Fix Supabase Security Advisor: policies exist but RLS is off on music tables.
-- Enabling RLS makes existing policies ("Public read", "Anon write") actually apply
-- and clears lint 0007 (policy_exists_rls_disabled) + 0013 (rls_disabled_in_public).

ALTER TABLE IF EXISTS public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.music_playback_state ENABLE ROW LEVEL SECURITY;

-- Optional hardening: if these tables are only touched via service_role (Next.js /
-- bot), drop wide-open anon policies so anonymous clients cannot write.
-- Uncomment if you do not need browser/anon access to these tables:
--
-- DROP POLICY IF EXISTS "Anon write" ON public.music_tracks;
-- DROP POLICY IF EXISTS "Anon write" ON public.music_playback_state;
-- DROP POLICY IF EXISTS "Public read" ON public.music_tracks;
-- DROP POLICY IF EXISTS "Public read" ON public.music_playback_state;
