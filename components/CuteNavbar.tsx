"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
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
  // Mobil menü scroll kilidi
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileOpen]);

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

  function toggleMobileSubmenu(menu: string) {
    setMobileSubmenu(prev => (prev === menu ? null : menu));
  }

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


      <div ref={containerRef} className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] w-[min(1100px,calc(100%-32px))]">
        {/* Navbar Container: overflow-visible önemli */}
        <nav className="relative flex items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-2xl transition-colors duration-300 overflow-visible">
          
          {/* Logo Kısmı */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] p-0.5 shadow-lg shadow-[#5865F2]/20 group cursor-pointer transition-transform hover:scale-110 relative z-50">
              <div className="w-full h-full bg-[#1e1f22] rounded-[10px] overflow-hidden">
                <img src="/gif/cat.gif" alt="avatar" className="w-full h-full object-cover" />
              </div>
            </div>
            
            {/* --- İNTERAKTİF LOGO --- */}
            <div 
              className="relative flex items-center gap-1 cursor-pointer h-full group"
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
            >
              {/* Z-Index 50: Yazının penguenin üzerinde kalmasını sağlar */}
              <div className="text-white font-black text-xl tracking-tight z-50 relative">DiscoWeb</div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 hidden lg:inline font-bold border border-white/10 px-2 py-0.5 rounded-full z-50 relative">Beta</span>

              {/* --- ASILI PENGUEN GIF --- */}
              <div className={`absolute top-[60%] left-1/2 -translate-x-1/2 z-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
                isLogoHovered 
                  ? 'opacity-100 translate-y-0 rotate-0' 
                  : 'opacity-0 -translate-y-12 -rotate-12 pointer-events-none'
              }`}>
                <div className="w-[280px] drop-shadow-2xl filter brightness-110">
                  <img 
                    src="/gif/asılıpengu.gif" 
                    alt="Hanging Penguin" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-2">
            
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
                Ana Sayfa

                <ChevronIcon isOpen={openMenu === 'home'} />
              </button>
              
              {openMenu === 'home' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                    <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">🏠 Genel Bakış</DropdownLink>
                      <DropdownLink href="#">🎯 Özellikler</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <img src="/gif/from.gif" alt="Home GIF" className="w-full h-full object-contain" />
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
                Mağaza
                <ChevronIcon isOpen={openMenu === 'store'} />
              </button>
              {openMenu === 'store' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                    <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">🎁 Ürünler</DropdownLink>
                      <DropdownLink href="#">🔥 Kampanyalar</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <img src="/gif/sungerbubi.gif" alt="Store GIF" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- DEVELOPER --- */}
            <div 
              className="relative group"
              onMouseEnter={() => setOpenMenu('developer')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button 
                className={`flex items-center px-5 py-2.5 font-medium transition-all duration-200 rounded-full ${
                  openMenu === 'developer' 
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                Developer
                <ChevronIcon isOpen={openMenu === 'developer'} />
              </button>
              {openMenu === 'developer' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                      <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">👨🏻‍💻 Hakkında</DropdownLink>
                      <DropdownLink href="#">🛠 Canlı Destek</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <img src="/gif/indir2.gif" alt="Developer GIF" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- KEŞFET --- */}
            <div 
              className="relative group"
              onMouseEnter={() => setOpenMenu('discover')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button 
                className={`flex items-center px-5 py-2.5 font-medium transition-all duration-200 rounded-full ${
                  openMenu === 'discover' 
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' 
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                Keşfet
                <ChevronIcon isOpen={openMenu === 'discover'} />
              </button>
              {openMenu === 'discover' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-72 animate-slideUp origin-top z-50">
                  <div className="bg-[#5865F2] border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(88,101,242,0.4)] p-5 pb-16 relative overflow-visible">
                    <div className="relative z-20 space-y-1">
                      <DropdownLink href="#">🌍 Topluluk</DropdownLink>
                      <DropdownLink href="#">✍️ Blog</DropdownLink>
                      <DropdownLink href="#">⛑️ Destek</DropdownLink>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 pointer-events-none drop-shadow-2xl z-10 transform rotate-[-10deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105">
                      <img src="/gif/Patickstar.gif" alt="Discover GIF" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center gap-4">
            {/* --- GİRİŞ YAP / DEVAM ET BUTONU --- */}
            {isLoggedIn ? (
              <Link 
                href="/auth/select-server"
                className="hidden md:inline-flex items-center justify-center px-5 py-2.5 font-bold text-sm rounded-full bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 hover:bg-[#4752c4] transition-all duration-300"
              >
                Devam Et
              </Link>
            ) : (
              <Link 
                href={DISCORD_LOGIN_URL}
                onMouseEnter={() => setOpenMenu('login')}
                onMouseLeave={() => setOpenMenu(null)}
                onClick={(e) => {
                  if (!DISCORD_CLIENT_ID || !DISCORD_LOGIN_URL || DISCORD_LOGIN_URL === '/') {
                    e.preventDefault();
                    console.warn('DISCORD login blocked: missing env vars', { DISCORD_CLIENT_ID, DISCORD_LOGIN_URL });
                    alert('Giriş yapılamıyor: Discord istemci kimliği veya redirect URI yapılandırılmamış. Lütfen NEXT_PUBLIC_DISCORD_CLIENT_ID ve NEXT_PUBLIC_REDIRECT_URI değerlerini kontrol edin.');
                    return;
                  }
                }}
                className={`hidden md:inline-flex items-center justify-center px-5 py-2.5 font-bold text-sm rounded-full transition-all duration-300 ${
                  openMenu === 'login'
                    ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Giriş Yap
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10"
              onClick={() => setMobileOpen(v => !v)}
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`w-full h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-full h-0.5 bg-white rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[9990]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fadeIn" onClick={() => setMobileOpen(false)}></div>
          <div className="absolute top-24 left-4 right-4 bottom-8 bg-[#1e1f22] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-slideUp">
            <div className="h-full overflow-y-auto p-6 space-y-6">
              
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-14 h-14 rounded-xl bg-[#5865F2] p-1">
                   <img src="/gif/cat.gif" alt="avatar" className="w-full h-full rounded-lg object-cover" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Merhaba!</h3>
                  <p className="text-white/40 text-xs">DiscoWeb dünyasına hoş geldin.</p>
                </div>
              </div>

              {/* Mobil Menü Linkleri */}
              <div className="space-y-3">
                 <button onClick={() => toggleMobileSubmenu('home')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl text-white font-semibold">
                  <span>🏠 Ana Sayfa</span>
                  <span className={`transition-transform ${mobileSubmenu === 'home' ? 'rotate-180' : ''}`}>▼</span>
                 </button>
                 {mobileSubmenu === 'home' && (
                  <div className="grid grid-cols-1 gap-2 pl-4 animate-fadeIn">
                    <Link href="#" className="text-white/60 p-2">Genel Bakış</Link>
                    <Link href="#" className="text-white/60 p-2">Özellikler</Link>
                  </div>
                 )}
                 {/* MOBIL GİRİŞ / DEVAM ET BUTONU */}
                 {isLoggedIn ? (
                   <Link href="/auth/select-server" className="w-full block text-center bg-[#5865F2] text-white font-bold py-4 rounded-2xl">
                     Devam Et
                   </Link>
                 ) : (
                   <Link
                     href={DISCORD_LOGIN_URL}
                     onClick={(e) => {
                       if (!DISCORD_CLIENT_ID || !DISCORD_LOGIN_URL || DISCORD_LOGIN_URL === '/') {
                         e.preventDefault();
                         console.warn('DISCORD login blocked (mobile): missing env vars', { DISCORD_CLIENT_ID, DISCORD_LOGIN_URL });
                         alert('Giriş yapılamıyor: Discord istemci kimliği veya redirect URI yapılandırılmamış. Lütfen NEXT_PUBLIC_DISCORD_CLIENT_ID ve NEXT_PUBLIC_REDIRECT_URI değerlerini kontrol edin.');
                         return;
                       }
                     }}
                     className="w-full block text-center bg-[#5865F2] text-white font-bold py-4 rounded-2xl"
                   >
                     Discord ile Bağlan
                   </Link>
                 )}
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(15px) scale(0.95); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
}