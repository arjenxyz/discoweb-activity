-- Badge tier: auto-role assignment + per-tier background image
ALTER TABLE badge_tiers
  ADD COLUMN IF NOT EXISTS role_id text,               -- Discord role ID to assign on unlock
  ADD COLUMN IF NOT EXISTS background_image text;      -- URL of background image shown in tag yolu
