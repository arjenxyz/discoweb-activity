import { Suspense } from 'react';
import ReferralSection from '../../dashboard/components/ReferralSection';
import { useT } from '@/contexts/LocaleContext';

export default function ReferralPage() {
  const t = useT();
  return (
    <main className="min-h-screen bg-[#0b0d12] px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Suspense fallback={<div className="text-center text-white">{t('referral_loading')}</div>}>
          <ReferralSection />
        </Suspense>
      </div>
    </main>
  );
}
