-- Örnek İzle Kazan görevi (uzun video: Thragg.mp4)
-- Tablo yoksa önce 20260811150001_watch_earn_tasks.sql çalıştırılmalı.

INSERT INTO public.watch_earn_tasks (
  title,
  logo_text,
  sponsor,
  reward_papel,
  multiplier_label,
  banner_url,
  video_url,
  starts_at,
  ends_at,
  active,
  sort_order
)
SELECT
  'INVINCIBLE GAMEPLAY GÖREVİ (ÖRNEK)',
  'INVINCIBLE',
  'Amazon MGM Studios',
  200,
  '1,2 kat kilit aç',
  '/menu-background/varyant3.jpg',
  '/cdn/Storage/Thragg.mp4',
  now() - interval '1 day',
  now() + interval '30 days',
  true,
  100
WHERE NOT EXISTS (
  SELECT 1
  FROM public.watch_earn_tasks
  WHERE logo_text = 'INVINCIBLE'
    AND title = 'INVINCIBLE GAMEPLAY GÖREVİ (ÖRNEK)'
);
