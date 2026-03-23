"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

// Dropdown Link
const DropdownLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link 
    href={href} 
    className="block px-4 py-2.5 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
  >
    {children}
  </Link>
);

// Chevron İkonu
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg 
    className={`w-3 h-3 ml-1.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export default function CuteNavbar() {
  const t = useT();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Logo Hover State
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  // --- DISCORD OAUTH LINK ---
  const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? process.env.DISCORD_CLIENT_ID ?? '';
  // Prefer the explicit Discord redirect env var to avoid origin mismatches on Vercel
  const REDIRECT_RAW = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? process.env.NEXT_PUBLIC_REDIRECT_URI ?? '';

  // Normalize redirect URI: prefer configured env, otherwise derive from current origin.
  const getAuthRedirect = () => {
    if (REDIRECT_RAW && REDIRECT_RAW.trim() !== '') {
      // remove trailing slashes
      return REDIRECT_RAW.replace(/\/+$/g, '');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const baseRedirect = getAuthRedirect();
  // If env already points to the full callback path, use it as-is; otherwise append /auth/callback
  const authRedirect = baseRedirect
    ? baseRedirect.endsWith('/auth/callback')
      ? baseRedirect
      : `${baseRedirect.replace(/\/+$/,'')}/auth/callback`
    : '';

  const DISCORD_LOGIN_URL = DISCORD_CLIENT_ID && authRedirect
    ? `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(authRedirect)}&response_type=code&scope=identify%20guilds`
    : '/';

  useEffect(() => {
    console.debug('CuteNavbar env', { DISCORD_CLIENT_ID, REDIRECT_RAW, authRedirect, DISCORD_LOGIN_URL });
  }, [DISCORD_CLIENT_ID, REDIRECT_RAW, authRedirect, DISCORD_LOGIN_URL]);

  useEffect(() => {
    // Check if user is logged in via localStorage + validate session cookie
    const checkLoginStatus = async () => {
      const discordUser = localStorage.getItem('discordUser');
      const adminGuilds = localStorage.getItem('adminGuilds');
      const hasLocalData = !!(discordUser && adminGuilds);

      if (!hasLocalData) {
        setIsLoggedIn(false);
        return;
      }

      // Verify session cookie is still valid
      try {
        const res = await fetch(apiUrl('/api/auth/me'), { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          setIsLoggedIn(true);
        } else {
          // Session expired — clear stale localStorage
          console.log('Session expired, clearing stale localStorage');
          localStorage.removeItem('discordUser');
          localStorage.removeItem('adminGuilds');
          localStorage.removeItem('adminGuildsUpdatedAt');
          setIsLoggedIn(false);
        }
      } catch {
        // Network error — keep showing logged-in state, will fail at select-server
        setIsLoggedIn(hasLocalData);
      }
    };

    checkLoginStatus();

    // Listen for storage changes (in case login happens in another tab)
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  return (
    <>
      {/* --- FOCUS OVERLAY --- */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-[12px] transition-all duration-500 z-[9990] ${
          openMenu ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      {/* --- LOGIN GIF LAYER --- */}
      <div className={`fixed inset-0 z-[9991] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        openMenu === 'login' ? 'opacity-100' : 'opacity-0'
      }`}>
        <Image
          src="/gif/image.gif"
          alt="Login Animation"
          className="w-full h-full object-contain scale-110 drop-shadow-2xl"
          fill
        />
      </div>

      {/* --- NAVBAR (Desktop top / Mobile bottom) --- */}
      <div
        ref={containerRef}
        className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:left-0 md:right-0"
      >
        {/* Desktop top nav */}
        <nav className="hidden md:flex items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 shadow-2xl transition-colors duration-300">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] p-0.5 shadow-lg shadow-[#5865F2]/20 group cursor-pointer transition-transform hover:scale-110 relative z-50">
              <div className="relative w-full h-full bg-[#1e1f22] rounded-[10px] overflow-hidden">
                <Image src="/gif/cat.gif" alt="avatar" fill className="object-cover" />
              </div>
            </div>
            <div
              className="relative flex items-center gap-1 cursor-pointer h-full group"
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
            >
              <div className="text-white font-black text-xl tracking-tight z-50 relative">DiscoWeb</div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 hidden lg:inline font-bold border border-white/10 px-2 py-0.5 rounded-full z-50 relative">Beta</span>

              <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 z-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                isLogoHovered ? 'opacity-100 translate-y-0 rotate-0' : 'opacity-0 -translate-y-12 -rotate-12 pointer-events-none'
              }`}>
                <div className="relative w-[280px] drop-shadow-2xl filter brightness-110">
                  <Image
                    src="/gif/asılıpengu.gif"
                    alt="Hanging Penguin"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop menu (with dropdowns) */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {/* --- ANA SAYFA --- */}
            <div
              className="relative group"
              onMouseEnter={() => setOpenMenu('home')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                className={`flex items-center px-5 py-2.5 font-medium transition-all duration-200 rounded-full ${
                  openMenu === 'home'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('nav_home')}
                <ChevronIcon isOpen={openMenu === 'home'} />
              </button>
              {openMenu === 'home' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                    <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">🏠 {t('nav_overview')}</DropdownLink>
                      <DropdownLink href="#">🎯 {t('nav_features')}</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <div className="relative w-full h-full">
                        <Image src="/gif/from.gif" alt="Home GIF" fill className="object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- MAĞAZA --- */}
            <div
              className="relative group"
              onMouseEnter={() => setOpenMenu('store')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                className={`flex items-center px-5 py-2.5 font-medium transition-all duration-200 rounded-full ${
                  openMenu === 'store'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('nav_store')}
                <ChevronIcon isOpen={openMenu === 'store'} />
              </button>
              {openMenu === 'store' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                    <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">🎁 {t('nav_products')}</DropdownLink>
                      <DropdownLink href="#">🔥 {t('nav_campaigns')}</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <div className="relative w-full h-full">
                        <Image src="/gif/sungerbubi.gif" alt="Store GIF" fill className="object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- (Diğer menü öğeleri burada devam edebilir) --- */}
          </div>

          {/* Desktop user/actions */}
          <div className="flex items-center gap-3">
            {/* (örnek) Profil / Giriş Butonları */}
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-semibold text-white/90 hover:text-white">
                {t('nav_profile')}
              </Link>
            ) : (
              <Link href={DISCORD_LOGIN_URL} className="text-sm font-semibold text-white/90 hover:text-white">
                {t('nav_login')}
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile bottom nav */}
        <nav className="md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-800 px-2 py-3 flex justify-around items-center">
          <Link href="/" className="flex flex-col items-center text-xs text-white/80 hover:text-white">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">🏠</span>
            {t('nav_home')}
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center text-xs text-white/80 hover:text-white">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">🛍️</span>
            {t('nav_store')}
          </Link>
          <Link href={isLoggedIn ? '/dashboard' : DISCORD_LOGIN_URL} className="flex flex-col items-center text-xs text-white/80 hover:text-white">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">👤</span>
            {isLoggedIn ? t('nav_profile') : t('nav_login')}
          </Link>
        </nav>
      </div>
    </>
  );
}
