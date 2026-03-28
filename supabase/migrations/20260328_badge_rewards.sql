-- Badge Rewards System
-- Adds reward columns to badge_tiers and tracking tables

-- 1. Extend badge_tiers with reward fields
ALTER TABLE badge_tiers
  ADD COLUMN IF NOT EXISTS reward_papel integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_earn_multiplier numeric(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS reward_message text;

-- 2. Add current badge tracking to member_profiles
ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS current_badge_tier_id uuid REFERENCES badge_tiers(id) ON DELETE SET NULL;

-- 3. Idempotent reward tracking table (one row per user per tier = never double-reward)
CREATE TABLE IF NOT EXISTS member_badge_rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  guild_id      text NOT NULL,
  badge_tier_id uuid NOT NULL REFERENCES badge_tiers(id) ON DELETE CASCADE,
  rewarded_at   timestamptz NOT NULL DEFAULT now(),
  papel_given   integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, guild_id, badge_tier_id)
);

CREATE INDEX IF NOT EXISTS member_badge_rewards_user_guild_idx
  ON member_badge_rewards (user_id, guild_id);
