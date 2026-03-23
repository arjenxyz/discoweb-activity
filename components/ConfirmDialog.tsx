import React from 'react';
import { useT } from '@/contexts/LocaleContext';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, description = '', confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-[#1e1f22] border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white">{title ?? t('confirm_dialog_default_title')}</h3>
        {description && <p className="mt-2 text-sm text-white/60">{description}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/5 text-sm text-white/60 hover:bg-white/10">{cancelLabel ?? t('confirm_dialog_cancel')}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-rose-500 text-sm font-bold text-white hover:brightness-95">{confirmLabel ?? t('confirm_dialog_yes')}</button>
        </div>
      </div>
    </div>
  );
}
