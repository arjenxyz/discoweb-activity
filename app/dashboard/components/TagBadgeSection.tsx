'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuShieldCheck, LuLock, LuCoins, LuZap, LuStar, LuCalendar, LuTrendingUp, LuCircleCheck, LuTag, LuHeart } from 'react-icons/lu';
import type { BadgeInfo, BadgeTier, OverviewStats, OverviewStatsExpanded } from '../types';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
  overviewStats?: OverviewStats | OverviewStatsExpanded | null;
};

// ─── Discord emoji parser ─────────────────────────────────────────────────────
function EmojiText({ text }: { text: string }) {
  const parts = text.split(/(<a?:[^:]+:\d+>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^<(a?):([^:]+):(\d+)>$/);
        if (match) {
          const animated = match[1] === 'a';
          const name = match[2];
          const id = match[3];
          const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'webp'}?size=64`;
          return (
            <Image key={i} src={url} alt={`:${name}:`} width={20} height={20} className="inline-block align-middle mx-0.5" unoptimized />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Minimal Tier Row ──────────────────────────────────────────────────────────
function TierRow({ tier, unlocked, isCurrent, tagDays, isLast }: {
  tier: BadgeTier;
  unlocked: boolean;
  isCurrent: boolean;
  tagDays: number;
  isLast: boolean;
}) {
  const t = useT();
  const color = tier.color ?? '#818cf8';
  const daysLeft = tier.days_required - tagDays;
  const hasRewards = (tier.reward_papel ?? 0) > 0 || (tier.reward_earn_multiplier ?? 1) > 1 || tier.reward_message;

  return (
    <div className="group relative flex gap-6">
      {/* Timeline Line */}
      {!isLast && (
        <div
          className="absolute left-[1.15rem] top-12 w-0.5 bottom-[-1rem] z-0 transition-colors duration-500"
          style={{ background: unlocked ? `linear-gradient(to bottom, ${color}60, ${color}10)` : 'rgba(255,255,255,0.05)' }}
        />
      )}
      
      {/* Timeline Node */}
      <div className="relative z-10 flex-shrink-0 mt-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg backdrop-blur-md transition-all duration-500 ${isCurrent ? 'scale-110' : 'group-hover:scale-105'}`}
          style={{
            background: unlocked ? `${color}15` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${unlocked ? color + '50' : 'rgba(255,255,255,0.05)'}`,
            boxShadow: isCurrent ? `0 0 20px ${color}40, inset 0 0 10px ${color}20` : undefined,
            opacity: unlocked ? 1 : 0.3,
          }}
        >
          {unlocked ? (tier.emoji ? <EmojiText text={tier.emoji} /> : '🏅') : <LuLock className="h-4 w-4 text-white/40" />}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 pb-10 transition-opacity duration-300 ${unlocked ? 'opacity-100' : 'opacity-40'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xl font-bold tracking-tight" style={{ color: unlocked ? color : '#ffffff' }}>
                {tier.name}
              </span>
              {isCurrent && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest" style={{ background: color + '20', color }}>
                  {t('badge_active_label')}
                </span>
              )}
              {unlocked && !isCurrent && <LuCircleCheck className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-sm font-medium text-white/40 mb-2">
              {t('badge_days_required', { days: tier.days_required })}
              {!unlocked && daysLeft > 0 && <span className="ml-2 text-white/30 font-normal">({t('badge_days_left', { days: daysLeft })})</span>}
            </p>
            {tier.description && <p className="text-sm leading-relaxed text-white/50 max-w-2xl">{tier.description}</p>}
            
            {/* Rewards */}
            {hasRewards && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(tier.reward_papel ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-transparent px-3 py-1 text-xs font-semibold text-yellow-400">
                    <LuCoins className="h-3.5 w-3.5" />+{tier.reward_papel} Papel
                  </span>
                )}
                {(tier.reward_earn_multiplier ?? 1) > 1 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent px-3 py-1 text-xs font-semibold text-emerald-400">
                    <LuZap className="h-3.5 w-3.5" />{tier.reward_earn_multiplier}x Çarpan
                  </span>
                )}
                {tier.reward_message && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-transparent px-3 py-1 text-xs font-medium text-indigo-300">
                    <LuStar className="h-3.5 w-3.5" />{tier.reward_message}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TagBadgeSection({ badgeInfo, loading, overviewStats }: Props) {
  const [activeTab, setActiveTab] = useState<'tag' | 'booster'>('tag');
  const t = useT();
  const expanded = overviewStats as OverviewStatsExpanded | null | undefined;
  
  const isBooster = expanded?.isBooster ?? false;
  const boosterSince = expanded?.boosterSince ?? null;
  const boosterBonusMessage = expanded?.boosterBonusMessage ?? 0;
  const boosterBonusVoice = expanded?.boosterBonusVoice ?? 0;
  
  const hasTag = badgeInfo?.hasTag ?? false;
  const tagGrantedAt = expanded?.tagGrantedAt ?? null;
  const tagBonusMessage = expanded?.tagBonusMessage ?? 0;
  const tagBonusVoice = expanded?.tagBonusVoice ?? 0;
  
  const tagDays = badgeInfo?.tagDays ?? 0;
  const currentBadge = badgeInfo?.currentBadge ?? null;
  const nextBadge = badgeInfo?.nextBadge ?? null;
  const daysToNext = badgeInfo?.daysToNext ?? null;
  const earnMultiplier = badgeInfo?.earnMultiplier ?? 1;
  const allTiers = badgeInfo?.allTiers ?? [];

  if (loading) {
    return (
      <section className="flex flex-col items-center justify-center h-64 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
      </section>
    );
  }

  const prevDays = currentBadge?.days_required ?? 0;
  const nextDays = nextBadge?.days_required ?? null;
  const progressPct = nextDays ? Math.min(100, Math.round(((tagDays - prevDays) / (nextDays - prevDays)) * 100)) : 100;
  const currentColor = currentBadge?.color ?? '#818cf8';
  const nextColor = nextBadge?.color ?? '#818cf8';
  const unlockedCount = allTiers.filter((t) => tagDays >= t.days_required).length;

  return (
    <section className="p-4 sm:p-8 max-w-5xl mx-auto">
      
      {/* ─── BÜYÜK BAŞLIK ─── */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-3">
          Rozet & Ayrıcalıklar
        </h1>
        <p className="text-white/40 text-sm md:text-base max-w-xl mx-auto">
          Sunucumuzu destekleyerek elde edebileceğiniz özel rozetler, benzersiz ayrıcalıklar ve yüksek papel çarpanlarını buradan takip edebilirsiniz.
        </p>
      </div>

      {/* ─── YUMUŞAK SEKME (PILL) TASARIMI ─── */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center rounded-full bg-white/5 p-1.5 backdrop-blur-xl border border-white/10">
          <button
            onClick={() => setActiveTab('tag')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'tag'
                ? 'bg-white text-black shadow-lg shadow-white/20'
                : 'text-white/50 hover:text-white/90 hover:bg-white/5'
            }`}
          >
            <LuTag className="h-4 w-4" /> Tag Serüveni
          </button>
          <button
            onClick={() => setActiveTab('booster')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'booster'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'text-white/50 hover:text-white/90 hover:bg-white/5'
            }`}
          >
            <LuHeart className="h-4 w-4" /> Booster Profili
          </button>
        </div>
      </div>

      {/* ─── İÇERİK ALANI ─── */}
      <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ========================================================= */}
        {/* TAG İÇERİĞİ                                               */}
        {/* ========================================================= */}
        {activeTab === 'tag' && (
          <div>
            {hasTag ? (
              <>
                {/* Tag Hero */}
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-16 relative">
                  {/* Parlama Efekti */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-[3rem] group-hover:bg-indigo-500/40 transition-all duration-700 pointer-events-none" />
                    <div
                      className="relative flex h-32 w-32 md:h-40 md:w-40 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 text-6xl shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: `inset 0 0 20px ${currentColor}20, 0 20px 40px -10px ${currentColor}40` }}
                    >
                      {currentBadge ? (currentBadge.emoji ? <EmojiText text={currentBadge.emoji} /> : '🏅') : <LuShieldCheck className="h-12 w-12 text-white/20" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left relative z-10">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Aktif Takip
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3" style={{ textShadow: `0 0 30px ${currentColor}40` }}>
                      {currentBadge?.name ?? 'Rozetsiz Başlangıç'}
                    </h2>
                    <p className="text-lg md:text-xl text-white/50 font-medium mb-4">
                      {tagDays} gündür isminde tagımızı taşıyorsun.
                    </p>
                    {tagGrantedAt && (
                      <p className="text-xs text-white/30 uppercase tracking-widest">
                        Başlangıç: {new Date(tagGrantedAt).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Minimal Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                    <LuCalendar className="h-5 w-5 text-white/20 mb-3" />
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Toplam Süre</p>
                    <p className="text-3xl font-black text-white">{tagDays}<span className="text-sm text-white/30 font-medium ml-1">Gün</span></p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                    <LuShieldCheck className="h-5 w-5 text-indigo-400/40 mb-3" />
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Rozetler</p>
                    <p className="text-3xl font-black text-white">{unlockedCount}<span className="text-sm text-white/30 font-medium ml-1">/ {allTiers.length}</span></p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/10 backdrop-blur-sm">
                    <LuZap className="h-5 w-5 text-emerald-400/40 mb-3" />
                    <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest mb-1">Kazanç Çarpanı</p>
                    <p className="text-3xl font-black text-emerald-400">×{earnMultiplier}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-violet-500/10 to-transparent border border-violet-500/10 backdrop-blur-sm">
                    <LuCoins className="h-5 w-5 text-violet-400/40 mb-3" />
                    <p className="text-violet-400/60 text-[10px] font-bold uppercase tracking-widest mb-1">Ekstra Bonus</p>
                    <p className="text-xl font-bold text-violet-300">
                      +{tagBonusMessage} <span className="text-xs text-violet-400/50">Msj</span>
                    </p>
                    <p className="text-xl font-bold text-violet-300">
                      +{tagBonusVoice} <span className="text-xs text-violet-400/50">Ses</span>
                    </p>
                  </div>
                </div>

                {/* Next Badge Progress Minimal */}
                {nextBadge && (
                  <div className="mb-16">
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Sıradaki Hedef</p>
                        <p className="text-xl font-bold text-white">{nextBadge.name}</p>
                      </div>
                      <p className="text-right">
                        <span className="text-2xl font-black text-white">{daysToNext}</span>
                        <span className="text-sm text-white/40 ml-1">gün kaldı</span>
                      </p>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-white/5 border border-white/10">
                      <div
                        className="h-full rounded-full relative"
                        style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentColor}, ${nextColor})`, boxShadow: `0 0 20px ${currentColor}88` }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tiers List Minimal */}
                {allTiers.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                      <LuTrendingUp className="text-white/30" /> Rozet Yol Haritası
                    </h3>
                    <div className="pl-4">
                      {allTiers.map((tier, idx) => (
                        <TierRow
                          key={tier.id}
                          tier={tier}
                          unlocked={tagDays >= tier.days_required}
                          isCurrent={currentBadge?.id === tier.id}
                          tagDays={tagDays}
                          isLast={idx === allTiers.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Tag Yok Tasarımı */
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
                  <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.02] text-white/10 backdrop-blur-md">
                    <LuTag className="h-12 w-12" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Tag Bulunmuyor</h2>
                <p className="text-white/40 max-w-md mx-auto">
                  Sunucu tagımızı isminize ekleyerek otomatik rozet kazanabilir, mesaj ve ses kazançlarınızı katlayabilirsiniz. Tag eklendikten sonra takip otomatik başlar.
                </p>
              </div>
            )}
          </div>
        )}


        {/* ========================================================= */}
        {/* BOOSTER İÇERİĞİ                                           */}
        {/* ========================================================= */}
        {activeTab === 'booster' && (
          <div>
            {isBooster ? (
              <>
                {/* Booster Hero */}
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-16 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-pink-500/30 blur-2xl rounded-[3rem] group-hover:bg-pink-500/40 transition-all duration-700 pointer-events-none" />
                    <div
                      className="relative flex h-32 w-32 md:h-40 md:w-40 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 text-6xl shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: 'inset 0 0 20px rgba(236,72,153,0.2), 0 20px 40px -10px rgba(236,72,153,0.4)' }}
                    >
                      💎
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left relative z-10">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-pink-400 mb-4">
                      <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
                      Aktif Booster
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3" style={{ textShadow: '0 0 30px rgba(236,72,153,0.4)' }}>
                      Destekçi Üye
                    </h2>
                    <p className="text-lg md:text-xl text-white/50 font-medium mb-4">
                      Sunucumuza Nitro takviyesi sağladığınız için teşekkürler!
                    </p>
                    {boosterSince && (
                      <p className="text-xs text-white/30 uppercase tracking-widest">
                        Başlangıç: {new Date(boosterSince).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Minimal Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-pink-500/10 to-transparent border border-pink-500/10 backdrop-blur-sm">
                    <LuHeart className="h-5 w-5 text-pink-400/40 mb-3" />
                    <p className="text-pink-400/60 text-[10px] font-bold uppercase tracking-widest mb-1">Booster Ayrıcalıkları</p>
                    <p className="text-2xl font-bold text-pink-300">Özel Rol & Renk</p>
                    <p className="text-sm text-pink-300/50 mt-1">Sunucumuzdaki booster yetkilerine sahipsiniz.</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-violet-500/10 to-transparent border border-violet-500/10 backdrop-blur-sm">
                    <LuCoins className="h-5 w-5 text-violet-400/40 mb-3" />
                    <p className="text-violet-400/60 text-[10px] font-bold uppercase tracking-widest mb-1">Ekstra Bonus Kazancı</p>
                    <p className="text-2xl font-bold text-violet-300">
                      +{boosterBonusMessage} <span className="text-sm text-violet-400/50">Mesaj Başına</span>
                    </p>
                    <p className="text-2xl font-bold text-violet-300 mt-1">
                      +{boosterBonusVoice} <span className="text-sm text-violet-400/50">Sesli Sohbet (dk)</span>
                    </p>
                  </div>
                </div>

              </>
            ) : (
              /* Booster Yok Tasarımı */
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-pink-500/5 blur-3xl rounded-full" />
                  <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.02] text-6xl opacity-30 backdrop-blur-md grayscale">
                    💎
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Sunucu Takviyesi Yok</h2>
                <p className="text-white/40 max-w-md mx-auto">
                  Discord Nitro ile sunucumuza takviye basarak özel renklere, rollere ve devasa ekstra mesaj/ses bonuslarına sahip olabilirsiniz.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
