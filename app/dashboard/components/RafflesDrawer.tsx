'use client';

import { useState, useEffect } from 'react';
import {
  LuX, LuTicket, LuClock, LuUsers, LuLoader,
  LuCoins, LuShield, LuZap, LuGift, LuChevronLeft,
} from 'react-icons/lu';
import type { BadgeInfo } from '../types';
import { useT } from '@/contexts/LocaleContext';

type Raffle = BadgeInfo['activeRaffles'][0];

type RafflesDrawerProps = {
  open: boolean;
  onClose: () => void;
  joinedRaffleIds: string[];
  activeRaffles: Raffle[];
  onLeave: (raffleId: string) => Promise<void>;
  leavingId: string | null;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '—';
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

function PrizeLabel({ raffle }: { raffle: Raffle }) {
  const t = useT();
  
  if (raffle.prize_type === 'papel' && raffle.prize_papel_amount) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/25 text-[10px] text-yellow-300 font-bold">
        <LuCoins className="w-3 h-3" /> {t('raffles_prize_papel', { amount: Number(raffle.prize_papel_amount).toLocaleString('tr-TR') })}
      </span>
    );
  }
  if (raffle.prize_type === 'role') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[10px] text-violet-300 font-bold">
        <LuShield className="w-3 h-3" /> {t('raffles_prize_role')}
      </span>
    );
  }
  if (raffle.prize_type === 'timed_multiplier' && raffle.prize_multiplier_value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] text-emerald-300 font-bold">
        <LuZap className="w-3 h-3" /> {t('raffles_prize_multiplier', { multiplier: raffle.prize_multiplier_value, days: raffle.prize_multiplier_days ?? 0 })}
      </span>
    );
  }
  if (raffle.prize_type === 'mari' && raffle.prize_mari_amount) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-[10px] text-indigo-300 font-bold">
        💎 {t('raffles_prize_mari', { amount: Number(raffle.prize_mari_amount).toFixed(2) })}
      </span>
    );
  }
  if (raffle.prizes && raffle.prizes.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] text-white/60">
        🎁 {raffle.prizes[0]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] text-white/50">
      <LuGift className="w-3 h-3" /> {t('raffles_prize_surprise')}
    </span>
  );
}

export default function RafflesDrawer({
  open,
  onClose,
  joinedRaffleIds,
  activeRaffles,
  onLeave,
  leavingId,
}: RafflesDrawerProps) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const [leaveErrors, setLeaveErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const joinedRaffles = activeRaffles.filter((r) => joinedRaffleIds.includes(r.id));

  async function handleLeave(raffleId: string) {
    setLeaveErrors((prev) => { const s = new Set(prev); s.delete(raffleId); return s; });
    try {
      await onLeave(raffleId);
    } catch {
      setLeaveErrors((prev) => new Set(prev).add(raffleId));
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[420px] h-full bg-[#0b0d12]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col">

        {/* Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-[60px] pointer-events-none" />

        {/* HEADER */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-xl bg-white/8 text-white/70 hover:text-white hover:bg-white/15 transition-all"
              aria-label={t('raffles_back_label')}
            >
              <LuChevronLeft className="w-5 h-5" />
            </button>
            <img src="/icon/raffle.png" alt="" className="w-5 h-5 object-contain" />
            <span className="text-white font-bold text-lg">{t('raffles_drawer_title')}</span>
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] px-2 py-0.5 rounded-full font-semibold">
              {t('raffles_drawer_active_count', { count: joinedRaffles.length })}
            </span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors" aria-label={t('raffles_close_label')}>
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {joinedRaffles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
              <div className="text-5xl opacity-30">🎫</div>
              <div>
                <p className="text-white/40 text-sm font-medium">{t('raffles_drawer_empty_title')}</p>
                <p className="text-white/25 text-xs mt-1">{t('raffles_drawer_empty_subtitle')}</p>
              </div>
            </div>
          ) : (
            joinedRaffles.map((raffle) => {
              const endMs = raffle.end_date ? new Date(raffle.end_date).getTime() - now : null;
              const isLeaving = leavingId === raffle.id;
              const hasError = leaveErrors.has(raffle.id);
              const winChance = raffle.entry_count && raffle.entry_count > 0
                ? `1/${raffle.entry_count}`
                : '1/1';

              return (
                <div
                  key={raffle.id}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 transition-all hover:border-emerald-500/35"
                >
                  {/* Top: prize + title */}
                  <div className="mb-3">
                    <div className="mb-1.5">
                      <PrizeLabel raffle={raffle} />
                    </div>
                    <p className="text-sm font-bold text-white leading-tight">{raffle.title}</p>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-3">
                    {endMs !== null && endMs > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-white/45">
                        <LuClock className="w-3 h-3 text-amber-400/70" />
                        <span className="tabular-nums">{formatCountdown(endMs)}</span>
                      </div>
                    )}
                    {raffle.entry_count !== undefined && (
                      <div className="flex items-center gap-1 text-[11px] text-white/45">
                        <LuUsers className="w-3 h-3" />
                        <span>{t('raffles_participants_count', { count: raffle.entry_count })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400/80 ml-auto">
                      <LuTicket className="w-3 h-3" />
                      <span className="font-semibold">{t('raffles_win_chance_label', { chance: winChance })}</span>
                    </div>
                  </div>

                  {/* Leave button */}
                  <button
                    onClick={() => handleLeave(raffle.id)}
                    disabled={isLeaving}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-white/50 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-all disabled:opacity-40"
                  >
                    {isLeaving
                      ? <><LuLoader className="w-3 h-3 animate-spin" /> {t('raffles_leaving')}</>
                      : t('raffles_leave_button')}
                  </button>
                  {hasError && <p className="mt-1 text-[10px] text-rose-400 text-center">{t('raffles_leave_error')}</p>}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="relative z-10 border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            {joinedRaffles.length > 0 ? (
              <>
                <span>{t('raffles_footer_active', { count: joinedRaffles.length })}</span>
                <span className="text-emerald-400/70 font-semibold">
                  {t('raffles_footer_opportunities', { count: joinedRaffles.length })}
                </span>
              </>
            ) : (
              <div className="flex-1" />
            )}
          </div>
          {/* Mobil geri butonu */}
          <button
            onClick={onClose}
            className="sm:hidden mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all text-sm font-semibold"
          >
            <LuChevronLeft className="w-4 h-4" />
            {t('raffles_back_button')}
          </button>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
