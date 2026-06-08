'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  accent?: string;
  variant?: 'lobby' | 'play';
};

/** Arcade çerçeve — oyun kabini hissi */
export default function GameShell({ children, title, subtitle, accent = '#38bdf8', variant = 'lobby' }: Props) {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden"
      style={{
        maxWidth: variant === 'play' ? '100%' : '42rem',
        boxShadow: `0 0 0 3px #0d2233, 0 0 0 6px ${accent}44, 0 24px 60px rgba(0,0,0,0.55)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-20 opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div
        className="relative border-b border-white/10 px-4 py-3 sm:px-5"
        style={{
          background: `linear-gradient(180deg, ${accent}22 0%, #061520 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">Play &amp; Earn</p>
            <h2 className="text-lg font-black uppercase tracking-wide text-white sm:text-xl">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
      </div>
      <div
        className="relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #0f3d5c 0%, #041018 55%)',
        }}
      >
        {children}
      </div>
      <div className="h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
