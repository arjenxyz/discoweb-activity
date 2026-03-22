'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRealtimeDashboard } from '@/lib/utils/useRealtimeDashboard';
import {
  LuTrendingUp,
  LuTrendingDown,
  LuTriangleAlert,
  LuClock,
  LuX,
  LuCheck,
  LuInfo,
  LuZap,
  LuArrowLeft,
  LuCoins,
  LuChartBar,
  LuLandmark,
  LuCalendar,
  LuChevronDown,
  LuChevronUp,
  LuStar,
  LuShield,
  LuActivity,
  LuBriefcase,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────── */
type Listing = {
  guild_id: string;
  name: string;
  status: string;
  market_price: number;
  ipo_price: number;
  total_lots: number;
  founder_lots: number;
  public_lots: number;
  listed_at: string;
  circuit_breaker_until: string | null;
  active_penalties: string[];
  has_warning: boolean;
};

type Holding = {
  lot_count: number;
  avg_buy_price: number;
};

type MarketOrder = {
  id: string;
  type: 'buy' | 'sell';
  lot_count: number;
  remaining_lots: number;
  price_per_lot: number;
  status: string;
  created_at: string;
  expires_at: string;
};

type SelectedListing = Listing & {
  penalties: Array<{ id: string; type: string; reason: string; price_multiplier: number }>;
  events: Array<{ id: string; title: string; severity: string; description: string }>;
  treasury: { balance: number; total_collected: number; total_burned: number } | null;
};

/* ─── Helpers ────────────────────────────────────────── */
function priceDiff(listing: Listing) {
  const diff = listing.market_price - listing.ipo_price;
  const pct = listing.ipo_price > 0 ? (diff / listing.ipo_price) * 100 : 0;
  return { diff, pct };
}

function isCircuitBreakerActive(until: string | null) {
  return !!until && new Date(until) > new Date();
}

// Sunucu adından renk üret
function nameToColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-700',
    'from-blue-500 to-indigo-700',
    'from-emerald-500 to-teal-700',
    'from-rose-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-sky-700',
    'from-fuchsia-500 to-purple-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function nameInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Server Avatar ──────────────────────────────────── */
function ServerAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const gradient = nameToColor(name);
  const initials = nameInitials(name);
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm';
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-lg flex-shrink-0`}>
      {initials}
    </div>
  );
}

/* ─── Mini price bar ─────────────────────────────────── */
function PriceBar({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  const w = Math.min(Math.abs(pct) * 3, 100);
  return (
    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-white/8 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-28 rounded bg-white/10" />
        <div className="h-2.5 w-20 rounded bg-white/8" />
      </div>
      <div className="text-right space-y-2">
        <div className="h-3.5 w-16 rounded bg-white/10 ml-auto" />
        <div className="h-5 w-12 rounded-full bg-white/8 ml-auto" />
      </div>
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Aktif', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    suspended: { label: 'Askıda', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    pending: { label: 'Bekliyor', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-white/10 text-white/50 border-white/10' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

/* ─── Ticker Tape ────────────────────────────────────── */
function TickerTape({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) return null;
  const items = [...listings, ...listings];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-black/20 py-1.5">
      <div className="flex gap-6 animate-[tickerScroll_30s_linear_infinite] whitespace-nowrap">
        {items.map((l, i) => {
          const { pct } = priceDiff(l);
          const isUp = pct >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-mono shrink-0">
              <span className="text-white/50">{l.name}</span>
              <span className="text-white/80 font-semibold">{l.market_price.toLocaleString()}</span>
              <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '▲' : '▼'}{Math.abs(pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export default function MarketSection({ userId }: { userId?: string | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedListing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<MarketOrder[]>([]);
  const [myHolding, setMyHolding] = useState<Holding | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');

  // Order form
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderLots, setOrderLots] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Portfolio (holdings across all guilds)
  const [portfolio, setPortfolio] = useState<Array<Listing & { lot_count: number; avg_buy_price: number }>>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/member/market-listings'))
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Portfolio tab yükle
  useEffect(() => {
    if (activeTab !== 'portfolio') return;
    setPortfolioLoading(true);
    fetchWithCreds('/api/member/portfolio')
      .then((r) => r.json())
      .then((d) => {
        const holdings: Array<{ guild_id: string; lot_count: number; avg_buy_price: number }> = d.holdings ?? [];
        const enriched = holdings
          .filter((h) => h.lot_count > 0)
          .map((h) => {
            const listing = listings.find((l) => l.guild_id === h.guild_id);
            return listing ? { ...listing, lot_count: h.lot_count, avg_buy_price: h.avg_buy_price } : null;
          })
          .filter(Boolean) as Array<Listing & { lot_count: number; avg_buy_price: number }>;
        setPortfolio(enriched);
      })
      .catch(() => {})
      .finally(() => setPortfolioLoading(false));
  }, [activeTab, listings]);

  const refreshListings = useCallback(() => {
    fetch(apiUrl('/api/member/market-listings'))
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {});
  }, []);

  const openDetailRef = useRef<(guildId: string) => Promise<void>>();

  const selectedGuildId = selected?.guild_id ?? null;
  useRealtimeDashboard({
    guildId: selectedGuildId,
    userId: userId ?? null,
    onMarketListingUpdate: ({ guild_id, market_price }) => {
      setListings((prev) => prev.map((l) => (l.guild_id === guild_id ? { ...l, market_price } : l)));
      if (selected?.guild_id === guild_id) {
        setSelected((prev) => prev ? { ...prev, market_price } : prev);
      }
    },
    onMarketTradeInsert: ({ guild_id }) => {
      if (selected?.guild_id === guild_id) void openDetailRef.current?.(guild_id);
      refreshListings();
    },
    onMarketEventInsert: () => {
      if (selectedGuildId) void openDetailRef.current?.(selectedGuildId);
    },
  });

  const openDetail = async (guildId: string) => {
    setDetailLoading(true);
    setSelected(null);
    setOrderError(null);
    setOrderSuccess(false);
    setOrderLots('');
    setOrderPrice('');
    setOrderType('buy');

    const [detailRes, ordersRes] = await Promise.all([
      fetch(apiUrl(`/api/member/market-listings?guild_id=${guildId}`)).then((r) => r.json()),
      fetchWithCreds(`/api/member/market-orders?guild_id=${guildId}`)
        .then((r) => r.json())
        .catch(() => ({})),
    ]);

    const base = listings.find((l) => l.guild_id === guildId);
    if (base && detailRes.listing) {
      setSelected({
        ...base,
        penalties: detailRes.penalties ?? [],
        events: detailRes.events ?? [],
        treasury: detailRes.treasury ?? null,
      });
      setMyOrders(ordersRes.orders ?? []);
      setMyHolding(ordersRes.holding ?? null);
      setOrderPrice(String(detailRes.listing.market_price ?? ''));
    }
    setDetailLoading(false);
  };
  openDetailRef.current = openDetail;

  const submitOrder = async () => {
    if (!selected) return;
    setOrderLoading(true);
    setOrderError(null);
    setOrderSuccess(false);
    try {
      const res = await fetchWithCreds(
        `/api/member/market-order?guild_id=${selected.guild_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: orderType,
            lot_count: parseInt(orderLots),
            price_per_lot: parseFloat(orderPrice),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          insufficient_balance: 'Yetersiz bakiye.',
          insufficient_lots: 'Yeterli lot yok.',
          own_server: 'Kendi sunucunuza yatırım yapamazsınız.',
          max_portfolio_reached: 'En fazla 3 farklı sunucuya yatırım yapabilirsiniz.',
          vesting_locked: `Founder kilidi aktif. Satılabilir: ${data.vested_lots ?? 0} lot.`,
          circuit_breaker_active: 'Devre kesici aktif — trading geçici olarak durdurulmuş.',
          not_listed: 'Bu sunucu borsada listelenmemiş.',
        };
        throw new Error(msgs[data.error] ?? 'Emir gönderilemedi.');
      }
      setOrderSuccess(true);
      setOrderLots('');
      const refreshed = await fetchWithCreds(`/api/member/market-orders?guild_id=${selected.guild_id}`)
        .then((r) => r.json())
        .catch(() => ({}));
      setMyOrders(refreshed.orders ?? []);
      setMyHolding(refreshed.holding ?? null);
    } catch (e: unknown) {
      setOrderError(e instanceof Error ? e.message : 'Bir hata oluştu.');
    } finally {
      setOrderLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!selected) return;
    await fetchWithCreds(
      `/api/member/market-order?order_id=${orderId}&guild_id=${selected.guild_id}`,
      { method: 'DELETE' },
    );
    setMyOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  /* ── Shimmer keyframe ── */
  const shimmerStyle = `
    @keyframes titleShine { 0%,60%{background-position:100% 0} 100%{background-position:-100% 0} }
    @keyframes tickerScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes fadeSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulseGlow { 0%,100%{opacity:.6} 50%{opacity:1} }
  `;

  const titleShineStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(105deg, #a5b4fc 0%, #a5b4fc 35%, #e0e7ff 45%, #a5b4fc 55%, #a5b4fc 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl shadow-2xl">
        <style>{shimmerStyle}</style>
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="p-4 sm:p-6">
          <div className="h-5 w-40 rounded-lg bg-white/10 animate-pulse mb-1" />
          <div className="h-3 w-28 rounded bg-white/8 animate-pulse" />
        </div>
        <div className="divide-y divide-white/5">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </section>
    );
  }

  /* ── DETAIL VIEW ── */
  if (detailLoading || selected) {
    if (detailLoading && !selected) {
      return (
        <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl shadow-2xl">
          <style>{shimmerStyle}</style>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="divide-y divide-white/5 mt-4">
            <SkeletonRow /><SkeletonRow />
          </div>
        </section>
      );
    }
    if (!selected) return null;

    const { pct } = priceDiff(selected);
    const isUp = pct >= 0;
    const isCB = isCircuitBreakerActive(selected.circuit_breaker_until);
    const canTrade = !isCB && selected.status === 'approved';
    const totalValue = parseInt(orderLots || '0') * parseFloat(orderPrice || '0');
    const netSell = (totalValue * 0.98).toFixed(0);
    const plPct = myHolding && myHolding.avg_buy_price > 0
      ? ((selected.market_price - myHolding.avg_buy_price) / myHolding.avg_buy_price) * 100
      : null;
    const plValue = myHolding ? (selected.market_price - myHolding.avg_buy_price) * myHolding.lot_count : 0;

    return (
      <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl shadow-2xl">
        <style>{shimmerStyle}</style>

        {/* Glows */}
        <div className={`absolute top-0 right-0 w-80 h-80 ${isUp ? 'bg-emerald-500/8' : 'bg-red-500/8'} rounded-full blur-[120px] pointer-events-none transition-all duration-1000`} />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Header strip */}
        <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-white/5">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"
          >
            <LuArrowLeft className="w-3 h-3" />
            Geri
          </button>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <ServerAvatar name={selected.name} size="sm" />
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{selected.name}</p>
              <p className="text-[10px] text-white/30 font-mono truncate">{selected.guild_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <StatusBadge status={selected.status} />
            {isCB && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                <LuZap className="w-2.5 h-2.5" /> CB
              </span>
            )}
            {selected.has_warning && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                <LuTriangleAlert className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>

        {/* Price hero */}
        <div className="relative z-10 px-4 sm:px-6 py-5 border-b border-white/5" style={{ animation: 'fadeSlideUp .35s ease-out' }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter tabular-nums">
                  {selected.market_price.toLocaleString()}
                </span>
                <span className="text-lg font-semibold text-white/30">Papel</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                    isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {isUp ? <LuTrendingUp className="w-3.5 h-3.5" /> : <LuTrendingDown className="w-3.5 h-3.5" />}
                  {isUp ? '+' : ''}{pct.toFixed(2)}%
                </span>
                <span className="text-xs text-white/30">IPO'ya göre · {selected.ipo_price.toLocaleString()} P</span>
              </div>
            </div>
            {/* Papel gif */}
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border ${isUp ? 'border-emerald-500/30' : 'border-red-500/30'} shadow-lg`}>
                <Image
                  src="/gif/papel.gif"
                  alt="Papel"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'} border-2 border-black/60`} style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(isCB || selected.events.length > 0 || selected.penalties.length > 0) && (
          <div className="relative z-10 flex flex-col gap-2 px-4 sm:px-6 pt-4">
            {isCB && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-orange-500/20 bg-orange-500/8 px-4 py-3">
                <LuClock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-300">Devre Kesici Aktif</p>
                  <p className="text-[11px] text-orange-400/60 mt-0.5">Trading geçici olarak durdurulmuş.</p>
                </div>
              </div>
            )}
            {selected.events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
                <LuInfo className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-300">{ev.title}</p>
                  {ev.description && <p className="text-[11px] text-blue-400/60 mt-0.5">{ev.description}</p>}
                </div>
              </div>
            ))}
            {selected.penalties.map((pen) => (
              <div key={pen.id} className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                <LuShield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-300">{pen.type}</p>
                  <p className="text-[11px] text-red-400/60 mt-0.5">{pen.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-6 py-4">
          {[
            { icon: LuCoins, label: 'IPO Fiyatı', value: `${selected.ipo_price.toLocaleString()} P`, color: 'text-yellow-400' },
            { icon: LuChartBar, label: 'Halka Açık', value: `${selected.public_lots.toLocaleString()} lot`, color: 'text-blue-400' },
            { icon: LuLandmark, label: 'Hazine', value: selected.treasury ? `${selected.treasury.balance.toLocaleString()} P` : '—', color: 'text-purple-400' },
            { icon: LuCalendar, label: 'Listelenme', value: new Date(selected.listed_at).toLocaleDateString('tr-TR'), color: 'text-white/50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-1.5 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
              <div className={`flex items-center gap-1.5 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
              </div>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* My Holding card */}
        {myHolding && myHolding.lot_count > 0 && (
          <div className="relative z-10 mx-4 sm:mx-6 mb-4 rounded-2xl overflow-hidden">
            <div className={`absolute inset-0 ${plPct !== null && plPct >= 0 ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5' : 'bg-gradient-to-br from-red-500/15 to-red-500/5'}`} />
            <div className={`relative border ${plPct !== null && plPct >= 0 ? 'border-emerald-500/25' : 'border-red-500/25'} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <LuBriefcase className={`w-4 h-4 ${plPct !== null && plPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Pozisyonunuz</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-white/35 mb-0.5">Lot</p>
                  <p className="text-base font-black text-white">{myHolding.lot_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35 mb-0.5">Ort. Maliyet</p>
                  <p className="text-base font-black text-white">{myHolding.avg_buy_price.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35 mb-0.5">K/Z</p>
                  {plPct !== null ? (
                    <div>
                      <p className={`text-base font-black ${plPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                      </p>
                      <p className={`text-[10px] ${plPct >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {plValue >= 0 ? '+' : ''}{plValue.toFixed(0)} P
                      </p>
                    </div>
                  ) : <p className="text-base font-black text-white/30">—</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Form */}
        {canTrade && (
          <div className="relative z-10 mx-4 sm:mx-6 mb-4 rounded-2xl border border-white/8 bg-white/[0.04] overflow-hidden">
            {/* Buy/Sell toggle */}
            <div className="flex border-b border-white/8">
              <button
                onClick={() => { setOrderType('buy'); setOrderError(null); setOrderSuccess(false); }}
                className={`relative flex-1 py-3 text-sm font-bold transition-all overflow-hidden ${
                  orderType === 'buy'
                    ? 'bg-emerald-600/90 text-white'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/3'
                }`}
              >
                {orderType === 'buy' && <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
                ▲ Alış
              </button>
              <button
                onClick={() => { setOrderType('sell'); setOrderError(null); setOrderSuccess(false); }}
                className={`relative flex-1 py-3 text-sm font-bold transition-all overflow-hidden ${
                  orderType === 'sell'
                    ? 'bg-rose-600/90 text-white'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/3'
                }`}
              >
                {orderType === 'sell' && <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
                ▼ Satış
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">Lot Miktarı</p>
                  <input
                    type="number" min={1} placeholder="0"
                    value={orderLots}
                    onChange={(e) => setOrderLots(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition tabular-nums"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">Fiyat / Lot</p>
                  <input
                    type="number" min={1} placeholder="0"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition tabular-nums"
                  />
                </div>
              </div>

              {orderLots && orderPrice && (
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                  <span className="text-[11px] text-white/40">Toplam tutar</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{totalValue.toLocaleString()} P</span>
                    {orderType === 'sell' && (
                      <span className="block text-[10px] text-white/30">Net: {parseInt(netSell).toLocaleString()} P (-%2)</span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={submitOrder}
                disabled={orderLoading || !orderLots || !orderPrice}
                className={`relative w-full overflow-hidden rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg ${
                  orderType === 'buy'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
                }`}
              >
                {orderLoading ? 'Gönderiliyor...' : orderType === 'buy' ? 'Alış Emri Ver' : 'Satış Emri Ver'}
              </button>

              {orderError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2">
                  <LuX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{orderError}</p>
                </div>
              )}
              {orderSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                  <LuCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">Emir başarıyla iletildi.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Open Orders */}
        {myOrders.length > 0 && (
          <div className="relative z-10 mx-4 sm:mx-6 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Açık Emirlerim</p>
            <div className="flex flex-col gap-1.5">
              {myOrders.map((ord) => (
                <div key={ord.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    ord.type === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                  }`}>
                    {ord.type === 'buy' ? '▲ AL' : '▼ SAT'}
                  </span>
                  <span className="text-sm font-semibold text-white tabular-nums">{ord.remaining_lots.toLocaleString()}</span>
                  <span className="text-xs text-white/35 tabular-nums">@ {ord.price_per_lot.toLocaleString()} P</span>
                  <button
                    onClick={() => cancelOrder(ord.id)}
                    className="ml-auto p-1.5 rounded-full text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="İptal et"
                  >
                    <LuX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </section>
    );
  }

  /* ── LIST VIEW ── */
  const gainers = listings.filter((l) => priceDiff(l).pct > 0).sort((a, b) => priceDiff(b).pct - priceDiff(a).pct).slice(0, 1);
  const losers = listings.filter((l) => priceDiff(l).pct < 0).sort((a, b) => priceDiff(a).pct - priceDiff(b).pct).slice(0, 1);

  return (
    <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl shadow-2xl">
      <style>{shimmerStyle}</style>

      {/* Glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/6 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25">
            <LuActivity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight" style={titleShineStyle}>
              Yatırım Borsası
            </h2>
            <p className="text-[10px] text-white/35 font-medium">P2P · Anlık Fiyatlar</p>
          </div>
        </div>
        <button
          onClick={() => setInfoOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/40 hover:text-white hover:bg-white/8 transition-all"
        >
          <LuInfo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nasıl çalışır?</span>
          {infoOpen ? <LuChevronUp className="w-3 h-3" /> : <LuChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Ticker tape */}
      {listings.length > 0 && <TickerTape listings={listings} />}

      {/* Info panel */}
      {infoOpen && (
        <div className="relative z-10 mx-4 sm:mx-6 mt-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 p-4">
          <ul className="flex flex-col gap-1.5 text-xs text-indigo-300/80">
            {[
              'Aynı anda en fazla 3 farklı sunucuya yatırım yapabilirsiniz.',
              'Her işlemde %2 komisyon kesilir (satışta net tutardan).',
              'Emirler 7 gün sonra otomatik iptal edilir.',
              'Fiyatlar ve bakiyeler realtime güncellenir.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 flex gap-1 mx-4 sm:mx-6 mt-4 p-1 rounded-xl bg-white/[0.04] border border-white/8">
        {([['market', LuChartBar, 'Borsa'], ['portfolio', LuBriefcase, 'Portföyüm']] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/35 hover:text-white/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Market tab */}
      {activeTab === 'market' && (
        <div className="relative z-10 mt-3">
          {/* Top movers */}
          {(gainers.length > 0 || losers.length > 0) && (
            <div className="flex gap-2 px-4 sm:px-6 mb-3">
              {gainers.map((l) => {
                const { pct } = priceDiff(l);
                return (
                  <button key={l.guild_id} onClick={() => openDetail(l.guild_id)}
                    className="flex-1 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 hover:bg-emerald-500/15 transition-all">
                    <LuTrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-emerald-300 truncate">{l.name}</p>
                      <p className="text-[10px] text-emerald-400/60">+{pct.toFixed(2)}% ↑</p>
                    </div>
                  </button>
                );
              })}
              {losers.map((l) => {
                const { pct } = priceDiff(l);
                return (
                  <button key={l.guild_id} onClick={() => openDetail(l.guild_id)}
                    className="flex-1 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 hover:bg-red-500/15 transition-all">
                    <LuTrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-red-300 truncate">{l.name}</p>
                      <p className="text-[10px] text-red-400/60">{pct.toFixed(2)}% ↓</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
                <LuChartBar className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-sm text-white/40 font-medium">Henüz listede sunucu yok.</p>
              <p className="text-xs text-white/20">Onaylanan sunucular burada görünür.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {listings.map((listing, idx) => {
                const { pct } = priceDiff(listing);
                const isUp = pct >= 0;
                const isCB = isCircuitBreakerActive(listing.circuit_breaker_until);

                return (
                  <button
                    key={listing.guild_id}
                    onClick={() => openDetail(listing.guild_id)}
                    className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors group text-left"
                    style={{ animation: `fadeSlideUp ${0.1 + idx * 0.05}s ease-out both` }}
                  >
                    {/* Rank + avatar */}
                    <div className="relative flex-shrink-0">
                      <ServerAvatar name={listing.name} />
                      {idx < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                          <span className="text-[8px] font-black text-black">{idx + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{listing.name}</p>
                        {listing.has_warning && <LuTriangleAlert className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                        {isCB && <LuZap className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                      </div>
                      <PriceBar pct={pct} />
                      <p className="text-[10px] text-white/25 font-mono">{listing.public_lots.toLocaleString()} lot halka açık</p>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-base font-black text-white tabular-nums">{listing.market_price.toLocaleString()}<span className="text-xs font-medium text-white/30 ml-0.5">P</span></p>
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Portfolio tab */}
      {activeTab === 'portfolio' && (
        <div className="relative z-10 mt-3 pb-4">
          {portfolioLoading ? (
            <div className="divide-y divide-white/5"><SkeletonRow /><SkeletonRow /></div>
          ) : portfolio.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
                <LuStar className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-sm text-white/40 font-medium">Henüz yatırımınız yok.</p>
              <p className="text-xs text-white/20">Borsadan lot alarak portföy oluşturun.</p>
              <button
                onClick={() => setActiveTab('market')}
                className="mt-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-4 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-all"
              >
                Borsaya Git →
              </button>
            </div>
          ) : (
            <>
              {/* Portfolio summary */}
              <div className="mx-4 sm:mx-6 mb-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-3">Portföy Özeti</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-white/30">Yatırım</p>
                    <p className="text-sm font-bold text-white mt-0.5">{portfolio.length} sunucu</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Toplam Lot</p>
                    <p className="text-sm font-bold text-white mt-0.5">{portfolio.reduce((s, h) => s + h.lot_count, 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30">Toplam Değer</p>
                    <p className="text-sm font-bold text-white mt-0.5">{portfolio.reduce((s, h) => s + h.lot_count * h.market_price, 0).toLocaleString()} P</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {portfolio.map((h) => {
                  const plPct = h.avg_buy_price > 0 ? ((h.market_price - h.avg_buy_price) / h.avg_buy_price) * 100 : 0;
                  const plVal = (h.market_price - h.avg_buy_price) * h.lot_count;
                  const isUp = plPct >= 0;
                  return (
                    <button
                      key={h.guild_id}
                      onClick={() => openDetail(h.guild_id)}
                      className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <ServerAvatar name={h.name} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-bold text-sm text-white truncate">{h.name}</p>
                        <p className="text-[11px] text-white/30">{h.lot_count.toLocaleString()} lot · ort. {h.avg_buy_price.toFixed(1)} P</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-black text-white tabular-nums">{(h.lot_count * h.market_price).toLocaleString()} P</p>
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isUp ? '▲' : '▼'} {Math.abs(plPct).toFixed(2)}%
                          <span className="text-white/25 font-normal ml-1">({plVal >= 0 ? '+' : ''}{plVal.toFixed(0)} P)</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
