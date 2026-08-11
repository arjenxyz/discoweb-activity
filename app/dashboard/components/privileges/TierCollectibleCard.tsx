'use client';

import Image from 'next/image';
import { LuCircleCheck, LuLock } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import { TierIcon, tierRequired, type TierCardState, type TierLike, type TrackMode } from './tierUtils';

type Props = {
  tier: TierLike;
  mode: TrackMode;
  state: TierCardState;
  progress: number;
  onClick?: () => void;
  compact?: boolean;
};

export default function TierCollectibleCard({ tier, mode, state, progress, onClick, compact }: Props) {
  const t = useT();
  const color = tier.color ?? (mode === 'tag' ? '#818cf8' : '#f472b6');
  const required = tierRequired(tier, mode);
  const unit = mode === 'tag' ? t('badge_days_unit') : t('badge_months_unit');
  const remaining = Math.max(0, required - progress);
  const locked = state === 'locked';
  const current = state === 'current';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        compact ? 'w-[128px]' : 'w-[148px] sm:w-[168px]'
      } ${current ? 'scale-[1.02] z-10' : 'hover:scale-[1.02]'} ${locked ? 'opacity-75' : 'opacity-100'}`}
      style={{
        borderColor: current ? `${color}88` : locked ? 'rgba(255,255,255,0.08)' : `${color}44`,
        boxShadow: current ? `0 0 24px ${color}33` : undefined,
      }}
    >
      <div className={`relative ${compact ? 'h-[168px]' : 'h-[190px] sm:h-[200px]'}`}>
        {tier.background_image ? (
          <Image src={tier.background_image} alt="" fill className={`object-cover ${locked ? 'grayscale' : ''}`} unoptimized />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${color}55 0%, ${color}22 40%, #0b0d12 100%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <LuLock className="h-5 w-5 text-white/50" />
            <span className="mt-1.5 px-2 text-center text-[10px] font-medium text-white/55">
              {mode === 'tag'
                ? t('badge_days_left', { days: remaining })
                : t('badge_months_left', { months: remaining })}
            </span>
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
          {current && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: `${color}cc`, color: '#fff' }}
            >
              {t('badge_active_label')}
            </span>
          )}
          {state === 'unlocked' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <LuCircleCheck className="h-3 w-3" />
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="mb-1 text-2xl drop-shadow-lg">
            <TierIcon emoji={tier.emoji} fallback="🏅" size={26} />
          </div>
          <p className="truncate text-sm font-bold text-white">{tier.name}</p>
          <p className="text-[10px] text-white/50">
            {required} {unit}
          </p>
        </div>
      </div>
    </button>
  );
}
