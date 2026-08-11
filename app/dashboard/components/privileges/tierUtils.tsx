'use client';

import Image from 'next/image';
import type { BadgeTier, BoosterTier } from '../../types';

export type TierLike = BadgeTier | BoosterTier;
export type TrackMode = 'tag' | 'booster';
export type TierCardState = 'locked' | 'unlocked' | 'current';

export function tierRequired(tier: TierLike, mode: TrackMode) {
  return mode === 'tag' ? (tier as BadgeTier).days_required : (tier as BoosterTier).months_required;
}

export function formatPrivilegeDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function computeProgressPct(
  progress: number,
  currentRequired: number,
  nextRequired: number | null,
) {
  if (!nextRequired || nextRequired <= currentRequired) return 100;
  return Math.min(100, Math.round(((progress - currentRequired) / (nextRequired - currentRequired)) * 100));
}

export function getTierState(
  tier: TierLike,
  mode: TrackMode,
  progress: number,
  currentTierId: string | null | undefined,
): TierCardState {
  const required = tierRequired(tier, mode);
  if (currentTierId === tier.id) return 'current';
  if (progress >= required) return 'unlocked';
  return 'locked';
}

export function EmojiText({ text }: { text: string }) {
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
              width={24}
              height={24}
              className="inline-block align-middle"
              unoptimized
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function TierIcon({
  emoji,
  fallback,
  size = 28,
}: {
  emoji: string | null;
  fallback: React.ReactNode;
  size?: number;
}) {
  if (!emoji) return <>{fallback}</>;
  if (emoji.startsWith('http')) {
    return <Image src={emoji} alt="icon" width={size} height={size} className="rounded-sm" unoptimized />;
  }
  return <EmojiText text={emoji} />;
}

export const PRIVILEGE_STORAGE_PREFIX = 'privilege_last_seen';

export type PrivilegeSeenState = {
  tagTierId: string | null;
  boosterTierId: string | null;
};

export function readPrivilegeSeen(key: string): PrivilegeSeenState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PrivilegeSeenState;
  } catch {
    return null;
  }
}

export function writePrivilegeSeen(key: string, state: PrivilegeSeenState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
