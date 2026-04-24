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
};

type GateCopy = {
  title: string;
  description: string;
  helper: string;
};

type BanDebug = {
  expiresAt?: string | null;
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


export default function ActivityReadinessGate({ readiness, loading, onRetry, onBackToSplash }: GateProps) {
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
          <span className="text-sm font-bold leading-none">i</span>
        </button>
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Thragg.mp4" />
      </div>

      {infoOpen && (
        <div className="hidden sm:flex absolute z-20 top-20 right-6 w-80 flex-col gap-3 rounded-2xl border border-white/15 bg-black/55 p-4 text-white/85 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setInfoOpen(false);
              onBackToSplash();
            }}
            className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Karşılama ekranına dön
          </button>
          <p className="text-xs text-white/80">{copy.title}</p>
          <p className="text-xs text-white/60">{copy.description}</p>
          <p className="text-xs text-white/45">{copy.helper}</p>
          <p className="text-[11px] font-mono text-white/35">{readiness.status}</p>
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
                  <span className="text-sm font-bold leading-none">i</span>
                </button>
                <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test4.mp4" />
              </div>
            </div>

            {infoOpen && (
              <div className="sm:hidden w-full rounded-2xl border border-white/15 bg-black/55 p-4 text-white/85 backdrop-blur-md flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInfoOpen(false);
                    onBackToSplash();
                  }}
                  className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Karşılama ekranına dön
                </button>
                <p className="text-xs text-white/80">{copy.title}</p>
                <p className="text-xs text-white/60">{copy.description}</p>
                <p className="text-xs text-white/45">{copy.helper}</p>
                <p className="text-[11px] font-mono text-white/35">{readiness.status}</p>
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

