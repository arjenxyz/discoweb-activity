-- Track Activity welcome mailbox: first ready login, then again after verify-role loss.
ALTER TABLE public.member_profiles
  ADD COLUMN IF NOT EXISTS activity_welcome_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_access_revoked_at timestamptz;

COMMENT ON COLUMN public.member_profiles.activity_welcome_sent_at IS
  'Last time an Activity welcome mailbox mail was sent for this guild member.';
COMMENT ON COLUMN public.member_profiles.verify_access_revoked_at IS
  'Last time the member verify role was lost (or Activity saw missing_verify_role).';

-- Skip retroactive welcome for members who already opened Activity.
UPDATE public.member_profiles mp
SET activity_welcome_sent_at = COALESCE(mp.activity_welcome_sent_at, mp.created_at, now())
WHERE mp.activity_welcome_sent_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.activity_online_sessions s
    WHERE s.user_id = mp.user_id
      AND s.guild_id = mp.guild_id
  );
