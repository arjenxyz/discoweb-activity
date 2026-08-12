'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LocaleContext';
import { getMaintenanceCopy } from '@/lib/maintenanceCopy';
import type { MaintenanceKey } from '@/lib/maintenanceKeys';

type DiscountsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  maintenance?: { is_active: boolean; reason: string | null; key?: MaintenanceKey } | null;
};

export default function DiscountsModal({ isOpen, onClose, onApply, loading, error, success, maintenance }: DiscountsModalProps) {
  const t = useT();
  const [code, setCode] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isLoading = localLoading || loading;

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 0);
      // prevent background scroll while modal open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (maintenance?.is_active) {
    const copy = getMaintenanceCopy(maintenance.key ?? 'discounts', t, maintenance.reason);
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto" aria-hidden={!isOpen}>
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-white">{copy.title}</p>
              <p className="text-xs text-white/50">{copy.helper}</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-sm text-white/60">{copy.description}</p>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
            >
              {t('maintenance_modal_close')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const validate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t('discount_modal_enter_code');
    if (trimmed.length < 3) return t('discount_modal_code_too_short');
    if (trimmed.length > 100) return t('discount_modal_code_too_long');
    return null;
  };

  const handleSubmit = async () => {
    const validation = validate(code);
    if (validation) {
      setLocalError(validation);
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    try {
      await onApply(code.trim());
      setCode('');
    } catch {
      // caller sets error
    } finally {
      setLocalLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto" aria-hidden={!isOpen}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{t('discount_modal_title')}</p>
            <p className="text-xs text-white/50">{t('discount_modal_subtitle')}</p>
          </div>
        </div>

        <div className="mt-5">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DISCOUNT2026"
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-2 text-sm text-white/80 focus:border-emerald-400 focus:outline-none"
          />
          {(localError || error || success) && (
            <p className={`mt-2 text-xs ${(localError || error) ? 'text-rose-300' : 'text-emerald-300'}`}>{localError ?? error ?? success}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
          >
            {t('discount_modal_cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('discount_modal_checking') : t('discount_modal_apply')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
