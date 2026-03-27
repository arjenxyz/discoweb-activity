'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeveloperPanel from '@/app/dashboard/components/DeveloperPanel';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

export default function ActivityDeveloperPage() {
  const t = useT();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState<boolean | null>(null);

  useEffect(() => {
    const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
    fetch(apiUrl('/api/activity/is-developer'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => setIsDeveloper(!!d.isDeveloper))
      .catch(() => setIsDeveloper(false));

    fetch(apiUrl('/api/activity/maintenance'))
      .then(r => r.json())
      .then(d => setMaintenance(d.maintenance === true))
      .catch(() => {});
  }, []);

  if (isDeveloper === false) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-white/70">{t('developer_page_not_authorized')}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/15"
          >
            {t('developer_page_back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="px-6 py-5">
        <h1 className="text-lg font-bold">{t('developer_page_title')}</h1>
      </div>
      <DeveloperPanel
        maintenance={maintenance}
        onMaintenanceChange={setMaintenance}
        onClose={() => router.back()}
      />
    </div>
  );
}

