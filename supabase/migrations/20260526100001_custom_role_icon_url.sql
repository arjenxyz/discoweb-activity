ALTER TABLE public.custom_role_requests
  ADD COLUMN IF NOT EXISTS role_icon_url text;

COMMENT ON COLUMN public.custom_role_requests.role_icon_url IS
  'Kullanıcının yüklediği rol ikonu (data URL veya public URL); onayda Discord rol ikonuna aktarılır.';
