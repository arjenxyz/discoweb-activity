'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useT } from '@/contexts/LocaleContext';
import { getLanguageDefinition } from '@/lib/languages';
import BugReportModal from './BugReportModal';
import SuggestionModal from './SuggestionModal';
import LanguageModal from './LanguageModal';
import ThemeModal from './ThemeModal';
import { useVisualTheme } from '@/hooks/useVisualTheme';

type Props = {
  openLink: (url: string) => Promise<void>;
  section?: string;
};

type IconTone = 'discord' | 'docs' | 'language' | 'theme' | 'danger' | 'suggestion';

const TONE_STYLES: Record<IconTone, string> = {
  discord: 'border-[#5865F2]/40 bg-[#5865F2]/20 text-[#c4cbff] shadow-[0_0_16px_-6px_rgba(88,101,242,0.55)]',
  docs: 'border-sky-400/30 bg-sky-500/15 text-sky-300',
  language: 'border-violet-400/30 bg-violet-500/15 text-violet-300',
  theme: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  danger: 'border-rose-400/35 bg-rose-500/15 text-rose-300 shadow-[0_0_16px_-6px_rgba(244,63,94,0.45)]',
  suggestion: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
};

function MenuItem({
  icon,
  label,
  sub,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  tone: IconTone;
}) {
  const isDanger = tone === 'danger';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-xl border px-3 py-3 text-left transition ${
        isDanger
          ? 'border-rose-500/15 bg-rose-500/[0.06] text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/12 hover:text-rose-200'
          : 'border-white/[0.06] bg-white/[0.03] text-white hover:border-white/15 hover:bg-white/[0.08]'
      }`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${TONE_STYLES[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold leading-tight tracking-tight">{label}</span>
        {sub ? <span className="mt-1 block text-[12px] font-medium leading-tight text-white/50">{sub}</span> : null}
      </div>
    </button>
  );
}

export default function SupportMenu({ openLink, section }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLanguage = getLanguageDefinition(locale);
  const { theme } = useVisualTheme();
  const currentThemeLabel = theme === 'soft' ? t('support_theme_soft_label') : t('support_theme_invincible_label');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
          aria-label={t('support_menu_button_aria')}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-30 w-[260px] overflow-hidden rounded-2xl border border-white/12 bg-[#12141c]/97 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5865F2]/40 to-transparent" />
            <div className="relative space-y-1.5 p-2.5">
              <MenuItem
                tone="discord"
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-[18px] w-[18px]">
                    <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                  </svg>
                }
                label={t('support_menu_discord_label')}
                onClick={() => {
                  setOpen(false);
                  openLink('https://discord.gg/vxK95JTFPw');
                }}
              />
              <MenuItem
                tone="docs"
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
                label={t('support_menu_docs_label')}
                onClick={() => {
                  setOpen(false);
                  openLink('https://discoweb.tech/docs');
                }}
              />
              <MenuItem
                tone="language"
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
                label={t('support_menu_language_label')}
                sub={currentLanguage.nativeLabel}
                onClick={() => {
                  setOpen(false);
                  setLanguageOpen(true);
                }}
              />
              <MenuItem
                tone="theme"
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]">
                    <path
                      fillRule="evenodd"
                      d="M7.455 2.004a.75.75 0 01.26.77A7 7 0 0010 3c1.084 0 2.098.244 3.007.668a.75.75 0 01.26-.77 9 9 0 00-6.522 0zM3.75 6.75A2.25 2.25 0 016 4.5h8a2.25 2.25 0 012.25 2.25v8.25A2.25 2.25 0 0114 15H6a2.25 2.25 0 01-2.25-2.25V6.75z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
                label={t('support_menu_theme_label')}
                sub={currentThemeLabel}
                onClick={() => {
                  setOpen(false);
                  setThemeOpen(true);
                }}
              />

              <div className="mx-1 my-1.5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <MenuItem
                tone="danger"
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
                label={t('support_menu_bug_label')}
                onClick={() => {
                  setOpen(false);
                  setBugOpen(true);
                }}
              />
              <MenuItem
                tone="suggestion"
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                }
                label={t('support_menu_suggestion_label')}
                onClick={() => {
                  setOpen(false);
                  setSuggestionOpen(true);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {languageOpen && <LanguageModal onClose={() => setLanguageOpen(false)} />}
      {themeOpen && <ThemeModal onClose={() => setThemeOpen(false)} />}
      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} section={section} />}
      {suggestionOpen && <SuggestionModal onClose={() => setSuggestionOpen(false)} section={section} />}
    </>
  );
}
