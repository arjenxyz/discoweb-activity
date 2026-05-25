-- Özel rol talepleri: kullanıcı tasarlar, admin onaylar, Discord'da rol oluşturulur
CREATE TABLE IF NOT EXISTS public.custom_role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  requester_id text NOT NULL,
  target_user_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired', 'cancelled')),
  role_name text NOT NULL,
  role_color integer NOT NULL DEFAULT 5793266,
  role_emoji text,
  hoist boolean NOT NULL DEFAULT false,
  mentionable boolean NOT NULL DEFAULT false,
  requester_note text,
  duration_hours integer,
  expires_at timestamptz,
  auto_assign boolean NOT NULL DEFAULT false,
  discord_role_id text,
  assigned_at timestamptz,
  reviewed_by text,
  admin_note text,
  hierarchy_ack boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'user_request'
    CHECK (source IN ('user_request', 'raffle_winner')),
  raffle_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_role_requests_guild_status_idx
  ON public.custom_role_requests (guild_id, status);

CREATE INDEX IF NOT EXISTS custom_role_requests_expires_idx
  ON public.custom_role_requests (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

COMMENT ON TABLE public.custom_role_requests IS
  'Kullanıcı özel rol tasarımları; admin onayı sonrası Discord rolü oluşturulur ve süre dolunca silinir.';
