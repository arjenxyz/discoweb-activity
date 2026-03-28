'use client';

import type { BadgeInfo, BadgeTier } from '../types';

type Props = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
};

function TierCard({ tier, unlocked, isCurrent }: { tier: BadgeTier; unlocked: boolean; isCurrent: boolean }) {
  const color = tier.color ?? '#5865F2';
  return (
    <div
      className={`relative rounded-xl border p-4 transition ${
        isCurrent
          ? 'border-white/30 bg-white/10'
          : unlocked
          ? 'border-white/15 bg-white/5'
          : 'border-white/5 bg-white/[0.02] opacity-50'
      }`}
    >
      {isCurrent && (
        <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
          Aktif
        </span>
      )}
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: color + '33', border: `2px solid ${color}66` }}
        >
          {tier.emoji ?? '🏅'}
        </span>
        <div>
          <p className="font-semibold" style={{ color: unlocked ? color : undefined }}>
            {tier.name}
          </p>
          <p className="text-xs text-white/40">{tier.days_required} gün</p>
        </div>
      </div>

      {/* Rewards */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(tier.reward_papel ?? 0) > 0 && (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300">
            +{tier.reward_papel} papel
          </span>
        )}
        {(tier.reward_earn_multiplier ?? 1) > 1 && (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
            ×{tier.reward_earn_multiplier} kazanç
          </span>
        )}
        {!unlocked && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/30">
            🔒 Kilitli
          </span>
        )}
      </div>

      {tier.description && (
        <p className="mt-2 text-xs text-white/40">{tier.description}</p>
      )}
    </div>
  );
}

export default function TagBadgeSection({ badgeInfo, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-white/5 bg-white/5" />
        ))}
      </div>
    );
  }

  if (!badgeInfo) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/40">
        Rozet bilgisi yüklenemedi.
      </div>
    );
  }

  const { currentBadge, nextBadge, tagDays, daysToNext, hasTag, earnMultiplier, allTiers } = badgeInfo;

  // Progress bar calculation
  const prevDays = currentBadge?.days_required ?? 0;
  const nextDays = nextBadge?.days_required ?? null;
  const progressPct = nextDays
    ? Math.min(100, Math.round(((tagDays - prevDays) / (nextDays - prevDays)) * 100))
    : 100;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Etiket Rozeti</p>

        {!hasTag ? (
          <p className="mt-3 text-sm text-white/50">
            Sunucu etiketini taşımıyorsunuz. Rozet sistemi için sunucu etiketini aktif etmelisiniz.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {currentBadge ? (
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                    style={{
                      backgroundColor: (currentBadge.color ?? '#5865F2') + '33',
                      border: `2px solid ${currentBadge.color ?? '#5865F2'}66`,
                    }}
                  >
                    {currentBadge.emoji ?? '🏅'}
                  </span>
                  <div>
                    <p className="text-lg font-semibold" style={{ color: currentBadge.color ?? '#a5b4fc' }}>
                      {currentBadge.name}
                    </p>
                    <p className="text-xs text-white/40">{tagDays} gündür etiket taşıyorsunuz</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-white/60">{tagDays} gündür etiket taşıyorsunuz</p>
                  <p className="text-xs text-white/30">Henüz rozet kazanmadınız</p>
                </div>
              )}

              {earnMultiplier > 1 && (
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
                  ×{earnMultiplier} kazanç çarpanı
                </span>
              )}
            </div>

            {/* Progress to next badge */}
            {nextBadge && (
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs text-white/40">
                  <span>Sonraki rozet: <span className="text-white/60">{nextBadge.emoji} {nextBadge.name}</span></span>
                  <span>{daysToNext} gün kaldı</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-white/30">{progressPct}%</p>
              </div>
            )}
            {!nextBadge && currentBadge && (
              <p className="mt-3 text-xs text-white/30">En yüksek rozete ulaştınız.</p>
            )}
          </>
        )}
      </div>

      {/* All tiers timeline */}
      {allTiers.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="mb-4 text-sm font-semibold text-white/60">Rozet Yolu</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {allTiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                unlocked={tagDays >= tier.days_required}
                isCurrent={currentBadge?.id === tier.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
