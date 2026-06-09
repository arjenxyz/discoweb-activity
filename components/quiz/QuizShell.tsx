'use client';

import type { ReactNode } from 'react';

type Variant = 'lobby' | 'live' | 'eliminated' | 'muted';

const VARIANT_STYLES: Record<Variant, { gradient: string; accent: string }> = {
  lobby: {
    gradient: 'linear-gradient(165deg, #0c1224 0%, #151b35 40%, #1a1040 100%)',
    accent: 'rgba(99, 102, 241, 0.35)',
  },
  live: {
    gradient: 'linear-gradient(165deg, #081018 0%, #0f1f3d 45%, #1a0f2e 100%)',
    accent: 'rgba(245, 158, 11, 0.3)',
  },
  eliminated: {
    gradient: 'linear-gradient(165deg, #180a10 0%, #1a1020 50%, #0c0812 100%)',
    accent: 'rgba(244, 63, 94, 0.35)',
  },
  muted: {
    gradient: 'linear-gradient(165deg, #0e1018 0%, #12141c 100%)',
    accent: 'rgba(255, 255, 255, 0.08)',
  },
};

export function QuizShell({
  children,
  variant = 'live',
  className = '',
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const style = VARIANT_STYLES[variant];

  return (
    <div
      className={`relative flex min-h-[min(68dvh,640px)] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] sm:min-h-[72dvh] ${className}`}
      style={{ background: style.gradient }}
    >
      <div
        className="pointer-events-none absolute -left-16 top-8 h-56 w-56 rounded-full blur-[80px] animate-quiz-float-orb"
        style={{ background: style.accent }}
      />
      <div
        className="pointer-events-none absolute -right-12 bottom-12 h-48 w-48 rounded-full blur-[70px] animate-quiz-float-orb"
        style={{ background: style.accent, animationDelay: '-3s' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-6">{children}</div>
    </div>
  );
}
