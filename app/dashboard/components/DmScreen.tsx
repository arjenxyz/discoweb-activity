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

          {/* Server invitation card */}
          <div className="rounded-xl border border-white/20 bg-white/5 p-4 backdrop-blur-md">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865F2]/20">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-[#5865F2]">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Örnek Sunucu</h3>
                  <p className="text-xs text-white/60">DiscoWeb deneyimini test et</p>
                </div>
              </div>
              
              <div className="text-sm text-white/80 leading-relaxed">
                🎯 <strong>Öneri:</strong> Activity'leri denemek için örnek sunucumuza katılabilirsin. Burada tüm özellikleri test edebilirsin!
              </div>

              <button
                onClick={handleJoinServer}
                className="w-full rounded-full border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-bold text-[#5865F2] backdrop-blur-md transition hover:bg-[#5865F2]/20 hover:border-[#5865F2]/50"
              >
                Sunucuya Katıl
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Nasıl Çalışır:</p>
            {[
              "Discord sunucusuna katıl",
              "Sesli kanala katıl", 
              "Sesli kanaldan Activity'i başlat"
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
