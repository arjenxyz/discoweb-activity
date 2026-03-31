'use client';

import { useMemo, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import VerifyRoleScreen from './VerifyRoleScreen';
import DmScreen from './DmScreen';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { getDiscordSdk } from '@/lib/discordSdk';
import { VideoBackground, MuteButton } from './VideoBackground';
import { useT } from '@/contexts/LocaleContext';

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


export default function ActivityReadinessGate({ readiness, loading, onRetry }: GateProps) {
  const t = useT();

  const COPY_BY_STATUS: Record<ActivityReadinessStatus, GateCopy> = {
    ready: { title: t('gate_ready_title'), description: t('gate_ready_description'), helper: t('gate_ready_helper') },
    unauthorized: { title: t('gate_unauthorized_title'), description: t('gate_unauthorized_description'), helper: t('gate_unauthorized_helper') },
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
  const [reportedStatus, setReportedStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  const STATUS_TO_CODE: Partial<Record<ActivityReadinessStatus, string>> = {
    server_not_registered: 'DW-2001',
    server_setup_required: 'DW-2002',
    bot_not_in_guild: 'DW-2003',
    discord_api_error: 'DW-2004',
    missing_service_role: 'DW-2005',
    missing_bot_token: 'DW-2006',
    unauthorized: 'DW-3001',
    user_not_in_guild: 'DW-3002',
    missing_user_profile: 'DW-3003',
  };

  const REPORTABLE = new Set(['discord_api_error', 'missing_service_role', 'missing_bot_token', 'server_not_registered', 'server_setup_required']);
  const alreadyReported = reportedStatus === readiness.status;

  const handleReport = async () => {
    try {
      await fetchWithCreds('/api/admin/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: readiness.status,
          guildId: readiness.guildId,
          guildName: readiness.guildName,
          debug: readiness.debug,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      });
      setReportedStatus(readiness.status);
    } catch { /* silently pass */ }
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

  const copy = useMemo(() => COPY_BY_STATUS[readiness.status], [readiness.status]);
  const isBotMissing = readiness.status === 'bot_not_in_guild';
  const isAdmin = readiness.isAdmin && readiness.canInviteBot;

  const supportMessage = useMemo(() => {
    const serverName = readiness.guildName ?? readiness.guildId ?? t('gate_default_server_name');
    const botLink = readiness.inviteUrl ? `\n${t('gate_bot_invite_link_prefix')}${readiness.inviteUrl}` : '';
    if (isBotMissing && isAdmin) {
      return t('gate_support_message_admin_bot_missing', { serverName, botLink });
    }
    if (isBotMissing) {
      return t('gate_support_message_user_bot_missing', { serverName, botLink });
    }
    return t('gate_support_message_generic', { serverName, status: readiness.status });
  }, [isAdmin, isBotMissing, readiness.guildId, readiness.guildName, readiness.inviteUrl, readiness.status, t]);

  const copyToClipboard = async (text: string) => {
    try {
      // Discord Activity'de clipboard API çalışmaz, execCommand fallback
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


  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Test3.mp4" />

      {/* Ses butonu — masaüstünde sağ üst */}
      <div className="hidden sm:block absolute z-20 top-6 right-6">
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test3.mp4" />
      </div>

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
          </div>

          {REPORTABLE.has(readiness.status) && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 backdrop-blur-md flex flex-col gap-2">
              <p className="text-xs font-mono text-red-300">
                {STATUS_TO_CODE[readiness.status] && (
                  <span className="font-bold text-red-200">{STATUS_TO_CODE[readiness.status]} · </span>
                )}
                <span className="font-bold">{readiness.status}</span>
                {readiness.debug && <> · {JSON.stringify(readiness.debug)}</>}
              </p>
              <button
                type="button"
                onClick={handleReport}
                disabled={alreadyReported}
                className="self-start flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/25 px-4 py-1.5 text-xs font-semibold text-red-200 backdrop-blur-md transition hover:bg-red-500/40 disabled:opacity-50"
              >
                {alreadyReported ? t('gate_reported_button') : (
                  <>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path d="M3.5 2a.5.5 0 01.5-.5h8a.5.5 0 01.354.854L9.207 5.5l3.147 3.146A.5.5 0 0112 9.5H4.5V14a.5.5 0 01-1 0V2z" />
                    </svg>
                    {t('gate_report_button')}
                  </>
                )}
              </button>
            </div>
          )}

          {copied && <p className="text-xs font-semibold text-emerald-400">{t('gate_copied')}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Mobilde ses butonu */}
            <div className="sm:hidden">
              <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test4.mp4" />
            </div>

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

