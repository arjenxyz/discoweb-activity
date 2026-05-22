import { useState } from 'react';
import Image from 'next/image';
import {
  LuLayoutDashboard, LuScrollText, LuTriangleAlert, LuClipboardList,
  LuServer, LuUsers, LuMegaphone, LuListChecks, LuMessageSquare, LuBug, LuShield,
  LuChevronRight
} from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

type DevSection = 'overview' | 'logs' | 'suspicious' | 'apps' | 'servers' | 'profiles' | 'ads' | 'weeklyTasks' | 'announcements' | 'reports' | 'bans';

type DeveloperSidebarNavProps = {
  activeSection: DevSection;
  onNavigate: (section: DevSection) => void;
  profile: { username: string; avatarUrl: string | null } | null;
};

export default function DeveloperSidebarNav({
  activeSection,
  onNavigate,
  profile,
}: DeveloperSidebarNavProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  // Dashboard tarzı estetik arkaplan resimleri (Hover'da gözükenler)
  const SECTION_BG: Partial<Record<DevSection, string>> = {
    overview: '/menu-background/varyant.jpg',
    logs: '/menu-background/varyant2.jpg',
    suspicious: '/menu-background/varyant3.jpg',
    apps: '/menu-background/varyant4.jpg',
    servers: '/menu-background/varyant5.jpg',
    profiles: '/menu-background/varyant6.jpg',
    ads: '/menu-background/varyant.jpg',
    weeklyTasks: '/menu-background/varyant2.jpg',
    announcements: '/menu-background/varyant3.jpg',
    reports: '/menu-background/varyant4.jpg',
    bans: '/menu-background/varyant5.jpg',
  };

  const NAV_GROUPS = [
    {
      label: 'SİSTEM & İZLEME',
      items: [
        { key: 'overview' as DevSection, label: 'Genel Bakış', icon: LuLayoutDashboard },
        { key: 'logs' as DevSection, label: 'Sistem Logları', icon: LuScrollText },
        { key: 'suspicious' as DevSection, label: 'Şüpheli İşlemler', icon: LuTriangleAlert },
      ],
    },
    {
      label: 'YÖNETİM & VERİ',
      items: [
        { key: 'apps' as DevSection, label: 'Başvurular', icon: LuClipboardList },
        { key: 'servers' as DevSection, label: 'Sunucular', icon: LuServer },
        { key: 'profiles' as DevSection, label: 'Kullanıcılar', icon: LuUsers },
        { key: 'ads' as DevSection, label: 'Reklam Yönetimi', icon: LuMegaphone },
        { key: 'weeklyTasks' as DevSection, label: 'Haftalık Görevler', icon: LuListChecks },
        { key: 'announcements' as DevSection, label: 'Duyurular', icon: LuMessageSquare },
      ],
    },
    {
      label: 'GÜVENLİK & DESTEK',
      items: [
        { key: 'reports' as DevSection, label: 'Hata Bildirimleri', icon: LuBug },
        { key: 'bans' as DevSection, label: 'Yasaklamalar', icon: LuShield },
      ],
    },
  ];

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-[#0b0d12] transition-all duration-300 lg:flex ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Üst alan — Profil Bilgisi */}
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Menüyü Aç"
          >
            <LuChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              {profile?.avatarUrl ? (
                <Image src={profile.avatarUrl} alt="avatar" width={32} height={32} unoptimized className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-emerald-400">
                  {profile?.username?.charAt(0) ?? 'D'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {profile?.username ?? 'Geliştirici'}
              </p>
              <p className="text-[10px] font-bold text-emerald-400 tracking-wider">DEVELOPER</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
              title="Menüyü Kapat"
            >
              <LuChevronRight className="h-3.5 w-3.5 rotate-180" />
            </button>
          </>
        )}
      </div>

      <div className="mx-3 border-t border-white/[0.06]" />

      {/* Navigasyon */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-6 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                {group.label}
              </p>
            )}
            {group.items.map(({ key, label, icon: Icon }) => {
              const active = activeSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`group relative flex w-full items-center overflow-hidden rounded-xl transition-all duration-150 ${
                    collapsed
                      ? 'h-10 w-10 justify-center mx-auto'
                      : 'gap-3 px-3 py-2.5'
                  } ${
                    active
                      ? 'text-white'
                      : 'text-white/45 hover:text-white/80'
                  }`}
                  title={collapsed ? label : undefined}
                >
                  {/* Buton arkaplan görseli (Cam Efekti + Resim) */}
                  {SECTION_BG[key] && (
                    <>
                      <Image
                        src={SECTION_BG[key]!}
                        alt=""
                        fill
                        className="pointer-events-none object-cover opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                      />
                      {active && (
                        <Image
                          src={SECTION_BG[key]!}
                          alt=""
                          fill
                          className="pointer-events-none object-cover opacity-20"
                        />
                      )}
                    </>
                  )}
                  {/* Overlay */}
                  <div className={`pointer-events-none absolute inset-0 rounded-xl transition-all duration-150 ${
                    active ? 'bg-white/10' : 'group-hover:bg-white/[0.06]'
                  }`} />
                  <span className={`relative flex shrink-0 items-center justify-center rounded-lg transition-all ${
                    collapsed ? 'h-10 w-10' : 'h-7 w-7'
                  } ${active ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {!collapsed && (
                    <span className={`relative text-sm font-medium leading-none ${active ? 'text-white' : ''}`}>
                      {label}
                    </span>
                  )}
                  {!collapsed && active && (
                    <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
