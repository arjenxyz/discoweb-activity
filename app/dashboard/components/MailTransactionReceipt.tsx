'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import type { MailItem } from '../types';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  LuCheck,
  LuCopy,
  LuGift,
  LuMessageSquareText,
  LuPercent,
  LuShoppingBag,
  LuTicket,
  LuTimer,
  LuUser,
  LuUsers,
} from 'react-icons/lu';

export type MailTxnKind = 'transfer' | 'promotion' | 'discount';

type TransferMeta = {
  kind: 'transfer';
  amount: number;
  note: string | null;
  senderId: string | null;
  senderUsername: string | null;
  senderAvatarUrl: string | null;
};

type PromoMeta = {
  kind: 'promotion';
  amount: number;
  code: string | null;
  balanceAfter: number | null;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByAvatarUrl: string | null;
};

type DiscountMeta = {
  kind: 'discount';
  code: string | null;
  percent: number;
  minSpend: number | null;
  maxUses: number | null;
  perUserLimit: number | null;
  expiresAt: string | null;
  note: string | null;
  noteKey: string | null;
};

export type ParsedTxn =
  | { kind: 'transfer'; data: TransferMeta }
  | { kind: 'promotion'; data: PromoMeta }
  | { kind: 'discount'; data: DiscountMeta };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
};

const normalizeMeta = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
};

const stripHtml = (input: string): string =>
  input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

/** metadata + body fallback — eski mailler için de çalışır */
export function parseMailTransaction(mail: MailItem): ParsedTxn | null {
  const meta = normalizeMeta(mail.metadata);
  const kind = str(meta.kind);
  const bodyRaw = mail.body ?? '';
  const body = stripHtml(bodyRaw);
  const title = mail.title ?? '';

  const hasDiscountMeta =
    num(meta.percent) != null && Boolean(str(meta.code) ?? str(meta.discount_code));

  const isTransfer =
    kind === 'transfer' ||
    /papel\s*transferi/i.test(title) ||
    /papel\s*transfer/i.test(title);

  const isDiscount =
    kind === 'discount' ||
    hasDiscountMeta ||
    /yeni\s+indirim\s*kodu/i.test(title) ||
    /özel\s+promosyon\s*kodu/i.test(title) ||
    /yeni\s+özel\s+promosyon/i.test(title) ||
    /discount\s*code/i.test(title) ||
    (/indirim\s*oran/i.test(body) && /minimum\s*sepet/i.test(body));

  const isPromo =
    !isDiscount &&
    (kind === 'promotion' ||
      /promosyon\s*kodu\s*kullanıldı/i.test(title) ||
      /promosyon\s*kodu/i.test(title) ||
      /promo(tion)?\s*code/i.test(title));

  if (isTransfer) {
    const amountFromBody =
      body.match(/Size\s+([\d.,]+)\s+Papel/i)?.[1] ??
      body.match(/([\d.,]+)\s+Papel\s+(gönderildi|sent)/i)?.[1];
    const amount =
      num(meta.amount) ??
      (amountFromBody ? Number(String(amountFromBody).replace(',', '.')) : null) ??
      0;

    const noteFromBody =
      body.match(/(?:Açıklama|Note|Description)\s*:\s*(.+)/is)?.[1]?.trim() ?? null;
    const note = str(meta.note) ?? noteFromBody;

    const senderFromBody =
      body.match(/(?:Gönderen|From|Sender)\s*:\s*(.+)/i)?.[1]?.trim() ?? null;

    return {
      kind: 'transfer',
      data: {
        kind: 'transfer',
        amount,
        note,
        senderId: str(meta.senderId) ?? str(meta.sender_id),
        senderUsername:
          str(meta.senderUsername) ??
          str(meta.sender_username) ??
          str(mail.author_name) ??
          senderFromBody,
        senderAvatarUrl:
          str(meta.senderAvatarUrl) ??
          str(meta.sender_avatar_url) ??
          str(mail.author_avatar_url),
      },
    };
  }

  if (isDiscount) {
    const percentFromBody =
      body.match(/(?:İndirim(?:\s*Oranı)?|Discount(?:\s*rate)?)\s*:\s*%?\s*([\d.,]+)/i)?.[1] ??
      body.match(/%\s*([\d.,]+)/)?.[1];
    const percent =
      num(meta.percent) ??
      (percentFromBody ? Number(String(percentFromBody).replace(',', '.')) : null) ??
      0;

    const codeFromTitle =
      title.match(/:\s*([A-Z0-9_-]{3,})/i)?.[1]?.toUpperCase() ??
      title.match(/\b([A-Z0-9_-]{4,})\s*$/i)?.[1]?.toUpperCase() ??
      null;
    const codeFromBody =
      body.match(/^([A-Z0-9_-]+)\s+indirim/im)?.[1] ??
      body.match(/(?:kodu|code)\s*:\s*([A-Z0-9_-]+)/i)?.[1] ??
      null;

    const minFromBody =
      body.match(/(?:Minimum\s*Sepet|Min(?:imum)?\s*(?:spend|cart))\s*:?\s*([\d.,]+)/i)?.[1] ??
      null;
    const maxFromBody =
      body.match(
        /(?:Kullanım(?:\s*limiti)?|Max(?:imum)?\s*uses|Kupon\s*kullanım(?:\s*limiti)?)\s*:?\s*(\S+)/i,
      )?.[1] ?? null;
    const perUserFromBody =
      body.match(
        /(?:Kullanıcı\s*başına(?:\s*limit)?|Per[- ]?user(?:\s*limit)?|Kişi\s*başı(?:\s*limit)?)\s*:?\s*([\d.,]+)/i,
      )?.[1] ?? null;
    const expiresFromBody =
      body.match(/(?:Son\s*Kullanma|Expires?(?:\s*at)?|Bitiş(?:\s*tarihi)?)\s*:?\s*(.+?)(?:\n|$)/i)?.[1]
        ?.trim() ?? null;
    const noteFromBody = body.match(/(?:Not|Note)\s*:\s*(.+)/is)?.[1]?.trim() ?? null;

    let maxUses: number | null = null;
    if ('maxUses' in meta || 'max_uses' in meta) {
      const raw = meta.maxUses ?? meta.max_uses;
      maxUses = raw === null || raw === undefined ? null : num(raw);
    } else if (maxFromBody) {
      maxUses = /sınırsız|unlimited|∞/i.test(maxFromBody)
        ? null
        : Number(String(maxFromBody).replace(',', '.'));
      if (maxUses != null && !Number.isFinite(maxUses)) maxUses = null;
    }

    const perUserLimit =
      num(meta.perUserLimit) ??
      num(meta.per_user_limit) ??
      (perUserFromBody ? Number(String(perUserFromBody).replace(',', '.')) : null);

    const minSpend =
      num(meta.minSpend) ??
      num(meta.min_spend) ??
      (minFromBody ? Number(String(minFromBody).replace(',', '.')) : null);

    return {
      kind: 'discount',
      data: {
        kind: 'discount',
        code: str(meta.code) ?? str(meta.discount_code) ?? codeFromBody ?? codeFromTitle,
        percent,
        minSpend: minSpend ?? 0,
        maxUses,
        perUserLimit: perUserLimit ?? 1,
        expiresAt: str(meta.expiresAt) ?? str(meta.expires_at) ?? expiresFromBody,
        note: str(meta.note) ?? noteFromBody,
        noteKey: str(meta.noteKey) ?? str(meta.note_key),
      },
    };
  }

  if (isPromo) {
    const amountFromBody = body.match(/([\d.,]+)\s+Papel\s+(hesabınıza|added|eklendi)/i)?.[1];
    const amount =
      num(meta.amount) ??
      (amountFromBody ? Number(String(amountFromBody).replace(',', '.')) : null) ??
      0;
    const codeFromBody = body.match(/^([A-Z0-9_-]+)\s+kodu/im)?.[1] ?? null;
    const balanceFromBody = body.match(/(?:Yeni bakiye|New balance)\s*:\s*([\d.,]+)/i)?.[1];

    return {
      kind: 'promotion',
      data: {
        kind: 'promotion',
        amount,
        code: str(meta.code) ?? codeFromBody,
        balanceAfter:
          num(meta.balanceAfter) ??
          num(meta.balance_after) ??
          (balanceFromBody ? Number(String(balanceFromBody).replace(',', '.')) : null),
        createdBy: str(meta.createdBy) ?? str(meta.created_by),
        createdByUsername:
          str(meta.createdByUsername) ??
          str(meta.created_by_username) ??
          str(meta.creatorUsername) ??
          str(meta.creator_username),
        createdByAvatarUrl:
          str(meta.createdByAvatarUrl) ??
          str(meta.created_by_avatar_url) ??
          str(meta.creatorAvatarUrl) ??
          str(meta.creator_avatar_url),
      },
    };
  }

  return null;
}

type Props = {
  mail: MailItem;
  txn: ParsedTxn;
  t: Translate;
};

function CopyIdButton({ value, t }: { value: string; t: Translate }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyTextToClipboard(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onCopy();
      }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      title={t('mail_txn_copy_id')}
    >
      <span className="min-w-0 break-all font-mono text-[11px] leading-snug text-white/50 group-hover:text-white/75">
        {value}
      </span>
      {copied ? (
        <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <LuCopy className="h-3.5 w-3.5 shrink-0 text-white/25 group-hover:text-white/55" />
      )}
      <span className="sr-only">{copied ? t('mail_txn_copied') : t('mail_txn_copy_id')}</span>
    </button>
  );
}

function PromoCodeChip({ value, t }: { value: string; t: Translate }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyTextToClipboard(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onCopy();
      }}
      className="group inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      title={t('mail_txn_copy_id')}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
        {t('mail_txn_promo_code')}
      </span>
      <span className="min-w-0 break-all font-mono text-xs font-semibold tracking-wide text-white/80 [overflow-wrap:anywhere] group-hover:text-white">
        {value}
      </span>
      {copied ? (
        <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <LuCopy className="h-3.5 w-3.5 shrink-0 text-white/30 group-hover:text-white/55" />
      )}
      <span className="sr-only">{copied ? t('mail_txn_copied') : t('mail_txn_copy_id')}</span>
    </button>
  );
}

/** Shared shell for all transactional mails — one card, no overflow. */
function ReceiptCard({
  children,
  accent = 'amber',
}: {
  children: ReactNode;
  accent?: 'amber' | 'emerald' | 'sky';
}) {
  const ring =
    accent === 'emerald'
      ? 'border-emerald-500/20'
      : accent === 'sky'
        ? 'border-sky-500/20'
        : 'border-amber-400/20';

  return (
    <div
      className={`w-full min-w-0 overflow-hidden rounded-2xl border ${ring} bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}
    >
      {children}
    </div>
  );
}

function ReceiptSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 px-4 py-4 ${className}`}>{children}</div>;
}

function ReceiptDivider() {
  return <div className="mx-4 border-t border-white/[0.07]" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
      {children}
    </p>
  );
}

function AmountInline({
  amount,
  label,
  accent = 'amber',
}: {
  amount: number;
  label: string;
  accent?: 'amber' | 'emerald';
}) {
  const amountColor = accent === 'emerald' ? 'text-emerald-300' : 'text-amber-300';
  const unitColor = accent === 'emerald' ? 'text-emerald-400/80' : 'text-amber-400';

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Image
          src="/papel.gif"
          alt="Papel"
          width={28}
          height={28}
          className="h-7 w-7 shrink-0"
          unoptimized
        />
        <span className={`text-3xl font-black tabular-nums tracking-tight sm:text-4xl ${amountColor}`}>
          +{amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
        </span>
        <span className={`text-sm font-bold ${unitColor}`}>Papel</span>
      </div>
    </div>
  );
}

function PercentInline({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <LuPercent className="h-6 w-6 shrink-0 text-sky-300" />
        <span className="text-3xl font-black tabular-nums tracking-tight text-sky-300 sm:text-4xl">
          {percent.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
        </span>
        <span className="text-sm font-bold text-sky-400/80">%</span>
      </div>
    </div>
  );
}

function NoteBlock({
  note,
  t,
  accent = 'amber',
}: {
  note: string;
  t: Translate;
  accent?: 'amber' | 'emerald' | 'sky';
}) {
  const bar =
    accent === 'emerald'
      ? 'border-emerald-400/40'
      : accent === 'sky'
        ? 'border-sky-400/40'
        : 'border-amber-400/40';

  return (
    <div className="mt-3 min-w-0 rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
        <LuMessageSquareText className="h-3.5 w-3.5 shrink-0 text-white/40" />
        {t('mail_txn_note')}
      </div>
      <p
        className={`max-w-full break-words border-l-2 ${bar} pl-3 text-sm leading-relaxed text-white/75 whitespace-pre-wrap [overflow-wrap:anywhere]`}
      >
        {note}
      </p>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="flex min-w-0 shrink-0 items-center gap-2 pt-0.5">
        <span className="text-white/35">{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="min-w-0 max-w-[65%] break-words text-right text-sm font-semibold text-white [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}

export default function MailTransactionReceipt({ mail, txn, t }: Props) {
  if (txn.kind === 'transfer') {
    const { amount, note, senderId, senderUsername, senderAvatarUrl } = txn.data;
    const displayName = senderUsername || mail.author_name || t('mail_detail_sender_label');

    return (
      <div className="w-full min-w-0">
        <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-500/[0.07] via-white/[0.03] to-white/[0.02]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

          {/* Amount hero */}
          <div className="min-w-0 px-4 pb-1 pt-5 text-center sm:px-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/45">
              {t('mail_txn_received')}
            </p>
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2.5">
              <Image
                src="/papel.gif"
                alt="Papel"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0"
                unoptimized
              />
              <span className="text-4xl font-black tabular-nums tracking-tight text-amber-300 sm:text-5xl">
                +{amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-base font-bold text-amber-400/90">Papel</span>
            </div>
          </div>

          {/* Sender strip */}
          <div className="mx-4 mt-5 min-w-0 rounded-xl border border-white/[0.07] bg-black/25 p-3 text-center sm:mx-5">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              {t('mail_txn_from')}
            </p>
            <div className="flex min-w-0 flex-col items-center gap-2">
              {senderAvatarUrl ? (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                  <Image
                    src={senderAvatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#5865F2]/20 text-[#a5b4ff]">
                  <LuUser className="h-5 w-5" />
                </div>
              )}
              <p className="max-w-full break-words text-sm font-semibold text-white [overflow-wrap:anywhere]">
                {displayName}
              </p>
            </div>
            {senderId ? (
              <div className="mt-3 flex min-w-0 flex-col items-center gap-1.5 border-t border-white/[0.06] pt-3">
                <span className="text-[11px] text-white/35">{t('mail_txn_sender_id')}</span>
                <CopyIdButton value={senderId} t={t} />
              </div>
            ) : (
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-white/30">
                {t('mail_txn_id_unavailable')}
              </p>
            )}
          </div>

          {/* Note */}
          {note ? (
            <div className="min-w-0 px-4 py-4 text-center sm:px-5">
              <div className="mb-2 inline-flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                <LuMessageSquareText className="h-3.5 w-3.5 shrink-0 text-white/35" />
                {t('mail_txn_note')}
              </div>
              <p className="mx-auto max-w-full break-words text-sm leading-relaxed text-white/70 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {note}
              </p>
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>
      </div>
    );
  }

  if (txn.kind === 'discount') {
    const { code, percent, minSpend, maxUses, perUserLimit, expiresAt, note, noteKey } = txn.data;
    const resolvedNote =
      noteKey && t(noteKey) !== noteKey
        ? t(noteKey)
        : note && /sepette görünmesi|appear in your cart|carrinho/i.test(note)
          ? t('mail_discount_note_cart_delay')
          : note;
    const expiresLabel = (() => {
      if (!expiresAt) return t('mail_txn_discount_no_expiry');
      if (/yok|none|—|-/i.test(expiresAt) && !/\d/.test(expiresAt)) {
        return t('mail_txn_discount_no_expiry');
      }
      const parsed = Date.parse(expiresAt);
      if (Number.isFinite(parsed)) {
        return new Date(parsed).toLocaleString('tr-TR');
      }
      return expiresAt;
    })();

    return (
      <div className="w-full min-w-0 space-y-3">
        <ReceiptCard accent="sky">
          <ReceiptSection>
            <SectionLabel>{t('mail_txn_discount_details')}</SectionLabel>
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300">
                <LuTicket className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-base font-semibold text-white">DiscoWeb</p>
                {code ? (
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                    <span className="shrink-0 text-[11px] text-white/35">
                      {t('mail_txn_discount_code')}
                    </span>
                    <CopyIdButton value={code} t={t} />
                  </div>
                ) : null}
              </div>
            </div>
          </ReceiptSection>
          <ReceiptDivider />
          <ReceiptSection>
            <PercentInline percent={percent} label={t('mail_txn_discount_rate')} />
            <div className="mt-3 min-w-0 divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-black/20 px-3 py-1">
              <MetaRow
                icon={<LuShoppingBag className="h-3.5 w-3.5" />}
                label={t('mail_txn_discount_min_spend')}
              >
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                  <Image src="/papel.gif" alt="" width={14} height={14} className="h-3.5 w-3.5" unoptimized />
                  {(minSpend ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  <span className="text-xs font-semibold text-amber-400">Papel</span>
                </span>
              </MetaRow>
              <MetaRow
                icon={<LuTicket className="h-3.5 w-3.5" />}
                label={t('mail_txn_discount_coupon_limit')}
              >
                {maxUses == null
                  ? t('mail_txn_discount_unlimited')
                  : String(maxUses)}
              </MetaRow>
              <MetaRow
                icon={<LuUsers className="h-3.5 w-3.5" />}
                label={t('mail_txn_discount_per_user_limit')}
              >
                {String(perUserLimit ?? 1)}
              </MetaRow>
              <MetaRow
                icon={<LuTimer className="h-3.5 w-3.5" />}
                label={t('mail_txn_discount_expires')}
              >
                {expiresLabel}
              </MetaRow>
            </div>
            {resolvedNote ? <NoteBlock note={resolvedNote} t={t} accent="sky" /> : null}
          </ReceiptSection>
        </ReceiptCard>
      </div>
    );
  }

  const { amount, code, createdByUsername, createdByAvatarUrl } = txn.data;
  const creatorName = createdByUsername || 'DiscoWeb';

  return (
    <div className="w-full min-w-0">
      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.08] via-white/[0.03] to-white/[0.02]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />

        <div className="min-w-0 px-4 pb-1 pt-5 text-center sm:px-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/45">
            {t('mail_txn_promo_credit')}
          </p>
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2.5">
            <Image
              src="/papel.gif"
              alt="Papel"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
              unoptimized
            />
            <span className="text-4xl font-black tabular-nums tracking-tight text-emerald-300 sm:text-5xl">
              +{amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-base font-bold text-emerald-400/90">Papel</span>
          </div>
        </div>

        <div className="mx-4 mb-4 mt-5 min-w-0 rounded-xl border border-white/[0.07] bg-black/25 p-3 text-center sm:mx-5">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
            {t('mail_txn_promo_created_by')}
          </p>
          <div className="flex min-w-0 flex-col items-center gap-2">
            {createdByAvatarUrl ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
                <Image
                  src={createdByAvatarUrl}
                  alt={creatorName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <LuGift className="h-5 w-5" />
              </div>
            )}
            <p className="max-w-full break-words text-sm font-semibold text-white [overflow-wrap:anywhere]">
              {creatorName}
            </p>
          </div>
          {code ? (
            <div className="mt-3 flex min-w-0 justify-center border-t border-white/[0.06] pt-3">
              <PromoCodeChip value={code} t={t} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
