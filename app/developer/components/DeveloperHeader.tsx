import React, { useState } from 'react';
import Image from 'next/image';
import { LuLayoutGrid, LuSettings, LuChevronRight, LuLogOut } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

type DevSection = 'overview' | 'logs' | 'suspicious' | 'apps' | 'servers' | 'profiles' | 'ads' | 'weeklyTasks' | 'announcements' | 'reports' | 'bans';

type DeveloperHeaderProps = {
  isActivityEmbed?: boolean;
  activeSection: DevSection;
  onNavigate: (section: DevSection) => void;
  profile: { username: string; avatarUrl: string | null } | null;
  onClose: () => void;
};

export default function DeveloperHeader({
  isActivityEmbed = false,
  activeSection,
  onNavigate,
  profile,
  onClose,
}: DeveloperHeaderProps) {
  const t = useT();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLabels: Record<DevSection, string> = {
    overview: 'Genel Bakış',
    logs: 'Sistem Logları',
    suspicious: 'Şüpheli İşlemler',
    apps: 'Başvurular',
    servers: 'Sunucular',
    profiles: 'Kullanıcılar',
    ads: 'Reklam Yönetimi',
    weeklyTasks: 'Haftalık Görevler',
    announcements: 'Duyurular',
    reports: 'Hata Bildirimleri',
    bans: 'Yasaklamalar',
  };

  return (
    <>
      {/* Desktop overlay */}
      <div
        onClick={() => setIsProfileOpen(false)}
        className={`hidden lg:block fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isProfileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />
      {/* Mobil overlay */}
      <div
        onClick={() => { setIsProfileOpen(false); setMobileMenuOpen(false); }}
        className={`lg:hidden fixed inset-0 z-[35] bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          (isProfileOpen || mobileMenuOpen) ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      />

      <header className={`md:fixed inset-x-0 top-0 flex items-center bg-[#0e1018]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 transition-all duration-200 relative ${
        isActivityEmbed ? 'h-auto pt-[env(safe-area-inset-top,0px)] pb-2 min-h-[4rem]' : 'h-16'
      } ${isProfileOpen ? 'z-[9991]' : 'z-30'}`}>

        <style>{`@keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>

        {/* Sol — logo (sadece desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 min-w-fit ml-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-xl sm:text-2xl tracking-tight leading-none" style={logoWhiteStyle}>
              Disco<span style={logoBlueStyle}>Web</span>
            </span>
          </div>
        </div>

        {/* Mobil orta — logo */}
        <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
          <div className="flex flex-col gap-0.5 items-center">
            <span className="font-black text-xl tracking-tight leading-none" style={logoWhiteStyle}>
              Disco<span style={logoBlueStyle}>Web</span>
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Sağ Alan */}
        <div className="flex items-center gap-3">
          
          {/* Developer Mode Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-300">DEVELOPER MODE</span>
          </div>

          {/* Profil butonu */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2 rounded-full border p-1 pr-3 transition-all ${
                isProfileOpen ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-transparent hover:border-white/10 hover:bg-white/5'
              }`}
            >
              <div className="h-8 w-8 overflow-hidden rounded-full border border-emerald-500/20">
                <Image
                  src={profile?.avatarUrl || '/gif/cat.gif'}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-white leading-tight">{profile?.username || 'Geliştirici'}</p>
                <p className="text-[10px] text-emerald-400 font-bold leading-tight tracking-widest">ADMIN</p>
              </div>
            </button>

            {/* Profil dropdown */}
            <div
              onClick={e => e.stopPropagation()}
              className={`absolute right-0 top-14 w-[280px] transition-all duration-300 origin-top-right ${
                isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl">
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <LuSettings className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider font-bold">Yetkilendirme</p>
                      <p className="text-sm font-semibold text-emerald-100 truncate">Tam Erişim</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 mt-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                        <LuLogOut className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium">Dashboard'a Dön</span>
                    </div>
                    <LuChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobil bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b0d12]/98 backdrop-blur-2xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Sol — Menüler butonu */}
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(o => !o); setIsProfileOpen(false); }}
            className={`flex flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 transition-all ${
              mobileMenuOpen ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${mobileMenuOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/8 text-white/70'}`}>
              <LuLayoutGrid className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-white/35 font-medium">Şu an</span>
              <span className="text-sm font-bold text-white">
                {navLabels[activeSection] || 'Menüler'}
              </span>
            </div>
          </button>

          {/* Sağ — Kapat / Dashboard'a Dön */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 transition-all hover:bg-rose-500/20 text-rose-400"
          >
            <LuLogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Nav menüsü — yukarı açılır */}
        {mobileMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 z-50 rounded-2xl border border-emerald-500/20 bg-[#0f1116]/98 backdrop-blur-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
            <div className="px-2 py-2 space-y-1">
              {Object.entries(navLabels).map(([key, label]) => {
                const isActive = activeSection === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { onNavigate(key as DevSection); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
