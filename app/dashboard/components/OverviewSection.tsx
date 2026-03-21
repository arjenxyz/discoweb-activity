'use client';

import Image from 'next/image';
import {
  LuLayoutDashboard,
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
  renderPapelAmount,
  formatRoleColor,
  badgeInfo,
}: OverviewSectionProps) {
  const hasTag = (overviewStats as OverviewStatsExpanded)?.hasTag ?? false;
  const isBooster = (overviewStats as OverviewStatsExpanded)?.isBooster ?? false;
  const totalsSince = (overviewStats as OverviewStatsExpanded)?.totalsSinceVerified;
  const verifiedSince = (overviewStats as OverviewStatsExpanded)?.verifiedSince;

  return (
    <section className="relative overflow-hidden rounded-none sm:rounded-[32px] border-0 sm:border border-white/10 bg-white/5 backdrop-blur-2xl p-3 sm:p-8 shadow-2xl flex flex-col">

      {/* Arka plan glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-7">
        <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg sm:rounded-xl shadow-lg shadow-indigo-500/25">
          <LuLayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Genel Bakış</h2>
          <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">Aktivite ve profil özetiniz</p>
        </div>
      </div>

      {overviewLoading ? (
        <div className="flex items-center gap-3 py-8 text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          <span className="text-sm">Özet hazırlanıyor...</span>
        </div>
      ) : (
        <div className="relative z-10 space-y-4">

          {/* PROFİL KARTI */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-4 sm:p-5">
            {profileLoading ? (
              <div className="flex items-center gap-3 text-white/40">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                <span className="text-sm">Profil yükleniyor...</span>
              </div>
            ) : profileError ? (
              <p className="text-sm text-rose-300">{profileError}</p>
            ) : unauthorized ? (
              <p className="text-sm text-white/50">Profil bilgilerini görmek için giriş yapın.</p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Avatar + isim */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/10 ring-2 ring-indigo-500/20">
                      {profile?.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt="avatar"
                          width={80}
                          height={80}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <LuLayoutDashboard className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    {/* Online dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0d12] shadow" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-white leading-tight">
                      {profile?.nickname ?? profile?.displayName ?? profile?.username ?? '—'}
                    </p>
                    <p className="text-sm text-white/40 font-medium">@{profile?.username}</p>
                    {/* Tag & Boost badge'leri */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hasTag && (
                        <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          <LuTag className="w-2.5 h-2.5" /> Tag
                        </span>
                      )}
                      {isBooster && (
                        <span className="flex items-center gap-1 rounded-full bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                          <LuZap className="w-2.5 h-2.5" /> Booster
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Roller */}
                <div className="flex flex-wrap gap-1.5 sm:max-w-[55%] sm:justify-end">
                  {profile?.roles?.length ? (
                    profile.roles.map((role: { id: string; name: string; color: number }) => (
                      <span
                        key={role.id}
                        className={`role-glow rounded-full border border-white/10 px-2 py-0.5 transition hover:scale-[1.04] font-medium ${
                          (profile?.roles?.length ?? 0) > 10
                            ? 'text-[9px]'
                            : (profile?.roles?.length ?? 0) > 6
                              ? 'text-[10px]'
                              : 'text-[11px]'
                        }`}
                        style={{
                          borderColor: `${formatRoleColor(role.color)}55`,
                          color: formatRoleColor(role.color),
                          ['--role-color' as string]: `${formatRoleColor(role.color)}66`,
                          ['--role-color-soft' as string]: `${formatRoleColor(role.color)}22`,
                        }}
                      >
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/30">Rol bulunamadı</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* İSTATİSTİK KARTLARI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Mesaj */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-3.5 sm:p-4 group hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-wider">Mesaj</span>
                <div className="p-1 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                  <LuMessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {overviewStats?.userMessages?.toLocaleString('tr-TR') ?? '0'}
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">toplam mesaj</p>
            </div>

            {/* Sesli */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-3.5 sm:p-4 group hover:border-violet-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-wider">Sesli</span>
                <div className="p-1 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                  <LuMic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-400" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {overviewStats?.userVoiceMinutes?.toLocaleString('tr-TR') ?? '0'}
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">dakika ses</p>
            </div>

            {/* Tag */}
            <div className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${hasTag ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/10 bg-[#0b0d12]/70'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-wider">Tag</span>
                <div className={`p-1 rounded-lg ${hasTag ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                  <LuTag className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${hasTag ? 'text-indigo-400' : 'text-white/30'}`} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${hasTag ? 'text-indigo-300' : 'text-white/30'}`}>
                {hasTag ? 'Aktif' : 'Yok'}
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">sunucu tag</p>
            </div>

            {/* Boost */}
            <div className={`rounded-2xl border p-3.5 sm:p-4 transition-colors ${isBooster ? 'border-pink-500/30 bg-pink-500/5' : 'border-white/10 bg-[#0b0d12]/70'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-white/40 uppercase tracking-wider">Boost</span>
                <div className={`p-1 rounded-lg ${isBooster ? 'bg-pink-500/20' : 'bg-white/5'}`}>
                  <LuZap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isBooster ? 'text-pink-400' : 'text-white/30'}`} />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${isBooster ? 'text-pink-300' : 'text-white/30'}`}>
                {isBooster ? 'Aktif' : 'Yok'}
              </p>
              <p className="mt-0.5 text-[10px] text-white/30">sunucu boost</p>
            </div>
          </div>

          {/* DOĞRULANMADAN BERİ */}
          {totalsSince && (
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <LuTrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Doğrulandıktan beri</span>
                {verifiedSince && (
                  <span className="ml-auto text-[10px] text-white/30 flex items-center gap-1">
                    <LuClock className="w-3 h-3" />
                    {new Date(verifiedSince).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[10px] text-white/40 mb-1">Toplam mesaj</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {totalsSince.messages?.toLocaleString?.('tr-TR') ?? totalsSince.messages ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[10px] text-white/40 mb-1">Toplam ses</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {totalsSince.voice_minutes?.toLocaleString?.('tr-TR') ?? totalsSince.voice_minutes ?? 0}
                    <span className="text-xs font-normal text-white/40 ml-1">dk</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PAPEL SIRALAMASI */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <LuTrendingUp className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Papel Sıralaması</span>
            </div>
            <p className="mt-2 text-sm text-white/40">Menüden <span className="text-white/60 font-medium">Sıralama</span>'ya giderek tam listeyi görebilirsiniz.</p>
          </div>

          {/* TAG ROZETİ & ÇEKİLİŞLER */}
          {badgeInfo !== undefined && (
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-4 sm:p-5">
              {/* Rozet header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-indigo-500/10">
                  <LuAward className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Tag Rozeti</span>
              </div>

              {!badgeInfo || !badgeInfo.hasTag ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <LuTag className="w-4 h-4 text-white/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/40">Rozet kazanılmadı</p>
                    <p className="text-xs text-white/25">Sunucu tag&apos;ini taşımıyorsunuz</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mevcut rozet */}
                  <div className="flex items-center gap-3">
                    {badgeInfo.currentBadge ? (
                      <div
                        className="h-12 w-12 rounded-xl border flex items-center justify-center text-2xl shrink-0 shadow-lg"
                        style={{
                          backgroundColor: badgeInfo.currentBadge.color ? `${badgeInfo.currentBadge.color}18` : 'rgba(99,102,241,0.1)',
                          borderColor: badgeInfo.currentBadge.color ? `${badgeInfo.currentBadge.color}40` : 'rgba(99,102,241,0.3)',
                          boxShadow: badgeInfo.currentBadge.color ? `0 0 20px ${badgeInfo.currentBadge.color}20` : undefined,
                        }}
                      >
                        {badgeInfo.currentBadge.emoji ?? '🏅'}
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-2xl shrink-0">
                        🏅
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {badgeInfo.currentBadge?.name ?? 'Rozetsiz'}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <LuClock className="w-3 h-3" />
                        {badgeInfo.tagDays} gün tag taşıyorsunuz
                      </p>
                    </div>
                    {!badgeInfo.nextBadge && badgeInfo.currentBadge && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                        <LuCheck className="w-3 h-3" /> Maks
                      </span>
                    )}
                  </div>

                  {/* İlerleme çubuğu */}
                  {badgeInfo.nextBadge && badgeInfo.daysToNext !== null && (
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/40">{badgeInfo.currentBadge?.name ?? 'Başlangıç'}</span>
                        <span className="text-[10px] text-white/50 flex items-center gap-1">
                          <span>{badgeInfo.daysToNext} gün kaldı</span>
                          <span>→</span>
                          <span>{badgeInfo.nextBadge.emoji ?? ''}</span>
                          <span className="font-semibold text-white/70">{badgeInfo.nextBadge.name}</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((badgeInfo.tagDays / badgeInfo.nextBadge.days_required) * 100))}%`,
                            background: badgeInfo.nextBadge.color
                              ? `linear-gradient(90deg, ${badgeInfo.nextBadge.color}99, ${badgeInfo.nextBadge.color})`
                              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            boxShadow: badgeInfo.nextBadge.color ? `0 0 8px ${badgeInfo.nextBadge.color}60` : '0 0 8px #6366f180',
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-right text-[10px] text-white/30">
                        {Math.min(100, Math.round((badgeInfo.tagDays / badgeInfo.nextBadge.days_required) * 100))}% tamamlandı
                      </p>
                    </div>
                  )}

                  {!badgeInfo.nextBadge && badgeInfo.currentBadge && (
                    <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
                      <span>🎉</span> En yüksek rozete ulaştınız!
                    </p>
                  )}
                </div>
              )}

              {/* Aktif Çekilişler */}
              {(badgeInfo?.activeRaffles?.length ?? 0) > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded-lg bg-emerald-500/10">
                      <LuGift className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Aktif Çekilişler</span>
                    <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-1.5 py-0.5 font-semibold">
                      {badgeInfo!.activeRaffles.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {badgeInfo!.activeRaffles.map((raffle) => {
                      const eligible = badgeInfo!.eligibleRaffles.includes(raffle.id);
                      return (
                        <div
                          key={raffle.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            eligible
                              ? 'border-emerald-500/25 bg-emerald-500/5'
                              : 'border-white/8 bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate">{raffle.title}</p>
                              {raffle.prizes && raffle.prizes.length > 0 && (
                                <p className="mt-0.5 text-[11px] text-white/40 truncate">{raffle.prizes.join(' · ')}</p>
                              )}
                              {raffle.end_date && (
                                <p className="mt-0.5 text-[10px] text-white/25 flex items-center gap-1">
                                  <LuClock className="w-2.5 h-2.5" />
                                  {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                                eligible
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-white/8 text-white/35 border border-white/10'
                              }`}
                            >
                              {eligible ? (
                                <><LuCheck className="w-2.5 h-2.5" /> Uygunsun</>
                              ) : (
                                <>{raffle.min_tag_days}g gerekli</>
                              )}
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

        </div>
      )}
    </section>
  );
}
