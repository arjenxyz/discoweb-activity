'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuLoader, LuTriangleAlert, LuArrowLeft, LuCheck, LuClock } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { Section } from '../types';
import { useT } from '@/contexts/LocaleContext';

type IpoTier = {
  tier: number;
  price: number;
  lot_start: number;
  lot_end: number;
  total_lots: number;
  sold_lots: number;
  fill_pct: number;
  is_current: boolean;
  is_complete: boolean;
};

type IpoData = {
  guild_id: string;
  status: string;
  ipo_price: number;
  market_price: number;
  public_lots: number;
  circulating_lots: number;
  fill_pct: number;
  current_tier: number;
  tiers: IpoTier[];
  vesting_start_date: string | null;
  founder_lots: number;
  total_lots: number;
};

type Props = {
  guildId: string;
  onBack: () => void;
  onNavigate: (section: Section, extra?: unknown) => void;
};

export default function IpoSection({ guildId, onBack, onNavigate }: Props) {
  const t = useT();
  const [data, setData] = useState<IpoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy form
  const [lotInput, setLotInput] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);

  // Countdown to next vesting unlock
  const [countdown, setCountdown] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/ipo-tiers?guild_id=${encodeURIComponent(guildId)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  // Vesting countdown (next 15-day milestone)
  useEffect(() => {
    if (!data?.vesting_start_date) return;
    const tick = () => {
      const start = new Date(data.vesting_start_date!).getTime();
      const now = Date.now();
      const daysSince = (now - start) / 86400000;
      let nextMilestone = 15;
      if (daysSince >= 15) nextMilestone = 30;
      if (daysSince >= 30) nextMilestone = 45;
      if (daysSince >= 45) { setCountdown(t('ipo_section_fully_vested')); return; }
      const targetMs = start + nextMilestone * 86400000;
      const diff = targetMs - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(t('ipo_section_day_countdown', { day: nextMilestone, days: d, hours: h, minutes: m }));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [data?.vesting_start_date]);

  const handleBuy = async () => {
    const lots = parseInt(lotInput, 10);
    if (!lots || lots <= 0) { setBuyError(t('ipo_section_error_valid_lots')); return; }
    setBuyLoading(true);
    setBuyError(null);
    setBuySuccess(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/trade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId, action: 'buy', lot_count: lots }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg: Record<string, string> = {
          insufficient_lots: t('ipo_section_error_insufficient_lots'),
          insufficient_mari: t('ipo_section_error_insufficient_mari', { required: json.required?.toFixed(2) ?? '0' }),
          insufficient_market_lots: t('ipo_section_error_market_lots', { available: json.available ?? '0' }),
          maintenance: t('ipo_section_error_maintenance', { reason: json.reason ?? json.key }),
        };
        setBuyError(msg[json.error] ?? json.error ?? t('ipo_section_error_purchase'));
      } else {
        setBuySuccess(t('ipo_section_success_bought', { count: json.lot_count, price: json.price_per_lot.toFixed(2) }));
        setLotInput('');
        void load();
      }
    } catch (e) {
      setBuyError(String(e));
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <LuLoader className="h-6 w-6 animate-spin text-white/30" />
    </div>
  );

  if (error || !data) return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
        <LuArrowLeft className="h-4 w-4" /> {t('ipo_section_back')}
      </button>
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        <LuTriangleAlert className="h-4 w-4 shrink-0" />{error ?? t('ipo_section_data_not_found')}
      </div>
    </div>
  );

  const availableLots = data.public_lots - data.circulating_lots;
  const lotCount = parseInt(lotInput, 10) || 0;
  const currentTierData = data.tiers.find((t) => t.is_current) ?? data.tiers[0];
  const estimatedCost = lotCount > 0 ? currentTierData.price * lotCount * 1.01 : 0; // +1% fee

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white">
        <LuArrowLeft className="h-4 w-4" /> {t('ipo_section_back_to_exchange')}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{guildId}</h2>
          <p className="mt-1 text-sm text-white/40">{t('ipo_section_subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {data.market_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="ml-1 text-sm font-normal text-white/40">{t('ipo_section_price_suffix')}</span>
          </p>
          <p className="text-xs text-white/35">{t('ipo_section_ipo_price_label')} {data.ipo_price.toFixed(2)} MRI</p>
        </div>
      </div>

      {/* Overall fill bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-white/60">{t('ipo_section_overall_fill')}</span>
          <span className="font-semibold text-white">{data.fill_pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, data.fill_pct)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-white/35">
          <span>{data.circulating_lots.toLocaleString()} {t('ipo_section_lots_sold')}</span>
          <span>{data.public_lots.toLocaleString()} {t('ipo_section_total_public_lots')}</span>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.tiers.map((tier) => (
          <div
            key={tier.tier}
            className={`rounded-2xl border p-4 transition ${
              tier.is_current
                ? 'border-indigo-500/40 bg-indigo-500/10'
                : tier.is_complete
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                tier.is_current ? 'text-indigo-400' : tier.is_complete ? 'text-emerald-400' : 'text-white/35'
              }`}>
                Tier {tier.tier}
                {tier.is_current && ` · ${t('ipo_section_tier_active')}`}
                {tier.is_complete && ` · ${t('ipo_section_tier_filled')}`}
              </span>
              {tier.is_complete && <LuCheck className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-lg font-bold text-white">{tier.price.toFixed(2)} <span className="text-xs font-normal text-white/35">MRI</span></p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{tier.sold_lots.toLocaleString()} / {tier.total_lots.toLocaleString()}</span>
                <span>{tier.fill_pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    tier.is_complete ? 'bg-emerald-500' : tier.is_current ? 'bg-indigo-500' : 'bg-white/20'
                  }`}
                  style={{ width: `${Math.min(100, tier.fill_pct)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buy panel + Vesting info */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Buy lots */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('ipo_section_buy_title')}</h3>
          <div className="text-xs text-white/40 bg-white/5 rounded-xl px-3 py-2">
            {t('ipo_section_current_tier_price')} <span className="font-semibold text-white">{currentTierData.price.toFixed(2)} MRI</span>
            <span className="ml-2 text-white/25">{t('ipo_section_fee_applies')}</span>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/40">{t('ipo_section_lots_to_buy')}</label>
            <input
              type="number"
              min={1}
              max={availableLots}
              value={lotInput}
              onChange={(e) => { setLotInput(e.target.value); setBuyError(null); setBuySuccess(null); }}
              placeholder="0"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
            />
            <p className="mt-1 text-xs text-white/30">{availableLots.toLocaleString()} {t('ipo_section_lots_available')}</p>
          </div>
          {lotCount > 0 && (
            <div className="rounded-xl bg-white/5 px-3 py-2.5 text-xs space-y-1">
              <div className="flex justify-between text-white/40">
                <span>{t('ipo_section_subtotal')} ({lotCount} × {currentTierData.price.toFixed(2)})</span>
                <span>{(lotCount * currentTierData.price).toFixed(2)} MRI</span>
              </div>
              <div className="flex justify-between text-white/40">
                <span>{t('ipo_section_fee')}</span>
                <span>{(lotCount * currentTierData.price * 0.01).toFixed(2)} MRI</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
                <span>{t('ipo_section_total_cost')}</span>
                <span>{estimatedCost.toFixed(2)} MRI</span>
              </div>
            </div>
          )}
          {buyError && <p className="text-xs text-red-400">{buyError}</p>}
          {buySuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              ✓ {buySuccess}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleBuy()}
            disabled={buyLoading || !lotInput || availableLots === 0}
            className="w-full rounded-xl bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/30 disabled:opacity-40"
          >
            {buyLoading ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : t('ipo_section_buy_button')}
          </button>
        </div>

        {/* Vesting info */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('ipo_section_founder_vesting')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-white/35">{t('ipo_section_founder_lots')}</p>
              <p className="mt-0.5 font-semibold text-white">{data.founder_lots.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white/35">{t('ipo_section_total_lots')}</p>
              <p className="mt-0.5 font-semibold text-white">{data.total_lots.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white/35">{t('ipo_section_vesting_start')}</p>
              <p className="mt-0.5 font-semibold text-white text-xs">
                {data.vesting_start_date
                  ? new Date(data.vesting_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            {countdown && (
              <div>
                <p className="text-xs text-white/35 flex items-center gap-1"><LuClock className="h-3 w-3" /> {t('ipo_section_next_unlock')}</p>
                <p className="mt-0.5 text-xs font-semibold text-amber-400">{countdown}</p>
              </div>
            )}
          </div>

          {/* Vesting schedule visual */}
          <div className="space-y-2">
            {[15, 30, 45].map((day, i) => {
              const vestingStart = data.vesting_start_date ? new Date(data.vesting_start_date).getTime() : 0;
              const daysSince = vestingStart ? (Date.now() - vestingStart) / 86400000 : 0;
              const unlocked = daysSince >= day;
              const sliceLots = Math.floor(data.founder_lots * 0.33);
              return (
                <div key={day} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${unlocked ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                  {unlocked
                    ? <LuCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    : <div className="h-4 w-4 shrink-0 rounded-full border border-white/20" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${unlocked ? 'text-emerald-400' : 'text-white/50'}`}>{t('ipo_section_vesting_schedule', { day, percentage: Math.round(0.33 * 100), lots: sliceLots.toLocaleString() })}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-white/25 leading-relaxed">
            {t('ipo_section_vesting_info')}
          </p>
        </div>
      </div>
    </div>
  );
}
