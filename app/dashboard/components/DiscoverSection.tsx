'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';
import { getDiscordSdk } from '@/lib/discordSdk';

type Ad = {
  id: string;
  invite_url: string;
  server_name: string;
  server_description?: string | null;
  server_icon?: string | null;
  member_count?: number | null;
  online_count?: number | null;
  target_guild_id?: string | null;
};

export default function DiscoverSection() {
  const t = useT();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [memberStatuses, setMemberStatuses] = useState<Record<string, 'loading' | 'member' | 'not_member' | 'unknown'>>({});
  const [joinLoadings, setJoinLoadings] = useState<Record<string, boolean>>({});
  const [joinedSet, setJoinedSet] = useState<Record<string, boolean>>({});
  const [joinErrors, setJoinErrors] = useState<Record<string, string | null>>({});

  const [reauthLoading, setReauthLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionTargetId, setPermissionTargetId] = useState<string | null>(null);

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

  const targetAd = useMemo(() => ads.find(a => a.id === permissionTargetId), [ads, permissionTargetId]);

  const joinAuthUrl = useMemo(() => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId || !authRedirect || !targetAd?.target_guild_id) return '';
    const statePayload = JSON.stringify({ guild_id: targetAd.target_guild_id, source: 'discover' });
    const state = encodeURIComponent(statePayload);
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(authRedirect)}&response_type=code&scope=identify%20guilds%20guilds.members.read%20guilds.join&prompt=consent&state=${state}`;
  }, [authRedirect, targetAd?.target_guild_id]);

  const handlePermissionUpdate = async () => {
    if (!targetAd?.target_guild_id) {
      if (joinAuthUrl) {
        window.location.href = joinAuthUrl;
        return;
      }
      window.location.reload();
      return;
    }

    const sdk = getDiscordSdk();
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!sdk || !clientId) {
      setShowPermissionModal(false);
      if (joinAuthUrl) {
        window.location.href = joinAuthUrl;
        return;
      }
      setJoinErrors(prev => ({ ...prev, [targetAd.id]: t('discover_activity_sdk_missing') }));
      return;
    }

    setJoinErrors(prev => ({ ...prev, [targetAd.id]: null }));
    setReauthLoading(true);
    try {
      const authorizeCommand = (sdk.commands as unknown as {
        authorize: (args: { client_id: string; scope: string[]; prompt: string }) => Promise<{ code: string }>;
      }).authorize;
      const authResult = await authorizeCommand({
        client_id: clientId,
        scope: ['identify', 'guilds', 'guilds.members.read', 'guilds.join', 'rpc.activities.write'],
        prompt: 'consent',
      });

      const code = authResult?.code;
      if (!code) {
        throw new Error('missing_discord_code');
      }

      const locale = ((sdk as unknown as { locale?: string }).locale ?? navigator.language) || 'en';
      const authResponse = await fetch(apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(targetAd.target_guild_id)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, locale }),
      });

      if (!authResponse.ok) {
        const text = await authResponse.text().catch(() => '');
        throw new Error(text || 'auth_failed');
      }

      setShowPermissionModal(false);
      await handleJoinClick(targetAd);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJoinErrors(prev => ({ ...prev, [targetAd.id]: message || t('discover_join_error') }));
    } finally {
      setReauthLoading(false);
    }
  };

  const handleJoinClick = async (ad: Ad) => {
    setJoinErrors(prev => ({ ...prev, [ad.id]: null }));
    setJoinLoadings(prev => ({ ...prev, [ad.id]: true }));

    const guildId = ad.target_guild_id;
    if (!guildId) {
      try {
        const sdk = getDiscordSdk();
        if (sdk) {
          await sdk.commands.openExternalLink({ url: ad.invite_url });
          setJoinLoadings(prev => ({ ...prev, [ad.id]: false }));
          return;
        }
      } catch {
        // fallback
      }
      window.open(ad.invite_url, '_blank', 'noopener,noreferrer');
      setJoinLoadings(prev => ({ ...prev, [ad.id]: false }));
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/member/discord-join?guild_id=${encodeURIComponent(guildId)}`), {
        method: 'POST',
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        setPermissionTargetId(ad.id);
        setShowPermissionModal(true);
        setJoinLoadings(prev => ({ ...prev, [ad.id]: false }));
        return;
      }

      const data = await response.json().catch(() => null);
      if (response.ok) {
        setJoinedSet(prev => ({ ...prev, [ad.id]: true }));
        setMemberStatuses(prev => ({ ...prev, [ad.id]: 'member' }));
        return;
      }

      if (data?.needs_reauth || data?.error === 'missing_scope' || data?.error === 'missing_token' || data?.error === 'unauthorized') {
        setPermissionTargetId(ad.id);
        setShowPermissionModal(true);
        setJoinLoadings(prev => ({ ...prev, [ad.id]: false }));
        return;
      }

      if (data?.error) {
        setJoinErrors(prev => ({ ...prev, [ad.id]: t('discover_join_error_detail', { reason: String(data.error) }) }));
        return;
      }

      setJoinErrors(prev => ({ ...prev, [ad.id]: t('discover_join_error') }));
    } catch {
      setJoinErrors(prev => ({ ...prev, [ad.id]: t('discover_join_error') }));
    } finally {
      setJoinLoadings(prev => ({ ...prev, [ad.id]: false }));
    }
  };

  useEffect(() => {
    fetch(apiUrl('/api/ads'))
      .then(r => r.json())
      .then((d: { ads?: Ad[] }) => setAds(d.ads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!ads.length) return;

    const controller = new AbortController();
    const checkMembership = async () => {
      const initialStatuses: Record<string, 'loading'> = {};
      ads.forEach(ad => { initialStatuses[ad.id] = 'loading'; });
      setMemberStatuses(prev => ({ ...prev, ...initialStatuses }));

      const newStatuses: Record<string, 'loading' | 'member' | 'not_member' | 'unknown'> = {};
      const newJoined: Record<string, boolean> = {};

      await Promise.all(ads.map(async (ad) => {
        if (!ad.target_guild_id) {
          newStatuses[ad.id] = 'not_member';
          return;
        }

        try {
          const response = await fetch(apiUrl(`/api/member/discord-join?guild_id=${encodeURIComponent(ad.target_guild_id)}`), {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          });

          if (!response.ok) {
            newStatuses[ad.id] = 'not_member';
            return;
          }

          const data = (await response.json()) as { member: boolean };
          newStatuses[ad.id] = data.member ? 'member' : 'not_member';
          if (data.member) newJoined[ad.id] = true;
        } catch {
          if (!controller.signal.aborted) {
            newStatuses[ad.id] = 'not_member';
          }
        }
      }));

      setMemberStatuses(prev => ({ ...prev, ...newStatuses }));
      setJoinedSet(prev => ({ ...prev, ...newJoined }));
    };

    void checkMembership();
    return () => controller.abort();
  }, [ads]);

  const card = 'rounded-[26px] border border-white/10 bg-gradient-to-br from-[#4a3f45]/80 via-[#3a3540]/85 to-[#2a2f3a]/90 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]';

  return (
    <section className="flex flex-col gap-4 p-3 sm:p-6">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Image src="/icon/discover.png" alt="" width={28} height={28} className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
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
      ) : ads.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {ads.map((ad) => {
            const memberStatus = memberStatuses[ad.id] || 'loading';
            const isJoined = joinedSet[ad.id];
            const isJoinLoading = joinLoadings[ad.id];
            const error = joinErrors[ad.id];

            return (
              <div key={ad.id} className={card}>
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
                  {memberStatus === 'member' || isJoined ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                      {t('discover_member_status_joined')}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleJoinClick(ad)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/20 px-5 py-3 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isJoinLoading || reauthLoading}
                      >
                        {isJoinLoading ? t('discover_joining') : t('discover_join_button')}
                      </button>
                      {memberStatus === 'unknown' && (
                        <p className="mt-2 text-xs text-white/50">{t('discover_member_status_check_failed')}</p>
                      )}
                      {isJoined && (
                        <p className="mt-2 text-xs text-emerald-200">{t('discover_join_success')}</p>
                      )}
                      {error && (
                        <p className="mt-2 text-xs text-rose-300">{error}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {showPermissionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#11151f] p-6 shadow-2xl">
                <div className="flex flex-col gap-4">
                  <div className="rounded-3xl bg-white/5 p-4 text-center">
                    <h3 className="text-lg font-semibold text-white">Sunuculara Katılma Yetkisi Gerekiyor</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      Size daha iyi bir hizmet verebilmek ve topluluk sunucularımıza otomatik olarak katılabilmenizi sağlamak için Discord'dan "Sunuculara Katılma" (guilds.join) yetkisini almamız gerekmektedir. Bu yetki sayesinde, tek tıkla seçtiğiniz topluluk sunucularına anında katılabilirsiniz.
                    </p>
                  </div>

                  <div className="rounded-3xl bg-white/5 p-4 text-xs text-white/50">
                    Eğer bu yetkiyi vermek istemiyorsanız "İptal / İstemiyorum" butonuna basabilirsiniz, ancak otomatik katılma özelliklerinden yararlanamazsınız.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPermissionModal(false)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 sm:w-auto"
                    >
                      İptal / İstemiyorum
                    </button>
                    <button
                      type="button"
                      onClick={handlePermissionUpdate}
                      disabled={reauthLoading}
                      className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {reauthLoading ? 'Yetkiler Güncelleniyor...' : 'Yetkiyi Güncelle'}
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
