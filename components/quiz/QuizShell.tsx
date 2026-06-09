'use client';

import type { ReactNode } from 'react';

type Variant = 'lobby' | 'live' | 'eliminated' | 'muted' | 'idle';

const VARIANT_TINT: Record<Variant, string | null> = {
  lobby: null,
  live: 'bg-amber-500/[0.03]',
  eliminated: 'bg-rose-500/[0.05]',
  muted: null,
  idle: null,
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
  const tint = VARIANT_TINT[variant];

  return (
    <div
      className={`relative flex h-full min-h-[min(68dvh,640px)] w-full flex-1 flex-col overflow-hidden rounded-none border-0 bg-[#0e1018] sm:min-h-[72dvh] sm:rounded-2xl sm:border sm:border-white/[0.06] ${className}`}
    >
      {tint && <div className={`pointer-events-none absolute inset-0 ${tint}`} />}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-6">{children}</div>
    </div>
  );
}
