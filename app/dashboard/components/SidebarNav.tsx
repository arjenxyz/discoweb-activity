'use client';

import Image from 'next/image';
import { LuHouse, LuMail, LuStore, LuMegaphone, LuShieldCheck, LuTrophy, LuMonitorPlay } from 'react-icons/lu';
import type { MemberProfile, Section } from '../types';
import { useT } from '@/contexts/LocaleContext';
import { ENABLE_TAG_BADGE_SECTION } from '../featureFlags';

type SidebarNavProps = {
  effectiveSection: Section;
  unauthorized: boolean;
  onNavigate: (section: Section) => void;
  profile: MemberProfile | null;
  duyuruEveryoneUnreadCount?: number;
};

export default function SidebarNav({
  effectiveSection,
  unauthorized,
  onNavigate,
  duyuruEveryoneUnreadCount = 0,
}: SidebarNavProps) {
  const t = useT();

  const SECTION_BG: Partial<Record<Section, string>> = {
    duyuru: '/menu-background/varyant6.jpg',
    overview: '/menu-background/varyant.jpg',
    store: '/menu-background/varyant2.jpg',
    'tag-badge': '/menu-background/varyant4.jpg',
    mail: '/menu-background/varyant6.jpg',
    quiz: '/menu-background/varyant.jpg',
    'watch-earn': '/menu-background/varyant3.jpg',
  };

  const NAV_GROUPS = [
    {
      label: t('nav_group_discoweb'),
      requiresAuth: true,
      items: [
        { key: 'duyuru' as Section, label: t('nav_duyuru'), icon: LuMegaphone },
        { key: 'watch-earn' as Section, label: t('nav_watch_earn'), icon: LuMonitorPlay },
      ],
    },
    {
      label: t('nav_group_discover'),
      items: [
        { key: 'overview' as Section, label: t('nav_home'), icon: LuHouse },
        { key: 'store' as Section, label: t('nav_store'), icon: LuStore },
        ...(ENABLE_TAG_BADGE_SECTION
          ? [{ key: 'tag-badge' as Section, label: t('nav_tag_badge'), icon: LuShieldCheck }]
          : []),
        { key: 'quiz' as Section, label: t('nav_quiz'), icon: LuTrophy },
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
    <aside className="hidden h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0b0d12] transition-all duration-300 lg:flex">
      <nav className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-6 custom-scrollbar">
        {NAV_GROUPS.filter((g) => !g.requiresAuth || !unauthorized).map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
              {group.label}
            </p>
            {group.items.map(({ key, label, icon: Icon }) => {
              const active = effectiveSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition-all duration-150 ${
                    active ? 'text-white' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {SECTION_BG[key] && (
                    <>
                      <Image
                        src={SECTION_BG[key]!}
                        alt=""
                        fill
                        className="pointer-events-none object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-30"
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
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-xl transition-all duration-150 ${
                      active ? 'bg-white/10' : 'group-hover:bg-white/[0.06]'
                    }`}
                  />
                  <span
                    className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                      active ? 'text-white' : 'text-white/45 group-hover:text-white/70'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`relative text-sm font-medium leading-none ${active ? 'text-white' : ''}`}>
                    {label}
                  </span>
                  {key === 'duyuru' && duyuruEveryoneUnreadCount > 0 && (
                    <span className="relative ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {duyuruEveryoneUnreadCount > 9 ? '9+' : duyuruEveryoneUnreadCount}
                    </span>
                  )}
                  {active && key !== 'duyuru' && (
                    <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                  )}
                  {active && key === 'duyuru' && duyuruEveryoneUnreadCount === 0 && (
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
