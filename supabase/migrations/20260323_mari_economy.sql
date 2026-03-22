-- ============================================================
-- Mari Ekonomi Sistemi — DB Migration
-- ============================================================

-- 1. servers tablosuna Mari ve ekonomi sütunları
ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS mari_rate_override DECIMAL(18,6) DEFAULT NULL,
  -- NULL ise formül çalışır: daily_cap / 2
  ADD COLUMN IF NOT EXISTS daily_papel_cap INTEGER NOT NULL DEFAULT 500,
  -- Sunucunun günlük papel kazanç tavanı (bot tarafından uygulanır)
  ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
  -- Discord üye sayısı (bot tarafından güncellenir, direkt başvuru için)

-- 2. member_wallets'e Mari bakiyesi ve reserved
ALTER TABLE member_wallets
  ADD COLUMN IF NOT EXISTS mari_balance DECIMAL(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mari_reserved DECIMAL(18,6) NOT NULL DEFAULT 0;
  -- mari_reserved: açık alış emirlerinde kilitlenen Mari miktarı

-- 3. Global Mari dönüşüm logu (cross-server limit takibi için)
CREATE TABLE IF NOT EXISTS mari_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  guild_id        TEXT NOT NULL,
  papel_amount    DECIMAL(18,2) NOT NULL,
  mari_amount     DECIMAL(18,6) NOT NULL,
  converted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mari_conversions_user_date
  ON mari_conversions(user_id, converted_at);

-- 4. Sunucu aktivite snapshot (günlük fiyat hesabı)
CREATE TABLE IF NOT EXISTS server_activity_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id         TEXT NOT NULL,
  snapshot_date    DATE NOT NULL,
  message_count    INTEGER DEFAULT 0,
  active_channels  INTEGER DEFAULT 0,
  voice_minutes    INTEGER DEFAULT 0,
  member_delta     INTEGER DEFAULT 0, -- pozitif = kazanılan üye
  baseline_7d      INTEGER DEFAULT 0, -- snapshot anındaki 7 günlük ortalama
  price_delta_pct  DECIMAL(6,4) DEFAULT 0, -- hesaplanan fiyat değişimi (örn: 0.08 = +%8)
  UNIQUE(guild_id, snapshot_date)
);

-- 5. server_listings'e aktivite skoru
ALTER TABLE server_listings
  ADD COLUMN IF NOT EXISTS activity_score DECIMAL(10,4) DEFAULT 1.0;

-- 6. IPO Tier (Aşamalı Satış) tablosu
--    Mevcut server_listings.ipo_price artık sadece referans olarak kalır
CREATE TABLE IF NOT EXISTS ipo_tiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES server_listings(id) ON DELETE CASCADE,
  tier_order    INTEGER NOT NULL,        -- 1, 2, 3...
  lot_count     INTEGER NOT NULL,        -- bu tier'daki toplam lot
  price_per_lot DECIMAL(18,6) NOT NULL,  -- Mari cinsinden
  sold_lots     INTEGER NOT NULL DEFAULT 0,
  opened_at     TIMESTAMPTZ,             -- NULL ise henüz aktif değil
  UNIQUE(listing_id, tier_order)
);

-- 7. Yüksek Ekonomi Başvuru tablosu
CREATE TABLE IF NOT EXISTS economy_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id            TEXT NOT NULL UNIQUE,
  status              VARCHAR(20) NOT NULL DEFAULT 'none',
    -- 'none' | 'voting' | 'pending' | 'approved' | 'rejected'
  application_type    VARCHAR(20),       -- 'vote' | 'direct'
  vote_count          INTEGER DEFAULT 0,
  vote_threshold      INTEGER DEFAULT 100,
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,              -- developer Discord ID
  rejection_reason    TEXT,
  scheduled_open_at   TIMESTAMPTZ,       -- başvuru + 7 gün (otomatik set edilir)
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Oylama kayıtları
CREATE TABLE IF NOT EXISTS economy_votes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id                TEXT NOT NULL,
  user_id                 TEXT NOT NULL,
  discord_account_age_days INTEGER,      -- oy anında hesaplanır
  voted_at                TIMESTAMPTZ DEFAULT NOW(),
  is_valid                BOOLEAN DEFAULT true, -- <30 gün hesap = false
  UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_economy_votes_guild
  ON economy_votes(guild_id, is_valid);

-- 9. Circuit breaker kaldırıldı — mevcut sütun olduğu yerde kalır ama kullanılmayacak
--    (silmek mevcut kodu kırar, kod tarafında kontrol atlanacak)
--    ALTER TABLE server_listings DROP COLUMN circuit_breaker_until; -- YAPMA
