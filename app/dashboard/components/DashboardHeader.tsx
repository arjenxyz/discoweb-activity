'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';

import { LuHouse, LuMail, LuStore, LuLogOut, LuSettings, LuChevronRight, LuChartBar } from 'react-icons/lu';
import Image from 'next/image';
import DiscordAgreementButton from '@/components/DiscordAgreementButton';
import { LuCode } from 'react-icons/lu';
import type { Notification, Section } from '../types';
import type { JSX, RefObject } from 'react';


type DashboardHeaderProps = {
  unauthorized: boolean;
  walletLoading: boolean;
  walletBalance: number;
  loginUrl: string;
  isDeveloper: boolean;
  isAdmin: boolean;
  navigation: {
    activeSection: Section;
    onNavigate: (section: Section) => void;
  };
  leaderboardOpen?: boolean;
  onOpenLeaderboard?: () => void;
  profile: {
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  profileLoading: boolean;
  server: {
    data: { id: string; name: string; iconUrl: string | null } | null;
    loading: boolean;
    guilds: Array<{ id: string; name: string; iconUrl: string | null; isAdmin: boolean; isSetup: boolean }>;
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
    logoutHref: string;
    menuRef: RefObject<HTMLDivElement | null>;
  };
  maintenance?: {
    siteActive: boolean;
    showIndicator: boolean;
  };
  mailUnreadCount?: number;
};

// Rastgele GIF Listesi
const RANDOM_GIFS = [
  '/gif/image.gif',
  '/gif/indir2.gif',
  '/gif/sungerbubi.gif',
  '/gif/Patickstar.gif',
  '/gif/cat.gif'
];

// Çıkış yapıldığında çerezleri ve localStorage'ı temizle
const handleLogout = async () => {
  try {
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        try {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        } catch {
          // ignore
        }
      });
    }

    localStorage.clear();
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  } catch {
    localStorage.clear();
    window.location.href = '/';
  }
};

export default function DashboardHeader({
  unauthorized,
  walletLoading,
  walletBalance,
  loginUrl,
  isDeveloper,
  isAdmin,
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
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [fetchedIcons, setFetchedIcons] = useState<Record<string, string | null>>({});
  const fetchedIconsSeenRef = useRef<Set<string>>(new Set());

  // Mobile menu body overflow lock
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Menü açıldığında GIF seç
  useEffect(() => {
    if (isProfileOpen) {
      const randomIndex = Math.floor(Math.random() * RANDOM_GIFS.length);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentGif(RANDOM_GIFS[randomIndex]);
    }
  }, [isProfileOpen]);

  // Fetch missing guild icons from server-side Discord route when available
  useEffect(() => {
    if (!server?.guilds || server.guilds.length === 0) return;

    server.guilds.forEach((g) => {
      if (g.iconUrl || fetchedIconsSeenRef.current.has(g.id)) return; // already fetched or provided
      fetchedIconsSeenRef.current.add(g.id);
      void (async () => {
        try {
          const res = await fetch(`/api/discord/guild/${g.id}`);
          if (!res.ok) {
            setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
            return;
          }
          const data = await res.json();
          setFetchedIcons(prev => ({ ...prev, [g.id]: data.icon ?? null }));
        } catch {
          setFetchedIcons(prev => ({ ...prev, [g.id]: null }));
        }
      })();
    });
  }, [server?.guilds]);

  const navItems: Array<{ key: Section; label: string; requiresAuth?: boolean; requiresDeveloper?: boolean; icon: JSX.Element }> = [
    { key: 'overview', label: 'Genel', icon: <LuHouse className="h-4 w-4" /> },
    { key: 'store', label: 'Mağaza', icon: <LuStore className="h-4 w-4" /> },
    { key: 'mail', label: 'Mail', requiresAuth: true, icon: <LuMail className="h-4 w-4" /> },
    { key: 'leaderboard', label: 'Sıralama', requiresAuth: true, icon: <LuChartBar className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* --- FOCUS OVERLAY --- */}
      <div 
        onClick={() => {
          setIsProfileOpen(false);
        }}
        className={`fixed inset-0 bg-black/60 backdrop-blur-[12px] transition-all duration-500 z-[9990] ${
          isProfileOpen ? 'opacity-100 visible cursor-pointer' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* --- HEADER --- */}
      <header className={`fixed inset-x-0 top-0 flex h-20 items-center gap-4 bg-[#0b0d12]/90 px-3 sm:px-6 backdrop-blur border-b border-white/5 shadow-lg overflow-visible transition-all duration-200 ${
        isProfileOpen ? 'z-[9991]' : 'z-30'
      }`}>
        
        {/* --- SOL TARAF --- */}
        <div className="flex items-center gap-3 min-w-fit">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] p-0.5 shadow-lg shadow-[#5865F2]/20 group cursor-pointer transition-transform hover:scale-110 relative z-50">
              <div className="w-full h-full bg-[#1e1f22] rounded-[10px] overflow-hidden">
                <Image src="/gif/cat.gif" alt="avatar" className="w-full h-full object-cover" width={500} height={500} />
              </div>
            </div>

            <div
              className="relative flex flex-col items-start gap-1 cursor-pointer lg:cursor-default h-full group"
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
              onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileMenuOpen(open => !open); }}
            >
              <div className="text-white font-black text-xl tracking-tight z-50 relative">DiscoWeb</div>
              <span className="text-[10px] text-white/50 lg:hidden">Tıklayın</span>

              {/* Sarkan Penguen */}
              <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 z-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                isLogoHovered 
                  ? 'opacity-100 translate-y-0 rotate-0' 
                  : 'opacity-0 -translate-y-12 -rotate-12 pointer-events-none'
              }`}>
                <div className="w-[200px] md:w-[280px] drop-shadow-2xl filter brightness-110">
                  <Image src="/gif/asılıpengu.gif" alt="Hanging Penguin" className="w-full h-full object-contain" width={500} height={500} />
                </div>
              </div>
            </div>

            {/* Panel geçişi profil dropdown'unda */}
        </div>

        {/* --- ORTA MENÜ --- */}
        <div className="flex-1 flex items-center justify-center">
            <nav className="hidden lg:flex items-center gap-1">
                {navItems
                .filter((item) => (!item.requiresAuth || !unauthorized))
                .map((item) => (
                    <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'mail') {
                        navigation.onNavigate('mail');
                        try { router.push('/dashboard/mail'); } catch { navigation.onNavigate('mail'); }
                        return;
                      }
                      if (item.key === 'leaderboard') {
                        onOpenLeaderboard?.();
                        return;
                      }

                      navigation.onNavigate(item.key);
                    }}
                    className={`group relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        (item.key === 'leaderboard'
                          ? navigation.activeSection === 'overview'
                          : navigation.activeSection === item.key)
                        ? 'bg-white/10 text-white shadow-inner'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    >
                    <span className="flex items-center gap-2 relative z-10">
                        {item.icon}
                        {item.label}
                    </span>
                    {item.key === 'mail' && mailUnreadCount > 0 && (
                      <span
                        title={`${mailUnreadCount} okunmamış mesaj`}
                        aria-label={`${mailUnreadCount} unread mails`}
                        className={`absolute -top-1 -right-2 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-1 ring-white/10 shadow-sm select-none ${
                          mailUnreadCount > 99 ? 'px-2 h-5 min-w-[26px]' : mailUnreadCount > 9 ? 'px-2 h-5 min-w-[22px]' : 'w-5 h-5'
                        }`}
                      >
                        {mailUnreadCount > 99 ? '99+' : mailUnreadCount}
                      </span>
                    )}
                    </button>
                ))}
            </nav>
        </div>

        {/* --- SAĞ TARAF --- */}
        <div className="flex items-center gap-2 sm:gap-3">

            {!unauthorized && (
            <div className="flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 shadow-sm gap-2 text-xs sm:text-sm transition-transform hover:scale-105">
                <Image src="/papel.gif" alt="Papel" width={20} height={20} className="h-5 w-5" />
                <span className="font-bold text-emerald-400">
                    {walletLoading ? '...' : walletBalance.toFixed(2)}
                </span>
            </div>
            )}

            {/* Sunucu seçimi navbar'dan kaldırıldı, sadece profil dropdown'da mevcut */}

            {/* --- PROFİL ALANI (GELİŞMİŞ MENÜ) --- */}
            {!unauthorized && (
                <div className="relative">
                    
                    {/* Profil Tetikleyici */}
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`flex items-center gap-3 cursor-pointer p-1 rounded-full border transition-all outline-none ${
                            isProfileOpen 
                                ? 'bg-white/10 border-white/20' 
                                : 'border-transparent hover:border-white/10'
                        }`}
                    >
                        <div className="text-right hidden lg:block">
                            <div className="text-sm font-bold text-white">{profile?.username || 'Kullanıcı'}</div>
                            <div className="text-[10px] text-white/50">{server.data?.name || 'Sunucu Seçilmedi'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-[#5865F2] overflow-hidden shadow-[0_0_15px_rgba(88,101,242,0.4)]">
                            <Image 
                                src={profile?.avatarUrl || '/gif/cat.gif'} 
                                alt="Profile" 
                                width={40} 
                                height={40}
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    </button>

                    {/* --- SAĞA AÇILAN KUTU (ANA KAPLAYICI) --- */}
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-20 right-0 w-[calc(100vw-24px)] sm:w-[340px] transition-all duration-300 origin-right ${
                            isProfileOpen 
                                ? 'opacity-100 translate-x-0 scale-100 visible' 
                                : 'opacity-0 translate-x-10 scale-95 invisible'
                    }`}>
                        <div className="bg-[#1e1f22] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden relative min-h-[400px]">
                            
                            {/* --- HEADER (GIF & BAŞLIK) --- */}
                            <div className="relative h-28 bg-[#5865F2]/20 w-full overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 opacity-60">
                                    <Image 
                                        src={currentGif} 
                                        alt="Random Fun" 
                                        fill 
                                        className="object-contain scale-125"
                                        unoptimized
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1f22] via-[#1e1f22]/50 to-transparent"></div>
                                
                                <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between">
                                    <div>
                                      <p className="text-white font-bold text-xl drop-shadow-md">Merhaba, {profile?.username}!</p>
                                    </div>
                                </div>
                            </div>

                            {/* --- İÇERİK DEĞİŞİM ALANI --- */}
                            <div className="p-3">
                                
                                {/* 1. GÖRÜNÜM: ANA MENÜ */}
                                <div className="space-y-2 transition-all duration-300">
                                    
                                    {/* Mevcut Sunucu Bilgisi */}
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                                        {server.data?.iconUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={server.data.iconUrl} width={40} height={40} className="rounded-lg object-cover" alt="Server" loading="lazy" />
                                      ) : (
                                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold">{server.data?.name?.charAt(0)}</div>
                                       )}
                                       <div className="flex-1 overflow-hidden">
                                          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Aktif Sunucu</p>
                                          <p className="text-white font-semibold truncate">{server.data?.name || 'Seçilmedi'}</p>
                                       </div>
                                    </div>

                                    {/* Menü Linkleri */}

                                    <button
                                        onClick={settings.onOpenSettings}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                <LuSettings className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-white/80 group-hover:text-white">Hesap Ayarları</span>
                                        </div>
                                        <LuChevronRight className="text-white/40" />
                                    </button>

                                    {/* Diğer Kısayollar */}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                       <button onClick={settings.onOpenTransfer} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-center text-white/70 hover:text-white transition-colors">
                                          Papel Transfer
                                       </button>
                                       <button onClick={settings.onOpenPromotions} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-center text-white/70 hover:text-white transition-colors">
                                          Promosyonlar
                                       </button>
                                    </div>

                                </div>


                            </div>

                            {/* Footer */}
                            <div className="bg-black/20 p-3 border-t border-white/5 mt-auto">
                              <button
                                onClick={() => { setIsProfileOpen(false); window.location.href = '/'; }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
                              >
                                <LuLogOut className="w-3.5 h-3.5" />
                                Çıkış Yap
                              </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {unauthorized ? (
            <DiscordAgreementButton
                href={loginUrl}
                className="rounded-full bg-[#5865F2] hover:bg-[#4752C4] px-6 py-2 text-sm font-bold text-white transition-all shadow-lg hover:shadow-[#5865F2]/40"
                targetBlank={false}
            >
                Giriş Yap
            </DiscordAgreementButton>
            ) : null}

        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[9992]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-20 left-3 right-3 bg-[#13151a]/98 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">

            {/* Profil & Sunucu Bilgi Alanı */}
            {!unauthorized && (
              <div className="px-4 pt-4 pb-2 space-y-3">
                {/* Profil Kartı */}
                {profile && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5865F2]/10 via-white/[0.03] to-transparent border border-white/[0.06] p-3.5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#5865F2]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="relative flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#5865F2]/30 ring-offset-2 ring-offset-[#13151a]">
                          <Image src={profile.avatarUrl || '/gif/cat.gif'} alt="Profile" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#13151a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-[13px] truncate leading-tight">{profile.name}</p>
                        <p className="text-white/35 text-[11px] truncate">@{profile.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                        <Image src="/papel.gif" alt="Papel" width={14} height={14} className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                          {walletLoading ? '...' : walletBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aktif Sunucu */}
                {server.data && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    {server.data.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={server.data.iconUrl} width={28} height={28} className="rounded-lg object-cover" alt="Server" loading="lazy" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#5865F2]/15 flex items-center justify-center font-bold text-xs text-white/80">{server.data.name?.charAt(0)}</div>
                    )}
                    <p className="text-white/60 text-xs font-medium truncate flex-1">{server.data.name}</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {/* Ayırıcı */}
            {!unauthorized && <div className="mx-4 border-t border-white/[0.06]" />}

            {/* Navigasyon */}
            <nav className="px-4 py-3 space-y-1">
              {navItems
                .filter((item) => (!item.requiresAuth || !unauthorized) && (!item.requiresDeveloper || isDeveloper))
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'mail') {
                        navigation.onNavigate('mail');
                        try { router.push('/dashboard/mail'); } catch { navigation.onNavigate('mail'); }
                      } else if (item.key === 'leaderboard') {
                        onOpenLeaderboard?.();
                      } else {
                        navigation.onNavigate(item.key);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      navigation.activeSection === item.key
                        ? 'bg-[#5865F2]/15 text-white border border-[#5865F2]/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      navigation.activeSection === item.key ? 'bg-[#5865F2]/20 text-[#5865F2]' : 'bg-white/5 text-white/50'
                    }`}>
                      {item.icon}
                    </div>
                    {item.label}
                    {item.key === 'mail' && mailUnreadCount > 0 && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {mailUnreadCount > 99 ? '99+' : mailUnreadCount}
                      </span>
                    )}
                  </button>
                ))}
            </nav>

          </div>
        </div>
      )}
    </>
  );
}