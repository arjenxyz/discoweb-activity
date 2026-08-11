'use client';

import Image from 'next/image';
import { LuHeart, LuMessageSquare, LuMic, LuShare2, LuTag, LuZap } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import { TierIcon, computeProgressPct, formatPrivilegeDate } from './tierUtils';
import type { BadgeTier, BoosterTier } from '../../types';

type Props = {
  hasTag: boolean;
  isBooster: boolean;
  currentBadge: BadgeTier | null;
  currentBoosterBadge: BoosterTier | null;
  nextBadge: BadgeTier | null;
  nextBoosterBadge: BoosterTier | null;
  tagDays: number;
  boosterMonths: number;
  daysToNext: number | null;
  monthsToNext: number | null;
  earnMultiplier: number;
  boosterEarnMultiplier: number;
  combinedMessageBonus: number;
  combinedVoiceBonus: number;
  combinedMultiplier: number;
  tagGrantedAt: string | null;
  boosterSince: string | null;
  onShowCard: () => void;
  onScrollToTag?: () => void;
  onScrollToBooster?: () => void;
};

export default function PrivilegePassportHero({
  hasTag,
  isBooster,
  currentBadge,
  currentBoosterBadge,
  nextBadge,
  nextBoosterBadge,
  tagDays,
  boosterMonths,
  daysToNext,
  monthsToNext,
  earnMultiplier,
  boosterEarnMultiplier,
  combinedMessageBonus,
  combinedVoiceBonus,
  combinedMultiplier,
  tagGrantedAt,
  boosterSince,
  onShowCard,
  onScrollToTag,
  onScrollToBooster,
}: Props) {
  const t = useT();
  const tagColor = currentBadge?.color ?? '#818cf8';
  const boostColor = currentBoosterBadge?.color ?? '#f472b6';
  const tagProgress = computeProgressPct(tagDays, currentBadge?.days_required ?? 0, nextBadge?.days_required ?? null);
  const boostProgress = computeProgressPct(
    boosterMonths,
    currentBoosterBadge?.months_required ?? 0,
    nextBoosterBadge?.months_required ?? null,
  );

  const anyActive = hasTag || isBooster;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0d12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(88,101,242,0.18),transparent_45%),radial-gradient(circle_at_100%_0%,rgba(244,114,182,0.16),transparent_40%)]" />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{t('badge_passport_title')}</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{t('badge_title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${anyActive ? 'bg-emerald-400' : 'bg-white/25'}`} />
              <span className="text-[11px] font-medium text-white/55">
                {anyActive ? t('badge_active_privilege') : t('badge_inactive')}
              </span>
            </div>
            {anyActive && (
              <button
                type="button"
                onClick={onShowCard}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <LuShare2 className="h-3.5 w-3.5" />
                {t('badge_show_card')}
              </button>
            )}
          </div>
        </div>

        {!anyActive ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onScrollToTag}
              className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-4 text-left transition hover:bg-indigo-500/10"
            >
              <LuTag className="h-5 w-5 text-indigo-300" />
              <p className="mt-2 text-sm font-bold text-white">{t('badge_cta_add_tag')}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{t('badge_no_tag_description')}</p>
            </button>
            <button
              type="button"
              onClick={onScrollToBooster}
              className="rounded-xl border border-pink-500/20 bg-pink-500/[0.06] px-4 py-4 text-left transition hover:bg-pink-500/10"
            >
              <LuHeart className="h-5 w-5 text-pink-300" />
              <p className="mt-2 text-sm font-bold text-white">{t('badge_cta_boost')}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{t('badge_no_boost_description')}</p>
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-3">
              {hasTag && currentBadge && (
                <div
                  className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: `${tagColor}33`, background: `${tagColor}10` }}
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xl">
                    {currentBadge.background_image ? (
                      <>
                        <Image src={currentBadge.background_image} alt="" fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <TierIcon emoji={currentBadge.emoji} fallback="🏅" />
                        </div>
                      </>
                    ) : (
                      <TierIcon emoji={currentBadge.emoji} fallback="🏅" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">{t('badge_track_tag')}</p>
                    <p className="truncate text-sm font-bold text-white">{currentBadge.name}</p>
                    <p className="text-[11px] text-white/45">{tagDays} {t('badge_days_unit')}</p>
                  </div>
                </div>
              )}
              {isBooster && currentBoosterBadge && (
                <div
                  className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: `${boostColor}33`, background: `${boostColor}10` }}
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xl">
                    {currentBoosterBadge.background_image ? (
                      <>
                        <Image src={currentBoosterBadge.background_image} alt="" fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <TierIcon emoji={currentBoosterBadge.emoji} fallback="💎" />
                        </div>
                      </>
                    ) : (
                      <TierIcon emoji={currentBoosterBadge.emoji} fallback="💎" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">{t('badge_track_booster')}</p>
                    <p className="truncate text-sm font-bold text-white">{currentBoosterBadge.name}</p>
                    <p className="text-[11px] text-white/45">{boosterMonths} {t('badge_months_unit')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-400/70">{t('badge_combined_multiplier')}</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-black text-emerald-400">
                  <LuZap className="h-4 w-4" />
                  ×{combinedMultiplier.toFixed(2)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  Tag ×{earnMultiplier} · Boost ×{boosterEarnMultiplier}
                </p>
              </div>
              <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.06] px-3 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-violet-300/70">{t('badge_combined_bonus')}</p>
                <div className="mt-1 space-y-0.5 text-sm font-bold text-violet-200">
                  <p className="flex items-center gap-1"><LuMessageSquare className="h-3.5 w-3.5 opacity-70" />+{combinedMessageBonus}</p>
                  <p className="flex items-center gap-1"><LuMic className="h-3.5 w-3.5 opacity-70" />+{combinedVoiceBonus}</p>
                </div>
              </div>
              {nextBadge && hasTag && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">{t('badge_next_milestone')}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">{nextBadge.name}</p>
                  <p className="text-[11px] text-white/45">{t('badge_next_days', { days: daysToNext ?? 0 })}</p>
                </div>
              )}
              {nextBoosterBadge && isBooster && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">{t('badge_next_milestone')}</p>
                  <p className="mt-1 truncate text-sm font-bold text-white">{nextBoosterBadge.name}</p>
                  <p className="text-[11px] text-white/45">{t('badge_months_left', { months: monthsToNext ?? 0 })}</p>
                </div>
              )}
            </div>

            {(tagGrantedAt || boosterSince) && (
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/35">
                {tagGrantedAt && hasTag && (
                  <span>{t('badge_start_date')}: {formatPrivilegeDate(tagGrantedAt)}</span>
                )}
                {boosterSince && isBooster && (
                  <span>{t('badge_boost_date')}: {formatPrivilegeDate(boosterSince)}</span>
                )}
              </div>
            )}

            <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
              {hasTag && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-white/40">{t('badge_track_tag')}{nextBadge ? ` → ${nextBadge.name}` : ''}</span>
                    <span className="tabular-nums text-white/55">{tagProgress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${tagProgress}%`, background: `linear-gradient(90deg, ${tagColor}, ${nextBadge?.color ?? tagColor})` }} />
                  </div>
                </div>
              )}
              {isBooster && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-white/40">{t('badge_track_booster')}{nextBoosterBadge ? ` → ${nextBoosterBadge.name}` : ''}</span>
                    <span className="tabular-nums text-white/55">{boostProgress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${boostProgress}%`, background: `linear-gradient(90deg, ${boostColor}, ${nextBoosterBadge?.color ?? boostColor})` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
