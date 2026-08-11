'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/contexts/LocaleContext';
import {
  LuMessageSquare,
  LuMic,
  LuTag,
  LuZap,
  LuTrendingUp,
  LuClock,
  LuCoins,
  LuCheck,
  LuTriangleAlert,
  LuInfo,
} from 'react-icons/lu';
import type { BadgeInfo, MemberProfile, OverviewStats, OrderStats, OverviewStatsExpanded } from '../types';
import DiscordProfileCard from './DiscordProfileCard';
import { computeProgressPct } from './privileges/tierUtils';

type OverviewSectionProps = {
  overviewLoading: boolean;
  overviewStats: OverviewStats | OverviewStatsExpanded | null;
  profileLoading: boolean;
  profileError: string | null;
  unauthorized: boolean;
  profile: MemberProfile | null;
  orderStats?: OrderStats | null;
  renderPapelAmount: (value: number) => React.ReactNode;
  formatRoleColor: (color: number) => string;
  pendingEarnings?: { pending: number; messageTotal: number; voiceTotal: number; count: number } | null;
  claimLoading?: boolean;
  claimResult?: { kind: 'idle' | 'success' | 'error' | 'empty'; message?: string };
  onClaim?: () => void;
  onClearClaimResult?: () => void;
  badgeInfo?: BadgeInfo | null;
  onNavigateToPrivileges?: () => void;
};

export default function OverviewSection({
  overviewLoading,
  overviewStats,
  profileLoading,
  profileError,
  unauthorized,
  profile,
  formatRoleColor,
  pendingEarnings,
  claimLoading,
  claimResult,
  onClaim,
  onClearClaimResult,
  badgeInfo,
  onNavigateToPrivileges,
}: OverviewSectionProps) {
  const t = useT();

  const hasTag = (overviewStats as OverviewStatsExpanded)?.hasTag ?? false;
  const isBooster = (overviewStats as OverviewStatsExpanded)?.isBooster ?? false;
  const currentBadge = badgeInfo?.currentBadge ?? null;
  const nextBadge = badgeInfo?.nextBadge ?? null;
  const currentBoosterBadge = badgeInfo?.currentBoosterBadge ?? null;
  const nextBoosterBadge = badgeInfo?.nextBoosterBadge ?? null;
  const tagProgressPct = computeProgressPct(
    badgeInfo?.tagDays ?? 0,
    currentBadge?.days_required ?? 0,
    nextBadge?.days_required ?? null,
  );
  const boostProgressPct = computeProgressPct(
    badgeInfo?.boosterMonths ?? 0,
    currentBoosterBadge?.months_required ?? 0,
    nextBoosterBadge?.months_required ?? null,
  );
  const claimStatus = claimResult?.kind ?? 'idle';
  const totalsSince = (overviewStats as OverviewStatsExpanded)?.totalsSinceVerified;
  const verifiedSince = (overviewStats as OverviewStatsExpanded)?.verifiedSince;
  const expandedStats = overviewStats as OverviewStatsExpanded | null;
  const [activityStatIndex, setActivityStatIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivityStatIndex((prev) => (prev + 1) % 2);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!claimResult || claimResult.kind === 'idle' || !onClearClaimResult) return;
    const timer = window.setTimeout(() => onClearClaimResult(), 4500);
    return () => window.clearTimeout(timer);
  }, [claimResult, onClearClaimResult]);

  const card = 'rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return t('greeting_night');
    if (h < 12) return t('greeting_morning');
    if (h < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  })();

  return (
    <section className="flex flex-col gap-3 pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-5">

      {/* SAYFA BAŞLIĞI */}
      <div>
        <p className="text-xs font-medium text-white/30 mb-0.5">
          {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''} 👋
        </p>
        <h1 className="text-2xl font-black text-white tracking-tight">{t('overview_title')}</h1>
        <p className="mt-1 text-sm text-white/40">
          {t('overview_subtitle')}
        </p>
      </div>

      {overviewLoading ? (
        <div className="flex items-center gap-3 py-12 text-white/30">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <span className="text-sm">{t('overview_loading')}</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
          <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-3 order-2 lg:order-1">
          {/* İSTATİSTİK KARTLARI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: t('overview_stat_message_label'),
                value: (activityStatIndex === 0
                  ? overviewStats?.userMessages
                  : expandedStats?.messagesLast24h
                )?.toLocaleString('tr-TR') ?? '0',
                sub: activityStatIndex === 0
                  ? t('overview_stat_message_sub')
                  : t('overview_stat_message_today_sub'),
                icon: <LuMessageSquare className="h-4 w-4" />,
                color: 'text-indigo-400',
                active: true,
                rotateKey: `msg-${activityStatIndex}`,
              },
              {
                label: t('overview_stat_voice_label'),
                value: (activityStatIndex === 0
                  ? overviewStats?.userVoiceMinutes
                  : expandedStats?.voiceMinutesLast24h
                )?.toLocaleString('tr-TR') ?? '0',
                sub: activityStatIndex === 0
                  ? t('overview_stat_voice_sub')
                  : t('overview_stat_voice_today_sub'),
                icon: <LuMic className="h-4 w-4" />,
                color: 'text-violet-400',
                active: true,
                rotateKey: `voice-${activityStatIndex}`,
              },
              {
                label: t('overview_stat_tag_label'),
                value: !hasTag
                  ? t('overview_stat_none')
                  : activityStatIndex === 0
                    ? (currentBadge?.name ?? t('overview_stat_active'))
                    : t('overview_stat_active'),
                sub: !hasTag
                  ? t('overview_stat_tag_sub')
                  : activityStatIndex === 0 && nextBadge
                    ? t('badge_next_badge', { name: nextBadge.name })
                    : t('overview_stat_tag_sub'),
                icon: <LuTag className="h-4 w-4" />,
                color: hasTag ? 'text-indigo-400' : 'text-white/20',
                active: hasTag,
                progress: hasTag && activityStatIndex === 0 && nextBadge ? tagProgressPct : null,
                accent: currentBadge?.color ?? '#818cf8',
                onClick: onNavigateToPrivileges,
                rotateKey: `tag-${hasTag ? activityStatIndex : 'off'}`,
              },
              {
                label: t('overview_stat_boost_label'),
                value: !isBooster
                  ? t('overview_stat_none')
                  : activityStatIndex === 0
                    ? (currentBoosterBadge?.name ?? t('overview_stat_active'))
                    : t('overview_stat_active'),
                sub: !isBooster
                  ? t('overview_stat_boost_sub')
                  : activityStatIndex === 0 && nextBoosterBadge
                    ? t('badge_next_badge', { name: nextBoosterBadge.name })
                    : t('overview_stat_boost_sub'),
                icon: <LuZap className="h-4 w-4" />,
                color: isBooster ? 'text-pink-400' : 'text-white/20',
                active: isBooster,
                progress: isBooster && activityStatIndex === 0 && nextBoosterBadge ? boostProgressPct : null,
                accent: currentBoosterBadge?.color ?? '#f472b6',
                onClick: onNavigateToPrivileges,
                rotateKey: `boost-${isBooster ? activityStatIndex : 'off'}`,
              },
            ].map(({ label, value, sub, icon, color, active, progress, accent, onClick, rotateKey }) => {
              const Wrapper = onClick ? 'button' : 'div';
              return (
              <Wrapper
                key={label}
                type={onClick ? 'button' : undefined}
                onClick={onClick}
                className={`rounded-2xl border p-4 text-left transition-colors ${onClick ? 'hover:bg-white/[0.08] cursor-pointer' : ''} ${active ? 'border-white/[0.12] bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{label}</span>
                  <span className={color}>{icon}</span>
                </div>
                <div key={rotateKey} className="animate-in fade-in duration-300">
                  <p className={`text-xl sm:text-2xl font-black tabular-nums truncate ${active ? 'text-white' : 'text-white/20'}`}>{value}</p>
                  <p className="mt-0.5 text-[10px] text-white/30">{sub}</p>
                </div>
                {progress != null && (
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, background: accent ?? '#818cf8' }}
                    />
                  </div>
                )}
                {onClick && (
                  <p className="mt-2 text-[10px] font-medium text-white/25">{t('overview_privilege_view')}</p>
                )}
              </Wrapper>
            );})}
          </div>

          {/* BİRİKEN KAZANÇ */}
          {pendingEarnings && (
            <div className={`${card} relative overflow-hidden`}>
              <div className="absolute top-0 left-0 h-32 w-32 rounded-full bg-amber-500/10 blur-[50px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                    <LuCoins className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">{t('pending_earnings_title')}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black text-amber-300 tabular-nums">
                      {pendingEarnings.pending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      <span className="text-sm font-semibold text-amber-300/60 ml-1">papel</span>
                    </p>
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-[11px] text-white/40">
                        <LuMessageSquare className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                        {pendingEarnings.messageTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] text-white/40">
                        <LuMic className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                        {pendingEarnings.voiceTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClaim}
                    disabled={claimLoading || claimStatus === 'success'}
                    className={`flex min-w-[140px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                      claimStatus === 'success'
                        ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                        : claimStatus === 'error'
                          ? 'bg-rose-500 text-white hover:bg-rose-400'
                          : claimStatus === 'empty'
                            ? 'bg-white/15 text-white/80 hover:bg-white/20'
                            : 'bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50'
                    }`}
                  >
                    {claimLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                    ) : claimStatus === 'success' ? (
                      <LuCheck className="h-4 w-4" />
                    ) : (
                      <LuCoins className="h-4 w-4" />
                    )}
                    {claimLoading
                      ? t('pending_earnings_claiming')
                      : claimStatus === 'success'
                        ? t('pending_earnings_claimed')
                        : claimStatus === 'error'
                          ? t('pending_earnings_retry')
                          : t('pending_earnings_claim')}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-white/25">{t('pending_earnings_auto_note')}</p>

                {claimResult && claimResult.kind !== 'idle' && claimResult.message && (
                  <div
                    className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ${
                      claimResult.kind === 'success'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : claimResult.kind === 'error'
                          ? 'border-rose-500/25 bg-rose-500/10 text-rose-200'
                          : 'border-white/10 bg-white/[0.05] text-white/70'
                    }`}
                    role="status"
                  >
                    <span className="mt-0.5 shrink-0">
                      {claimResult.kind === 'success' ? (
                        <LuCheck className="h-4 w-4" />
                      ) : claimResult.kind === 'error' ? (
                        <LuTriangleAlert className="h-4 w-4" />
                      ) : (
                        <LuInfo className="h-4 w-4" />
                      )}
                    </span>
                    <p className="text-sm font-medium leading-snug">{claimResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOĞRULANMADAN BERİ */}
          {totalsSince && (
            <div className={card}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                  <LuTrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-white">{t('overview_since_verified')}</span>
                {verifiedSince && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-white/25">
                    <LuClock className="h-3 w-3" />
                    {new Date(verifiedSince).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-white/30 mb-1.5">{t('overview_since_total_messages')}</p>
                  <p className="text-lg font-black text-white tabular-nums">
                    {totalsSince.messages?.toLocaleString?.('tr-TR') ?? totalsSince.messages ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-white/30 mb-1.5">{t('overview_since_total_voice')}</p>
                  <p className="text-lg font-black text-white tabular-nums">
                    {totalsSince.voice_minutes?.toLocaleString?.() ?? totalsSince.voice_minutes ?? 0}
                    <span className="text-xs font-normal text-white/30 ml-1">{t('overview_since_voice_unit')}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>

          <aside className="w-full lg:w-[300px] xl:w-[320px] shrink-0 order-1 lg:order-2 lg:sticky lg:top-6">
            <DiscordProfileCard
              profile={unauthorized ? null : profile}
              loading={profileLoading}
              joinedAt={overviewStats?.joinedAt ?? null}
              formatRoleColor={formatRoleColor}
              hasTag={hasTag}
              isBooster={isBooster}
            />
          </aside>
        </div>
      )}

    </section>
  );
}
