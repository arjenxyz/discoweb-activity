"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import MailSection from '../components/MailSection';
import type { MailItem } from '../types';

export default function MailIndexPage() {
  const router = useRouter();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [mailLoading, setMailLoading] = useState(true);
  const [mailError, setMailError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshMail = async () => {
      if (mounted) setMailLoading(true);
      try {
        const response = await fetchWithCreds(apiUrl('/api/mail'));
        if (response.ok) {
          const data = (await response.json()) as MailItem[];
          if (!mounted) return;
          setMailItems(data);
          setMailError(null);
        } else {
          if (!mounted) return;
          setMailError('Mail bilgileri alınamadı.');
        }
      } catch {
        if (!mounted) return;
        setMailError('Mail bilgileri alınamadı.');
      }
      if (mounted) setMailLoading(false);
    };

    void refreshMail();

    const onRefresh = () => void refreshMail();
    window.addEventListener('mail:refresh', onRefresh as EventListener);

    const mailInterval = setInterval(() => void refreshMail(), 15000);

    return () => {
      mounted = false;
      window.removeEventListener('mail:refresh', onRefresh as EventListener);
      clearInterval(mailInterval);
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <MailSection
          loading={mailLoading}
          error={mailError}
          items={mailItems}
          onBack={() => router.push('/dashboard')}
        />
      </Suspense>
    </div>
  );
}
