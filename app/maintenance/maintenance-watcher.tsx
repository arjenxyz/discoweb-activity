'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';

type MaintenanceWatcherProps = {
  signature: string;
};

const POLL_INTERVAL_MS = 30000;

const buildSignature = (flags: Record<string, { is_active?: boolean; reason?: string | null; updated_at?: string | null }>) =>
  Object.entries(flags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const active = value?.is_active ? 1 : 0;
      const reason = value?.reason ?? '';
      const updatedAt = value?.updated_at ?? '';
      return `${key}:${active}:${reason}:${updatedAt}`;
    })
    .join('|');

export default function MaintenanceWatcher({ signature }: MaintenanceWatcherProps) {
  const router = useRouter();
  const lastSignatureRef = useRef(signature);

  useEffect(() => {
    lastSignatureRef.current = signature;
  }, [signature]);

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch(apiUrl('/api/maintenance'), { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          flags?: Record<string, { is_active?: boolean; reason?: string | null; updated_at?: string | null }>;
        };
        if (!data?.flags) {
          return;
        }

        const nextSignature = buildSignature(data.flags);
        if (lastSignatureRef.current !== nextSignature) {
          lastSignatureRef.current = nextSignature;
          router.refresh();
        }
      } catch {
        // Ignore network errors; next poll will retry.
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
