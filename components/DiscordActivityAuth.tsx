'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { setDiscordSdk } from '@/lib/discordSdk';
import { useLocale } from '@/contexts/LocaleContext';
import DmScreen from '@/app/dashboard/components/DmScreen';

interface DiscordActivityAuthProps {
  children: React.ReactNode;
}

const isInIframe = () => {
  if (typeof window === 'undefined') return false;
  try { return window.self !== window.top; } catch { return true; }
};

const isDiscordEmbedRuntime = () => {
  if (typeof window === 'undefined') return false;
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
    const clearActivitySessionData = () => {
      try {
        localStorage.removeItem('selectedGuildId');
        localStorage.removeItem('discord_frame_id');
        localStorage.removeItem('discord_instance_id');
        localStorage.removeItem('discord_bearer_token');
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
        setError('Authentication timeout. Lütfen Activity penceresini kapatıp tekrar açın.');
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
      const sdkLocale = (sdk as unknown as { locale?: string }).locale ?? navigator.language;
      setDiscordLocale(sdkLocale);
      addLog(`Locale ayarlandı: ${sdkLocale}`);

      // prompt=none önce dene, başarısızsa consent ile
      let code: string;
      try {
        const res = await withTimeout(
          sdk.commands.authorize({ client_id: clientId, scope: ['identify', 'guilds'], prompt: 'none' }),
          15000, 'auth_none_timeout'
        );
        code = res.code;
        addLog('authorize(none) başarılı');
      } catch {
        addLog('authorize(none) başarısız, consent deneniyor...');
        const consentRes = await withTimeout<{ code: string }>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sdk.commands.authorize as any)({ client_id: clientId, scope: ['identify', 'guilds'], prompt: 'consent' }),
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
        body: JSON.stringify({ code }),
        signal,
      });
      if (signal.aborted) return;

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Backend auth hatası: ${response.status} ${text}`);
      }

      const result = await response.json() as {
        status: string;
        user?: { id: string; username: string };
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
      }
      addLog(`SDK auth tamamlandı, kullanıcı: ${result.user?.username}`);

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

      addLog(`guildId=${guildId}, dev=${isDevMode}, discord=${inDiscordRuntime}`);

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
            // Tarayıcı dilini locale olarak set et (SDK locale yoksa fallback)
            setDiscordLocale(navigator.language);
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
        setError('NEXT_PUBLIC_DISCORD_CLIENT_ID tanımlı değil.');
        setIsLoading(false);
        return;
      }

      // Production'da frame_id zorunlu
      if (inDiscordRuntime && !currentFrameId) {
        setError('Discord frame_id parametresi bulunamadı. Activity penceresini kapatıp tekrar açın.');
        setIsLoading(false);
        return;
      }

      // Dev modda Discord çalışmıyorsa fallback session oluştur
      if (isDevMode && !inDiscordRuntime) {
        addLog('Dev mode fallback session oluşturuluyor...');
        try {
          const res = await fetch(apiUrl('/api/activity/dev-session'), { signal });
          if (res.ok) {
            const json = await res.json();
            if (json.token) try { localStorage.setItem('discord_bearer_token', json.token); } catch {}
          }
        } catch {}
        setCookie('discord_session', 'dev-session-12345');
        setCookie('selected_guild_id', guildId || 'dev-guild');
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
        setError(`Discord yetkilendirmesi başarısız: ${msg}`);
        setIsLoading(false);
      }
    }

    authenticate().catch((err) => {
      if (signal.aborted) return;
      setError(`Beklenmeyen hata: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }).finally(() => {
      window.clearTimeout(hardTimeoutId);
    });

    return () => {
      abortController.abort();
      window.clearTimeout(hardTimeoutId);
    };
  }, [addLog]);

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

    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0d12]">
        <div className="text-white text-center max-w-sm px-4 space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#5865F2] hover:bg-[#4752C4] px-5 py-2.5 rounded-full text-sm font-semibold transition"
            >
              Tekrar Dene
            </button>
            <button
              onClick={resetAndRetry}
              className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full text-sm font-semibold transition"
            >
              Oturumu Sıfırla
            </button>
          </div>
          <div className="text-left text-xs text-white/30 bg-black/40 rounded-xl p-3 max-h-40 overflow-y-auto">
            <p className="text-white/50 font-bold mb-1">Debug:</p>
            <p>iframe: {String(isInIframe())}</p>
            <p>url: {typeof window !== 'undefined' ? window.location.href : ''}</p>
            {debugLogs.map((log, i) => <p key={i} className="break-all">{log}</p>)}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
