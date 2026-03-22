-- ============================================================
-- Schema Fix Migration — 2026-03-22
-- Kritik, önemli ve tasarım tutarsızlıklarını giderir.
-- Supabase Dashboard > SQL Editor'da çalıştır.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Eski/kullanılmayan tabloları kaldır
-- ─────────────────────────────────────────

-- members: eski server_id (uuid) sistemini kullanan, aktif kodda referans edilmeyen tablo
DROP TABLE IF EXISTS public.members CASCADE;

-- system_mail_contacts: eski destek talebi tablosu, artık kullanılmıyor
DROP TABLE IF EXISTS public.system_mail_contacts CASCADE;

-- ─────────────────────────────────────────
-- 2. store_orders — guild_id ekle
-- ─────────────────────────────────────────
-- store_orders.guild_id olmadan sunucu bazlı veri silme/filtreleme mümkün değildi.
-- servers tablosundaki discord_id ile JOIN yaparak mevcut kayıtları doldur.

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS guild_id text;

-- Mevcut kayıtlar için store_items → store_categories → servers üzerinden guild_id backfill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='store_categories') THEN
    UPDATE public.store_orders so
    SET guild_id = srv.discord_id
    FROM public.store_items si
    JOIN public.store_categories sc ON si.category_id = sc.id
    JOIN public.servers srv ON sc.server_id = srv.id
    WHERE so.item_id = si.id
      AND so.guild_id IS NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 3. promotion_usages — guild_id ekle
-- ─────────────────────────────────────────
ALTER TABLE public.promotion_usages
  ADD COLUMN IF NOT EXISTS guild_id text;

-- promotions → servers üzerinden backfill
UPDATE public.promotion_usages pu
SET guild_id = srv.discord_id
FROM public.promotions p
JOIN public.servers srv ON p.server_id = srv.id
WHERE pu.promotion_id = p.id
  AND pu.guild_id IS NULL;

-- ─────────────────────────────────────────
-- 4. discount_usages — guild_id ekle
-- ─────────────────────────────────────────
ALTER TABLE public.discount_usages
  ADD COLUMN IF NOT EXISTS guild_id text;

-- discounts → servers üzerinden backfill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='discounts') THEN
    UPDATE public.discount_usages du
    SET guild_id = srv.discord_id
    FROM public.discounts d
    JOIN public.servers srv ON d.server_id = srv.id
    WHERE du.discount_id = d.id
      AND du.guild_id IS NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 5. notification_reads — guild_id ekle
-- ─────────────────────────────────────────
ALTER TABLE public.notification_reads
  ADD COLUMN IF NOT EXISTS guild_id text;

-- notifications tablosu varsa backfill; yoksa NULL kalır (gelecek veriler için sütun hazır)
UPDATE public.notification_reads nr
SET guild_id = n.guild_id
FROM public.notifications n
WHERE nr.notification_id = n.id
  AND nr.guild_id IS NULL;

-- ─────────────────────────────────────────
-- 6. referral_history — guild_id ekle
-- ─────────────────────────────────────────
ALTER TABLE public.referral_history
  ADD COLUMN IF NOT EXISTS guild_id text;

-- ─────────────────────────────────────────
-- 7. wallet_ledger.type — enum'a dönüştür
-- ─────────────────────────────────────────

-- Önce mevcut değerleri normalleştir (boşluk/büyük harf tutarsızlıklarını temizle)
UPDATE public.wallet_ledger SET type = lower(trim(type::text)) WHERE type IS NOT NULL;

-- Enum oluştur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_type') THEN
    CREATE TYPE public.wallet_ledger_type AS ENUM (
      'earn',
      'spend',
      'transfer_in',
      'transfer_out',
      'refund',
      'admin_grant',
      'admin_deduct',
      'raffle_entry',
      'raffle_refund',
      'store_purchase',
      'referral_bonus',
      'daily_bonus'
    );
  END IF;
END $$;

-- Önce type sütununu TEXT'e dönüştür (varsa enum'dan text'e geri alın)
ALTER TABLE public.wallet_ledger
  ALTER COLUMN type TYPE text
  USING type::text;

-- normalize et
UPDATE public.wallet_ledger
SET type = lower(trim(type::text))
WHERE type IS NOT NULL;

-- geçersiz değerleri 'earn'e çek
UPDATE public.wallet_ledger
SET type = 'earn'
WHERE type IS NULL
  OR type::text NOT IN (
    'earn','spend','transfer_in','transfer_out','refund',
    'admin_grant','admin_deduct','raffle_entry','raffle_refund',
    'store_purchase','referral_bonus','daily_bonus'
  );

-- CHECK constraint on type değeri
ALTER TABLE public.wallet_ledger
  DROP CONSTRAINT IF EXISTS wallet_ledger_type_check;
ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_type_check CHECK (type::text IN (
    'earn','spend','transfer_in','transfer_out','refund',
    'admin_grant','admin_deduct','raffle_entry','raffle_refund',
    'store_purchase','referral_bonus','daily_bonus'
  ));

-- Enum oluştur (varsa atla)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_type') THEN
    CREATE TYPE public.wallet_ledger_type AS ENUM (
      'earn','spend','transfer_in','transfer_out','refund',
      'admin_grant','admin_deduct','raffle_entry','raffle_refund',
      'store_purchase','referral_bonus','daily_bonus'
    );
  END IF;
END $$;

-- TEXT sütununu ENUM'a çevir
ALTER TABLE public.wallet_ledger
  ALTER COLUMN type TYPE public.wallet_ledger_type
  USING type::public.wallet_ledger_type;

-- ─────────────────────────────────────────
-- 8. activity_participation → activity_sessions CASCADE
-- ─────────────────────────────────────────
-- session silinince participation kayıtları orphan kalmasın

ALTER TABLE public.activity_participation
  DROP CONSTRAINT IF EXISTS activity_participation_session_id_fkey;

ALTER TABLE public.activity_participation
  ADD CONSTRAINT activity_participation_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.activity_sessions(id)
  ON DELETE CASCADE;

-- ─────────────────────────────────────────
-- 9. delete-data: store_orders guild_id ile silinebilir artık
-- ─────────────────────────────────────────
-- (Kod değişikliği gerekiyor — aşağıya bakın)
-- store_orders artık guild_id'ye sahip, delete-data route güncellenmeli.

-- ─────────────────────────────────────────
-- Tamamlandı
-- ─────────────────────────────────────────
