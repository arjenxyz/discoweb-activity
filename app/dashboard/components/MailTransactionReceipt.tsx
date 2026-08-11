'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { MailItem } from '../types';
import { LuCheck, LuCopy, LuGift, LuMessageSquareText, LuTicket, LuUser } from 'react-icons/lu';

export type MailTxnKind = 'transfer' | 'promotion';

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
};

export type ParsedTxn =
  | { kind: 'transfer'; data: TransferMeta }
  | { kind: 'promotion'; data: PromoMeta };

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

/** metadata + body fallback — eski mailler için de çalışır */
export function parseMailTransaction(mail: MailItem): ParsedTxn | null {
  const meta = (mail.metadata && typeof mail.metadata === 'object' ? mail.metadata : {}) as Record<
    string,
    unknown
  >;
  const kind = str(meta.kind);
  const body = mail.body ?? '';
  const title = mail.title ?? '';

  const isTransfer =
    kind === 'transfer' ||
    /papel\s*transferi/i.test(title) ||
    /papel\s*transfer/i.test(title);

  const isPromo =
    kind === 'promotion' ||
    /promosyon\s*kodu/i.test(title) ||
    /promo(tion)?\s*code/i.test(title);

  if (isTransfer) {
    const amountFromBody = body.match(/Size\s+([\d.,]+)\s+Papel/i)?.[1]
      ?? body.match(/([\d.,]+)\s+Papel\s+(gönderildi|sent)/i)?.[1];
    const amount =
      num(meta.amount) ??
      (amountFromBody ? Number(String(amountFromBody).replace(',', '.')) : null) ??
      0;

    const noteFromBody = body.match(/(?:Açıklama|Note|Description)\s*:\s*(.+)/is)?.[1]?.trim() ?? null;
    const note = str(meta.note) ?? noteFromBody;

    const senderFromBody = body.match(/(?:Gönderen|From|Sender)\s*:\s*(.+)/i)?.[1]?.trim() ?? null;

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
      },
    };
  }

  return null;
}

type Props = {
  mail: MailItem;
  txn: ParsedTxn;
  t: (key: string) => string;
};

function CopyIdButton({ value, t }: { value: string; t: (key: string) => string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-left transition hover:border-amber-400/30 hover:bg-amber-400/5"
      title={t('mail_txn_copy_id')}
    >
      <span className="truncate font-mono text-[11px] text-white/45 group-hover:text-white/70">
        {value}
      </span>
      {copied ? (
        <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <LuCopy className="h-3.5 w-3.5 shrink-0 text-white/25 group-hover:text-amber-300" />
      )}
      <span className="sr-only">{copied ? t('mail_txn_copied') : t('mail_txn_copy_id')}</span>
    </button>
  );
}

function AmountHero({
  amount,
  label,
  accent = 'amber',
}: {
  amount: number;
  label: string;
  accent?: 'amber' | 'emerald';
}) {
  const glow =
    accent === 'emerald'
      ? 'from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20'
      : 'from-amber-400/15 via-amber-500/5 to-transparent border-amber-400/20';
  const amountColor = accent === 'emerald' ? 'text-emerald-300' : 'text-amber-300';
  const labelColor = accent === 'emerald' ? 'text-emerald-400/80' : 'text-amber-400';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${glow} px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</p>
      <div className="flex items-center justify-center gap-2.5">
        <Image
          src="/papel.gif"
          alt="Papel"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
          unoptimized
        />
        <span className={`text-4xl font-black tabular-nums tracking-tight sm:text-5xl ${amountColor}`}>
          +{amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
        </span>
        <span className={`pt-1 text-base font-bold ${labelColor}`}>Papel</span>
      </div>
    </div>
  );
}

export default function MailTransactionReceipt({ mail, txn, t }: Props) {
  if (txn.kind === 'transfer') {
    const { amount, note, senderId, senderUsername, senderAvatarUrl } = txn.data;
    const displayName = senderUsername || mail.author_name || t('mail_detail_sender_label');

    return (
      <div className="space-y-4">
        <AmountHero amount={amount} label={t('mail_txn_received')} accent="amber" />

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
            {t('mail_txn_from')}
          </p>
          <div className="flex items-start gap-3">
            {senderAvatarUrl ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06] shadow-lg shadow-black/30">
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
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="truncate text-base font-semibold text-white">{displayName}</p>
              {senderId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/35">{t('mail_txn_user_id')}</span>
                  <CopyIdButton value={senderId} t={t} />
                </div>
              ) : (
                <p className="text-[11px] text-white/30">{t('mail_txn_id_unavailable')}</p>
              )}
            </div>
          </div>
        </div>

        {note ? (
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-4">
            <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              <LuMessageSquareText className="h-3.5 w-3.5 text-[#a5b4ff]/80" />
              {t('mail_txn_note')}
            </div>
            <blockquote className="border-l-2 border-amber-400/40 pl-3 text-sm leading-relaxed text-white/75">
              {note}
            </blockquote>
          </div>
        ) : null}
      </div>
    );
  }

  const { amount, code, balanceAfter } = txn.data;

  return (
    <div className="space-y-4">
      <AmountHero amount={amount} label={t('mail_txn_promo_credit')} accent="emerald" />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
          {t('mail_txn_promo_details')}
        </p>
        <div className="space-y-3">
          {code ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <LuTicket className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-xs text-white/40">{t('mail_txn_promo_code')}</span>
              </div>
              <CopyIdButton value={code} t={t} />
            </div>
          ) : null}

          {balanceAfter != null ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <LuGift className="h-4 w-4 text-white/35" />
                <span className="text-xs text-white/40">{t('mail_txn_new_balance')}</span>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-white">
                <Image src="/papel.gif" alt="" width={16} height={16} className="h-4 w-4" unoptimized />
                {balanceAfter.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                <span className="text-xs font-semibold text-amber-400">Papel</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
