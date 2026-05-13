'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuTrendingUp, LuTrendingDown, LuTriangleAlert, LuLoader, LuArrowRight } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { Section } from '../types';
import { useT } from '@/contexts/LocaleContext';

type Holding = {
  guild_id: string;
  lot_count: number;
  avg_buy_price: number;
  daily_sell_used: number;
  // enriched from market-listings
  market_price?: number;
  server_name?: string;
};

type Props = {
  onNavigate: (section: Section, extra?: unknown) => void;
};

export default function PortfolioSection({ onNavigate }: Props) {
  const t = useT();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/portfolio'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Expected shape: { holdings: [...] } or raw array
      const raw: Holding[] = json.holdings ?? json ?? [];
      setHoldings(raw.filter((h) => h.lot_count > 0));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalValue = holdings.reduce((s, h) => s + (h.market_price ?? h.avg_buy_price) * h.lot_count, 0);
  const totalCost = holdings.reduce((s, h) => s + h.avg_buy_price * h.lot_count, 0);
  const totalPnl = totalValue - totalCost;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('portfolio_title')}</h2>
        <p className="text-sm text-white/40 mt-0.5">{t('portfolio_subtitle')}</p>
      </div>

      {/* Summary cards */}
      {!loading && holdings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/30">{t('portfolio_total_value')}</p>
            <p className="mt-1 text-lg font-bold text-white">{totalValue.toFixed(2)} <span className="text-xs font-normal text-white/35">MRI</span></p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/30">{t('portfolio_total_cost')}</p>
            <p className="mt-1 text-lg font-bold text-white">{totalCost.toFixed(2)} <span className="text-xs font-normal text-white/35">MRI</span></p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/30">{t('portfolio_unrealized_pl')}</p>
            <p className={`mt-1 text-lg font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} <span className="text-xs font-normal opacity-60">MRI</span>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <LuLoader className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <LuTriangleAlert className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : holdings.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <p className="text-white/30">{t('portfolio_empty_title')}</p>
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            {t('portfolio_empty_button')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {holdings.map((h) => {
            const marketPrice = h.market_price ?? h.avg_buy_price;
            const value = marketPrice * h.lot_count;
            const cost = h.avg_buy_price * h.lot_count;
            const pnl = value - cost;
            const pnlPct = cost > 0 ? ((pnl / cost) * 100) : 0;
            const positive = pnl >= 0;
            const dailyLimit = Math.floor(h.lot_count * 0.3);

            return (
              <button
                key={h.guild_id}
                type="button"
                onClick={() => onNavigate('discover', h.guild_id)}
                className="group w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{h.server_name ?? h.guild_id}</p>
                    <p className="text-xs text-white/35">{t('portfolio_lots_info', { lots: h.lot_count.toLocaleString(), price: h.avg_buy_price.toFixed(2) })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{value.toFixed(2)} MRI</p>
                      <div className={`flex items-center justify-end gap-1 text-xs ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {positive ? <LuTrendingUp className="h-3 w-3" /> : <LuTrendingDown className="h-3 w-3" />}
                        {positive ? '+' : ''}{pnl.toFixed(2)} ({pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                    <LuArrowRight className="h-4 w-4 text-white/20 transition group-hover:text-white/50" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/30">
                  <span>{t('portfolio_daily_sell_used', { used: h.daily_sell_used, limit: dailyLimit })}</span>
                  <span>{t('portfolio_market_price', { price: marketPrice.toFixed(2) })}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: dailyLimit > 0 ? `${Math.min(100, (h.daily_sell_used / dailyLimit) * 100)}%` : '0%' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
