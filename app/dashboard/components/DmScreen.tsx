'use client';

import { useT } from '@/contexts/LocaleContext';

export default function DmScreen() {
  const t = useT();

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white flex items-center justify-center px-6">
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[480px] w-[480px] rounded-full bg-[#5865F2]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm text-center">
        {/* Icon */}
        <div className="flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 w-20 h-20 backdrop-blur-md">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-[#5865F2]" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        </div>

        {/* Title & subtitle */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {t('dm_screen_title')}
          </h1>
          <p className="text-sm font-semibold text-[#5865F2]">
            {t('dm_screen_subtitle')}
          </p>
          <p className="text-sm text-white/60 leading-relaxed mt-1">
            {t('dm_screen_description')}
          </p>
        </div>

        {/* Steps */}
        <div className="w-full flex flex-col gap-2">
          {([
            t('dm_screen_step_1'),
            t('dm_screen_step_2'),
            t('dm_screen_step_3'),
          ] as string[]).map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-md"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/30 text-xs font-bold text-[#5865F2]">
                {i + 1}
              </span>
              <span className="text-sm text-white/80">{step}</span>
            </div>
          ))}
        </div>

        {/* Close hint */}
        <p className="text-xs text-white/30">
          {t('dm_screen_close_hint')}
        </p>
      </div>
    </div>
  );
}
