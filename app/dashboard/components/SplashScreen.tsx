'use client';

import { useRef, useState, useEffect } from 'react';
import { MuteButton, VideoBackground } from './VideoBackground';
import DeveloperPanel from './DeveloperPanel';
import { apiUrl } from '@/lib/api';

type Props = {
  onEnter: () => void;
};

export default function SplashScreen({ onEnter }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);

    const checkMaintenance = () => {
      fetch(apiUrl('/api/activity/maintenance'))
        .then(r => r.json())
        .then(d => setMaintenance(d.maintenance === true))
        .catch(() => {});
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);

    // Developer rol kontrolü (tek seferlik)
    const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
    fetch(apiUrl('/api/activity/is-developer'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { console.log('[DevCheck]', d); if (d.isDeveloper) setIsDeveloper(true); })
      .catch((e) => console.error('[DevCheck] hata:', e));

    return () => { clearTimeout(t); clearInterval(interval); };
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

      {/* İçerik — alt hizalı, tüm genişlik */}
      <div
        className="relative z-10 mt-auto flex w-full flex-col gap-6 px-6 pb-8 pt-16 sm:px-10 sm:pb-12"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Üst etiket */}
        <div className="flex items-center gap-2">
          <span className="h-px w-6 bg-white/30" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            Discord Economy Platform
          </span>
        </div>

        {/* Alt satır: sol başlık, sağ butonlar — mobilde alt alta */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

          {/* Başlık + created by */}
          <div className="flex flex-col gap-3">
            <h1
              className="cursor-pointer text-6xl font-black leading-none tracking-tight sm:text-7xl"
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
              style={{
                backgroundImage: 'linear-gradient(105deg, #fff 0%, #fff 35%, rgba(255,255,255,0.95) 45%, #fff 55%, #fff 100%)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'titleShine 4s ease-in-out infinite',
                textShadow: 'none',
              }}
            >
              Disco
              <span style={{
                backgroundImage: 'linear-gradient(105deg, #5865F2 0%, #5865F2 35%, #a5b4ff 45%, #5865F2 55%, #5865F2 100%)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'titleShine 4s ease-in-out infinite',
              }}>
                Web
              </span>
              <style>{`
                @keyframes titleShine {
                  0%, 60%  { background-position: 100% 0; }
                  100%     { background-position: -100% 0; }
                }
              `}</style>
            </h1>

            <div className="flex items-center gap-2">
              <img
                src="https://cdn.discordapp.com/avatars/1163500308270436442/8c2eeba5e9c137e4f9375bccb0f0bf40.png?size=128"
                alt="thearjen"
                className="h-6 w-6 rounded-full border border-white/20"
              />
              <span className="text-xs text-white/40">
                Created by <span className="text-white/60 font-medium">thearjen</span> · All rights reserved
              </span>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex items-center gap-3 sm:justify-end">
            <MuteButton muted={muted} onToggle={toggleMute} />

            {/* Developer butonu — sadece developer'lara görünür */}
            {isDeveloper && (
              <button
                type="button"
                onClick={() => setDevPanelOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
                aria-label="Developer Panel"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 110-5.858 2.929 2.929 0 010 5.858z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={maintenance ? undefined : onEnter}
              disabled={maintenance}
              className={`group relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-95 ${maintenance ? 'cursor-not-allowed bg-white/10' : 'bg-[#5865F2] hover:bg-[#4752C4]'}`}
              style={maintenance ? {} : { boxShadow: '0 0 32px rgba(88,101,242,0.5), 0 4px 16px rgba(0,0,0,0.5)' }}
            >
              {!maintenance && <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />}
              <span className="relative flex items-center gap-2">
                {maintenance ? 'Activity Bakımda' : 'Keşfet'}
                {!maintenance && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
                    <path d="M3.75 7.25a.75.75 0 000 1.5h6.19l-2.72 2.72a.75.75 0 001.06 1.06l4-4a.75.75 0 000-1.06l-4-4a.75.75 0 00-1.06 1.06l2.72 2.72H3.75z" />
                  </svg>
                )}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Developer Panel */}
      {devPanelOpen && (
        <DeveloperPanel
          maintenance={maintenance}
          onMaintenanceChange={setMaintenance}
          onClose={() => setDevPanelOpen(false)}
        />
      )}
    </div>
  );
}
