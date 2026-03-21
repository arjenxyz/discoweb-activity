'use client';

import { useState } from 'react';
import {
  LuGift,
  LuClock,
  LuCheck,
  LuTag,
  LuCalendar,
  LuLock,
  LuLoader,
  LuTicket,
} from 'react-icons/lu';
import type { BadgeInfo } from '../types';

type RafflesSectionProps = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
  onJoinRaffle?: (raffleId: string) => Promise<void>;
};

export default function RafflesSection({ badgeInfo, loading, onJoinRaffle }: RafflesSectionProps) {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedLocal, setJoinedLocal] = useState<string[]>([]);
  const [errorId, setErrorId] = useState<string | null>(null);

  const raffles = badgeInfo?.activeRaffles ?? [];
  const eligible = badgeInfo?.eligibleRaffles ?? [];
  const joined = [...(badgeInfo?.joinedRaffles ?? []), ...joinedLocal];
  const tagDays = badgeInfo?.tagDays ?? 0;
  const hasTag = badgeInfo?.hasTag ?? false;

  async function handleJoin(raffleId: string) {
    if (!onJoinRaffle) return;
    setJoiningId(raffleId);
    setErrorId(null);
    try {
      await onJoinRaffle(raffleId);
      setJoinedLocal((prev) => [...prev, raffleId]);
    } catch {
      setErrorId(raffleId);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-none sm:rounded-[32px] border-0 sm:border border-white/10 bg-white/5 backdrop-blur-2xl p-3 sm:p-8 shadow-2xl flex flex-col">

      {/* Arka plan glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-500/8 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between mb-5 sm:mb-7">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/25">
            <LuGift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Çekilişler</h2>
            <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">
              Aktif çekilişler ve katılım durumunuz
            </p>
          </div>
        </div>
        {raffles.length > 0 && (
          <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full px-2.5 py-1">
            {raffles.length} aktif
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          <span className="text-sm">Çekilişler yükleniyor...</span>
        </div>
      ) : (
        <div className="relative z-10 space-y-4">

          {/* Tag durumu özeti */}
          <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-3 ${hasTag ? 'border-indigo-500/25 bg-indigo-500/5' : 'border-white/10 bg-[#0b0d12]/70'}`}>
            <div className={`p-2 rounded-xl ${hasTag ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
              <LuTag className={`w-5 h-5 ${hasTag ? 'text-indigo-400' : 'text-white/25'}`} />
            </div>
            <div>
              {hasTag ? (
                <>
                  <p className="text-sm font-semibold text-white">
                    {tagDays} gün tag taşıyorsunuz
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {eligible.length > 0
                      ? `${eligible.length} çekilişe katılım hakkınız var`
                      : 'Henüz uygun olduğunuz çekiliş yok'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white/40">Sunucu tag&apos;i taşımıyorsunuz</p>
                  <p className="text-xs text-white/25 mt-0.5">Çekilişlere katılmak için sunucu tag&apos;i gereklidir</p>
                </>
              )}
            </div>
          </div>

          {/* Çekiliş listesi */}
          {raffles.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/70 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <LuGift className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-sm font-medium text-white/40">Şu an aktif çekiliş yok</p>
              <p className="mt-1 text-xs text-white/25">Yeni çekilişler burada görünecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              {raffles.map((raffle) => {
                const isEligible = eligible.includes(raffle.id);
                const hasJoined = joined.includes(raffle.id);
                const isJoining = joiningId === raffle.id;
                const hasError = errorId === raffle.id;
                const isExpiringSoon = raffle.end_date
                  ? new Date(raffle.end_date).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
                  : false;
                const daysNeeded = raffle.min_tag_days - tagDays;

                return (
                  <div
                    key={raffle.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                      hasJoined
                        ? 'border-emerald-500/40 bg-emerald-500/8'
                        : isEligible
                        ? 'border-indigo-500/30 bg-indigo-500/5'
                        : 'border-white/10 bg-[#0b0d12]/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* İkon */}
                      <div className={`mt-0.5 shrink-0 p-2 rounded-xl ${
                        hasJoined ? 'bg-emerald-500/20'
                        : isEligible ? 'bg-indigo-500/15'
                        : 'bg-white/5'
                      }`}>
                        {hasJoined ? (
                          <LuTicket className="w-4 h-4 text-emerald-400" />
                        ) : isEligible ? (
                          <LuGift className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <LuLock className="w-4 h-4 text-white/20" />
                        )}
                      </div>

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold leading-tight ${isEligible || hasJoined ? 'text-white' : 'text-white/50'}`}>
                            {raffle.title}
                          </p>

                          {/* Durum badge */}
                          {hasJoined ? (
                            <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              <LuCheck className="w-2.5 h-2.5" /> Katıldın
                            </span>
                          ) : isEligible ? (
                            <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                              <LuCheck className="w-2.5 h-2.5" /> Uygunsun
                            </span>
                          ) : (
                            <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-white/5 text-white/35 border-white/10">
                              <LuLock className="w-2.5 h-2.5" />
                              {daysNeeded > 0 ? `${daysNeeded}g daha` : `${raffle.min_tag_days}g gerekli`}
                            </span>
                          )}
                        </div>

                        {raffle.description && (
                          <p className={`mt-1 text-xs leading-relaxed ${isEligible || hasJoined ? 'text-white/50' : 'text-white/25'}`}>
                            {raffle.description}
                          </p>
                        )}

                        {/* Ödüller */}
                        {raffle.prizes && raffle.prizes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {raffle.prizes.map((prize, i) => (
                              <span
                                key={i}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  isEligible || hasJoined
                                    ? 'bg-white/8 border-white/15 text-white/70'
                                    : 'bg-white/4 border-white/8 text-white/30'
                                }`}
                              >
                                🎁 {prize}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Alt bilgi */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/30">
                          <span className="flex items-center gap-1">
                            <LuTag className="w-3 h-3" />
                            Min. {raffle.min_tag_days} gün tag
                          </span>
                          {raffle.end_date && (
                            <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-amber-400/70' : ''}`}>
                              {isExpiringSoon ? <LuClock className="w-3 h-3" /> : <LuCalendar className="w-3 h-3" />}
                              Bitiş: {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                              {isExpiringSoon && ' — yakında bitiyor!'}
                            </span>
                          )}
                        </div>

                        {/* Katılım bölümü */}
                        {!isEligible && !hasJoined && (
                          <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3">
                            <p className="text-[11px] text-white/40 font-medium">
                              🔒 Bu çekilişe katılmak için{' '}
                              <span className="text-white/70 font-bold">
                                {daysNeeded > 0 ? `${daysNeeded} gün daha` : `${raffle.min_tag_days} gün`}
                              </span>{' '}
                              tag taşıman gerekiyor.
                            </p>
                            <p className="mt-1 text-[10px] text-white/25">
                              Şu an: {tagDays} gün · Gerekli: {raffle.min_tag_days} gün
                            </p>
                          </div>
                        )}

                        {isEligible && !hasJoined && onJoinRaffle && (
                          <div className="mt-3">
                            {hasError && (
                              <p className="mb-2 text-[10px] text-red-400/80">Bir hata oluştu. Tekrar dene.</p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleJoin(raffle.id)}
                              disabled={isJoining}
                              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90 disabled:opacity-50"
                            >
                              {isJoining ? (
                                <><LuLoader className="w-3.5 h-3.5 animate-spin" /> Katılıyor...</>
                              ) : (
                                <><LuTicket className="w-3.5 h-3.5" /> Çekilişe Katıl</>
                              )}
                            </button>
                          </div>
                        )}

                        {hasJoined && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                            <LuCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <p className="text-[11px] text-emerald-300 font-medium">
                              Çekilişe katıldınız! Sonuçlar için takipte kalın.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </section>
  );
}
