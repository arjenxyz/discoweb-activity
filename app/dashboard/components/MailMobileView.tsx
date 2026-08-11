'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LuArchive,
  LuCheckCheck,
  LuChevronDown,
  LuChevronUp,
  LuGift,
  LuHouse,
  LuLayoutGrid,
  LuRefreshCw,
  LuSearch,
} from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import type { MailItem } from '../types';
import type { MailNavItem } from './mailShared';
import MailChatBubble from './MailChatBubble';
import MailDetailModal from './MailDetailModal';

type Props = {
  loading: boolean;
  error: string | null;
  filtered: MailItem[];
  navItems: MailNavItem[];
  activeCategory: string;
  countsUnread: Record<string, number>;
  searchQuery: string;
  sortOrder: 'desc' | 'asc';
  selectedMail: MailItem | null;
  onSearchChange: (q: string) => void;
  onToggleSort: () => void;
  onCategoryChange: (key: string) => void;
  onOpenMail: (mail: MailItem) => void;
  onCloseMail: () => void;
  onDeleteMail: (id: string) => void;
  onStarMail: (id: string) => void;
  onBack?: () => void;
  onMarkAllRead: () => void;
  onClaimAll: () => void;
  formatDate: (date: string) => string;
};

export default function MailMobileView({
  loading,
  error,
  filtered,
  navItems,
  activeCategory,
  countsUnread,
  searchQuery,
  sortOrder,
  selectedMail,
  onSearchChange,
  onToggleSort,
  onCategoryChange,
  onOpenMail,
  onCloseMail,
  onDeleteMail,
  onStarMail,
  onBack,
  onMarkAllRead,
  onClaimAll,
  formatDate,
}: Props) {
  const t = useT();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const activeLabel = navItems.find((i) => i.key === activeCategory)?.label ?? t('mail_category_all');
  const totalUnread = countsUnread.all ?? 0;

  useEffect(() => {
    if (!foldersOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFoldersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [foldersOpen]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col md:hidden">
      {/* Search */}
      <div className="flex-shrink-0 border-b border-white/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-[#5865F2]/30">
            <LuSearch className="h-4 w-4 shrink-0 text-white/30" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('mail_search_placeholder')}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
          <button
            type="button"
            onClick={onToggleSort}
            title={sortOrder === 'desc' ? t('mail_sort_newest') : t('mail_sort_oldest')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          >
            {sortOrder === 'desc' ? <LuChevronDown className="h-4 w-4" /> : <LuChevronUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-0.5">
          <span className="truncate text-xs font-medium text-white/45">{activeLabel}</span>
          <span className="shrink-0 text-[11px] text-white/30">
            {t('mail_found_count', { count: filtered.length })}
          </span>
        </div>
      </div>

      {/* Chat list */}
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-0 py-3 pb-28">
        {loading && (
          <div className="flex h-48 flex-col items-center justify-center text-white/50">
            <LuRefreshCw className="mb-3 h-7 w-7 animate-spin" />
            <span className="text-sm">{t('mail_loading')}</span>
          </div>
        )}

        {!loading && error && (
          <div className="mx-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-sm text-rose-400">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <LuArchive className="h-7 w-7 text-white/20" />
            </div>
            <p className="font-bold text-white">{t('mail_empty_box_title')}</p>
            <p className="mt-1 text-sm text-white/40">{t('mail_empty_box_subtitle2')}</p>
          </div>
        )}

        {!loading && !error && filtered.map((mail) => (
          <MailChatBubble
            key={mail.id}
            mail={mail}
            dateLabel={formatDate(mail.created_at)}
            onClick={() => onOpenMail(mail)}
          />
        ))}
      </div>

      {/* Bottom bar — homepage style, folders only (no profile) */}
      {foldersOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setFoldersOpen(false)}
          aria-hidden
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0b0d12]/98 backdrop-blur-2xl pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setFoldersOpen((o) => !o)}
            className={`flex flex-1 items-center gap-2.5 rounded-2xl px-3 py-2 transition-all ${
              foldersOpen
                ? 'border border-white/15 bg-white/10'
                : 'border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]'
            }`}
            aria-expanded={foldersOpen}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
                foldersOpen ? 'bg-white/15' : 'bg-white/8'
              }`}
            >
              <LuLayoutGrid className="h-3.5 w-3.5 text-white/70" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-medium text-white/35">Şu an</span>
              <span className="text-sm font-bold text-white">{activeLabel}</span>
            </div>
            {totalUnread > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
        </div>

        {foldersOpen && (
          <div className="absolute bottom-full left-0 right-0 z-50 mx-2 mb-1 max-h-[70vh] overflow-hidden overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1116]/98 shadow-2xl backdrop-blur-2xl">
            <div className="space-y-0.5 px-2 py-2">
              <p className="px-3 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                {t('mail_folders_label')}
              </p>
              {navItems.map((item) => {
                const isActive = activeCategory === item.key;
                const unread = countsUnread[item.key] ?? 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onCategoryChange(item.key);
                      setFoldersOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-white/40'}>{item.icon}</span>
                    <span>{item.label}</span>
                    {isActive && unread === 0 && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                    {unread > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-white/[0.06]" />
              <p className="px-3 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">
                {t('mail_fab_open')}
              </p>

              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    setFoldersOpen(false);
                    onBack();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
                >
                  <LuHouse className="h-4 w-4 text-white/40" />
                  <span>{t('dashboard_back_to_home')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFoldersOpen(false);
                  onMarkAllRead();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
              >
                <LuCheckCheck className="h-4 w-4 text-white/40" />
                <span>{t('mail_mark_all_read')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFoldersOpen(false);
                  onClaimAll();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
              >
                <LuGift className="h-4 w-4 text-white/40" />
                <span>{t('mail_claim_all')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedMail && (
        <MailDetailModal
          mail={selectedMail}
          variant="fullscreen"
          onClose={onCloseMail}
          onDelete={onDeleteMail}
          onStar={onStarMail}
        />
      )}
    </div>
  );
}
