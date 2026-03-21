'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import fetchWithCreds from '@/lib/fetchWithCreds';
import type { MemberProfile, OverviewStats, OverviewStatsExpanded } from '../types';

type LeaderboardDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  overviewStats: OverviewStats | OverviewStatsExpanded | null;
  overviewLoading?: boolean;
  profile: MemberProfile | null;
  renderPapelAmount: (value: number) => React.ReactNode;
};

export default function LeaderboardDrawer({
  isOpen,
  onClose,
  overviewStats,
  overviewLoading,
  profile,
  renderPapelAmount,
}: LeaderboardDrawerProps) {
  type LeaderboardMember = NonNullable<OverviewStatsExpanded['papelLeaderboard']>[number] & {
    userId: string;
    papel: number;
  };

  const [members, setMembers] = useState<LeaderboardMember[]>([]);
  const membersRef = useRef<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const setMembersWithRef = useCallback(
    (updater: (prev: LeaderboardMember[]) => LeaderboardMember[]) => {
      setMembers((prev) => {
        const next = updater(prev);
        membersRef.current = next;
        return next;
      });
    },
    []
  );

  const mergeMembers = useCallback((existing: LeaderboardMember[], next: LeaderboardMember[]) => {
    const map = new Map<string, LeaderboardMember>();
    [...existing, ...next].forEach((m) => {
      const current = map.get(m.userId);
      if (!current || m.papel > current.papel) {
        map.set(m.userId, m);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const byPapel = b.papel - a.papel;
      if (byPapel !== 0) return byPapel;
      return a.userId.localeCompare(b.userId);
    });
  }, []);

  const currentUserRank = (overviewStats as OverviewStatsExpanded)?.currentUserRank ?? -1;
  const currentUserInfo =
    (overviewStats as OverviewStatsExpanded)?.currentUser ??
    (profile
      ? {
          userId: profile.userId ?? '',
          avatarUrl: profile.avatarUrl ?? '',
          nickname: profile.nickname ?? null,
          displayName: profile.displayName ?? null,
          username: profile.username ?? '',
          papel: (overviewStats as OverviewStatsExpanded)?.papel ?? 0,
          isCurrentUser: true,
        }
      : null);

  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNumber: number, reset = false) => {
      setLoading(true);
      if (reset) {
        setError(null);
        setMembers([]);
        setHasMore(true);
        setPage(0);
      }

      const offset = pageNumber * pageSize;
      try {
        const res = await fetchWithCreds(`/api/member/overview?offset=${offset}&limit=${pageSize}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          setHasMore(false);
          const json = await res.json().catch(() => null);
          setError(json?.error || 'Veri alınamadı.');
          return;
        }

        const data = await res.json();
        const newMembers = (data.papelLeaderboard ?? []) as LeaderboardMember[];
        const total = typeof data.totalLeaderboardCount === 'number' ? data.totalLeaderboardCount : null;

        const merged = mergeMembers(membersRef.current, newMembers);
        setMembersWithRef(() => merged);

        const loadedCount = merged.length;
        setHasMore(total === null ? newMembers.length === pageSize : loadedCount < total);

        setPage((prev) => (reset ? 1 : prev + 1));
      } catch {
        setHasMore(false);
        setError('Veri çekilemedi. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    },
    [pageSize, mergeMembers, setMembersWithRef]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchPage(0, true);
  }, [isOpen, fetchPage]);

  if (!isOpen) return null;

  const isLoading = loading || Boolean(overviewLoading);

  const handleLoadMore = () => {
    if (loading) return;
    fetchPage(page, false);
  };

  const visibleLeaderboard = members;

  const showCurrentUserFooter =
    currentUserInfo && currentUserRank >= 0 && !members.some((m) => m.userId === currentUserInfo.userId);

  const getSafeAvatarUrl = (url: unknown, userId?: string) => {
    if (typeof url === 'string' && url.trim()) return url;
    if (typeof userId === 'string' && userId.trim()) {
      const base = Number(userId) || 0;
      return `https://cdn.discordapp.com/embed/avatars/${base % 5}.png`;
    }
    return '/gif/cat.gif';
  };

  const getDisplayName = (member: LeaderboardMember) =>
    member.nickname || member.displayName || member.username || member.userId || 'Bilinmiyor';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex h-full w-full max-w-[420px] flex-col bg-[#0b0d12]/95 border-l border-white/10 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0d12]/95 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Papel Sıralaması</p>
            <p className="text-xs text-white/50">Sunucunuzun en çok papel kazananları</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-2">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : isLoading && members.length === 0 ? (
              <p className="text-sm text-white/40">Yükleniyor...</p>
            ) : visibleLeaderboard.length > 0 ? (
              <>
                {visibleLeaderboard.map((member: LeaderboardMember, idx: number) => {
                  // Array is already globally sorted by papel desc, so rank = index + 1
                  const rank = idx + 1;
                  return (
                    <div
                      key={`${member.userId}-${rank}`}
                      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 ${
                        currentUserInfo?.userId === member.userId ? 'ring-2 ring-indigo-400' : ''
                      }`}
                    >
                      <span className="w-8 text-center font-bold text-white/80">{rank}</span>
                      <Image
                        src={getSafeAvatarUrl(member.avatarUrl, member.userId)}
                        alt={getDisplayName(member)}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <span className="text-white font-semibold">
                        {getDisplayName(member)}
                      </span>
                      <span className="ml-auto text-lg font-bold text-indigo-300">
                        {renderPapelAmount(member.papel)}
                      </span>
                    </div>
                  );
                })}

                {hasMore && (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Yükleniyor...' : 'Daha fazla göster'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-white/40">Sıralama verisi bulunamadı.</p>
            )}
          </div>
        </div>

        {showCurrentUserFooter && (
          <div className="sticky bottom-0 z-10 border-t border-white/10 bg-[#0b0d12]/95 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Senin Sıralaman</p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="w-8 text-center font-bold text-white/80">
                {currentUserRank >= 0 ? currentUserRank + 1 : '—'}
              </span>
              <Image
                src={getSafeAvatarUrl(currentUserInfo.avatarUrl, currentUserInfo.userId)}
                alt={getDisplayName(currentUserInfo as LeaderboardMember)}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-white font-semibold">
                {getDisplayName(currentUserInfo as LeaderboardMember)}
              </span>
              <span className="ml-auto text-lg font-bold text-indigo-300">
                {renderPapelAmount(currentUserInfo.papel)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
