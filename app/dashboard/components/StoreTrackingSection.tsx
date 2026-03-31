'use client';

import { useEffect, useState } from 'react';
import type { Order } from '../types';
import { useT } from '@/contexts/LocaleContext';

type StoreTrackingSectionProps = {
  ordersLoading: boolean;
  orders: Order[];
};

export default function StoreTrackingSection({ ordersLoading, orders }: StoreTrackingSectionProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const paidOrders = orders.filter((order) => order.status === 'paid');
  const activeOrders = paidOrders.filter((order) => {
    if (!order.expires_at) return true;
    return new Date(order.expires_at) > now;
  });
  const expiredOrders = paidOrders.filter((order) =>
    order.expires_at ? new Date(order.expires_at) <= now : false,
  );

  const groupedActiveOrders = activeOrders.reduce((acc, order) => {
    const key = order.role_id ?? order.item_title ?? order.id;
    const title = order.item_title ?? t('tracking_role_custom');
    const expiresAt = order.expires_at ? new Date(order.expires_at) : null;
    const existing = acc.get(key);

    if (!existing) {
      acc.set(key, {
        key,
        title,
        count: 1,
        earliestCreatedAt: new Date(order.created_at),
        latestExpiresAt: expiresAt,
        permanent: !order.expires_at,
        totalDurationDays: order.duration_days && order.duration_days > 0 ? order.duration_days : 0,
        orders: [order],
      });
      return acc;
    }

    existing.count += 1;
    if (order.duration_days && order.duration_days > 0) {
      existing.totalDurationDays += order.duration_days;
    }
    const createdAt = new Date(order.created_at);
    if (createdAt < existing.earliestCreatedAt) {
      existing.earliestCreatedAt = createdAt;
    }
    if (!order.expires_at) {
      existing.permanent = true;
      existing.latestExpiresAt = null;
    } else if (!existing.permanent && expiresAt && (!existing.latestExpiresAt || expiresAt > existing.latestExpiresAt)) {
      existing.latestExpiresAt = expiresAt;
    }
    existing.orders.push(order);
    return acc;
  }, new Map<string, {
    key: string;
    title: string;
    count: number;
    earliestCreatedAt: Date;
    latestExpiresAt: Date | null;
    permanent: boolean;
    totalDurationDays: number;
    orders: Order[];
  }>());

  const activeGroups = Array.from(groupedActiveOrders.values());
  const expiredGroupKeys = new Set(
    expiredOrders.map((order) => order.role_id ?? order.item_title ?? order.id),
  );

  const getStackedRemainingLabel = (group: (typeof activeGroups)[number]) => {
    if (group.permanent) return t('tracking_permanent');
    const sorted = [...group.orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const first = sorted[0];
    const firstExpiresAt = first?.expires_at ? new Date(first.expires_at) : null;
    if (!firstExpiresAt) return t('tracking_permanent');

    // duration_days now stores minutes
    const extraMinutes = sorted
      .slice(1)
      .reduce((sum, order) => sum + (order.duration_days && order.duration_days > 0 ? order.duration_days : 0), 0);
    const baseSeconds = Math.max(0, Math.floor((firstExpiresAt.getTime() - now.getTime()) / 1000));
    const totalSeconds = baseSeconds + extraMinutes * 60;

    if (totalSeconds <= 0) return t('tracking_expired');
    const totalDays = Math.floor(totalSeconds / 86400);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const seconds = totalSeconds % 60;
    const parts = [] as string[];
    if (months > 0) parts.push(t('tracking_duration_months', { count: months }));
    if (days > 0) parts.push(t('tracking_duration_days', { count: days }));
    parts.push(t('tracking_duration_hours', { count: hours }));
    parts.push(t('tracking_duration_seconds', { count: seconds }));
    return parts.join(' ');
  };

  const getStackedEndDate = (group: (typeof activeGroups)[number]) => {
    if (group.permanent) return null;
    const sorted = [...group.orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const first = sorted[0];
    const firstExpiresAt = first?.expires_at ? new Date(first.expires_at) : null;
    if (!firstExpiresAt) return null;

    // duration_days now stores minutes
    const extraMinutes = sorted
      .slice(1)
      .reduce((sum, order) => sum + (order.duration_days && order.duration_days > 0 ? order.duration_days : 0), 0);
    return new Date(firstExpiresAt.getTime() + extraMinutes * 60000);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-white/5 bg-gradient-to-br from-indigo-500/15 via-white/5 to-transparent p-8 shadow-[0_25px_60px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">{t('tracking_section_label')}</p>
            <h2 className="mt-2 text-2xl font-semibold">{t('tracking_section_title')}</h2>
            <p className="mt-2 text-sm text-white/60">{t('tracking_section_subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {t('tracking_live_update')}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/70">{t('tracking_active_role_label')}</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-100">{activeGroups.length}</p>
          <p className="mt-2 text-xs text-emerald-100/60">{t('tracking_active_role_subtitle')}</p>
        </div>
        <div className="rounded-2xl border border-rose-400/10 bg-rose-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-100/70">{t('tracking_expired_label')}</p>
          <p className="mt-2 text-3xl font-semibold text-rose-100">{expiredGroupKeys.size}</p>
          <p className="mt-2 text-xs text-rose-100/60">{t('tracking_expired_subtitle')}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{t('tracking_active_roles_title')}</h3>
            <p className="text-xs text-white/50">{t('tracking_active_roles_subtitle')}</p>
          </div>
          <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] text-white/50">
            {t('tracking_total_label', { count: activeGroups.length })}
          </span>
        </div>

        {ordersLoading ? (
          <p className="mt-3 text-sm text-white/60">{t('transactions_loading')}</p>
        ) : activeGroups.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {activeGroups.map((group) => (
              <div key={group.key} className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 via-[#0b0d12]/80 to-transparent p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white/80">{group.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                      <span className="rounded-full border border-white/5 px-2 py-1">
                        {t('tracking_purchase_count', { count: group.count })}
                      </span>
                      <span className="rounded-full border border-white/5 px-2 py-1">
                        {t('tracking_start_date', { date: group.earliestCreatedAt.toLocaleDateString('tr-TR') })}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                    {getStackedRemainingLabel(group)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/50">
                  <span className="rounded-full border border-white/5 px-2 py-1">
                    {group.permanent
                      ? t('tracking_permanent')
                      : (() => {
                        const stackedEnd = getStackedEndDate(group);
                        return stackedEnd ? t('tracking_end_date', { date: stackedEnd.toLocaleDateString('tr-TR') }) : t('tracking_permanent');
                      })()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/60">{t('tracking_no_active')}</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/40">{t('tracking_tips_title')}</h3>
        <ul className="mt-4 space-y-3 text-sm text-white/60">
          <li className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            {t('tracking_tip1')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            {t('tracking_tip2')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            {t('tracking_tip3')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            {t('tracking_tip4')}
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
            {t('tracking_tip5')}
          </li>
        </ul>
      </div>
    </section>
  );
}
