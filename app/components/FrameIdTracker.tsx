'use client';

import { useEffect } from 'react';

export default function FrameIdTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const instanceId = params.get('instance_id');

    if (!params.get('frame_id') && !instanceId) return;

    try {
      // discord_frame_id'yi burada YAZMA — DiscordActivityAuth yeni session tespiti için
      // önceki frame_id ile karşılaştırmalı. URL'deki frame_id SDK için zaten yeterli.
      if (instanceId) {
        localStorage.setItem('discord_instance_id', instanceId);
      }
    } catch {
      // ignore storage failures
    }

    // NOT: frame_id veya instance_id'yi URL'den silmeyin!
    // DiscordSDK constructor'ı bu parametreleri window.location.search'den okur.
    // Silersek SDK "frame_id query param is not defined" veya "instance_id query param is not defined" hatası verir.
  }, []);

  return null;
}
