'use client';

import React, { useState, useEffect, useRef } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';

import { LuHouse, LuMail, LuStore, LuSettings, LuChevronRight, LuSend, LuTag, LuLayoutGrid, LuShieldCheck, LuNewspaper, LuChartBar, LuTrophy, LuUserPlus, LuMonitorPlay } from 'react-icons/lu';
import { openDiscordInviteFriends } from '@/lib/discordInvite';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import type { Notification, Section } from '../types';
import type { JSX, RefObject } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { ENABLE_TAG_BADGE_SECTION } from '../featureFlags';
import SupportMenu from './SupportMenu';
import ServerTimeClock from './ServerTimeClock';
import { playMoneyInSound } from '@/lib/uiClickSound';

type DashboardHeaderProps = {
  isActivityEmbed?: boolean;
  unauthorized: boolean;
  walletLoading: boolean;
  walletBalance: number;
  mariBalance?: number;
  loginUrl: string;
  navigation: {
    activeSection: Section;
    onNavigate: (section: Section) => void;
  };
  profile: {
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  profileLoading: boolean;
  server: {
    data: { id: string; name: string; iconUrl: string | null } | null;
    loading: boolean;
    guilds: Array<{ id: string; name: string; iconUrl: string | null; isSetup: boolean }>;
    onSelectServer?: (guildId: string) => void;
  };
  notifications: {
    open: boolean;
    unreadCount: number;
    loading: boolean;
    items: Notification[];
    onToggle: () => void;
    onOpenNotification: (item: Notification) => void;
    onOpenModal?: () => void;
    menuRef: RefObject<HTMLDivElement>;
  };
  renderNotificationBody: (body: string) => React.ReactNode;
  settings: {
    open: boolean;
    onToggle: () => void;
    onOpenSettings: () => void;
    onOpenTransfer: () => void;
    onOpenPromotions: () => void;
    onOpenDiscounts: () => void;
    menuRef: RefObject<HTMLDivElement | null>;
  };
  maintenance?: {
    siteActive: boolean;
    showIndicator: boolean;
  };
  mailUnreadCount?: number;
  duyuruEveryoneUnreadCount?: number;
  onOpenLeaderboard?: () => void;
  openLink?: (url: string) => Promise<void>;
  /** Quiz arena: hide logo, wallet, support; keep profile + exit */
  minimalProfileOnly?: boolean;
  /** Mail FAB overlay: sağ üst chrome (bakiye + destek + profil) */
  mailFabOverlayRight?: boolean;
};

const PROFILE_MENU_BACKGROUNDS = [
  '/menu-background/varyant.jpg',
  '/menu-background/varyant2.jpg',
  '/menu-background/varyant3.jpg',
  '/menu-background/varyant4.jpg',
  '/menu-background/varyant5.jpg',
  '/menu-background/varyant6.jpg',
] as const;

const pickProfileMenuBackground = () =>
  PROFILE_MENU_BACKGROUNDS[Math.floor(Math.random() * PROFILE_MENU_BACKGROUNDS.length)];

function ProfileMenuHeader({
  background,
  openLink,
  section,
}: {
  background: string;
  openLink?: (url: string) => Promise<void>;
  section?: string;
}) {
  return (
    <div className="relative h-[88px] bg-[#0b0d12]">
      <div className="absolute inset-0 overflow-hidden">
        <Image src={background} alt="" fill className="object-cover opacity-70" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1116] via-[#0f1116]/80 to-black/25" />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0f1116] to-transparent" />
      </div>
      <div className="absolute bottom-3 left-4 right-14">
        <ServerTimeClock variant="banner" />
      </div>
      {openLink ? (
        <div className="absolute right-2.5 top-2.5 z-20">
          <SupportMenu openLink={openLink} section={section} />
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardHeader({
  isActivityEmbed = false,
  unauthorized,
  walletLoading,
  walletBalance,
  mariBalance,
  loginUrl,
  navigation,
  onOpenLeaderboard,
  profile,
  server,
  mailUnreadCount = 0,
  duyuruEveryoneUnreadCount = 0,
  settings,
  openLink,
  minimalProfileOnly = false,
  mailFabOverlayRight = false,
}: DashboardHeaderProps) {
  const t = useT();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileHeaderBg, setProfileHeaderBg] = useState(pickProfileMenuBackground);
  const [, setFetchedIcons] = useState<Record<string, string | null>>({});
  const fetchedIconsSeenRef = useRef<Set<string>>(new Set());
  const prevWalletBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (walletLoading || unauthorized) return;

    const prev = prevWalletBalanceRef.current;
    prevWalletBalanceRef.current = walletBalance;

    // Skip first known balance (initial load / hydration).
    if (prev === null) return;
    if (walletBalance > prev + 0.009) {
      playMoneyInSound();
    }
  }, [walletBalance, walletLoading, unauthorized]);

  const toggleProfileOpen = () => {
    if (!isProfileOpen) {
      setProfileHeaderBg(pickProfileMenuBackground());
      setInviteNotice(null);
    }
    setIsProfileOpen((prev) => !prev);
  };

  const handleInviteFriends = async () => {
    setInviteLoading(true);
    setInviteNotice(null);
    try {
      const result = await openDiscordInviteFriends({
        message: t('dashboard_invite_share_message'),
        title: t('referral_share_title'),
        description: t('referral_share_description'),
      });
      if (result.ok) {
        setInviteNotice({ type: 'success', message: t('dashboard_invite_success') });
      } else if (result.error === 'not_in_discord') {
        setInviteNotice({ type: 'error', message: t('dashboard_invite_discord_only') });
      } else if (result.error === 'cancelled') {
        setInviteNotice({ type: 'error', message: t('dashboard_invite_cancelled') });
      } else {
        setInviteNotice({ type: 'error', message: t('dashboard_invite_failed') });
      }
    } finally {
      setInviteLoading(false);
      window.setTimeout(() => setInviteNotice(null), 4000);
    }
  };

  const inviteFriendsButton = (onAfterClick?: () => void) => (
    <>
      <button
        type="button"
        disabled={inviteLoading}
        onClick={() => {
          void handleInviteFriends();
          onAfterClick?.();
        }}
        className="flex w-full items-center justify-between rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/10 px-3 py-2.5 text-white/80 transition hover:border-[#5865F2]/40 hover:bg-[#5865F2]/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5865F2]/20">
            {inviteLoading ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LuUserPlus className="h-3.5 w-3.5 text-[#5865F2]" />
            )}
          </div>
          <div className="text-left">
            <span className="text-sm font-medium">{t('dashboard_invite_friends')}</span>
            <p className="text-[10px] text-white/40">{t('dashboard_invite_friends_hint')}</p>
          </div>
        </div>
        <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
      </button>
      {inviteNotice && (
        <p
          className={`px-1 text-[11px] font-medium ${inviteNotice.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
          role="status"
        >
          {inviteNotice.message}
        </p>
      )}
    </>
  );

  const profilePromoActions = () => (
    <div className="space-y-1.5">
      {inviteFriendsButton()}
    </div>
  );

  useEffect(() => {
    if (!server?.guilds || server.guilds.length === 0) return;
    server.guilds.forEach((g) => {
      if (g.iconUrl || fetchedIconsSeenRef.current.has(g.id)) return;
      fetchedIconsSeenRef.current.add(g.id);
      void (async () => {
        try {
          const res = await fetchWithCreds(`/api/discord/guild/${g.id}`);
          if (!res.ok) { setFetchedIcons(prev => ({ ...prev, [g.id]: null })); return; }
          const data = await res.json();
          setFetchedIcons(prev => ({ ...prev, [g.id]: data.icon ?? null }));
        } catch {
          setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
        }
      })();
    });
  }, [server?.guilds]);

  const NAV_GROUPS: Array<{ label: string; requiresAuth?: boolean; items: Array<{ key: Section; label: string; icon: JSX.Element }> }> = [
    {
      label: t('nav_group_discoweb'),
      items: [
        { key: 'duyuru', label: t('nav_duyuru'), icon: <LuNewspaper className="h-4 w-4" /> },
        { key: 'watch-earn', label: t('nav_watch_earn'), icon: <LuMonitorPlay className="h-4 w-4" /> },
      ],
    },
    {
      label: t('nav_group_discover'),
      items: [
        { key: 'overview', label: t('nav_home'), icon: <LuHouse className="h-4 w-4" /> },
        { key: 'store', label: t('nav_store'), icon: <LuStore className="h-4 w-4" /> },
        ...(ENABLE_TAG_BADGE_SECTION
          ? [{ key: 'tag-badge' as Section, label: t('nav_tag_badge'), icon: <LuShieldCheck className="h-4 w-4" /> }]
          : []),
        { key: 'quiz', label: t('nav_quiz'), icon: <LuTrophy className="h-4 w-4" /> },
      ],
    },
    {
      label: t('nav_group_account'),
      requiresAuth: true,
      items: [
        { key: 'mail', label: t('nav_messages'), icon: <LuMail className="h-4 w-4" /> },
      ],
    },
  ];

  // Düz liste — bottom bar "Şu an" etiketi için
  const navItems = NAV_GROUPS.flatMap(g => g.items);

  const logoWhiteStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(105deg, #fff 0%, #fff 35%, rgba(255,255,255,0.95) 45%, #fff 55%, #fff 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };
  const logoBlueStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(105deg, #5865F2 0%, #5865F2 35%, #a5b4ff 45%, #5865F2 55%, #5865F2 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };

  const handleNavClick = (key: Section) => {
    navigation.onNavigate(key);
  };

  const exitToOverview = () => {
    setIsProfileOpen(false);
    setMobileMenuOpen(false);
    navigation.onNavigate('overview');
  };

  const profileMenuExit = (minimalProfileOnly || mailFabOverlayRight) ? (
    <button
      type="button"
      onClick={exitToOverview}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
          <LuHouse className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium">{t('dashboard_back_to_home')}</span>
      </div>
      <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
    </button>
  ) : null;

  const profileChromeHidden = '';

  if (mailFabOverlayRight) {
    const displayName = profile?.name || profile?.username || t('dashboard_user_fallback');

    return (
      <>
        <div className="relative flex min-w-0 items-center justify-end gap-1.5 pointer-events-auto">
          {!unauthorized ? (
            <button
              type="button"
              onClick={toggleProfileOpen}
              className={`flex max-w-[min(100%,11rem)] items-center gap-2 rounded-2xl border px-2.5 py-1.5 transition-all ${
                isProfileOpen
                  ? 'border-white/20 bg-white/10'
                  : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
              aria-label={displayName}
              aria-expanded={isProfileOpen}
            >
              <div
                className={`h-8 w-8 shrink-0 overflow-hidden rounded-full border transition ${
                  isProfileOpen ? 'border-[#5865F2]/50' : 'border-white/15'
                }`}
              >
                <Image
                  src={profile?.avatarUrl || '/gif/cat.gif'}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="min-w-0 truncate text-sm font-semibold leading-tight text-white">
                {displayName}
              </span>
            </button>
          ) : (
            <DiscordAgreementButton
              href={loginUrl}
              className="rounded-full bg-[#5865F2] px-3 py-1.5 text-xs font-bold text-white"
              targetBlank={false}
            >
              {t('dashboard_login_button')}
            </DiscordAgreementButton>
          )}
        </div>

        {isProfileOpen && !unauthorized && (
          <>
            <div
              className="fixed inset-0 z-[10025]"
              onClick={() => setIsProfileOpen(false)}
              aria-hidden
            />
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed right-4 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-[10030] w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              <ProfileMenuHeader
                background={profileHeaderBg}
                openLink={!minimalProfileOnly ? openLink : undefined}
                section={navigation.activeSection}
              />
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15">
                    <Image
                      src={profile?.avatarUrl || '/gif/cat.gif'}
                      alt="avatar"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    {profile?.username && profile.username !== displayName && (
                      <p className="truncate text-[11px] text-white/40">@{profile.username}</p>
                    )}
                  </div>
                </div>
                {profileMenuExit}
                {server.data && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                    {server.data.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={server.data.iconUrl} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" alt="" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">{server.data.name?.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('dashboard_active_server_label')}</p>
                      <p className="text-sm font-semibold text-white truncate">{server.data.name}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setIsProfileOpen(false); settings.onOpenSettings(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                      <LuSettings className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium">{t('dashboard_account_settings')}</span>
                  </div>
                  <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
                </button>
                {profilePromoActions()}
                <div className="grid gap-1.5 pt-1 grid-cols-3">
                  <button type="button" onClick={() => { setIsProfileOpen(false); settings.onOpenTransfer(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                    <LuSend className="h-3.5 w-3.5" />{t('dashboard_papel_transfer')}
                  </button>
                  <button type="button" onClick={() => { setIsProfileOpen(false); settings.onOpenPromotions(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                    <LuTag className="h-3.5 w-3.5" />{t('dashboard_promotions')}
                  </button>
                  <button type="button" onClick={() => { setIsProfileOpen(false); onOpenLeaderboard?.(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                    <LuChartBar className="h-3.5 w-3.5" />{t('dashboard_nav_leaderboard')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {/* Desktop: profil açıkken tam ekran karartma yok — sadece dışarı tıklamayı yakala */}
      <div
        onClick={() => setIsProfileOpen(false)}
        aria-hidden={!isProfileOpen}
        className={`hidden lg:block fixed inset-0 z-[9990] ${
          isProfileOpen ? 'visible' : 'invisible pointer-events-none'
        }`}
      />
      {/* Mobil overlay — menü/profil dropdown için */}
      <div
        onClick={() => { setIsProfileOpen(false); setMobileMenuOpen(false); }}
        className={`lg:hidden fixed inset-0 ${minimalProfileOnly ? 'z-[9990]' : 'z-[35]'} bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          (isProfileOpen || mobileMenuOpen) ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* Header — mobilde tam geniş cam bar; masaüstünde absolute full bar */}
      <header
        className={`relative z-30 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.10] shadow-[0_10px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ${
          isProfileOpen ? 'z-[9991]' : 'z-30'
        } ${
          'mx-3 mt-3 mb-1 h-12 px-3'
        } ${
          'lg:absolute lg:left-4 lg:right-4 lg:top-2 lg:mx-0 lg:mb-0 lg:mt-0 lg:h-16 lg:gap-0 lg:px-5'
        } ${
          minimalProfileOnly
            ? 'h-12 pt-[env(safe-area-inset-top,0px)] lg:h-12'
            : isActivityEmbed
              ? 'lg:h-auto lg:min-h-[4rem] lg:pb-2 lg:pt-[env(safe-area-inset-top,0px)]'
              : ''
        }`}
      >

        <style>{`@keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>

        {/* Sol — logo */}
        <div className={`${minimalProfileOnly ? 'hidden' : 'flex'} min-w-0 shrink-0 items-center ${profileChromeHidden}`}>
          <span className="font-black text-base tracking-tight leading-none lg:text-xl" style={logoWhiteStyle}>
            Disco<span style={logoBlueStyle}>Web</span>
          </span>
        </div>

        {/* Orta — kompakt ikon navigasyon (aktif olan etiketi gösterir) */}
        {!minimalProfileOnly && !unauthorized && (
          <nav
            className={`mx-3 hidden min-w-0 flex-1 items-center justify-center lg:flex ${profileChromeHidden}`}
            aria-label="Main"
          >
            <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/25 p-1 custom-scrollbar">
              {NAV_GROUPS.filter((g) => !g.requiresAuth || !unauthorized)
                .flatMap((g) => g.items)
                .map((item) => {
                  const active = navigation.activeSection === item.key;
                  const unread =
                    item.key === 'duyuru'
                      ? duyuruEveryoneUnreadCount
                      : item.key === 'mail'
                        ? mailUnreadCount
                        : 0;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => handleNavClick(item.key)}
                      className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold transition-all ${
                        active
                          ? 'bg-[#5865F2]/20 text-white shadow-[inset_0_0_0_1px_rgba(88,101,242,0.35)]'
                          : 'text-white/45 hover:bg-white/[0.06] hover:text-white/90'
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center ${active ? 'text-[#c7d2fe]' : ''}`}>
                        {item.icon}
                      </span>
                      {active && <span className="max-w-[7.5rem] truncate pr-0.5">{item.label}</span>}
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0c0e12]">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </nav>
        )}

        {/* Mobilde logo ile bakiyeler arası boşluk; masaüstünde nav zaten flex-1 */}
        <div className={`min-w-0 flex-1 ${!minimalProfileOnly && !unauthorized ? 'lg:hidden' : ''}`} />

        {/* Sağ — bakiye (mobil + masaüstü) + profil (masaüstü / quiz) */}
        <div className={`flex shrink-0 items-center gap-1.5 sm:gap-2`}>
          {!unauthorized && !minimalProfileOnly && (
            <div className={`flex items-center gap-1 sm:gap-1.5 ${profileChromeHidden}`}>
              {mariBalance !== undefined && (
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm">
                  <Image src="/Mari.gif" alt="Mari" width={16} height={16} className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" unoptimized />
                  <span className="font-bold tabular-nums text-white">
                    {walletLoading
                      ? '—'
                      : mariBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="hidden text-[11px] font-semibold text-[#a5b4ff]/75 sm:inline">Mari</span>
                </div>
              )}
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm">
                <Image src="/papel.gif" alt="Papel" width={16} height={16} className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="font-bold tabular-nums text-white">
                  {walletLoading
                    ? '—'
                    : walletBalance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
                <span className="hidden text-[11px] font-semibold text-amber-400 sm:inline">Papel</span>
              </div>
            </div>
          )}

          {/* Profil butonu — desktop; quiz modunda mobilde de üstte */}
          {!unauthorized && (
            <div className={`relative ${minimalProfileOnly ? 'block' : 'hidden lg:block'}`}>
              <button
                type="button"
                onClick={toggleProfileOpen}
                className="flex items-center gap-2 rounded-full bg-transparent p-0 transition-opacity hover:opacity-90"
                title={profile?.name || t('dashboard_user_fallback')}
              >
                <div
                  className={`h-9 w-9 overflow-hidden rounded-full border transition ${
                    isProfileOpen ? 'border-[#5865F2]/50' : 'border-white/15'
                  }`}
                >
                  <Image
                    src={profile?.avatarUrl || '/gif/cat.gif'}
                    alt="avatar"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="hidden text-left lg:block">
                  <p className="max-w-[100px] truncate text-sm font-semibold leading-tight text-white">
                    {profile?.name || t('dashboard_user_fallback')}
                  </p>
                  <p className="max-w-[120px] truncate text-[10px] leading-tight text-[#a5b4ff]/70">
                    {server.data?.name || '—'}
                  </p>
                </div>
              </button>

              {/* Profil dropdown — desktop */}
              <div
                onClick={e => e.stopPropagation()}
                className={`absolute right-0 ${minimalProfileOnly ? 'top-11' : 'top-14'} w-[min(320px,calc(100vw-2rem))] transition-all duration-300 origin-top-right ${
                  isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
                }`}
              >
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl">
                  <ProfileMenuHeader
                    background={profileHeaderBg}
                    openLink={!minimalProfileOnly ? openLink : undefined}
                    section={navigation.activeSection}
                  />

                  <div className="p-3 space-y-1.5">
                    {profileMenuExit}
                    {/* Aktif sunucu */}
                    {server.data && (
                      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                        {server.data.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={server.data.iconUrl} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" alt="" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">{server.data.name?.charAt(0)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('dashboard_active_server_label')}</p>
                          <p className="text-sm font-semibold text-white truncate">{server.data.name}</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => { setIsProfileOpen(false); settings.onOpenSettings(); }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                          <LuSettings className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-medium">{t('dashboard_account_settings')}</span>
                      </div>
                      <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
                    </button>

                    {profilePromoActions()}

                    <div className="grid gap-1.5 pt-1 grid-cols-3">
                      <button
                        type="button"
                        onClick={() => { setIsProfileOpen(false); settings.onOpenTransfer(); }}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuSend className="h-3.5 w-3.5" />
                        {t('dashboard_papel_transfer')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsProfileOpen(false); settings.onOpenPromotions(); }}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuTag className="h-3.5 w-3.5" />
                        {t('dashboard_promotions')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsProfileOpen(false); onOpenLeaderboard?.(); }}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuChartBar className="h-3.5 w-3.5" />
                        {t('dashboard_nav_leaderboard')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {unauthorized && (
            <div className="hidden lg:block">
              <DiscordAgreementButton
                href={loginUrl}
                className="rounded-full bg-[#5865F2] hover:bg-[#4752C4] px-5 py-2 text-sm font-bold text-white transition-all"
                targetBlank={false}
              >
                {t('dashboard_login_button')}
              </DiscordAgreementButton>
            </div>
          )}
        </div>
      </header>

      {/* Mobil bottom bar */}
      {!minimalProfileOnly && (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-transparent pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Sol — Menüler butonu */}
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(o => !o); setIsProfileOpen(false); }}
            className={`flex flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 backdrop-blur-md transition-all ${
              mobileMenuOpen
                ? 'border-white/20 bg-white/[0.12]'
                : 'border-white/10 bg-white/[0.08] hover:bg-white/[0.12]'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${mobileMenuOpen ? 'bg-white/15' : 'bg-white/8'}`}>
              <LuLayoutGrid className="h-3.5 w-3.5 text-white/70" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-white/35 font-medium">Şu an</span>
              <span className="text-sm font-bold text-white">
                {navItems.find(i => i.key === navigation.activeSection)?.label ?? 'Menüler'}
              </span>
            </div>
            {mailUnreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {mailUnreadCount > 9 ? '9+' : mailUnreadCount}
              </span>
            )}
          </button>

          {/* Sağ — profil butonu */}
          {!unauthorized ? (
            <button
              type="button"
              onClick={() => { toggleProfileOpen(); setMobileMenuOpen(false); }}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-md transition-all ${
                isProfileOpen
                  ? 'border-white/20 bg-white/[0.12]'
                  : 'border-white/10 bg-white/[0.08] hover:bg-white/[0.12]'
              }`}
            >
              <div className="h-7 w-7 overflow-hidden rounded-xl border border-white/15 flex-shrink-0">
                <Image
                  src={profile?.avatarUrl || '/gif/cat.gif'}
                  alt="avatar"
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] text-white/35 font-medium">Profil</span>
                <span className="text-sm font-bold text-white max-w-[80px] truncate">{profile?.username || '—'}</span>
              </div>
            </button>
          ) : (
            <DiscordAgreementButton
              href={loginUrl}
              className="rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2 text-sm font-bold text-white transition-all"
              targetBlank={false}
            >
              {t('dashboard_login_button')}
            </DiscordAgreementButton>
          )}
        </div>

        {/* Nav menüsü — yukarı açılır */}
        {mobileMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 z-50 max-h-[70vh] overflow-hidden overflow-y-auto rounded-2xl border border-white/15 bg-white/[0.10] shadow-2xl backdrop-blur-xl">
            {/* Bakiye satırı */}
            {!unauthorized && (
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                {mariBalance !== undefined && (
                  <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm">
                    <Image src="/Mari.gif" alt="Mari" width={16} height={16} className="h-4 w-4 shrink-0" unoptimized />
                    <span className="font-bold text-white tabular-nums">{walletLoading ? '—' : mariBalance.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                    <span className="ml-auto text-[10px] font-semibold text-[#a5b4ff]/75">Mari</span>
                  </div>
                )}
                <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm">
                  <Image src="/papel.gif" alt="Papel" width={16} height={16} className="h-4 w-4 shrink-0" />
                  <span className="font-bold text-white tabular-nums">{walletLoading ? '—' : walletBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="ml-auto text-[10px] font-semibold text-amber-400">Papel</span>
                </div>
              </div>
            )}
            <div className="px-2 pb-2 space-y-3">
              {NAV_GROUPS.filter(g => !g.requiresAuth || !unauthorized).map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = navigation.activeSection === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => { handleNavClick(item.key); setMobileMenuOpen(false); }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className={isActive ? 'text-white' : 'text-white/40'}>{item.icon}</span>
                          <span>{item.label}</span>
                          {isActive
                            && !(item.key === 'mail' && mailUnreadCount > 0)
                            && !(item.key === 'duyuru' && duyuruEveryoneUnreadCount > 0)
                            && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                          {item.key === 'mail' && mailUnreadCount > 0 && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                              {mailUnreadCount > 9 ? '9+' : mailUnreadCount}
                            </span>
                          )}
                          {item.key === 'duyuru' && duyuruEveryoneUnreadCount > 0 && (
                            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                              {duyuruEveryoneUnreadCount > 9 ? '9+' : duyuruEveryoneUnreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profil dropdown — yukarı açılır (mobil) */}
        {isProfileOpen && !unauthorized && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute bottom-full right-2 left-2 mb-1 z-50 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.10] shadow-2xl backdrop-blur-xl"
          >
            <ProfileMenuHeader
              background={profileHeaderBg}
              openLink={!minimalProfileOnly ? openLink : undefined}
              section={navigation.activeSection}
            />

            <div className="p-3 space-y-1.5">
              {profileMenuExit}
              {server.data && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  {server.data.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={server.data.iconUrl} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">{server.data.name?.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('dashboard_active_server_label')}</p>
                    <p className="text-sm font-semibold text-white truncate">{server.data.name}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              )}

              <button
                type="button"
                onClick={() => { setIsProfileOpen(false); settings.onOpenSettings(); }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                    <LuSettings className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{t('dashboard_account_settings')}</span>
                </div>
                <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
              </button>

              {profilePromoActions()}

              <div className="grid gap-1.5 pt-1 grid-cols-3">
                <button type="button" onClick={() => { setIsProfileOpen(false); settings.onOpenTransfer(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                  <LuSend className="h-3.5 w-3.5" />{t('dashboard_papel_transfer')}
                </button>
                <button type="button" onClick={() => { setIsProfileOpen(false); settings.onOpenPromotions(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                  <LuTag className="h-3.5 w-3.5" />{t('dashboard_promotions')}
                </button>
                <button type="button" onClick={() => { setIsProfileOpen(false); onOpenLeaderboard?.(); }} className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                  <LuChartBar className="h-3.5 w-3.5" />{t('dashboard_nav_leaderboard')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
}
