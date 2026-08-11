'use client';

import { useRef } from 'react';
import { LuChevronLeft, LuChevronRight, LuLock } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import type { BadgeTier, BoosterTier } from '../../types';
import TierCollectibleCard from './TierCollectibleCard';
import TierDetailModal from './TierDetailModal';
import { TierIcon, computeProgressPct, getTierState, tierRequired, type TierLike, type TrackMode } from './tierUtils';
import { useState } from 'react';

type Props = {
  mode: TrackMode;
  tiers: TierLike[];
  progress: number;
  currentTier: BadgeTier | BoosterTier | null;
  nextTier: BadgeTier | BoosterTier | null;
  remaining: number | null;
  active: boolean;
  accent: string;
  id?: string;
};

export default function PrivilegeTrack({
  mode,
  tiers,
  progress,
  currentTier,
  nextTier,
  remaining,
  active,
  accent,
  id,
}: Props) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [detailTier, setDetailTier] = useState<TierLike | null>(null);

  const currentRequired = currentTier ? tierRequired(currentTier, mode) : 0;
  const nextRequired = nextTier ? tierRequired(nextTier, mode) : null;
  const progressPct = computeProgressPct(progress, currentRequired, nextRequired);
  const unlockedCount = tiers.filter((tier) => progress >= tierRequired(tier, mode)).length;

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });
  };

  const detailState = detailTier
    ? getTierState(detailTier, mode, progress, currentTier?.id)
    : 'locked';

  return (
    <section id={id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            {mode === 'tag' ? t('badge_track_tag') : t('badge_track_booster')}
          </h3>
          <p className="mt-0.5 text-xs text-white/40">
            {mode === 'tag' ? t('badge_tag_tiers') : t('badge_booster_tiers')}
          </p>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-white/35">
          {t('badge_unlocked_count', { count: unlockedCount, total: tiers.length })}
        </span>
      </div>

      {!active ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-white/70">
            {mode === 'tag' ? t('badge_no_tag_title') : t('badge_no_boost_title')}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-white/40">
            {mode === 'tag' ? t('badge_no_tag_description') : t('badge_no_boost_description')}
          </p>
          <p className="mt-3 text-xs font-medium" style={{ color: accent }}>
            {mode === 'tag' ? t('badge_cta_add_tag') : t('badge_cta_boost')}
          </p>
        </div>
      ) : (
        <>
          {currentTier && (
            <div
              className="mb-4 flex items-center gap-3 rounded-xl border px-3.5 py-3"
              style={{ borderColor: `${accent}33`, background: `${accent}10` }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
              >
                <TierIcon emoji={currentTier.emoji} fallback={mode === 'tag' ? '🏅' : '💎'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{currentTier.name}</p>
                <p className="text-[11px] text-white/45">
                  {progress} {mode === 'tag' ? t('badge_days_unit') : t('badge_months_unit')}
                </p>
              </div>
              {nextTier && remaining != null && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-white/35">{t('badge_next_milestone')}</p>
                  <p className="text-xs font-semibold text-white/75">{nextTier.name}</p>
                  <p className="text-[11px] tabular-nums text-white/45">
                    {mode === 'tag' ? t('badge_next_days', { days: remaining }) : t('badge_months_left', { months: remaining })}
                  </p>
                </div>
              )}
            </div>
          )}

          {nextTier && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-white/40">{t('badge_next_badge', { name: nextTier.name })}</span>
                <span className="font-medium tabular-nums text-white/65">{progressPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, ${accent}, ${nextTier.color ?? accent})`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="mb-3 hidden sm:flex items-center gap-1">
            {tiers.map((tier, idx) => {
              const unlocked = progress >= tierRequired(tier, mode);
              const isCurrent = currentTier?.id === tier.id;
              const color = tier.color ?? accent;
              return (
                <div key={tier.id} className="flex min-w-0 flex-1 items-center gap-1">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]"
                    style={{
                      background: unlocked ? `${color}22` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${unlocked ? `${color}66` : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: isCurrent ? `0 0 10px ${color}44` : undefined,
                    }}
                  >
                    {unlocked ? (
                      <TierIcon emoji={tier.emoji} fallback="•" size={14} />
                    ) : (
                      <LuLock className="h-2.5 w-2.5 text-white/30" />
                    )}
                  </div>
                  {idx < tiers.length - 1 && (
                    <div className="h-px min-w-[6px] flex-1" style={{ background: unlocked ? `${color}44` : 'rgba(255,255,255,0.06)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tiers.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-8 bg-gradient-to-r from-[#0e1018] to-transparent sm:block" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-8 bg-gradient-to-l from-[#0e1018] to-transparent sm:block" />

          <div className="absolute -top-1 right-0 z-20 hidden gap-1 sm:flex">
            <button type="button" onClick={() => scrollBy(-1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0b0d12]/80 text-white/50 hover:text-white">
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0b0d12]/80 text-white/50 hover:text-white">
              <LuChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-1 pt-1 snap-x snap-mandatory custom-scrollbar"
          >
            {tiers.map((tier) => (
              <TierCollectibleCard
                key={tier.id}
                tier={tier}
                mode={mode}
                state={getTierState(tier, mode, progress, currentTier?.id)}
                progress={progress}
                onClick={() => setDetailTier(tier)}
              />
            ))}
          </div>
        </div>
      )}

      <TierDetailModal
        tier={detailTier}
        mode={mode}
        state={detailState}
        progress={progress}
        onClose={() => setDetailTier(null)}
      />
    </section>
  );
}
