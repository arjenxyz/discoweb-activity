'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuChevronRight, LuHouse, LuMail, LuStore, LuMegaphone, LuCompass, LuShieldCheck } from 'react-icons/lu';
import type { MemberProfile, Section } from '../types';
import { useT } from '@/contexts/LocaleContext';

type SidebarNavProps = {
  effectiveSection: Section;
  unauthorized: boolean;
  onNavigate: (section: Section) => void;
  profile: MemberProfile | null;
};

export default function SidebarNav({
  effectiveSection,
  unauthorized,
  onNavigate,
  profile,
}: SidebarNavProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  const SECTION_BG: Partial<Record<Section, string>> = {
    duyuru:         '/menu-background/varyant6.jpg',
    overview:        '/menu-background/varyant.jpg',
    store:           '/menu-background/varyant2.jpg',
    discover:        '/menu-background/varyant3.jpg',
    'tag-badge':     '/menu-background/varyant4.jpg',
    mail:            '/menu-background/varyant6.jpg',
  };

  const NAV_GROUPS = [

    {
      label: t('nav_group_discoweb'),
      requiresAuth: true,
      items: [
        { key: 'duyuru' as Section, label: t('nav_duyuru'), icon: LuMegaphone },
      ],
    },

    {
      label: t('nav_group_discover'),
      items: [
        { key: 'overview' as Section, label: t('nav_home'), icon: LuHouse },
        { key: 'store' as Section, label: t('nav_store'), icon: LuStore },
        { key: 'tag-badge' as Section, label: t('nav_tag_badge'), icon: LuShieldCheck },
        { key: 'discover' as Section, label: t('nav_community'), icon: LuCompass },
      ],
    },
    {
      label: t('nav_group_account'),
      requiresAuth: true,
      items: [
        { key: 'mail' as Section, label: t('nav_messages'), icon: LuMail },
      ],
    },
  ];

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
            aria-label={t('dashboard_menu_open_aria')}
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
                {profile?.guildName ?? t('nav_server')}
              </p>
              <p className="text-[10px] text-white/35">{t('dashboard_server_active_badge')}</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-white/5 hover:text-white/60"
              aria-label={t('dashboard_menu_close')}
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
                  {/* Buton arkaplan görseli */}
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
