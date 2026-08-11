'use client';

import { LuStar } from 'react-icons/lu';
import type { MailItem } from '../types';
import { useT } from '@/contexts/LocaleContext';
import {
  CATEGORY_CONFIG,
  SENDER_NAME_KEYS,
  previewText,
} from './mailShared';

type Props = {
  mail: MailItem;
  dateLabel: string;
  onClick: () => void;
};

export default function MailChatBubble({ mail, dateLabel, onClick }: Props) {
  const t = useT();
  const config = CATEGORY_CONFIG[mail.category] ?? CATEGORY_CONFIG.order;
  const unread = !mail.is_read;
  const senderKey = SENDER_NAME_KEYS[mail.category] ?? SENDER_NAME_KEYS.system;
  const senderName = mail.author_name ?? t(senderKey);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full"
    >
      <div
        className={`flex h-[132px] w-full flex-col rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
          unread
            ? 'border-white/[0.10] bg-[#12141b]'
            : 'border-white/[0.06] bg-[#0f1116]/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs ${config.css}`}>
            {config.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/45">{senderName}</span>
          {unread && (
            <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/55">
              {t('mail_unread_label')}
            </span>
          )}
          {mail.is_starred && <LuStar className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />}
        </div>

        <h4 className={`mt-1.5 line-clamp-1 text-[13px] leading-snug ${unread ? 'font-bold text-white' : 'font-semibold text-white/75'}`}>
          {mail.title}
        </h4>
        <p className="mt-1 min-h-0 flex-1 line-clamp-2 text-[12px] leading-relaxed text-white/40">
          {previewText(mail.body, 120)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.css}`}>
            {t(config.labelKey)}
          </span>
          <span className="text-[10px] text-white/30">{dateLabel}</span>
        </div>
      </div>
    </button>
  );
}
