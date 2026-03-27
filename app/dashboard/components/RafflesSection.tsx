'use client';

import { useState, useMemo } from 'react';
import {
  LuGift, LuClock, LuTag, LuCalendar, LuLock,
  LuLoader, LuTicket, LuCheck, LuChevronDown, LuChevronUp, LuInfo,
  LuTrophy, LuUsers, LuCoins, LuShield,
} from 'react-icons/lu';
import Image from 'next/image';
import type { BadgeInfo } from '../types';
import { useT } from '@/contexts/LocaleContext';

// GIF pool — aynı mağazadaki set
const GIFS = [
  '/penguin/cryformoney.gif',
  '/penguin/yuppi.gif',
  '/penguin/water.gif',
  '/penguin/vspengu.gif',
  '/penguin/moneypengu.gif',
  '/penguin/hopidi.gif',
  '/penguin/fri.gif',
  '/penguin/salincak.gif',
];

type RafflesSectionProps = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
  onJoinRaffle?: (raffleId: string) => Promise<void>;
};

export default function RafflesSection({ badgeInfo, loading, onJoinRaffle }: RafflesSectionProps) {
  const t = useT();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedLocal, setJoinedLocal] = useState<string[]>([]);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const raffles = badgeInfo?.activeRaffles ?? [];
  const eligible = badgeInfo?.eligibleRaffles ?? [];
  const joined = [...(badgeInfo?.joinedRaffles ?? []), ...joinedLocal];
  const tagDays = badgeInfo?.tagDays ?? 0;

  const gifMap = useMemo(() => {
    const m = new Map<string, string>();
    raffles.forEach((r, idx) => {
      m.set(r.id, GIFS[idx % GIFS.length]!);
    });
    return m;
  }, [raffles]);

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
    <section className="relative rounded-none border-0 bg-[#0e1018] p-3 sm:p-8 flex flex-col min-h-full">

      {/* Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/20">
            <LuGift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('raffles_title')}</h2>
            <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">{t('raffles_subtitle')}</p>
          </div>
        </div>
        {raffles.length > 0 && (
          <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full px-2.5 py-1">
            {t('raffles_active_count', { count: raffles.length })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/60">
          <LuLoader className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      ) : raffles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 mb-3 opacity-60 grayscale">
            <Image src="/gif/sungorbobcry.gif" alt="Empty" width={96} height={96} className="object-contain" unoptimized />
          </div>
          <h3 className="text-base font-bold text-white">{t('raffles_empty_title')}</h3>
          <p className="text-white/40 text-xs mt-1">{t('raffles_empty_subtitle')}</p>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col">

          {/* Desktop grid */}
          <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {raffles.map((raffle) => {
              const isEligible = eligible.includes(raffle.id);
              const hasJoined = joined.includes(raffle.id);
              const isJoining = joiningId === raffle.id;
              const hasError = errorId === raffle.id;
              const daysNeeded = raffle.min_tag_days - tagDays;
              const isExpiringSoon = raffle.end_date
                ? new Date(raffle.end_date).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
                : false;

              return (
                <div
                  key={raffle.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border bg-[#0b0d12] p-5 transition-all duration-500 hover:-translate-y-1 ${
                    hasJoined
                      ? 'border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)]'
                      : isEligible
                      ? 'border-white/10 hover:shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:border-emerald-500/50'
                      : 'border-white/10 hover:shadow-[0_20px_50px_rgba(88,101,242,0.15)] hover:border-white/20'
                  }`}
                >
                  {/* GIF arka plan */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[24px]">
                    <div className="absolute inset-0 bg-[#0b0d12]/40 group-hover:bg-[#0b0d12]/30 transition-colors duration-500 z-10" />
                    <div className="absolute inset-0 z-0 opacity-60 scale-105 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700 ease-out mix-blend-screen brightness-110">
                      <Image
                        src={gifMap.get(raffle.id) ?? '/penguin/yuppi.gif'}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* İçerik */}
                  <div className="relative z-10">
                    {/* Ödüller + durum badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-1">
                        {raffle.prize_type === 'papel' && raffle.prize_papel_amount ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-md shadow-lg text-[10px] text-yellow-300 font-bold">
                            <LuCoins className="w-3 h-3" /> {raffle.prize_papel_amount.toLocaleString('tr-TR')} Papel
                          </span>
                        ) : raffle.prize_type === 'role' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 backdrop-blur-md shadow-lg text-[10px] text-violet-300 font-bold">
                            <LuShield className="w-3 h-3" /> {t('raffles_role_label')}
                          </span>
                        ) : raffle.prizes && raffle.prizes.length > 0 ? (
                          raffle.prizes.slice(0, 2).map((prize, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg text-[10px] text-white/70">
                              🎁 {prize}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg text-[10px] text-white/50">
                            <LuGift className="w-3 h-3" /> {t('raffles_surprise_label')}
                          </span>
                        )}
                      </div>
                      {hasJoined && (
                        <span className="shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <LuCheck className="w-2.5 h-2.5" /> {t('raffles_joined_badge')}
                        </span>
                      )}
                    </div>

                    {/* Başlık */}
                    <h3 className={`font-bold text-base leading-tight mb-1 transition-colors drop-shadow-md ${
                      hasJoined ? 'text-emerald-300 group-hover:text-emerald-200'
                      : isEligible ? 'text-white group-hover:text-emerald-300'
                      : 'text-white/60 group-hover:text-white/80'
                    }`}>
                      {raffle.title}
                    </h3>

                    {/* Açıklama */}
                    <p className="text-xs text-white/60 leading-relaxed line-clamp-2 min-h-[32px] group-hover:text-white/90 transition-colors">
                      {raffle.description || t('raffles_default_desc')}
                    </p>

                    {/* Etiketler */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        <LuTag className="w-3 h-3" />
                        {t('raffles_min_tag_days', { count: raffle.min_tag_days })}
                      </span>
                      {(raffle.winner_count ?? 1) > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm bg-amber-500/10 text-amber-400 border-amber-500/20">
                          <LuTrophy className="w-3 h-3" />
                          {t('raffles_winner_count', { count: raffle.winner_count ?? 1 })}
                        </span>
                      )}
                      {(raffle.entry_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm bg-white/5 text-white/40 border-white/10">
                          <LuUsers className="w-3 h-3" />
                          {t('raffles_participant_count', { count: raffle.entry_count ?? 0 })}
                        </span>
                      )}
                      {raffle.end_date && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm ${
                          isExpiringSoon
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {isExpiringSoon ? <LuClock className="w-3 h-3" /> : <LuCalendar className="w-3 h-3" />}
                          {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aksiyon alanı (hover'da açılır) */}
                  <div className={`relative z-10 mt-4 transition-all duration-300 ease-out overflow-hidden ${
                    isJoining || hasJoined || hasError ? 'max-h-[60px] opacity-100' : 'max-h-0 opacity-0 group-hover:max-h-[60px] group-hover:opacity-100'
                  }`}>
                    {hasJoined ? (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
                        <LuCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-300 font-medium">{t('raffles_joined_success')}</span>
                      </div>
                    ) : isEligible ? (
                      <>
                        {hasError && <p className="mb-1.5 text-[10px] text-red-400/80">{t('raffles_join_error')}</p>}
                        <button
                          type="button"
                          onClick={() => handleJoin(raffle.id)}
                          disabled={isJoining}
                          className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                        >
                          {isJoining ? (
                            <LuLoader className="w-4 h-4 animate-spin" />
                          ) : (
                            <><LuTicket className="w-4 h-4" /> {t('raffles_join_button')}</>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                        <LuLock className="w-4 h-4 text-white/30 shrink-0" />
                        <span className="text-xs text-white/40">
                          {daysNeeded > 0
                            ? t('raffles_tag_days_more', { count: daysNeeded })
                            : t('raffles_tag_days_required', { count: raffle.min_tag_days })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobil liste */}
          <div className="sm:hidden space-y-3 flex-1">
            {raffles.map((raffle) => {
              const isEligible = eligible.includes(raffle.id);
              const hasJoined = joined.includes(raffle.id);
              const isJoining = joiningId === raffle.id;
              const hasError = errorId === raffle.id;
              const daysNeeded = raffle.min_tag_days - tagDays;

              return (
                <div
                  key={raffle.id}
                  className={`relative flex overflow-hidden rounded-2xl border bg-[#0b0d12] ${
                    hasJoined ? 'border-emerald-500/40' : isEligible ? 'border-white/15' : 'border-white/8'
                  }`}
                >
                  {/* GIF sol */}
                  <div className="relative flex-shrink-0 w-28 min-h-[120px] overflow-hidden">
                    <div className="absolute inset-0 bg-[#0b0d12]/20 z-10" />
                    <Image
                      src={gifMap.get(raffle.id) ?? '/penguin/yuppi.gif'}
                      alt=""
                      fill
                      className="object-cover opacity-80"
                      unoptimized
                    />
                  </div>

                  {/* Sağ içerik */}
                  <div className="flex-1 flex flex-col justify-between p-3 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className={`text-sm font-bold leading-tight truncate ${hasJoined ? 'text-emerald-300' : isEligible ? 'text-white' : 'text-white/60'}`}>
                          {raffle.title}
                        </h4>
                        {hasJoined && (
                          <span className="shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <LuCheck className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5">
                        {raffle.description || t('raffles_default_desc')}
                      </p>

                      {/* Ödüller + etiketler */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {raffle.prize_type === 'papel' && raffle.prize_papel_amount ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-400">
                            <LuCoins className="w-2.5 h-2.5" /> {raffle.prize_papel_amount.toLocaleString('tr-TR')}p
                          </span>
                        ) : raffle.prize_type === 'role' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-400">
                            <LuShield className="w-2.5 h-2.5" /> {t('raffles_role_label')}
                          </span>
                        ) : raffle.prizes && raffle.prizes[0] ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                            🎁 {raffle.prizes[0]}
                          </span>
                        ) : null}
                        {(raffle.winner_count ?? 1) > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                            <LuTrophy className="w-2.5 h-2.5" /> {raffle.winner_count}
                          </span>
                        )}
                        {(raffle.entry_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/30">
                            <LuUsers className="w-2.5 h-2.5" /> {raffle.entry_count}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-400">
                          <LuTag className="w-2.5 h-2.5" />
                          {raffle.min_tag_days}g
                        </span>
                        {raffle.end_date && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/30">
                            <LuCalendar className="w-2.5 h-2.5" />
                            {new Date(raffle.end_date).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Aksiyon */}
                    <div className="mt-2.5">
                      {hasError && <p className="mb-1 text-[9px] text-red-400/80">{t('raffles_join_error')}</p>}
                      {hasJoined ? (
                        <div className="flex items-center gap-1.5 h-8 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5">
                          <LuCheck className="w-3 h-3 text-emerald-400" />
                          <span className="text-[11px] text-emerald-300 font-medium">{t('raffles_participated_badge')}</span>
                        </div>
                      ) : isEligible ? (
                        <button
                          type="button"
                          onClick={() => handleJoin(raffle.id)}
                          disabled={isJoining}
                          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 transition-all active:scale-95 disabled:opacity-70"
                        >
                          {isJoining ? (
                            <LuLoader className="w-3 h-3 animate-spin" />
                          ) : (
                            <><LuTicket className="w-3.5 h-3.5" /> {t('raffles_participate_button')}</>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 h-8 rounded-lg border border-white/8 bg-white/4 px-2.5">
                          <LuLock className="w-3 h-3 text-white/25" />
                          <span className="text-[10px] text-white/35">
                            {daysNeeded > 0
                              ? t('raffles_days_more', { count: daysNeeded })
                              : t('raffles_days_required', { count: raffle.min_tag_days })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bilgilendirme akordeonu */}
          <div className="mt-5 sm:mt-8 hidden sm:block">
            <button
              onClick={() => setInfoOpen(!infoOpen)}
              className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500/15 rounded-lg text-emerald-400">
                  <LuInfo className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{t('raffles_about_title')}</p>
                  <p className="text-[10px] text-white/40">{t('raffles_about_subtitle')}</p>
                </div>
              </div>
              {infoOpen ? <LuChevronUp className="text-white/40" /> : <LuChevronDown className="text-white/40" />}
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${infoOpen ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 text-xs text-white/60 space-y-2">
                <p>• Çekilişlere katılmak için sunucu tag&apos;ini belirlenen süre boyunca taşımanız gerekir.</p>
                <p>• Her çekilişe yalnızca bir kez katılabilirsiniz; çift kayıt engellenmiştir.</p>
                <p>• Çekiliş sonuçları admin tarafından duyurulur; kazananlar Discord üzerinden bilgilendirilir.</p>
                <p>• Tag süreniz yeterliyse bile çekiliş süresi dolmuşsa katılım yapılamaz.</p>
                <p>• Adil olmayan yollarla tag süresi kazandığı tespit edilen kullanıcılar çekilişten diskalifiye edilebilir.</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
