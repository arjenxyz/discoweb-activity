-- Create poll tables for announcements
CREATE TABLE IF NOT EXISTS public.announcement_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_polls_announcement
ON public.announcement_polls (announcement_id);

CREATE TABLE IF NOT EXISTS public.announcement_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.announcement_polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_poll_options_poll
ON public.announcement_poll_options (poll_id, position);

CREATE TABLE IF NOT EXISTS public.announcement_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.announcement_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.announcement_poll_options(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_poll_votes_unique
ON public.announcement_poll_votes (poll_id, user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_poll_votes_poll
ON public.announcement_poll_votes (poll_id);

-- Enable RLS
ALTER TABLE public.announcement_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_poll_votes ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access to announcement polls" ON public.announcement_polls
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to announcement poll options" ON public.announcement_poll_options
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to announcement poll votes" ON public.announcement_poll_votes
    FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access to announcement polls" ON public.announcement_polls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to announcement poll options" ON public.announcement_poll_options
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to announcement poll votes" ON public.announcement_poll_votes
    FOR ALL USING (auth.role() = 'service_role');
