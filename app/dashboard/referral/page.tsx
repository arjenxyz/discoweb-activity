'use client';

import { Suspense } from 'react';
import ReferralSection from '../../dashboard/components/ReferralSection';
import { useT } from '@/contexts/LocaleContext';

export default function ReferralPage() {
  const t = useT();
  return (
    <main className="min-h-screen bg-[#0e1018]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
            {t('referral_loading')}
          </div>
        }
      >
        <ReferralSection />
      </Suspense>
    </main>
  );
}
