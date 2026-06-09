'use client';

import { useEffect, useState } from 'react';
import { LuClock } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

const SERVER_TZ = 'Europe/Istanbul';

type ServerTimeClockProps = {
  compact?: boolean;
  className?: string;
};

export default function ServerTimeClock({ compact = false, className = '' }: ServerTimeClockProps) {
  const t = useT();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!now) return null;

  const dateStr = now.toLocaleDateString('tr-TR', {
    timeZone: SERVER_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('tr-TR', {
    timeZone: SERVER_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const timeShort = now.toLocaleTimeString('tr-TR', {
    timeZone: SERVER_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <div
        className={`flex flex-col items-center gap-1 ${className}`}
        title={`${t('dashboard_server_time_label')} · UTC+3 ${dateStr} ${timeStr}`}
      >
        <LuClock className="h-3.5 w-3.5 text-sky-400/80" />
        <span className="text-[9px] font-mono font-semibold tabular-nums text-white/50">{timeShort}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] px-3 py-2.5 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
          <LuClock className="h-4 w-4 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
            {t('dashboard_server_time_label')}
          </p>
          <p className="font-mono text-base font-bold tabular-nums leading-tight text-white">{timeStr}</p>
          <p className="mt-0.5 text-[10px] text-white/40">
            UTC+3 · {dateStr}
          </p>
        </div>
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.45)]" />
      </div>
    </div>
  );
}
