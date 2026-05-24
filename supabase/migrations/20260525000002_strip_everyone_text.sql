-- İçerikteki @everyone metnini temizle (bayrak ayrı kalır; sadece developer checkbox ile set edilir)
UPDATE public.announcement_translations
SET
  title = trim(regexp_replace(regexp_replace(title, '^@everyone\s*', '', 'i'), '@everyone', '', 'gi')),
  content = trim(regexp_replace(regexp_replace(content, '^@everyone\s*', '', 'i'), '@everyone', '', 'gi'));

-- Metinden otomatik tespit edilmiş bayrakları sıfırla (yalnızca developer checkbox geçerli)
UPDATE public.announcements
SET mentions_everyone = false
WHERE mentions_everyone = true;
