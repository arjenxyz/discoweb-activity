'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import VerifyRoleScreen from './VerifyRoleScreen';
import DmScreen from './DmScreen';
import { getDiscordSdk } from '@/lib/discordSdk';
import { VideoBackground, MuteButton } from './VideoBackground';
import { useT } from '@/contexts/LocaleContext';

export type ActivityReadinessStatus =
  | 'ready'
  | 'unauthorized'
  | 'member_banned'
  | 'server_banned'
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
  onBackToSplash: () => void;
  openLink?: (url: string) => Promise<void>;
};

type GateCopy = {
  title: string;
  description: string;
  helper: string;
};

type BanDebug = {
  expiresAt?: string | null;
  reason?: string | null;
};

const BAN_REASON_DETAILS: Record<string, string> = {
  'Bot veya exploit kullanarak hile yapmak': 'Aktivite sisteminde bot programları, exploit yazılımları veya diğer otomatik araçlar kullanarak hile yapmak, oyun dengesini bozmak ve diğer üyelerin adil oyun deneyimini etkilemek yasaklanmıştır. Bu tür davranışlar, aktivitenin ekonomik sistemini manipüle eder ve tüm topluluğa zarar verir.',
  'Hesap güvenliğini ihlal etmek (çoklu hesap, paylaşım)': 'Birden fazla hesap kullanarak sistemi kandırmak, hesap paylaşımı yapmak veya hesap güvenliğini ihlal etmek kesinlikle yasaktır. Bu davranış, aktivitenin güvenliğini tehlikeye atar ve diğer üyelerin güvenini sarsar.',
  'Ekonomik dolandırıcılık yapmak (sahte işlemler, manipülasyon)': 'Aktivite içindeki ekonomik sistemi manipüle etmek, sahte işlemler yapmak, borsa fiyatlarını yapay olarak etkilemek veya diğer üyeleri ekonomik olarak dolandırmak yasaklanmıştır. Bu tür davranışlar, aktivitenin ekonomik dengesini bozar.',
  'Sistemi kandırmaya yönelik hareketler (bot kullanımı, script)': 'Aktivite sistemini kandırmak için botlar, scriptler veya diğer otomatik araçlar kullanmak yasaktır. Bu davranışlar, sistemin güvenliğini ve adilliğini tehlikeye atar.',
  'Süpheli aktiviteler sergilemek (anormal işlem sıklığı)': 'Normalden çok daha yüksek sıklıkta işlemler yapmak, sistem kaynaklarını gereksiz yere tüketmek veya şüpheli davranışlar sergilemek yasaklanmıştır. Bu tür aktiviteler, sistem performansını düşürür ve diğer üyeleri etkiler.',
  'Rate limiting kurallarını ihlal etmek (çok fazla işlem)': 'Aktivite tarafından belirlenen işlem sınırlarını aşmak veya rate limiting kurallarını ihlal etmek yasaktır. Bu davranışlar, sistemin stabil çalışmasını engeller.',
  'Diğer üyeleri etkilemek (negatif davranış)': 'Diğer üyeleri rahatsız etmek, tehdit etmek, taciz etmek veya negatif davranışlar sergilemek yasaklanmıştır. Aktivite, tüm üyelerin olumlu bir deneyim yaşamasını sağlar.',
  'Sunucu kurallarını ihlal etmek': 'Discord sunucusu kurallarını ihlal etmek, aktivite katılım koşullarını karşılamamak veya genel topluluk standartlarına uymamak yasaktır.',
  'Aktivite katılım koşullarını karşılamamak': 'Aktiviteye katılmak için gerekli koşulları karşılamamak, gerekli rollere sahip olmamak veya katılım şartlarını ihlal etmek yasaktır.',
  'Bot kötüye kullanımı veya exploit gerçekleştirmek': 'Sunucu botlarını kötüye kullanmak, exploit yazılımları çalıştırmak veya sistem açıklarından faydalanmak yasaklanmıştır.',
  'Güvenlik ihlali gerçekleştirmek (veri sızıntısı, hack)': 'Sunucu güvenliğini ihlal etmek, veri sızdırmak, hack yapmak veya güvenlik açıklarından faydalanmak kesinlikle yasaktır.',
  'Yönetim kararına uymamak (uyarılara rağmen devam)': 'Yönetim tarafından verilen uyarılara rağmen yasaklanmış davranışlara devam etmek veya yönetim kararlarına uymamak yasaktır.',
  'Ekonomik sistemi manipüle etmek (borsa manipülasyonu)': 'Aktivitenin ekonomik sistemini manipüle etmek, borsa fiyatlarını yapay olarak etkilemek veya ekonomik dengesizlik yaratmak yasaklanmıştır.',
  'Süpheli aktiviteler barındırmak (dolandırıcılık merkezi)': 'Sunucuda dolandırıcılık, hile veya diğer yasaklanmış aktiviteleri barındırmak veya teşvik etmek yasaktır.',
  'Sunucu kurallarını ciddi şekilde ihlal etmek': 'Discord sunucusu kurallarını ciddi şekilde ihlal etmek, topluluk standartlarını aşmak veya ciddi disiplin ihlalleri yapmak yasaktır.',
  'Diğer sunucuları etkilemek (negatif etki)': 'Diğer sunucuları olumsuz etkilemek, zarar vermek veya topluluklar arası sorunlar yaratmak yasaklanmıştır.',
};

function getRoleAwareCopy(
  status: ActivityReadinessStatus,
  base: GateCopy,
  t: (key: string) => string,
  isAdmin: boolean,
): GateCopy {
  if (status === 'bot_not_in_guild') {
    return isAdmin
      ? {
          ...base,
          description: t('gate_bot_not_in_guild_description_admin'),
          helper: t('gate_bot_not_in_guild_helper_admin'),
        }
      : {
          ...base,
          description: t('gate_bot_not_in_guild_description_user'),
          helper: t('gate_bot_not_in_guild_helper_user'),
        };
  }

  if (status === 'server_setup_required') {
    return isAdmin
      ? {
          ...base,
          description: t('gate_server_setup_required_description_admin'),
          helper: t('gate_server_setup_required_helper_admin'),
        }
      : {
          ...base,
          description: t('gate_server_setup_required_description_user'),
          helper: t('gate_server_setup_required_helper_user'),
        };
  }

  if (status === 'server_not_registered') {
    return isAdmin
      ? {
          ...base,
          description: t('gate_server_not_registered_description_admin'),
          helper: t('gate_server_not_registered_helper_admin'),
        }
      : {
          ...base,
          description: t('gate_server_not_registered_description_user'),
          helper: t('gate_server_not_registered_helper_user'),
        };
  }

  if (status === 'missing_service_role') {
    return isAdmin
      ? {
          ...base,
          description: t('gate_missing_service_role_description_admin'),
          helper: t('gate_missing_service_role_helper_admin'),
        }
      : {
          ...base,
          description: t('gate_missing_service_role_description_user'),
          helper: t('gate_missing_service_role_helper_user'),
        };
  }

  if (status === 'missing_bot_token') {
    return isAdmin
      ? {
          ...base,
          description: t('gate_missing_bot_token_description_admin'),
          helper: t('gate_missing_bot_token_helper_admin'),
        }
      : {
          ...base,
          description: t('gate_missing_bot_token_description_user'),
          helper: t('gate_missing_bot_token_helper_user'),
        };
  }

  return base;
}


export default function ActivityReadinessGate({ readiness, loading, onRetry, onBackToSplash, openLink }: GateProps) {
  const t = useT();

  const COPY_BY_STATUS: Record<ActivityReadinessStatus, GateCopy> = {
    ready: { title: t('gate_ready_title'), description: t('gate_ready_description'), helper: t('gate_ready_helper') },
    unauthorized: { title: t('gate_unauthorized_title'), description: t('gate_unauthorized_description'), helper: t('gate_unauthorized_helper') },
    member_banned: { title: t('gate_member_banned_title'), description: t('gate_member_banned_description'), helper: t('gate_member_banned_helper') },
    server_banned: { title: t('gate_server_banned_title'), description: t('gate_server_banned_description'), helper: t('gate_server_banned_helper') },
    missing_guild: { title: t('gate_missing_guild_title'), description: t('gate_missing_guild_description'), helper: t('gate_missing_guild_helper') },
    missing_service_role: { title: t('gate_missing_service_role_title'), description: t('gate_missing_service_role_description'), helper: t('gate_missing_service_role_helper') },
    server_not_registered: { title: t('gate_server_not_registered_title'), description: t('gate_server_not_registered_description'), helper: t('gate_server_not_registered_helper') },
    server_setup_required: { title: t('gate_server_setup_required_title'), description: t('gate_server_setup_required_description'), helper: t('gate_server_setup_required_helper') },
    missing_bot_token: { title: t('gate_missing_bot_token_title'), description: t('gate_missing_bot_token_description'), helper: t('gate_missing_bot_token_helper') },
    missing_user_profile: { title: t('gate_missing_user_profile_title'), description: t('gate_missing_user_profile_description'), helper: t('gate_missing_user_profile_helper') },
    missing_verify_role: { title: t('gate_missing_verify_role_title'), description: t('gate_missing_verify_role_description'), helper: t('gate_missing_verify_role_helper') },
    bot_not_in_guild: { title: t('gate_bot_not_in_guild_title'), description: t('gate_bot_not_in_guild_description'), helper: t('gate_bot_not_in_guild_helper') },
    user_not_in_guild: { title: t('gate_user_not_in_guild_title'), description: t('gate_user_not_in_guild_description'), helper: t('gate_user_not_in_guild_helper') },
    discord_api_error: { title: t('gate_discord_api_error_title'), description: t('gate_discord_api_error_description'), helper: t('gate_discord_api_error_helper') },
  };
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [banRetryTriggered, setBanRetryTriggered] = useState(false);
  const [banDetailsOpen, setBanDetailsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isBanStatus = readiness.status === 'member_banned' || readiness.status === 'server_banned';
  const banExpiresAt = useMemo(() => {
    if (!isBanStatus) return null;
    const debug = (readiness.debug ?? {}) as BanDebug;
    if (!debug.expiresAt) return null;
    const ts = Date.parse(debug.expiresAt);
    if (Number.isNaN(ts)) return null;
    return ts;
  }, [isBanStatus, readiness.debug]);
  const banReason = useMemo(() => {
    if (!isBanStatus) return null;
    const debug = (readiness.debug ?? {}) as BanDebug;
    return debug.reason ?? null;
  }, [isBanStatus, readiness.debug]);
  const isTemporaryBan = isBanStatus && banExpiresAt !== null;
  const remainingMs = banExpiresAt ? Math.max(0, banExpiresAt - nowMs) : 0;

  useEffect(() => {
    if (!isTemporaryBan) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isTemporaryBan]);

  useEffect(() => {
    setBanRetryTriggered(false);
  }, [readiness.status, banExpiresAt]);

  useEffect(() => {
    if (!isTemporaryBan) return;
    if (remainingMs > 0) return;
    if (banRetryTriggered) return;
    setBanRetryTriggered(true);
    onRetry();
  }, [banRetryTriggered, isTemporaryBan, onRetry, remainingMs]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };
  if (readiness.status === 'missing_guild') {
    return <DmScreen />;
  }

  if (readiness.status === 'missing_user_profile') {
    return <WelcomeScreen readiness={readiness} onRetry={onRetry} />;
  }

  if (readiness.status === 'missing_verify_role') {
    return <VerifyRoleScreen readiness={readiness} onRetry={onRetry} />;
  }

  const openSetupSite = async () => {
    const url = 'https://discoweb.tech';
    try {
      const existing = getDiscordSdk();
      if (existing) { await existing.commands.openExternalLink({ url }); return; }
      const { DiscordSDK } = await import('@discord/embedded-app-sdk');
      const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
      await sdk.ready();
      await sdk.commands.openExternalLink({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  let copy = getRoleAwareCopy(
    readiness.status,
    COPY_BY_STATUS[readiness.status],
    t,
    readiness.isAdmin,
  );
  if (readiness.status === 'member_banned') {
    copy = isTemporaryBan
      ? { title: t('gate_member_temp_banned_title'), description: t('gate_member_temp_banned_description'), helper: t('gate_member_temp_banned_helper') }
      : { title: t('gate_member_perm_banned_title'), description: t('gate_member_perm_banned_description'), helper: t('gate_member_perm_banned_helper') };
  } else if (readiness.status === 'server_banned') {
    copy = isTemporaryBan
      ? { title: t('gate_server_temp_banned_title'), description: t('gate_server_temp_banned_description'), helper: t('gate_server_temp_banned_helper') }
      : { title: t('gate_server_perm_banned_title'), description: t('gate_server_perm_banned_description'), helper: t('gate_server_perm_banned_helper') };
  }
  const isBotMissing = readiness.status === 'bot_not_in_guild';
  const isAdmin = readiness.isAdmin && readiness.canInviteBot;

  const serverName = readiness.guildName ?? readiness.guildId ?? t('gate_default_server_name');
  const botLink = readiness.inviteUrl ? `\n${t('gate_bot_invite_link_prefix')}${readiness.inviteUrl}` : '';
  const supportMessage = isBotMissing && isAdmin
    ? t('gate_support_message_admin_bot_missing', { serverName, botLink })
    : isBotMissing
      ? t('gate_support_message_user_bot_missing', { serverName, botLink })
      : t('gate_support_message_generic', { serverName, status: readiness.status });

  const copyToClipboard = async (text: string) => {
    try {
      // Discord Activity'de clipboard API Ã§alÄ±ÅŸmaz, execCommand fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    }
  };

  const openBotInvite = async (url: string) => {
    try {
      const existing = getDiscordSdk();
      if (existing) { await existing.commands.openExternalLink({ url }); return; }
      const { DiscordSDK } = await import('@discord/embedded-app-sdk');
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
      const sdk = new DiscordSDK(clientId);
      await sdk.ready();
      await sdk.commands.openExternalLink({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  let countdownText: string | null = null;
  if (isTemporaryBan) {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownText = t('gate_ban_countdown', { days, hours, minutes, seconds });
  }


  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Thragg.mp4" />

      {/* Ses butonu â€” masaÃ¼stÃ¼nde saÄŸ Ã¼st */}
      <div className="hidden sm:flex absolute z-20 top-6 right-6 items-center gap-2">
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 backdrop-blur-sm transition hover:bg-black/35 hover:text-white"
          aria-label="Bilgi paneli"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
          </svg>
        </button>
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Thragg.mp4" />
      </div>

      {infoOpen && (
        <div className="hidden sm:flex absolute z-20 top-12 right-6 w-52 rounded-xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="py-1.5">
            <MenuItem
              icon={
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path d="M7.22 1.63a1 1 0 011.56 0l1.22 1.46 1.86-.38a1 1 0 011.16.9l.17 1.9 1.6 1.04a1 1 0 010 1.7l-1.6 1.04-.17 1.9a1 1 0 01-1.16.9l-1.86-.38-1.22 1.46a1 1 0 01-1.56 0L6 10.21l-1.86.38a1 1 0 01-1.16-.9l-.17-1.9L1.21 6.75a1 1 0 010-1.7l1.6-1.04.17-1.9a1 1 0 011.16-.9L6 1.59l1.22-1.46z" />
                </svg>
              }
              label="Karşılama ekranına dön"
              onClick={() => {
                setInfoOpen(false);
                onBackToSplash();
              }}
            />
            {openLink && (
              <>
                <div className="my-1 h-px bg-white/5 mx-3" />
                <MenuItem
                  icon={
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                    </svg>
                  }
                  label="Discord"
                  sub="Destek kanalı"
                  onClick={() => { setInfoOpen(false); openLink('https://discord.gg/fDPsYhvKmu'); }}
                />
                <MenuItem
                  icon={
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l.038.48.016.2c.017.193.035.327.06.45a.75.75 0 01-.605.894l-.01.001a.75.75 0 01-.848-.532c-.067-.228-.107-.483-.131-.724L7.5 12.5H5a.75.75 0 01-.596-.295L3 10.5H2.75A1.75 1.75 0 011 8.75v-6zM2.75 2.5a.25.25 0 00-.25.25v6.25c0 .138.112.25.25.25h.5a.75.75 0 01.596.295l1.404 1.705H7.5a.75.75 0 01.75.75v.059l.013.191H13.25a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
                    </svg>
                  }
                  label="Dokümantasyon"
                  sub="Kılavuzlar"
                  onClick={() => { setInfoOpen(false); openLink('https://discoweb.tech/docs'); }}
                />
              </>
            )}
          </div>
        </div>
      )}

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
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
              {copy.title}
            </h1>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
              {copy.description}
            </p>
            <p className="text-xs text-white/45 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
              {copy.helper}
            </p>
            {countdownText && (
              <p className="text-xs font-semibold text-amber-300/90 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
                {countdownText}
              </p>
            )}

            {isBanStatus && banReason && (
              <button
                type="button"
                onClick={() => setBanDetailsOpen((v) => !v)}
                className="rounded-full border border-blue-400/30 bg-blue-500/20 px-6 py-2 text-sm font-semibold text-blue-100 backdrop-blur-md transition hover:bg-blue-500/30"
              >
                {banDetailsOpen ? 'Detayları Gizle' : 'Daha Fazla Detay'}
              </button>
            )}

            {banDetailsOpen && banReason && (
              <div className="mt-4 rounded-lg border border-white/20 bg-black/40 p-4 backdrop-blur-md">
                <p className="text-sm font-semibold text-white mb-2">
                  Reason: {banReason}
                </p>
                {BAN_REASON_DETAILS[banReason] && (
                  <p className="text-sm text-white/80 leading-relaxed">
                    {BAN_REASON_DETAILS[banReason]}
                  </p>
                )}
              </div>
            )}
          </div>

          {copied && <p className="text-xs font-semibold text-emerald-400">{t('gate_copied')}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Mobilde ses butonu */}
            <div className="sm:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInfoOpen((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 backdrop-blur-sm transition hover:bg-black/35 hover:text-white"
                  aria-label="Bilgi paneli"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                  </svg>
                </button>
                <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test4.mp4" />
              </div>
            </div>

            {infoOpen && (
              <div className="sm:hidden w-full rounded-xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="py-1.5">
                  <MenuItem
                    icon={
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M7.22 1.63a1 1 0 011.56 0l1.22 1.46 1.86-.38a1 1 0 011.16.9l.17 1.9 1.6 1.04a1 1 0 010 1.7l-1.6 1.04-.17 1.9a1 1 0 01-1.16.9l-1.86-.38-1.22 1.46a1 1 0 01-1.56 0L6 10.21l-1.86.38a1 1 0 01-1.16-.9l-.17-1.9L1.21 6.75a1 1 0 010-1.7l1.6-1.04.17-1.9a1 1 0 011.16-.9L6 1.59l1.22-1.46z" />
                      </svg>
                    }
                    label="Karşılama ekranına dön"
                    onClick={() => {
                      setInfoOpen(false);
                      onBackToSplash();
                    }}
                  />
                  {openLink && (
                    <>
                      <div className="my-1 h-px bg-white/5 mx-3" />
                      <MenuItem
                        icon={
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                          </svg>
                        }
                        label="Discord"
                        sub="Destek kanalı"
                        onClick={() => { setInfoOpen(false); openLink('https://discord.gg/fDPsYhvKmu'); }}
                      />
                      <MenuItem
                        icon={
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                            <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l.038.48.016.2c.017.193.035.327.06.45a.75.75 0 01-.605.894l-.01.001a.75.75 0 01-.848-.532c-.067-.228-.107-.483-.131-.724L7.5 12.5H5a.75.75 0 01-.596-.295L3 10.5H2.75A1.75 1.75 0 011 8.75v-6zM2.75 2.5a.25.25 0 00-.25.25v6.25c0 .138.112.25.25.25h.5a.75.75 0 01.596.295l1.404 1.705H7.5a.75.75 0 01.75.75v.059l.013.191H13.25a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
                          </svg>
                        }
                        label="Dokümantasyon"
                        sub="Kılavuzlar"
                        onClick={() => { setInfoOpen(false); openLink('https://discoweb.tech/docs'); }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t('gate_checking')}
                </span>
              ) : t('gate_retry_button')}
            </button>

            {isBotMissing && isAdmin && readiness.inviteUrl && (
              <button
                type="button"
                onClick={() => openBotInvite(readiness.inviteUrl as string)}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-6 py-3.5 text-sm font-bold text-emerald-100 backdrop-blur-md transition hover:bg-emerald-500/30"
              >
                {t('gate_add_bot_button')}
              </button>
            )}

            {isBotMissing && (
              <button
                type="button"
                onClick={() => copyToClipboard(supportMessage)}
                className="rounded-full border border-yellow-400/30 bg-yellow-500/20 px-6 py-3.5 text-sm font-bold text-yellow-100 backdrop-blur-md transition hover:bg-yellow-500/30"
              >
                {isAdmin ? t('gate_copy_admin_note') : t('gate_copy_admin_message')}
              </button>
            )}

            {(readiness.status === 'server_not_registered' || readiness.status === 'server_setup_required') && readiness.isAdmin && (
              <button
                type="button"
                onClick={openSetupSite}
                className="rounded-full border border-[#5865F2]/50 bg-[#5865F2]/30 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-[#5865F2]/50"
              >
                {t('gate_setup_site_button')}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick }: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/5 text-white/80 hover:text-white"
    >
      <span className="flex-shrink-0 opacity-70">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold leading-none">{label}</span>
        {sub && <span className="text-[11px] text-white/30 leading-none">{sub}</span>}
      </div>
    </button>
  );
}

