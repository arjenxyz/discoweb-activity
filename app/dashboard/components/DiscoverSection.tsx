'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { apiUrl } from '@/lib/api';

type Ad = {
  id: string;
  invite_url: string;
  server_name: string;
  server_description?: string | null;
  server_icon?: string | null;
  member_count?: number | null;
  online_count?: number | null;
};

export default function DiscoverSection() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/ads'))
      .then(r => r.json())
      .then((d: { ad: Ad | null }) => setAd(d.ad ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const card = 'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5';

  return (
    <section className="flex flex-col gap-4 p-3 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-white">Topluluk</h2>
        <p className="mt-0.5 text-sm text-white/40">Öne çıkan Discord sunucularını keşfet.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-12 text-white/30">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <span className="text-sm">Yükleniyor...</span>
        </div>
      ) : ad ? (
        <div className={card}>
          <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">Öne Çıkan Sunucu</p>

          <div className="flex items-start gap-4">
            {ad.server_icon ? (
              <Image
                src={ad.server_icon}
                alt={ad.server_name}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2]/20 text-2xl font-black text-white">
                {ad.server_name.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xl font-black text-white">{ad.server_name}</p>
              {ad.server_description && (
                <p className="mt-1 text-sm text-white/50 line-clamp-2">{ad.server_description}</p>
              )}
              {(ad.member_count != null || ad.online_count != null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-white/35">
                  {ad.online_count != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {ad.online_count.toLocaleString()} çevrimiçi
                    </span>
                  )}
                  {ad.member_count != null && (
                    <span className="flex items-center gap-1.5">
                      <LuUsers className="h-3.5 w-3.5" />
                      {ad.member_count.toLocaleString()} üye
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <a
              href={ad.invite_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4752C4]"
            >
              Sunucuya Katıl
            </a>
          </div>
        </div>
      ) : (
        <div className={`${card} text-center py-16`}>
          <p className="text-4xl mb-3">🧭</p>
          <p className="text-sm font-semibold text-white/40">Henüz öne çıkan sunucu yok</p>
          <p className="mt-1 text-xs text-white/25">Yakında burada sunucular görünecek.</p>
        </div>
      )}
    </section>
  );
}
