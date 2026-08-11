'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/contexts/LocaleContext';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import type { MailItem } from '../types';
import { buildMailNavItems, stripHtml } from './mailShared';
import MailDesktopView from './MailDesktopView';
import MailMobileView from './MailMobileView';

type MailSectionProps = {
  loading: boolean;
  error: string | null;
  items: MailItem[];
  onOpenMail?: (mail: MailItem) => void;
  onBack?: () => void;
  /** @deprecated kept for API compat; mobile no longer uses overlay header */
  fabHeaderRight?: React.ReactNode;
};

export default function MailSection({
  loading,
  error,
  items,
  onOpenMail,
  onBack,
}: MailSectionProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeCategory, setActiveCategory] = useState<'all' | string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedMail) return;
    const next = items.find((i) => String(i.id) === String(selectedMail.id));
    if (next) setSelectedMail(next);
    else setSelectedMail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedMail?.id]);

  useEffect(() => {
    const id = searchParams?.get('id') ?? null;
    const path = pathname ?? '';
    if (path.startsWith('/dashboard/mail') && id) {
      const found = items.find((i) => String(i.id) === String(id));
      if (found && (!selectedMail || String(selectedMail.id) !== String(found.id))) {
        setSelectedMail(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams, items]);

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
      base = base.filter(
        (m) => m.title.toLowerCase().includes(q) || stripHtml(m.body).toLowerCase().includes(q),
      );
    }
    base.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return base;
  }, [items, activeCategory, sortOrder, searchQuery]);

  const navItems = useMemo(() => buildMailNavItems(t), [t]);

  const getCurrentGuildPath = useCallback(() => {
    const paramKeys = ['activity', 'frame_id', 'instance_id', 'guild_id'];
    const nextParams = new URLSearchParams();
    paramKeys.forEach((key) => {
      const value = searchParams?.get(key);
      if (value) nextParams.set(key, value);
    });
    const query = nextParams.toString();
    return `/dashboard/mail${query ? `?${query}` : ''}`;
  }, [searchParams]);

  const formatDate = useCallback(
    (date: string) => {
      const d = new Date(date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
      if (diffDays < 7) {
        const days = [
          t('mail_day_sun'),
          t('mail_day_mon'),
          t('mail_day_tue'),
          t('mail_day_wed'),
          t('mail_day_thu'),
          t('mail_day_fri'),
          t('mail_day_sat'),
        ];
        return days[d.getDay()];
      }
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    },
    [t],
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const visibleIds = filtered.map((m) => String(m.id));
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      for (const id of visibleIds) next.delete(id);
    } else {
      for (const id of visibleIds) next.add(id);
    }
    setSelectedIds(next);
  };

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent('mail:refresh'));
    showToast(t('mail_refreshed'), 'success');
  };

  const handleMarkAllRead = async () => {
    const ids = filtered.filter((m) => !m.is_read && m.category !== 'reward').map((m) => m.id);
    if (ids.length === 0) return showToast(t('mail_no_unread'), 'error');
    try {
      const res = await fetchWithCreds(apiUrl('/api/mail'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        showToast(t('mail_action_failed'), 'error');
        return;
      }
      showToast(t('mail_all_read'), 'success');
      window.dispatchEvent(new CustomEvent('mail:refresh'));
    } catch {
      showToast(t('mail_action_failed'), 'error');
    }
  };

  const handleClaimAll = async () => {
    const ids = filtered.filter((m) => m.category === 'reward' && !m.is_read).map((m) => m.id);
    if (ids.length === 0) return showToast(t('mail_rewards_no_target'), 'error');
    try {
      const res = await fetchWithCreds(apiUrl('/api/mail/claim-rewards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          data.error === 'already_claimed' ? t('mail_rewards_already_claimed') : t('mail_claim_failed'),
          'error',
        );
        return;
      }
      const claimed = data.claimed ?? 0;
      showToast(
        claimed > 0
          ? t('mail_rewards_claimed_toast', { amount: claimed.toFixed(2) })
          : t('mail_rewards_claimed_generic'),
        'success',
      );
      window.dispatchEvent(new CustomEvent('mail:refresh'));
      window.dispatchEvent(new CustomEvent('wallet:refresh'));
    } catch {
      showToast(t('mail_claim_failed'), 'error');
    }
  };

  const openMail = (mail: MailItem) => {
    setSelectedMail(mail);
    if (onOpenMail) void onOpenMail(mail);
  };

  const closeMail = () => {
    setSelectedMail(null);
    try {
      router.push(getCurrentGuildPath());
    } catch {
      // ignore
    }
  };

  const handleDeleteMail = async (id: string) => {
    try {
      const res = await fetchWithCreds(apiUrl('/api/mail'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) {
        showToast(t('mail_delete_error_toast'), 'error');
        return;
      }
      showToast(t('mail_deleted_toast'), 'success');
      setSelectedMail(null);
      window.dispatchEvent(new CustomEvent('mail:refresh'));
    } catch {
      showToast(t('mail_delete_error_toast'), 'error');
    }
  };

  const handleStarMail = async (id: string) => {
    try {
      const mail = items.find((m) => String(m.id) === String(id));
      const method = mail?.is_starred ? 'DELETE' : 'POST';
      const res = await fetchWithCreds(apiUrl('/api/mail/star'), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(id) }),
      });
      if (!res.ok) {
        showToast(t('mail_star_failed'), 'error');
        return;
      }
      window.dispatchEvent(new CustomEvent('mail:refresh'));
    } catch {
      showToast(t('mail_star_failed'), 'error');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await fetchWithCreds(apiUrl('/api/mail'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        showToast(t('mail_delete_error_toast'), 'error');
        return;
      }
      showToast(t('mail_messages_deleted', { count: ids.length }), 'success');
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent('mail:refresh'));
    } catch {
      showToast(t('mail_delete_error_toast'), 'error');
    }
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await fetchWithCreds(apiUrl('/api/mail'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        showToast(t('mail_action_error'), 'error');
        return;
      }
      showToast(t('mail_marked_read'), 'success');
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent('mail:refresh'));
    } catch {
      showToast(t('mail_action_error'), 'error');
    }
  };

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0b0d12]">
      <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full bg-[#5865F2]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />

      <MailMobileView
        loading={loading}
        error={error}
        filtered={filtered}
        navItems={navItems}
        activeCategory={activeCategory}
        countsUnread={countsUnread}
        searchQuery={searchQuery}
        sortOrder={sortOrder}
        selectedMail={selectedMail}
        onSearchChange={setSearchQuery}
        onToggleSort={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
        onCategoryChange={setActiveCategory}
        onOpenMail={openMail}
        onCloseMail={closeMail}
        onDeleteMail={handleDeleteMail}
        onStarMail={handleStarMail}
        onBack={onBack}
        onMarkAllRead={handleMarkAllRead}
        onClaimAll={handleClaimAll}
        formatDate={formatDate}
      />

      <MailDesktopView
        loading={loading}
        error={error}
        filtered={filtered}
        navItems={navItems}
        activeCategory={activeCategory}
        countsTotal={countsTotal}
        countsUnread={countsUnread}
        searchQuery={searchQuery}
        sortOrder={sortOrder}
        selectedIds={selectedIds}
        selectedMail={selectedMail}
        onBack={onBack}
        onSearchChange={setSearchQuery}
        onToggleSort={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
        onCategoryChange={setActiveCategory}
        onSelectMail={openMail}
        onCloseMail={closeMail}
        onRefresh={handleRefresh}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onMarkAllRead={handleMarkAllRead}
        onClaimAll={handleClaimAll}
        onBulkDelete={handleBulkDelete}
        onBulkMarkRead={handleBulkMarkRead}
        onDeleteMail={handleDeleteMail}
        onStarMail={handleStarMail}
        formatDate={formatDate}
      />

      {toast.open && (
        <div
          className={`fixed bottom-28 right-4 z-[9999] rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl md:bottom-6 md:right-6 ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/20 text-rose-300'
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
