'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

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
  const t = useT();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const getAuthRedirect = () => {
    const rawRedirect = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? process.env.NEXT_PUBLIC_REDIRECT_URI ?? '';
    const trimmed = rawRedirect.trim();
    if (trimmed !== '') {
      return trimmed.replace(/\/+$/g, '');
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const authRedirect = useMemo(() => {
    const base = getAuthRedirect();
    if (!base) return '';
    return base.endsWith('/auth/callback') ? base : `${base.replace(/\/+$/g, '')}/auth/callback`;
  }, []);

  const joinAuthUrl = useMemo(() => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId || !authRedirect || !ad?.invite_url) return '';
    const statePayload = JSON.stringify({ redirect: ad.invite_url, source: 'discover' });
    const state = encodeURIComponent(statePayload);
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(authRedirect)}&response_type=code&scope=identify%20guilds%20guilds.members.read&prompt=consent&state=${state}`;
  }, [authRedirect, ad?.invite_url]);

  const handlePermissionUpdate = () => {
    if (joinAuthUrl) {
      window.location.href = joinAuthUrl;
      return;
    }
    window.location.reload();
  };

  const handleJoinClick = async () => {
    if (!ad?.invite_url) return;
    setJoinError(null);
    setIsCheckingSession(true);

    let popup: Window | null = null;
    try {
      popup = window.open('', '_blank', 'noopener,noreferrer');
      if (!popup) throw new Error('popup_blocked');

      const response = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        popup.location.href = ad.invite_url;
        return;
      }

      setShowPermissionModal(true);
      popup.close();
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close();
      }
      setShowPermissionModal(true);
    } finally {
      setIsCheckingSession(false);
    }
  };

  useEffect(() => {
    fetch(apiUrl('/api/ads'))
      .then(r => r.json())
      .then((d: { ad: Ad | null }) => setAd(d.ad ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const card = 'rounded-[26px] border border-white/10 bg-gradient-to-br from-[#4a3f45]/80 via-[#3a3540]/85 to-[#2a2f3a]/90 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]';

  return (
    <section className="flex flex-col gap-4 p-3 sm:p-6">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <img src="/icon/discover.png" alt="" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('discover_title')}</h2>
          <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">{t('discover_subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-12 text-white/30">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      ) : ad ? (
        <div className={card}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">{t('discover_featured_badge')}</p>

          <div className="flex items-start gap-4">
            {ad.server_icon ? (
              <Image
                src={ad.server_icon}
                alt={ad.server_name}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-white/10"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white">
                {ad.server_name.charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-white">{ad.server_name}</p>
              {ad.server_description && (
                <p className="mt-1 text-xs text-white/60 line-clamp-2">{ad.server_description}</p>
              )}
              {(ad.member_count != null || ad.online_count != null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-white/45">
                  {ad.online_count != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      {t('discover_online_count', { count: ad.online_count.toLocaleString() })}
                    </span>
                  )}
                  {ad.member_count != null && (
                    <span className="flex items-center gap-1.5">
                      <LuUsers className="h-3.5 w-3.5" />
                      {t('discover_member_count', { count: ad.member_count.toLocaleString() })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void handleJoinClick()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/20 px-5 py-3 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCheckingSession}
            >
              {isCheckingSession ? t('loading') : t('discover_join_button')}
            </button>
            {joinError && (
              <p className="mt-2 text-xs text-rose-300">{joinError}</p>
            )}
          </div>
          {showPermissionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#11151f] p-6 shadow-2xl">
                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl bg-white/5 p-4 text-center">
                    <h3 className="text-lg font-semibold text-white">{t('discover_permission_modal_title')}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      {t('discover_permission_modal_description')}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-white/5 p-4 text-xs text-white/50">
                    {t('discover_permission_modal_hint')}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPermissionModal(false)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 sm:w-auto"
                    >
                      {t('discover_permission_modal_cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handlePermissionUpdate}
                      className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 sm:w-auto"
                    >
                      {t('discover_permission_modal_button')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`${card} text-center py-16`}>
          <p className="text-4xl mb-3">🧭</p>
          <p className="text-sm font-semibold text-white/40">{t('discover_empty_title')}</p>
          <p className="mt-1 text-xs text-white/25">{t('discover_empty_subtitle')}</p>
        </div>
      )}
    </section>
  );
}
