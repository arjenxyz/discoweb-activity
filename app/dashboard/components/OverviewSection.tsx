'use client';

import Image from 'next/image';
import { useT } from '@/contexts/LocaleContext';
import {
  LuMessageSquare,
  LuMic,
  LuTag,
  LuZap,
  LuTrendingUp,
  LuAward,
  LuGift,
  LuCheck,
  LuClock,
} from 'react-icons/lu';
import type { MemberProfile, OverviewStats, OrderStats, OverviewStatsExpanded, BadgeInfo } from '../types';
import TreasuryCard from './TreasuryCard';

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
  badgeInfo?: BadgeInfo | null;
};

export default function OverviewSection({
  overviewLoading,
  overviewStats,
  profileLoading,
  profileError,
  unauthorized,
  profile,
  formatRoleColor,
  badgeInfo,
}: OverviewSectionProps) {
  const t = useT();
  const hasTag = (overviewStats as OverviewStatsExpanded)?.hasTag ?? false;
  const isBooster = (overviewStats as OverviewStatsExpanded)?.isBooster ?? false;
  const totalsSince = (overviewStats as OverviewStatsExpanded)?.totalsSinceVerified;
  const verifiedSince = (overviewStats as OverviewStatsExpanded)?.verifiedSince;

  const card = 'rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6">

      {/* SAYFA BAŞLIĞI */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-white/30 mb-0.5">
            {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''} 👋
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">Ana Sayfa</h1>
          <p className="mt-1 text-sm text-white/40">
            Sunucundaki etkinliğin ve istatistiklerin burada.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-white/40">Canlı</span>
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
                          <LuTag className="h-2.5 w-2.5" /> Tag
                        </span>
                      )}
                      {isBooster && (
                        <span className="flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                          <LuZap className="h-2.5 w-2.5" /> Booster
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
                    <span className="text-xs text-white/25">Rol yok</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* İSTATİSTİK KARTLARI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Mesaj',
                value: overviewStats?.userMessages?.toLocaleString('tr-TR') ?? '0',
                sub: 'toplam mesaj',
                icon: <LuMessageSquare className="h-4 w-4" />,
                color: 'text-indigo-400',
                active: true,
              },
              {
                label: 'Sesli',
                value: overviewStats?.userVoiceMinutes?.toLocaleString('tr-TR') ?? '0',
                sub: 'dakika ses',
                icon: <LuMic className="h-4 w-4" />,
                color: 'text-violet-400',
                active: true,
              },
              {
                label: 'Tag',
                value: hasTag ? 'Aktif' : 'Yok',
                sub: 'sunucu tag',
                icon: <LuTag className="h-4 w-4" />,
                color: hasTag ? 'text-indigo-400' : 'text-white/20',
                active: hasTag,
              },
              {
                label: 'Boost',
                value: isBooster ? 'Aktif' : 'Yok',
                sub: 'sunucu boost',
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
                  <p className="text-[10px] text-white/30 mb-1.5">Toplam Mesaj</p>
                  <p className="text-lg font-black text-white tabular-nums">
                    {totalsSince.messages?.toLocaleString?.('tr-TR') ?? totalsSince.messages ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-white/30 mb-1.5">Toplam Ses</p>
                  <p className="text-lg font-black text-white tabular-nums">
                    {totalsSince.voice_minutes?.toLocaleString?.('tr-TR') ?? totalsSince.voice_minutes ?? 0}
                    <span className="text-xs font-normal text-white/30 ml-1">dk</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAG ROZETİ */}
          {badgeInfo !== undefined && badgeInfo?.hasTag && (
            <div className={card}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10">
                  <LuAward className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-white">Tag Rozeti</span>
              </div>

              {badgeInfo?.hasTag && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl shadow-lg"
                      style={{
                        backgroundColor: badgeInfo.currentBadge?.color ? `${badgeInfo.currentBadge.color}18` : 'rgba(99,102,241,0.1)',
                        borderColor: badgeInfo.currentBadge?.color ? `${badgeInfo.currentBadge.color}40` : 'rgba(99,102,241,0.25)',
                      }}
                    >
                      {badgeInfo.currentBadge?.emoji ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{badgeInfo.currentBadge?.name ?? 'Rozetsiz'}</p>
                      <p className="flex items-center gap-1 text-xs text-white/35">
                        <LuClock className="h-3 w-3" />
                        {badgeInfo.tagDays} gün tag taşıyorsunuz
                      </p>
                    </div>
                    {!badgeInfo.nextBadge && badgeInfo.currentBadge && (
                      <span className="shrink-0 flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        <LuCheck className="h-3 w-3" /> Maks
                      </span>
                    )}
                  </div>

                  {badgeInfo.nextBadge && badgeInfo.daysToNext !== null && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/35">{badgeInfo.currentBadge?.name ?? 'Başlangıç'}</span>
                        <span className="flex items-center gap-1 text-[10px] text-white/40">
                          {badgeInfo.daysToNext}g kaldı → {badgeInfo.nextBadge.emoji} <span className="font-semibold text-white/60">{badgeInfo.nextBadge.name}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((badgeInfo.tagDays / badgeInfo.nextBadge.days_required) * 100))}%`,
                            background: badgeInfo.nextBadge.color
                              ? `linear-gradient(90deg, ${badgeInfo.nextBadge.color}99, ${badgeInfo.nextBadge.color})`
                              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-right text-[10px] text-white/25">
                        {Math.min(100, Math.round((badgeInfo.tagDays / badgeInfo.nextBadge.days_required) * 100))}%
                      </p>
                    </div>
                  )}

                  {!badgeInfo.nextBadge && badgeInfo.currentBadge && (
                    <p className="text-xs text-amber-400/60 flex items-center gap-1.5">🎉 En yüksek rozete ulaştınız!</p>
                  )}
                </div>
              )}

              {/* Aktif Çekilişler */}
              {(badgeInfo?.activeRaffles?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                      <LuGift className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">Aktif Çekilişler</span>
                    <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {badgeInfo!.activeRaffles.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {badgeInfo!.activeRaffles.map((raffle) => {
                      const eligible = badgeInfo!.eligibleRaffles.includes(raffle.id);
                      return (
                        <div
                          key={raffle.id}
                          className={`rounded-xl border p-3 ${eligible ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate">{raffle.title}</p>
                              {(raffle.prizes?.length ?? 0) > 0 && (
                                <p className="mt-0.5 text-[11px] text-white/35 truncate">{(raffle.prizes ?? []).join(' · ')}</p>
                              )}
                              {raffle.end_date && (
                                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/20">
                                  <LuClock className="h-2.5 w-2.5" />
                                  {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                                </p>
                              )}
                            </div>
                            <span className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              eligible ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300' : 'border-white/8 bg-white/5 text-white/30'
                            }`}>
                              {eligible ? <><LuCheck className="h-2.5 w-2.5" /> Uygunsun</> : <>{raffle.min_tag_days}g gerekli</>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* HAZİNE KARTI (sadece Yüksek Ekonomi sunucularında görünür) */}
      <TreasuryCard />

    </section>
  );
}
