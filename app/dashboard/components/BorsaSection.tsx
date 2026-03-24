'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuTrendingUp, LuTrendingDown, LuSearch, LuArrowRight, LuTriangleAlert } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { Section } from '../types';

type Listing = {
  guild_id: string;
  status: string;
  market_price: number;
  ipo_price: number;
  total_lots: number;
  public_lots: number;
  circulating_lots: number;
  category: string | null;
  description: string | null;
  current_day_high: number | null;
  current_day_low: number | null;
  // from price_history join (if available)
  price_change_pct?: number;
  server_name?: string;
  server_icon?: string;
};

type BorsaSectionProps = {
  onNavigate: (section: Section, extra?: unknown) => void;
};

export default function BorsaSection({ onNavigate }: BorsaSectionProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/market-listings'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setListings(json.listings ?? json ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.guild_id.toLowerCase().includes(q) || (l.server_name ?? '').toLowerCase().includes(q) || (l.category ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Exchange</h2>
          <p className="text-sm text-white/40 mt-0.5">Buy and sell server lots with Mari</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('ipo-apply')}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          List My Server
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 focus:bg-white/8"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <LuTriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 text-center text-white/30">
          No listed servers found.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.guild_id} listing={l} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing: l, onNavigate }: { listing: Listing; onNavigate: (s: Section, e?: unknown) => void }) {
  const positive = (l.price_change_pct ?? 0) >= 0;
  const fillPct = l.public_lots > 0 ? Math.min(100, Math.round((l.circulating_lots / l.public_lots) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={() => onNavigate('borsa-detail', l.guild_id)}
      className="group flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-bold text-white/30">
            {l.server_name?.charAt(0) ?? l.guild_id.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-tight">
              {l.server_name ?? l.guild_id}
            </p>
            {l.category && (
              <p className="text-[10px] text-white/35 uppercase tracking-wide">{l.category}</p>
            )}
          </div>
        </div>
        <LuArrowRight className="h-4 w-4 text-white/20 transition group-hover:text-white/50" />
      </div>

      {/* Price */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-white leading-none">
            {l.market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="ml-1 text-xs font-normal text-white/40">MRI/lot</span>
          </p>
          {l.price_change_pct !== undefined && (
            <div className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {positive ? <LuTrendingUp className="h-3 w-3" /> : <LuTrendingDown className="h-3 w-3" />}
              {positive ? '+' : ''}{l.price_change_pct.toFixed(2)}%
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/35">{fillPct}% sold</p>
          <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
