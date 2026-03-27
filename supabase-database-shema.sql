-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_online_sessions (
  user_id text NOT NULL,
  guild_id text NOT NULL,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_online_sessions_pkey PRIMARY KEY (user_id, guild_id)
);
CREATE TABLE public.activity_participation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  guild_id text,
  user_id text NOT NULL,
  join_at timestamp with time zone NOT NULL DEFAULT now(),
  leave_at timestamp with time zone,
  duration_seconds integer,
  awarded boolean NOT NULL DEFAULT false,
  award_amount numeric,
  metadata jsonb,
  CONSTRAINT activity_participation_pkey PRIMARY KEY (id),
  CONSTRAINT activity_participation_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.activity_sessions(id)
);
CREATE TABLE public.activity_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text,
  channel_id text NOT NULL,
  invite_code text,
  activity_app_id text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  metadata jsonb,
  CONSTRAINT activity_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_actions (
  id bigint NOT NULL DEFAULT nextval('admin_actions_id_seq'::regclass),
  actor_id character varying NOT NULL,
  actor_role character varying NOT NULL,
  target_guild_id character varying NOT NULL,
  action_type character varying NOT NULL,
  payload_before jsonb,
  payload_after jsonb,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_actions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invite_url text NOT NULL,
  server_name text NOT NULL,
  server_description text,
  server_icon text,
  member_count integer,
  online_count integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.app_config (
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT app_config_pkey PRIMARY KEY (key)
);
CREATE TABLE public.badge_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  name text NOT NULL,
  emoji text,
  days_required integer NOT NULL,
  color text,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badge_tiers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bot_log_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  channel_id text NOT NULL,
  category_id text,
  channel_type text NOT NULL CHECK (channel_type = ANY (ARRAY['user_main'::text, 'user_auth'::text, 'user_roles'::text, 'user_exchange'::text, 'user_store'::text, 'admin_main'::text, 'admin_wallet'::text, 'admin_store'::text, 'admin_notifications'::text, 'admin_settings'::text, 'main'::text, 'auth'::text, 'roles'::text, 'suspicious'::text, 'store'::text, 'wallet'::text, 'admin'::text, 'settings'::text, 'basvuru_ekonomi'::text, 'basvuru_ipo'::text, 'basvuru_onay'::text, 'basvuru_red'::text, 'borsa_trades'::text, 'borsa_emirler'::text, 'circuit_breaker'::text, 'buyuk_islemler'::text, 'suphe_log'::text, 'hazine_giris'::text, 'hazine_cikis'::text, 'temetu_haftalik'::text, 'halving_log'::text, 'referral_aktivasyon'::text, 'referral_odeme'::text, 'ceza_log'::text, 'piyasa_olaylari'::text, 'freeze_log'::text, 'cron_sonuclar'::text, 'sistem_hatalar'::text])),
  webhook_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bot_log_channels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bug_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  section text NOT NULL DEFAULT ''::text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  channel_id text NOT NULL,
  message_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'bug'::text,
  CONSTRAINT bug_reports_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_error_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  error_key text NOT NULL UNIQUE,
  message text NOT NULL,
  type text,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  total_hits integer NOT NULL DEFAULT 1,
  unique_ips ARRAY NOT NULL DEFAULT '{}'::text[],
  critical_alerted boolean NOT NULL DEFAULT false,
  CONSTRAINT client_error_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['voice'::text, 'message'::text])),
  earning_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  settled_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_earnings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discount_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL,
  user_id text NOT NULL,
  order_id uuid,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT discount_usages_pkey PRIMARY KEY (id),
  CONSTRAINT discount_usages_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.store_discounts(id),
  CONSTRAINT discount_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.store_orders(id)
);
CREATE TABLE public.dividend_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  week_id text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  per_lot_amount numeric NOT NULL DEFAULT 0,
  holdings_snapshot jsonb,
  triggered_by text NOT NULL DEFAULT 'auto'::text,
  triggered_by_user_id text,
  distributed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dividend_payouts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.economy_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'none'::character varying,
  application_type character varying,
  vote_count integer DEFAULT 0,
  vote_threshold integer DEFAULT 100,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by text,
  rejection_reason text,
  scheduled_open_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT economy_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.economy_tier_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  applicant_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  discord_message_id text,
  starter_package numeric,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT economy_tier_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.economy_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  discord_account_age_days integer,
  voted_at timestamp with time zone DEFAULT now(),
  is_valid boolean DEFAULT true,
  CONSTRAINT economy_votes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL,
  category text,
  context jsonb,
  solution text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.investor_holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  guild_id text NOT NULL,
  lot_count integer NOT NULL DEFAULT 0 CHECK (lot_count >= 0),
  avg_buy_price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT investor_holdings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ipo_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  applicant_user_id text NOT NULL,
  proposed_price numeric NOT NULL,
  proposed_founder_ratio numeric NOT NULL CHECK (proposed_founder_ratio >= 0.51 AND proposed_founder_ratio <= 0.80),
  guild_stats_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  discord_message_id text,
  reviewer_user_id text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ipo_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ipo_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  tier_order integer NOT NULL,
  lot_count integer NOT NULL,
  price_per_lot numeric NOT NULL,
  sold_lots integer NOT NULL DEFAULT 0,
  opened_at timestamp with time zone,
  CONSTRAINT ipo_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT ipo_tiers_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.server_listings(id)
);
CREATE TABLE public.log_channel_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  channel_type text NOT NULL CHECK (channel_type = ANY (ARRAY['user_main'::text, 'user_auth'::text, 'user_roles'::text, 'user_exchange'::text, 'user_store'::text, 'admin_main'::text, 'admin_wallet'::text, 'admin_store'::text, 'admin_notifications'::text, 'admin_settings'::text, 'main'::text, 'auth'::text, 'roles'::text, 'system'::text, 'suspicious'::text, 'store'::text, 'wallet'::text, 'notifications'::text, 'settings'::text, 'admin'::text])),
  webhook_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT log_channel_configs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.maintenance_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  key text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  reason text,
  updated_by text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_flags_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_flags_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id)
);
CREATE TABLE public.mari_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  guild_id text NOT NULL,
  papel_amount numeric NOT NULL,
  mari_amount numeric NOT NULL,
  converted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mari_conversions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_daily_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  plan_date date NOT NULL,
  hourly_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_reasoning text,
  mood text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT market_daily_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text,
  type text NOT NULL CHECK (type = ANY (ARRAY['news'::text, 'price_adjustment'::text, 'papel_injection'::text, 'freeze'::text, 'unfreeze'::text])),
  severity text NOT NULL DEFAULT 'info'::text CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])),
  title text NOT NULL,
  description text,
  price_impact numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  event_type character varying NOT NULL,
  actor_id text,
  headline text,
  body text,
  metadata jsonb,
  CONSTRAINT market_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  guild_id text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['buy'::text, 'sell'::text])),
  lot_count integer NOT NULL,
  remaining_lots integer NOT NULL,
  price_per_lot numeric NOT NULL CHECK (price_per_lot > 0::numeric),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'filled'::text, 'partial'::text, 'cancelled'::text, 'expired'::text])),
  filled_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT market_orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.market_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  buyer_user_id text NOT NULL,
  seller_user_id text NOT NULL,
  lot_count integer NOT NULL CHECK (lot_count > 0),
  price_per_lot numeric NOT NULL,
  total_amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  buy_order_id uuid,
  sell_order_id uuid,
  traded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT market_trades_pkey PRIMARY KEY (id),
  CONSTRAINT market_trades_buy_order_id_fkey FOREIGN KEY (buy_order_id) REFERENCES public.market_orders(id),
  CONSTRAINT market_trades_sell_order_id_fkey FOREIGN KEY (sell_order_id) REFERENCES public.market_orders(id)
);
CREATE TABLE public.member_daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  stat_date date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  voice_minutes integer NOT NULL DEFAULT 0,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_daily_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.member_overview_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  total_messages integer NOT NULL DEFAULT 0,
  total_voice_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT member_overview_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.member_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL UNIQUE,
  about text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tag_granted_at timestamp with time zone,
  has_tag boolean DEFAULT false,
  is_booster boolean DEFAULT false,
  booster_since timestamp with time zone,
  referral_code text UNIQUE,
  referred_by text,
  total_invites integer NOT NULL DEFAULT 0,
  CONSTRAINT member_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT member_profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.member_profiles(user_id)
);
CREATE TABLE public.member_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0::numeric),
  deleted_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reserved_balance numeric NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0::numeric),
  mari_balance numeric NOT NULL DEFAULT 0,
  mari_reserved numeric NOT NULL DEFAULT 0,
  CONSTRAINT member_wallets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  discord_id text NOT NULL,
  username text NOT NULL,
  display_name text,
  avatar_url text,
  points integer NOT NULL DEFAULT 0,
  role_level integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id)
);
CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  user_id text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (id),
  CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['announcement'::text, 'mail'::text])),
  status text NOT NULL DEFAULT 'published'::text,
  target_user_id text,
  created_by text,
  author_name text,
  author_avatar_url text,
  details_url text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.owner_consents (
  id bigint NOT NULL DEFAULT nextval('owner_consents_id_seq'::regclass),
  guild_id character varying NOT NULL,
  actor_id character varying NOT NULL,
  action character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT owner_consents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.promotion_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  user_id text NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promotion_usages_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_usages_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id)
);
CREATE TABLE public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  code text NOT NULL,
  value numeric NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT promotions_pkey PRIMARY KEY (id),
  CONSTRAINT promotions_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id)
);
CREATE TABLE public.raffle_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL,
  guild_id text NOT NULL,
  user_id text NOT NULL,
  tag_days_at_entry integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT raffle_entries_pkey PRIMARY KEY (id),
  CONSTRAINT raffle_entries_raffle_id_fkey FOREIGN KEY (raffle_id) REFERENCES public.raffles(id)
);
CREATE TABLE public.raffles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  title text NOT NULL,
  description text,
  prizes jsonb,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  min_tag_days integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT raffles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.referral_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inviter_id text NOT NULL,
  invitee_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::referral_status,
  CONSTRAINT referral_history_pkey PRIMARY KEY (id),
  CONSTRAINT referral_history_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.member_profiles(user_id),
  CONSTRAINT referral_history_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.member_profiles(user_id)
);
CREATE TABLE public.referral_milestone_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  milestone_id integer NOT NULL,
  choice USER-DEFINED NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  guild_id text,
  milestone integer,
  bonus integer,
  CONSTRAINT referral_milestone_claims_pkey PRIMARY KEY (id),
  CONSTRAINT referral_milestone_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.member_profiles(user_id),
  CONSTRAINT referral_milestone_claims_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.referral_milestones(id)
);
CREATE TABLE public.referral_milestones (
  id integer NOT NULL DEFAULT nextval('referral_milestones_id_seq'::regclass),
  threshold integer NOT NULL UNIQUE,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_role_id text,
  description text,
  CONSTRAINT referral_milestones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.referral_passive_income_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referral_usage_id uuid,
  week_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referral_passive_income_log_pkey PRIMARY KEY (id),
  CONSTRAINT referral_passive_income_log_referral_usage_id_fkey FOREIGN KEY (referral_usage_id) REFERENCES public.referral_usages(id)
);
CREATE TABLE public.referral_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code_id uuid,
  referred_user_id text NOT NULL,
  guild_id text NOT NULL,
  activated_at timestamp with time zone,
  passive_income_until timestamp with time zone,
  passive_income_rate numeric NOT NULL DEFAULT 0.10,
  pending_amount numeric NOT NULL DEFAULT 0,
  CONSTRAINT referral_usages_pkey PRIMARY KEY (id),
  CONSTRAINT referral_usages_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.referral_codes(id)
);
CREATE TABLE public.server_activity_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  snapshot_date date NOT NULL,
  message_count integer DEFAULT 0,
  active_channels integer DEFAULT 0,
  voice_minutes integer DEFAULT 0,
  member_delta integer DEFAULT 0,
  baseline_7d integer DEFAULT 0,
  price_delta_pct numeric DEFAULT 0,
  CONSTRAINT server_activity_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.server_daily_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  stat_date date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  voice_minutes integer NOT NULL DEFAULT 0,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT server_daily_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.server_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'delisted'::text])),
  total_lots integer NOT NULL DEFAULT 1000000,
  founder_lots integer NOT NULL,
  public_lots integer NOT NULL,
  founder_user_id text NOT NULL,
  founder_vesting_start timestamp with time zone,
  founder_vested_lots integer NOT NULL DEFAULT 0,
  base_price numeric NOT NULL DEFAULT 1,
  market_price numeric NOT NULL DEFAULT 1 CHECK (market_price >= 1::numeric),
  ipo_price numeric NOT NULL DEFAULT 1,
  circuit_breaker_until timestamp with time zone,
  listed_at timestamp with time zone,
  delisted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  activity_score numeric DEFAULT 1.0,
  CONSTRAINT server_listings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.server_overview_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL UNIQUE,
  total_messages integer NOT NULL DEFAULT 0,
  total_voice_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT server_overview_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.server_penalties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['warning'::text, 'fine'::text, 'suspension'::text, 'delist'::text])),
  reason text,
  fine_amount numeric DEFAULT 0,
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  issued_by_user_id text,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  lifted_at timestamp with time zone,
  lifted_by_user_id text,
  CONSTRAINT server_penalties_pkey PRIMARY KEY (id)
);
CREATE TABLE public.server_treasury (
  guild_id text NOT NULL,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0::numeric),
  total_collected numeric NOT NULL DEFAULT 0,
  total_burned numeric NOT NULL DEFAULT 0,
  total_dividends_paid numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT server_treasury_pkey PRIMARY KEY (guild_id)
);
CREATE TABLE public.servers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  discord_id text UNIQUE,
  avatar_url text,
  admin_role_id text,
  verify_role_id text,
  is_setup boolean NOT NULL DEFAULT false,
  approval_threshold numeric NOT NULL DEFAULT 80,
  transfer_daily_limit numeric NOT NULL DEFAULT 200,
  transfer_tax_rate numeric NOT NULL DEFAULT 0.05,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  earn_per_message numeric DEFAULT 0,
  earn_per_voice_minute numeric DEFAULT 0,
  message_earn_enabled boolean DEFAULT false,
  voice_earn_enabled boolean DEFAULT false,
  tag_id text,
  tag_bonus_message numeric NOT NULL DEFAULT 0,
  tag_bonus_voice numeric NOT NULL DEFAULT 0,
  booster_bonus_message numeric NOT NULL DEFAULT 0,
  booster_bonus_voice numeric NOT NULL DEFAULT 0,
  tag_required boolean NOT NULL DEFAULT false,
  earn_channels jsonb,
  economy_tier text NOT NULL DEFAULT 'basic'::text,
  advanced_since timestamp with time zone,
  burn_rate numeric NOT NULL DEFAULT 0.05,
  treasury_rate numeric NOT NULL DEFAULT 0.10,
  papel_value_multiplier numeric NOT NULL DEFAULT 1.0,
  earn_multiplier_override numeric NOT NULL DEFAULT 1.0,
  max_order_lots integer NOT NULL DEFAULT 10000,
  max_price_change_pct numeric NOT NULL DEFAULT 0.20,
  max_treasury_daily_use numeric NOT NULL DEFAULT 0.10,
  market_open_time time without time zone DEFAULT '09:00:00'::time without time zone,
  market_close_time time without time zone DEFAULT '22:00:00'::time without time zone,
  market_timezone text DEFAULT 'Europe/Istanbul'::text,
  market_hours_enabled boolean NOT NULL DEFAULT false,
  mari_rate_override numeric DEFAULT NULL::numeric,
  daily_papel_cap integer NOT NULL DEFAULT 500,
  member_count integer DEFAULT 0,
  referral_reward integer NOT NULL DEFAULT 500,
  CONSTRAINT servers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.store_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  code text NOT NULL,
  percent numeric NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text])),
  expires_at timestamp with time zone,
  is_welcome boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_special boolean NOT NULL DEFAULT false,
  per_user_limit integer NOT NULL DEFAULT 1,
  min_spend numeric NOT NULL DEFAULT 0,
  CONSTRAINT store_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT store_discounts_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id)
);
CREATE TABLE public.store_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  role_id text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_items_pkey PRIMARY KEY (id),
  CONSTRAINT store_items_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id)
);
CREATE TABLE public.store_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL,
  user_id text NOT NULL,
  item_id uuid,
  item_title text,
  role_id text NOT NULL,
  duration_days integer NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  applied_at timestamp with time zone,
  revoked_at timestamp with time zone,
  failure_reason text,
  amount numeric NOT NULL,
  discount_code text,
  discount_percent numeric,
  status text NOT NULL CHECK (status = ANY (ARRAY['paid'::text, 'pending'::text, 'refunded'::text, 'failed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  items jsonb,
  subtotal numeric,
  discount_amount numeric DEFAULT 0,
  failure_code integer,
  failure_response text,
  CONSTRAINT store_orders_pkey PRIMARY KEY (id),
  CONSTRAINT store_orders_server_id_fkey FOREIGN KEY (server_id) REFERENCES public.servers(id),
  CONSTRAINT store_orders_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id)
);
CREATE TABLE public.system_mail_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_mail_contacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_mail_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mail_id uuid NOT NULL,
  user_id text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT system_mail_reads_pkey PRIMARY KEY (id),
  CONSTRAINT system_mail_reads_mail_id_fkey FOREIGN KEY (mail_id) REFERENCES public.system_mails(id)
);
CREATE TABLE public.system_mail_stars (
  mail_id text NOT NULL,
  user_id text NOT NULL,
  starred_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_mail_stars_pkey PRIMARY KEY (mail_id, user_id)
);
CREATE TABLE public.system_mails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['announcement'::text, 'maintenance'::text, 'sponsor'::text, 'update'::text, 'lottery'::text, 'reward'::text, 'order'::text])) NOT VALI),
  status text NOT NULL DEFAULT 'published'::text,
  created_by text,
  author_name text,
  author_avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id text,
  image_url text,
  details_url text,
  metadata jsonb,
  CONSTRAINT system_mails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_guilds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  guild_id text NOT NULL,
  guild_name text NOT NULL,
  guild_icon text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_owner boolean NOT NULL DEFAULT false,
  CONSTRAINT user_guilds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discord_id text NOT NULL UNIQUE,
  username text NOT NULL,
  email text,
  points integer NOT NULL DEFAULT 0,
  role_level integer NOT NULL DEFAULT 1,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text, 'dnd'::text])),
  custom_status text,
  avatar text,
  last_seen timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.voice_participation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  channel_id text,
  join_at timestamp with time zone NOT NULL,
  join_ms bigint NOT NULL,
  leave_at timestamp with time zone,
  duration_seconds integer,
  awarded boolean DEFAULT false,
  award_amount numeric,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voice_participation_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallet_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  user_id text NOT NULL,
  amount numeric NOT NULL,
  type USER-DEFINED NOT NULL,
  balance_after numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id)
);