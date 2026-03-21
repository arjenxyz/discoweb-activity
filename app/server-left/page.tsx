'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import { VideoBackground, MuteButton } from '../dashboard/components/VideoBackground';

interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
}

export default function ServerLeftPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  useEffect(() => {
    fetch(apiUrl('/api/auth/me'), { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.username) setUser(d); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Test4.mp4" />

      {/* Ses butonu — masaüstünde sağ üst */}
      <div className="hidden sm:block absolute z-20 top-6 right-6">
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test4.mp4" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
        <div className="flex flex-col gap-5 max-w-lg">
          {user?.username && (
            <p className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 backdrop-blur-md">
              {user.username}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <h1
              className="text-4xl font-black leading-tight tracking-tight text-white"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 2px 20px rgba(0,0,0,1)' }}
            >
              Görünüşe göre ayrılmışsın.
            </h1>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
              Bu sunucunun mağazasına, cüzdanına ve tüm özelliklerine erişmek için sunucuda aktif üye olman gerekiyor.
            </p>
            <p className="text-xs text-white/45 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
              Sunucuya geri katılırsan kaldığın yerden devam edebilirsin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Mobilde ses butonu */}
            <div className="sm:hidden">
              <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test4.mp4" />
            </div>
            <Link
              href="/auth/select-server"
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
            >
              Sunucu Seç
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-transparent px-6 py-3.5 text-sm font-bold text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
