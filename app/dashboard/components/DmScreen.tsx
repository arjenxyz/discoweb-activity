'use client';

import { useState, useEffect, useRef } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { VideoBackground, MuteButton } from './VideoBackground';

export default function DmScreen() {
  const t = useT();
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  const handleJoinServer = () => {
    window.open('https://discord.gg/BVBXpv36aJ', '_blank');
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Test1.mp4" />

      {/* Ses butonu — masaüstünde sağ üst */}
      <div className="hidden sm:flex absolute z-20 top-6 right-6 items-center gap-2">
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test1.mp4" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
        <div className="flex flex-col gap-5 max-w-lg">
          {/* DM/Grup Badge */}
          <div className="w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-400 backdrop-blur-md">
            DM veya Grup Sohbeti
          </div>

          <div className="flex flex-col gap-3">
            <h1
              className="text-4xl font-black leading-tight tracking-tight text-white"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 2px 20px rgba(0,0,0,1)' }}
            >
              Sunucu Gerekli
            </h1>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
              DM veya grup sohbetlerinden açılan Activity'lerde sunucu bilgisi bulunmadığı için sistem çalışamaz.
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Nasıl Çalışır:</p>
            {[
              "Discord sunucusuna katıl",
              "Sesli kanalda veya metin kanalında Activity'i başlat", 
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-md"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-white/80">{step}</span>
              </div>
            ))}
          </div>

          {/* Close hint */}
          <p className="text-xs text-white/30 pt-2">
            Bu pencereyi kapatabilirsiniz.
          </p>
        </div>

        {/* Mobilde ses butonu butonun sağında */}
        <div className="sm:hidden">
          <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test1.mp4" />
        </div>
      </main>
    </div>
  );
}
