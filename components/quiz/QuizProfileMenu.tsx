'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuChevronRight, LuHouse, LuSettings } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

export type QuizProfileMenuProps = {
  username: string;
  avatarUrl: string | null;
  serverName?: string | null;
  serverIconUrl?: string | null;
  onExit: () => void;
  onOpenSettings: () => void;
};

export function QuizProfileMenu({
  username,
  avatarUrl,
  serverName,
  serverIconUrl,
  onExit,
  onOpenSettings,
}: QuizProfileMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        }`}
      />

      <div className={`relative z-[91] ${open ? '' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex items-center gap-2 rounded-full border p-1 pr-3 transition-all ${
            open ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
          }`}
        >
          <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10">
            <Image
              src={avatarUrl || '/gif/cat.gif'}
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-white">{username}</p>
            <p className="text-[10px] leading-tight text-white/40">{serverName || '—'}</p>
          </div>
        </button>

        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-11 w-[min(300px,calc(100vw-2rem))] origin-top-right transition-all duration-300 ${
            open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="text-sm font-black text-white">{t('dashboard_hello_user', { username })}</p>
              {serverName && <p className="mt-0.5 text-xs text-white/40">{serverName}</p>}
            </div>

            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={() => {
                  close();
                  onExit();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                    <LuHouse className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">Ana sayfaya dön</span>
                </div>
                <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
              </button>

              {serverName && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  {serverIconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={serverIconUrl} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                      {serverName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/35">{t('dashboard_active_server_label')}</p>
                    <p className="truncate text-sm font-semibold text-white">{serverName}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  close();
                  onOpenSettings();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                    <LuSettings className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium">{t('dashboard_account_settings')}</span>
                </div>
                <LuChevronRight className="h-3.5 w-3.5 text-white/30" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
