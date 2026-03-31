'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LuArrowLeft,
  LuTrendingUp,
  LuTrendingDown,
  LuUsers,
  LuActivity,
  LuTriangleAlert,
  LuLoader,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { Section } from '../types';
import { useT } from '@/contexts/LocaleContext';

type MarketDetail = {
  listing: {
    guild_id: string;
    status: string;
    market_price: number;
    ipo_price: number;
    price_change_pct: number;
    current_day_high: number | null;
    current_day_low: number | null;
    category: string | null;
    description: string | null;
    support_threshold: number | null;
    support_days_below: number;
    delist_days_below: number;
    vesting_start_date: string | null;
    founder_vested_lots: number;
    created_at: string;
  };
  lots: {
    total: number;
    founder: number;
    public: number;
    circulating: number;
    available: number;
    treasury: number;
  };
  treasury: {
    balance: number;
    support_reserve: number;
    total_collected: number;
    total_paid_out: number;
    lot_count: number;
    avg_buy_price: number;
    last_updated: string;
  } | null;
  dividend_pool: { week_start: string; total_mari: number; distributed: boolean };
  top_holders: Array<{ user_id: string; lot_count: number; avg_buy_price: number; pct_of_circulating: number }>;
  recent_trades: Array<{ id: string; buyer_id: string | null; seller_id: string | null; lot_count: number; price_per_lot: number; total_mari: number; fee_mari: number; trade_type: string; traded_at: string }>;
};

type TradeResult = {
  status: string;
  action: string;
  lot_count: number;
  price_per_lot: number;
  gross_value: number;
  fee_amount: number;
  new_price: number;
  new_mari_balance: number;
};

type Props = {
  guildId: string;
  onBack: () => void;
  onNavigate: (section: Section, extra?: unknown) => void;
};

export default function BorsaDetailSection({ guildId, onBack, onNavigate }: Props) {
  const t = useT();
  const [detail, setDetail] = useState<MarketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trade panel
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [lotInput, setLotInput] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<TradeResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/market-detail?guild_id=${encodeURIComponent(guildId)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDetail(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  const handleTrade = async () => {
    const lots = parseInt(lotInput, 10);
    if (!lots || lots <= 0) { setTradeError(t('borsa_error_enter_valid_lot')); return; }
    setTradeLoading(true);
    setTradeError(null);
    setTradeSuccess(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/trade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId, action, lot_count: lots }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg: Record<string, string> = {
          insufficient_lots: t('borsa_error_not_enough_lots'),
          insufficient_mari: t('borsa_error_not_enough_mari', { required: json.required?.toFixed(2) }),
          daily_sell_limit_exceeded: t('borsa_error_daily_sell_limit', { alreadySold: json.already_sold, dailyLimit: json.daily_limit }),
          insufficient_market_lots: t('borsa_error_insufficient_market_lots', { available: json.available }),
          maintenance: t('borsa_error_maintenance', { reason: json.reason ?? json.key }),
        };
        setTradeError(msg[json.error] ?? json.error ?? t('borsa_error_trade_failed'));
      } else {
        setTradeSuccess(json);
        setLotInput('');
        void load(); // refresh
      }
    } catch (e) {
      setTradeError(String(e));
    } finally {
      setTradeLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-white/30">
      <LuLoader className="h-6 w-6 animate-spin" />
    </div>
  );

  if (error || !detail) return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
        <LuArrowLeft className="h-4 w-4" /> {t('borsa_back_button')}
      </button>
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        <LuTriangleAlert className="h-4 w-4 shrink-0" />{error ?? t('borsa_listing_not_found')}
      </div>
    </div>
  );

  const { listing, lots, treasury, dividend_pool, top_holders, recent_trades } = detail;
  const positive = listing.price_change_pct >= 0;
  const lotCount = parseInt(lotInput, 10) || 0;
  const estimatedCost = lotCount > 0 ? listing.market_price * lotCount : 0;
  const fee = estimatedCost * (action === 'buy' ? 0.01 : 0.005);
  const total = action === 'buy' ? estimatedCost + fee : estimatedCost - fee;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
        <LuArrowLeft className="h-4 w-4" /> {t('borsa_back_button')}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{guildId}</h2>
            {listing.category && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/40">{listing.category}</span>
            )}
          </div>
          {listing.description && (
            <p className="mt-1 text-sm text-white/40">{listing.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {listing.market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="ml-1 text-sm font-normal text-white/40">MRI</span>
          </p>
          <div className={`flex items-center justify-end gap-1 text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {positive ? <LuTrendingUp className="h-4 w-4" /> : <LuTrendingDown className="h-4 w-4" />}
            {positive ? '+' : ''}{listing.price_change_pct.toFixed(2)}% {t('borda_today_label')}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('borsa_day_high')} value={listing.current_day_high?.toFixed(2) ?? '—'} unit="MRI" />
        <StatCard label={t('borsa_day_low')} value={listing.current_day_low?.toFixed(2) ?? '—'} unit="MRI" />
        <StatCard label={t('borsa_available')} value={lots.available.toLocaleString()} unit="lots" />
        <StatCard label={t('borsa_week_dividends')} value={dividend_pool.total_mari.toLocaleString('en-US', { maximumFractionDigits: 2 })} unit="MRI" />
      </div>

      {/* Main: Trade + Right panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trade Panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('borsa_trade_title')}</h3>

          {/* Buy/Sell toggle */}
          <div className="flex rounded-xl bg-white/5 p-1 gap-1">
            {(['buy', 'sell'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => { setAction(a); setTradeError(null); setTradeSuccess(null); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  action === a
                    ? a === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {a === 'buy' ? t('borsa_buy') : t('borsa_sell')}
              </button>
            ))}
          </div>

          {/* Lot input */}
          <div>
            <label className="mb-1.5 block text-xs text-white/40">{t('borsa_lots_label')}</label>
            <input
              type="number"
              min={1}
              value={lotInput}
              onChange={(e) => { setLotInput(e.target.value); setTradeError(null); setTradeSuccess(null); }}
              placeholder="0"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
            />
          </div>

          {/* Cost preview */}
          {lotCount > 0 && (
            <div className="rounded-xl bg-white/5 px-3 py-2.5 text-xs space-y-1">
              <div className="flex justify-between text-white/40">
                <span>{t('borsa_price_per_lot')}</span>
                <span>{listing.market_price.toFixed(2)} MRI</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>{t('borsa_fee_' + (action === 'buy' ? 'buy' : 'sell'))}</span>
                <span>{fee.toFixed(2)} MRI</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
                <span>{action === 'buy' ? t('borsa_total_cost') : t('borsa_you_receive')}</span>
                <span>{total.toFixed(2)} MRI</span>
              </div>
            </div>
          )}

          {tradeError && (
            <p className="text-xs text-red-400">{tradeError}</p>
          )}
          {tradeSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              ✓ {t('borsa_success_trade_details', {
                action: tradeSuccess.action === 'buy' ? t('borsa_success_bought') : t('borsa_success_sold'),
                lotCount: tradeSuccess.lot_count,
                price: tradeSuccess.price_per_lot.toFixed(2)
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleTrade()}
            disabled={tradeLoading || !lotInput}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-40 ${
              action === 'buy'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {tradeLoading ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : (action === 'buy' ? t('borsa_buy_lots') : t('borsa_sell_lots'))}
          </button>
        </div>

        {/* Top Holders */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <LuUsers className="h-4 w-4 text-white/30" />
            <h3 className="text-sm font-semibold text-white">{t('borsa_top_holders')}</h3>
          </div>
          {top_holders.length === 0 ? (
            <p className="text-xs text-white/30">{t('borsa_no_holders')}</p>
          ) : (
            <div className="space-y-2">
              {top_holders.map((h, i) => (
                <div key={h.user_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 shrink-0 text-white/25 text-center">{i + 1}</span>
                    <span className="truncate font-mono text-white/50">{h.user_id.slice(0, 8)}…</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/40">{h.lot_count.toLocaleString()} lots</span>
                    <span className="text-white/25">{h.pct_of_circulating.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <LuActivity className="h-4 w-4 text-white/30" />
            <h3 className="text-sm font-semibold text-white">{t('borsa_recent_trades')}</h3>
          </div>
          {recent_trades.length === 0 ? (
            <p className="text-xs text-white/30">{t('borsa_no_trades')}</p>
          ) : (
            <div className="space-y-2">
              {recent_trades.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      t.trade_type === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : t.trade_type === 'sell' ? 'bg-red-500/15 text-red-400' : 'bg-indigo-500/15 text-indigo-400'
                    }`}>{t.trade_type}</span>
                    <span className="text-white/50">{t.lot_count} lots</span>
                  </div>
                  <span className="text-white/35">{t.price_per_lot.toFixed(2)} MRI</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lot Distribution */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">{t('borsa_lot_distribution')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DistRow label={t('borsa_total')} value={lots.total} />
          <DistRow label={t('borsa_founder')} value={lots.founder} />
          <DistRow label={t('borsa_circulating')} value={lots.circulating} />
          <DistRow label={t('borsa_available')} value={lots.available} />
        </div>
        {lots.public > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/35 mb-1">
              <span>{t('borsa_fill_rate')}</span>
              <span>{Math.min(100, Math.round((lots.circulating / lots.public) * 100))}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, Math.round((lots.circulating / lots.public) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Treasury Info */}
      {treasury && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">{t('borsa_server_treasury')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DistRow label={t('borsa_balance')} value={treasury.balance.toFixed(2)} unit="MRI" />
            <DistRow label={t('borsa_support_reserve')} value={treasury.support_reserve.toFixed(2)} unit="MRI" />
            <DistRow label={t('borsa_treasury_lots')} value={treasury.lot_count} unit="lots" />
            <DistRow label={t('borsa_total_collected')} value={treasury.total_collected.toFixed(2)} unit="MRI" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-1 text-lg font-bold text-white leading-none">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-white/35">{unit}</span>}
      </p>
    </div>
  );
}

function DistRow({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-0.5 font-semibold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="ml-1 text-xs font-normal text-white/35">{unit}</span>}
      </p>
    </div>
  );
}
