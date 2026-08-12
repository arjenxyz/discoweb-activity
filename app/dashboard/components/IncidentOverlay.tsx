'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

export default function IncidentOverlay() {
  const t = useT();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(apiUrl('/api/incident'), { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { active?: boolean };
        if (cancelled) return;
        setActive(Boolean(data.active));
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#0b0d12]/95 px-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">
          {t('maintenance_incident_title')}
        </p>
        <p className="mt-4 text-lg font-semibold leading-relaxed text-white">
          {t('maintenance_incident_description')}
        </p>
        <p className="mt-3 text-sm text-white/45">{t('maintenance_incident_helper')}</p>
      </div>
    </div>
  );
}
