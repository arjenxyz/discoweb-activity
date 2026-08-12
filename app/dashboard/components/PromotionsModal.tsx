'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LocaleContext';
import { getMaintenanceCopy } from '@/lib/maintenanceCopy';
import type { MaintenanceKey } from '@/lib/maintenanceKeys';

type PromotionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  maintenance?: { is_active: boolean; reason: string | null; key?: MaintenanceKey } | null;
};

export default function PromotionsModal({
  isOpen,
  onClose,
  onApply,
  loading,
  error,
  success,
  maintenance,
}: PromotionsModalProps) {
  const t = useT();
  const [code, setCode] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isLoading = localLoading || loading;

  const validate = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('promo_modal_enter_code');
      if (trimmed.length < 3) return t('promo_modal_code_too_short');
      if (trimmed.length > 100) return t('promo_modal_code_too_long');
      return null;
    },
    [t],
  );

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    setCode('');
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (maintenance?.is_active) {
    const copy = getMaintenanceCopy(maintenance.key ?? 'promotions', t, maintenance.reason);
    return createPortal(
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto"
        aria-hidden={!isOpen}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div>
            <p className="text-lg font-semibold text-white">{copy.title}</p>
            <p className="text-xs text-white/50">{copy.helper}</p>
          </div>
          <div className="mt-5">
            <p className="text-sm text-white/60">{copy.description}</p>
          </div>
          <div className="mt-6 flex items-center justify-end">
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
      document.body,
    );
  }

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
      /* parent sets error */
    } finally {
      setLocalLoading(false);
    }
  };

  const feedback = localError ?? error ?? success ?? null;
  const isError = Boolean(localError || error);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 pointer-events-auto"
      aria-hidden={!isOpen}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="promo-modal-title" className="text-lg font-semibold text-white">
              {t('promo_modal_title')}
            </p>
            <p className="mt-1 text-xs text-white/50">{t('promo_modal_subtitle')}</p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="promo-code-input" className="mb-2 block text-xs font-medium text-white/45">
            {t('promo_modal_code_label')}
          </label>
          <input
            id="promo-code-input"
            ref={inputRef}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (localError) setLocalError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) void handleSubmit();
            }}
            placeholder="PROMO2026"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/70 px-4 py-2.5 font-mono text-sm tracking-wider text-white/90 placeholder:font-sans placeholder:tracking-normal placeholder:text-white/30 focus:border-[#5865F2] focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-white/35">{t('promo_modal_hint')}</p>
          {feedback && (
            <p className={`mt-3 text-xs ${isError ? 'text-rose-300' : 'text-emerald-300'}`}>{feedback}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-white transition hover:border-white/30"
          >
            {t('promo_modal_cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || Boolean(validate(code))}
            className="rounded-full bg-[#5865F2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('promo_modal_checking') : t('promo_modal_add')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
