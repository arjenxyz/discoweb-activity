'use client';

import { useRef, useState, useEffect } from 'react';
import { MuteButton, VideoBackground } from './VideoBackground';

type Props = {
  onEnter: () => void;
};


export default function SplashScreen({ onEnter }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Kısa gecikme ile içerik fade-in başlar
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0d12]">
      <VideoBackground videoRef={videoRef} />

      {/* Ses butonu */}
      <div className="absolute right-4 top-4 z-20">
        <MuteButton muted={muted} onToggle={toggleMute} />
      </div>

      {/* İçerik — ekranın altına hizalı */}
      <div
        className="relative z-10 mt-auto flex w-full flex-row items-end justify-between gap-6 px-6 pb-10 pt-16 sm:px-10 sm:pb-12"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Sol — başlık + pilleri */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-white/30" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Discord Economy Platform
            </span>
          </div>

          <div className="flex flex-col gap-3 max-w-lg">
            <h1
              className="text-6xl font-black leading-none tracking-tight text-white sm:text-7xl"
              style={{ textShadow: '0 0 80px rgba(88,101,242,0.4), 0 2px 20px rgba(0,0,0,1)' }}
            >
              Disco
              <span className="text-[#5865F2]" style={{ textShadow: '0 0 40px rgba(88,101,242,0.8)' }}>
                Web
              </span>
            </h1>
            <p className="text-base text-white/60 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
              Sunucundaki her adımın bir değeri var. Kazan, harca, öne çık.
            </p>
          </div>

        </div>

        {/* Sağ — buton + link, sol içerikle alt hizalı */}
        <div className="flex shrink-0 flex-col items-end justify-end gap-3">
          <button
            type="button"
            onClick={onEnter}
            className="group relative overflow-hidden rounded-full bg-[#5865F2] px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-[#4752C4] active:scale-95"
            style={{ boxShadow: '0 0 32px rgba(88,101,242,0.5), 0 4px 16px rgba(0,0,0,0.5)' }}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
            <span className="relative flex items-center gap-2">
              Keşfet
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M3.75 7.25a.75.75 0 000 1.5h6.19l-2.72 2.72a.75.75 0 001.06 1.06l4-4a.75.75 0 000-1.06l-4-4a.75.75 0 00-1.06 1.06l2.72 2.72H3.75z" />
              </svg>
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const url = 'https://discoweb.tech';
              try {
                const { DiscordSDK } = await import('@discord/embedded-app-sdk');
                const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
                await sdk.ready();
                await sdk.commands.openExternalLink({ url });
              } catch {
                window.open(url, '_blank');
              }
            }}
            className="text-xs text-white/30 transition hover:text-white/60"
          >
            discoweb.tech ↗
          </button>
        </div>
      </div>
    </div>
  );
}
