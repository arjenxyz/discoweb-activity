'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/activity/is-developer')
      .then(r => r.json())
      .then(data => {
        if (!data.isDeveloper) router.replace('/dashboard');
        else setChecked(true);
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  if (!checked) return <div className="flex items-center justify-center min-h-screen text-gray-400">Yetki kontrol ediliyor...</div>;
  return <>{children}</>;
}
