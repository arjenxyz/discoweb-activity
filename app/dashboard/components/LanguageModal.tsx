'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useT } from '@/contexts/LocaleContext';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/languages';
import LanguageFlag, { LANGUAGE_BG_LABELS } from './LanguageFlags';

type Props = { onClose: () => void };

const FALL_COLUMNS = [
  { left: '2%', duration: '32s', delay: '0s', size: 'text-base', offset: 0 },
  { left: '18%', duration: '38s', delay: '-6s', size: 'text-sm', offset: 3 },
  { left: '34%', duration: '28s', delay: '-12s', size: 'text-lg', offset: 6 },
  { left: '52%', duration: '36s', delay: '-4s', size: 'text-sm', offset: 1 },
  { left: '68%', duration: '30s', delay: '-16s', size: 'text-base', offset: 4 },
  { left: '84%', duration: '40s', delay: '-9s', size: 'text-sm', offset: 8 },
] as const;

export default function LanguageModal({ onClose }: Props) {
  const t = useT();
  const { locale, setDiscordLocale } = useLocale();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleSelect = (code: LanguageCode) => {
    setDiscordLocale(code);
    onClose();
  };

  const labelTexts = useMemo(() => LANGUAGE_BG_LABELS.map((item) => item.text), []);

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#050608]/70 backdrop-blur-2xl" />

      {/* Multilingual falling labels */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {FALL_COLUMNS.map((col) => {
          const rotated = [
            ...labelTexts.slice(col.offset),
            ...labelTexts.slice(0, col.offset),
          ];
          const loop = [...rotated, ...rotated];
          return (
            <div
              key={col.left}
              className="lang-fall-column absolute top-0 flex flex-col items-start gap-12 will-change-transform"
              style={{
                left: col.left,
                animationDuration: col.duration,
                animationDelay: col.delay,
              }}
            >
              {loop.map((text, i) => (
                <span
                  key={`${col.left}-${i}`}
                  className={`select-none whitespace-nowrap font-semibold tracking-wide text-white/30 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] ${col.size}`}
                  style={{ transform: `rotate(${((i % 5) - 2) * 5}deg)` }}
                >
                  {text}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="relative flex w-full max-w-[340px] flex-col items-stretch">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/10">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#5865F2]">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">{t('support_menu_language_label')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label={t('support_modal_close')}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#0b0d12]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="custom-scrollbar grid max-h-[min(360px,52vh)] grid-cols-2 gap-1.5 overflow-y-auto p-3 [color-scheme:dark]">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left transition ${
                  isActive
                    ? 'border-[#5865F2]/40 bg-[#5865F2]/12 shadow-[inset_0_0_0_1px_rgba(88,101,242,0.15)]'
                    : 'border-transparent bg-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.06]'
                }`}
              >
                <LanguageFlag code={lang.code} className="h-7 w-7" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-white">{lang.nativeLabel}</p>
                </div>
                {isActive && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-[#5865F2]">
                    <path d="M13.485 3.515a.75.75 0 010 1.06l-6.25 6.25a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l2.47 2.47 5.72-5.72a.75.75 0 011.06 0z" />
                  </svg>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
