'use client';

import { LuShieldCheck, LuLock, LuStar, LuCoins, LuZap, LuCircleCheck } from 'react-icons/lu';
import type { BadgeInfo, BadgeTier } from '../types';

type Props = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
};

function RewardChip({ icon, label, highlight }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        highlight
          ? 'border border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
          : 'border border-white/10 bg-white/5 text-white/50'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function TierRow({
  tier,
  unlocked,
  isCurrent,
  tagDays,
  isLast,
}: {
  tier: BadgeTier;
  unlocked: boolean;
  isCurrent: boolean;
  tagDays: number;
  isLast: boolean;
}) {
  const color = tier.color ?? '#818cf8';
  const hasRewards = (tier.reward_papel ?? 0) > 0 || (tier.reward_earn_multiplier ?? 1) > 1;

  const daysLeft = tier.days_required - tagDays;
  const prevTierDays = 0; // used only for visual, not exact
  const progressPct = unlocked ? 100 : 0;
  void progressPct;
  void prevTierDays;

  return (
    <div className="relative flex gap-4">
      {/* Vertical line */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 w-0.5 bottom-0"
          style={{ background: unlocked ? `${color}44` : 'rgba(255,255,255,0.06)' }}
        />
      )}

      {/* Circle node */}
      <div className="relative z-10 flex-shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all ${
            isCurrent
              ? 'shadow-lg ring-2 ring-offset-1 ring-offset-[#0e1018]'
              : unlocked
              ? 'opacity-90'
              : 'opacity-40'
          }`}
          style={{
            background: unlocked ? `${color}22` : 'rgba(255,255,255,0.04)',
            border: `2px solid ${unlocked ? color + '88' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: isCurrent ? `0 0 16px ${color}55, 0 0 0 2px ${color}66` : undefined,
          }}
        >
          {unlocked ? (
            tier.emoji ?? '🏅'
          ) : (
            <LuLock className="h-4 w-4 text-white/25" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
        <div
          className={`rounded-2xl border p-4 transition-all ${
            isCurrent
              ? 'border-white/20 bg-white/[0.07]'
              : unlocked
              ? 'border-white/10 bg-white/[0.04]'
              : 'border-white/5 bg-white/[0.02]'
          }`}
          style={isCurrent ? { boxShadow: `inset 0 0 0 1px ${color}33` } : undefined}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: unlocked ? color : 'rgba(255,255,255,0.4)' }}
                >
                  {tier.name}
                </span>
                {isCurrent && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: color + '22', color }}
                  >
                    Aktif
                  </span>
                )}
                {unlocked && !isCurrent && (
                  <LuCircleCheck className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
              <p className={`mt-0.5 text-xs ${unlocked ? 'text-white/40' : 'text-white/20'}`}>
                {tier.days_required} gün gerekli
                {!unlocked && daysLeft > 0 && (
                  <span className="ml-1.5 text-white/30">— {daysLeft} gün kaldı</span>
                )}
              </p>
            </div>

            {/* Day badge */}
            <span
              className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
                unlocked
                  ? 'bg-white/10 text-white/60'
                  : 'bg-white/5 text-white/20'
              }`}
            >
              {tier.days_required}g
            </span>
          </div>

          {/* Description */}
          {tier.description && (
            <p className="mt-2 text-xs text-white/35 leading-relaxed">{tier.description}</p>
          )}

          {/* Rewards */}
          {hasRewards && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(tier.reward_papel ?? 0) > 0 && (
                <RewardChip
                  icon={<LuCoins className="h-3 w-3" />}
                  label={`+${tier.reward_papel} papel ödülü`}
                  highlight={unlocked}
                />
              )}
              {(tier.reward_earn_multiplier ?? 1) > 1 && (
                <RewardChip
                  icon={<LuZap className="h-3 w-3" />}
                  label={`×${tier.reward_earn_multiplier} kazanç çarpanı`}
                  highlight={unlocked}
                />
              )}
              {tier.reward_message && (
                <RewardChip
                  icon={<LuStar className="h-3 w-3" />}
                  label={tier.reward_message}
                  highlight={unlocked}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TagBadgeSection({ badgeInfo, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!badgeInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
        <LuShieldCheck className="h-10 w-10 text-white/15" />
        <p className="text-sm text-white/40">Rozet bilgisi yüklenemedi.</p>
      </div>
    );
  }

  const { currentBadge, nextBadge, tagDays, daysToNext, hasTag, earnMultiplier, allTiers } = badgeInfo;

  const prevDays = currentBadge?.days_required ?? 0;
  const nextDays = nextBadge?.days_required ?? null;
  const progressPct = nextDays
    ? Math.min(100, Math.round(((tagDays - prevDays) / (nextDays - prevDays)) * 100))
    : 100;

  const currentColor = currentBadge?.color ?? '#818cf8';

  return (
    <section className="relative min-h-full bg-[#0e1018] p-3 sm:p-8">
      {/* Background glows */}
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-violet-500/8 blur-[100px]" />

      <div className="relative space-y-5">
        {/* ─── Hero Card ─── */}
        <div
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          style={{ boxShadow: hasTag && currentBadge ? `0 0 40px ${currentColor}18` : undefined }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">Etiket Rozeti</p>

          {!hasTag ? (
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <LuShieldCheck className="h-7 w-7 text-white/20" />
              </div>
              <div>
                <p className="font-semibold text-white/50">Etiket Taşımıyorsunuz</p>
                <p className="mt-1 text-sm text-white/30">
                  Sunucu etiketini Discord profilinize ekleyerek rozet sisteminden yararlanabilirsiniz.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-5">
                {/* Badge icon */}
                <div
                  className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
                  style={{
                    background: `${currentColor}18`,
                    border: `1.5px solid ${currentColor}44`,
                    boxShadow: `0 0 24px ${currentColor}33`,
                  }}
                >
                  {currentBadge ? (currentBadge.emoji ?? '🏅') : <LuShieldCheck className="h-7 w-7 text-white/30" />}
                </div>

                {/* Status text */}
                <div className="flex-1">
                  {currentBadge ? (
                    <>
                      <p
                        className="text-xl font-bold leading-tight"
                        style={{ color: currentColor }}
                      >
                        {currentBadge.name}
                      </p>
                      <p className="mt-0.5 text-sm text-white/40">
                        {tagDays} gündür etiket taşıyorsunuz
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-semibold text-white/60">Henüz Rozet Kazanılmadı</p>
                      <p className="mt-0.5 text-sm text-white/40">{tagDays} gündür etiket taşıyorsunuz</p>
                    </>
                  )}

                  {/* Active perks */}
                  {earnMultiplier > 1 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <LuZap className="h-3 w-3" />
                      ×{earnMultiplier} kazanç çarpanı aktif
                    </div>
                  )}
                </div>
              </div>

              {/* Progress to next */}
              {nextBadge ? (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-white/40">
                      Sonraki:{' '}
                      <span className="font-medium text-white/60">
                        {nextBadge.emoji} {nextBadge.name}
                      </span>
                    </span>
                    <span className="font-semibold text-white/50">{daysToNext} gün kaldı</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progressPct}%`,
                        background: `linear-gradient(90deg, ${currentColor}bb, ${nextBadge.color ?? '#818cf8'}cc)`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/25">
                    <span>{prevDays}g</span>
                    <span>{progressPct}%</span>
                    <span>{nextBadge.days_required}g</span>
                  </div>
                </div>
              ) : currentBadge ? (
                <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
                  <LuStar className="h-3.5 w-3.5 text-yellow-400/60" />
                  En yüksek rozete ulaştınız — tebrikler!
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ─── Tag Yolu / Timeline ─── */}
        {allTiers.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <LuShieldCheck className="h-4 w-4 text-indigo-400" />
              <p className="text-sm font-semibold text-white/70">Tag Yolu</p>
              <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40">
                {allTiers.filter((t) => tagDays >= t.days_required).length}/{allTiers.length} kazanıldı
              </span>
            </div>

            {/* Summary chips */}
            <div className="mb-5 flex flex-wrap gap-2">
              {allTiers.some((t) => (t.reward_papel ?? 0) > 0) && (
                <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
                  <LuCoins className="h-3.5 w-3.5 text-yellow-400/50" />
                  <span>
                    Toplam{' '}
                    <span className="font-semibold text-yellow-300/70">
                      {allTiers.reduce((s, t) => s + (t.reward_papel ?? 0), 0)} papel
                    </span>{' '}
                    kazanılabilir
                  </span>
                </div>
              )}
              {allTiers.some((t) => (t.reward_earn_multiplier ?? 1) > 1) && (
                <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
                  <LuZap className="h-3.5 w-3.5 text-emerald-400/50" />
                  <span>
                    Maks{' '}
                    <span className="font-semibold text-emerald-300/70">
                      ×{Math.max(...allTiers.map((t) => t.reward_earn_multiplier ?? 1))} çarpan
                    </span>{' '}
                    ulaşılabilir
                  </span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="pl-1">
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

        {/* ─── No tiers yet ─── */}
        {allTiers.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
            <LuLock className="h-8 w-8 text-white/15" />
            <p className="text-sm text-white/30">Henüz rozet kademesi tanımlanmamış.</p>
          </div>
        )}
      </div>
    </section>
  );
}
