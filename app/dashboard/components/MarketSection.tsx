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
  LuShield,
  LuBriefcase,
  LuStar,
  LuActivity,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { VideoBackground } from '@/app/dashboard/components/VideoBackground';

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
type Holding = { lot_count: number; avg_buy_price: number };
type MarketOrder = {
  id: string; type: 'buy' | 'sell';
  lot_count: number; remaining_lots: number;
  price_per_lot: number; status: string;
  created_at: string; expires_at: string;
};
type SelectedListing = Listing & {
  penalties: Array<{ id: string; type: string; reason: string; price_multiplier: number }>;
  events: Array<{ id: string; title: string; severity: string; description: string }>;
  treasury: { balance: number; total_collected: number; total_burned: number } | null;
};

/* ─── Helpers ─────────────────────────────────────────── */
function priceDiff(l: Listing) {
  const diff = l.market_price - l.ipo_price;
  const pct = l.ipo_price > 0 ? (diff / l.ipo_price) * 100 : 0;
  return { diff, pct };
}
function isCB(until: string | null) { return !!until && new Date(until) > new Date(); }

function nameColor(name: string) {
  const g = ['from-violet-500 to-purple-700','from-blue-500 to-indigo-700','from-emerald-500 to-teal-700',
    'from-rose-500 to-pink-700','from-amber-500 to-orange-700','from-cyan-500 to-sky-700','from-fuchsia-500 to-purple-700'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return g[Math.abs(h) % g.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

/* ─── Sub-components ─────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm'|'md'|'lg' }) {
  const cls = size === 'sm' ? 'w-9 h-9 text-xs rounded-xl' : size === 'lg' ? 'w-16 h-16 text-xl rounded-2xl' : 'w-12 h-12 text-sm rounded-2xl';
  return (
    <div className={`${cls} bg-gradient-to-br ${nameColor(name)} flex items-center justify-center font-black text-white shadow-lg flex-shrink-0 select-none`}>
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    suspended: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    pending:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  const labels: Record<string, string> = { approved: 'Aktif', suspended: 'Askıda', pending: 'Bekliyor' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${m[status] ?? 'bg-white/10 text-white/40 border-white/10'}`}>
      {labels[status] ?? status}
    </span>
  );
}

/* ─── Ticker ─────────────────────────────────────────── */
function Ticker({ listings }: { listings: Listing[] }) {
  if (!listings.length) return null;
  const doubled = [...listings, ...listings, ...listings];
  return (
    <div className="relative overflow-hidden py-2.5 border-y border-white/[0.08] bg-black/40 backdrop-blur-sm">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />
      <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'tickerMove 40s linear infinite' }}>
        {doubled.map((l, i) => {
          const { pct } = priceDiff(l);
          const up = pct >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 text-[11px] shrink-0 font-mono">
              <span className="text-white/50 font-semibold">{l.name}</span>
              <span className="text-white font-black tabular-nums">{l.market_price.toLocaleString()}<span className="text-white/30 text-[9px] ml-0.5">P</span></span>
              <span className={`font-black text-[10px] px-1.5 py-0.5 rounded-full ${up ? 'text-emerald-300 bg-emerald-500/20' : 'text-red-300 bg-red-500/20'}`}>
                {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/8" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-28 rounded-lg bg-white/10" />
          <div className="h-2.5 w-20 rounded bg-white/6" />
        </div>
        <div className="h-5 w-14 rounded-full bg-white/8" />
      </div>
      <div className="h-8 w-32 rounded-lg bg-white/10 mb-2" />
      <div className="h-1.5 w-full rounded-full bg-white/6" />
    </div>
  );
}

/* ─── CSS keyframes ──────────────────────────────────── */
const CSS = `
@keyframes titleShine { 0%,60%{background-position:100% 0} 100%{background-position:-100% 0} }
@keyframes tickerMove  { 0%{transform:translateX(0)} 100%{transform:translateX(-33.333%)} }
@keyframes fadeUp      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes glowPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes shimmer     { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
@keyframes countUp     { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
`;

/* ─── Main ───────────────────────────────────────────── */
export default function MarketSection({ userId }: { userId?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedListing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<MarketOrder[]>([]);
  const [myHolding, setMyHolding] = useState<Holding | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [tab, setTab] = useState<'market'|'portfolio'>('market');
  const [portfolio, setPortfolio] = useState<Array<Listing & { lot_count: number; avg_buy_price: number }>>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [orderType, setOrderType] = useState<'buy'|'sell'>('buy');
  const [orderLots, setOrderLots] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string|null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/member/market-listings'))
      .then(r => r.json()).then(d => setListings(d.listings ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'portfolio') return;
    setPortfolioLoading(true);
    fetchWithCreds('/api/member/portfolio').then(r => r.json()).then(d => {
      const holdings: Array<{guild_id:string;lot_count:number;avg_buy_price:number}> = d.holdings ?? [];
      setPortfolio(holdings.filter(h => h.lot_count > 0).map(h => {
        const l = listings.find(x => x.guild_id === h.guild_id);
        return l ? { ...l, lot_count: h.lot_count, avg_buy_price: h.avg_buy_price } : null;
      }).filter(Boolean) as Array<Listing & {lot_count:number;avg_buy_price:number}>);
    }).catch(() => {}).finally(() => setPortfolioLoading(false));
  }, [tab, listings]);

  const refreshListings = useCallback(() => {
    fetch(apiUrl('/api/member/market-listings')).then(r=>r.json()).then(d=>setListings(d.listings??[])).catch(()=>{});
  }, []);

  const openDetailRef = useRef<(guildId: string) => Promise<void>>();
  const selectedGuildId = selected?.guild_id ?? null;

  useRealtimeDashboard({
    guildId: selectedGuildId, userId: userId ?? null,
    onMarketListingUpdate: ({ guild_id, market_price }) => {
      setListings(prev => prev.map(l => l.guild_id === guild_id ? { ...l, market_price } : l));
      if (selected?.guild_id === guild_id) setSelected(prev => prev ? { ...prev, market_price } : prev);
    },
    onMarketTradeInsert: ({ guild_id }) => {
      if (selected?.guild_id === guild_id) void openDetailRef.current?.(guild_id);
      refreshListings();
    },
    onMarketEventInsert: () => { if (selectedGuildId) void openDetailRef.current?.(selectedGuildId); },
  });

  const openDetail = async (guildId: string) => {
    setDetailLoading(true); setSelected(null);
    setOrderError(null); setOrderSuccess(false); setOrderLots(''); setOrderPrice(''); setOrderType('buy');
    const [dr, or] = await Promise.all([
      fetch(apiUrl(`/api/member/market-listings?guild_id=${guildId}`)).then(r=>r.json()),
      fetchWithCreds(`/api/member/market-orders?guild_id=${guildId}`).then(r=>r.json()).catch(()=>({})),
    ]);
    const base = listings.find(l => l.guild_id === guildId);
    if (base && dr.listing) {
      setSelected({ ...base, penalties: dr.penalties??[], events: dr.events??[], treasury: dr.treasury??null });
      setMyOrders(or.orders??[]); setMyHolding(or.holding??null);
      setOrderPrice(String(dr.listing.market_price??''));
    }
    setDetailLoading(false);
  };
  openDetailRef.current = openDetail;

  const submitOrder = async () => {
    if (!selected) return;
    setOrderLoading(true); setOrderError(null); setOrderSuccess(false);
    try {
      const res = await fetchWithCreds(`/api/member/market-order?guild_id=${selected.guild_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: orderType, lot_count: parseInt(orderLots), price_per_lot: parseFloat(orderPrice) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs: Record<string,string> = {
          insufficient_balance: 'Yetersiz bakiye.',
          insufficient_lots: 'Yeterli lot yok.',
          own_server: 'Kendi sunucunuza yatırım yapamazsınız.',
          max_portfolio_reached: 'Maksimum 3 farklı sunucu yatırımı.',
          vesting_locked: `Founder kilidi. Satılabilir: ${data.vested_lots??0} lot.`,
          circuit_breaker_active: 'Devre kesici aktif.',
          not_listed: 'Bu sunucu listede değil.',
        };
        throw new Error(msgs[data.error] ?? 'Emir gönderilemedi.');
      }
      setOrderSuccess(true); setOrderLots('');
      const refreshed = await fetchWithCreds(`/api/member/market-orders?guild_id=${selected.guild_id}`).then(r=>r.json()).catch(()=>({}));
      setMyOrders(refreshed.orders??[]); setMyHolding(refreshed.holding??null);
    } catch(e) { setOrderError(e instanceof Error ? e.message : 'Bir hata oluştu.'); }
    finally { setOrderLoading(false); }
  };

  const cancelOrder = async (orderId: string) => {
    if (!selected) return;
    await fetchWithCreds(`/api/member/market-order?order_id=${orderId}&guild_id=${selected.guild_id}`, { method: 'DELETE' });
    setMyOrders(prev => prev.filter(o => o.id !== orderId));
  };

  /* ─ Loading ─ */
  if (loading) return (
    <section className="relative min-h-[400px] overflow-hidden bg-[#080a0f]">
      <style>{CSS}</style>
      <VideoBackground videoRef={videoRef} />
      <div className="relative z-10 p-5 sm:p-8 space-y-3">
        <div className="h-6 w-44 rounded-xl bg-white/8 animate-pulse" />
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </section>
  );

  /* ─ Detail view ─ */
  if (detailLoading || selected) {
    if (detailLoading && !selected) return (
      <section className="relative min-h-[400px] overflow-hidden bg-[#080a0f]">
        <style>{CSS}</style>
        <VideoBackground videoRef={videoRef} />
        <div className="relative z-10 p-5 sm:p-8 space-y-3 mt-4"><SkeletonCard /><SkeletonCard /></div>
      </section>
    );
    if (!selected) return null;

    const { pct } = priceDiff(selected);
    const up = pct >= 0;
    const cb = isCB(selected.circuit_breaker_until);
    const canTrade = !cb && selected.status === 'approved';
    const totalVal = parseInt(orderLots||'0') * parseFloat(orderPrice||'0');
    const netSell = (totalVal * 0.98).toFixed(0);
    const plPct = myHolding && myHolding.avg_buy_price > 0
      ? ((selected.market_price - myHolding.avg_buy_price) / myHolding.avg_buy_price) * 100 : null;
    const plVal = myHolding ? (selected.market_price - myHolding.avg_buy_price) * myHolding.lot_count : 0;

    return (
      <section className="relative overflow-hidden bg-[#080a0f]">
        <style>{CSS}</style>
        <VideoBackground videoRef={videoRef} />

        {/* Hero glow */}
        <div className={`absolute top-0 inset-x-0 h-72 pointer-events-none transition-all duration-1000 ${up ? 'bg-gradient-to-b from-emerald-500/12 to-transparent' : 'bg-gradient-to-b from-red-500/12 to-transparent'}`} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full blur-[120px] pointer-events-none bg-indigo-500/10" style={{animation:'glowPulse 4s ease-in-out infinite'}} />

        {/* Back nav */}
        <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <button onClick={() => setSelected(null)}
            className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all active:scale-95 backdrop-blur-sm">
            <LuArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            Geri
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <Avatar name={selected.name} size="sm" />
            <div className="min-w-0">
              <p className="font-black text-sm text-white truncate">{selected.name}</p>
              <p className="text-[10px] text-white/25 font-mono">{selected.guild_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={selected.status} />
            {cb && <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400"><LuZap className="w-2.5 h-2.5"/>CB</span>}
          </div>
        </div>

        {/* Price hero */}
        <div className="relative z-10 px-5 sm:px-8 py-7" style={{animation:'fadeUp .3s ease-out both'}}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-widest mb-2 font-semibold">Güncel Fiyat</p>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter tabular-nums leading-none" style={{animation:'countUp .4s cubic-bezier(.34,1.56,.64,1) both'}}>
                  {selected.market_price.toLocaleString()}
                </span>
                <span className="text-xl font-bold text-white/25 mb-1">Papel</span>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-black border ${up ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-red-500/15 text-red-300 border-red-500/25'}`}>
                  {up ? <LuTrendingUp className="w-4 h-4"/> : <LuTrendingDown className="w-4 h-4"/>}
                  {up?'+':''}{pct.toFixed(2)}%
                </span>
                <span className="text-xs text-white/25">IPO: {selected.ipo_price.toLocaleString()} P</span>
              </div>
            </div>

            {/* Papel gif */}
            <div className="relative flex-shrink-0" style={{animation:'fadeUp .5s ease-out both'}}>
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-2 shadow-2xl ${up ? 'border-emerald-500/40 shadow-emerald-500/20' : 'border-red-500/40 shadow-red-500/20'}`}>
                <Image src="/gif/papel.gif" alt="Papel" width={96} height={96} className="w-full h-full object-cover" unoptimized />
              </div>
              <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-[#080a0f] flex items-center justify-center ${up ? 'bg-emerald-500' : 'bg-red-500'}`} style={{animation:'glowPulse 1.5s ease-in-out infinite'}}>
                {up ? <LuTrendingUp className="w-3 h-3 text-white"/> : <LuTrendingDown className="w-3 h-3 text-white"/>}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(cb || selected.events.length > 0 || selected.penalties.length > 0) && (
          <div className="relative z-10 space-y-2 px-5 sm:px-8 pb-4">
            {cb && (
              <div className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/8 backdrop-blur-sm px-4 py-3">
                <LuClock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5"/>
                <div><p className="text-xs font-bold text-orange-300">Devre Kesici Aktif</p><p className="text-[11px] text-orange-400/60 mt-0.5">Trading geçici olarak durdurulmuş.</p></div>
              </div>
            )}
            {selected.events.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/8 backdrop-blur-sm px-4 py-3">
                <LuInfo className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
                <div><p className="text-xs font-bold text-blue-300">{ev.title}</p>{ev.description && <p className="text-[11px] text-blue-400/60 mt-0.5">{ev.description}</p>}</div>
              </div>
            ))}
            {selected.penalties.map(p => (
              <div key={p.id} className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 backdrop-blur-sm px-4 py-3">
                <LuShield className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
                <div><p className="text-xs font-bold text-red-300">{p.type}</p><p className="text-[11px] text-red-400/60 mt-0.5">{p.reason}</p></div>
              </div>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 sm:px-8 pb-5">
          {[
            { icon: LuCoins,    label: 'IPO Fiyatı',   value: `${selected.ipo_price.toLocaleString()} P`, accent: 'text-yellow-400', bg: 'bg-yellow-500/8 border-yellow-500/15' },
            { icon: LuChartBar, label: 'Halka Açık Lot', value: selected.public_lots.toLocaleString(),      accent: 'text-blue-400',   bg: 'bg-blue-500/8 border-blue-500/15' },
            { icon: LuLandmark, label: 'Hazine',         value: selected.treasury ? `${selected.treasury.balance.toLocaleString()} P` : '—', accent: 'text-purple-400', bg: 'bg-purple-500/8 border-purple-500/15' },
            { icon: LuCalendar, label: 'Listelenme',     value: new Date(selected.listed_at).toLocaleDateString('tr-TR'), accent: 'text-white/50', bg: 'bg-white/5 border-white/10' },
          ].map(({ icon: Icon, label, value, accent, bg }) => (
            <div key={label} className={`rounded-2xl border ${bg} backdrop-blur-sm p-3.5 space-y-2`}>
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${accent}`}/>
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{label}</p>
              </div>
              <p className={`text-sm font-black ${accent}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Holding card */}
        {myHolding && myHolding.lot_count > 0 && (
          <div className="relative z-10 mx-5 sm:mx-8 mb-5 rounded-3xl overflow-hidden" style={{animation:'fadeUp .4s ease-out both'}}>
            <div className={`absolute inset-0 ${plPct !== null && plPct >= 0 ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/8 to-transparent' : 'bg-gradient-to-br from-red-500/20 via-red-500/8 to-transparent'}`}/>
            <div className={`relative border rounded-3xl p-5 backdrop-blur-sm ${plPct !== null && plPct >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-4">
                <LuBriefcase className={`w-4 h-4 ${plPct !== null && plPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}/>
                <p className="text-xs font-black uppercase tracking-widest text-white/50">Pozisyonunuz</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Lot', value: myHolding.lot_count.toLocaleString(), sub: null },
                  { label: 'Ort. Maliyet', value: myHolding.avg_buy_price.toFixed(1), sub: 'P/lot' },
                  {
                    label: 'K/Z',
                    value: plPct !== null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—',
                    sub: plPct !== null ? `${plVal >= 0 ? '+' : ''}${Math.round(plVal).toLocaleString()} P` : null,
                    colored: true,
                  },
                ].map(({ label, value, sub, colored }) => (
                  <div key={label}>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-lg font-black leading-none ${colored && plPct !== null ? plPct >= 0 ? 'text-emerald-400' : 'text-red-400' : 'text-white'}`}>{value}</p>
                    {sub && <p className={`text-[10px] mt-0.5 ${colored && plPct !== null ? plPct >= 0 ? 'text-emerald-400/50' : 'text-red-400/50' : 'text-white/30'}`}>{sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order form */}
        {canTrade && (
          <div className="relative z-10 mx-5 sm:mx-8 mb-5 rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden" style={{animation:'fadeUp .5s ease-out both'}}>
            {/* Buy/Sell toggle */}
            <div className="flex">
              {(['buy','sell'] as const).map(t => (
                <button key={t} onClick={() => { setOrderType(t); setOrderError(null); setOrderSuccess(false); }}
                  className={`relative flex-1 py-3.5 text-sm font-black tracking-wide transition-all overflow-hidden ${
                    orderType === t
                      ? t === 'buy' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/3'
                  }`}>
                  {orderType === t && <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{animation:'shimmer 2s ease-in-out infinite'}}/>}
                  {t === 'buy' ? '▲ ALIŞ' : '▼ SATIŞ'}
                </button>
              ))}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Lot Miktarı', key: 'lots', val: orderLots, set: setOrderLots },
                  { label: 'Fiyat / Lot',  key: 'price', val: orderPrice, set: setOrderPrice },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">{label}</p>
                    <input type="number" min={1} placeholder="0" value={val} onChange={e => set(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition tabular-nums backdrop-blur-sm"/>
                  </div>
                ))}
              </div>

              {orderLots && orderPrice && (
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-black/30 px-4 py-3 backdrop-blur-sm">
                  <span className="text-xs text-white/30 font-semibold uppercase tracking-wider">Toplam</span>
                  <div className="text-right">
                    <p className="text-sm font-black text-white tabular-nums">{totalVal.toLocaleString()} P</p>
                    {orderType === 'sell' && <p className="text-[10px] text-white/25 mt-0.5">Net: {parseInt(netSell).toLocaleString()} P (-%2 komisyon)</p>}
                  </div>
                </div>
              )}

              <button onClick={submitOrder} disabled={orderLoading || !orderLots || !orderPrice}
                className={`relative w-full overflow-hidden rounded-2xl py-4 text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xl ${
                  orderType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25'
                }`}>
                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{animation:'shimmer 3s ease-in-out infinite'}}/>
                <span className="relative">{orderLoading ? 'Gönderiliyor...' : orderType === 'buy' ? 'Alış Emri Ver' : 'Satış Emri Ver'}</span>
              </button>

              {orderError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3">
                  <LuX className="w-4 h-4 text-red-400 shrink-0"/>
                  <p className="text-xs font-semibold text-red-300">{orderError}</p>
                </div>
              )}
              {orderSuccess && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
                  <LuCheck className="w-4 h-4 text-emerald-400 shrink-0"/>
                  <p className="text-xs font-semibold text-emerald-300">Emir başarıyla iletildi!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Open orders */}
        {myOrders.length > 0 && (
          <div className="relative z-10 mx-5 sm:mx-8 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-3">Açık Emirlerim</p>
            <div className="space-y-2">
              {myOrders.map(ord => (
                <div key={ord.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${ord.type==='buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-rose-500/15 text-rose-400 border-rose-500/25'}`}>
                    {ord.type === 'buy' ? '▲ AL' : '▼ SAT'}
                  </span>
                  <span className="text-sm font-bold text-white tabular-nums">{ord.remaining_lots.toLocaleString()} lot</span>
                  <span className="text-xs text-white/25 tabular-nums">@ {ord.price_per_lot.toLocaleString()} P</span>
                  <button onClick={() => cancelOrder(ord.id)} className="ml-auto p-1.5 rounded-full text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all" title="İptal">
                    <LuX className="w-3.5 h-3.5"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  /* ─ List view ─ */
  const gainers = [...listings].filter(l => priceDiff(l).pct > 0).sort((a,b) => priceDiff(b).pct - priceDiff(a).pct).slice(0,1);
  const losers  = [...listings].filter(l => priceDiff(l).pct < 0).sort((a,b) => priceDiff(a).pct - priceDiff(b).pct).slice(0,1);

  return (
    <section className="relative overflow-hidden bg-[#080a0f]">
      <style>{CSS}</style>
      <VideoBackground videoRef={videoRef} />

      {/* Colour tint overlay — video üstüne renk katar */}
      <div className="absolute inset-0 bg-indigo-950/30 pointer-events-none z-[1]" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-[2]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-7 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/30">
              <LuActivity className="w-5 h-5 text-white"/>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080a0f]" style={{animation:'glowPulse 2s ease-in-out infinite'}}/>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{
              backgroundImage: 'linear-gradient(105deg,#a5b4fc 0%,#a5b4fc 35%,#e0e7ff 45%,#a5b4fc 55%,#a5b4fc 100%)',
              backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'titleShine 4s ease-in-out infinite',
            }}>
              Yatırım Borsası
            </h2>
            <p className="text-[11px] text-white/25 font-medium mt-0.5">P2P · Anlık fiyatlar · {listings.length} sunucu</p>
          </div>
        </div>
        <button onClick={() => setInfoOpen(v => !v)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-sm px-3.5 py-2 text-xs text-white/40 hover:text-white/70 hover:bg-white/8 hover:border-white/20 transition-all">
          <LuInfo className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline font-semibold">Nasıl çalışır?</span>
        </button>
      </div>

      {/* Ticker */}
      {listings.length > 0 && <Ticker listings={listings}/>}

      {/* Info panel */}
      {infoOpen && (
        <div className="relative z-10 mx-5 sm:mx-8 mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 backdrop-blur-sm p-4" style={{animation:'fadeUp .2s ease-out both'}}>
          <ul className="space-y-1.5 text-xs text-indigo-300/80">
            {['Aynı anda en fazla 3 farklı sunucuya yatırım yapabilirsiniz.','Her işlemde %2 komisyon kesilir (satışta net tutardan).','Emirler 7 gün sonra otomatik iptal edilir.','Fiyatlar realtime güncellenir — polling yok.'].map((t,i) => (
              <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400"/>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 flex gap-1.5 mx-5 sm:mx-8 mt-5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm">
        {([['market','Borsa',LuChartBar],['portfolio','Portföyüm',LuBriefcase]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === t ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-white/30 hover:text-white/60'
            }`}>
            <Icon className="w-3.5 h-3.5"/>
            {label}
          </button>
        ))}
      </div>

      {/* ── MARKET TAB ── */}
      {tab === 'market' && (
        <div className="relative z-10">
          {/* Top movers */}
          {(gainers.length > 0 || losers.length > 0) && (
            <div className="flex gap-2 mx-5 sm:mx-8 mt-4">
              {gainers.map(l => {
                const { pct } = priceDiff(l);
                return (
                  <button key={l.guild_id} onClick={() => openDetail(l.guild_id)}
                    className="flex-1 flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 backdrop-blur-sm px-4 py-3 hover:bg-emerald-500/18 hover:border-emerald-500/40 active:scale-[.98] transition-all">
                    <LuTrendingUp className="w-4 h-4 text-emerald-400 shrink-0"/>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-black text-emerald-300 truncate">{l.name}</p>
                      <p className="text-[10px] text-emerald-400/60">+{pct.toFixed(2)}%</p>
                    </div>
                    <span className="ml-auto text-[10px] font-black text-emerald-400 bg-emerald-500/15 rounded-full px-2 py-0.5 shrink-0">En Çok ↑</span>
                  </button>
                );
              })}
              {losers.map(l => {
                const { pct } = priceDiff(l);
                return (
                  <button key={l.guild_id} onClick={() => openDetail(l.guild_id)}
                    className="flex-1 flex items-center gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 backdrop-blur-sm px-4 py-3 hover:bg-red-500/18 hover:border-red-500/40 active:scale-[.98] transition-all">
                    <LuTrendingDown className="w-4 h-4 text-red-400 shrink-0"/>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-black text-red-300 truncate">{l.name}</p>
                      <p className="text-[10px] text-red-400/60">{pct.toFixed(2)}%</p>
                    </div>
                    <span className="ml-auto text-[10px] font-black text-red-400 bg-red-500/15 rounded-full px-2 py-0.5 shrink-0">En Çok ↓</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Listings */}
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative">
                <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/[0.07]">
                  <LuChartBar className="w-10 h-10 text-white/15"/>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-indigo-500/5 blur-xl"/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/40">Henüz listede sunucu yok</p>
                <p className="text-xs text-white/20 mt-1">Onaylanan sunucular burada görünür.</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2 px-5 sm:px-8 pb-6">
              {listings.map((listing, idx) => {
                const { pct } = priceDiff(listing);
                const up = pct >= 0;
                const circuitBreaker = isCB(listing.circuit_breaker_until);
                return (
                  <button key={listing.guild_id} onClick={() => openDetail(listing.guild_id)}
                    className={`w-full group relative overflow-hidden rounded-3xl transition-all duration-200 active:scale-[.99] text-left backdrop-blur-sm ${
                      up
                        ? 'border border-emerald-500/25 bg-gradient-to-r from-emerald-950/60 to-[#080a0f] hover:border-emerald-500/45 hover:from-emerald-950/80'
                        : 'border border-red-500/25 bg-gradient-to-r from-red-950/60 to-[#080a0f] hover:border-red-500/45 hover:from-red-950/80'
                    }`}
                    style={{animation:`fadeUp ${.15+idx*.06}s ease-out both`}}>

                    {/* left accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl ${up ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-gradient-to-b from-red-400 to-red-600'}`}/>

                    {/* shimmer hover */}
                    <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent opacity-0 group-hover:opacity-100" style={{animation:'shimmer 1.8s ease-in-out infinite'}}/>

                    <div className="relative flex items-center gap-4 pl-5 pr-4 py-4">
                      {/* Rank + avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar name={listing.name} size="md"/>
                        {idx < 3 && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/40">
                            <span className="text-[9px] font-black text-black">{idx+1}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-white">{listing.name}</span>
                          <StatusBadge status={listing.status}/>
                          {listing.has_warning && <LuTriangleAlert className="w-3 h-3 text-yellow-400 flex-shrink-0"/>}
                          {circuitBreaker && <LuZap className="w-3 h-3 text-orange-400 flex-shrink-0"/>}
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${up ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                              style={{width:`${Math.min(Math.abs(pct)*5+15,100)}%`}}/>
                          </div>
                          <span className="text-[10px] text-white/30 font-mono tabular-nums flex-shrink-0">{listing.public_lots.toLocaleString()} lot</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0 space-y-1.5 min-w-[90px]">
                        <p className="text-xl font-black text-white tabular-nums leading-none tracking-tight">
                          {listing.market_price.toLocaleString()}<span className="text-[11px] text-white/30 ml-0.5 font-bold">P</span>
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black border ${
                          up ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-red-500/15 text-red-300 border-red-500/25'
                        }`}>
                          {up?'▲':'▼'} {Math.abs(pct).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {tab === 'portfolio' && (
        <div className="relative z-10 pb-6">
          {portfolioLoading ? (
            <div className="px-5 sm:px-8 mt-4 space-y-3"><SkeletonCard/><SkeletonCard/></div>
          ) : portfolio.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative">
                <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/[0.07]">
                  <LuStar className="w-10 h-10 text-white/15"/>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-purple-500/5 blur-xl"/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/40">Portföyünüz boş</p>
                <p className="text-xs text-white/20 mt-1">Borsadan lot alarak yatırım yapın.</p>
              </div>
              <button onClick={() => setTab('market')}
                className="mt-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 backdrop-blur-sm px-6 py-2 text-xs font-black text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/50 transition-all active:scale-95">
                Borsaya Git →
              </button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mx-5 sm:mx-8 mt-4 rounded-3xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5" style={{animation:'fadeUp .2s ease-out both'}}>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-4">Portföy Özeti</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Sunucu', value: `${portfolio.length}` },
                    { label: 'Toplam Lot', value: portfolio.reduce((s,h)=>s+h.lot_count,0).toLocaleString() },
                    { label: 'Toplam Değer', value: `${portfolio.reduce((s,h)=>s+h.lot_count*h.market_price,0).toLocaleString()} P` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-base font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 px-5 sm:px-8 space-y-2">
                {portfolio.map(h => {
                  const plPct2 = h.avg_buy_price > 0 ? ((h.market_price - h.avg_buy_price) / h.avg_buy_price)*100 : 0;
                  const plVal2 = (h.market_price - h.avg_buy_price)*h.lot_count;
                  const up2 = plPct2 >= 0;
                  return (
                    <button key={h.guild_id} onClick={() => openDetail(h.guild_id)}
                      className={`w-full relative overflow-hidden rounded-3xl border p-4 text-left backdrop-blur-sm transition-all active:scale-[.99] ${up2 ? 'border-emerald-500/15 bg-emerald-500/5 hover:border-emerald-500/25 hover:bg-emerald-500/10' : 'border-red-500/15 bg-red-500/5 hover:border-red-500/25 hover:bg-red-500/10'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={h.name}/>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-black text-sm text-white truncate">{h.name}</p>
                          <p className="text-[11px] text-white/30">{h.lot_count.toLocaleString()} lot · ort. {h.avg_buy_price.toFixed(1)} P</p>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1">
                          <p className="text-sm font-black text-white tabular-nums">{(h.lot_count*h.market_price).toLocaleString()} P</p>
                          <div className={`flex items-center justify-end gap-1 text-xs font-black ${up2?'text-emerald-400':'text-red-400'}`}>
                            <span>{up2?'▲':'▼'} {Math.abs(plPct2).toFixed(2)}%</span>
                            <span className="text-white/20 font-normal">({plVal2>=0?'+':''}{Math.round(plVal2).toLocaleString()} P)</span>
                          </div>
                        </div>
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
