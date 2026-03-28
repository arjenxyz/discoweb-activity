'use client';

import Image from 'next/image';
import { LuShieldCheck, LuLock, LuCoins, LuZap, LuStar, LuCalendar, LuTrendingUp, LuCircleCheck } from 'react-icons/lu';
import type { BadgeInfo, BadgeTier } from '../types';

type Props = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
};

// ─── Discord emoji tag parser ────────────────────────────────────────────────
// Parses <:name:id> and <a:name:id> into an <img> element
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
            <Image
              key={i}
              src={url}
              alt={`:${name}:`}
              width={20}
              height={20}
              className="inline-block align-middle mx-0.5"
              unoptimized
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-lg font-bold text-white/85">{value}</div>
      {sub && <p className="mt-0.5 text-[11px] text-white/30">{sub}</p>}
    </div>
  );
}

// ─── Tier row in timeline ─────────────────────────────────────────────────────
function TierRow({
  tier, unlocked, isCurrent, tagDays, isLast,
}: {
  tier: BadgeTier; unlocked: boolean; isCurrent: boolean; tagDays: number; isLast: boolean;
}) {
  const color = tier.color ?? '#818cf8';
  const daysLeft = tier.days_required - tagDays;
  const hasRewards = (tier.reward_papel ?? 0) > 0 || (tier.reward_earn_multiplier ?? 1) > 1 || tier.reward_message;

  return (
    <div className="relative flex gap-3 sm:gap-4">
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute left-[18px] top-11 w-0.5 bottom-0 z-0"
          style={{ background: unlocked ? `${color}40` : 'rgba(255,255,255,0.05)' }}
        />
      )}

      {/* Node */}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-base transition-all"
          style={{
            background: unlocked ? `${color}20` : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${unlocked ? color + '70' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isCurrent ? `0 0 14px ${color}55` : undefined,
            opacity: unlocked ? 1 : 0.45,
          }}
        >
          {unlocked ? (
            tier.emoji ? <EmojiText text={tier.emoji} /> : '🏅'
          ) : (
            <LuLock className="h-3.5 w-3.5 text-white/25" />
          )}
        </div>
      </div>

      {/* Card */}
      <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
        <div
          className={`relative overflow-hidden rounded-2xl border transition-all ${
            isCurrent
              ? 'border-white/15 bg-white/[0.06]'
              : unlocked
              ? 'border-white/8 bg-white/[0.03]'
              : 'border-white/5 bg-white/[0.015]'
          }`}
          style={isCurrent ? { boxShadow: `0 0 0 1px ${color}30, 0 4px 24px ${color}15` } : undefined}
        >
          {/* Background image */}
          {tier.background_image && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image
                src={tier.background_image}
                alt=""
                fill
                className={`object-cover ${unlocked ? 'opacity-[0.35]' : 'opacity-[0.12]'}`}
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0e1018]/80 via-[#0e1018]/40 to-transparent" />
            </div>
          )}

          <div className="relative z-10 p-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-sm font-bold ${unlocked ? '' : 'opacity-40'}`}
                    style={{ color: unlocked ? color : undefined }}
                  >
                    {tier.name}
                  </span>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: color + '20', color }}
                    >
                      Aktif
                    </span>
                  )}
                  {unlocked && !isCurrent && (
                    <LuCircleCheck className="h-3.5 w-3.5 text-emerald-400/80" />
                  )}
                </div>
                <p className={`mt-0.5 text-xs ${unlocked ? 'text-white/35' : 'text-white/20'}`}>
                  {tier.days_required} gün gerekli
                  {!unlocked && daysLeft > 0 && (
                    <span className="ml-1 text-white/25">· {daysLeft} gün kaldı</span>
                  )}
                </p>
              </div>
              <div
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${
                  unlocked ? 'text-white/50' : 'text-white/15'
                }`}
                style={unlocked ? { background: color + '18' } : { background: 'rgba(255,255,255,0.04)' }}
              >
                {tier.days_required}g
              </div>
            </div>

            {/* Description */}
            {tier.description && (
              <p className="mt-2 text-xs leading-relaxed text-white/30">{tier.description}</p>
            )}

            {/* Rewards row */}
            {hasRewards && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(tier.reward_papel ?? 0) > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    unlocked
                      ? 'border border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
                      : 'border border-white/8 bg-white/5 text-white/25'
                  }`}>
                    <LuCoins className="h-3 w-3" />
                    +{tier.reward_papel} papel
                  </span>
                )}
                {(tier.reward_earn_multiplier ?? 1) > 1 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    unlocked
                      ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border border-white/8 bg-white/5 text-white/25'
                  }`}>
                    <LuZap className="h-3 w-3" />
                    ×{tier.reward_earn_multiplier} çarpan
                  </span>
                )}
                {tier.reward_message && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    unlocked
                      ? 'border border-violet-400/30 bg-violet-400/10 text-violet-300'
                      : 'border border-white/8 bg-white/5 text-white/25'
                  }`}>
                    <LuStar className="h-3 w-3" />
                    {tier.reward_message}
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function TagBadgeSection({ badgeInfo, loading }: Props) {
  if (loading) {
    return (
      <section className="min-h-full bg-[#0e1018] p-3 sm:p-8 space-y-4">
        <div className="h-44 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        <div className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        <div className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
      </section>
    );
  }

  if (!badgeInfo) {
    return (
      <section className="flex min-h-full items-center justify-center bg-[#0e1018] p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LuShieldCheck className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/30">Rozet bilgisi yüklenemedi.</p>
        </div>
      </section>
    );
  }

  const { currentBadge, nextBadge, tagDays, daysToNext, hasTag, earnMultiplier, allTiers } = badgeInfo;

  const prevDays = currentBadge?.days_required ?? 0;
  const nextDays = nextBadge?.days_required ?? null;
  const progressPct = nextDays
    ? Math.min(100, Math.round(((tagDays - prevDays) / (nextDays - prevDays)) * 100))
    : 100;

  const currentColor = currentBadge?.color ?? '#818cf8';
  const nextColor = nextBadge?.color ?? '#818cf8';
  const unlockedCount = allTiers.filter((t) => tagDays >= t.days_required).length;
  const totalPapel = allTiers.reduce((s, t) => s + (t.reward_papel ?? 0), 0);
  const maxMultiplier = allTiers.length ? Math.max(...allTiers.map((t) => t.reward_earn_multiplier ?? 1)) : 1;

  return (
    <section className="relative min-h-full bg-[#0e1018] p-3 sm:p-8">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute right-[-80px] top-[-80px] h-[500px] w-[500px] rounded-full opacity-40 blur-[120px]"
        style={{ background: `radial-gradient(circle, ${currentColor}22 0%, transparent 70%)` }}
      />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-600/8 blur-[80px]" />

      <div className="relative space-y-4">
        {/* ═══ HERO CARD ═══ */}
        <div
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
          style={{ boxShadow: hasTag ? `0 0 60px ${currentColor}12` : undefined }}
        >
          {/* Top accent line */}
          <div
            className="h-0.5 w-full"
            style={{
              background: hasTag
                ? `linear-gradient(90deg, transparent, ${currentColor}99, transparent)`
                : 'rgba(255,255,255,0.05)',
            }}
          />

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300/80">Etiket Rozeti</p>
              {hasTag && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Tag Aktif
                </span>
              )}
            </div>

            {!hasTag ? (
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5">
                  <LuShieldCheck className="h-7 w-7 text-white/20" />
                </div>
                <div>
                  <p className="font-semibold text-white/50">Etiket Taşımıyorsunuz</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/30">
                    Discord profilinize sunucu etiketini ekleyerek rozet sistemi ve özel ödüllerden yararlanabilirsiniz.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Badge + info */}
                <div className="flex flex-wrap items-start gap-5">
                  {/* Badge icon */}
                  <div
                    className="relative flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-2xl text-4xl"
                    style={{
                      background: `${currentColor}15`,
                      border: `1.5px solid ${currentColor}40`,
                      boxShadow: currentBadge ? `0 0 28px ${currentColor}30` : undefined,
                    }}
                  >
                    {currentBadge ? (
                      currentBadge.emoji ? <EmojiText text={currentBadge.emoji} /> : '🏅'
                    ) : (
                      <LuShieldCheck className="h-8 w-8 text-white/20" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {currentBadge ? (
                      <>
                        <p className="text-2xl font-black leading-tight tracking-tight" style={{ color: currentColor }}>
                          {currentBadge.name}
                        </p>
                        <p className="mt-1 text-sm text-white/40">
                          {tagDays} gündür etiket taşıyorsunuz
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-white/50">Henüz Rozet Yok</p>
                        <p className="mt-0.5 text-sm text-white/35">{tagDays} gündür etiket taşıyorsunuz</p>
                      </>
                    )}

                    {/* Active perks */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {earnMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                          <LuZap className="h-3 w-3" />
                          ×{earnMultiplier} kazanç çarpanı
                        </span>
                      )}
                      {currentBadge?.reward_message && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/8 px-2.5 py-0.5 text-xs text-violet-300/80">
                          <LuStar className="h-3 w-3" />
                          {currentBadge.reward_message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StatCard
                    label="Tag Süresi"
                    value={`${tagDays} gün`}
                    icon={<LuCalendar className="h-3 w-3" />}
                  />
                  <StatCard
                    label="Rozet"
                    value={unlockedCount > 0 ? `${unlockedCount}/${allTiers.length}` : '—'}
                    sub="kazanıldı"
                    icon={<LuShieldCheck className="h-3 w-3" />}
                  />
                  {earnMultiplier > 1 ? (
                    <StatCard
                      label="Çarpan"
                      value={`×${earnMultiplier}`}
                      sub="kazanç çarpanı"
                      icon={<LuTrendingUp className="h-3 w-3" />}
                    />
                  ) : (
                    <StatCard
                      label="Max Çarpan"
                      value={maxMultiplier > 1 ? `×${maxMultiplier}` : '—'}
                      sub="ulaşılabilir"
                      icon={<LuTrendingUp className="h-3 w-3" />}
                    />
                  )}
                </div>

                {/* Progress bar to next badge */}
                {nextBadge ? (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-white/40">
                        Sonraki rozet:{' '}
                        <span className="font-semibold" style={{ color: nextColor }}>
                          {nextBadge.emoji ? <EmojiText text={nextBadge.emoji} /> : null}
                          {' '}{nextBadge.name}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-white/50">
                        {daysToNext} gün kaldı
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progressPct}%`,
                          background: `linear-gradient(90deg, ${currentColor}cc, ${nextColor}dd)`,
                          boxShadow: `0 0 8px ${currentColor}88`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/20">
                      <span>{prevDays}g</span>
                      <span className="font-semibold">{progressPct}%</span>
                      <span>{nextBadge.days_required}g</span>
                    </div>
                  </div>
                ) : currentBadge ? (
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-yellow-400/15 bg-yellow-400/5 px-4 py-2.5 text-xs text-yellow-300/70">
                    <LuStar className="h-3.5 w-3.5 text-yellow-400/60" />
                    Tüm rozetlere ulaştınız — en yüksek seviyedesiniz!
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* ═══ TAG YOLU ═══ */}
        {allTiers.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuShieldCheck className="h-4 w-4 text-indigo-400/80" />
                <span className="text-sm font-bold text-white/75">Tag Yolu</span>
              </div>
              <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/40">
                {unlockedCount}/{allTiers.length} kazanıldı
              </span>
            </div>

            {/* Summary row */}
            {(totalPapel > 0 || maxMultiplier > 1) && (
              <div className="mb-5 flex flex-wrap gap-2">
                {totalPapel > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.06] px-3 py-1.5 text-xs text-white/40">
                    <LuCoins className="h-3.5 w-3.5 text-yellow-400/60" />
                    Tüm yolda toplam{' '}
                    <strong className="text-yellow-300/80">{totalPapel} papel</strong>{' '}
                    kazanılabilir
                  </div>
                )}
                {maxMultiplier > 1 && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1.5 text-xs text-white/40">
                    <LuZap className="h-3.5 w-3.5 text-emerald-400/60" />
                    Maksimum{' '}
                    <strong className="text-emerald-300/80">×{maxMultiplier} çarpan</strong>{' '}
                    ulaşılabilir
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
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

        {allTiers.length === 0 && hasTag && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-12 text-center">
            <LuLock className="h-8 w-8 text-white/12" />
            <p className="text-sm text-white/25">Henüz rozet kademesi tanımlanmamış.</p>
          </div>
        )}
      </div>
    </section>
  );
}
