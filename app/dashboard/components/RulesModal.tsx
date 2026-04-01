'use client';

import { useState } from 'react';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  onAccept: () => void;
  onClose: () => void;
  openLink: (url: string) => Promise<void>;
};

const RULES_ACCEPTED_KEY = 'discoweb_rules_accepted';

export function hasAcceptedRules(): boolean {
  try {
    return localStorage.getItem(RULES_ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function RulesModal({ onAccept, onClose, openLink }: Props) {
  const t = useT();
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    try {
      localStorage.setItem(RULES_ACCEPTED_KEY, '1');
    } catch {}
    onAccept();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ animation: 'rulesModalIn 0.3s ease-out' }}
      >
        <style>{`
          @keyframes rulesModalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5865F2]/40 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#5865F2]/8 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition z-10"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>

        <div className="relative px-7 pt-7 pb-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/20">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-[#5865F2]">
                <path fillRule="evenodd" d="M8 1C4.136 1 1 4.136 1 8s3.136 7 7 7 7-3.136 7-7-3.136-7-7-7zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM8 12a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold text-white">{t('rules_modal_title')}</h2>
              <p className="text-xs text-white/40">{t('rules_modal_subtitle')}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Rules list */}
          <div className="flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
            <RuleItem number={1} text={t('rules_modal_rule_1')} />
            <RuleItem number={2} text={t('rules_modal_rule_2')} />
            <RuleItem number={3} text={t('rules_modal_rule_3')} />
            <RuleItem number={4} text={t('rules_modal_rule_4')} />
            <RuleItem number={5} text={t('rules_modal_rule_5')} />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Legal links */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => openLink('https://discoweb.tech/docs')}
              className="text-xs text-[#5865F2]/70 hover:text-[#5865F2] transition-colors underline underline-offset-2"
            >
              {t('rules_modal_docs')}
            </button>
            <span className="text-white/15 text-xs">|</span>
            <button
              type="button"
              onClick={() => openLink('https://discoweb.tech/terms')}
              className="text-xs text-[#5865F2]/70 hover:text-[#5865F2] transition-colors underline underline-offset-2"
            >
              {t('rules_modal_terms')}
            </button>
            <span className="text-white/15 text-xs">|</span>
            <button
              type="button"
              onClick={() => openLink('https://discoweb.tech/privacy')}
              className="text-xs text-[#5865F2]/70 hover:text-[#5865F2] transition-colors underline underline-offset-2"
            >
              {t('rules_modal_privacy')}
            </button>
          </div>

          {/* Checkbox + Accept */}
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="sr-only"
                />
                <div className={`h-4.5 w-4.5 h-[18px] w-[18px] rounded border transition-all flex items-center justify-center ${
                  checked
                    ? 'bg-[#5865F2] border-[#5865F2]'
                    : 'border-white/20 bg-white/5 group-hover:border-white/30'
                }`}>
                  {checked && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-white">
                      <path d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-white/50 leading-relaxed">
                {t('rules_modal_accept_text')}
              </span>
            </label>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!checked}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                checked
                  ? 'bg-[#5865F2] text-white hover:bg-[#4752C4] active:scale-[0.98]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {t('rules_modal_accept_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[#5865F2]/15 text-[10px] font-bold text-[#5865F2] mt-0.5">
        {number}
      </span>
      <p className="text-sm text-white/60 leading-relaxed">{text}</p>
    </div>
  );
}
