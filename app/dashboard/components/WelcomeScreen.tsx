'use client';

import { useState, useEffect } from 'react';
import type { ActivityReadiness } from './ActivityReadinessGate';

type Props = {
  readiness: ActivityReadiness;
  onRetry: () => void;
};

type Phase = 'intro' | 'loading' | 'success';

export default function WelcomeScreen({ readiness, onRetry }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const videoUrl = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL ?? null;

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
      const response = await fetch(`/api/member/profile?guild_id=${encodeURIComponent(readiness.guildId)}`, {
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6 py-10">
        {phase === 'success' ? (
          <SuccessState />
        ) : (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            {readiness.guildName && (
              <p className="inline-flex rounded-full border border-[#5865F2]/40 bg-[#5865F2]/15 px-3 py-1 text-xs font-semibold text-[#c7ceff]">
                {readiness.guildName}
              </p>
            )}

            {videoUrl && (
              <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight">Hoş geldin!</h1>
              <p className="text-sm text-white/70">
                Bu sunucunun Activity platformuna katılmak için bir profil oluşturman gerekiyor.
                Tek tıkla hazır olacaksın.
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={phase === 'loading'}
              className="rounded-full bg-[#5865F2] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === 'loading' ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Profil oluşturuluyor...
                </span>
              ) : (
                'Profil Oluştur ve Başla'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
        style={{ animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
      >
        <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-black">Hazırsın!</h2>
      <p className="text-sm text-white/60">Dashboard&apos;a yönlendiriliyorsun...</p>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
