import Image from 'next/image';
import type { MailItem } from '../types';
import { LuUser, LuCalendar, LuTag, LuExternalLink, LuChevronLeft } from 'react-icons/lu';
import { resolveMailTitle } from '@/lib/mailI18n';

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  announcement: 'mail_detail_category_announcement',
  maintenance: 'mail_detail_category_maintenance',
  sponsor: 'mail_detail_category_sponsor',
  update: 'mail_detail_category_update',
  lottery: 'mail_detail_category_lottery',
  reward: 'mail_detail_category_reward',
};

const CATEGORY_COLORS: Record<string, string> = {
  announcement: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  maintenance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  sponsor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  update: 'bg-green-500/10 text-green-300 border-green-500/20',
  lottery: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
  reward: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

type Props = {
  mail: MailItem;
  onClose: () => void;
  renderBody: (body: string) => React.ReactNode;
  t: (key: string) => string;
};

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};


export default function MailDetailView({ mail, onClose, renderBody, t }: Props) {
  const categoryColor = CATEGORY_COLORS[mail.category] || 'bg-gray-500/10 text-gray-300 border-gray-500/20';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0f1a] via-[#0a1220] to-[#070b12] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0f1a]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <LuChevronLeft className="h-4 w-4" />
                <span>{t('mail_back_button')}</span>
              </button>
              <div className="h-6 w-px bg-white/10 hidden sm:block" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">{t('mail_detail_back_to_mail')}</p>
                <h1 className="text-lg font-bold text-white leading-tight max-w-2xl truncate">
                  {resolveMailTitle(mail, t)}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${categoryColor}`}>
                <LuTag className="h-3 w-3" />
                {CATEGORY_LABEL_KEYS[mail.category] ? t(CATEGORY_LABEL_KEYS[mail.category]) : mail.category}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Author Info */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {mail.author_avatar_url ? (
                <Image
                  src={mail.author_avatar_url}
                  alt="Gönderen"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full border-2 border-white/10 shadow-xl"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center shadow-xl">
                  <LuUser className="h-10 w-10 text-white/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-3">
                {mail.author_name && (
                  <h2 className="text-xl font-semibold text-white">{mail.author_name}</h2>
                )}
                <div className="flex items-center gap-1 text-sm text-white/40">
                  <LuCalendar className="h-4 w-4" />
                  {new Date(mail.created_at).toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <p className="text-base text-white/60 leading-relaxed">
                {t('mail_detail_sent_by')}
              </p>
            </div>
          </div>

          {/* Message Content */}
          <div className="rounded-3xl border border-white/10 bg-white/5/50 p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="text-white/95 leading-relaxed text-lg break-words overflow-wrap-anywhere">
              {renderBody(mail.body)}
            </div>
          </div>

          {/* Media Content */}
          {mail.image_url && (
            <div className="rounded-3xl border border-white/10 bg-black/20 overflow-hidden shadow-2xl max-w-4xl mx-auto">
              {isVideoUrl(mail.image_url) ? (
                <video
                  src={mail.image_url}
                  controls
                  className="w-full max-h-[600px] object-contain"
                  poster={mail.image_url.replace(/\.(mp4|webm|mov|avi|mkv)$/i, '.jpg')}
                >
                  {t('mail_detail_video_fallback')}
                </video>
              ) : (
                <Image
                  src={mail.image_url}
                  alt={t('mail_detail_image_alt')}
                  width={1600}
                  height={800}
                  unoptimized
                  className="w-full max-h-[600px] object-contain"
                />
              )}
            </div>
          )}

          {/* Details Link */}
          {mail.details_url && (
            <div className="flex justify-center pt-8">
              <a
                href={mail.details_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold text-lg transition hover:border-white/40 hover:bg-white/10 hover:text-white hover:shadow-2xl group"
              >
                <span>{t('mail_detail_view_details')}</span>
                <LuExternalLink className="h-6 w-6 transition group-hover:translate-x-1" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
