'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  LuGift, LuClock, LuTag, LuCalendar, LuLock,
  LuLoader, LuTicket, LuCheck, LuChevronDown, LuChevronUp, LuInfo,
  LuTrophy, LuUsers, LuCoins, LuShield, LuZap, LuX,
} from 'react-icons/lu';
import Image from 'next/image';
import type { BadgeInfo, DrawnRaffle } from '../types';
import { useT } from '@/contexts/LocaleContext';
import fetchWithCreds from '@/lib/fetchWithCreds';

const STORE_BACKGROUNDS = [
  '/store-background/sunger-bob/sunger.gif',
  '/store-background/sunger-bob/sunger2.gif',
  '/store-background/sunger-bob/sunger3.gif',
  '/store-background/sunger-bob/sunger4.gif',
  '/store-background/sunger-bob/sunger5.gif',
  '/store-background/sunger-bob/sunger6.gif',
  '/store-background/sunger-bob/sunger7.gif',
  '/store-background/sunger-bob/sunger8.gif',
  '/store-background/sunger-bob/sunger9.gif',
  '/store-background/invincible/invincible.jpg',
  '/store-background/invincible/invincible2.jpg',
  '/store-background/invincible/invincible3.jpg',
  '/store-background/invincible/invincible4.jpg',
  '/store-background/invincible/invincible5.jpg',
  '/store-background/invincible/invincible6.jpg',
  '/store-background/invincible/invincible7.jpg',
];

type RafflesSectionProps = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
  onJoinRaffle?: (raffleId: string) => Promise<void>;
};

// ── Countdown helpers ─────────────────────────────────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}g ${rh}s`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Prize badge label ─────────────────────────────────────────────────────────
function PrizeBadge({ raffle }: { raffle: BadgeInfo['activeRaffles'][0] }) {
  if (raffle.prize_type === 'papel' && raffle.prize_papel_amount) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-md text-[10px] text-yellow-300 font-bold">
        <LuCoins className="w-3 h-3" /> {Number(raffle.prize_papel_amount).toLocaleString('tr-TR')} Papel
      </span>
    );
  }
  if (raffle.prize_type === 'role') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 backdrop-blur-md text-[10px] text-violet-300 font-bold">
        <LuShield className="w-3 h-3" /> Rol
      </span>
    );
  }
  if (raffle.prize_type === 'timed_multiplier' && raffle.prize_multiplier_value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md text-[10px] text-emerald-300 font-bold">
        <LuZap className="w-3 h-3" /> ×{raffle.prize_multiplier_value} / {raffle.prize_multiplier_days}g
      </span>
    );
  }
  if (raffle.prize_type === 'mari' && raffle.prize_mari_amount) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-md text-[10px] text-indigo-300 font-bold">
        💎 {Number(raffle.prize_mari_amount).toFixed(2)} Mari
      </span>
    );
  }
  if (raffle.prizes && raffle.prizes.length > 0) {
    return (
      <>
        {raffle.prizes.slice(0, 2).map((prize, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] text-white/70">
            🎁 {prize}
          </span>
        ))}
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] text-white/50">
      <LuGift className="w-3 h-3" /> Sürpriz
    </span>
  );
}

// ── Eligibility chip ──────────────────────────────────────────────────────────
function EligibilityChip({ raffle, tagDays }: { raffle: BadgeInfo['activeRaffles'][0]; tagDays: number }) {
  const elig = (raffle as any).eligibility_type ?? 'tag';
  if (elig === 'everyone') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-white/5 text-white/50 border-white/10">
        <LuUsers className="w-3 h-3" /> Herkes
      </span>
    );
  }
  if (elig === 'booster') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-pink-500/10 text-pink-400 border-pink-500/20">
        ⚡ Booster
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
      <LuTag className="w-3 h-3" />
      {raffle.min_tag_days}g tag
    </span>
  );
}

export default function RafflesSection({ badgeInfo, loading, onJoinRaffle }: RafflesSectionProps) {
  const t = useT();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [leaveErrorId, setLeaveErrorId] = useState<string | null>(null);
  const [joinedLocal, setJoinedLocal] = useState<string[]>([]);
  const [leftLocal, setLeftLocal] = useState<string[]>([]);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const raffles = badgeInfo?.activeRaffles ?? [];
  const drawnRaffles: DrawnRaffle[] = badgeInfo?.drawnRaffles ?? [];
  const eligible = badgeInfo?.eligibleRaffles ?? [];
  const tagDays = badgeInfo?.tagDays ?? 0;

  // joined = server-side joined - left locally + joined locally
  const serverJoined = badgeInfo?.joinedRaffles ?? [];
  const joined = [...serverJoined.filter((id) => !leftLocal.includes(id)), ...joinedLocal];

  const bgOffset = useState(() => Math.floor(Math.random() * STORE_BACKGROUNDS.length))[0];
  const gifMap = useMemo(() => {
    const m = new Map<string, string>();
    raffles.forEach((r, idx) => {
      m.set(r.id, STORE_BACKGROUNDS[(bgOffset + idx) % STORE_BACKGROUNDS.length]!);
    });
    return m;
  }, [raffles, bgOffset]);

  async function handleJoin(raffleId: string) {
    if (!onJoinRaffle) return;
    setJoiningId(raffleId);
    setErrorId(null);
    try {
      await onJoinRaffle(raffleId);
      setJoinedLocal((prev) => [...prev, raffleId]);
    } catch {
      setErrorId(raffleId);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleLeave(raffleId: string) {
    setLeavingId(raffleId);
    setLeaveErrorId(null);
    try {
      const res = await fetchWithCreds('/api/member/raffles/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raffle_id: raffleId }),
      });
      if (res.ok) {
        setLeftLocal((prev) => [...prev, raffleId]);
        setJoinedLocal((prev) => prev.filter((id) => id !== raffleId));
      } else {
        setLeaveErrorId(raffleId);
      }
    } catch {
      setLeaveErrorId(raffleId);
    } finally {
      setLeavingId(null);
    }
  }

  // Compute per-raffle state
  function raffleState(raffle: BadgeInfo['activeRaffles'][0]) {
    const startDate = raffle.start_date ? new Date(raffle.start_date).getTime() : null;
    const msToStart = startDate ? startDate - now : null;
    const isUpcoming = msToStart !== null && msToStart > 0;
    const isEligible = eligible.includes(raffle.id);
    const hasJoined = joined.includes(raffle.id);
    const isJoining = joiningId === raffle.id;
    const isLeaving = leavingId === raffle.id;
    const hasError = errorId === raffle.id;
    const isExpiringSoon = raffle.end_date
      ? new Date(raffle.end_date).getTime() - now < 3 * 24 * 60 * 60 * 1000
      : false;
    const hasLeaveError = leaveErrorId === raffle.id;
    return { isUpcoming, msToStart, isEligible, hasJoined, isJoining, isLeaving, hasError, isExpiringSoon, hasLeaveError };
  }

  return (
    <section className="relative rounded-none border-0 bg-[#0e1018] p-3 sm:p-8 flex flex-col min-h-full">

      {/* Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/20">
            <LuGift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('raffles_title')}</h2>
            <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">{t('raffles_subtitle')}</p>
          </div>
        </div>
        {raffles.length > 0 && (
          <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full px-2.5 py-1">
            {t('raffles_active_count', { count: raffles.length })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/60">
          <LuLoader className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      ) : raffles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 mb-3 opacity-60 grayscale">
            <Image src="/gif/sungorbobcry.gif" alt="Empty" width={96} height={96} className="object-contain" unoptimized />
          </div>
          <h3 className="text-base font-bold text-white">{t('raffles_empty_title')}</h3>
          <p className="text-white/40 text-xs mt-1">{t('raffles_empty_subtitle')}</p>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col">

          {/* Desktop grid */}
          <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {raffles.map((raffle) => {
              const { isUpcoming, msToStart, isEligible, hasJoined, isJoining, isLeaving, hasError, isExpiringSoon, hasLeaveError } = raffleState(raffle);

              return (
                <div
                  key={raffle.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border bg-[#0b0d12] p-5 transition-all duration-500 hover:-translate-y-1 ${
                    isUpcoming
                      ? 'border-amber-500/30 hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)]'
                      : hasJoined
                      ? 'border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)]'
                      : isEligible
                      ? 'border-white/10 hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:border-emerald-500/50'
                      : 'border-white/10 hover:shadow-[0_20px_50px_rgba(88,101,242,0.15)] hover:border-white/20'
                  }`}
                >
                  {/* GIF arka plan */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[24px]">
                    <div className={`absolute inset-0 z-10 transition-colors duration-500 ${isUpcoming ? 'bg-[#0b0d12]/60' : 'bg-[#0b0d12]/40 group-hover:bg-[#0b0d12]/30'}`} />
                    <div className={`absolute inset-0 z-0 scale-105 transition-all duration-700 ease-out mix-blend-screen brightness-110 ${isUpcoming ? 'opacity-30 grayscale' : 'opacity-60 group-hover:opacity-90 group-hover:scale-110'}`}>
                      <Image src={gifMap.get(raffle.id) ?? '/store-background/sunger-bob/sunger2.gif'} alt="" fill className="object-cover" unoptimized />
                    </div>
                  </div>

                  {/* Upcoming overlay shimmer */}
                  {isUpcoming && (
                    <div className="absolute inset-0 z-10 pointer-events-none rounded-[24px] border border-amber-400/20" />
                  )}

                  <div className="relative z-10">
                    {/* Prize badges + joined status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-1">
                        <PrizeBadge raffle={raffle} />
                      </div>
                      {isUpcoming && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse">
                          <LuClock className="w-2.5 h-2.5" /> Yakında
                        </span>
                      )}
                      {!isUpcoming && hasJoined && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <LuCheck className="w-2.5 h-2.5" /> {t('raffles_joined_badge')}
                        </span>
                      )}
                    </div>

                    <h3 className={`font-bold text-base leading-tight mb-1 drop-shadow-md transition-colors ${
                      isUpcoming ? 'text-white/70'
                      : hasJoined ? 'text-emerald-300 group-hover:text-emerald-200'
                      : isEligible ? 'text-white group-hover:text-emerald-300'
                      : 'text-white/60 group-hover:text-white/80'
                    }`}>
                      {raffle.title}
                    </h3>

                    <p className="text-xs text-white/60 leading-relaxed line-clamp-2 min-h-[32px] group-hover:text-white/90 transition-colors">
                      {raffle.description || t('raffles_default_desc')}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <EligibilityChip raffle={raffle} tagDays={tagDays} />
                      {(raffle.winner_count ?? 1) > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          <LuTrophy className="w-3 h-3" /> {raffle.winner_count} kazanan
                        </span>
                      )}
                      {(raffle.entry_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-white/5 text-white/40 border-white/10">
                          <LuUsers className="w-3 h-3" /> {raffle.entry_count}
                        </span>
                      )}
                      {raffle.end_date && !isUpcoming && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm ${
                          isExpiringSoon ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {isExpiringSoon ? <LuClock className="w-3 h-3" /> : <LuCalendar className="w-3 h-3" />}
                          {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action area */}
                  <div className={`relative z-10 mt-4 transition-all duration-300 ease-out overflow-hidden ${
                    isUpcoming || isJoining || isLeaving || hasJoined || hasError ? 'max-h-[80px] opacity-100' : 'max-h-0 opacity-0 group-hover:max-h-[80px] group-hover:opacity-100'
                  }`}>
                    {isUpcoming ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-center">
                        <p className="text-[10px] text-amber-300/60 font-medium mb-0.5">Çekiliş başlayana kadar</p>
                        <p className="text-sm font-bold text-amber-300 tabular-nums tracking-widest">
                          {formatCountdown(msToStart ?? 0)}
                        </p>
                      </div>
                    ) : hasJoined ? (
                      <div className="flex flex-col gap-1">
                        {hasLeaveError && <p className="text-[10px] text-red-400/80">İptal edilemedi, tekrar dene.</p>}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 flex-1">
                            <LuCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-emerald-300 font-medium">{t('raffles_joined_success')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleLeave(raffle.id)}
                            disabled={isLeaving}
                            title="Katılımı iptal et"
                            className="flex items-center justify-center w-9 h-9 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                          >
                            {isLeaving ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : <LuX className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : isEligible ? (
                      <>
                        {hasError && <p className="mb-1.5 text-[10px] text-red-400/80">{t('raffles_join_error')}</p>}
                        <button
                          type="button"
                          onClick={() => void handleJoin(raffle.id)}
                          disabled={isJoining}
                          className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                        >
                          {isJoining ? <LuLoader className="w-4 h-4 animate-spin" /> : <><LuTicket className="w-4 h-4" /> {t('raffles_join_button')}</>}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                        <LuLock className="w-4 h-4 text-white/30 shrink-0" />
                        <span className="text-xs text-white/40">
                          {(raffle as any).eligibility_type === 'booster'
                            ? 'Booster gerekli'
                            : raffle.min_tag_days - tagDays > 0
                            ? `${raffle.min_tag_days - tagDays} gün daha tag taşı`
                            : t('raffles_tag_days_required', { count: raffle.min_tag_days })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile list */}
          <div className="sm:hidden space-y-3 flex-1">
            {raffles.map((raffle) => {
              const { isUpcoming, msToStart, isEligible, hasJoined, isJoining, isLeaving, hasError, hasLeaveError } = raffleState(raffle);

              return (
                <div
                  key={raffle.id}
                  className={`relative flex overflow-hidden rounded-2xl border bg-[#0b0d12] ${
                    isUpcoming ? 'border-amber-500/30'
                    : hasJoined ? 'border-emerald-500/40'
                    : isEligible ? 'border-white/15'
                    : 'border-white/8'
                  }`}
                >
                  {/* GIF left */}
                  <div className="relative flex-shrink-0 w-28 min-h-[120px] overflow-hidden">
                    <div className="absolute inset-0 bg-[#0b0d12]/20 z-10" />
                    <Image src={gifMap.get(raffle.id) ?? '/store-background/sunger-bob/sunger2.gif'} alt="" fill className={`object-cover ${isUpcoming ? 'opacity-40 grayscale' : 'opacity-80'}`} unoptimized />
                  </div>

                  <div className="flex-1 flex flex-col justify-between p-3 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className={`text-sm font-bold leading-tight truncate ${isUpcoming ? 'text-white/50' : hasJoined ? 'text-emerald-300' : isEligible ? 'text-white' : 'text-white/60'}`}>
                          {raffle.title}
                        </h4>
                        {isUpcoming ? (
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">Yakında</span>
                        ) : hasJoined && (
                          <span className="shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <LuCheck className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <EligibilityChip raffle={raffle} tagDays={tagDays} />
                        {(raffle.winner_count ?? 1) > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                            <LuTrophy className="w-2.5 h-2.5" /> {raffle.winner_count}
                          </span>
                        )}
                        {(raffle.entry_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/30">
                            <LuUsers className="w-2.5 h-2.5" /> {raffle.entry_count}
                          </span>
                        )}
                        {raffle.end_date && !isUpcoming && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/30">
                            <LuCalendar className="w-2.5 h-2.5" />
                            {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5">
                      {isUpcoming ? (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-2 text-center">
                          <p className="text-[9px] text-amber-300/60">Başlayana kadar</p>
                          <p className="text-xs font-bold text-amber-300 tabular-nums">{formatCountdown(msToStart ?? 0)}</p>
                        </div>
                      ) : hasJoined ? (
                        <div className="flex flex-col gap-1">
                          {hasLeaveError && <p className="text-[9px] text-red-400/80">İptal edilemedi.</p>}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 h-8 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 flex-1">
                              <LuCheck className="w-3 h-3 text-emerald-400" />
                              <span className="text-[11px] text-emerald-300 font-medium">{t('raffles_participated_badge')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleLeave(raffle.id)}
                              disabled={isLeaving}
                              className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                            >
                              {isLeaving ? <LuLoader className="w-3 h-3 animate-spin" /> : <LuX className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ) : isEligible ? (
                        <button
                          type="button"
                          onClick={() => void handleJoin(raffle.id)}
                          disabled={isJoining}
                          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 transition-all active:scale-95 disabled:opacity-70"
                        >
                          {isJoining ? <LuLoader className="w-3 h-3 animate-spin" /> : <><LuTicket className="w-3.5 h-3.5" /> {t('raffles_participate_button')}</>}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 h-8 rounded-lg border border-white/8 bg-white/4 px-2.5">
                          <LuLock className="w-3 h-3 text-white/25" />
                          <span className="text-[10px] text-white/35">
                            {(raffle as any).eligibility_type === 'booster' ? 'Booster gerekli'
                              : raffle.min_tag_days - tagDays > 0 ? `${raffle.min_tag_days - tagDays}g daha`
                              : `${raffle.min_tag_days}g tag gerekli`}
                          </span>
                        </div>
                      )}
                      {hasError && <p className="mt-1 text-[9px] text-red-400/80">{t('raffles_join_error')}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawn raffles history */}
          {drawnRaffles.length > 0 && (
            <div className="mt-6 sm:mt-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-violet-500/15 rounded-lg text-violet-400">
                  <LuTrophy className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Geçmiş Çekilişler</p>
                  <p className="text-[10px] text-white/40">Son 1 haftadaki tamamlanan çekilişler</p>
                </div>
              </div>
              <div className="space-y-2">
                {drawnRaffles.map((dr) => (
                  <div key={dr.id} className={`rounded-xl border p-3 sm:p-4 ${dr.iWon ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/8 bg-white/[0.03]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white/80">{dr.title}</p>
                          {dr.iWon && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-[10px] text-yellow-300 font-bold">
                              🏆 Kazandın!
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/35 mt-0.5">
                          {new Date(dr.drawn_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-white/30">{dr.winner_count} kazanan</span>
                    </div>
                    {dr.winners.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dr.winners.map((w) => (
                          <span key={w.user_id} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${w.user_id === (badgeInfo as any)?.userId ? 'bg-yellow-500/15 border-yellow-500/25 text-yellow-300' : 'bg-white/5 border-white/10 text-white/50'}`}>
                            {w.username}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-white/25">Kazanan bilgisi henüz yok</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info accordion */}
          <div className="mt-5 sm:mt-8 hidden sm:block">
            <button
              onClick={() => setInfoOpen(!infoOpen)}
              className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500/15 rounded-lg text-emerald-400">
                  <LuInfo className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{t('raffles_about_title')}</p>
                  <p className="text-[10px] text-white/40">{t('raffles_about_subtitle')}</p>
                </div>
              </div>
              {infoOpen ? <LuChevronUp className="text-white/40" /> : <LuChevronDown className="text-white/40" />}
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${infoOpen ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 text-xs text-white/60 space-y-2">
                <p>• &quot;Yakında&quot; rozeti olan çekilişler sayaç sıfırlanınca otomatik olarak katılıma açılır.</p>
                <p>• Katılımınızı çekiliş sona ermeden önce iptal edebilirsiniz.</p>
                <p>• Her çekilişe yalnızca bir kez katılabilirsiniz; çift kayıt engellenmiştir.</p>
                <p>• Çekiliş sonuçları admin tarafından açıklanır; kazananlar Discord ve panel bildirimiyle haberdar edilir.</p>
                <p>• Tag süreniz yeterliyse bile çekiliş süresi dolmuşsa katılım yapılamaz.</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
