'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BadgeInfo, OverviewStats, OverviewStatsExpanded } from '../types';
import { useT } from '@/contexts/LocaleContext';
import PrivilegePassportHero from './privileges/PrivilegePassportHero';
import PrivilegeTrack from './privileges/PrivilegeTrack';
import PrivilegeUnlockModal from './privileges/PrivilegeUnlockModal';
import PrivilegeShareCardModal from './privileges/PrivilegeShareCardModal';
import {
  PRIVILEGE_STORAGE_PREFIX,
  readPrivilegeSeen,
  writePrivilegeSeen,
  type TierLike,
  type TrackMode,
} from './privileges/tierUtils';

type Props = {
  badgeInfo: BadgeInfo | null;
  loading: boolean;
  overviewStats?: OverviewStats | OverviewStatsExpanded | null;
  userId?: string | null;
  guildId?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
};

function PrivilegesLoadingSkeleton() {
  return (
    <section className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.04]" />
      <div className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
      </div>
    </section>
  );
}

export default function TagBadgeSection({
  badgeInfo,
  loading,
  overviewStats,
  userId,
  guildId,
  displayName = 'User',
  avatarUrl,
}: Props) {
  const t = useT();
  const expanded = overviewStats as OverviewStatsExpanded | null | undefined;

  const [shareOpen, setShareOpen] = useState(false);
  const [unlockModal, setUnlockModal] = useState<{ tier: TierLike; mode: TrackMode } | null>(null);

  const isBooster = expanded?.isBooster ?? badgeInfo?.isBooster ?? false;
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

  const combinedMessageBonus = tagBonusMessage + boosterBonusMessage;
  const combinedVoiceBonus = tagBonusVoice + boosterBonusVoice;
  const combinedMultiplier = useMemo(
    () => Number((earnMultiplier * boosterEarnMultiplier).toFixed(2)),
    [earnMultiplier, boosterEarnMultiplier],
  );

  const storageKey = userId && guildId ? `${PRIVILEGE_STORAGE_PREFIX}_${userId}_${guildId}` : null;

  useEffect(() => {
    if (!storageKey || !badgeInfo || loading) return;

    const seen = readPrivilegeSeen(storageKey);
    const currentTagId = currentBadge?.id ?? null;
    const currentBoostId = currentBoosterBadge?.id ?? null;

    if (!seen) {
      writePrivilegeSeen(storageKey, { tagTierId: currentTagId, boosterTierId: currentBoostId });
      return;
    }

    if (currentTagId && seen.tagTierId && currentTagId !== seen.tagTierId && currentBadge) {
      setUnlockModal({ tier: currentBadge, mode: 'tag' });
    } else if (currentBoostId && seen.boosterTierId && currentBoostId !== seen.boosterTierId && currentBoosterBadge) {
      setUnlockModal({ tier: currentBoosterBadge, mode: 'booster' });
    }

    writePrivilegeSeen(storageKey, { tagTierId: currentTagId, boosterTierId: currentBoostId });
  }, [storageKey, badgeInfo, loading, currentBadge, currentBoosterBadge]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <PrivilegesLoadingSkeleton />;

  return (
    <>
      <section className="flex flex-col gap-5 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-white">{t('badge_title')}</h1>
          <p className="mt-1 text-sm text-white/40">{t('badge_subtitle')}</p>
        </header>

        <PrivilegePassportHero
          hasTag={hasTag}
          isBooster={isBooster}
          currentBadge={currentBadge}
          currentBoosterBadge={currentBoosterBadge}
          nextBadge={nextBadge}
          nextBoosterBadge={nextBoosterBadge}
          tagDays={tagDays}
          boosterMonths={boosterMonths}
          daysToNext={daysToNext}
          monthsToNext={monthsToNext}
          earnMultiplier={earnMultiplier}
          boosterEarnMultiplier={boosterEarnMultiplier}
          combinedMessageBonus={combinedMessageBonus}
          combinedVoiceBonus={combinedVoiceBonus}
          combinedMultiplier={combinedMultiplier}
          tagGrantedAt={tagGrantedAt}
          boosterSince={boosterSince}
          onShowCard={() => setShareOpen(true)}
          onScrollToTag={() => scrollTo('privilege-track-tag')}
          onScrollToBooster={() => scrollTo('privilege-track-booster')}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <PrivilegeTrack
            id="privilege-track-tag"
            mode="tag"
            tiers={allTiers}
            progress={tagDays}
            currentTier={currentBadge}
            nextTier={nextBadge}
            remaining={daysToNext}
            active={hasTag}
            accent="#818cf8"
          />
          <PrivilegeTrack
            id="privilege-track-booster"
            mode="booster"
            tiers={allBoosterTiers}
            progress={boosterMonths}
            currentTier={currentBoosterBadge}
            nextTier={nextBoosterBadge}
            remaining={monthsToNext}
            active={isBooster}
            accent="#f472b6"
          />
        </div>
      </section>

      <PrivilegeShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        hasTag={hasTag}
        isBooster={isBooster}
        currentBadge={currentBadge}
        currentBoosterBadge={currentBoosterBadge}
        combinedMessageBonus={combinedMessageBonus}
        combinedVoiceBonus={combinedVoiceBonus}
        combinedMultiplier={combinedMultiplier}
        tagDays={tagDays}
        boosterMonths={boosterMonths}
      />

      {unlockModal && (
        <PrivilegeUnlockModal
          tier={unlockModal.tier}
          mode={unlockModal.mode}
          onClose={() => setUnlockModal(null)}
        />
      )}
    </>
  );
}
