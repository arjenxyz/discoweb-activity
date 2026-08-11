'use client';

import { useEffect, useState } from 'react';
import { LuClock } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

const SERVER_TZ = 'Europe/Istanbul';

type TimeParts = {
  date: string;
  time: string;
};

type Props = {
  className?: string;
  variant?: 'inline' | 'banner';
};

export default function ServerTimeClock({ className = '', variant = 'inline' }: Props) {
  const t = useT();
  const [parts, setParts] = useState<TimeParts | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setParts({
        date: now.toLocaleDateString('tr-TR', {
          timeZone: SERVER_TZ,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        time: now.toLocaleTimeString('tr-TR', {
          timeZone: SERVER_TZ,
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!parts) return null;

  if (variant === 'banner') {
    return (
      <div className={`min-w-0 ${className}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 drop-shadow-sm">
          {t('dashboard_server_time_label')}
        </p>
        <p className="mt-0.5 truncate font-mono text-[13px] tabular-nums leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
          <span>UTC+3</span>
          <span className="mx-1.5 text-white/20">·</span>
          <span>{parts.date}</span>
          <span className="mx-1.5 text-white/20">·</span>
          <span className="font-medium">{parts.time}</span>
        </p>
      </div>
    );
  }

  return (
    <p className={`flex items-center gap-1.5 text-[11px] leading-none ${className}`}>
      <LuClock className="h-3 w-3 shrink-0 text-white/30" />
      <span className="text-white/35">{t('dashboard_server_time_label')}:</span>
      <span className="font-mono tabular-nums text-white/55">
        UTC+3 {parts.date} {parts.time}
      </span>
    </p>
  );
}
