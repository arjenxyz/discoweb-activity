-- Raffle eligibility & new prize types
ALTER TABLE raffles
  ADD COLUMN IF NOT EXISTS eligibility_type TEXT NOT NULL DEFAULT 'tag',
    -- 'tag' | 'everyone' | 'booster'
  ADD COLUMN IF NOT EXISTS required_badge_tier_id UUID REFERENCES badge_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prize_multiplier_value NUMERIC(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prize_multiplier_days  INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prize_mari_amount      DECIMAL(18,6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prize_lot_count        INTEGER DEFAULT NULL;

-- Temporary earn multipliers granted by raffles or admins
CREATE TABLE IF NOT EXISTS member_active_multipliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  guild_id         TEXT NOT NULL,
  multiplier_value NUMERIC(4,2) NOT NULL,
  source           TEXT NOT NULL DEFAULT 'raffle', -- 'raffle' | 'admin'
  source_id        UUID,                           -- raffle_id if source='raffle'
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_multipliers_lookup
  ON member_active_multipliers (guild_id, user_id, expires_at);
