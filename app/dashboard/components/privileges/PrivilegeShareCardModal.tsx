'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { LuHeart, LuMessageSquare, LuMic, LuTag, LuX, LuZap } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import { TierIcon } from './tierUtils';
import type { BadgeTier, BoosterTier } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  avatarUrl?: string | null;
  hasTag: boolean;
  isBooster: boolean;
  currentBadge: BadgeTier | null;
  currentBoosterBadge: BoosterTier | null;
  combinedMessageBonus: number;
  combinedVoiceBonus: number;
  combinedMultiplier: number;
  tagDays: number;
  boosterMonths: number;
};

export default function PrivilegeShareCardModal({
  open,
  onClose,
  displayName,
  avatarUrl,
  hasTag,
  isBooster,
  currentBadge,
  currentBoosterBadge,
  combinedMessageBonus,
  combinedVoiceBonus,
  combinedMultiplier,
  tagDays,
  boosterMonths,
}: Props) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70"
        >
          <LuX className="h-4 w-4" />
        </button>

        <div
          id="privilege-share-card"
          className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12] shadow-2xl"
        >
          <div className="relative h-28 bg-gradient-to-br from-[#5865F2]/40 via-[#f472b6]/25 to-[#0b0d12] px-5 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{t('badge_passport_title')}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/15 bg-white/10">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white/40">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-black text-white">{displayName}</p>
                <p className="text-xs text-white/45">{t('badge_privilege_label')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{t('badge_combined_multiplier')}</p>
              <p className="mt-1 text-xl font-black text-emerald-400">×{combinedMultiplier.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/35">{t('badge_combined_bonus')}</p>
              <div className="mt-1 flex gap-2 text-sm font-bold text-violet-300">
                <span className="inline-flex items-center gap-0.5"><LuMessageSquare className="h-3 w-3" />+{combinedMessageBonus}</span>
                <span className="inline-flex items-center gap-0.5"><LuMic className="h-3 w-3" />+{combinedVoiceBonus}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 px-5 pb-5">
            {hasTag && currentBadge && (
              <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5">
                <LuTag className="h-4 w-4 text-indigo-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{currentBadge.name}</p>
                  <p className="text-[11px] text-white/40">{tagDays} {t('badge_days_unit')}</p>
                </div>
                <TierIcon emoji={currentBadge.emoji} fallback="🏅" size={22} />
              </div>
            )}
            {isBooster && currentBoosterBadge && (
              <div className="flex items-center gap-3 rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2.5">
                <LuHeart className="h-4 w-4 text-pink-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{currentBoosterBadge.name}</p>
                  <p className="text-[11px] text-white/40">{boosterMonths} {t('badge_months_unit')}</p>
                </div>
                <TierIcon emoji={currentBoosterBadge.emoji} fallback="💎" size={22} />
              </div>
            )}
            {!hasTag && !isBooster && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-sm text-white/40">
                {t('badge_inactive')}
              </p>
            )}
          </div>

          <div className="border-t border-white/[0.06] px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25">
            DiscoWeb
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-white/35">{t('badge_share_hint')}</p>
      </div>
    </div>
  );
}
