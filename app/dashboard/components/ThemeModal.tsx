'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LocaleContext';
import { useVisualTheme } from '@/hooks/useVisualTheme';
import type { VisualTheme } from '@/lib/visualTheme';

type Props = { onClose: () => void };

const OPTIONS: { id: VisualTheme; icon: ReactNode }[] = [
  {
    id: 'invincible',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path d="M3.5 2A1.5 1.5 0 002 3.5v13A1.5 1.5 0 003.5 18h13a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-13zM4 4h12v10H4V4z" />
        <path d="M6.5 7.5a1 1 0 011.414 0L10 9.586l2.086-2.086a1 1 0 111.414 1.414L11.414 11l2.086 2.086a1 1 0 01-1.414 1.414L10 12.414l-2.086 2.086a1 1 0 01-1.414-1.414L8.586 11 6.5 8.914a1 1 0 010-1.414z" />
      </svg>
    ),
  },
  {
    id: 'soft',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l.956.478a1 1 0 11-.894 1.79L10 6.618l-1.062.973a1 1 0 11-1.128-1.664L9 4.323V3a1 1 0 011-1zm-5 4a1 1 0 011 1v.323l.956.478a1 1 0 11-.894 1.79L6 10.618l-1.062.973a1 1 0 01-1.128-1.664L5 8.323V7a1 1 0 011-1zm10 0a1 1 0 011 1v1.323l.956.478a1 1 0 11-.894 1.79L16 10.618l-1.062.973a1 1 0 01-1.128-1.664L15 8.323V7a1 1 0 011-1zM4 14a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function ThemeModal({ onClose }: Props) {
  const t = useT();
  const { theme, setTheme } = useVisualTheme();

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

  const handleSelect = (next: VisualTheme) => {
    setTheme(next);
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#050608]/75 backdrop-blur-2xl" />

      <div className="relative flex w-full max-w-[340px] flex-col">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-violet-300">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77A7 7 0 0010 3c1.084 0 2.098.244 3.007.668a.75.75 0 01.26-.77 9 9 0 00-6.522 0zM3.75 6.75A2.25 2.25 0 016 4.5h8a2.25 2.25 0 012.25 2.25v8.25A2.25 2.25 0 0114 15H6a2.25 2.25 0 01-2.25-2.25V6.75z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">{t('support_menu_theme_label')}</h2>
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

        <div className="overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#0b0d12]/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <p className="mb-3 px-1 text-xs leading-relaxed text-white/40">{t('support_theme_modal_hint')}</p>
          <div className="flex flex-col gap-2">
            {OPTIONS.map((option) => {
              const active = theme === option.id;
              const labelKey = option.id === 'invincible' ? 'support_theme_invincible_label' : 'support_theme_soft_label';
              const subKey = option.id === 'invincible' ? 'support_theme_invincible_sub' : 'support_theme_soft_sub';
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-[#5865F2]/40 bg-[#5865F2]/12'
                      : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                    active ? 'border-[#5865F2]/30 bg-[#5865F2]/15 text-[#5865F2]' : 'border-white/10 bg-black/20 text-white/50'
                  }`}>
                    {option.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{t(labelKey)}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/40">{t(subKey)}</span>
                  </span>
                  {active && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="mt-1 h-4 w-4 flex-shrink-0 text-[#5865F2]">
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
