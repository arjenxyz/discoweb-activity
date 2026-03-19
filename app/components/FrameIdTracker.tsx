'use client';

import { useEffect } from 'react';

export default function FrameIdTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const frameId = params.get('frame_id');
    const instanceId = params.get('instance_id');

    if (!frameId && !instanceId) return;

    try {
      if (frameId) {
        localStorage.setItem('discord_frame_id', frameId);
      }
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
