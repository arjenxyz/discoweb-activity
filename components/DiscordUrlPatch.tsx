'use client';

import { useEffect } from 'react';

/**
 * Supabase storage URL'lerini Discord Activity proxy'sine yönlendirir.
 * Bu bileşen mümkün olduğunca erken render edilmeli (layout seviyesinde).
 */
export default function DiscordUrlPatch() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Sadece discordsays.com içinde çalıştır
    if (!window.location.hostname.includes('discordsays.com')) return;

    import('@discord/embedded-app-sdk').then(({ patchUrlMappings }) => {
      patchUrlMappings([
        { prefix: '/supabase-storage', target: 'dotmvirtfyepdpcvgucc.supabase.co' },
      ]);
    });
  }, []);

  return null;
}
