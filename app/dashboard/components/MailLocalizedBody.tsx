'use client';

import Image from 'next/image';
import type { MailItem } from '../types';
import { getMailMeta, type MailT } from '@/lib/mailI18n';
import { LuGift, LuPackage, LuShoppingBag } from 'react-icons/lu';

type Props = {
  mail: MailItem;
  template: 'order' | 'earn_claim';
  t: MailT;
};

const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return 0;
};

export default function MailLocalizedBody({ mail, template, t }: Props) {
  const meta = getMailMeta(mail);

  if (template === 'earn_claim') {
    const total = num(meta.total ?? meta.totalTransferred);
    const messageTotal = num(meta.messageTotal ?? meta.message_total);
    const voiceTotal = num(meta.voiceTotal ?? meta.voice_total);
    const rowCount = num(meta.rowCount ?? meta.row_count);

    return (
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-amber-400/20 bg-white/[0.03]">
        <div className="min-w-0 px-4 py-4">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
            {t('mail_earn_summary')}
          </p>
          <p className="mb-4 break-words text-sm leading-relaxed text-white/70">{t('mail_earn_body')}</p>
          <div className="min-w-0 space-y-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/40">{t('mail_earn_total')}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <Image src="/papel.gif" alt="" width={14} height={14} className="h-3.5 w-3.5" unoptimized />
                {total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/40">{t('mail_earn_message')}</span>
              <span className="text-sm font-semibold text-white">
                {messageTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/40">{t('mail_earn_voice')}</span>
              <span className="text-sm font-semibold text-white">
                {voiceTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
              </span>
            </div>
            {rowCount > 0 ? (
              <p className="pt-1 text-[11px] text-white/35">{t('mail_earn_rows', { count: rowCount })}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const orderId = String(meta.order_id ?? meta.orderId ?? '');
  const items = Array.isArray(meta.items) ? meta.items : [];
  const subtotal = num(meta.subtotal);
  const discount = num(meta.discount);
  const total = num(meta.total);

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#5865F2]/25 bg-white/[0.03]">
      <div className="min-w-0 space-y-3 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#5865F2]/25 bg-[#5865F2]/15 text-[#a5b4ff]">
            <LuPackage className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-white">{t('mail_title_order_confirmed')}</p>
            {orderId ? (
              <p className="mt-1 break-all font-mono text-[11px] text-white/40">
                {t('mail_order_number')}: {orderId}
              </p>
            ) : null}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="min-w-0 rounded-xl border border-white/[0.06] bg-black/20 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              {t('mail_order_items')}
            </p>
            <ul className="min-w-0 space-y-2">
              {items.map((raw, idx) => {
                const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
                const title = String(item.title ?? '—');
                const qty = num(item.qty) || 1;
                const lineTotal = num(item.total ?? item.price);
                return (
                  <li
                    key={`${title}-${idx}`}
                    className="flex min-w-0 items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 break-words text-white/80">
                      {title}{' '}
                      <span className="text-white/40">{t('mail_order_qty', { qty })}</span>
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 font-semibold tabular-nums text-white">
                      <Image src="/papel.gif" alt="" width={12} height={12} className="h-3 w-3" unoptimized />
                      {lineTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="min-w-0 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-black/20 px-3 py-1">
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs text-white/40">
              <LuShoppingBag className="h-3.5 w-3.5" />
              {t('mail_order_subtotal')}
            </span>
            <span className="text-sm font-semibold text-white">
              {subtotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs text-white/40">
              <LuGift className="h-3.5 w-3.5" />
              {t('mail_order_discount')}
            </span>
            <span className="text-sm font-semibold text-white">
              {discount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs font-semibold text-white/55">{t('mail_order_total')}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-300">
              <Image src="/papel.gif" alt="" width={14} height={14} className="h-3.5 w-3.5" unoptimized />
              {total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <p className="break-words text-sm text-white/55">{t('mail_order_thanks')}</p>
      </div>
    </div>
  );
}
