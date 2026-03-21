'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuChevronRight, LuClock, LuGift, LuHouse, LuMail, LuReceipt, LuStore } from 'react-icons/lu';
import type { MemberProfile } from '../types';

type Section = 'overview' | 'store' | 'raffles' | 'transactions' | 'tracking' | 'notifications' | 'profile' | 'settings' | 'mail';

type SidebarNavProps = {
  effectiveSection: Section;
  unauthorized: boolean;
  onNavigate: (section: Section) => void;
  profile: MemberProfile | null;
};

const menuItemClass = (isActive: boolean, collapsed: boolean) =>
  `group flex w-full items-center text-left text-xs transition ${
    collapsed
      ? `justify-center px-2 py-2 ${
          isActive ? 'text-indigo-200' : 'text-white/60 hover:text-white'
        }`
      : `gap-3 rounded-xl border-l-2 px-3 py-2 ${
          isActive
            ? 'border-indigo-400/80 bg-white/12 text-white'
            : 'border-transparent text-white/60 hover:border-white/20 hover:bg-white/5 hover:text-white'
        }`
  }`;

const iconWrapClass = (isActive: boolean, collapsed: boolean) =>
  `flex items-center justify-center ${
    collapsed
      ? 'h-10 w-10 rounded-full'
          : `h-9 w-9 rounded-xl ${isActive ? 'bg-white/12' : 'bg-white/10'}`
  } ${
    collapsed
      ? isActive
        ? 'text-white drop-shadow-[0_0_10px_rgba(129,140,248,0.6)]'
        : 'text-white/85 group-hover:text-white'
      : 'text-white'
  }`;

export default function SidebarNav({
  effectiveSection,
  unauthorized,
  onNavigate,
  profile,
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col border-r border-white/5 bg-[#0f1116] transition-all duration-300 lg:flex ${
        collapsed ? 'w-[90px]' : 'w-[260px]'
      }`}
    >
      <div className={`flex h-14 items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3`}>
        {!collapsed && <span className="text-xs uppercase tracking-[0.2em] text-white/40">Menü</span>}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 transition hover:border-white/30 hover:text-white"
            aria-label="Menüyü Kapat"
          >
            Menüyü Kapat
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="px-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 transition hover:border-white/30"
            aria-label="Menüyü Aç"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/15 text-white/90 shadow-[0_6px_12px_rgba(0,0,0,0.35)]">
              <LuChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      ) : (
        <div className="px-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-white/10">
                  {profile?.guildIcon ? (
                    <Image
                      src={profile.guildIcon}
                      alt="guild"
                      width={28}
                      height={28}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                      #
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Sunucu</p>
                  <p className="text-sm font-semibold text-white">
                    {profile?.guildName ?? 'Veri Merkezi'}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                Aktif
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-5">
        <nav className={`space-y-4 ${collapsed ? 'items-center' : ''}`}>
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-3 text-[10px] uppercase tracking-[0.3em] text-white/30">Genel</p>
            )}
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className={menuItemClass(effectiveSection === 'overview', collapsed)}
            >
              <span className={iconWrapClass(effectiveSection === 'overview', collapsed)}>
                <LuHouse className="h-5 w-5" />
              </span>
              {!collapsed && <span>Genel Bakış</span>}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('store')}
              className={menuItemClass(effectiveSection === 'store', collapsed)}
            >
              <span className={iconWrapClass(effectiveSection === 'store', collapsed)}>
                <LuStore className="h-5 w-5" />
              </span>
              {!collapsed && <span>Mağaza</span>}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('raffles')}
              className={menuItemClass(effectiveSection === 'raffles', collapsed)}
            >
              <span className={iconWrapClass(effectiveSection === 'raffles', collapsed)}>
                <LuGift className="h-5 w-5" />
              </span>
              {!collapsed && <span>Çekilişler</span>}
            </button>
          </div>

          {!unauthorized && (
            <div className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[10px] uppercase tracking-[0.3em] text-white/30">İşlemler</p>
              )}
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className={menuItemClass(effectiveSection === 'transactions', collapsed)}
              >
                <span className={iconWrapClass(effectiveSection === 'transactions', collapsed)}>
                  <LuReceipt className="h-5 w-5" />
                </span>
                {!collapsed && <span>İşlemler</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tracking')}
                className={menuItemClass(effectiveSection === 'tracking', collapsed)}
              >
                <span className={iconWrapClass(effectiveSection === 'tracking', collapsed)}>
                  <LuClock className="h-5 w-5" />
                </span>
                {!collapsed && <span>Mağaza Takip</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('mail')}
                className={menuItemClass(effectiveSection === 'mail', collapsed)}
              >
                <span className={iconWrapClass(effectiveSection === 'mail', collapsed)}>
                  <LuMail className="h-5 w-5" />
                </span>
                {!collapsed && <span>Mail</span>}
              </button>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
