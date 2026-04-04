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
};

const isVideoUrl = (url: string) => {
  return ['.mp4', '.webm', '.mov', '.avi', '.mkv'].some(ext => url.toLowerCase().includes(ext));
};

export default function MailDetailModal({ mail, onClose, onDelete, onStar }: MailDetailModalProps) {
  const t = useT();
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC ile kapat
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Okundu işaretle
  useEffect(() => {
    if (mail && !mail.is_read) {
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

  if (!mail) return null;

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

  /* ─── Mail İçeriği Render ─── */
  const renderEmailBody = (body: string, category: string) => {
    if (!body) return null;

    // Makbuz render (order/reward - metadata varsa)
    if (category === 'order' || category === 'reward') {
      try {
        type MailMetadata = {
          items?: Array<{ title: string; total: number }>;
          subtotal?: number;
          discount?: number;
          total?: number;
          purchase_date?: string;
          coupon_code?: string;
          coupon_pct?: number;
          reward_amount?: number;
        };
        const meta: MailMetadata | undefined = (mail as { metadata?: MailMetadata })?.metadata;

        // Ödül maili (reward_amount varsa)
        if (meta && typeof meta === 'object' && typeof meta.reward_amount === 'number') {
          return (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">🎁</div>
                <div>
                  <p className="text-sm font-bold text-white">{mail.title}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{formatDate(mail.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-sm text-white/60">{t('mail_receipt_reward_amount')}</span>
                <span className="text-lg font-bold text-emerald-400">+{meta.reward_amount.toFixed(2)} Papel</span>
              </div>
              {body && (
                <div className="mt-4 text-sm text-white/60 leading-relaxed">
                  <div className="mail-body-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
                </div>
              )}
            </div>
          );
        }

        // Sipariş makbuzu (items varsa)
        if (meta && typeof meta === 'object' && Array.isArray(meta.items)) {
          const items = meta.items;
          const subtotal = Number(meta.subtotal || 0);
          const discount = Number(meta.discount || 0);
          const total = Number(meta.total || 0);

          return (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5865F2]/70">{t('mail_receipt_label')}</p>
                  <p className="text-base font-bold text-white mt-1">{mail.title}</p>
                </div>
                <p className="text-[11px] text-white/40">{formatDate(meta.purchase_date || mail.created_at)}</p>
              </div>

              <div className="space-y-2">
                {items.map((it: { title: string; total: number }, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-sm text-white/80 truncate">{it.title}</span>
                    <span className="text-sm font-bold font-mono text-indigo-400 ml-3">{Number(it.total).toFixed(2)} Papel</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2">
                <div className="flex justify-between text-sm px-1">
                  <span className="text-white/40">{t('mail_receipt_subtotal')}</span>
                  <span className="text-white/60">{subtotal.toFixed(2)} Papel</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm px-1">
                    <span className="text-white/40">{t('mail_receipt_discount')}</span>
                    <span className="text-emerald-400">-{discount.toFixed(2)} Papel</span>
                  </div>
                )}
                {meta.coupon_code && (
                  <div className="px-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
                      {t('mail_receipt_coupon_label')} <span className="font-mono font-bold">{meta.coupon_code}</span>
                      {meta.coupon_pct && <span>({meta.coupon_pct}%)</span>}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 px-1">
                  <span className="text-base font-bold text-white">{t('mail_receipt_total')}</span>
                  <span className="text-xl font-black text-white">{total.toFixed(2)} Papel</span>
                </div>
              </div>
            </div>
          );
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) { /* fallback aşağıda */ }
    }

    // Genel HTML içerik
    const safeBody = sanitizeHtml(body);
    return (
      <div className="text-sm text-white/70 leading-relaxed">
        <div className="mail-body-content" dangerouslySetInnerHTML={{ __html: safeBody }} />
      </div>
    );
  };

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

        /* --- Mail içerik stilleri (dark theme uyumlu) --- */
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

        /* Eski template light background'ları dark'a çevir */
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

        /* Yeşil/kırmızı renkler korunsun */
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

        /* Tablo stilleri */
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

        /* Gereksiz stili gizle */
        .mail-body-content script { display: none; }

        /* Scrollbar */
        .mail-scroll::-webkit-scrollbar { width: 5px; }
        .mail-scroll::-webkit-scrollbar-track { background: transparent; }
        .mail-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .mail-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
        onClick={(e) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); }}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className="mail-modal-enter relative w-full max-w-2xl rounded-2xl sm:rounded-[24px] border border-white/[0.08] bg-[#0c0e12]/98 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* ═══ Header ═══ */}
          <div className="flex-shrink-0 px-4 sm:px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                aria-label={t('mail_detail_back_aria')}
              >
                <LuChevronLeft className="w-5 h-5" />
              </button>

              {/* Kategori etiketi */}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${categoryColor}`}>
                {categoryLabel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onStar && (
                <button
                  onClick={() => onStar(mail.id)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
                  aria-label={t('mail_detail_star_aria')}
                >
                  <LuStar className={`w-4 h-4 transition-colors ${mail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/30 hover:text-yellow-400'}`} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(mail.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  aria-label={t('mail_detail_delete_aria')}
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all sm:hidden"
                aria-label={t('mail_detail_close_aria')}
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ═══ İçerik ═══ */}
          <div className="flex-1 overflow-y-auto mail-scroll">
            <div className="px-5 sm:px-8 py-6">

              {/* Gönderici & Tarih */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {mail.author_avatar_url ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.06]">
                      <Image
                        src={mail.author_avatar_url}
                        alt="avatar"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#5865F2]/15 flex items-center justify-center text-lg flex-shrink-0">
                      {senderCfg.avatar}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">
                        {mail.author_name ?? senderName}
                      </span>
                      {senderCfg.verified && (
                        <LuShield className="w-3.5 h-3.5 text-[#5865F2]" title={t('mail_detail_verified_tooltip')} />
                      )}
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5">{formatDate(mail.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Başlık */}
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-5 leading-tight">
                {mail.title}
              </h1>

              {/* Ek Medya (üstte, içerikten önce) */}
              {mail.image_url && (
                <div className="mb-5 rounded-xl overflow-hidden border border-white/[0.06]">
                  {isVideoUrl(mail.image_url) ? (
                    <video
                      src={mail.image_url}
                      controls
                      className="w-full max-h-[400px] object-contain bg-black"
                    />
                  ) : (
                    <Image
                      src={mail.image_url}
                      alt="Ek medya"
                      width={800}
                      height={400}
                      className="w-full h-auto object-contain max-h-[400px]"
                      unoptimized
                    />
                  )}
                </div>
              )}

              {/* Mail İçeriği */}
              <div className="mb-6">
                {renderEmailBody(mail.body ?? '', mail.category)}
              </div>

              {/* Detay Linki */}
              {mail.details_url && (
                <a
                  href={mail.details_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 text-[#7289DA] hover:text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <LuExternalLink className="w-4 h-4" />
                  {t('mail_detail_view_details')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
