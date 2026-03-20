'use client';

import { useState, useEffect, useRef } from 'react';
import type { ActivityReadiness } from './ActivityReadinessGate';
import fetchWithCreds from '@/lib/fetchWithCreds';

type Props = {
  readiness: ActivityReadiness;
  onRetry: () => void;
};

type Phase = 'intro' | 'loading' | 'success';

export default function WelcomeScreen({ readiness, onRetry }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL ?? null;

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) {
      v.muted = false;
      v.volume = 1;
      // iOS: play() ile ses etkinleştirme
      v.play().catch(() => {});
    } else {
      v.muted = true;
    }
    setMuted(v.muted);
  };

  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => onRetry(), 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onRetry]);

  const handleStart = async () => {
    if (!readiness.guildId) {
      setError('Sunucu bilgisi bulunamadı, lütfen yeniden deneyin.');
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const response = await fetchWithCreds(`/api/member/profile?guild_id=${encodeURIComponent(readiness.guildId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        setError(json?.error || response.statusText || 'Profil oluşturma başarısız.');
        setPhase('intro');
        return;
      }
      setPhase('success');
    } catch {
      setError('Bir hata oluştu, lütfen tekrar dene.');
      setPhase('intro');
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      {videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />
      )}

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-end gap-6 px-5 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-10">
        {phase === 'success' ? (
          <div className="flex w-full justify-center pb-6">
            <SuccessState />
          </div>
        ) : (
          <>
            {/* Sol alt — metinler */}
            <div className="flex flex-col gap-2 w-full sm:max-w-[55%]">
              {readiness.guildName && (
                <p className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 backdrop-blur-md">
                  {readiness.guildName}
                </p>
              )}
              <h1
                className="text-4xl font-black leading-tight tracking-tight text-white"
                style={{ textShadow: '0 0 40px rgba(255,255,255,0.2), 0 2px 12px rgba(0,0,0,1)' }}
              >
                Hoş geldin!
              </h1>
              <p className="text-xs text-white/55 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
                Platformumuza katılmak için bir profil oluşturman gerekiyor.
              </p>
              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 backdrop-blur-md">
                  {error}
                </p>
              )}
            </div>

            {/* Sağ alt — butonlar */}
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
              {videoUrl && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
                  aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
                >
                  {muted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
                      <line x1="18" y1="9" x2="23" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="23" y1="9" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
                      <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleStart}
                disabled={phase === 'loading'}
                className="rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Yükleniyor...
                  </span>
                ) : (
                  'Profil Oluştur'
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center gap-4 text-center drop-shadow-lg">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 backdrop-blur-md"
        style={{ animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
      >
        <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-black">Hazırsın!</h2>
      <p className="text-sm text-white/70">Dashboard&apos;a yönlendiriliyorsun...</p>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
