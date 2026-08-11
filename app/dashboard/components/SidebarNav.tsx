'use client';

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
    <aside className="hidden h-full min-h-0 w-[248px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0b0d12] lg:flex">
      <div className="flex h-14 shrink-0 items-center px-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">DiscoWeb</span>
      </div>

      <nav className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-6">
        {NAV_GROUPS.filter((g) => !g.requiresAuth || !unauthorized).map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
              {group.label}
            </p>
            {group.items.map(({ key, label, icon: Icon }) => {
              const active = effectiveSection === key;
              const unread = key === 'duyuru' ? duyuruEveryoneUnreadCount : 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                    active
                      ? 'bg-white/[0.08] text-white shadow-[inset_3px_0_0_0_#5865F2]'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/85'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? 'bg-[#5865F2]/15 text-[#a5b4fc]'
                        : 'bg-white/[0.03] text-white/45 group-hover:text-white/75'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] leading-none ${active ? 'font-semibold text-white' : 'font-medium'}`}>
                    {label}
                  </span>
                  {unread > 0 ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[9px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : active ? (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5865F2]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
