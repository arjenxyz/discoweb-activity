'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuNewspaper, LuRefreshCw, LuTriangleAlert, LuChevronDown } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

type MarketEvent = {
  id: string;
  event_type: string;
  guild_id: string | null;
  actor_id: string | null;
  headline: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_COLORS: Record<string, string> = {
  big_buy: 'text-green-400',
  big_sell: 'text-red-400',
  full_exit: 'text-orange-400',
  ath: 'text-yellow-400',
  ipo_launch: 'text-blue-400',
  delist_warning: 'text-orange-500',
  delist: 'text-red-500',
  treasury_support: 'text-teal-400',
  dividend_paid: 'text-emerald-400',
  held_through_dip: 'text-green-300',
  big_winner: 'text-yellow-300',
  market_recovery: 'text-green-400',
  price_crash: 'text-red-400',
};

const EVENT_BG: Record<string, string> = {
  big_buy: 'border-green-500/20 bg-green-500/5',
  big_sell: 'border-red-500/20 bg-red-500/5',
  full_exit: 'border-orange-500/20 bg-orange-500/5',
  ath: 'border-yellow-500/20 bg-yellow-500/5',
  ipo_launch: 'border-blue-500/20 bg-blue-500/5',
  delist_warning: 'border-orange-500/20 bg-orange-500/5',
  delist: 'border-red-600/20 bg-red-600/5',
  treasury_support: 'border-teal-500/20 bg-teal-500/5',
  dividend_paid: 'border-emerald-500/20 bg-emerald-500/5',
  held_through_dip: 'border-green-400/20 bg-green-400/5',
  big_winner: 'border-yellow-400/20 bg-yellow-400/5',
  market_recovery: 'border-green-500/20 bg-green-500/5',
  price_crash: 'border-red-500/20 bg-red-500/5',
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

const LIMIT = 20;

export default function MarketNewsSection() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (off: number, append = false) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/market-news?limit=${LIMIT}&offset=${off}`));
      if (!res.ok) throw new Error('Yüklenemedi');
      const data = await res.json();
      setEvents(prev => append ? [...prev, ...(data.events ?? [])] : (data.events ?? []));
      setTotal(data.total ?? 0);
      setOffset(off);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(0);
  }, [fetchEvents]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LuNewspaper className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Borsa Haberleri</h2>
          {total > 0 && (
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{total}</span>
          )}
        </div>
        <button
          onClick={() => fetchEvents(0)}
          disabled={loading}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <LuRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          <LuTriangleAlert size={14} />
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && !error && (
        <div className="text-center py-16 text-white/30">
          <LuNewspaper size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz haber yok.</p>
          <p className="text-xs mt-1">İlk büyük işlem gerçekleştiğinde burada görünecek.</p>
        </div>
      )}

      {/* News Feed */}
      {!loading && events.length > 0 && (
        <div className="space-y-2">
          {events.map((ev) => {
            const colorClass = EVENT_COLORS[ev.event_type] ?? 'text-white/60';
            const bgClass = EVENT_BG[ev.event_type] ?? 'border-white/10 bg-white/5';
            return (
              <div
                key={ev.id}
                className={`border rounded-xl p-3 ${bgClass} transition-colors`}
              >
                <p className={`text-sm font-medium leading-snug ${colorClass}`}>
                  {ev.headline}
                </p>
                {ev.body && (
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{ev.body}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-white/25">{timeAgo(ev.created_at)}</span>
                  {ev.guild_id && (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="text-xs text-white/25 font-mono truncate max-w-[120px]">{ev.guild_id}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {events.length < total && (
            <button
              onClick={() => fetchEvents(offset + LIMIT, true)}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              {loadingMore ? (
                <LuRefreshCw size={13} className="animate-spin" />
              ) : (
                <LuChevronDown size={13} />
              )}
              Daha fazla yükle ({total - events.length} kaldı)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
