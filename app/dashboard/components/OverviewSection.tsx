'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useT } from '@/contexts/LocaleContext';
import {
  LuMessageSquare,
  LuMic,
  LuTag,
  LuZap,
  LuTrendingUp,
  LuClock,
  LuCoins,
} from 'react-icons/lu';
import type { MemberProfile, OverviewStats, OrderStats, OverviewStatsExpanded } from '../types';

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
  onClaim?: () => void;
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
  onClaim,
}: OverviewSectionProps) {
  const t = useT();
  const [serverTime, setServerTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istanbulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      const formatted = `UTC+3 ${istanbulTime.toLocaleDateString('tr-TR')} ${istanbulTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      setServerTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const hasTag = (overviewStats as OverviewStatsExpanded)?.hasTag ?? false;
  const isBooster = (overviewStats as OverviewStatsExpanded)?.isBooster ?? false;
  const totalsSince = (overviewStats as OverviewStatsExpanded)?.totalsSinceVerified;
  const verifiedSince = (overviewStats as OverviewStatsExpanded)?.verifiedSince;

  const card = 'rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return t('greeting_night');
    if (h < 12) return t('greeting_morning');
    if (h < 18) return t('greeting_afternoon');
    return t('greeting_evening');
  })();

  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6">

      {/* SAYFA BAŞLIĞI */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-white/30 mb-0.5">
            {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''} 👋
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('overview_title')}</h1>
          <p className="mt-1 text-sm text-white/40">
            {t('overview_subtitle')}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-white/40">Sunucu Zamanı: {serverTime}</span>
        </div>
      </div>

      {overviewLoading ? (
        <div className="flex items-center gap-3 py-12 text-white/30">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <span className="text-sm">{t('overview_loading')}</span>
        </div>
      ) : (
        <>
          {/* PROFİL KARTI */}
          <div className={`${card} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-indigo-500/8 blur-[60px] pointer-events-none" />

            {profileLoading ? (
              <div className="flex items-center gap-3 py-4 text-white/30">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                <span className="text-sm">{t('profile_loading')}</span>
              </div>
            ) : profileError ? (
              <p className="text-sm text-rose-300">{profileError}</p>
            ) : unauthorized ? (
              <p className="text-sm text-white/40">{t('profile_login_required')}</p>
            ) : (
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Avatar + isim */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-2xl border border-white/10">
                      {profile?.avatarUrl ? (
                        <Image src={profile.avatarUrl} alt="avatar" width={80} height={80} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20 text-2xl font-bold">
                          {profile?.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0d12]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                      {profile?.nickname ?? profile?.displayName ?? profile?.username ?? '—'}
                    </p>
                    <p className="text-sm text-white/35 mt-0.5">@{profile?.username}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hasTag && (
                        <span className="flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          <LuTag className="h-2.5 w-2.5" /> {t('overview_badge_tag')}
                        </span>
                      )}
                      {isBooster && (
                        <span className="flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                          <LuZap className="h-2.5 w-2.5" /> {t('overview_badge_booster')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Roller */}
                <div className="flex flex-wrap gap-1.5 sm:max-w-[50%] sm:justify-end">
                  {profile?.roles?.length ? (
                    profile.roles.map((role: { id: string; name: string; color: number }) => (
                      <span
                        key={role.id}
                        className={`rounded-full border border-white/10 px-2 py-0.5 font-medium ${
                          (profile?.roles?.length ?? 0) > 10 ? 'text-[9px]' : (profile?.roles?.length ?? 0) > 6 ? 'text-[10px]' : 'text-[11px]'
                        }`}
                        style={{
                          borderColor: `${formatRoleColor(role.color)}44`,
                          color: formatRoleColor(role.color),
                        }}
                      >
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/25">{t('overview_no_roles')}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* İSTATİSTİK KARTLARI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: t('overview_stat_message_label'),
                value: overviewStats?.userMessages?.toLocaleString() ?? '0',
                sub: t('overview_stat_message_sub'),
                icon: <LuMessageSquare className="h-4 w-4" />,
                color: 'text-indigo-400',
                active: true,
              },
              {
                label: t('overview_stat_voice_label'),
                value: overviewStats?.userVoiceMinutes?.toLocaleString() ?? '0',
                sub: t('overview_stat_voice_sub'),
                icon: <LuMic className="h-4 w-4" />,
                color: 'text-violet-400',
                active: true,
              },
              {
                label: t('overview_stat_tag_label'),
                value: hasTag ? t('overview_stat_active') : t('overview_stat_none'),
                sub: t('overview_stat_tag_sub'),
                icon: <LuTag className="h-4 w-4" />,
                color: hasTag ? 'text-indigo-400' : 'text-white/20',
                active: hasTag,
              },
              {
                label: t('overview_stat_boost_label'),
                value: isBooster ? t('overview_stat_active') : t('overview_stat_none'),
                sub: t('overview_stat_boost_sub'),
                icon: <LuZap className="h-4 w-4" />,
                color: isBooster ? 'text-pink-400' : 'text-white/20',
                active: isBooster,
              },
            ].map(({ label, value, sub, icon, color, active }) => (
              <div key={label} className={`rounded-2xl border p-4 transition-colors ${active ? 'border-white/[0.12] bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{label}</span>
                  <span className={color}>{icon}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-black tabular-nums ${active ? 'text-white' : 'text-white/20'}`}>{value}</p>
                <p className="mt-0.5 text-[10px] text-white/30">{sub}</p>
              </div>
            ))}
          </div>

          {/* BİRİKEN KAZANÇ */}
          {pendingEarnings && pendingEarnings.pending > 0 && (
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
                    onClick={onClaim}
                    disabled={claimLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold text-black transition-colors"
                  >
                    {claimLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                    ) : (
                      <LuCoins className="h-4 w-4" />
                    )}
                    {t('pending_earnings_claim')}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-white/25">{t('pending_earnings_auto_note')}</p>
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

        </>
      )}

    </section>
  );
}
