'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuShieldCheck, LuLock, LuCoins, LuZap, LuStar, LuCalendar, LuTrendingUp, LuCircleCheck, LuTag, LuHeart, LuInfo } from 'react-icons/lu';
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

function TierIcon({ emoji, defaultIcon }: { emoji: string | null; defaultIcon: React.ReactNode }) {
  if (!emoji) return <>{defaultIcon}</>;
  if (emoji.startsWith('http')) {
    return <Image src={emoji} alt="icon" width={24} height={24} className="rounded-sm" unoptimized />;
  }
  return <EmojiText text={emoji} />;
}

// ─── Tier Row (Dashboard Style) ───────────────────────────────────────────────
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
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-11 w-0.5 bottom-0 z-0"
          style={{ background: unlocked ? `${color}40` : 'rgba(255,255,255,0.05)' }}
        />
      )}
      
      {/* Timeline Node */}
      <div className="relative z-10 flex-shrink-0 mt-1">
        {tier.background_image ? (
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden text-lg shadow-lg"
            style={{
              opacity: unlocked ? 1 : 0.4,
              filter: unlocked ? 'none' : 'grayscale(100%)',
              border: `1.5px solid ${unlocked ? color + '50' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: isCurrent ? `0 0 15px ${color}30` : undefined,
            }}
          >
            <Image src={tier.background_image} alt="bg" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
              {unlocked ? <TierIcon emoji={tier.emoji} defaultIcon="🏅" /> : <LuLock className="h-4 w-4 text-white/80 drop-shadow-md" />}
            </div>
          </div>
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{
              background: unlocked ? `${color}15` : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${unlocked ? color + '50' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: isCurrent ? `0 0 15px ${color}30` : undefined,
            }}
          >
            {unlocked ? <TierIcon emoji={tier.emoji} defaultIcon="🏅" /> : <LuLock className="h-4 w-4 text-white/30" />}
          </div>
        )}
      </div>

      {/* Content Card */}
      <div className={`flex-1 pb-6 transition-all duration-300 ${unlocked ? 'opacity-100' : 'opacity-80 grayscale-[20%]'}`}>
        <div className={`rounded-xl border p-4 ${isCurrent ? 'bg-white/[0.04]' : unlocked ? 'bg-white/[0.02]' : 'bg-white/[0.01]'} transition-colors`}
             style={{ borderColor: isCurrent ? `${color}40` : 'rgba(255,255,255,0.06)' }}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-base font-bold" style={{ color: unlocked ? color : '#ffffff' }}>
                  {tier.name}
                </span>
                {isCurrent && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: color + '20', color }}>
                    {t('badge_active_label')}
                  </span>
                )}
                {unlocked && !isCurrent && <LuCircleCheck className="h-4 w-4 text-emerald-400/80" />}
                {!unlocked && (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/40 flex items-center gap-1">
                    <LuLock className="h-3 w-3" /> Hedef
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mb-2">
                {t('badge_days_required', { days: tier.days_required })}
                {!unlocked && daysLeft > 0 && <span className="ml-1 text-indigo-300/80 font-bold">({t('badge_days_left', { days: daysLeft })})</span>}
              </p>
              {tier.description && <p className="text-xs text-white/50">{tier.description}</p>}
            </div>
          </div>
          
          {/* Rewards */}
          {hasRewards && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(tier.reward_papel ?? 0) > 0 && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${unlocked ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' : 'border-yellow-500/10 bg-white/5 text-yellow-500/60'}`}>
                  <LuCoins className="h-3 w-3" />+{tier.reward_papel} Papel
                </span>
              )}
              {(tier.reward_earn_multiplier ?? 1) > 1 && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${unlocked ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500/10 bg-white/5 text-emerald-500/60'}`}>
                  <LuZap className="h-3 w-3" />{tier.reward_earn_multiplier}x Çarpan
                </span>
              )}
              {tier.reward_message && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${unlocked ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300' : 'border-indigo-500/10 bg-white/5 text-indigo-400/60'}`}>
                  <LuStar className="h-3 w-3" />{tier.reward_message}
                </span>
              )}
            </div>
          )}
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

  const boosterMonths = badgeInfo?.boosterMonths ?? 0;
  const currentBoosterBadge = badgeInfo?.currentBoosterBadge ?? null;
  const nextBoosterBadge = badgeInfo?.nextBoosterBadge ?? null;
  const monthsToNext = badgeInfo?.monthsToNext ?? null;
  const allBoosterTiers = badgeInfo?.allBoosterTiers ?? [];
  const boosterEarnMultiplier = badgeInfo?.boosterEarnMultiplier ?? 1;

  if (loading) {
    return (
      <section className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
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
    <section className="p-4 sm:p-6 flex flex-col gap-6">
      
      {/* ─── DASHBOARD HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('badge_title')}</h1>
          <p className="mt-1 text-sm text-white/40">{t('badge_subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${hasTag || isBooster ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[11px] font-medium text-white/50">{hasTag || isBooster ? t('badge_active_privilege') : t('badge_inactive')}</span>
        </div>
      </div>

      {/* ─── DASHBOARD TABS ─── */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-px">
        <button
          onClick={() => setActiveTab('tag')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'tag'
              ? 'border-indigo-400 text-indigo-300 bg-indigo-500/[0.03]'
              : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
          }`}
        >
          <LuTag className="h-4 w-4" />
          Tag Verileri
        </button>
        <button
          onClick={() => setActiveTab('booster')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'booster'
              ? 'border-pink-400 text-pink-300 bg-pink-500/[0.03]'
              : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
          }`}
        >
          <LuHeart className="h-4 w-4" />
          Booster Verileri
        </button>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="animate-in fade-in duration-300">
        
        {/* ========================================================= */}
        {/* TAG İÇERİĞİ                                               */}
        {/* ========================================================= */}
        {activeTab === 'tag' && (
          <div className="flex flex-col gap-6">
            
            {/* Tag Durum Kartı */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              {hasTag ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {currentBadge?.background_image ? (
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden shadow-lg border border-indigo-500/30">
                          <Image src={currentBadge.background_image} alt="bg" fill className="object-cover" unoptimized />
                          <div className="absolute inset-0 flex items-center justify-center z-10 text-2xl drop-shadow-md">
                            <TierIcon emoji={currentBadge.emoji} defaultIcon={<LuShieldCheck className="h-6 w-6 text-white" />} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-2xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                          {currentBadge ? <TierIcon emoji={currentBadge.emoji} defaultIcon="🏅" /> : <LuShieldCheck className="h-6 w-6 text-indigo-400" />}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">
                          {currentBadge?.name ?? 'Tag Aktif'}
                        </h2>
                        <p className="text-xs text-indigo-300/70 font-medium">
                          {tagDays} {t('badge_duration_label').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      {tagGrantedAt && (
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Başlangıç Tarihi</p>
                      )}
                      <p className="text-xs text-white/50">{tagGrantedAt ? new Date(tagGrantedAt).toLocaleDateString('tr-TR') : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[10px] text-white/40 mb-1"><LuCalendar className="h-3 w-3 inline mr-1" />{t('badge_duration_label')}</p>
                      <p className="text-lg font-bold text-white">{tagDays} <span className="text-xs text-white/30 font-normal">Gün</span></p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[10px] text-white/40 mb-1"><LuShieldCheck className="h-3 w-3 inline mr-1" />{t('badge_badge_label')}</p>
                      <p className="text-lg font-bold text-white">{unlockedCount} <span className="text-xs text-white/30 font-normal">/ {allTiers.length}</span></p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3">
                      <p className="text-[10px] text-emerald-400/60 mb-1"><LuZap className="h-3 w-3 inline mr-1" />{t('badge_multiplier_label')}</p>
                      <p className="text-lg font-bold text-emerald-400">×{earnMultiplier}</p>
                    </div>
                    {(tagBonusMessage > 0 || tagBonusVoice > 0) && (
                      <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.02] p-3">
                        <p className="text-[10px] text-violet-400/60 mb-1"><LuCoins className="h-3 w-3 inline mr-1" />Ekstra Bonus</p>
                        <p className="text-sm font-bold text-violet-300 mb-0.5">+{tagBonusMessage} <span className="text-[10px] font-normal text-violet-300/50">Msj</span></p>
                        <p className="text-sm font-bold text-violet-300">+{tagBonusVoice} <span className="text-[10px] font-normal text-violet-300/50">Ses</span></p>
                      </div>
                    )}
                  </div>

                  {nextBadge && (
                    <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.01] p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-white/40">{t('badge_next_badge', { name: nextBadge.name })}</span>
                        <span className="font-semibold text-white/80">{t('badge_next_days', { days: daysToNext ?? 0 })}</span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentColor}cc, ${nextColor}dd)` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <LuTag className="h-5 w-5 text-white/30" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/80 mb-1">{t('badge_no_tag_title')}</h3>
                    <p className="text-xs text-white/40 leading-relaxed max-w-2xl">
                      {t('badge_no_tag_description')} Aşağıdaki rozetleri ve ayrıcalıkları kazanmak için Discord isminize tagımızı eklemeniz yeterlidir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rozet Yol Haritası (Her zaman görünür!) */}
            {allTiers.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                    <LuTrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Rozet Yol Haritası</h3>
                    <p className="text-[10px] text-white/40">Zamanla kazanabileceğiniz tüm ayrıcalıklar</p>
                  </div>
                </div>
                
                <div className="pl-2">
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
          </div>
        )}

        {/* ========================================================= */}
        {/* BOOSTER İÇERİĞİ                                           */}
        {/* ========================================================= */}
        {activeTab === 'booster' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              {isBooster ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {currentBoosterBadge?.background_image ? (
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl overflow-hidden shadow-lg border border-pink-500/30">
                          <Image src={currentBoosterBadge.background_image} alt="bg" fill className="object-cover" unoptimized />
                          <div className="absolute inset-0 flex items-center justify-center z-10 text-2xl drop-shadow-md">
                            <TierIcon emoji={currentBoosterBadge.emoji} defaultIcon="💎" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-2xl shadow-[0_0_15px_rgba(236,72,153,0.15)]">
                          {currentBoosterBadge ? <TierIcon emoji={currentBoosterBadge.emoji} defaultIcon="💎" /> : '💎'}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">
                          {currentBoosterBadge?.name ?? 'Aktif Booster'}
                        </h2>
                        <p className="text-xs text-pink-300/70 font-medium">
                          {boosterMonths} Ay Destek
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      {boosterSince && (
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Destek Tarihi</p>
                      )}
                      <p className="text-xs text-white/50">{boosterSince ? new Date(boosterSince).toLocaleDateString('tr-TR') : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[10px] text-white/40 mb-1"><LuCalendar className="h-3 w-3 inline mr-1" />Destek Süresi</p>
                      <p className="text-lg font-bold text-white">{boosterMonths} <span className="text-xs text-white/30 font-normal">Ay</span></p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-[10px] text-white/40 mb-1"><LuShieldCheck className="h-3 w-3 inline mr-1" />Rozet</p>
                      <p className="text-lg font-bold text-white">{allBoosterTiers.filter(t => boosterMonths >= t.months_required).length} <span className="text-xs text-white/30 font-normal">/ {allBoosterTiers.length}</span></p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3">
                      <p className="text-[10px] text-emerald-400/60 mb-1"><LuZap className="h-3 w-3 inline mr-1" />Çarpan</p>
                      <p className="text-lg font-bold text-emerald-400">×{boosterEarnMultiplier}</p>
                    </div>
                    {(boosterBonusMessage > 0 || boosterBonusVoice > 0) && (
                      <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.02] p-3">
                        <p className="text-[10px] text-violet-400/60 mb-1"><LuCoins className="h-3 w-3 inline mr-1" />Ekstra Kazanç</p>
                        <p className="text-sm font-bold text-violet-300 mb-0.5">+{boosterBonusMessage} <span className="text-[10px] font-normal text-violet-300/50">Msj</span></p>
                        <p className="text-sm font-bold text-violet-300">+{boosterBonusVoice} <span className="text-[10px] font-normal text-violet-300/50">Ses</span></p>
                      </div>
                    )}
                  </div>

                  {nextBoosterBadge && (
                    <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.01] p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-white/40">{t('badge_next_badge', { name: nextBoosterBadge.name })}</span>
                        <span className="font-semibold text-white/80">{monthsToNext} Ay Kaldı</span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, Math.round(((boosterMonths - (currentBoosterBadge?.months_required ?? 0)) / ((nextBoosterBadge.months_required) - (currentBoosterBadge?.months_required ?? 0))) * 100))}%`, background: `linear-gradient(90deg, ${currentBoosterBadge?.color ?? '#f472b6'}cc, ${nextBoosterBadge.color ?? '#f472b6'}dd)` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 opacity-40">
                    💎
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/80 mb-1">{t('badge_no_boost_title')}</h3>
                    <p className="text-xs text-white/40 leading-relaxed max-w-2xl">
                      {t('badge_no_boost_description')} Discord Nitro ile sunucumuza takviye basarak özel renklere, rollere ve devasa ekstra mesaj/ses bonuslarına anında sahip olabilirsiniz.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Booster Yol Haritası */}
            {allBoosterTiers.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
                    <LuTrendingUp className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Booster Yol Haritası</h3>
                    <p className="text-[10px] text-white/40">Zamanla kazanabileceğiniz tüm ayrıcalıklar</p>
                  </div>
                </div>
                
                <div className="pl-2">
                  {allBoosterTiers.map((tier, idx) => (
                    <TierRow
                      key={tier.id}
                      tier={{ ...tier, days_required: tier.months_required }}
                      unlocked={boosterMonths >= tier.months_required}
                      isCurrent={currentBoosterBadge?.id === tier.id}
                      tagDays={boosterMonths}
                      isLast={idx === allBoosterTiers.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
