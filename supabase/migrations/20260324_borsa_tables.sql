-- ============================================================
-- Borsa Sistemi — Yeni Tablolar & Kolon Eklemeleri
-- ============================================================

-- 1. Günlük fiyat geçmişi (OHLCV)
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id    TEXT NOT NULL,
  date        DATE NOT NULL,
  open_price  DECIMAL(18,6) NOT NULL,
  close_price DECIMAL(18,6) NOT NULL,
  high_price  DECIMAL(18,6) NOT NULL,
  low_price   DECIMAL(18,6) NOT NULL,
  volume_lots INTEGER DEFAULT 0,
  UNIQUE(guild_id, date)
);
CREATE INDEX IF NOT EXISTS idx_price_history_guild_date
  ON price_history(guild_id, date DESC);

-- 2. İşlem logu
CREATE TABLE IF NOT EXISTS trades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      TEXT NOT NULL,
  buyer_id      TEXT,           -- NULL ise sistem (IPO)
  seller_id     TEXT,           -- NULL ise sistem (IPO)
  lot_count     INTEGER NOT NULL,
  price_per_lot DECIMAL(18,6) NOT NULL,
  total_mari    DECIMAL(18,6) NOT NULL,
  fee_mari      DECIMAL(18,6) NOT NULL DEFAULT 0,
  trade_type    VARCHAR(10) NOT NULL,  -- 'buy' | 'sell' | 'ipo'
  traded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trades_guild_date
  ON trades(guild_id, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer
  ON trades(buyer_id, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller
  ON trades(seller_id, traded_at DESC);

-- 3. Sunucu Mari Hazinesi
CREATE TABLE IF NOT EXISTS server_mari_treasury (
  guild_id        TEXT PRIMARY KEY,
  balance         DECIMAL(18,6) DEFAULT 0,
  support_reserve DECIMAL(18,6) DEFAULT 0,  -- bakiyenin %15'i
  total_collected DECIMAL(18,6) DEFAULT 0,
  total_paid_out  DECIMAL(18,6) DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Haftalık temettü birikimi
CREATE TABLE IF NOT EXISTS dividend_pool (
  guild_id       TEXT NOT NULL,
  week_start     DATE NOT NULL,
  total_mari     DECIMAL(18,6) DEFAULT 0,
  distributed    BOOLEAN DEFAULT false,
  distributed_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, week_start)
);

-- 5. Temettü dağıtım geçmişi
CREATE TABLE IF NOT EXISTS dividend_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  week_start    DATE NOT NULL,
  lot_snapshot  INTEGER NOT NULL,
  mari_received DECIMAL(18,6) NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dividend_history_user
  ON dividend_history(user_id, distributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_history_guild
  ON dividend_history(guild_id, week_start DESC);

-- 6. Hazine destek alımı lotları
CREATE TABLE IF NOT EXISTS treasury_holdings (
  guild_id        TEXT NOT NULL,
  lot_count       INTEGER NOT NULL DEFAULT 0,
  avg_buy_price   DECIMAL(18,6) DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id)
);

-- 7. Global günlük Mari dönüşüm sayacı
CREATE TABLE IF NOT EXISTS mari_daily_global (
  date            DATE PRIMARY KEY,
  total_converted DECIMAL(18,6) DEFAULT 0
);

-- 8. Referral linkleri
CREATE TABLE IF NOT EXISTS referral_links (
  user_id    TEXT PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_links_code
  ON referral_links(code);

-- 9. Referral dönüşüm logları
CREATE TABLE IF NOT EXISTS referral_conversions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id  TEXT NOT NULL,
  guild_id    TEXT NOT NULL,
  trade_id    UUID REFERENCES trades(id),
  mari_earned DECIMAL(18,6) NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referee_id, guild_id)
);

-- ============================================================
-- Mevcut tablolara yeni kolonlar
-- ============================================================

-- server_listings
ALTER TABLE server_listings
  ADD COLUMN IF NOT EXISTS current_day_high    DECIMAL(18,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_day_low     DECIMAL(18,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS support_threshold   DECIMAL(18,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category            VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS founder_vested_lots INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vesting_start_date  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS treasury_balance    DECIMAL(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS support_days_below  INTEGER DEFAULT 0,  -- hazine tetik sayacı
  ADD COLUMN IF NOT EXISTS delist_days_below   INTEGER DEFAULT 0;  -- delist tetik sayacı

-- investor_holdings
ALTER TABLE investor_holdings
  ADD COLUMN IF NOT EXISTS daily_sell_used       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_sell_reset_date DATE DEFAULT NULL;
