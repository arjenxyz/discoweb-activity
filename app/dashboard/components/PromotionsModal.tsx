'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  LuCircleCheck,
  LuGift,
  LuLoader,
  LuSparkles,
  LuTag,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

type PromotionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  maintenance?: { is_active: boolean; reason: string | null } | null;
};

function MaintenanceView({ onClose, reason }: { onClose: () => void; reason?: string | null }) {
  const t = useT();
  return (
    <div className="px-5 py-8 text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
        <LuWrench className="h-8 w-8 text-amber-300" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{t('maintenance_modal_title')}</p>
        <p className="mt-1 text-sm text-white/50">{t('maintenance_modal_subtitle')}</p>
      </div>
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/80">
        {reason || t('maintenance_modal_default_reason')}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        {t('maintenance_modal_close')}
      </button>
    </div>
  );
}

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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isLoading = localLoading || loading;
  const displayError = localError ?? error ?? null;
  const isSuccess = Boolean(success);

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    setCode('');
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
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

  if (!isOpen) return null;

  const isSubmitDisabled = isLoading || Boolean(validate(code)) || isSuccess;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />

      <div
        className="relative z-10 w-full sm:max-w-md max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#13151a] shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-20 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pink-500/25 bg-pink-500/10 text-pink-300">
              <LuGift className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-300/90">
                {t('promo_modal_eyebrow')}
              </p>
              <p id="promo-modal-title" className="truncate text-lg font-black text-white">
                {t('promo_modal_title')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label={t('promo_modal_cancel')}
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="relative max-h-[calc(92vh-72px)] overflow-y-auto custom-scrollbar">
          {maintenance?.is_active ? (
            <MaintenanceView onClose={onClose} reason={maintenance.reason} />
          ) : isSuccess ? (
            <div className="px-5 py-10 text-center space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                <LuCircleCheck className="h-10 w-10 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{t('promo_modal_success_title')}</p>
                <p className="mt-2 text-sm text-emerald-300">{success}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                <LuSparkles className="h-3.5 w-3.5 text-pink-300" />
                <span>{t('promo_modal_success_hint')}</span>
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              {/* Hero */}
              <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0">
                    <Image src="/papel.gif" alt="" width={56} height={56} className="h-14 w-14 object-contain" unoptimized />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{t('promo_modal_subtitle')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">{t('promo_modal_info_body')}</p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="space-y-2">
                <label htmlFor="promo-code-input" className="text-xs font-medium text-white/50">
                  {t('promo_modal_code_label')}
                </label>
                <div className="relative">
                  <LuTag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300/60" />
                  <input
                    id="promo-code-input"
                    ref={inputRef}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (localError) setLocalError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitDisabled) void handleSubmit();
                    }}
                    placeholder="PROMO2026"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-white/10 bg-[#0b0d12]/80 py-3.5 pl-10 pr-4 font-mono text-sm tracking-[0.15em] text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-white/25 transition focus:border-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
                <p className="text-[11px] text-white/35">{t('promo_modal_hint')}</p>
              </div>

              {/* Feedback */}
              {displayError && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {displayError}
                </div>
              )}

              {/* Info steps */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                  {t('promo_modal_info_title')}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[t('promo_modal_step_1'), t('promo_modal_step_2'), t('promo_modal_step_3')].map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5 text-xs text-white/55">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-pink-500/15 text-[10px] font-bold text-pink-300">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {!maintenance?.is_active && !isSuccess && (
          <div className="relative border-t border-white/5 bg-[#13151a]/95 px-5 py-4 backdrop-blur-sm">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
              >
                {t('promo_modal_cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitDisabled}
                className="flex flex-[1.2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:from-pink-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <LuLoader className="h-4 w-4 animate-spin" />
                    {t('promo_modal_checking')}
                  </>
                ) : (
                  <>
                    <LuGift className="h-4 w-4" />
                    {t('promo_modal_add')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
