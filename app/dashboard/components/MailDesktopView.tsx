'use client';

import { useRef } from 'react';
import {
  LuArchive,
  LuCheckCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronUp,
  LuGift,
  LuMail,
  LuMailOpen,
  LuRefreshCw,
  LuSearch,
  LuStar,
  LuTrash2,
} from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';
import type { MailItem } from '../types';
import type { MailNavItem } from './mailShared';
import { CATEGORY_CONFIG, previewText } from './mailShared';
import MailDetailModal from './MailDetailModal';

type Props = {
  loading: boolean;
  error: string | null;
  filtered: MailItem[];
  navItems: MailNavItem[];
  activeCategory: string;
  countsTotal: Record<string, number>;
  countsUnread: Record<string, number>;
  searchQuery: string;
  sortOrder: 'desc' | 'asc';
  selectedIds: Set<string>;
  selectedMail: MailItem | null;
  onBack?: () => void;
  onSearchChange: (q: string) => void;
  onToggleSort: () => void;
  onCategoryChange: (key: string) => void;
  onSelectMail: (mail: MailItem) => void;
  onCloseMail: () => void;
  onRefresh: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onMarkAllRead: () => void;
  onClaimAll: () => void;
  onBulkDelete: () => void;
  onBulkMarkRead: () => void;
  onDeleteMail: (id: string) => void;
  onStarMail: (id: string) => void;
  formatDate: (date: string) => string;
};

export default function MailDesktopView({
  loading,
  error,
  filtered,
  navItems,
  activeCategory,
  countsTotal,
  countsUnread,
  searchQuery,
  sortOrder,
  selectedIds,
  selectedMail,
  onBack,
  onSearchChange,
  onToggleSort,
  onCategoryChange,
  onSelectMail,
  onCloseMail,
  onRefresh,
  onToggleSelect,
  onSelectAll,
  onMarkAllRead,
  onClaimAll,
  onBulkDelete,
  onBulkMarkRead,
  onDeleteMail,
  onStarMail,
  formatDate,
}: Props) {
  const t = useT();
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative hidden h-full min-h-0 w-full flex-col overflow-hidden md:flex">
      {/* Top header */}
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0b0d12]/95 px-6 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 transition hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white"
              aria-label={t('mail_back_button')}
            >
              <LuChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#5865F2]/25 bg-[#5865F2]/10">
              <LuMail className="h-[18px] w-[18px] text-[#5865F2]" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-white">{t('mail_box_title')}</h2>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {loading
                  ? t('mail_loading')
                  : t('mail_unread_count', { total: countsTotal.all ?? 0, unread: countsUnread.all ?? 0 })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && (countsUnread.all ?? 0) > 0 && (
            <span className="rounded-full border border-[#5865F2]/30 bg-[#5865F2]/12 px-2.5 py-1 text-[11px] font-semibold text-[#a5b4fc]">
              {t('mail_unread_badge', { count: countsUnread.all ?? 0 })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white"
            aria-label={t('mail_refresh_title')}
          >
            <LuRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-panel body */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0d12]/98">
          <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-4 pt-5">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-white/30">
              {t('mail_folders_label')}
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeCategory === item.key;
                const count = countsUnread[item.key] ?? 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onCategoryChange(item.key)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#5865F2]/10 text-white shadow-[inset_3px_0_0_0_#5865F2]'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`text-base ${isActive ? 'text-[#5865F2]' : 'text-white/40'}`}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {count > 0 && (
                      <span
                        className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold ${
                          isActive ? 'bg-[#5865F2] text-white' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 px-4 pb-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t('mail_storage_label')}</p>
              <p className="mb-2 text-xs text-white/50">
                {t('mail_unread_count', { total: countsTotal.all ?? 0, unread: countsUnread.all ?? 0 })}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5865F2] to-indigo-500 transition-all"
                  style={{
                    width: `${(countsTotal.all ?? 0) > 0 ? Math.min(((countsUnread.all ?? 0) / (countsTotal.all ?? 1)) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* List panel */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-white/[0.06]">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-4 py-3">
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
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSelectAll}
                className="rounded-lg p-2 transition-colors hover:bg-white/5"
                title={t('mail_select_all_title')}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-all ${
                    selectedIds.size > 0 ? 'border-[#5865F2] bg-[#5865F2]' : 'border-white/30'
                  }`}
                >
                  {selectedIds.size > 0 && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                title={t('mail_refresh_title')}
              >
                <LuRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {selectedIds.size > 0 && (
                <>
                  <div className="mx-0.5 h-4 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={onBulkDelete}
                    className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-rose-400"
                    title={t('mail_delete_title')}
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onBulkMarkRead}
                    className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-[#5865F2]"
                    title={t('mail_read_title')}
                  >
                    <LuMailOpen className="h-4 w-4" />
                  </button>
                  <span className="ml-0.5 text-[10px] font-bold text-[#5865F2]">
                    {t('mail_selected_count', { count: selectedIds.size })}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-white/35">
              <span>{filtered.length > 0 ? '1' : '0'}–{filtered.length}</span>
              <button
                type="button"
                onClick={onToggleSort}
                title={sortOrder === 'desc' ? t('mail_sort_newest') : t('mail_sort_oldest')}
                className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/5 hover:text-white"
              >
                {sortOrder === 'desc' ? <LuChevronDown className="h-3.5 w-3.5" /> : <LuChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-3">
            {loading && (
              <div className="flex h-48 flex-col items-center justify-center text-white/50">
                <LuRefreshCw className="mb-3 h-7 w-7 animate-spin" />
                <span className="text-sm">{t('mail_loading')}</span>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-center text-sm text-rose-400">
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

            {!loading && !error && filtered.map((mail) => {
              const config = CATEGORY_CONFIG[mail.category] ?? CATEGORY_CONFIG.order;
              const isSelected = selectedIds.has(String(mail.id));
              const isActive = selectedMail && String(selectedMail.id) === String(mail.id);

              return (
                <div
                  key={mail.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMail(mail)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectMail(mail); }}
                  className={`group relative cursor-pointer rounded-xl border transition-all ${
                    isActive
                      ? 'border-[#5865F2]/30 bg-[#5865F2]/10 shadow-[inset_3px_0_0_0_#5865F2]'
                      : isSelected
                        ? 'border-[#5865F2]/20 bg-[#5865F2]/5'
                        : mail.is_read
                          ? 'border-white/5 bg-[#0b0d12]/40 opacity-75 hover:opacity-100 hover:border-white/10 hover:bg-[#0b0d12]/60'
                          : 'border-[#5865F2]/15 bg-gradient-to-r from-[#5865F2]/5 to-transparent hover:border-[#5865F2]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(String(mail.id)); }}
                      className="mail-action-btn shrink-0 rounded-lg p-1 hover:bg-white/10"
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-all ${
                          isSelected ? 'border-[#5865F2] bg-[#5865F2]' : 'border-white/30'
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStarMail(String(mail.id)); }}
                      className="mail-action-btn shrink-0 rounded-lg p-1 hover:bg-white/10"
                    >
                      <LuStar className={`h-4 w-4 ${mail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`} />
                    </button>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        mail.is_read
                          ? 'border-white/5 bg-white/5 text-white/20'
                          : 'border-[#5865F2]/30 bg-[#5865F2]/20 text-[#5865F2]'
                      }`}
                    >
                      {mail.is_read ? <LuMailOpen className="h-4 w-4" /> : <LuMail className="h-4 w-4" />}
                    </div>

                    <span className={`hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:inline-flex ${config.css}`}>
                      {t(config.labelKey)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h4 className={`truncate text-sm ${mail.is_read ? 'font-medium text-white/60' : 'font-bold text-white'}`}>
                        {mail.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/30">{previewText(mail.body, 80)}</p>
                    </div>

                    <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-white/30">
                      {formatDate(mail.created_at)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteMail(String(mail.id)); }}
                      className="mail-action-btn shrink-0 rounded-lg bg-white/5 p-2 text-white/30 opacity-0 transition hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100"
                    >
                      <LuTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/[0.06] bg-[#0b0d12]/30 px-4 py-3">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.05] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            >
              <LuCheckCheck className="h-4 w-4" />
              {t('mail_mark_all_read')}
            </button>
            <button
              type="button"
              onClick={onClaimAll}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#5865F2]/20 transition hover:shadow-[#5865F2]/40"
            >
              <LuGift className="h-4 w-4" />
              {t('mail_claim_all')}
            </button>
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden min-w-0 flex-1 lg:flex lg:flex-col">
          <MailDetailModal
            mail={selectedMail}
            variant="inline"
            onClose={onCloseMail}
            onDelete={onDeleteMail}
            onStar={onStarMail}
          />
        </div>
      </div>

      {/* Medium screens without 3rd panel: modal fallback when mail selected */}
      {selectedMail && (
        <div className="lg:hidden">
          <MailDetailModal
            mail={selectedMail}
            variant="modal"
            onClose={onCloseMail}
            onDelete={onDeleteMail}
            onStar={onStarMail}
          />
        </div>
      )}
    </div>
  );
}
