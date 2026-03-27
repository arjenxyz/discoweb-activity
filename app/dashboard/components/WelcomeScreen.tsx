'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ActivityReadiness } from './ActivityReadinessGate';
import DeveloperAboutModal from './DeveloperAboutModal';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { VideoBackground, MuteButton } from './VideoBackground';
import { useT } from '@/contexts/LocaleContext';
import { getDiscordSdk } from '@/lib/discordSdk';

type Props = {
  readiness: ActivityReadiness;
  onRetry: () => void;
};

type Phase = 'intro' | 'loading' | 'success';

export default function WelcomeScreen({ readiness, onRetry }: Props) {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isDeveloperChecked, setIsDeveloperChecked] = useState(false);
  const [devAboutOpen, setDevAboutOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const linkSdkRef = useRef<InstanceType<Awaited<typeof import('@discord/embedded-app-sdk')>['DiscordSDK']> | null>(null);

  const openLink = async (url: string) => {
    try {
      const existing = getDiscordSdk();
      if (existing) { await existing.commands.openExternalLink({ url }); return; }
      if (!linkSdkRef.current) {
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await sdk.ready();
        linkSdkRef.current = sdk;
      }
      await linkSdkRef.current.commands.openExternalLink({ url });
    } catch { window.open(url, '_blank'); }
  };

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

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('discord_bearer_token') : null;
    fetch(apiUrl('/api/activity/is-developer'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((d: { isDeveloper?: boolean }) => {
        if (d?.isDeveloper) setIsDeveloper(true);
      })
      .catch(() => {})
      .finally(() => setIsDeveloperChecked(true));
  }, []);

  const handleStart = async () => {
    if (!readiness.guildId) {
      setError(t('welcome_error_no_guild'));
      return;
    }
    setPhase('loading');
    setError(null);
    setErrorCode(null);
    try {
      const response = await fetchWithCreds(`/api/member/profile?guild_id=${encodeURIComponent(readiness.guildId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        const code = json?.error ?? null;
        setErrorCode(code);
        setError(code ?? response.statusText ?? t('welcome_error_profile_create'));
        setPhase('intro');
        return;
      }
      setPhase('success');
    } catch {
      setError(t('welcome_error_generic'));
      setPhase('intro');
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Test1.mp4" />

      {/* Ses butonu — masaüstünde sağ üst */}
      <div className="hidden sm:flex absolute z-20 top-6 right-6 items-center gap-2">
        {isDeveloper && (
          <button
            type="button"
            onClick={() => router.push('/activity/developer')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white hover:bg-black/60"
            aria-label="Developer Panel"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        )}
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test1.mp4" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
        {phase === 'success' ? (
          <div className="flex w-full justify-center">
            <SuccessState t={t} />
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
                {t('welcome_heading')}
              </h1>
              <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
                {t('welcome_subtitle')}
              </p>
            </div>
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 backdrop-blur-md flex flex-col gap-2">
                {errorCode && (
                  <p className="text-xs font-mono text-red-400">{t('welcome_error_prefix')} <span className="font-bold">{errorCode}</span></p>
                )}
                <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetchWithCreds('/api/admin/report-error', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          status: errorCode ?? 'profile_create_error',
                          guildId: readiness.guildId,
                          guildName: readiness.guildName,
                          userAgent: navigator.userAgent,
                          timestamp: new Date().toISOString(),
                          url: window.location.href,
                        }),
                      });
                      setReported(true);
                    } catch { /* sessizce geç */ }
                  }}
                  disabled={reported}
                  className="self-start flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/25 px-4 py-1.5 text-xs font-semibold text-red-200 backdrop-blur-md transition hover:bg-red-500/40 disabled:opacity-50"
                >
                  {reported ? t('gate_reported_button') : t('gate_report_button')}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={phase === 'loading'}
                className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                style={{}}
              >
                {phase === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('welcome_loading')}
                  </span>
                ) : (
                  t('welcome_create_profile_button')
                )}
              </button>
              {/* Mobilde ses butonu butonun sağında */}
              <div className="sm:hidden">
                <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test1.mp4" />
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Orta alt footer */}
      <div className="absolute z-10 bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button type="button" onClick={() => openLink('https://discoweb.tech/terms')} className="text-xs text-white/50 hover:text-white/75 transition-colors">{t('splash_terms')}</button>
        <span className="text-white/30 text-xs">·</span>
        <button type="button" onClick={() => openLink('https://discoweb.tech/privacy')} className="text-xs text-white/50 hover:text-white/75 transition-colors">{t('splash_privacy')}</button>
        <span className="text-white/30 text-xs">·</span>
        <button type="button" onClick={() => setDevAboutOpen(true)} className="text-xs text-white/50 hover:text-white/75 transition-colors">Developer</button>
      </div>

      {devAboutOpen && <DeveloperAboutModal onClose={() => setDevAboutOpen(false)} />}
    </div>
  );
}

function SuccessState({ t }: { t: (key: string) => string }) {
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
      <h2 className="text-xl font-black">{t('welcome_success_heading')}</h2>
      <p className="text-sm text-white/70">{t('welcome_success_subtitle')}</p>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
