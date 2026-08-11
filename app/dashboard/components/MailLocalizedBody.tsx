'use client';

import Image from 'next/image';
import type { MailItem } from '../types';
import { copyTextToClipboard } from '@/lib/clipboard';
import { getMailMeta, type MailT } from '@/lib/mailI18n';
import { useState } from 'react';
import {
  LuCheck,
  LuCircleX,
  LuCopy,
  LuGift,
  LuPackage,
  LuShoppingBag,
  LuTriangleAlert,
  LuWallet,
} from 'react-icons/lu';

type Props = {
  mail: MailItem;
  template:
    | 'order'
    | 'order_confirmed'
    | 'order_rejected'
    | 'earn_claim'
    | 'earn_rejected';
  t: MailT;
};

const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return 0;
};

function CopyButton({ value, t }: { value: string; t: MailT }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyTextToClipboard(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-left transition hover:border-white/20"
      title={t('mail_txn_copy_id')}
    >
      <span className="min-w-0 break-all font-mono text-[11px] text-white/50">{value}</span>
      {copied ? (
        <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <LuCopy className="h-3.5 w-3.5 shrink-0 text-white/25" />
      )}
    </button>
  );
}

function PapelAmount({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold tabular-nums ${className}`}>
      <Image src="/papel.gif" alt="" width={16} height={16} className="h-4 w-4" unoptimized />
      {amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
      <span className="text-xs font-semibold text-amber-400">Papel</span>
    </span>
  );
}

function orderReasonLabel(reason: string | null, t: MailT): string {
  if (!reason) return t('mail_order_reason_unknown');
  const key = `mail_order_reason_${reason}`;
  const translated = t(key);
  return translated === key ? reason : translated;
}

function earnReasonLabel(reason: string | null, t: MailT): string {
  if (!reason) return t('mail_earn_reason_unknown');
  const key = `mail_earn_reason_${reason}`;
  const translated = t(key);
  return translated === key ? reason : translated;
}

export default function MailLocalizedBody({ mail, template, t }: Props) {
  const meta = getMailMeta(mail);
  const isEarnReject = template === 'earn_rejected';
  const isEarn = template === 'earn_claim' || isEarnReject;
  const isOrderReject = template === 'order_rejected';
  const isOrder = template === 'order' || template === 'order_confirmed' || isOrderReject;

  if (isEarn) {
    const total = num(meta.total ?? meta.totalTransferred);
    const messageTotal = num(meta.messageTotal ?? meta.message_total);
    const voiceTotal = num(meta.voiceTotal ?? meta.voice_total);
    const reason = typeof meta.reason === 'string' ? meta.reason : null;
    const accentBorder = isEarnReject ? 'border-rose-500/25' : 'border-emerald-500/25';
    const accentIcon = isEarnReject
      ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';

    return (
      <div className={`w-full min-w-0 overflow-hidden rounded-2xl border ${accentBorder} bg-white/[0.03]`}>
        <div className="min-w-0 px-4 py-4">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
            {isEarnReject ? t('mail_earn_status_rejected') : t('mail_earn_status_credited')}
          </p>
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${accentIcon}`}>
              {isEarnReject ? <LuCircleX className="h-5 w-5" /> : <LuWallet className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white">DiscoWeb</p>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-white/[0.07]" />

        <div className="min-w-0 space-y-3 px-4 py-4">
          {total > 0 || !isEarnReject ? (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                {t('mail_earn_total')}
              </p>
              <PapelAmount
                amount={total}
                className={`text-3xl ${isEarnReject ? 'text-rose-300' : 'text-emerald-300'}`}
              />
            </div>
          ) : null}

          {isEarnReject ? (
            <div className="min-w-0 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-200/70">
                <LuTriangleAlert className="h-3.5 w-3.5" />
                {t('mail_earn_reject_reason')}
              </div>
              <p className="break-words text-sm leading-relaxed text-white/80 [overflow-wrap:anywhere]">
                {earnReasonLabel(reason, t)}
              </p>
            </div>
          ) : null}

          {(messageTotal > 0 || voiceTotal > 0 || !isEarnReject) && (
            <div className="min-w-0 space-y-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">{t('mail_earn_message')}</span>
                <PapelAmount amount={messageTotal} className="text-sm text-white" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">{t('mail_earn_voice')}</span>
                <PapelAmount amount={voiceTotal} className="text-sm text-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isOrder) return null;

  const orderId = String(meta.order_id ?? meta.orderId ?? '');
  const items = Array.isArray(meta.items) ? meta.items : [];
  const subtotal = num(meta.subtotal);
  const discount = num(meta.discount);
  const total = num(meta.total);
  const required = num(meta.required);
  const available = num(meta.available);
  const reason = typeof meta.reason === 'string' ? meta.reason : null;
  const accentBorder = isOrderReject ? 'border-rose-500/25' : 'border-emerald-500/25';
  const accentIcon = isOrderReject
    ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';

  return (
    <div className={`w-full min-w-0 overflow-hidden rounded-2xl border ${accentBorder} bg-white/[0.03]`}>
      <div className="min-w-0 px-4 py-4">
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
          {isOrderReject ? t('mail_order_status_rejected') : t('mail_order_status_confirmed')}
        </p>
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${accentIcon}`}>
            {isOrderReject ? <LuCircleX className="h-5 w-5" /> : <LuPackage className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-base font-semibold text-white">DiscoWeb</p>
            {orderId ? (
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <span className="shrink-0 text-[11px] text-white/35">{t('mail_order_number')}</span>
                <CopyButton value={orderId} t={t} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-4 border-t border-white/[0.07]" />

      <div className="min-w-0 space-y-3 px-4 py-4">
        {total > 0 || (!isOrderReject && subtotal > 0) ? (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              {isOrderReject ? t('mail_order_amount') : t('mail_order_total')}
            </p>
            <PapelAmount
              amount={total || subtotal}
              className={`text-3xl ${isOrderReject ? 'text-rose-300' : 'text-emerald-300'}`}
            />
          </div>
        ) : null}

        {isOrderReject ? (
          <div className="min-w-0 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-200/70">
              <LuTriangleAlert className="h-3.5 w-3.5" />
              {t('mail_order_reject_reason')}
            </div>
            <p className="break-words text-sm leading-relaxed text-white/80 [overflow-wrap:anywhere]">
              {orderReasonLabel(reason, t)}
            </p>
            {reason === 'insufficient_funds' && (required > 0 || available >= 0) ? (
              <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-white/55">
                {required > 0 ? (
                  <div className="flex justify-between gap-2">
                    <span>{t('mail_order_required')}</span>
                    <PapelAmount amount={required} className="text-sm text-white" />
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <span>{t('mail_order_available')}</span>
                  <PapelAmount amount={available} className="text-sm text-white" />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

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
                    <PapelAmount amount={lineTotal} className="shrink-0 text-sm text-white" />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!isOrderReject ? (
          <div className="min-w-0 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-black/20 px-3 py-1">
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="inline-flex items-center gap-2 text-xs text-white/40">
                <LuShoppingBag className="h-3.5 w-3.5" />
                {t('mail_order_subtotal')}
              </span>
              <PapelAmount amount={subtotal} className="text-sm text-white" />
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="inline-flex items-center gap-2 text-xs text-white/40">
                <LuGift className="h-3.5 w-3.5" />
                {t('mail_order_discount')}
              </span>
              <PapelAmount amount={discount} className="text-sm text-white" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
