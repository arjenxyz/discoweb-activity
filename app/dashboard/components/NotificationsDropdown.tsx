'use client';

import Image from 'next/image';
import { LuBell } from 'react-icons/lu';
import type { Notification } from '../types';
import type { RefObject } from 'react';
import { useT } from '@/contexts/LocaleContext';

type NotificationsDropdownProps = {
  open: boolean;
  unreadCount: number;
  loading: boolean;
  notifications: Notification[];
  onToggle: () => void;
  onOpenNotification: (item: Notification) => void;
  menuRef: RefObject<HTMLDivElement>;
  onOpenModal?: () => void;
  renderNotificationBody: (body: string) => React.ReactNode;
};

export default function NotificationsDropdown({
  open,
  unreadCount,
  loading,
  notifications,
  onToggle,
  onOpenNotification,
  menuRef,
  onOpenModal,
  renderNotificationBody,
}: NotificationsDropdownProps) {
  const t = useT();
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-white/30 hover:text-white"
        aria-label={t('notifications_dropdown_title')}
      >
        <LuBell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-white/15 bg-[#0f1116] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t('notifications_dropdown_title')}</p>
            {onOpenModal && (
              <button
                type="button"
                onClick={() => onOpenModal()}
                className="text-xs text-white/60 hover:text-white"
              >
                {t('notifications_dropdown_see_all')}
              </button>
            )}
          </div>
          <div className="mt-3 max-h-96 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {loading ? (
              <p className="text-xs text-white/50">{t('notifications_dropdown_loading')}</p>
            ) : notifications.length ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenNotification(item)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20"
                >
                  <div className="flex items-center gap-2">
                    {item.author_avatar_url ? (
                      <Image
                        src={item.author_avatar_url}
                        alt="author"
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-white/10" />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white/80">{item.title}</p>
                      {item.author_name && <p className="text-[10px] text-white/40">{item.author_name}</p>}
                    </div>
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
                  </div>
                  <div className="mt-1 text-[11px] text-white/50 line-clamp-2">{renderNotificationBody(item.body)}</div>
                  <span className="mt-2 inline-flex text-[10px] text-white/40">
                    {(() => { const d = new Date(item.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR'); })()}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-xs text-white/50">{t('notifications_dropdown_empty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
