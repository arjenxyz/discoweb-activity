'use client';

import { useEffect } from 'react';

export default function FrameIdTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const frameId = params.get('frame_id');
    if (!frameId) return;

    try {
      localStorage.setItem('discord_frame_id', frameId);
    } catch {
      // ignore storage failures
    }

    // Eğer URL'in temiz görünmesini isterseniz, frame_id'yi URL'den kaldırabilirsiniz.
    // Bu, `router` yerine history API ile yapılır ve sayfayı yeniden yüklemeden çalışır.
    // Ancak dikkat: bu kod, query param'ı tamamen kaldırır.
    const url = new URL(window.location.href);
    url.searchParams.delete('frame_id');
    window.history.replaceState(null, '', url.toString());
  }, []);

  return null;
}
