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
      className="group flex w-full justify-start px-3"
    >
      <div
        className={`relative max-w-[88%] rounded-2xl rounded-bl-md border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
          unread
            ? 'border-l-[3px] border-l-[#5865F2] border-y-white/[0.08] border-r-white/[0.08] bg-[#0f1116]/95 shadow-[0_0_24px_-10px_rgba(88,101,242,0.4)]'
            : 'border-white/[0.06] bg-[#0f1116]/80'
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs ${config.css}`}>
            {config.icon}
          </span>
          <span className="truncate text-[11px] font-semibold text-white/45">{senderName}</span>
          {mail.is_starred && <LuStar className="ml-auto h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />}
        </div>

        <h4 className={`text-[13px] leading-snug ${unread ? 'font-bold text-white' : 'font-semibold text-white/75'}`}>
          {mail.title}
        </h4>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/40">
          {previewText(mail.body, 120)}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.css}`}>
            {t(config.labelKey)}
          </span>
          <span className="text-[10px] text-white/30">{dateLabel}</span>
        </div>

        {unread && (
          <span className="absolute -left-1 top-4 h-2 w-2 rounded-full bg-[#5865F2] shadow-[0_0_8px_rgba(88,101,242,0.7)]" />
        )}
      </div>
    </button>
  );
}
