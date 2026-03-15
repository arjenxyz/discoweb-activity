"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MailItem } from '../../types';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import {
  LuReply,
  LuReplyAll,
  LuForward,
  LuArchive,
  LuTrash2,
  LuMoveVertical,
  LuStar,
  LuPrinter,
  LuDownload,
  LuChevronLeft,
  LuClock,
  LuShield,
  LuLoaderCircle,
} from 'react-icons/lu';

const SENDER_CONFIG = {
  announcement: { name: 'Sistem Duyuruları', email: 'announcements@system.local', avatar: '🔔', verified: true },
  system: { name: 'Sistem Yöneticisi', email: 'system@noreply.local', avatar: '⚙️', verified: true },
  maintenance: { name: 'Bakım Ekibi', email: 'maintenance@system.local', avatar: '🔧', verified: true },
  sponsor: { name: 'İş Ortaklıkları', email: 'partnerships@system.local', avatar: '💼', verified: false },
  update: { name: 'Ürün Güncellemeleri', email: 'updates@system.local', avatar: '✨', verified: true },
  lottery: { name: 'Kampanya Yönetimi', email: 'campaigns@system.local', avatar: '🎉', verified: false },
  reward: { name: 'Ödül Merkezi', email: 'rewards@system.local', avatar: '🎁', verified: true },
  order: { name: 'Sipariş Yönetimi', email: 'orders@system.local', avatar: '📦', verified: true },
} as const;

const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

export default function MailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [mail, setMail] = useState<MailItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWithCreds(apiUrl('/api/mail'));
        if (!res.ok) {
          setError('Mesaj yüklenemedi');
          setLoading(false);
          return;
        }
        const data = (await res.json()) as MailItem[];
        const found = data.find((m) => String(m.id) === String(id)) ?? null;
        if (!mounted) return;
        if (!found) {
          setError('Mesaj bulunamadı');
          setMail(null);
        } else {
          setMail(found);
          setError(null);
          if (!found.is_read) {
            try {
              await fetchWithCreds(apiUrl('/api/mail'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: found.id }) });
            } catch {}
            try { window.dispatchEvent(new CustomEvent('mail:refresh')); } catch {}
          }
        }
      } catch (e) {
        setError('Mesaj yüklenemedi');
      }
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [id]);

  if (!id) return <div className="p-6">Geçersiz mesaj</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-full hover:bg-gray-100">
            <LuChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-medium">Mesaj</h2>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-500">
            <LuLoaderCircle className="w-8 h-8 animate-spin mx-auto mb-3" />
            Yükleniyor...
          </div>
        )}

        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
        )}

        {!loading && mail && (
          <article className="bg-white">
            <h1 className="text-2xl font-normal mb-4">{mail.title}</h1>

            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-medium">
                    {(SENDER_CONFIG as any)[mail.category]?.avatar ?? '📨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{(SENDER_CONFIG as any)[mail.category]?.name ?? 'Gönderici'}</span>
                      {((SENDER_CONFIG as any)[mail.category]?.verified) && (
                        <LuShield className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">bana</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 flex-shrink-0">
                  <div className="text-xs text-gray-500 text-right">
                    <div>{new Date(mail.created_at).toLocaleString('tr-TR')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="prose max-w-none text-gray-800">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(mail.body ?? '') }} />
            </div>

            {mail.image_url && (
              <div className="mt-6">
                {isVideoUrl(mail.image_url) ? (
                  <video src={mail.image_url} controls className="w-full max-h-[500px] object-contain bg-black" />
                ) : (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <Image src={mail.image_url} alt="Ek" width={1200} height={600} className="w-full h-auto object-contain" unoptimized />
                  </div>
                )}
              </div>
            )}

            {mail.details_url && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-900">Daha fazla bilgi için tıklayın</div>
                  <a href={mail.details_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded">Detayları Gör</a>
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
