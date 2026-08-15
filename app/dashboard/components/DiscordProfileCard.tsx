'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { LuTag, LuZap, LuX } from 'react-icons/lu';
import { useLocale, useT } from '@/contexts/LocaleContext';
import type { MemberProfile, ActivePerk } from '../types';

type DiscordProfileCardProps = {
  profile: MemberProfile | null;
  loading?: boolean;
  joinedAt?: string | null;
  formatRoleColor: (color: number) => string;
  hasTag?: boolean;
  isBooster?: boolean;
  activePerks?: ActivePerk[];
};

type RoleExpiryInfo = {
  permanent: boolean;
  expiresAt: Date | null;
  appliedAt: Date | null;
  itemTitle: string | null;
  fromStore: boolean;
};

function buildRoleExpiryMap(activePerks: ActivePerk[]): Map<string, RoleExpiryInfo> {
  const map = new Map<string, RoleExpiryInfo>();

  for (const perk of activePerks) {
    if (!perk.role_id) continue;
    const permanent = !perk.expires_at;
    const expiresAt = perk.expires_at ? new Date(perk.expires_at) : null;
    const appliedAt = perk.applied_at ? new Date(perk.applied_at) : null;
    const itemTitle = perk.item_title ?? null;
    const existing = map.get(perk.role_id);

    if (!existing) {
      map.set(perk.role_id, { permanent, expiresAt, appliedAt, itemTitle, fromStore: true });
      continue;
    }

    const earliestApplied =
      appliedAt && existing.appliedAt
        ? appliedAt.getTime() < existing.appliedAt.getTime()
          ? appliedAt
          : existing.appliedAt
        : appliedAt ?? existing.appliedAt;
    const preferredTitle = existing.itemTitle || itemTitle;

    if (permanent || existing.permanent) {
      map.set(perk.role_id, {
        permanent: true,
        expiresAt: null,
        appliedAt: earliestApplied,
        itemTitle: preferredTitle,
        fromStore: true,
      });
      continue;
    }

    const existingMs = existing.expiresAt?.getTime() ?? 0;
    const nextMs = expiresAt?.getTime() ?? 0;
    map.set(perk.role_id, {
      permanent: false,
      expiresAt: nextMs > existingMs ? expiresAt : existing.expiresAt,
      appliedAt: earliestApplied,
      itemTitle: preferredTitle,
      fromStore: true,
    });
  }

  return map;
}

function resolveRoleExpiryInfo(
  roleId: string,
  roleExpiryMap: Map<string, RoleExpiryInfo>,
): RoleExpiryInfo {
  const fromStore = roleExpiryMap.get(roleId);
  if (fromStore) return fromStore;
  return {
    permanent: true,
    expiresAt: null,
    appliedAt: null,
    itemTitle: null,
    fromStore: false,
  };
}

function formatRoleCountdown(
  expiresAt: Date,
  nowMs: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const totalSeconds = Math.max(0, Math.floor((expiresAt.getTime() - nowMs) / 1000));
  if (totalSeconds <= 0) return t('tracking_expired');

  const totalDays = Math.floor(totalSeconds / 86400);
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (months > 0) parts.push(t('tracking_duration_months', { count: months }));
  if (days > 0) parts.push(t('tracking_duration_days', { count: days }));
  if (hours > 0) parts.push(t('tracking_duration_hours', { count: hours }));
  if (seconds > 0 || parts.length === 0) parts.push(t('tracking_duration_seconds', { count: seconds }));

  return parts.join(' ');
}

function formatDateTime(date: Date | null, locale: string): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RoleDetailModal({
  role,
  info,
  nowMs,
  dateLocale,
  formatRoleColor,
  onClose,
  t,
}: {
  role: { id: string; name: string; color: number };
  info: RoleExpiryInfo;
  nowMs: number;
  dateLocale: string;
  formatRoleColor: (color: number) => string;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const roleColor = role.color > 0 ? formatRoleColor(role.color) : '#99aab5';
  const isPermanent = info.permanent || !info.expiresAt;
  const countdown =
    !isPermanent && info.expiresAt ? formatRoleCountdown(info.expiresAt, nowMs, t) : null;
  const purchasedAt = formatDateTime(info.appliedAt, dateLocale);
  const endsAt = formatDateTime(info.expiresAt, dateLocale);

  const sourceLabel = info.fromStore
    ? t('discord_card_role_badge_store')
    : t('discord_card_role_badge_server');

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[4px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[280px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-[14px] bg-[#232428] shadow-[0_20px_48px_rgba(0,0,0,0.5)]"
      >
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: roleColor }} />

        <div className="px-4 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: roleColor }} />
              <span id="role-detail-title" className="truncate text-[13px] font-semibold tracking-tight text-[#f2f3f5]">
                {role.name}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#949ba4] transition hover:bg-white/[0.06] hover:text-[#dbdee1]"
              aria-label={t('discord_card_role_close')}
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 rounded-[10px] bg-[#1a1b1e] px-4 py-5 text-center">
            <p
              className="text-[22px] font-semibold tabular-nums leading-none tracking-tight"
              style={{ color: isPermanent ? '#23a55a' : roleColor }}
            >
              {isPermanent ? t('tracking_permanent') : countdown}
            </p>
            {!isPermanent && endsAt ? (
              <p className="mt-2.5 text-[11px] tabular-nums text-[#6d6f78]">{endsAt}</p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 px-0.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6d6f78]">
              {sourceLabel}
            </span>
            {info.fromStore && purchasedAt ? (
              <span className="truncate text-[11px] tabular-nums text-[#6d6f78]">{purchasedAt}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function discordCreatedAt(userId?: string): Date | null {
  if (!userId || !/^\d+$/.test(userId)) return null;
  try {
    const ms = Number((BigInt(userId) >> BigInt(22)) + BigInt(1420070400000));
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms);
  } catch {
    return null;
  }
}

function formatMemberDate(date: Date | null, locale: string): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}

function pickBannerColor(profile: MemberProfile, formatRoleColor: (c: number) => string): string {
  if (profile.bannerColor) return profile.bannerColor;
  const colored = profile.roles?.find((r) => r.color > 0);
  if (colored) return formatRoleColor(colored.color);
  return '#5865F2';
}

function ProfileCardBody({
  profile,
  joinedAt,
  formatRoleColor,
  hasTag,
  isBooster,
  activePerks = [],
  dateLocale,
  t,
}: {
  profile: MemberProfile;
  joinedAt?: string | null;
  formatRoleColor: (color: number) => string;
  hasTag: boolean;
  isBooster: boolean;
  activePerks?: ActivePerk[];
  dateLocale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  const roleExpiryMap = useMemo(() => buildRoleExpiryMap(activePerks), [activePerks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    const info = resolveRoleExpiryInfo(selectedRoleId, roleExpiryMap);
    if (info.permanent || !info.expiresAt) return;

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [roleExpiryMap, selectedRoleId]);

  useEffect(() => {
    if (!selectedRoleId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedRoleId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRoleId]);

  const displayName = profile.nickname ?? profile.displayName ?? profile.username ?? '—';
  const username = profile.username || '—';
  const bannerColor = pickBannerColor(profile, formatRoleColor);
  const discordSince = formatMemberDate(discordCreatedAt(profile.userId), dateLocale);
  const serverJoin = profile.joinedAt ?? joinedAt ?? null;
  const serverSince = formatMemberDate(serverJoin ? new Date(serverJoin) : null, dateLocale);
  const roles = (profile.roles ?? []).filter((r) => r.name !== '@everyone');
  const note = profile.about?.trim() || null;
  const selectedRole = selectedRoleId ? roles.find((r) => r.id === selectedRoleId) ?? null : null;
  const selectedInfo = selectedRoleId
    ? resolveRoleExpiryInfo(selectedRoleId, roleExpiryMap)
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="relative h-[72px]" style={{ backgroundColor: bannerColor }}>
        {profile.bannerUrl ? (
          <Image src={profile.bannerUrl} alt="" fill unoptimized className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/25" />
      </div>

      <div className="relative px-4 pb-4">
        <div className="relative -mt-[42px] mb-3 w-fit">
          <div className="relative h-[84px] w-[84px] rounded-full bg-[#111214] p-[6px]">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#1e1f22]">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/40">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span
              className="absolute bottom-1 right-1 h-[22px] w-[22px] rounded-full border-[5px] border-[#111214] bg-emerald-400"
              title={t('discord_card_online')}
            />
          </div>
        </div>

        <div className="mb-3 rounded-xl bg-[#232428] px-3.5 py-3">
          <p className="truncate text-[18px] font-bold leading-tight tracking-tight text-white">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-[#b5bac1]">{username}</p>
          {(hasTag || isBooster) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hasTag && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  <LuTag className="h-2.5 w-2.5" /> {t('overview_badge_tag')}
                </span>
              )}
              {isBooster && (
                <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/25 bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                  <LuZap className="h-2.5 w-2.5" /> {t('overview_badge_booster')}
                </span>
              )}
            </div>
          )}

          {(discordSince || serverSince) && (
            <div className="mt-3.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
                {t('discord_card_member_since')}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#dbdee1]">
                {discordSince && (
                  <span className="inline-flex items-center gap-1.5">
                    <DiscordMark className="h-3.5 w-3.5 text-[#dbdee1]" />
                    {discordSince}
                  </span>
                )}
                {discordSince && serverSince && (
                  <span className="text-[#4e5058]" aria-hidden>
                    ·
                  </span>
                )}
                {serverSince && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    {profile.guildIcon ? (
                      <Image
                        src={profile.guildIcon}
                        alt=""
                        width={14}
                        height={14}
                        unoptimized
                        className="h-3.5 w-3.5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5865F2] text-[7px] font-bold text-white">
                        {(profile.guildName ?? 'S').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{serverSince}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              {t('discord_card_roles')}
            </p>
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((role) => {
                  const color = role.color > 0 ? formatRoleColor(role.color) : '#99aab5';
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#111214]/80 px-2 py-0.5 text-left text-[11px] font-medium text-[#dbdee1] transition-colors hover:border-white/15 hover:bg-white/[0.06]"
                      title={t('discord_card_role_tap_title')}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{role.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[#949ba4]">{t('overview_no_roles')}</p>
            )}
          </div>

          <div className="mt-3.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              {t('discord_card_note')}
            </p>
            {roles.length > 0 && (
              <p className="mb-1.5 text-[11px] leading-snug text-[#949ba4]">
                {t('discord_card_roles_tap_hint')}
              </p>
            )}
            <p className={`text-[12px] leading-snug ${note ? 'text-[#dbdee1]' : 'italic text-[#6d6f78]'}`}>
              {note ?? t('discord_card_note_placeholder')}
            </p>
          </div>
        </div>
      </div>

      {mounted &&
        selectedRole &&
        selectedInfo &&
        createPortal(
          <RoleDetailModal
            role={selectedRole}
            info={selectedInfo}
            nowMs={nowMs}
            dateLocale={dateLocale}
            formatRoleColor={formatRoleColor}
            onClose={() => setSelectedRoleId(null)}
            t={t}
          />,
          document.body,
        )}
    </div>
  );
}

export default function DiscordProfileCard({
  profile,
  loading,
  joinedAt,
  formatRoleColor,
  hasTag = false,
  isBooster = false,
  activePerks = [],
}: DiscordProfileCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === 'tr' ? 'tr-TR' : locale;
  const [modalOpen, setModalOpen] = useState(false);

  type DropSide = 'left' | 'right';
  type DropPos = { side: DropSide; topPct: number };

  const DROP_POS_KEY = 'dashboard_profile_drop_pos';

  const [dropPos, setDropPos] = useState<DropPos>(() => {
    if (typeof window === 'undefined') return { side: 'left', topPct: 42 };
    try {
      const raw = window.localStorage.getItem(DROP_POS_KEY);
      if (!raw) return { side: 'left', topPct: 42 };
      const parsed = JSON.parse(raw) as Partial<DropPos>;
      const side = parsed.side === 'right' ? 'right' : 'left';
      const topPct =
        typeof parsed.topPct === 'number' && Number.isFinite(parsed.topPct)
          ? Math.min(82, Math.max(12, parsed.topPct))
          : 42;
      return { side, topPct };
    } catch {
      return { side: 'left', topPct: 42 };
    }
  });

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originTopPct: number;
    moved: boolean;
    liveSide: DropSide;
    liveTopPct: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const persistDropPos = (next: DropPos) => {
    setDropPos(next);
    try {
      window.localStorage.setItem(DROP_POS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const clampTopPct = (pct: number) => Math.min(82, Math.max(12, pct));

  const onDropPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originTopPct: dropPos.topPct,
      moved: false,
      liveSide: dropPos.side,
      liveTopPct: dropPos.topPct,
    };
    setDragging(true);
  };

  const onDropPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && dx * dx + dy * dy > 36) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    const vh = window.innerHeight || 1;
    const nextTop = clampTopPct(drag.originTopPct + (dy / vh) * 100);
    const mid = (window.innerWidth || 0) / 2;
    const nextSide: DropSide = e.clientX >= mid ? 'right' : 'left';

    drag.liveSide = nextSide;
    drag.liveTopPct = nextTop;
    setDropPos({ side: nextSide, topPct: nextTop });
  };

  const endDropDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const wasMoved = drag.moved;
    if (wasMoved) {
      persistDropPos({ side: drag.liveSide, topPct: clampTopPct(drag.liveTopPct) });
    }
    dragRef.current = null;
    setDragging(false);

    if (!wasMoved) {
      setModalOpen(true);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  if (loading) {
    return (
      <>
        <div
          className={`fixed z-40 lg:hidden ${dropPos.side === 'left' ? 'left-0' : 'right-0'}`}
          style={{ top: `${dropPos.topPct}%` }}
        >
          <div
            className={`h-14 w-14 animate-pulse border border-white/10 bg-white/10 ${
              dropPos.side === 'left' ? 'rounded-r-full border-l-0' : 'rounded-l-full border-r-0'
            }`}
          />
        </div>
        <div className="hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_8px_24px_rgba(0,0,0,0.35)] animate-pulse lg:block">
          <div className="h-[72px] bg-white/10" />
          <div className="space-y-3 px-4 pb-4 pt-12">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-16 w-full rounded-xl bg-white/[0.06]" />
            <div className="h-14 w-full rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;

  const username = profile.username || '—';

  const cardProps = {
    profile,
    joinedAt,
    formatRoleColor,
    hasTag,
    isBooster,
    activePerks,
    dateLocale,
    t,
  };

  const onLeft = dropPos.side === 'left';

  return (
    <>
      {/* Mobil — kenara yapışık sürüklenir damla */}
      <button
        type="button"
        aria-label={username}
        onPointerDown={onDropPointerDown}
        onPointerMove={onDropPointerMove}
        onPointerUp={endDropDrag}
        onPointerCancel={endDropDrag}
        className={`group fixed z-40 flex touch-none items-center border border-white/15 bg-[#111214]/92 p-1.5 backdrop-blur-md transition-[padding,background-color] lg:hidden ${
          onLeft
            ? 'left-0 rounded-r-[2rem] border-l-0 pr-2.5 shadow-[4px_0_24px_rgba(0,0,0,0.45)] hover:bg-[#16181d] hover:pr-3'
            : 'right-0 rounded-l-[2rem] border-r-0 pl-2.5 shadow-[-4px_0_24px_rgba(0,0,0,0.45)] hover:bg-[#16181d] hover:pl-3'
        } ${dragging ? 'cursor-grabbing scale-[1.03]' : 'cursor-grab'}`}
        style={{ top: `min(${dropPos.topPct}%, calc(100% - 8rem))` }}
      >
        <span className="relative block h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#1e1f22]">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="pointer-events-none h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white/40">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111214] bg-emerald-400" />
        </span>
      </button>

      {/* Masaüstü kart */}
      <div className="hidden lg:block">
        <ProfileCardBody {...cardProps} />
      </div>

      {/* Mobil modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[99980] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md lg:hidden"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[340px] animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute -right-1 -top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0b0d12] text-white/60 shadow-lg transition hover:text-white"
              aria-label="Kapat"
            >
              <LuX className="h-4 w-4" />
            </button>
            <ProfileCardBody {...cardProps} />
          </div>
        </div>
      )}
    </>
  );
}
