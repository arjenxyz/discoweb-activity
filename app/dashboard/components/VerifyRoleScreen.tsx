'use client';

import { useState, useEffect, useRef } from 'react';
import type { ActivityReadiness } from './ActivityReadinessGate';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { VideoBackground, MuteButton } from './VideoBackground';

type Props = {
  readiness: ActivityReadiness;
  onRetry: () => void;
};

type Phase = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyRoleScreen({ readiness, onRetry }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
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
    if (phase === 'success') {
      const timer = setTimeout(() => onRetry(), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, onRetry]);

  const handleVerify = async () => {
    setPhase('loading');
    setError(null);
    try {
      const guildParam = readiness.guildId ? `?guild_id=${encodeURIComponent(readiness.guildId)}` : '';
      const res = await fetchWithCreds(`/api/member/verify-role${guildParam}`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || 'Rol ataması başarısız oldu.');
        setPhase('error');
        return;
      }
      setPhase('success');
    } catch {
      setError('Bir hata oluştu, lütfen tekrar dene.');
      setPhase('error');
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Test3.mp4" />

      {/* Ses butonu — masaüstünde sağ üst */}
      <div className="hidden sm:block absolute z-20 top-6 right-6">
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test3.mp4" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
        {phase === 'success' ? (
          <div className="flex w-full justify-center">
            <SuccessState />
          </div>
        ) : (
          <div className="flex flex-col gap-5 max-w-lg">
            {readiness.guildName && (
              <p className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 backdrop-blur-md">
                {readiness.guildName}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <h1
                className="text-4xl font-black leading-tight tracking-tight text-white"
                style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 2px 20px rgba(0,0,0,1)' }}
              >
                Bu kapıyı açmak için bir anahtara ihtiyacın var.
              </h1>
              <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
                Doğrulanmış üye rolü alman yeterli. Tek tıkla seni içeri alalım.
              </p>
            </div>
            {phase === 'error' && error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-md">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleVerify}
                disabled={phase === 'loading'}
                className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Atanıyor...
                  </span>
                ) : (
                  'İlerlemeye Devam Et'
                )}
              </button>
              {/* Mobilde ses butonu butonun sağında */}
              <div className="sm:hidden">
                <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test3.mp4" />
              </div>
            </div>
          </div>
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
      <h2 className="text-xl font-black">Kapı açıldı!</h2>
      <p className="text-sm text-white/70">DiscoWeb dünyasına giriş yapıyorsun...</p>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
