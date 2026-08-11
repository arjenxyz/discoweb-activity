'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { LuCoins, LuLock, LuX, LuZap } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import { TierIcon, tierRequired, type TierCardState, type TierLike, type TrackMode } from './tierUtils';

type Props = {
  tier: TierLike | null;
  mode: TrackMode;
  state: TierCardState;
  progress: number;
  onClose: () => void;
};

export default function TierDetailModal({ tier, mode, state, progress, onClose }: Props) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tier) return;
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
  }, [tier, onClose]);

  if (!tier) return null;

  const color = tier.color ?? (mode === 'tag' ? '#818cf8' : '#f472b6');
  const required = tierRequired(tier, mode);
  const unit = mode === 'tag' ? t('badge_days_unit') : t('badge_months_unit');
  const remaining = Math.max(0, required - progress);
  const locked = state === 'locked';

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#0b0d12] shadow-2xl">
        <div className="relative h-44">
          {tier.background_image ? (
            <Image src={tier.background_image} alt="" fill className={`object-cover ${locked ? 'grayscale' : ''}`} unoptimized />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${color}66, #0b0d12)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white"
          >
            <LuX className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="mb-2 text-3xl">
              <TierIcon emoji={tier.emoji} fallback="🏅" size={32} />
            </div>
            <h3 className="text-xl font-black text-white">{tier.name}</h3>
            <p className="text-sm text-white/50">
              {required} {unit}
              {locked && (
                <span className="ml-2 text-white/40">
                  · {mode === 'tag' ? t('badge_days_left', { days: remaining }) : t('badge_months_left', { months: remaining })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {tier.description && <p className="text-sm leading-relaxed text-white/55">{tier.description}</p>}

          {locked && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/45">
              <LuLock className="h-4 w-4 shrink-0" />
              {mode === 'tag' ? t('badge_days_required', { days: required }) : t('badge_months_required', { months: required })}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(tier.reward_papel ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                <LuCoins className="h-3.5 w-3.5" />
                {t('badge_reward_papel', { amount: tier.reward_papel ?? 0 })}
              </span>
            )}
            {(tier.reward_earn_multiplier ?? 1) > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <LuZap className="h-3.5 w-3.5" />
                {t('badge_reward_multiplier', { multiplier: tier.reward_earn_multiplier ?? 1 })}
              </span>
            )}
            {tier.reward_message && (
              <span className="inline-flex items-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
                {tier.reward_message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
