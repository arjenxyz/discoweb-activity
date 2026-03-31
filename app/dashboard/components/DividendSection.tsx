'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuCoins, LuTriangleAlert, LuLoader, LuCalendar } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type DividendData = {
  guild_id: string;
  week_start: string;
  pool: { total_mari: number; distributed: boolean; distributed_at: string | null };
  user_lots: number;
  circulating_lots: number;
  estimated_payout: number;
  next_distribution: string;
  history: Array<{ id: string; week_start: string; lot_snapshot: number; mari_received: number; distributed_at: string }>;
};

export default function DividendSection({ guildId }: { guildId?: string }) {
  const t = useT();
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/dividend?guild_id=${encodeURIComponent(id)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guildId) void load(guildId);
  }, [guildId, load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('dividend_title')}</h2>
        <p className="text-sm text-white/40 mt-0.5">{t('dividend_subtitle')}</p>
      </div>

      {!guildId && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center text-white/30 text-sm">
          {t('dividend_no_server')}
        </div>
      )}

      {guildId && loading && (
        <div className="flex h-40 items-center justify-center">
          <LuLoader className="h-6 w-6 animate-spin text-white/30" />
        </div>
      )}

      {guildId && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <LuTriangleAlert className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SCard label={t('dividend_this_week_pool')} value={`${data.pool.total_mari.toFixed(2)} MRI`} />
            <SCard label={t('dividend_your_lots')} value={`${data.user_lots.toLocaleString()} ${t('dividend_lots_suffix')}`} />
            <SCard label={t('dividend_est_payout')} value={`${data.estimated_payout.toFixed(2)} MRI`} highlight={data.estimated_payout > 0} />
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 flex items-center gap-1">
                <LuCalendar className="h-3 w-3" /> {t('dividend_next_distribution')}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {new Date(data.next_distribution).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-white/30">{t('dividend_distribution_time')}</p>
            </div>
          </div>

          {/* Share bar */}
          {data.circulating_lots > 0 && data.user_lots > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>{t('dividend_your_share')}</span>
                <span>{((data.user_lots / data.circulating_lots) * 100).toFixed(2)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(100, (data.user_lots / data.circulating_lots) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t('dividend_payment_history')}</h3>
            {data.history.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-8 text-center text-sm text-white/30">
                {t('dividend_no_payments')}
              </div>
            ) : (
              <div className="space-y-2">
                {data.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm text-white/70">{t('dividend_week_of')} {h.week_start}</p>
                      <p className="text-xs text-white/35">{h.lot_snapshot.toLocaleString()} {t('dividend_lots_suffix')} · {new Date(h.distributed_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <LuCoins className="h-4 w-4" />
                      <span className="font-semibold">+{h.mari_received.toFixed(2)} MRI</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className={`mt-1 text-sm font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
