'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuChevronRight, LuGift, LuHouse, LuMail, LuStore, LuCompass } from 'react-icons/lu';
import type { MemberProfile, Section } from '../types';

type SidebarNavProps = {
  effectiveSection: Section;
  unauthorized: boolean;
  onNavigate: (section: Section) => void;
  profile: MemberProfile | null;
};

const NAV_GROUPS = [
  {
    label: 'Keşfet',
    items: [
      { key: 'overview' as Section, label: 'Ana Sayfa', icon: LuHouse },
      { key: 'store' as Section, label: 'Mağaza', icon: LuStore },
      { key: 'raffles' as Section, label: 'Çekilişler', icon: LuGift },
      { key: 'discover' as Section, label: 'Topluluk', icon: LuCompass },
    ],
  },
  {
    label: 'Hesabım',
    requiresAuth: true,
    items: [
      { key: 'mail' as Section, label: 'Mesajlar', icon: LuMail },
    ],
  },
];

export default function SidebarNav({
  effectiveSection,
  unauthorized,
  onNavigate,
  profile,
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-[#0b0d12] transition-all duration-300 lg:flex ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Üst alan — sunucu bilgisi */}
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Menüyü Aç"
          >
            <LuChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
              {profile?.guildIcon ? (
                <Image src={profile.guildIcon} alt="guild" width={32} height={32} unoptimized className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/40">
                  {profile?.guildName?.charAt(0) ?? '#'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {profile?.guildName ?? 'Sunucu'}
              </p>
              <p className="text-[10px] text-white/35">Aktif</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
              aria-label="Menüyü Kapat"
            >
              <LuChevronRight className="h-3.5 w-3.5 rotate-180" />
            </button>
          </>
        )}
      </div>

      <div className="mx-3 border-t border-white/[0.06]" />

      {/* Navigasyon */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-6 space-y-5">
        {NAV_GROUPS.filter(g => !g.requiresAuth || !unauthorized).map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                {group.label}
              </p>
            )}
            {group.items.map(({ key, label, icon: Icon }) => {
              const active = effectiveSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`group flex w-full items-center rounded-xl transition-all duration-150 ${
                    collapsed
                      ? 'h-10 w-10 justify-center mx-auto'
                      : 'gap-3 px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                  title={collapsed ? label : undefined}
                >
                  <span className={`flex shrink-0 items-center justify-center rounded-lg transition-all ${
                    collapsed ? 'h-10 w-10' : 'h-7 w-7'
                  } ${active ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {!collapsed && (
                    <span className={`text-sm font-medium leading-none ${active ? 'text-white' : ''}`}>
                      {label}
                    </span>
                  )}
                  {!collapsed && active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
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
