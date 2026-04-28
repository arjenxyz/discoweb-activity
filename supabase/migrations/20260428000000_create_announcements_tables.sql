-- Create announcements table for scalable multi-language announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create announcement_translations table for multi-language support
CREATE TABLE IF NOT EXISTS public.announcement_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique index to prevent duplicate translations for same announcement and language
CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_translations_unique
ON public.announcement_translations (announcement_id, lang_code);

-- Create index for faster queries by language
CREATE INDEX IF NOT EXISTS idx_announcement_translations_lang
ON public.announcement_translations (lang_code);

-- Create index for active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active
ON public.announcements (is_active, created_at DESC);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_translations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to active announcements" ON public.announcements
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to announcement translations" ON public.announcement_translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.announcements
            WHERE announcements.id = announcement_translations.announcement_id
            AND announcements.is_active = true
        )
    );

-- Create policies for service role (admin) write access
CREATE POLICY "Allow service role full access to announcements" ON public.announcements
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to announcement translations" ON public.announcement_translations
    FOR ALL USING (auth.role() = 'service_role');