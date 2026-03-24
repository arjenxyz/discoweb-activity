-- ============================================================
-- Market Events — Otomatik borsa haberleri
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'market_events'
  ) THEN
    CREATE TABLE public.market_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(50) NOT NULL,
      -- 'big_buy' | 'big_sell' | 'full_exit' | 'ath' | 'ipo_launch'
      -- 'delist_warning' | 'treasury_support' | 'dividend_paid'
      -- 'held_through_dip' | 'big_winner' | 'market_crash' | 'recovery'
      guild_id TEXT,
      actor_id TEXT,
      headline TEXT NOT NULL,
      body TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;

  -- Eski şemadan geçiş: type -> event_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'market_events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE public.market_events
      ADD COLUMN event_type VARCHAR(50);

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'market_events' AND column_name = 'type'
    ) THEN
      UPDATE public.market_events SET event_type = type;
    END IF;

    ALTER TABLE public.market_events ALTER COLUMN event_type SET NOT NULL;
  END IF;

  ALTER TABLE public.market_events
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS guild_id TEXT,
    ADD COLUMN IF NOT EXISTS actor_id TEXT,
    ADD COLUMN IF NOT EXISTS headline TEXT,
    ADD COLUMN IF NOT EXISTS body TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

  CREATE INDEX IF NOT EXISTS idx_market_events_created
    ON public.market_events(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_market_events_guild
    ON public.market_events(guild_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_market_events_type
    ON public.market_events(event_type, created_at DESC);
END;
$$;
