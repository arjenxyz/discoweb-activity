'use client';

import React, { useState, useEffect, useRef } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';

import { LuHouse, LuMail, LuStore, LuSettings, LuChevronRight, LuSend, LuTag, LuCompass, LuLayoutGrid, LuShieldCheck, LuNewspaper, LuChartBar, LuTrophy, LuUserPlus, LuPalette } from 'react-icons/lu';
import { openDiscordInviteFriends } from '@/lib/discordInvite';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import type { Notification, Section } from '../types';
import type { JSX, RefObject } from 'react';
import { useT } from '@/contexts/LocaleContext';
import SupportMenu from './SupportMenu';
import ServerTimeClock from './ServerTimeClock';

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
};

const RANDOM_GIFS = [
  '/gif/image.gif',
  '/gif/indir2.gif',
  '/gif/sungerbubi.gif',
  '/gif/Patickstar.gif',
  '/gif/cat.gif',
];

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
}: DashboardHeaderProps) {
  const t = useT();
  const getRandomGif = () => RANDOM_GIFS[Math.floor(Math.random() * RANDOM_GIFS.length)];

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentGif, setCurrentGif] = useState(getRandomGif);
  const [, setFetchedIcons] = useState<Record<string, string | null>>({});
  const fetchedIconsSeenRef = useRef<Set<string>>(new Set());

  const toggleProfileOpen = () => {
    if (!isProfileOpen) {
      setCurrentGif(getRandomGif());
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
      ],
    },
    {
      label: t('nav_group_discover'),
      items: [
        { key: 'overview', label: t('nav_home'), icon: <LuHouse className="h-4 w-4" /> },
        { key: 'store', label: t('nav_store'), icon: <LuStore className="h-4 w-4" /> },
        { key: 'tag-badge', label: t('nav_tag_badge'), icon: <LuShieldCheck className="h-4 w-4" /> },
        { key: 'quiz', label: t('nav_quiz'), icon: <LuTrophy className="h-4 w-4" /> },
        { key: 'discover', label: t('nav_community'), icon: <LuCompass className="h-4 w-4" /> },
      ],
    },
    {
      label: t('nav_group_account'),
      requiresAuth: true,
      items: [
        { key: 'custom-role', label: t('nav_custom_role'), icon: <LuPalette className="h-4 w-4" /> },
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

  const profileMenuExit = minimalProfileOnly ? (
    <button
      type="button"
      onClick={exitToOverview}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
          <LuHouse className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium">Ana sayfaya dön</span>
      </div>
      <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
    </button>
  ) : null;

  return (
    <>
      {/* Desktop overlay — sadece masaüstü profil dropdown için */}
      <div
        onClick={() => setIsProfileOpen(false)}
        className={`hidden lg:block fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isProfileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />
      {/* Mobil overlay — menü/profil dropdown için, modalların altında kalır */}
      <div
        onClick={() => { setIsProfileOpen(false); setMobileMenuOpen(false); }}
        className={`lg:hidden fixed inset-0 ${minimalProfileOnly ? 'z-[9990]' : 'z-[35]'} bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          (isProfileOpen || mobileMenuOpen) ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* Header — desktop full / mobile sadece bakiye */}
      <header className={`md:fixed inset-x-0 top-0 flex items-center bg-[#0e1018]/95 backdrop-blur-xl px-4 sm:px-6 transition-all duration-200 relative ${
        minimalProfileOnly ? '' : 'border-b border-white/[0.06]'
      } ${
        minimalProfileOnly
          ? 'h-12 pt-[env(safe-area-inset-top,0px)]'
          : isActivityEmbed
            ? 'h-auto pt-[env(safe-area-inset-top,0px)] pb-2 min-h-[4rem]'
            : 'h-16'
      } ${isProfileOpen ? 'z-[9991]' : 'z-30'}`}>

        <style>{`@keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>

        {/* Sol — logo (sadece desktop) */}
        <div className={`${minimalProfileOnly ? 'hidden' : 'hidden lg:flex'} items-center gap-1.5 min-w-fit ml-2`}>
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-xl sm:text-2xl tracking-tight leading-none" style={logoWhiteStyle}>
              Disco<span style={logoBlueStyle}>Web</span>
            </span>
          </div>
        </div>

        {/* Mobil orta — logo + DiscoWeb yazısı birlikte */}
        <div className={`${minimalProfileOnly ? 'hidden' : 'lg:hidden absolute left-1/2 -translate-x-1/2'} flex items-center gap-1 pointer-events-none`}>
          <div className="flex flex-col gap-0.5 items-center">
            <span className="font-black text-xl tracking-tight leading-none" style={logoWhiteStyle}>
              Disco<span style={logoBlueStyle}>Web</span>
            </span>
          </div>
        </div>

        {/* Orta — boşluk */}
        <div className="flex-1" />

        {/* Sağ — bakiye + profil */}
        <div className="flex items-center gap-2">
          {!unauthorized && !minimalProfileOnly && (
            <div className="hidden lg:flex items-end gap-1.5">
              {mariBalance !== undefined && (
                <div className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm">
                  <Image src="/Mari.gif" alt="Mari" width={16} height={16} className="h-4 w-4" unoptimized />
                  <span className="font-bold text-violet-200 tabular-nums">
                    {walletLoading ? '—' : mariBalance.toFixed(3)}
                  </span>
                  <span className="mb-[1px] text-[11px] font-semibold text-violet-300">Mari</span>
                </div>
              )}
              {/* Papel bakiye */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                <Image src="/papel.gif" alt="Papel" width={16} height={16} className="h-4 w-4" />
                <span className="font-bold text-white tabular-nums">
                  {walletLoading ? '—' : walletBalance.toFixed(2)}
                </span>
                <span className="mb-[1px] text-[11px] font-semibold text-white/85">Papel</span>
              </div>
            </div>
          )}

          {openLink && !minimalProfileOnly && (
            <SupportMenu openLink={openLink} section={navigation.activeSection} />
          )}

          {/* Profil butonu — desktop; quiz modunda mobilde de üstte */}
          {!unauthorized && (
            <div className={`relative ${minimalProfileOnly ? 'block' : 'hidden lg:block'}`}>
              <button
                type="button"
                onClick={toggleProfileOpen}
                className={`flex items-center gap-2 rounded-full border p-1 pr-3 transition-all ${
                  isProfileOpen ? 'border-white/20 bg-white/10' : 'border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10">
                  <Image
                    src={profile?.avatarUrl || '/gif/cat.gif'}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-white leading-tight">{profile?.username || t('dashboard_user_fallback')}</p>
                  <p className="text-[10px] text-white/40 leading-tight">{server.data?.name || '—'}</p>
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
                  {/* GIF header */}
                  <div className="relative h-24 overflow-hidden bg-[#5865F2]/15">
                    <Image src={currentGif} alt="" fill className="object-contain scale-110 opacity-50" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1116] via-[#0f1116]/40 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <p className="text-lg font-black text-white">{t('dashboard_hello_user', { username: profile?.username ?? '' })}</p>
                      <ServerTimeClock className="mt-1.5" />
                    </div>
                  </div>

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
                      onClick={settings.onOpenSettings}
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
                        onClick={settings.onOpenTransfer}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuSend className="h-3.5 w-3.5" />
                        {t('dashboard_papel_transfer')}
                      </button>
                      <button
                        type="button"
                        onClick={settings.onOpenPromotions}
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
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b0d12]/98 backdrop-blur-2xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Sol — Menüler butonu */}
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(o => !o); setIsProfileOpen(false); }}
            className={`flex flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 transition-all ${
              mobileMenuOpen ? 'bg-white/10 border border-white/15' : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]'
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
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all ${
                isProfileOpen ? 'border-white/20 bg-white/10' : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]'
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
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 z-50 rounded-2xl border border-white/10 bg-[#0f1116]/98 backdrop-blur-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
            {/* Bakiye satırı */}
            {!unauthorized && (
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                {mariBalance !== undefined && (
                  <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-sm">
                    <Image src="/Mari.gif" alt="Mari" width={16} height={16} className="h-4 w-4" unoptimized />
                    <span className="font-bold text-violet-200 tabular-nums">{walletLoading ? '—' : mariBalance.toFixed(3)}</span>
                    <span className="text-[10px] font-semibold text-violet-300 ml-auto">Mari</span>
                  </div>
                )}
                <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <Image src="/papel.gif" alt="Papel" width={16} height={16} className="h-4 w-4" />
                  <span className="font-bold text-white tabular-nums">{walletLoading ? '—' : walletBalance.toFixed(2)}</span>
                  <span className="text-[10px] font-semibold text-white ml-auto">Papel</span>
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
            className="absolute bottom-full right-2 left-2 mb-1 z-50 rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl overflow-hidden"
          >
            {/* GIF header */}
            <div className="relative h-24 overflow-hidden bg-[#5865F2]/15">
              <Image src={currentGif} alt="" fill className="object-contain scale-110 opacity-50" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1116] via-[#0f1116]/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-lg font-black text-white">{t('dashboard_hello_user', { username: profile?.username ?? '' })}</p>
                <ServerTimeClock className="mt-1.5" />
              </div>
            </div>

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
