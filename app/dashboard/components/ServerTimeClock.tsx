'use client';

import { useEffect, useState } from 'react';
import { LuClock } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

const SERVER_TZ = 'Europe/Istanbul';

export default function ServerTimeClock({ className = '' }: { className?: string }) {
  const t = useT();
  const [label, setLabel] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
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
      });
      setLabel(`UTC+3 ${dateStr} ${timeStr}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!label) return null;

  return (
    <p className={`flex items-center gap-1.5 text-[11px] leading-none ${className}`}>
      <LuClock className="h-3 w-3 shrink-0 text-white/30" />
      <span className="text-white/35">{t('dashboard_server_time_label')}:</span>
      <span className="font-mono tabular-nums text-white/55">{label}</span>
    </p>
  );
}
