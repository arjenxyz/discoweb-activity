'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { setDiscordSdk } from '@/lib/discordSdk';
import { useLocale, useT } from '@/contexts/LocaleContext';
import DmScreen from '@/app/dashboard/components/DmScreen';
import { VideoBackground, MuteButton } from '@/app/dashboard/components/VideoBackground';
import {
  DiscordSdkRichPresenceProvider,
  applyRichPresence,
  RichPresenceConfig,
} from '@/services/richPresence';

interface DiscordActivityAuthProps {
  children: React.ReactNode;
}

const isInIframe = () => {
  if (typeof window === 'undefined') return false;
  try { return window.self !== window.top; } catch { return true; }
};

const isLocalDevBrowserHost = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
};

const isLocalDevBrowser = () =>
  process.env.NODE_ENV === 'development' && isLocalDevBrowserHost();

const isDiscordEmbedRuntime = () => {
  if (typeof window === 'undefined') return false;
  // localhost geliştirmede frame_id veya Discord UA olsa bile Activity sayma
  if (isLocalDevBrowserHost()) return false;
  const host = window.location.host;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const hasFrameId = new URLSearchParams(window.location.search).has('frame_id');
  return (
    host.includes('discordsays.com') ||
    host.includes('discord.com') ||
    userAgent.includes('Discord') ||
    hasFrameId
  );
};

const bootstrapLocalDevSession = async (
  guildId: string,
  signal: AbortSignal,
  setDiscordLocale: (locale: string) => void,
) => {
  try {
    const timeoutController = new AbortController();
    const timeoutId = window.setTimeout(() => timeoutController.abort(), 5000);
    const onParentAbort = () => timeoutController.abort();
    signal.addEventListener('abort', onParentAbort, { once: true });
    const res = await fetch(apiUrl('/api/activity/dev-session'), {
      signal: timeoutController.signal,
      credentials: 'include',
    });
    window.clearTimeout(timeoutId);
    signal.removeEventListener('abort', onParentAbort);
    if (res.ok) {
      const json = (await res.json()) as { token?: string };
      if (json.token) {
        try { localStorage.setItem('discord_bearer_token', json.token); } catch {}
      }
    }
  } catch {
    // cookie/session olmadan da API localhost bypass ile çalışır
  }
  const selectedGuild = guildId || 'dev-guild';
  setCookie('selected_guild_id', selectedGuild);
  try {
    localStorage.setItem('selectedGuildId', selectedGuild);
    localStorage.setItem('auth_ready', '1');
    localStorage.removeItem('discord_frame_id');
    const url = new URL(window.location.href);
    if (url.searchParams.has('frame_id') || url.searchParams.has('instance_id')) {
      url.searchParams.delete('frame_id');
      url.searchParams.delete('instance_id');
      window.history.replaceState(null, '', url.toString());
    }
  } catch {}
  setDiscordLocale(navigator.language);
};

const setCookie = (name: string, value: string, maxAge = 604800) => {
  const sameSite = window.location.protocol === 'https:' ? 'None' : 'Lax';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
};

const clearAuthState = () => {
  // Sunucu tarafındaki session cookie'leri temizle
  document.cookie = 'discord_session=; Path=/; Max-Age=0';
  document.cookie = 'selected_guild_id=; Path=/; Max-Age=0';
  // localStorage'dan auth verilerini temizle (artık auth için kullanılmıyor ama temiz kalsın)
  try {
    localStorage.removeItem('discordUser');
    localStorage.removeItem('discord_bearer_token');
    localStorage.removeItem('auth_ready');
  } catch {}
};

export default function DiscordActivityAuth({ children }: DiscordActivityAuthProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDmContext, setIsDmContext] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const userInfoRef = useRef<{ username: string; avatar: string | null } | null>(null);
  const { setDiscordLocale } = useLocale();

  const addLog = useCallback((msg: string) => {
    console.log('[DiscordAuth]', msg);
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const inDiscordRuntime = isDiscordEmbedRuntime();
    if (!inDiscordRuntime) return;

    const updateMiniMode = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isMini = w <= 320 || h <= 280;
      if (isMini) {
        document.body.dataset.discordMini = '1';
      } else {
        delete document.body.dataset.discordMini;
      }
    };

    updateMiniMode();
    window.addEventListener('resize', updateMiniMode);
    window.visualViewport?.addEventListener('resize', updateMiniMode);

    return () => {
      window.removeEventListener('resize', updateMiniMode);
      window.visualViewport?.removeEventListener('resize', updateMiniMode);
      delete document.body.dataset.discordMini;
    };
  }, []);

  useEffect(() => {
    const clearActivitySessionData = () => {
      try {
        localStorage.removeItem('selectedGuildId');
        localStorage.removeItem('discord_frame_id');
        localStorage.removeItem('discord_instance_id');
        localStorage.removeItem('discord_bearer_token');
        localStorage.removeItem('discord_locale');
        localStorage.removeItem('auth_ready');
      } catch {
        // ignore
      }
      document.cookie = 'selected_guild_id=; Path=/; Max-Age=0';
      document.cookie = 'discord_session=; Path=/; Max-Age=0';
    };

    const sendLeaveBeacon = () => {
      const info = userInfoRef.current;
      const blob = new Blob(
        [JSON.stringify(info ? { username: info.username } : {})],
        { type: 'application/json' },
      );
      navigator.sendBeacon(apiUrl('/api/activity/leave'), blob);
    };

    const onPageHide = () => {
      sendLeaveBeacon();
      clearActivitySessionData();
    };

    window.addEventListener('beforeunload', clearActivitySessionData);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('beforeunload', clearActivitySessionData);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const hardTimeoutId = window.setTimeout(() => {
      if (!signal.aborted) {
        setError('[DW-1002] Authentication timeout. Lütfen Activity penceresini kapatıp tekrar açın.');
        setIsLoading(false);
      }
    }, 90000);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const id = window.setTimeout(() => reject(new Error(label)), ms);
        promise.then(resolve).catch(reject).finally(() => window.clearTimeout(id));
      });

    const withRetry = async <T,>(fn: () => Promise<T>, attempts = 3, delay = 500, label = ''): Promise<T> => {
      let last: unknown;
      for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (e) {
          last = e;
          if (i < attempts - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
      }
      throw new Error(`${label} failed after ${attempts} attempts: ${String(last)}`);
    };

    async function runSdkAuth(clientId: string, guildId: string, frameId: string | null) {
      const { DiscordSDK } = await import('@discord/embedded-app-sdk');

      // frame_id URL'de yoksa storage'dan ekle
      if (frameId && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('frame_id') && !url.searchParams.has('instance_id')) {
          url.searchParams.set('frame_id', frameId);
          window.history.replaceState(null, '', url.toString());
        }
      }

      const sdk = new DiscordSDK(clientId);
      addLog('sdk.ready() bekleniyor...');
      await withRetry(() => withTimeout(sdk.ready(), 12000, 'sdk_ready_timeout'), 3, 600, 'sdk_ready');
      if (signal.aborted) return;
      addLog('sdk.ready() BAŞARILI');
      setDiscordSdk(sdk);

      // Discord kullanıcısının dil ayarını al ve locale'i set et
      // 1. sdk.commands.userSettingsGetLocale() — en güvenilir yol
      // 2. URL param ?locale=tr (Discord bazı versiyonlarda geçirir)
      // 3. sdk.locale property (bazı SDK versiyonlarında mevcut)
      // 4. navigator.language fallback
      let sdkLocale = navigator.language;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localeResult = await (sdk.commands as any).userSettingsGetLocale?.();
        if (localeResult?.locale) {
          sdkLocale = localeResult.locale;
          addLog(`userSettingsGetLocale: ${sdkLocale}`);
        } else {
          throw new Error('no locale from command');
        }
      } catch {
        // URL param kontrolü
        const urlLocale = new URLSearchParams(window.location.search).get('locale');
        if (urlLocale) {
          sdkLocale = urlLocale;
          addLog(`URL locale: ${sdkLocale}`);
        } else {
          // sdk.locale property fallback
          const propLocale = (sdk as unknown as { locale?: string }).locale;
          if (propLocale) {
            sdkLocale = propLocale;
            addLog(`sdk.locale property: ${sdkLocale}`);
          } else {
            addLog(`navigator.language fallback: ${sdkLocale}`);
          }
        }
      }
      setDiscordLocale(sdkLocale);
      try { localStorage.setItem('discord_locale', sdkLocale); } catch {}
      addLog(`Locale ayarlandı: ${sdkLocale}`);

      // prompt=none önce dene, başarısızsa consent ile
      let code: string;
      try {
        const res = await withTimeout(
          sdk.commands.authorize({ client_id: clientId, scope: ['identify', 'guilds', 'rpc.activities.write'], prompt: 'none' }),
          15000, 'auth_none_timeout'
        );
        code = res.code;
        addLog('authorize(none) başarılı');
      } catch {
        addLog('authorize(none) başarısız, consent deneniyor...');
        const consentRes = await withTimeout<{ code: string }>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sdk.commands.authorize as any)({ client_id: clientId, scope: ['identify', 'guilds', 'rpc.activities.write'], prompt: 'consent' }),
          15000, 'auth_consent_timeout'
        );
        code = consentRes.code;
        addLog('authorize(consent) başarılı');
      }
      if (signal.aborted) return;

      addLog('Backend auth endpoint çağrılıyor...');
      const response = await fetch(apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(guildId)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, locale: sdkLocale }),
        signal,
      });
      if (signal.aborted) return;

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Backend auth hatası: ${response.status} ${text}`);
      }

      const result = await response.json() as {
        status: string;
        user?: { id: string; username: string; guildName?: string | null };
        bearerToken?: string;
        reason?: string;
      };

      if (result.status !== 'ok') {
        throw new Error(`Auth başarısız: ${result.reason ?? 'bilinmeyen sebep'}`);
      }

      // Bearer token'ı localStorage'a kaydet (fetchWithCreds için gerekli)
      if (result.bearerToken) {
        try { localStorage.setItem('discord_bearer_token', result.bearerToken); } catch {}
      }

      if (result.user) {
        userInfoRef.current = { username: result.user.username, avatar: null };
        if (result.user.guildName && guildId) {
          try { localStorage.setItem(`discord_guild_name_${guildId}`, result.user.guildName); } catch {}
        }
      }
      addLog(`SDK auth tamamlandı, kullanıcı: ${result.user?.username}`);

      // Rich Presence ayarla
      try {
        const rpGuildName = result.user?.guildName ?? null;

        const richPresenceConfig: RichPresenceConfig = {
          guildName: rpGuildName,
          state: 'Economy & Role Management',
          buttons: [{ label: 'Open DiscoWeb', url: 'https://discoweb.tech' }],
          assets: { large_image: 'discoweb', large_text: 'DiscoWeb' },
        };

        const provider = new DiscordSdkRichPresenceProvider(
          sdk as unknown as { commands: { setActivity: (activity: { activity: unknown }) => Promise<unknown> } },
        );

        await applyRichPresence(provider, richPresenceConfig, addLog);
      } catch {
        addLog('Rich Presence ayarlanamadı (görmezden gelinir)');
      }

      // ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE — kendi userId'si listeden çıkınca beacon at
      if (result.user?.id) {
        const currentUserId = result.user.id;
        try {
          await sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', ({ participants }) => {
            const stillHere = participants.some((p: { id: string }) => p.id === currentUserId);
            if (!stillHere) {
              const info = userInfoRef.current;
              const blob = new Blob(
                [JSON.stringify(info ? { username: info.username } : {})],
                { type: 'application/json' },
              );
              navigator.sendBeacon(apiUrl('/api/activity/leave'), blob);
            }
          });
          addLog('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE subscribe edildi');
        } catch {
          addLog('Participants subscribe başarısız (fallback: pagehide beacon aktif)');
        }
      }
    }

    async function authenticate() {
      addLog('authenticate() başladı');

      const urlParams = new URLSearchParams(window.location.search);
      const guildId = urlParams.get('guild_id') ?? '';
      const frameIdFromUrl = urlParams.get('frame_id') || urlParams.get('instance_id');
      const isDevMode = process.env.NODE_ENV === 'development';
      const inDiscordRuntime = isDiscordEmbedRuntime();
      const isLocalhost = isLocalDevBrowserHost();

      addLog(`guildId=${guildId}, dev=${isDevMode}, discord=${inDiscordRuntime}, localhost=${isLocalhost}`);

      // Localhost dev: Discord OAuth / SDK yok — her zaman örnek session ile devam
      if (isLocalDevBrowser()) {
        addLog('Localhost dev session aktif (Discord auth atlandı)');
        await bootstrapLocalDevSession(guildId, signal, setDiscordLocale);
        if (signal.aborted) return;
        setIsLoading(false);
        addLog('Localhost session hazır');
        return;
      }

      // DM veya grup sohbeti tespiti: Discord runtime'da guild_id yoksa DmScreen göster
      if (inDiscordRuntime && !isDevMode && !guildId) {
        addLog('guild_id yok → DM veya grup sohbeti, DmScreen gösteriliyor');
        setIsDmContext(true);
        setIsLoading(false);
        return;
      }

      // frame_id'yi storage'a kaydet
      if (frameIdFromUrl) {
        try { localStorage.setItem('discord_frame_id', frameIdFromUrl); } catch {}
      }

      // Guild cookie'yi her zaman güncel tut
      if (guildId) {
        setCookie('selected_guild_id', guildId);
        try { localStorage.setItem('selectedGuildId', guildId); } catch {}
      }

      const storedFrameId = (() => { try { return localStorage.getItem('discord_frame_id'); } catch { return null; } })();
      const currentFrameId = frameIdFromUrl || storedFrameId;

      // --- YENİ SESSION KONTROLÜ ---
      // frame_id URL'den geldi ve storage'dakinden farklıysa → yeni session → auth temizle
      const isNewSession = inDiscordRuntime && frameIdFromUrl && frameIdFromUrl !== storedFrameId;
      if (isNewSession) {
        addLog(`Yeni Activity session: frame_id değişti → auth temizleniyor`);
        clearAuthState();
      }

      // --- HIZLI YOL: Sunucu session'ı hâlâ geçerli mi? ---
      // Yeni session değilse veya dev modundaysa cookie'yi doğrula
      if (!isNewSession) {
        try {
          addLog('/api/auth/me ile mevcut session kontrol ediliyor...');
          const meRes = await fetchWithCreds(apiUrl('/api/auth/me'), { signal });
          if (signal.aborted) return;

          if (meRes.ok) {
            addLog('Mevcut session geçerli → hızlı geç');
            // Kaydedilmiş Discord locale'i kullan; yoksa navigator.language fallback
            const savedLocale = (() => { try { return localStorage.getItem('discord_locale'); } catch { return null; } })();
            setDiscordLocale(savedLocale || navigator.language);
            addLog(`Locale (hızlı yol): ${savedLocale || navigator.language}`);

            // Rich Presence — SDK'yı başlat ve ayarla
            const fastClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
            if (fastClientId && inDiscordRuntime && !isLocalDevBrowserHost()) {
              try {
                const { DiscordSDK } = await import('@discord/embedded-app-sdk');
                const fastSdk = new DiscordSDK(fastClientId);
                await withTimeout(fastSdk.ready(), 10000, 'sdk_ready_fast_timeout');
                setDiscordSdk(fastSdk);
                // Discord access token ile RPC bağlantısını authenticate et
                const tokenRes = await fetchWithCreds(
                  apiUrl(`/api/activity/discord-token?guild_id=${encodeURIComponent(guildId)}`),
                  { signal }
                );
                const savedGuildName = (() => { try { return localStorage.getItem(`discord_guild_name_${guildId}`); } catch { return null; } })();
                let guildName: string | null = savedGuildName;
                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json() as { access_token: string; guild_name?: string | null };
                  addLog(`discord-token guild_name: ${JSON.stringify(tokenData.guild_name)}`);
                  if (tokenData.guild_name) {
                    guildName = tokenData.guild_name;
                    try { localStorage.setItem(`discord_guild_name_${guildId}`, guildName); } catch {}
                  }
                  await withTimeout(
                    fastSdk.commands.authenticate({ access_token: tokenData.access_token }),
                    10000, 'authenticate_fast_timeout'
                  );
                  addLog('RPC authenticate (hızlı yol) başarılı');
                } else {
                  addLog(`discord-token endpoint hatası: ${tokenRes.status}`);
                }
                const richPresenceConfig: RichPresenceConfig = {
                  guildName,
                  state: 'Economy & Role Management',
                  buttons: [{ label: 'Open DiscoWeb', url: 'https://discoweb.tech' }],
                  assets: { large_image: 'discoweb', large_text: 'DiscoWeb' },
                };

                const provider = new DiscordSdkRichPresenceProvider(
                  fastSdk as unknown as { commands: { setActivity: (activity: { activity: unknown }) => Promise<unknown> } },
                );

                await applyRichPresence(provider, richPresenceConfig, addLog);
              } catch (e) {
                addLog(`Rich Presence ayarlanamadı (hızlı yol): ${JSON.stringify(e)}`);
              }
            }
            // Mevcut session varsa da login logu at (Activity yeniden açıldı)
            try {
              const meData = await meRes.clone().json() as { username?: string; avatar?: string };
              if (meData?.username) {
                userInfoRef.current = { username: meData.username, avatar: meData.avatar ?? null };
              }
              fetchWithCreds(apiUrl('/api/activity/ping'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: meData?.username, avatar: meData?.avatar }),
              }).catch(() => {});
            } catch { /* ping opsiyonel */ }
            setIsLoading(false);
            return;
          }
          addLog(`/api/auth/me başarısız (${meRes.status}), SDK auth gerekli`);
        } catch (e) {
          addLog(`/api/auth/me hata: ${e} → SDK auth gerekli`);
        }
        // Session geçersiz → devam et, SDK auth yap
        clearAuthState();
      }

      // --- SDK AUTH ---
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      if (!clientId) {
        setError('[DW-1003] NEXT_PUBLIC_DISCORD_CLIENT_ID tanımlı değil.');
        setIsLoading(false);
        return;
      }

      // Production'da frame_id zorunlu
      if (inDiscordRuntime && !currentFrameId) {
        setError('[DW-1001] Discord frame_id parametresi bulunamadı. Activity penceresini kapatıp tekrar açın.');
        setIsLoading(false);
        return;
      }

      // Dev modda Discord embed yoksa fallback session oluştur (LAN IP vb.)
      if (isDevMode && !inDiscordRuntime) {
        addLog('Dev mode fallback session oluşturuluyor...');
        await bootstrapLocalDevSession(guildId, signal, setDiscordLocale);
        if (signal.aborted) return;
        setIsLoading(false);
        addLog('Dev session oluşturuldu');
        return;
      }

      try {
        await runSdkAuth(clientId, guildId, currentFrameId);
        if (signal.aborted) return;
        setIsLoading(false);
      } catch (err) {
        if (signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`SDK auth hatası: ${msg}`);
        setError(`[DW-1004] Discord yetkilendirmesi başarısız: ${msg}`);
        setIsLoading(false);
      }
    }

    authenticate().catch((err) => {
      if (signal.aborted) return;
      setError(`[DW-9001] Beklenmeyen hata: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }).finally(() => {
      window.clearTimeout(hardTimeoutId);
    });

    return () => {
      abortController.abort();
      window.clearTimeout(hardTimeoutId);
    };
  }, [addLog, setDiscordLocale]);

  if (isLoading) {
    // Auth arka planda çalışır, kullanıcıya siyah ekran gösterilir
    return <div className="min-h-screen bg-[#0b0d12]" />;
  }

  if (isDmContext) {
    return <DmScreen />;
  }

  if (error) {
    const resetAndRetry = () => {
      clearAuthState();
      try { localStorage.removeItem('discord_frame_id'); } catch {}
      window.location.reload();
    };

    return <AuthErrorScreen
      error={error}
      debugLogs={debugLogs}
      onRetry={() => window.location.reload()}
      onReset={resetAndRetry}
    />;
  }

  return <>{children}</>;
}

function AuthErrorScreen({
  error,
  debugLogs,
  onRetry,
  onReset,
}: {
  error: string;
  debugLogs: string[];
  onRetry: () => void;
  onReset: () => void;
}) {
  const t = useT();
  const [muted, setMuted] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleReport = async () => {
    if (reported || reporting) return;
    setReporting(true);
    try {
      const res = await fetch(apiUrl('/api/support/auth-error-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error,
          url: typeof window !== 'undefined' ? window.location.href : '',
          debugLogs,
        }),
      });
      if (res.ok) setReported(true);
    } catch { /* sessizce geç */ } finally {
      setReporting(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/Thragg.mp4" />

      <div className="hidden sm:flex absolute z-20 top-6 right-6 items-center gap-2">
        <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Thragg.mp4" />
      </div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-center gap-0 px-8 sm:px-16">
        <div className="flex flex-col gap-5 max-w-lg">
          {/* Badge */}
          <div className="w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-400 backdrop-blur-md">
            {t('auth_error_badge')}
          </div>

          <div className="flex flex-col gap-3">
            <h1
              className="text-4xl font-black leading-tight tracking-tight text-white"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15), 0 2px 20px rgba(0,0,0,1)' }}
            >
              {t('auth_error_title')}
            </h1>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
              {t('auth_error_subtitle')}
            </p>
            <p className="text-xs text-white/35 leading-relaxed max-w-sm font-mono bg-black/30 rounded-lg px-3 py-2 backdrop-blur-sm border border-white/5">
              {error}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="sm:hidden">
              <MuteButton muted={muted} onToggle={toggleMute} src="/cdn/Storage/Test3.mp4" />
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
            >
              {t('auth_retry_button')}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-red-400/25 bg-red-500/15 px-6 py-3.5 text-sm font-bold text-red-200 backdrop-blur-md transition hover:bg-red-500/25"
            >
              {t('auth_reset_session_button')}
            </button>
            <button
              type="button"
              onClick={handleReport}
              disabled={reported || reporting}
              className="rounded-full border border-orange-400/25 bg-orange-500/15 px-6 py-3.5 text-sm font-bold text-orange-200 backdrop-blur-md transition hover:bg-orange-500/25 disabled:opacity-50"
            >
              {reported ? t('auth_report_sent') : reporting ? t('auth_report_sending') : t('auth_report_button')}
            </button>
          </div>

          <p className="text-xs text-white/30 pt-1">{t('auth_error_hint')}</p>

          {/* Debug — collapsible */}
          <button
            type="button"
            onClick={() => setDebugOpen(v => !v)}
            className="self-start text-[10px] text-white/20 hover:text-white/40 transition flex items-center gap-1"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className={`h-2.5 w-2.5 transition-transform ${debugOpen ? 'rotate-90' : ''}`}>
              <path d="M6 4l4 4-4 4V4z" />
            </svg>
            {t('auth_debug_label')}
          </button>
          {debugOpen && (
            <div className="text-left text-xs text-white/30 bg-black/40 rounded-xl p-3 max-h-40 overflow-y-auto border border-white/5 backdrop-blur-md">
              <p>iframe: {String(typeof window !== 'undefined' ? window.self !== window.top : false)}</p>
              <p className="break-all">url: {typeof window !== 'undefined' ? window.location.href : ''}</p>
              {debugLogs.map((log, i) => <p key={i} className="break-all">{log}</p>)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
