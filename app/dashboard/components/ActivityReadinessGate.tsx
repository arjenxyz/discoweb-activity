'use client';

import { useMemo, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import VerifyRoleScreen from './VerifyRoleScreen';
import fetchWithCreds from '@/lib/fetchWithCreds';

export type ActivityReadinessStatus =
  | 'ready'
  | 'unauthorized'
  | 'missing_guild'
  | 'missing_service_role'
  | 'server_not_registered'
  | 'server_setup_required'
  | 'missing_bot_token'
  | 'bot_not_in_guild'
  | 'user_not_in_guild'
  | 'missing_user_profile'
  | 'missing_verify_role'
  | 'discord_api_error';

export type ActivityReadiness = {
  status: ActivityReadinessStatus;
  blocking: boolean;
  guildId: string | null;
  guildName: string | null;
  isAdmin: boolean;
  canInviteBot: boolean;
  inviteUrl: string | null;
  botInGuild?: boolean;
  debug?: Record<string, unknown>;
};

type GateProps = {
  readiness: ActivityReadiness;
  loading: boolean;
  onRetry: () => void;
};

type GateCopy = {
  title: string;
  description: string;
  helper: string;
};

const COPY_BY_STATUS: Record<ActivityReadinessStatus, GateCopy> = {
  ready: {
    title: 'Her şey hazır',
    description: 'Sistem kullanıma hazır.',
    helper: 'Sorun görüyorsan yeniden deneyebilirsin.',
  },
  unauthorized: {
    title: 'Oturum doğrulanamadı',
    description: 'Discord Activity oturumun şu an doğrulanamıyor.',
    helper: 'Activity ekranını kapatıp tekrar aç.',
  },
  missing_guild: {
    title: 'Sunucu bilgisi eksik',
    description: 'Bu Activity açılışında sunucu bilgisi gelmedi.',
    helper: 'Activity\'yi sunucu içindeki ses kanalından tekrar başlat.',
  },
  missing_service_role: {
    title: 'Sistem konfig eksik',
    description: 'Sunucu tarafı servis anahtarı eksik veya hatalı.',
    helper: 'Lütfen proje geliştiricisine haber ver.',
  },
  server_not_registered: {
    title: 'Sunucu kayıtlı değil',
    description: 'Bu sunucu için aktivite ayarları henüz oluşturulmamış.',
    helper: 'Yönetici setup işlemini tamamladıktan sonra tekrar dene.',
  },
  server_setup_required: {
    title: 'Sunucu kurulumu eksik',
    description: 'Ekonomi ve rol sistemi için zorunlu ayarlar eksik.',
    helper: 'Sunucu yöneticisinin setup komutunu tamamlaması gerekiyor.',
  },
  missing_bot_token: {
    title: 'Bot token\'i eksik',
    description: 'Sunucu tarafında bot token\'i bulunamadı.',
    helper: 'Yönetici veya geliştirici ortamı kontrol etmeli.',
  },
  missing_user_profile: {
    title: 'Profil bulunamadı',
    description: 'Bu sunucuda henüz bir profilin kayıtlı değil.',
    helper: 'Kayıt oluşturmak için butona tıkla.',
  },
  missing_verify_role: {
    title: 'Doğrulanmamış hesap',
    description: 'Erişim için doğrulanmış üye rolüne sahip olman gerekiyor.',
    helper: 'Butona tıkla, rol anında atansın.',
  },
  bot_not_in_guild: {
    title: 'Bot sunucuda değil',
    description: 'Kazanç ve rol işlemleri için botun sunucuda olması zorunlu.',
    helper: 'Yetkili bir yönetici botu sunucuya eklemeli.',
  },
  user_not_in_guild: {
    title: 'Sunucu üyeliği yok',
    description: 'Bu hesap seçili sunucuda üye değil ya da ayrılmış görünüyor.',
    helper: 'Sunucuya tekrar katılıp Activity\'yi yeniden başlat.',
  },
  discord_api_error: {
    title: 'Discord API geçici hatası',
    description: 'Discord servisinden geçici bir cevap alınamadı.',
    helper: 'Biraz bekleyip tekrar denemen yeterli.',
  },
};

export default function ActivityReadinessGate({ readiness, loading, onRetry }: GateProps) {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);
  const [adminPhase, setAdminPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [adminError, setAdminError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL ?? null;

  if (readiness.status === 'missing_user_profile') {
    return <WelcomeScreen readiness={readiness} onRetry={onRetry} />;
  }

  if (readiness.status === 'missing_verify_role') {
    return <VerifyRoleScreen readiness={readiness} onRetry={onRetry} />;
  }

  const handleRegister = async () => {
    if (!readiness.guildId) return;
    setAdminPhase('loading');
    setAdminError(null);
    try {
      const res = await fetchWithCreds('/api/admin/register', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setAdminPhase('done');
      setTimeout(() => onRetry(), 1000);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      setAdminPhase('error');
    }
  };

  const handleSetup = async () => {
    if (!readiness.guildId) return;
    setAdminPhase('loading');
    setAdminError(null);
    try {
      const res = await fetchWithCreds('/api/admin/setup', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setAdminPhase('done');
      setTimeout(() => onRetry(), 1000);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      setAdminPhase('error');
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  const copy = useMemo(() => COPY_BY_STATUS[readiness.status], [readiness.status]);
  const isBotMissing = readiness.status === 'bot_not_in_guild';
  const isAdmin = readiness.isAdmin && readiness.canInviteBot;

  const supportMessage = useMemo(() => {
    const serverName = readiness.guildName ?? readiness.guildId ?? 'bu sunucu';
    if (isBotMissing && isAdmin && readiness.inviteUrl) {
      return `Merhaba, ${serverName} için bot eksik görünüyor. Davet linki: ${readiness.inviteUrl}`;
    }
    if (isBotMissing) {
      return `Merhaba, ${serverName} için Activity açılırken botun sunucuda olmadığı hatası alıyorum. Lütfen botu sunucuya ekleyebilir misiniz?`;
    }
    return `Merhaba, ${serverName} için Activity açılırken ${readiness.status} hatası alıyorum. Kontrol edebilir misiniz?`;
  }, [isAdmin, isBotMissing, readiness.guildId, readiness.guildName, readiness.inviteUrl, readiness.status]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const clearAndReload = () => {
    localStorage.removeItem('selectedGuildId');
    localStorage.removeItem('discord_bearer_token');
    localStorage.removeItem('discord_frame_id');
    localStorage.removeItem('discordUser');
    document.cookie = 'discord_session=; Max-Age=0; path=/;';
    document.cookie = 'selected_guild_id=; Max-Age=0; path=/;';
    window.location.reload();
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      {/* Arka plan video */}
      {videoUrl && (
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
      )}

      {/* Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      {!videoUrl && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />
      )}

      {/* Alt gradient — okunabilirlik */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <main className="relative z-10 flex min-h-screen w-full items-end justify-between gap-4 px-6 pb-10">
        {/* Sol alt — durum metni */}
        <div className="flex flex-col gap-3 max-w-sm">
          {readiness.guildName && (
            <p className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70 backdrop-blur-md">
              {readiness.guildName}
            </p>
          )}
          <h1
            className="text-4xl font-black leading-tight tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.2), 0 2px 12px rgba(0,0,0,1)' }}
          >
            {copy.title}
          </h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {copy.description}
          </p>
          <p className="text-xs text-white/45 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {copy.helper}
          </p>
          {readiness.status === 'discord_api_error' && readiness.debug && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300 backdrop-blur-md">
              debug: {JSON.stringify(readiness.debug)}
            </p>
          )}
          {copied && <p className="text-xs font-semibold text-emerald-400">Kopyalandı.</p>}
          {adminError && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 backdrop-blur-md">
              {adminError}
            </p>
          )}
          {adminPhase === 'done' && (
            <p className="text-xs font-semibold text-emerald-400">Tamamlandı, yenileniyor...</p>
          )}
        </div>

        {/* Sağ alt — butonlar */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Ses butonu */}
          {videoUrl && (
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
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
                  <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
                  <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </button>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-50"
            >
              {loading ? 'Kontrol ediliyor...' : 'Tekrar dene'}
            </button>
            <button
              type="button"
              onClick={clearAndReload}
              className="rounded-full border border-orange-400/30 bg-orange-500/20 px-5 py-2.5 text-sm font-semibold text-orange-100 backdrop-blur-md transition hover:bg-orange-500/30"
            >
              Sıfırla
            </button>

            {isBotMissing && isAdmin && readiness.inviteUrl && (
              <button
                type="button"
                onClick={() => copyToClipboard(readiness.inviteUrl as string)}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 backdrop-blur-md transition hover:bg-emerald-500/30"
              >
                Bot davet linki
              </button>
            )}

            {isBotMissing && (
              <button
                type="button"
                onClick={() => copyToClipboard(supportMessage)}
                className="rounded-full border border-yellow-400/30 bg-yellow-500/20 px-5 py-2.5 text-sm font-semibold text-yellow-100 backdrop-blur-md transition hover:bg-yellow-500/30"
              >
                {isAdmin ? 'Yetkili notunu kopyala' : 'Yetkiliye mesaj kopyala'}
              </button>
            )}

            {/* Admin: sunucu kayıt ve kurulum butonları */}
            {readiness.status === 'server_not_registered' && readiness.isAdmin && (
              readiness.botInGuild ? (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={adminPhase === 'loading' || adminPhase === 'done'}
                  className="rounded-full border border-[#5865F2]/50 bg-[#5865F2]/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-[#5865F2]/50 disabled:opacity-50"
                >
                  {adminPhase === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Kaydediliyor...
                    </span>
                  ) : 'Sunucuyu Kaydet'}
                </button>
              ) : (
                <p className="rounded-full border border-red-400/30 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-200 backdrop-blur-md">
                  Önce botu sunucuya ekle
                </p>
              )
            )}

            {readiness.status === 'server_setup_required' && readiness.isAdmin && (
              readiness.botInGuild ? (
                <button
                  type="button"
                  onClick={handleSetup}
                  disabled={adminPhase === 'loading' || adminPhase === 'done'}
                  className="rounded-full border border-[#5865F2]/50 bg-[#5865F2]/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-[#5865F2]/50 disabled:opacity-50"
                >
                  {adminPhase === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Kurulum yapılıyor...
                    </span>
                  ) : 'Otomatik Kurulum Başlat'}
                </button>
              ) : (
                <p className="rounded-full border border-red-400/30 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-200 backdrop-blur-md">
                  Önce botu sunucuya ekle
                </p>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

