'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { LuHouse, LuMail, LuStore, LuSettings, LuChevronRight, LuTicket, LuSend, LuTag, LuTrendingUp, LuChartBar } from 'react-icons/lu';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import type { Notification, Section } from '../types';
import type { JSX, RefObject } from 'react';

type DashboardHeaderProps = {
  unauthorized: boolean;
  walletLoading: boolean;
  walletBalance: number;
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
    onOpenReferral?: () => void;
    onOpenEarnings?: () => void;
    menuRef: RefObject<HTMLDivElement | null>;
  };
  maintenance?: {
    siteActive: boolean;
    showIndicator: boolean;
  };
  mailUnreadCount?: number;
  onOpenLeaderboard?: () => void;
};

const RANDOM_GIFS = [
  '/gif/image.gif',
  '/gif/indir2.gif',
  '/gif/sungerbubi.gif',
  '/gif/Patickstar.gif',
  '/gif/cat.gif',
];

export default function DashboardHeader({
  unauthorized,
  walletLoading,
  walletBalance,
  loginUrl,
  navigation,
  onOpenLeaderboard,
  profile,
  server,
  mailUnreadCount = 0,
  settings,
}: DashboardHeaderProps) {
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentGif, setCurrentGif] = useState(RANDOM_GIFS[0]);
  const [fetchedIcons, setFetchedIcons] = useState<Record<string, string | null>>({});
  const fetchedIconsSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (isProfileOpen) {
      setCurrentGif(RANDOM_GIFS[Math.floor(Math.random() * RANDOM_GIFS.length)]);
    }
  }, [isProfileOpen]);

  useEffect(() => {
    if (!server?.guilds || server.guilds.length === 0) return;
    server.guilds.forEach((g) => {
      if (g.iconUrl || fetchedIconsSeenRef.current.has(g.id)) return;
      fetchedIconsSeenRef.current.add(g.id);
      void (async () => {
        try {
          const res = await fetch(`/api/discord/guild/${g.id}`);
          if (!res.ok) { setFetchedIcons(prev => ({ ...prev, [g.id]: null })); return; }
          const data = await res.json();
          setFetchedIcons(prev => ({ ...prev, [g.id]: data.icon ?? null }));
        } catch {
          setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
        }
      })();
    });
  }, [server?.guilds]);

  const navItems: Array<{ key: Section; label: string; requiresAuth?: boolean; icon: JSX.Element }> = [
    { key: 'overview', label: 'Genel', icon: <LuHouse className="h-3.5 w-3.5" /> },
    { key: 'store', label: 'Mağaza', icon: <LuStore className="h-3.5 w-3.5" /> },
    { key: 'raffles', label: 'Çekilişler', requiresAuth: true, icon: <LuTicket className="h-3.5 w-3.5" /> },
    { key: 'mail', label: 'Mesajlar', requiresAuth: true, icon: <LuMail className="h-3.5 w-3.5" /> },
  ];

  const handleNavClick = (key: Section) => {
    navigation.onNavigate(key);
  };

  return (
    <>
      {/* Focus overlay */}
      <div
        onClick={() => setIsProfileOpen(false)}
        className={`fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isProfileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* Header */}
      <header className={`md:fixed inset-x-0 top-0 flex h-16 items-center bg-[#0e1018]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 transition-all duration-200 ${
        isProfileOpen ? 'z-[9991]' : 'z-30'
      }`}>

        {/* Sol — logo */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="h-9 w-9 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <Image src="/gif/cat.gif" alt="logo" className="h-full w-full object-cover" width={36} height={36} />
          </div>
          <button
            type="button"
            className="text-white font-black text-lg tracking-tight lg:cursor-default"
            onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileMenuOpen(o => !o); }}
          >
            DiscoWeb
          </button>
        </div>

        {/* Orta — boşluk */}
        <div className="flex-1" />

        {/* Sağ — bakiye + profil */}
        <div className="flex items-center gap-2">
          {!unauthorized && (
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
              <Image src="/papel.gif" alt="Papel" width={16} height={16} className="h-4 w-4" />
              <span className="font-bold text-white tabular-nums">
                {walletLoading ? '—' : walletBalance.toFixed(2)}
              </span>
            </div>
          )}

          {!unauthorized && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
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
                  <p className="text-sm font-semibold text-white leading-tight">{profile?.username || 'Kullanıcı'}</p>
                  <p className="text-[10px] text-white/40 leading-tight">{server.data?.name || '—'}</p>
                </div>
              </button>

              {/* Profil dropdown */}
              <div
                onClick={e => e.stopPropagation()}
                className={`absolute right-0 top-14 w-[calc(100vw-24px)] sm:w-[320px] transition-all duration-300 origin-top-right ${
                  isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
                }`}
              >
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl">
                  {/* GIF header */}
                  <div className="relative h-24 overflow-hidden bg-[#5865F2]/15">
                    <Image src={currentGif} alt="" fill className="object-contain scale-110 opacity-50" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1116] via-[#0f1116]/40 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-lg font-black text-white">Merhaba, {profile?.username}!</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5">
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
                          <p className="text-[10px] text-white/35 uppercase tracking-wider">Aktif Sunucu</p>
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
                        <span className="text-sm font-medium">Hesap Ayarları</span>
                      </div>
                      <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
                    </button>

                    <button
                      type="button"
                      onClick={settings.onOpenReferral}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 text-sm">🎁</div>
                        <span className="text-sm font-medium">Davet Et & Kazan</span>
                      </div>
                      <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
                    </button>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={settings.onOpenTransfer}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuSend className="h-3.5 w-3.5" />
                        Transfer
                      </button>
                      <button
                        type="button"
                        onClick={settings.onOpenPromotions}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuTag className="h-3.5 w-3.5" />
                        Promosyon
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsProfileOpen(false); settings.onOpenEarnings?.(); }}
                        className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] py-2.5 text-xs text-emerald-400 transition hover:bg-emerald-500/15"
                      >
                        <LuTrendingUp className="h-3.5 w-3.5" />
                        Kazanç
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsProfileOpen(false); onOpenLeaderboard?.(); }}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LuChartBar className="h-3.5 w-3.5" />
                        Sıralama
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {unauthorized && (
            <DiscordAgreementButton
              href={loginUrl}
              className="rounded-full bg-[#5865F2] hover:bg-[#4752C4] px-5 py-2 text-sm font-bold text-white transition-all"
              targetBlank={false}
            >
              Giriş Yap
            </DiscordAgreementButton>
          )}
        </div>
      </header>

      {/* Mobil menü */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[9992]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-[72px] left-3 right-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl">
            {!unauthorized && profile && (
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10">
                  <Image src={profile.avatarUrl || '/gif/cat.gif'} alt="avatar" width={36} height={36} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                  <p className="text-[11px] text-white/35">@{profile.username}</p>
                </div>
                {!unauthorized && (
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs">
                    <Image src="/papel.gif" alt="" width={14} height={14} className="h-3.5 w-3.5" />
                    <span className="font-bold text-white tabular-nums">{walletLoading ? '—' : walletBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            <nav className="px-3 py-3 space-y-0.5">
              {navItems.filter(item => !item.requiresAuth || !unauthorized).map((item) => {
                const isActive = navigation.activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { handleNavClick(item.key); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isActive ? 'bg-white/12 text-white' : 'bg-white/5 text-white/40'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                    {item.key === 'mail' && mailUnreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {mailUnreadCount > 99 ? '99+' : mailUnreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
