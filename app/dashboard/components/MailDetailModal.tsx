'use client';

import Image from 'next/image';
import type { MailItem } from '../types';
import { useEffect, useRef } from 'react';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { useT } from '@/contexts/LocaleContext';
import {
  LuChevronLeft,
  LuTrash2,
  LuStar,
  LuShield,
  LuExternalLink,
  LuX,
} from 'react-icons/lu';

/* ─── Kategori → Gönderici Bilgisi ─── */
type SenderConfig = { nameKey: string; avatar: string; verified: boolean };
const SENDER_CONFIG: Record<string, SenderConfig> = {
  announcement: { nameKey: 'mail_sender_announcement', avatar: '📢', verified: true },
  system:       { nameKey: 'mail_sender_system',       avatar: '⚙️', verified: true },
  maintenance:  { nameKey: 'mail_sender_maintenance',  avatar: '🔧', verified: true },
  sponsor:      { nameKey: 'mail_sender_sponsor',      avatar: '💼', verified: false },
  update:       { nameKey: 'mail_sender_update',       avatar: '✨', verified: true },
  lottery:      { nameKey: 'mail_sender_lottery',      avatar: '📣', verified: false },
  reward:       { nameKey: 'mail_sender_reward',       avatar: '🎁', verified: true },
  order:        { nameKey: 'mail_sender_order',        avatar: '📦', verified: true },
};

/* ─── Kategori Renkleri ─── */
const CATEGORY_COLORS: Record<string, string> = {
  announcement: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  system:       'bg-slate-500/15 text-slate-400 border-slate-500/20',
  maintenance:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  sponsor:      'bg-pink-500/15 text-pink-400 border-pink-500/20',
  update:       'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  lottery:      'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20',
  reward:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  order:        'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  announcement: 'mail_detail_category_announcement',
  system:       'mail_detail_category_system',
  maintenance:  'mail_detail_category_maintenance',
  sponsor:      'mail_detail_category_sponsor',
  update:       'mail_detail_category_update',
  lottery:      'mail_detail_category_lottery',
  reward:       'mail_detail_category_reward',
  order:        'mail_detail_category_order',
};

type MailDetailModalProps = {
  mail: MailItem | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onStar?: (id: string) => void;
  renderBody?: (body: string) => React.ReactNode;
  /** modal = centered overlay (default), inline = fill parent panel, fullscreen = mobile slide-in */
  variant?: 'modal' | 'inline' | 'fullscreen';
};

const isVideoUrl = (url: string) => {
  return ['.mp4', '.webm', '.mov', '.avi', '.mkv'].some(ext => url.toLowerCase().includes(ext));
};

export default function MailDetailModal({
  mail,
  onClose,
  onDelete,
  onStar,
  variant = 'modal',
}: MailDetailModalProps) {
  const t = useT();
  const modalRef = useRef<HTMLDivElement>(null);
  const isInline = variant === 'inline';
  const isFullscreen = variant === 'fullscreen';

  // ESC ile kapat (inline panel'de de çalışır)
  useEffect(() => {
    if (isInline && !mail) return undefined;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isInline, mail]);

  // Okundu işaretle
  useEffect(() => {
    if (mail && !mail.is_read && mail.category !== 'reward') {
      void (async () => {
        try {
          await fetchWithCreds(apiUrl('/api/mail'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mail.id })
          });
          window.dispatchEvent(new CustomEvent('mail:refresh'));
        } catch {}
      })();
    }
  }, [mail]);

  if (!mail) {
    if (isInline) {
      return (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl">
            ✉️
          </div>
          <p className="text-sm font-semibold text-white/60">{t('mail_select_prompt')}</p>
          <p className="max-w-[14rem] text-xs text-white/30">{t('mail_empty_box_subtitle2')}</p>
        </div>
      );
    }
    return null;
  }

  const senderCfg = SENDER_CONFIG[mail.category] ?? SENDER_CONFIG.system;
  const senderName = t(senderCfg.nameKey);
  const categoryColor = CATEGORY_COLORS[mail.category] ?? CATEGORY_COLORS.system;
  const categoryLabelKey = CATEGORY_LABEL_KEYS[mail.category];
  const categoryLabel = categoryLabelKey ? t(categoryLabelKey) : mail.category;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  /* ─── Mail İçeriği Render — tüm kategoriler aynı düz görünüm ─── */
  const renderEmailBody = (body: string) => {
    if (!body) return null;

    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);
    if (looksLikeHtml) {
      return (
        <div className="text-sm leading-relaxed text-white/70">
          <div className="mail-body-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
        {body}
      </div>
    );
  };

  const panelInner = (
    <div
      ref={modalRef}
      className={
        isInline
          ? 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0c0e12]'
          : isFullscreen
            ? 'mail-modal-enter relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0c0e12]'
            : 'mail-modal-enter relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0e12]/98 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:rounded-[24px]'
      }
    >
      {/* ═══ Header ═══ */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
            aria-label={t('mail_detail_back_aria')}
          >
            <LuChevronLeft className="h-5 w-5" />
          </button>

          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${categoryColor}`}>
            {categoryLabel}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onStar && (
            <button
              type="button"
              onClick={() => onStar(mail.id)}
              className="rounded-lg p-1.5 transition-all hover:bg-white/[0.06]"
              aria-label={t('mail_detail_star_aria')}
            >
              <LuStar className={`h-4 w-4 transition-colors ${mail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/30 hover:text-yellow-400'}`} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(mail.id)}
              className="rounded-lg p-1.5 text-white/30 transition-all hover:bg-rose-500/10 hover:text-rose-400"
              aria-label={t('mail_detail_delete_aria')}
            >
              <LuTrash2 className="h-4 w-4" />
            </button>
          )}
          {!isInline && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/30 transition-all hover:bg-white/[0.06] hover:text-white sm:hidden"
              aria-label={t('mail_detail_close_aria')}
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ İçerik ═══ */}
      <div className="mail-scroll flex-1 overflow-y-auto">
        <div className="px-5 py-6 sm:px-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {mail.author_avatar_url ? (
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
                  <Image
                    src={mail.author_avatar_url}
                    alt="avatar"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/15 text-lg">
                  {senderCfg.avatar}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">
                    {mail.author_name ?? senderName}
                  </span>
                  {senderCfg.verified && (
                    <LuShield className="h-3.5 w-3.5 text-[#5865F2]" title={t('mail_detail_verified_tooltip')} />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-white/30">{formatDate(mail.created_at)}</p>
              </div>
            </div>
          </div>

          <h1 className="mb-5 text-xl font-bold leading-tight text-white sm:text-2xl">
            {mail.title}
          </h1>

          {mail.image_url && (
            <div className="mb-5 overflow-hidden rounded-xl border border-white/[0.06]">
              {isVideoUrl(mail.image_url) ? (
                <video
                  src={mail.image_url}
                  controls
                  className="max-h-[400px] w-full object-contain bg-black"
                />
              ) : (
                <Image
                  src={mail.image_url}
                  alt="Ek medya"
                  width={800}
                  height={400}
                  className="h-auto max-h-[400px] w-full object-contain"
                  unoptimized
                />
              )}
            </div>
          )}

          <div className="mb-6">
            {renderEmailBody(mail.body ?? '')}
          </div>

          {mail.details_url && (
            <a
              href={mail.details_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/10 px-5 py-2.5 text-sm font-semibold text-[#7289DA] transition-all hover:bg-[#5865F2]/20 hover:text-white"
            >
              <LuExternalLink className="h-4 w-4" />
              {t('mail_detail_view_details')}
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style jsx global>{`
        .mail-modal-enter {
          animation: mailModalIn 0.2s ease-out;
        }
        @keyframes mailModalIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mailSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mail-fullscreen-enter {
          animation: mailSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .mail-body-content,
        .mail-body-content * {
          color: rgba(255, 255, 255, 0.7) !important;
          background-color: transparent !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          font-family: inherit !important;
        }
        .mail-body-content a {
          color: #818cf8 !important;
          text-decoration: underline;
        }
        .mail-body-content a:hover {
          color: #a5b4fc !important;
        }
        .mail-body-content p {
          margin-bottom: 0.5rem;
        }
        .mail-body-content ul, .mail-body-content ol {
          margin-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .mail-body-content li {
          margin-bottom: 0.15rem;
        }
        .mail-body-content h1, .mail-body-content h2, .mail-body-content h3 {
          color: white !important;
          font-weight: 700;
          margin-bottom: 0.5rem;
          margin-top: 0.75rem;
        }
        .mail-body-content h1 { font-size: 1.1rem !important; }
        .mail-body-content h2 { font-size: 0.95rem !important; }
        .mail-body-content h3 { font-size: 0.85rem !important; }
        .mail-body-content div[style*="background: #f"],
        .mail-body-content div[style*="background-color: #f"],
        .mail-body-content div[style*="background: rgb(2"] {
          background: rgba(255, 255, 255, 0.04) !important;
          border-radius: 12px;
          padding: 12px !important;
        }
        .mail-body-content div[style*="border"] {
          border-color: rgba(255, 255, 255, 0.08) !important;
          border-radius: 8px;
        }
        .mail-body-content div[style*="border-left: 4px"] {
          border-left: 3px solid rgba(99, 102, 241, 0.5) !important;
          padding-left: 12px !important;
        }
        .mail-body-content *[style*="color: #10b981"],
        .mail-body-content *[style*="color: #059669"],
        .mail-body-content *[style*="color: rgb(16, 185"] {
          color: #34d399 !important;
        }
        .mail-body-content *[style*="color: #ef4444"],
        .mail-body-content *[style*="color: #dc2626"],
        .mail-body-content *[style*="color: rgb(239, 68"] {
          color: #f87171 !important;
        }
        .mail-body-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.5rem 0;
        }
        .mail-body-content th, .mail-body-content td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          text-align: left;
        }
        .mail-body-content th {
          color: rgba(255, 255, 255, 0.5) !important;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mail-body-content script { display: none; }
        .mail-scroll::-webkit-scrollbar { width: 5px; }
        .mail-scroll::-webkit-scrollbar-track { background: transparent; }
        .mail-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .mail-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      {isInline ? (
        panelInner
      ) : isFullscreen ? (
        <div className="mail-fullscreen-enter fixed inset-0 z-[100] flex flex-col bg-[#0c0e12] pt-[env(safe-area-inset-top,0px)]">
          {panelInner}
        </div>
      ) : (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={(e) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); }}
        >
          {panelInner}
        </div>
      )}
    </>
  );
}
