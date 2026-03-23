'use client';

import Image from 'next/image';
import type { Notification } from '../types';
import { useT } from '@/contexts/LocaleContext';

type NotificationsModalProps = {
  open: boolean;
  loading: boolean;
  notifications: Notification[];
  activeNotification: Notification | null;
  onClose: () => void;
  onOpenNotification: (item: Notification) => void;
  renderNotificationBody: (body: string) => React.ReactNode;
};

export default function NotificationsModal({
  open,
  loading,
  notifications,
  activeNotification,
  onClose,
  onOpenNotification,
  renderNotificationBody,
}: NotificationsModalProps) {
  const t = useT();
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl">
        <div className={`transition ${activeNotification ? 'blur-sm' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-white">{t('notifications_modal_title')}</p>
              <p className="text-xs text-white/50">{t('notifications_modal_subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
            >
              {t('notifications_modal_close')}
            </button>
          </div>
        </div>
        <div
          className={`scrollbar-hidden mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1 transition ${
            activeNotification ? 'pointer-events-none blur-sm' : ''
          }`}
        >
          {loading ? (
            <p className="text-sm text-white/60">{t('notifications_modal_loading')}</p>
          ) : notifications.length ? (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenNotification(item)}
                className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4 text-left transition hover:border-white/20"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {item.author_avatar_url ? (
                      <Image
                        src={item.author_avatar_url}
                        alt="author"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-white/10" />
                    )}
                    <div>
                      <p className="text-white/80">{item.title}</p>
                      {item.author_name && <p className="text-xs text-white/40">{item.author_name}</p>}
                    </div>
                  </div>
                  {!item.is_read && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
                  <span className="text-xs text-white/40">{new Date(item.created_at).toLocaleString('tr-TR')}</span>
                </div>
                <p className="mt-2 text-sm text-white/60">{renderNotificationBody(item.body)}</p>
                {item.image_url && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                    <Image
                      src={item.image_url}
                      alt="notification"
                      width={960}
                      height={480}
                      unoptimized
                      className="max-h-60 w-full object-contain"
                    />
                  </div>
                )}
                {item.details_url && (
                  <a
                    href={item.details_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Detay bağlantısı
                  </a>
                )}
                <span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50">
                  {item.type === 'announcement' ? t('notifications_type_announcement') : t('notifications_type_mail')}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-white/50">{t('notifications_modal_empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
