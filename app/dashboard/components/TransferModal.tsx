'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LocaleContext';

type RecipientProfile = {
  userId: string;
  username: string;
  displayName?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
};

type TransferModalProps = {
  open: boolean;
  recipientId: string;
  amount: string;
  note: string;
  loading: boolean;
  error: string | null;
  success: string | null;
  taxRate?: number;
  recipientProfile?: RecipientProfile | null;
  recipientStatus?: 'idle' | 'loading' | 'ready' | 'not_found' | 'error';
  onRecipientChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

type TransferConfirmModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  recipientProfile: RecipientProfile;
  amount: string;
  taxAmount: string;
  totalDebit: string;
  note: string;
  onClose: () => void;
  onConfirm: () => void;
};

const OVERLAY_CLASS =
  'fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto';

const PANEL_CLASS =
  'w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl';

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-2.5 text-sm text-white/90 placeholder:text-white/30 focus:border-[#5865F2] focus:outline-none';

const LABEL_CLASS = 'mb-2 block text-xs font-medium text-white/45';

function useModalEffects(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}

function RecipientPreview({ profile }: { profile: RecipientProfile }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatarUrl || '/gif/cat.gif'}
          alt="avatar"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {profile.displayName || profile.nickname || profile.username}
        </p>
        <p className="truncate text-xs text-white/40">{profile.username}</p>
      </div>
    </div>
  );
}

export default function TransferModal({
  open,
  recipientId,
  amount,
  note,
  loading,
  error,
  success,
  taxRate = 0,
  recipientProfile,
  recipientStatus = 'idle',
  onRecipientChange,
  onAmountChange,
  onNoteChange,
  onClose,
  onSubmit,
}: TransferModalProps) {
  const t = useT();
  useModalEffects(open, onClose);

  if (!open) return null;

  const amountValue = Number(amount);
  const hasAmount = Number.isFinite(amountValue) && amountValue > 0;
  const taxAmount = hasAmount ? Number((amountValue * taxRate).toFixed(2)) : 0;
  const totalDebit = hasAmount ? Number((amountValue + taxAmount).toFixed(2)) : 0;
  const taxPercent = Number((taxRate * 100).toFixed(2));
  const noteLen = note.length;
  const noteMax = 200;

  return createPortal(
    <div className={OVERLAY_CLASS} aria-hidden={!open}>
      <div
        className={PANEL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div>
          <p id="transfer-modal-title" className="text-lg font-semibold text-white">
            {t('transfer_title')}
          </p>
          <p className="mt-1 text-xs text-white/50">{t('transfer_subtitle')}</p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="transfer-recipient" className={LABEL_CLASS}>
              {t('transfer_recipient_label')}
            </label>
            <input
              id="transfer-recipient"
              value={recipientId}
              onChange={(event) => onRecipientChange(event.target.value)}
              placeholder={t('transfer_recipient_placeholder')}
              className={INPUT_CLASS}
            />
            {recipientStatus === 'loading' && (
              <p className="mt-2 text-xs text-white/40">{t('transfer_recipient_loading')}</p>
            )}
            {recipientStatus === 'not_found' && (
              <p className="mt-2 text-xs text-rose-300">{t('transfer_recipient_not_found')}</p>
            )}
            {recipientStatus === 'error' && (
              <p className="mt-2 text-xs text-rose-300">{t('transfer_recipient_error')}</p>
            )}
            {recipientProfile && recipientStatus === 'ready' && (
              <RecipientPreview profile={recipientProfile} />
            )}
          </div>

          <div>
            <label htmlFor="transfer-amount" className={LABEL_CLASS}>
              {t('transfer_amount_label')}
            </label>
            <input
              id="transfer-amount"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder={t('transfer_amount_placeholder')}
              inputMode="decimal"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="transfer-note" className={LABEL_CLASS}>
              {t('transfer_note_label')}
            </label>
            <textarea
              id="transfer-note"
              value={note}
              onChange={(event) => onNoteChange(event.target.value.slice(0, noteMax))}
              placeholder={t('transfer_note_placeholder')}
              rows={2}
              maxLength={noteMax}
              className={`${INPUT_CLASS} resize-none`}
            />
            <p className="mt-1 text-[10px] text-white/30">
              {t('transfer_note_hint', { count: noteLen, max: noteMax })}
            </p>
          </div>

          {taxRate > 0 ? (
            <p className="text-xs text-white/45">
              {hasAmount
                ? t('transfer_tax_preview', {
                    percent: taxPercent,
                    tax: taxAmount.toFixed(2),
                    total: totalDebit.toFixed(2),
                  })
                : t('transfer_tax_rate_label', { percent: taxPercent })}
            </p>
          ) : (
            <p className="text-xs text-white/35">{t('transfer_tax_none')}</p>
          )}

          {error && <p className="text-xs text-rose-300">{error}</p>}
          {success && <p className="text-xs text-emerald-300">{success}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
          >
            {t('transfer_cancel_button')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-full bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('transfer_submitting') : t('transfer_submit_button')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function TransferConfirmModal({
  open,
  loading,
  error,
  recipientProfile,
  amount,
  taxAmount,
  totalDebit,
  note,
  onClose,
  onConfirm,
}: TransferConfirmModalProps) {
  const t = useT();
  useModalEffects(open, onClose);

  if (!open) return null;

  const trimmedNote = note.trim();

  return createPortal(
    <div className={OVERLAY_CLASS} aria-hidden={!open}>
      <div
        className={PANEL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div>
          <p id="transfer-confirm-title" className="text-lg font-semibold text-white">
            {t('transfer_confirm_title')}
          </p>
          <p className="mt-1 text-xs text-white/50">{t('transfer_confirm_subtitle')}</p>
        </div>

        <div className="mt-5 space-y-4">
          <RecipientPreview profile={recipientProfile} />

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75 space-y-1.5">
            <p>{t('transfer_confirm_amount', { amount })}</p>
            <p>{t('transfer_confirm_tax', { amount: taxAmount })}</p>
            <p className="font-medium text-white">{t('transfer_confirm_total_debit', { amount: totalDebit })}</p>
            {trimmedNote ? (
              <p className="pt-1 text-white/60">{t('transfer_confirm_note', { note: trimmedNote })}</p>
            ) : null}
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
          >
            {t('transfer_confirm_cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('transfer_submitting') : t('transfer_confirm_submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
