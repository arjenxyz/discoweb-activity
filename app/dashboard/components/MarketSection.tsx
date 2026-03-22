'use client';

import { useEffect, useState } from 'react';
import {
  LuTrendingUp,
  LuTrendingDown,
  LuTriangleAlert,
  LuClock,
  LuX,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuInfo,
  LuZap,
  LuArrowLeft,
  LuCoins,
  LuChartBar,
  LuCalendar,
  LuLandmark,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────── */
type Listing = {
  guild_id: string;
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

/* ─── Sub-components ─────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-white/10" />
      </div>
      <div className="h-7 w-24 rounded bg-white/10 mb-1" />
      <div className="h-3 w-20 rounded bg-white/10 mb-3" />
      <div className="flex justify-between">
        <div className="h-3 w-28 rounded bg-white/10" />
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

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

/* ─── Main Component ─────────────────────────────────── */
export default function MarketSection() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedListing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<MarketOrder[]>([]);
  const [myHolding, setMyHolding] = useState<Holding | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Order form
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderLots, setOrderLots] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/member/market-listings'))
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      const refreshed = await fetchWithCreds(
        `/api/member/market-orders?guild_id=${selected.guild_id}`,
      )
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

  /* ── LOADING skeleton ── */
  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl p-3 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="h-4 w-36 rounded bg-white/10 animate-pulse mb-6" />
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  /* ── DETAIL VIEW ── */
  if (detailLoading || selected) {
    if (detailLoading && !selected) {
      return (
        <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl p-3 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="space-y-3 mt-10">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      );
    }

    if (!selected) return null;

    const { diff, pct } = priceDiff(selected);
    const isUp = diff >= 0;
    const isCB = isCircuitBreakerActive(selected.circuit_breaker_until);
    const canTrade = !isCB && selected.status === 'approved';
    const totalValue =
      parseInt(orderLots || '0') * parseFloat(orderPrice || '0');
    const netSell = (totalValue * 0.98).toFixed(0);
    const plPct =
      myHolding && myHolding.avg_buy_price > 0
        ? ((selected.market_price - myHolding.avg_buy_price) / myHolding.avg_buy_price) * 100
        : null;

    return (
      <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl p-3 sm:p-8 shadow-2xl flex flex-col gap-5">
        {/* Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Back button */}
        <button
          onClick={() => setSelected(null)}
          className="relative z-10 flex items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
        >
          <LuArrowLeft className="w-3.5 h-3.5" />
          Geri
        </button>

        {/* Hero */}
        <div className="relative z-10 rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Sunucu ID</p>
              <p className="font-mono text-sm text-white/80">{selected.guild_id}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selected.status} />
              {isCB && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                  <LuZap className="w-2.5 h-2.5" /> Devre Kesici
                </span>
              )}
              {selected.has_warning && (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
                  <LuTriangleAlert className="w-2.5 h-2.5" /> Uyarı
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {selected.market_price.toLocaleString()}
              <span className="text-lg font-semibold text-white/40 ml-1.5">Papel</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-sm text-white/40">IPO: {selected.ipo_price.toLocaleString()} P</span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                  isUp
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {isUp ? <LuTrendingUp className="w-3 h-3" /> : <LuTrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}{pct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* CB Warning */}
        {isCB && (
          <div className="relative z-10 flex items-start gap-2.5 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-4">
            <LuClock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-300">Devre Kesici Aktif</p>
              <p className="text-xs text-orange-400/70 mt-0.5">Trading geçici olarak durdurulmuş.</p>
            </div>
          </div>
        )}

        {/* Events */}
        {selected.events.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2">
            {selected.events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4"
              >
                <LuInfo className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300">{ev.title}</p>
                  {ev.description && (
                    <p className="text-xs text-blue-400/70 mt-0.5">{ev.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Penalties */}
        {selected.penalties.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2">
            {selected.penalties.map((pen) => (
              <div
                key={pen.id}
                className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 p-4"
              >
                <LuTriangleAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">{pen.type}</p>
                  <p className="text-xs text-red-400/70 mt-0.5">{pen.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4-stat grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: LuCoins, label: 'IPO Fiyatı', value: `${selected.ipo_price.toLocaleString()} P` },
            { icon: LuChartBar, label: 'Toplam Lot', value: selected.total_lots.toLocaleString() },
            {
              icon: LuLandmark,
              label: 'Hazine',
              value: selected.treasury ? `${selected.treasury.balance.toLocaleString()} P` : '—',
            },
            {
              icon: LuCalendar,
              label: 'Listelenme',
              value: new Date(selected.listed_at).toLocaleDateString('tr-TR'),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl p-3 sm:p-4"
            >
              <div className="flex items-center gap-1.5 text-white/40">
                <Icon className="w-3.5 h-3.5" />
                <p className="text-[10px] uppercase tracking-wider">{label}</p>
              </div>
              <p className="text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* My Portfolio */}
        {myHolding && myHolding.lot_count > 0 && (
          <div className="relative z-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 backdrop-blur-xl p-4">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Portföyünüz</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-white">{myHolding.lot_count.toLocaleString()} lot</p>
                <p className="text-xs text-white/50 mt-0.5">
                  Ort. maliyet: {myHolding.avg_buy_price?.toFixed(2)} Papel/lot
                </p>
              </div>
              {plPct !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    plPct >= 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Order Form */}
        {canTrade && (
          <div className="relative z-10 rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Emir Ver</p>

            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 mb-4 p-1 rounded-full bg-white/5 border border-white/8">
              <button
                onClick={() => { setOrderType('buy'); setOrderError(null); setOrderSuccess(false); }}
                className={`relative flex-1 rounded-full py-2 text-sm font-semibold transition-all overflow-hidden ${
                  orderType === 'buy'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {orderType === 'buy' && (
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                )}
                Alış
              </button>
              <button
                onClick={() => { setOrderType('sell'); setOrderError(null); setOrderSuccess(false); }}
                className={`relative flex-1 rounded-full py-2 text-sm font-semibold transition-all overflow-hidden ${
                  orderType === 'sell'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {orderType === 'sell' && (
                  <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                )}
                Satış
              </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="number"
                min={1}
                placeholder="Lot miktarı"
                value={orderLots}
                onChange={(e) => setOrderLots(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition"
              />
              <input
                type="number"
                min={1}
                placeholder="Fiyat / lot"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition"
              />
            </div>

            {/* Total */}
            {orderLots && orderPrice && (
              <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-white/40">Toplam</span>
                <span className="text-sm font-semibold text-white">
                  {totalValue.toLocaleString()} Papel
                  {orderType === 'sell' && (
                    <span className="text-white/40 text-xs ml-1.5">→ {parseInt(netSell).toLocaleString()} P (komisyon)</span>
                  )}
                  {orderType === 'buy' && (
                    <span className="text-white/40 text-xs ml-1.5">(+%2 komisyon)</span>
                  )}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submitOrder}
              disabled={orderLoading || !orderLots || !orderPrice}
              className={`relative w-full overflow-hidden rounded-full py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                orderType === 'buy'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/20'
              }`}
            >
              <span className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1s_ease-in-out] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {orderLoading ? 'Gönderiliyor...' : orderType === 'buy' ? 'Alış Emri Ver' : 'Satış Emri Ver'}
            </button>

            {/* Feedback */}
            {orderError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2">
                <LuX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{orderError}</p>
              </div>
            )}
            {orderSuccess && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                <LuCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">Emir başarıyla iletildi.</p>
              </div>
            )}
          </div>
        )}

        {/* Open Orders */}
        {myOrders.length > 0 && (
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Açık Emirlerim</p>
            <div className="flex flex-col gap-2">
              {myOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      ord.type === 'buy'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {ord.type === 'buy' ? 'Alış' : 'Satış'}
                  </span>
                  <span className="text-sm text-white/80 font-semibold">
                    {ord.remaining_lots.toLocaleString()} lot
                  </span>
                  <span className="text-xs text-white/40">@ {ord.price_per_lot.toLocaleString()} P</span>
                  <button
                    onClick={() => cancelOrder(ord.id)}
                    className="ml-auto p-1.5 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="İptal et"
                  >
                    <LuX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom back button for mobile */}
        <button
          onClick={() => setSelected(null)}
          className="relative z-10 flex items-center justify-center gap-1.5 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 sm:hidden"
        >
          <LuArrowLeft className="w-3.5 h-3.5" />
          Geri
        </button>
      </section>
    );
  }

  /* ── LIST VIEW ── */
  const titleShineStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(105deg, #a5b4fc 0%, #a5b4fc 35%, #e0e7ff 45%, #a5b4fc 55%, #a5b4fc 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };

  return (
    <section className="relative overflow-hidden rounded-none border-0 bg-white/[0.04] backdrop-blur-2xl p-3 sm:p-8 shadow-2xl flex flex-col gap-5">
      <style>{`@keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>

      {/* Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg shadow-indigo-500/20">
            <LuTrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight" style={titleShineStyle}>
              Yatırım Borsası
            </h2>
            <p className="text-[10px] sm:text-[11px] text-white/40 font-medium hidden sm:block">
              Onaylı sunucular · P2P Emir
            </p>
          </div>
        </div>

        {/* Info toggle */}
        <button
          onClick={() => setInfoOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <LuInfo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nasıl çalışır?</span>
          {infoOpen ? <LuChevronUp className="w-3 h-3" /> : <LuChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Info Banner */}
      {infoOpen && (
        <div className="relative z-10 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 p-4">
          <ul className="flex flex-col gap-1.5 text-xs text-indigo-300/80">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              Aynı anda en fazla <strong className="text-indigo-200">3 farklı sunucuya</strong> yatırım yapabilirsiniz.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              Her işlemde <strong className="text-indigo-200">%2 komisyon</strong> kesilir (satışta net tutardan).
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              Emirler <strong className="text-indigo-200">7 gün</strong> sonra otomatik iptal edilir.
            </li>
          </ul>
        </div>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
            <LuChartBar className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-sm text-white/40 font-medium">Henüz listede sunucu yok.</p>
          <p className="text-xs text-white/25">Onaylanan sunucular burada görünür.</p>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-3">
          {listings.map((listing) => {
            const { pct } = priceDiff(listing);
            const isUp = listing.market_price >= listing.ipo_price;
            const isCB = isCircuitBreakerActive(listing.circuit_breaker_until);
            const publicPct =
              listing.total_lots > 0
                ? ((listing.public_lots / listing.total_lots) * 100).toFixed(0)
                : '0';

            return (
              <div
                key={listing.guild_id}
                className={`group relative overflow-hidden rounded-2xl border bg-white/[0.04] backdrop-blur-xl p-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-xl cursor-pointer ${
                  isUp
                    ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5'
                    : 'border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/5'
                }`}
                onClick={() => openDetail(listing.guild_id)}
              >
                {/* Left color border */}
                <div
                  className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
                    isUp ? 'bg-emerald-500/60' : 'bg-red-500/60'
                  }`}
                />

                {/* Top row */}
                <div className="flex items-center gap-2 mb-3 pl-2">
                  <p className="font-mono text-xs text-white/40 truncate flex-1 min-w-0">
                    {listing.guild_id}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={listing.status} />
                    {listing.has_warning && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
                        <LuTriangleAlert className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {isCB && (
                      <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
                        CB
                      </span>
                    )}
                  </div>
                </div>

                {/* Price row */}
                <div className="flex items-end justify-between pl-2 mb-3">
                  <div>
                    <p className="text-xl font-black text-white tracking-tight">
                      {listing.market_price.toLocaleString()}
                      <span className="text-sm font-semibold text-white/40 ml-1">P</span>
                    </p>
                    <p className="text-xs text-white/35 mt-0.5">IPO: {listing.ipo_price.toLocaleString()} P</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      isUp
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {isUp ? (
                      <LuTrendingUp className="w-3 h-3" />
                    ) : (
                      <LuTrendingDown className="w-3 h-3" />
                    )}
                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pl-2">
                  <p className="text-xs text-white/30">
                    {listing.public_lots.toLocaleString()} lot halka açık
                    <span className="text-white/20 ml-1">({publicPct}%)</span>
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetail(listing.guild_id); }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all group-hover:border-white/20"
                  >
                    Detay →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
