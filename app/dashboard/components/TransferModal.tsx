'use client';

import { useT } from '@/contexts/LocaleContext';

type TransferModalProps = {
  open: boolean;
  recipientId: string;
  amount: string;
  loading: boolean;
  error: string | null;
  success: string | null;
  onRecipientChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function TransferModal({
  open,
  recipientId,
  amount,
  loading,
  error,
  success,
  onRecipientChange,
  onAmountChange,
  onClose,
  onSubmit,
}: TransferModalProps) {
  const t = useT();
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{t('transfer_title')}</p>
            <p className="text-xs text-white/50">{t('transfer_subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            {t('transfer_close_button')}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-white/50">{t('transfer_recipient_label')}</label>
            <input
              value={recipientId}
              onChange={(event) => onRecipientChange(event.target.value)}
              placeholder={t('transfer_recipient_placeholder')}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">{t('transfer_amount_label')}</label>
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder={t('transfer_amount_placeholder')}
              inputMode="decimal"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-3 text-sm text-white/80 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          >
            {t('transfer_cancel_button')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('transfer_submitting') : t('transfer_submit_button')}
          </button>
        </div>
      </div>
    </div>
  );
}
