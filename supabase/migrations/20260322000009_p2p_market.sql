-- Aşama 5: P2P Borsa — market_orders, market_trades

-- Açık piyasa emirleri
create table if not exists public.market_orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  guild_id       text not null,
  type           text not null,          -- 'buy' | 'sell'
  lot_count      integer not null,
  remaining_lots integer not null,       -- partial fill için
  price_per_lot  numeric not null,
  status         text not null default 'open',  -- open | filled | partial | cancelled | expired
  filled_at      timestamptz,
  expires_at     timestamptz not null,          -- created_at + 7 gün
  created_at     timestamptz not null default now(),
  constraint valid_order_type check (type in ('buy','sell')),
  constraint valid_order_status check (status in ('open','filled','partial','cancelled','expired')),
  constraint positive_lots check (lot_count > 0 and remaining_lots >= 0),
  constraint positive_price check (price_per_lot > 0)
);

-- Fiyat-zaman önceliği için index
create index if not exists idx_order_book
  on public.market_orders (guild_id, type, price_per_lot desc, created_at asc)
  where status in ('open','partial');

-- Gerçekleşen işlemler
create table if not exists public.market_trades (
  id              uuid primary key default gen_random_uuid(),
  guild_id        text not null,
  buyer_user_id   text not null,
  seller_user_id  text not null,
  lot_count       integer not null,
  price_per_lot   numeric not null,
  total_amount    numeric not null,
  platform_fee    numeric not null default 0,
  buy_order_id    uuid references public.market_orders(id),
  sell_order_id   uuid references public.market_orders(id),
  traded_at       timestamptz not null default now(),
  constraint prevent_self_trade check (buyer_user_id != seller_user_id),
  constraint positive_trade_lots check (lot_count > 0)
);

-- Wash trading takibi için index
create index if not exists idx_trades_pair_time
  on public.market_trades (guild_id, buyer_user_id, seller_user_id, traded_at desc);

-- market_events — developer piyasa olayları
create table if not exists public.market_events (
  id                  uuid primary key default gen_random_uuid(),
  guild_id            text,              -- NULL = genel piyasa
  type                text not null,     -- news | price_adjustment | papel_injection | freeze | unfreeze
  severity            text not null default 'info',  -- info | warning | critical
  title               text not null,
  description         text,
  price_impact        numeric default 0,  -- event_multiplier = product(price_impact + 1)
  is_active           boolean not null default true,
  created_by_user_id  text,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz,
  constraint valid_event_type check (type in ('news','price_adjustment','papel_injection','freeze','unfreeze')),
  constraint valid_severity check (severity in ('info','warning','critical'))
);

-- server_penalties — sunucu cezaları
create table if not exists public.server_penalties (
  id                  uuid primary key default gen_random_uuid(),
  guild_id            text not null,
  type                text not null,     -- warning | fine | suspension | delist
  reason              text,
  fine_amount         numeric default 0,
  price_multiplier    numeric not null default 1.0,
  is_active           boolean not null default true,
  issued_by_user_id   text,
  issued_at           timestamptz not null default now(),
  lifted_at           timestamptz,
  lifted_by_user_id   text,
  constraint valid_penalty_type check (type in ('warning','fine','suspension','delist'))
);
