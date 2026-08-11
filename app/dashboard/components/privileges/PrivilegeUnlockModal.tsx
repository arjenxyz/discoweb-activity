'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { LuSparkles, LuX } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import { TierIcon, type TierLike, type TrackMode } from './tierUtils';

type Props = {
  tier: TierLike;
  mode: TrackMode;
  onClose: () => void;
};

function ConfettiBurst() {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="privilege-confetti absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm"
          style={{
            background: ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#fff'][i % 5],
            animationDelay: `${(i % 8) * 0.05}s`,
            transform: `rotate(${i * 15}deg) translateY(-${20 + (i % 6) * 8}px)`,
          }}
        />
      ))}
    </div>
  );
}

export default function PrivilegeUnlockModal({ tier, mode, onClose }: Props) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const color = tier.color ?? (mode === 'tag' ? '#818cf8' : '#f472b6');

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <ConfettiBurst />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative h-40">
          {tier.background_image ? (
            <Image src={tier.background_image} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}88, #0b0d12)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/70"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-6 pb-6 pt-2 text-center">
          <div className="mx-auto -mt-10 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-[#0b0d12] text-3xl shadow-xl">
            <TierIcon emoji={tier.emoji} fallback="🏅" size={36} />
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <LuSparkles className="h-3.5 w-3.5" />
            {t('badge_unlock_title')}
          </div>
          <h3 className="text-2xl font-black text-white">{tier.name}</h3>
          <p className="mt-2 text-sm text-white/45">
            {mode === 'tag' ? t('badge_track_tag') : t('badge_track_booster')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition hover:bg-white/90"
          >
            {t('badge_unlock_dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
