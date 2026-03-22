'use client';

import { useEffect, useState } from 'react';
import { LuTrendingUp, LuTrendingDown, LuTriangleAlert, LuClock, LuX, LuCheck } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

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

export default function MarketSection() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedListing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<MarketOrder[]>([]);
  const [myHolding, setMyHolding] = useState<Holding | null>(null);

  // Emir formu
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

    const [detailRes, ordersRes] = await Promise.all([
      fetch(apiUrl(`/api/member/market-listings?guild_id=${guildId}`)).then((r) => r.json()),
      fetchWithCreds(`/api/member/market-orders?guild_id=${guildId}`).then((r) => r.json()).catch(() => ({})),
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
      const res = await fetchWithCreds(`/api/member/market-order?guild_id=${selected.guild_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType,
          lot_count: parseInt(orderLots),
          price_per_lot: parseFloat(orderPrice),
        }),
      });
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
      // Emirleri yenile
      const refreshed = await fetchWithCreds(`/api/member/market-orders?guild_id=${selected.guild_id}`).then((r) => r.json()).catch(() => ({}));
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
    await fetchWithCreds(`/api/member/market-order?order_id=${orderId}&guild_id=${selected.guild_id}`, { method: 'DELETE' });
    setMyOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const priceDiff = (listing: Listing) => {
    const diff = listing.market_price - listing.ipo_price;
    const pct = listing.ipo_price > 0 ? (diff / listing.ipo_price) * 100 : 0;
    return { diff, pct };
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}
        </div>
      </section>
    );
  }

  if (selected) {
    const { diff, pct } = priceDiff(selected);
    const isCircuitBreaker = selected.circuit_breaker_until && new Date(selected.circuit_breaker_until) > new Date();

    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <button
          onClick={() => setSelected(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition"
        >
          ← Geri
        </button>

        <div className="flex flex-wrap items-start gap-3 mb-4">
          <div>
            <p className="text-xs text-white/40">Sunucu ID</p>
            <p className="font-mono text-sm">{selected.guild_id}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-white/40">Güncel Fiyat</p>
            <p className="text-xl font-bold">{selected.market_price.toLocaleString()} Papel</p>
            <p className={`text-xs ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(0)} (%{pct.toFixed(1)}) IPO'dan
            </p>
          </div>
        </div>

        {/* Uyarılar */}
        {isCircuitBreaker && (
          <div className="mb-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-300 flex gap-2">
            <LuClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Devre kesici aktif — trading geçici durdurulmuş.
          </div>
        )}
        {selected.has_warning && (
          <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300 flex gap-2">
            <LuTriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Bu sunucuda aktif ceza/uyarı mevcut.
          </div>
        )}
        {selected.events.map((ev) => (
          <div key={ev.id} className="mb-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-200">
            <strong>{ev.title}</strong>{ev.description ? ` — ${ev.description}` : ''}
          </div>
        ))}

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          {[
            { label: 'IPO Fiyatı', value: `${selected.ipo_price.toLocaleString()} P` },
            { label: 'Toplam Lot', value: selected.total_lots.toLocaleString() },
            { label: 'Hazine', value: selected.treasury ? `${selected.treasury.balance.toLocaleString()} P` : '—' },
            { label: 'Listelenme', value: new Date(selected.listed_at).toLocaleDateString('tr-TR') },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Mevcut Holding */}
        {myHolding && myHolding.lot_count > 0 && (
          <div className="mb-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="text-xs text-emerald-400 font-semibold mb-1">Portföyünüz</p>
            <p className="text-sm">{myHolding.lot_count.toLocaleString()} lot · Ortalama maliyet: {myHolding.avg_buy_price?.toFixed(2)} Papel</p>
          </div>
        )}

        {/* Emir Formu */}
        {!isCircuitBreaker && selected.status === 'approved' && (
          <div className="mb-4 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Emir Ver</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setOrderType('buy')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${orderType === 'buy' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >Alış</button>
              <button
                onClick={() => setOrderType('sell')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${orderType === 'sell' ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >Satış</button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                placeholder="Lot miktarı"
                value={orderLots}
                onChange={(e) => setOrderLots(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="number"
                min={1}
                placeholder="Fiyat (Papel/lot)"
                value={orderPrice}
                onChange={(e) => setOrderPrice(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={submitOrder}
                disabled={orderLoading || !orderLots || !orderPrice}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${orderType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
              >
                {orderLoading ? '...' : 'Gönder'}
              </button>
            </div>
            {orderLots && orderPrice && (
              <p className="mt-2 text-xs text-white/40">
                Toplam: {(parseInt(orderLots || '0') * parseFloat(orderPrice || '0')).toLocaleString()} Papel
                {orderType === 'buy' ? ' (komisyon hariç)' : ` → ${((parseInt(orderLots || '0') * parseFloat(orderPrice || '0')) * 0.98).toFixed(0)} Papel (komisyon sonrası)`}
              </p>
            )}
            {orderError && <p className="mt-2 text-xs text-red-400">{orderError}</p>}
            {orderSuccess && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                <LuCheck className="h-3.5 w-3.5" /> Emir başarıyla gönderildi.
              </div>
            )}
          </div>
        )}

        {/* Açık Emirlerim */}
        {myOrders.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Açık Emirlerim</p>
            <div className="space-y-1.5">
              {myOrders.map((ord) => (
                <div key={ord.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className={`text-xs font-semibold ${ord.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ord.type === 'buy' ? 'Alış' : 'Satış'}
                  </span>
                  <span className="text-white/70">{ord.remaining_lots.toLocaleString()} lot</span>
                  <span className="text-white/50">@ {ord.price_per_lot.toLocaleString()} P</span>
                  <button
                    onClick={() => cancelOrder(ord.id)}
                    className="ml-auto text-white/30 hover:text-red-400 transition"
                    title="İptal et"
                  >
                    <LuX className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <LuTrendingUp className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-semibold">Yatırım Borsası</h2>
      </div>

      {detailLoading && (
        <div className="text-sm text-white/40 py-8 text-center">Yükleniyor...</div>
      )}

      {!detailLoading && listings.length === 0 && (
        <div className="text-sm text-white/40 py-8 text-center">
          Henüz borsada listelenen sunucu yok.
        </div>
      )}

      <div className="space-y-2">
        {listings.map((listing) => {
          const { pct } = priceDiff(listing);
          const isUp = listing.market_price >= listing.ipo_price;
          const isSuspended = listing.status === 'suspended';
          const isBreaker = listing.circuit_breaker_until && new Date(listing.circuit_breaker_until) > new Date();

          return (
            <button
              key={listing.guild_id}
              onClick={() => openDetail(listing.guild_id)}
              className="w-full text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-white/40 truncate">{listing.guild_id}</p>
                    {listing.has_warning && (
                      <span className="text-yellow-400"><LuTriangleAlert className="h-3 w-3" /></span>
                    )}
                    {isSuspended && (
                      <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-400">Askıda</span>
                    )}
                    {isBreaker && (
                      <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-orange-400">CB</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">IPO: {listing.ipo_price.toLocaleString()} P</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{listing.market_price.toLocaleString()} P</p>
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <LuTrendingUp className="h-3 w-3" /> : <LuTrendingDown className="h-3 w-3" />}
                    {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
