'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LuShieldCheck, LuList, LuMail, LuUser, LuX } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  targetBlank?: boolean;
}

export default function DiscordAgreementButton({ href, children, className, targetBlank }: Props) {
  const t = useT();
  const router = useRouter();
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [isProcessingAgreement, setIsProcessingAgreement] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastActiveEl = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only mount portal on client
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showAgreementModal) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        declineAgreement();
      }
    };

    document.addEventListener('keydown', onKey);
    // focus the modal for accessibility
    setTimeout(() => modalRef.current?.focus(), 50);

    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAgreementModal]);

  const handleClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('discord_agreement_accepted');
      const remember = localStorage.getItem('discord_agreement_remember');
      if (accepted === 'true' && remember === 'true') {
        navigateToHref();
        return;
      }
      // Save currently focused element to restore focus after modal closes
      lastActiveEl.current = document.activeElement as HTMLElement | null;
    }
    setShowAgreementModal(true);
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click', {
        event_category: 'engagement',
        event_label: 'discord_agreement_open'
      });
    }
  };

  const navigateToHref = () => {
    if (targetBlank) {
      window.open(href, '_blank');
    } else {
      // full navigation for OAuth
      window.location.href = href;
    }
  };

  const acceptAgreement = () => {
    setIsProcessingAgreement(true);
    try {
      if (typeof window !== 'undefined') {
        const now = new Date().toISOString();
        localStorage.setItem('discord_agreement_accepted', 'true');
        localStorage.setItem('discord_agreement_accepted_at', now);
        if (dontShowAgain) {
          localStorage.setItem('discord_agreement_remember', 'true');
        }
        if ((window as any).gtag) {
          (window as any).gtag('event', 'accept_agreement', {
            event_category: 'engagement',
            event_label: 'discord_agreement_accepted',
            remember: dontShowAgain,
            accepted_at: now,
          });
        }
      }
      navigateToHref();
    } finally {
      setIsProcessingAgreement(false);
      setShowAgreementModal(false);
      // restore focus
      setTimeout(() => lastActiveEl.current?.focus(), 50);
    }
  }; 

  const declineAgreement = () => {
    setShowAgreementModal(false);
    router.push('/');
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click', {
        event_category: 'engagement',
        event_label: 'discord_agreement_declined'
      });
    }
  };

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children}
      </button>

      {showAgreementModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discord-agreement-title"
            tabIndex={-1}
            ref={modalRef}
            className="w-full max-w-2xl mx-4 bg-white/10 border border-white/20 rounded-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start gap-4">
              <div className="text-blue-400 mt-1">
                <LuShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 id="discord-agreement-title" className="text-lg font-semibold text-white">{t('agreement_title')}</h3>
                <p className="text-sm text-white/70 mt-2">{t('agreement_body_intro')}</p>
              </div>
              <button onClick={() => { setShowAgreementModal(false); setTimeout(() => lastActiveEl.current?.focus(), 50); }} aria-label={t('close')} className="ml-3 text-white/50 hover:text-white">
                <LuX className="h-5 w-5" />
              </button>
            </div>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p>{t('agreement_body_main')}</p>
                <ul className="ml-0 mt-2 grid gap-2 text-sm">
                  <li className="flex items-start gap-2"><LuUser className="mt-1 text-white/60"/> <span>{t('agreement_item_1')}</span></li>
                  <li className="flex items-start gap-2"><LuList className="mt-1 text-white/60"/> <span>{t('agreement_item_2')}</span></li>
                  <li className="flex items-start gap-2"><LuShieldCheck className="mt-1 text-white/60"/> <span>{t('agreement_item_3')}</span></li>
                  <li className="flex items-start gap-2"><LuList className="mt-1 text-white/60"/> <span>{t('agreement_item_4')}</span></li>
                  <li className="flex items-start gap-2"><LuMail className="mt-1 text-white/60"/> <span>{t('agreement_item_5')}</span></li>
                  <li className="flex items-start gap-2"><LuShieldCheck className="mt-1 text-white/60"/> <span>{t('agreement_item_6')}</span></li>
                </ul>

                <p className="mt-2">{t('agreement_disclaimer')} <a href="/privacy" className="text-blue-400 underline">{t('agreement_privacy_link')}</a></p>

                <div className="mt-2 text-sm text-white/60">{t('agreement_no_consent')}</div>

                <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-black/10"
                  />
                  <span>{t('agreement_dont_show')}</span>
                </label>
              </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                onClick={declineAgreement}
                className="sm:w-auto w-full rounded-md px-4 py-3 bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10"
                aria-label={t('agreement_decline_aria')}
              >
                {t('agreement_decline')}
              </button>
              <button
                onClick={acceptAgreement}
                disabled={isProcessingAgreement}
                className="sm:w-auto w-full rounded-md px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                aria-label={t('agreement_accept_aria')}
              >
                {isProcessingAgreement ? t('market_order_processing') : t('agreement_accept')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
