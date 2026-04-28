"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import MailDetailModal from './MailDetailModal';
import type { MailItem } from '../types';
import {
  LuMail, LuMailOpen, LuTrash2,
  LuRefreshCw, LuSearch, LuInbox,
  LuStar, LuCheckCheck,
  LuMegaphone, LuWrench, LuGift,
  LuReceipt, LuChevronLeft, LuChevronDown, LuChevronUp,
  LuArchive, LuTag, LuSparkles,
} from 'react-icons/lu';

const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;?/g, ' ');

const previewText = (s?: string, max = 100) => {
  const t = stripHtml(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const CATEGORY_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode; css: string }> = {
  announcement: {
    labelKey: 'mail_category_announcement',
    icon: <LuMegaphone />,
    css: 'border-[#5865F2]/30 bg-[#5865F2]/10 text-[#5865F2]',
  },
  system: {
    labelKey: 'mail_category_system',
    icon: <LuMail />,
    css: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
  maintenance: {
    labelKey: 'mail_category_maintenance',
    icon: <LuWrench />,
    css: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  sponsor: {
    labelKey: 'mail_category_sponsor',
    icon: <LuStar />,
    css: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  },
  update: {
    labelKey: 'mail_category_update',
    icon: <LuSparkles />,
    css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
  lottery: {
    labelKey: 'mail_category_lottery',
    icon: <LuGift />,
    css: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  },
  reward: {
    labelKey: 'mail_category_reward',
    icon: <LuReceipt />,
    css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
  order: {
    labelKey: 'mail_category_order',
    icon: <LuTag />,
    css: 'border-white/20 bg-white/5 text-white/60',
  },
};

const FIXED_CATEGORIES = ['announcement', 'system', 'update', 'maintenance', 'reward', 'sponsor', 'order'] as const;

type MailSectionProps = {
  loading: boolean;
  error: string | null;
  items: MailItem[];
  onOpenMail?: (mail: MailItem) => void;
  onBack?: () => void;
};

export default function MailSection({
  loading,
  error,
  items,
  onOpenMail,
  onBack,
}: MailSectionProps) {
  const t = useT();
  const [activeCategory, setActiveCategory] = useState<'all' | string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  };

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Route-based modal sync
  useEffect(() => {
    const id = searchParams?.get('id') ?? null;
    const path = pathname ?? '';
    if (path.startsWith('/dashboard/mail')) {
      if (id) {
        const found = items.find(i => String(i.id) === String(id));
        if (found && (!selectedMail || String(selectedMail.id) !== String(found.id))) {
          setSelectedMail(found);
        }
      }
    } else {
      if (selectedMail) setSelectedMail(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Counts
  const countsTotal = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, { all: 0 });
  }, [items]);

  const countsUnread = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      const unread = item.is_read ? 0 : 1;
      acc.all = (acc.all ?? 0) + unread;
      acc[item.category] = (acc[item.category] ?? 0) + unread;
      return acc;
    }, { all: 0 });
  }, [items]);

  const filtered = useMemo(() => {
    let base = activeCategory === 'all' ? items.slice() : items.filter((item) => item.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(m => m.title.toLowerCase().includes(q) || stripHtml(m.body).toLowerCase().includes(q));
    }
    base.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return base;
  }, [items, activeCategory, sortOrder, searchQuery]);

  const getCurrentGuildPath = () => {
    const paramKeys = ['activity', 'frame_id', 'instance_id', 'guild_id'];
    const nextParams = new URLSearchParams();
    paramKeys.forEach((key) => {
      const value = searchParams?.get(key);
      if (value) nextParams.set(key, value);
    });
    const query = nextParams.toString();
    return `/dashboard/mail${query ? `?${query}` : ''}`;
  };

  const toggleSort = () => setSortOrder(s => (s === 'desc' ? 'asc' : 'desc'));

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const days = [t('mail_day_sun'), t('mail_day_mon'), t('mail_day_tue'), t('mail_day_wed'), t('mail_day_thu'), t('mail_day_fri'), t('mail_day_sat')];
      return days[d.getDay()];
    } else {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const visibleIds = filtered.map(m => String(m.id));
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);
    if (allSelected) {
      for (const id of visibleIds) newSet.delete(id);
    } else {
      for (const id of visibleIds) newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const navItems = [
    { key: 'all', label: t('mail_category_all'), icon: <LuInbox /> },
    ...FIXED_CATEGORIES.map(cat => ({
      key: cat,
      label: t(CATEGORY_CONFIG[cat].labelKey),
      icon: CATEGORY_CONFIG[cat].icon ?? <LuMail />,
    })),
  ];

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#0b0d12] flex flex-col">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5 md:px-8 md:py-4 bg-white/[0.02]">
        <div className="flex items-center gap-2 md:gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:gap-1.5 md:px-3 md:py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-white/60 transition-all hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white"
            >
              <LuChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">{t('mail_back_button')}</span>
            </button>
          )}
          {/* Mobile sidebar toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 hover:bg-white/[0.08] transition-all"
          >
            <LuInbox className="w-3.5 h-3.5" /> {t('mail_folders_label')}
          </button>
          <div className="hidden md:block p-2.5 bg-gradient-to-br from-[#5865F2] to-indigo-600 rounded-xl shadow-lg shadow-[#5865F2]/20">
            <LuMail className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5865F2]">{t('mail_section_header_label')}</p>
            <h2 className="text-lg font-bold text-white tracking-tight">{t('mail_box_title')}</h2>
          </div>
          {/* Mobile title */}
          <span className="md:hidden text-sm font-bold text-white">{t('mail_mobile_title')}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-medium text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{countsTotal.all ?? 0}</span>
            <span className="hidden sm:inline">{t('mail_messages_label')}</span>
            <span className="text-white/20">&middot;</span>
            <span className="text-[#5865F2]">{countsUnread.all ?? 0}</span>
            <span className="hidden sm:inline">{t('mail_unread_label')}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 min-h-0">

        {/* SIDEBAR - Desktop: inline, Mobile: drawer overlay */}
        {isMobile && (
          <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          </div>
        )}
        <div className={`${
          isMobile
            ? `fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'w-64'
        } flex flex-col border-r border-white/[0.06] bg-[#0b0d12]/98 backdrop-blur-2xl min-h-0`}>
          <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 custom-scrollbar">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 px-2">{t('mail_folders_label')}</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeCategory === item.key;
                const count = countsUnread[item.key] ?? 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { setActiveCategory(item.key); if (isMobile) setSidebarOpen(false); }}
                    className={`group relative flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5865F2]/10 text-white shadow-[inset_4px_0_0_0_#5865F2]'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`text-lg transition-colors ${isActive ? 'text-[#5865F2]' : 'text-white/40 group-hover:text-white'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold ${
                        isActive ? 'bg-[#5865F2] text-white' : 'bg-white/10 text-white/60'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex-shrink-0 px-5 pb-5">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{t('mail_storage_label')}</p>
              <p className="text-xs text-white/50 mb-2">
                {t('mail_unread_count', { total: countsTotal.all, unread: countsUnread.all })}
              </p>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5865F2] to-indigo-500 transition-all"
                  style={{ width: `${countsTotal.all > 0 ? Math.min((countsUnread.all / countsTotal.all) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-transparent to-[#0b0d12]/20 min-w-0 min-h-0">

          {/* Search Bar */}
          <div className="flex-shrink-0 px-3 md:px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-[#5865F2]/30 transition-colors">
                <LuSearch className="w-4 h-4 text-white/30" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('mail_search_placeholder')}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30"
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex-shrink-0 px-3 md:px-6 py-2 md:py-3 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Select All - hidden on mobile */}
              <button
                onClick={selectAll}
                className="hidden md:flex p-2 rounded-lg hover:bg-white/5 transition-colors"
                title={t('mail_select_all_title')}
              >
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                  selectedIds.size > 0 ? 'bg-[#5865F2] border-[#5865F2]' : 'border-white/30'
                }`}>
                  {selectedIds.size > 0 && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Refresh */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mail:refresh'));
                  showToast(t('mail_refreshed'), 'success');
                }}
                className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                title={t('mail_refresh_title')}
              >
                <LuRefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Bulk actions when selected */}
              {selectedIds.size > 0 && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-0.5" />

                  <button
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      try {
                        const res = await fetchWithCreds(apiUrl('/api/mail'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                        if (!res.ok) { showToast(t('mail_delete_error_toast'), 'error'); return; }
                        showToast(t('mail_messages_deleted', { count: ids.length }), 'success');
                        setSelectedIds(new Set());
                        window.dispatchEvent(new CustomEvent('mail:refresh'));
                      } catch {
                        showToast(t('mail_delete_error_toast'), 'error');
                      }
                    }}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-rose-400 transition-colors"
                    title={t('mail_delete_title')}
                  >
                    <LuTrash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>

                  <button
                    onClick={async () => {
                      const ids = Array.from(selectedIds);
                      try {
                        const res = await fetchWithCreds(apiUrl('/api/mail'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                        if (!res.ok) { showToast(t('mail_action_error'), 'error'); return; }
                        showToast(t('mail_marked_read'), 'success');
                        setSelectedIds(new Set());
                        window.dispatchEvent(new CustomEvent('mail:refresh'));
                      } catch {
                        showToast(t('mail_action_error'), 'error');
                      }
                    }}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-[#5865F2] transition-colors"
                    title={t('mail_read_title')}
                  >
                    <LuMailOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>

                  <span className="text-[10px] font-bold text-[#5865F2] ml-0.5">{t('mail_selected_count', { count: selectedIds.size })}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] md:text-xs text-white/35">
              <span className="hidden sm:inline">{filtered.length > 0 ? '1' : '0'}–{filtered.length} / {filtered.length}</span>
              <span className="sm:hidden">{filtered.length}</span>
              <button
                onClick={toggleSort}
                title={sortOrder === 'desc' ? t('mail_sort_newest') : t('mail_sort_oldest')}
                className="p-1 md:p-1.5 rounded-lg hover:bg-white/5 text-white/35 hover:text-white transition-colors"
              >
                {sortOrder === 'desc' ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mail List */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1.5 md:space-y-2 custom-scrollbar">
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 text-white/50">
                <LuRefreshCw className="w-8 h-8 animate-spin mb-3" />
                <span className="text-sm">{t('mail_loading')}</span>
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <LuArchive className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white font-bold">{t('mail_empty_box_title')}</p>
                <p className="text-sm text-white/40 mt-1">{t('mail_empty_box_subtitle2')}</p>
              </div>
            )}

            {!loading && !error && filtered.map((mail) => {
              const config = CATEGORY_CONFIG[mail.category] ?? CATEGORY_CONFIG.order;
              const isSelected = selectedIds.has(String(mail.id));

              return (
                <div
                  key={mail.id}
                  className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-[#5865F2]/30 bg-[#5865F2]/10'
                      : mail.is_read
                        ? 'border-white/5 bg-[#0b0d12]/40 opacity-70 hover:opacity-100 hover:bg-[#0b0d12]/60 hover:border-white/10'
                        : 'border-[#5865F2]/20 bg-gradient-to-r from-[#5865F2]/5 to-transparent hover:border-[#5865F2]/40 hover:shadow-[0_10px_30px_-10px_rgba(88,101,242,0.15)]'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.mail-action-btn')) return;
                    if (onOpenMail) {
                      onOpenMail(mail);
                    } else {
                      setSelectedMail(mail);
                    }
                  }}
                >
                  {/* Desktop layout */}
                  <div className="hidden md:flex items-center gap-4 p-4">
                    {/* Checkbox */}
                    <div className="mail-action-btn flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(String(mail.id)); }}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                          isSelected ? 'bg-[#5865F2] border-[#5865F2]' : 'border-white/30'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Star */}
                    <div className="mail-action-btn flex-shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const method = mail.is_starred ? 'DELETE' : 'POST';
                            const res = await fetchWithCreds(apiUrl('/api/mail/star'), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(mail.id) }) });
                            if (!res.ok) { showToast(t('mail_star_failed'), 'error'); return; }
                            window.dispatchEvent(new CustomEvent('mail:refresh'));
                          } catch {
                            showToast(t('mail_star_failed'), 'error');
                          }
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <LuStar className={`w-4 h-4 transition-colors ${mail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`} />
                      </button>
                    </div>

                    {/* Read/Unread icon */}
                    <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                      mail.is_read
                        ? 'border-white/5 bg-white/5 text-white/20'
                        : 'border-[#5865F2]/30 bg-[#5865F2]/20 text-[#5865F2] shadow-[0_0_15px_rgba(88,101,242,0.3)]'
                    }`}>
                      {mail.is_read ? <LuMailOpen className="w-5 h-5" /> : <LuMail className="w-5 h-5" />}
                    </div>

                    {/* Category badge */}
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.css}`}>
                        <span className="text-sm">{config.icon}</span>
                        <span>{t(config.labelKey)}</span>
                      </span>
                    </div>

                    {/* Title & preview */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm truncate ${mail.is_read ? 'font-medium text-white/60' : 'font-bold text-white'}`}>
                        {mail.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-white/30 line-clamp-1 group-hover:text-white/50 transition-colors">
                        {previewText(mail.body, 80)}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="flex-shrink-0 text-[10px] font-medium text-white/30 whitespace-nowrap">
                      {formatDate(mail.created_at)}
                    </div>

                    {/* Delete */}
                    <div className="mail-action-btn flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetchWithCreds(apiUrl('/api/mail'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [mail.id] }) });
                            if (!res.ok) { showToast(t('mail_delete_error_toast'), 'error'); return; }
                            showToast(t('mail_deleted_toast'), 'success');
                            window.dispatchEvent(new CustomEvent('mail:refresh'));
                          } catch {
                            showToast(t('mail_delete_error_toast'), 'error');
                          }
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout - compact, text-focused */}
                  <div className="flex md:hidden items-start gap-3 p-3">
                    {/* Unread indicator dot */}
                    <div className="flex-shrink-0 pt-1.5">
                      {!mail.is_read ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#5865F2] shadow-[0_0_8px_rgba(88,101,242,0.5)]" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.css}`}>
                          {t(config.labelKey)}
                        </span>
                        <span className="text-[10px] text-white/25 ml-auto flex-shrink-0">
                          {formatDate(mail.created_at)}
                        </span>
                      </div>
                      <h4 className={`text-[13px] leading-snug ${mail.is_read ? 'font-medium text-white/55' : 'font-bold text-white'}`}>
                        {mail.title}
                      </h4>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-white/30 line-clamp-2">
                        {previewText(mail.body, 120)}
                      </p>
                    </div>

                    {/* Star - only show if starred */}
                    {mail.is_starred && (
                      <div className="flex-shrink-0 pt-1">
                        <LuStar className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0b0d12]/30 px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-end gap-2 md:gap-3 backdrop-blur-md">
            <button
              type="button"
              onClick={async () => {
                const ids = filtered.filter(m => !m.is_read && m.category !== 'reward').map(m => m.id);
                if (ids.length === 0) return showToast(t('mail_no_unread'), 'error');
                try {
                  const res = await fetchWithCreds(apiUrl('/api/mail'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                  if (!res.ok) { showToast(t('mail_action_failed'), 'error'); return; }
                  showToast(t('mail_all_read'), 'success');
                  window.dispatchEvent(new CustomEvent('mail:refresh'));
                } catch {
                  showToast(t('mail_action_failed'), 'error');
                }
              }}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] text-[11px] md:text-xs font-semibold text-white/60 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <LuCheckCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('mail_mark_all_read')}
            </button>

            <button
              type="button"
              onClick={async () => {
                const ids = filtered.filter(m => m.category === 'reward' && !m.is_read).map(m => m.id);
                if (ids.length === 0) return showToast(t('mail_rewards_no_target'), 'error');
                try {
                  const res = await fetchWithCreds(apiUrl('/api/mail/claim-rewards'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    showToast(data.error === 'already_claimed' ? t('mail_rewards_already_claimed') : t('mail_claim_failed'), 'error');
                    return;
                  }
                  const claimed = data.claimed ?? 0;
                  showToast(claimed > 0 ? t('mail_rewards_claimed_toast', { amount: claimed.toFixed(2) }) : t('mail_rewards_claimed_generic'), 'success');
                  window.dispatchEvent(new CustomEvent('mail:refresh'));
                  // Bakiye güncelleme eventi
                  window.dispatchEvent(new CustomEvent('wallet:refresh'));
                } catch {
                  showToast(t('mail_claim_failed'), 'error');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 md:px-5 py-2 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 text-[11px] md:text-xs font-bold text-white shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/40 transition-all"
            >
              <LuGift className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t('mail_claim_all')}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.open && (
        <div className={`fixed right-6 bottom-6 z-[9999] rounded-xl px-5 py-3 shadow-2xl text-sm font-medium backdrop-blur-xl border ${
          toast.type === 'success'
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Mail detail modal */}
      {selectedMail && (
        <MailDetailModal
          mail={selectedMail}
          onClose={() => {
            setSelectedMail(null);
            try { router.push(getCurrentGuildPath()); } catch {}
          }}
          onDelete={async (id) => {
            try {
              const res = await fetch(apiUrl('/api/mail'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
              if (!res.ok) { showToast(t('mail_delete_error_toast'), 'error'); return; }
              showToast(t('mail_deleted_toast'), 'success');
              setSelectedMail(null);
              try { router.push(getCurrentGuildPath()); } catch {}
              window.dispatchEvent(new CustomEvent('mail:refresh'));
            } catch { showToast(t('mail_delete_error_toast'), 'error'); }
          }}
          onStar={async (id) => {
            try {
              const method = selectedMail?.is_starred ? 'DELETE' : 'POST';
              const res = await fetch(apiUrl('/api/mail/star'), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(id) }) });
              if (!res.ok) { showToast(t('mail_star_failed'), 'error'); return; }
              window.dispatchEvent(new CustomEvent('mail:refresh'));
            } catch { showToast(t('mail_star_failed'), 'error'); }
          }}
        />
      )}
    </section>
  );
}
