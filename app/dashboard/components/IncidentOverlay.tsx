'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

const DEFAULT_MESSAGE =
  'Şu anda büyük bir sorunu çözmek için çalışıyoruz, lütfen sabırlı olun.';

type Props = {
  /** Developers can dismiss / bypass the overlay */
  bypass?: boolean;
};

export default function IncidentOverlay({ bypass = false }: Props) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    if (bypass) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(apiUrl('/api/incident'), { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { active?: boolean; message?: string };
        if (cancelled) return;
        setActive(Boolean(data.active));
        if (data.message) setMessage(data.message);
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
  }, [bypass]);

  if (bypass || !active) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-[#0b0d12]/95 px-6 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Incident</p>
        <p className="mt-4 text-lg font-semibold leading-relaxed text-white">{message || DEFAULT_MESSAGE}</p>
        <p className="mt-3 text-sm text-white/45">Lütfen bu ekranı kapatmayın; sistem düzelince otomatik açılacak.</p>
      </div>
    </div>
  );
}
