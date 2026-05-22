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

// ─── Tier row ─────────────────────────────────────────────────────────────────
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
    <div className="relative flex gap-3 sm:gap-4">
      {!isLast && (
        <div
          className="absolute left-[18px] top-11 w-0.5 bottom-0 z-0"
          style={{ background: unlocked ? `${color}40` : 'rgba(255,255,255,0.05)' }}
        />
      )}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{
            background: unlocked ? `${color}20` : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${unlocked ? color + '70' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isCurrent ? `0 0 14px ${color}55` : undefined,
            opacity: unlocked ? 1 : 0.45,
          }}
        >
          {unlocked ? (tier.emoji ? <EmojiText text={tier.emoji} /> : '🏅') : <LuLock className="h-3.5 w-3.5 text-white/25" />}
        </div>
      </div>

      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
        <div
          className={`relative overflow-hidden rounded-2xl border transition-all ${
            isCurrent ? 'border-white/15 bg-white/[0.06]' : unlocked ? 'border-white/8 bg-white/[0.03]' : 'border-white/5 bg-white/[0.015]'
          }`}
          style={isCurrent ? { boxShadow: `0 0 0 1px ${color}30, 0 4px 24px ${color}15` } : undefined}
        >
          {tier.background_image && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image src={tier.background_image} alt="" fill className={`object-cover ${unlocked ? 'opacity-[0.35]' : 'opacity-[0.12]'}`} unoptimized />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0e1018]/80 via-[#0e1018]/40 to-transparent" />
            </div>
          )}
          <div className="relative z-10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-sm font-bold ${unlocked ? '' : 'opacity-40'}`} style={{ color: unlocked ? color : undefined }}>
                    {tier.name}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: color + '20', color }}>
                      {t('badge_active_label')}
                    </span>
                  )}
                  {unlocked && !isCurrent && <LuCircleCheck className="h-3.5 w-3.5 text-emerald-400/80" />}
                </div>
                <p className={`mt-0.5 text-xs ${unlocked ? 'text-white/35' : 'text-white/20'}`}>
                  {t('badge_days_required', { days: tier.days_required })}
                  {!unlocked && daysLeft > 0 && <span className="ml-1 text-white/25">· {t('badge_days_left', { days: daysLeft })}</span>}
                </p>
              </div>
              <div
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${unlocked ? 'text-white/50' : 'text-white/15'}`}
                style={unlocked ? { background: color + '18' } : { background: 'rgba(255,255,255,0.04)' }}
              >
                {tier.days_required}g
              </div>
            </div>
            {tier.description && <p className="mt-2 text-xs leading-relaxed text-white/30">{tier.description}</p>}
            {hasRewards && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(tier.reward_papel ?? 0) > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${unlocked ? 'border border-yellow-400/30 bg-yellow-400/10 text-yellow-300' : 'border border-white/8 bg-white/5 text-white/25'}`}>
                    <LuCoins className="h-3 w-3" />{t('badge_reward_papel', { amount: tier.reward_papel ?? 0 })}
                  </span>
                )}
                {(tier.reward_earn_multiplier ?? 1) > 1 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${unlocked ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border border-white/8 bg-white/5 text-white/25'}`}>
                    <LuZap className="h-3 w-3" />{t('badge_reward_multiplier', { multiplier: tier.reward_earn_multiplier ?? 1 })}
                  </span>
                )}
                {tier.reward_message && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${unlocked ? 'border border-violet-400/30 bg-violet-400/10 text-violet-300' : 'border border-white/8 bg-white/5 text-white/25'}`}>
                    <LuStar className="h-3 w-3" />{tier.reward_message}
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

export default function TagBadgeSection({ badgeInfo, loading, overviewStats }: Props) {
  const [activeTab, setActiveTab] = useState<'tag' | 'booster'>('tag');
  const t = useT();
  const expanded = overviewStats as OverviewStatsExpanded | null | undefined;
  const isBooster = expanded?.isBooster ?? false;
  const boosterSince = expanded?.boosterSince ?? null;
  const boosterBonusMessage = expanded?.boosterBonusMessage ?? 0;
  const boosterBonusVoice = expanded?.boosterBonusVoice ?? 0;
  const tagGrantedAt = expanded?.tagGrantedAt ?? null;
  const tagBonusMessage = expanded?.tagBonusMessage ?? 0;
  const tagBonusVoice = expanded?.tagBonusVoice ?? 0;

  const card = 'rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5';

  if (loading) {
    return (
      <section className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        <div className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
      </section>
    );
  }

  const hasTag = badgeInfo?.hasTag ?? false;
  const tagDays = badgeInfo?.tagDays ?? 0;
  const currentBadge = badgeInfo?.currentBadge ?? null;
  const nextBadge = badgeInfo?.nextBadge ?? null;
  const daysToNext = badgeInfo?.daysToNext ?? null;
  const earnMultiplier = badgeInfo?.earnMultiplier ?? 1;
  const allTiers = badgeInfo?.allTiers ?? [];

  const prevDays = currentBadge?.days_required ?? 0;
  const nextDays = nextBadge?.days_required ?? null;
  const progressPct = nextDays ? Math.min(100, Math.round(((tagDays - prevDays) / (nextDays - prevDays)) * 100)) : 100;
  const currentColor = currentBadge?.color ?? '#818cf8';
  const nextColor = nextBadge?.color ?? '#818cf8';
  const unlockedCount = allTiers.filter((t) => tagDays >= t.days_required).length;
  const totalPapel = allTiers.reduce((s, t) => s + (t.reward_papel ?? 0), 0);
  const maxMultiplier = allTiers.length ? Math.max(...allTiers.map((t) => t.reward_earn_multiplier ?? 1)) : 1;

  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6">

      {/* BAŞLIK */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('badge_title')}</h1>
          <p className="mt-1 text-sm text-white/40">{t('badge_subtitle')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${hasTag || isBooster ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[11px] font-medium text-white/40">{hasTag || isBooster ? t('badge_active_privilege') : t('badge_inactive')}</span>
        </div>
      </div>

      {/* SEKMELER */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('tag')}
          className={`flex-1 rounded-2xl border px-4 py-3 sm:py-4 text-sm font-semibold transition-all ${
            activeTab === 'tag'
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
              : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/80'
          }`}
        >
          Tag Verileri
        </button>
        <button
          onClick={() => setActiveTab('booster')}
          className={`flex-1 rounded-2xl border px-4 py-3 sm:py-4 text-sm font-semibold transition-all ${
            activeTab === 'booster'
              ? 'border-pink-500/30 bg-pink-500/10 text-pink-300'
              : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/80'
          }`}
        >
          Booster Verileri
        </button>
      </div>

      {/* DURUM KARTLARI */}
      <div>

        {/* TAG KARTI */}
        {activeTab === 'tag' && (
          <div className={`${card} relative overflow-hidden`}>
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-0.5"
            style={{ background: hasTag ? `linear-gradient(90deg, transparent, ${currentColor}99, transparent)` : 'rgba(255,255,255,0.04)' }}
          />
          {hasTag && (
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full blur-[60px]" style={{ background: `${currentColor}18` }} />
          )}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${hasTag ? 'bg-indigo-500/15 text-indigo-300' : 'bg-white/5 text-white/20'}`}>
                  <LuTag className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-white/80">{t('badge_server_tag')}</span>
              </div>
              {hasTag ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{t('badge_active_label')}
                </span>
              ) : (
                <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">{t('badge_inactive')}</span>
              )}
            </div>

            {hasTag ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
                    style={{ background: `${currentColor}15`, border: `1.5px solid ${currentColor}40`, boxShadow: currentBadge ? `0 0 20px ${currentColor}25` : undefined }}
                  >
                    {currentBadge ? (currentBadge.emoji ? <EmojiText text={currentBadge.emoji} /> : '🏅') : <LuShieldCheck className="h-7 w-7 text-white/20" />}
                  </div>
                  <div>
                    <p className="text-xl font-black leading-tight" style={{ color: currentColor }}>
                      {currentBadge?.name ?? t('badge_no_badge')}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{t('badge_tag_duration', { days: tagDays })}</p>
                    {earnMultiplier > 1 && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <LuZap className="h-2.5 w-2.5" />{t('badge_reward_multiplier', { multiplier: earnMultiplier })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] text-white/30 mb-1"><LuCalendar className="h-2.5 w-2.5 inline mr-1" />{t('badge_duration_label')}</p>
                    <p className="text-base font-black text-white tabular-nums">{tagDays}<span className="text-xs font-normal text-white/30 ml-0.5">g</span></p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] text-white/30 mb-1"><LuShieldCheck className="h-2.5 w-2.5 inline mr-1" />{t('badge_badge_label')}</p>
                    <p className="text-base font-black text-white tabular-nums">{unlockedCount}<span className="text-[10px] font-normal text-white/30">/{allTiers.length}</span></p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] text-white/30 mb-1"><LuTrendingUp className="h-2.5 w-2.5 inline mr-1" />{t('badge_multiplier_label')}</p>
                    <p className="text-base font-black text-white tabular-nums">×{earnMultiplier}</p>
                  </div>
                </div>

                {tagGrantedAt && (
                  <p className="text-[10px] text-white/25 mb-3">
                    {t('badge_tag_date', { date: new Date(tagGrantedAt).toLocaleDateString('tr-TR') })}
                  </p>
                )}

                {(tagBonusMessage > 0 || tagBonusVoice > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tagBonusMessage > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-400/8 px-2 py-0.5 text-[10px] text-indigo-300">
                        {t('badge_message_bonus', { amount: tagBonusMessage })}
                      </span>
                    )}
                    {tagBonusVoice > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-400/8 px-2 py-0.5 text-[10px] text-violet-300">
                        {t('badge_voice_bonus', { amount: tagBonusVoice })}
                      </span>
                    )}
                  </div>
                )}

                {nextBadge && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-white/35">{t('badge_next_badge', { name: nextBadge.name })}</span>
                      <span className="text-white/40 font-bold">{t('badge_next_days', { days: daysToNext ?? 0 })}</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentColor}cc, ${nextColor}dd)`, boxShadow: `0 0 8px ${currentColor}88` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] text-white/20">
                      <span>{prevDays}g</span><span>{progressPct}%</span><span>{nextBadge.days_required}g</span>
                    </div>
                  </div>
                )}
                {!nextBadge && currentBadge && (
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-400/15 bg-yellow-400/5 px-3 py-2 text-[10px] text-yellow-300/70">
                    <LuStar className="h-3 w-3 text-yellow-400/60 shrink-0" />{t('badge_max_level')}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
                  <LuShieldCheck className="h-6 w-6 text-white/15" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/40">{t('badge_no_tag_title')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/25">{t('badge_no_tag_description')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* BOOSTER KARTI */}
        {activeTab === 'booster' && (
        <div className={`${card} relative overflow-hidden`}>
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-0.5"
            style={{ background: isBooster ? 'linear-gradient(90deg, transparent, #ec489999, transparent)' : 'rgba(255,255,255,0.04)' }}
          />
          {isBooster && (
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-pink-500/12 blur-[60px]" />
          )}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isBooster ? 'bg-pink-500/15 text-pink-300' : 'bg-white/5 text-white/20'}`}>
                  <LuHeart className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-white/80">{t('badge_booster_title')}</span>
              </div>
              {isBooster ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/8 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />{t('badge_active_label')}
                </span>
              ) : (
                <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">{t('badge_inactive')}</span>
              )}
            </div>

            {isBooster ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-500/30 text-3xl"
                    style={{ boxShadow: '0 0 20px rgba(236,72,153,0.2)' }}>
                    💎
                  </div>
                  <div>
                    <p className="text-xl font-black leading-tight text-pink-300">{t('badge_booster_title')}</p>
                    <p className="text-xs text-white/40 mt-0.5">{t('badge_booster_supporting')}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/8 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                      <LuZap className="h-2.5 w-2.5" />{t('badge_nitro_boost_active')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {boosterSince && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] text-white/30 mb-1"><LuCalendar className="h-2.5 w-2.5 inline mr-1" />{t('badge_boost_date')}</p>
                      <p className="text-xs font-bold text-white">{new Date(boosterSince).toLocaleDateString('tr-TR')}</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] text-white/30 mb-1"><LuTrendingUp className="h-2.5 w-2.5 inline mr-1" />{t('badge_privilege_label')}</p>
                    <p className="text-xs font-bold text-pink-300">{t('badge_special_rewards')}</p>
                  </div>
                </div>

                {(boosterBonusMessage > 0 || boosterBonusVoice > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {boosterBonusMessage > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/20 bg-pink-400/8 px-2.5 py-1 text-[10px] text-pink-300">
                        <LuCoins className="h-2.5 w-2.5" />{t('badge_message_bonus', { amount: boosterBonusMessage })}
                      </span>
                    )}
                    {boosterBonusVoice > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/20 bg-pink-400/8 px-2.5 py-1 text-[10px] text-pink-300">
                        <LuZap className="h-2.5 w-2.5" />{t('badge_voice_bonus', { amount: boosterBonusVoice })}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-2xl opacity-30">
                  💎
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/40">{t('badge_no_boost_title')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/25">{t('badge_no_boost_description')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ROZET YOL HARİTASI */}
      {activeTab === 'tag' && allTiers.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
                <LuShieldCheck className="h-4 w-4 text-indigo-400/80" />
              </div>
              <div>
                <p className="text-sm font-bold text-white/80">{t('badge_tag_path')}</p>
                <p className="text-[10px] text-white/30">{t('badge_tag_tiers')}</p>
              </div>
            </div>
            <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/40">
              {t('badge_unlocked_count', { count: unlockedCount, total: allTiers.length })}
            </span>
          </div>

          {(totalPapel > 0 || maxMultiplier > 1) && (
            <div className="mb-5 flex flex-wrap gap-2">
              {totalPapel > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.06] px-3 py-1.5 text-xs text-white/40">
                  <LuCoins className="h-3.5 w-3.5 text-yellow-400/60" />
                  {t('badge_total_papel', { amount: totalPapel })}
                </div>
              )}
              {maxMultiplier > 1 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1.5 text-xs text-white/40">
                  <LuZap className="h-3.5 w-3.5 text-emerald-400/60" />
                  {t('badge_max_multiplier', { multiplier: maxMultiplier })}
                </div>
              )}
            </div>
          )}

          <div>
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

      {!badgeInfo && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-12 text-center">
          <LuShieldCheck className="h-8 w-8 text-white/12" />
          <p className="text-sm text-white/25">{t('badge_load_error')}</p>
        </div>
      )}
    </section>
  );
}
