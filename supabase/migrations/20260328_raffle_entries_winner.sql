-- Add winner tracking columns to raffle_entries
ALTER TABLE raffle_entries
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reward_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_raffle_entries_winner
  ON raffle_entries (raffle_id, is_winner)
  WHERE is_winner = true;
