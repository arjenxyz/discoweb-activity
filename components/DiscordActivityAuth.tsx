'use client';

import { useCallback, useEffect, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

interface DiscordActivityAuthProps {
  children: React.ReactNode;
}

const isInIframe = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isDiscordEmbedRuntime = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.host;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const hasFrameId = new URLSearchParams(window.location.search).has('frame_id');
  return host.includes('discordsays.com') || host.includes('discord.com') || userAgent.includes('Discord') || hasFrameId;
};

export default function DiscordActivityAuth({ children }: DiscordActivityAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [debugFrameIdUrl, setDebugFrameIdUrl] = useState<string | null>(null);
  const [debugFrameIdStorage, setDebugFrameIdStorage] = useState<string | null>(null);
  const [debugIsInIframe, setDebugIsInIframe] = useState<boolean | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
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

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => reject(new Error(label)), timeoutMs);
        promise
          .then(resolve)
          .catch(reject)
          .finally(() => window.clearTimeout(timeoutId));
      });
    };

    const withRetry = async <T,>(
      fn: () => Promise<T>,
      attempts = 3,
      delayMs = 500,
      label = 'retry',
    ): Promise<T> => {
      let lastError: unknown;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err;
          if (i < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
          }
        }
      }
      throw new Error(`${label} failed after ${attempts} attempts: ${String(lastError)}`);
    };

    const authorizeWithFallback = async (sdk: unknown, clientId: string) => {
      const authorize = (
        sdk as {
          commands: {
            authorize: (args: {
              client_id: string;
              scope: string[];
              prompt: 'none' | 'consent';
            }) => Promise<{ code: string }>;
          };
        }
      ).commands.authorize;

      // Önce 'none' dene, başarısız olursa 'consent' ile dene
      try {
        addLog('authorize() with prompt=none deneniyor...');
        return await withTimeout(
          authorize({
            client_id: clientId,
            scope: ['identify', 'guilds'],
            prompt: 'none',
          }),
          15000,
          'authorize_none_timeout',
        );
      } catch (err) {
        addLog(`prompt=none başarısız, prompt=consent deneniyor... (${err})`);
        return await withTimeout(
          authorize({
            client_id: clientId,
            scope: ['identify', 'guilds'],
            prompt: 'consent',
          }),
          15000,
          'authorize_consent_timeout',
        );
      }
    };

    const isDevSessionToken = (token: string | null) => {
      if (!token) return false;
      try {
        const [encodedPayload] = token.split('.');
        if (!encodedPayload) return false;
        const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const payload = JSON.parse(atob(padded)) as { sub?: string };
        return payload.sub === 'dev-user-12345';
      } catch {
        return false;
      }
    };

    async function authenticate() {
      addLog('STEP 1: authenticate() başladı');
      
      // Her adımda localStorage'dan güncel değerleri oku
      const getExistingUser = () => {
        try {
          return localStorage.getItem('discordUser');
        } catch {
          return null;
        }
      };

      const urlParams = new URLSearchParams(window.location.search);
      const guildId = urlParams.get('guild_id');
      
      const isDevMode = process.env.NODE_ENV === 'development';
      const inDiscordRuntime = isDiscordEmbedRuntime();
      addLog(`STEP 1: guildId=${guildId}, dev=${isDevMode}, discord=${inDiscordRuntime}, path=${window.location.pathname}`);

      let existingUser = getExistingUser();
      const existingGuildId = (() => {
        try {
          return localStorage.getItem('selectedGuildId');
        } catch {
          return null;
        }
      })();

      // Yeni guild detect edilirse sadece seçili guildId'yi güncelle, kullanıcıyı silme
      if (guildId && existingGuildId && existingGuildId !== guildId) {
        addLog('🔄 Yeni guild algılandı, selectedGuildId güncelleniyor...');
        localStorage.setItem('selectedGuildId', guildId);
        const sameSiteValue = window.location.protocol === 'https:' ? 'None' : 'Lax';
        const secureValue = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `selected_guild_id=${guildId}; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
        // Kullanıcı bilgilerini silme, sadece guild değiştiği için token hala geçerli olabilir
      }

      // Discord runtime'da eski dev session varsa temizle
      if (inDiscordRuntime) {
        const parsedExisting = (() => {
          try {
            return existingUser ? JSON.parse(existingUser) as { id?: string } : null;
          } catch {
            return null;
          }
        })();
        const storedToken = (() => {
          try {
            return localStorage.getItem('discord_bearer_token');
          } catch {
            return null;
          }
        })();
        const hasDevSession = parsedExisting?.id === 'dev-user-12345' || isDevSessionToken(storedToken);

        if (hasDevSession) {
          addLog('🧹 Discord runtime: stale dev session temizleniyor...');
          document.cookie = 'discord_session=; Path=/; Max-Age=0';
          localStorage.removeItem('discordUser');
          localStorage.removeItem('discord_bearer_token');
          existingUser = null;
        }
      }

      const frameIdFromUrl = urlParams.get('frame_id');
      const instanceIdFromUrl = urlParams.get('instance_id');
      const frameIdFromStorage = (() => {
        try {
          return localStorage.getItem('discord_frame_id');
        } catch {
          return null;
        }
      })();
      const instanceIdFromStorage = (() => {
        try {
          return localStorage.getItem('discord_instance_id');
        } catch {
          return null;
        }
      })();

      setDebugUrl(window.location.href);
      setDebugFrameIdUrl(frameIdFromUrl || instanceIdFromUrl);
      setDebugFrameIdStorage(frameIdFromStorage || instanceIdFromStorage);
      setDebugIsInIframe(isInIframe());

      if (frameIdFromUrl) {
        try { localStorage.setItem('discord_frame_id', frameIdFromUrl); } catch {}
      }
      if (instanceIdFromUrl) {
        try { localStorage.setItem('discord_instance_id', instanceIdFromUrl); } catch {}
      }

      const resolvedFrameId = frameIdFromUrl || instanceIdFromUrl || frameIdFromStorage || instanceIdFromStorage;
      const resolvedGuildId = guildId || existingGuildId || '';

      const setDevCookies = () => {
        const sameSiteValue = window.location.protocol === 'https:' ? 'None' : 'Lax';
        const secureValue = window.location.protocol === 'https:' ? '; Secure' : '';
        const devGuildId = resolvedGuildId || 'dev-guild';
        document.cookie = `discord_session=dev-session-12345; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
        document.cookie = `selected_guild_id=${devGuildId}; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
      };

      // Prod ortamında dev-user kalmışsa temizle
      if (existingUser && !isDevMode) {
        const parsed = (() => {
          try { return JSON.parse(existingUser); } catch { return null; }
        })();
        if (parsed?.id === 'dev-user-12345') {
          addLog('🚫 Prod modunda dev session temizleniyor');
          document.cookie = 'discord_session=; Path=/; Max-Age=0';
          document.cookie = 'selected_guild_id=; Path=/; Max-Age=0';
          localStorage.removeItem('discordUser');
          localStorage.removeItem('discord_bearer_token');
          localStorage.removeItem('selectedGuildId');
          existingUser = null;
        }
      }

      // Eğer daha önce oturum açılmışsa (dev veya gerçek) doğrudan geç
      if (existingUser) {
        addLog('STEP 2: existingUser BULUNDU, early return');
        const parsed = (() => { try { return JSON.parse(existingUser); } catch { return null; } })();
        const isDevUser = parsed?.id === 'dev-user-12345';
        addLog(`isDevUser: ${isDevUser}`);

        // Dev modda cookie yoksa ekle
        if (isDevUser && !document.cookie.includes('discord_session=')) {
          setDevCookies();
        }

        // Auth hazır flag'ini localStorage'a koy (CartProvider vs. için)
        try { localStorage.setItem('auth_ready', 'true'); } catch {}

        setIsAuthenticated(true);
        setIsLoading(false);
        localStorage.setItem('selectedGuildId', resolvedGuildId);
        return;
      } else {
        addLog(`STEP 2: existingUser yok, SDK auth devam`);
      }

      // --- Development modu ---
      if (isDevMode) {
        addLog('STEP 3: Dev mode SDK auth başlıyor...');
        try {
          addLog('STEP 3a: SDK import ediliyor...');
          const discordSdkModule = await import('@discord/embedded-app-sdk');
          const DiscordSDK = discordSdkModule.DiscordSDK;

          if (inDiscordRuntime && !resolvedFrameId) {
            setError('Discord frame_id veya instance_id parametresi eksik. Activity penceresini kapatıp yeniden açın.');
            setIsLoading(false);
            return;
          }

          if (resolvedFrameId && typeof window !== 'undefined') {
            const tempUrl = new URL(window.location.href);
            if (!tempUrl.searchParams.has('frame_id') && !tempUrl.searchParams.has('instance_id')) {
              if (frameIdFromUrl || frameIdFromStorage) {
                tempUrl.searchParams.set('frame_id', resolvedFrameId);
              } else {
                tempUrl.searchParams.set('instance_id', resolvedFrameId);
              }
              window.history.replaceState(null, '', tempUrl.toString());
            }
          }

          addLog(`STEP 4: SDK oluşturuluyor (frame/instance id=${resolvedFrameId?.substring(0, 8)}...)`);
          const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
          if (!clientId) throw new Error('NEXT_PUBLIC_DISCORD_CLIENT_ID tanımlı değil.');

          const sdk = new DiscordSDK(clientId);
          addLog('STEP 4a: sdk.ready() bekleniyor...');
          await withRetry(
            () => withTimeout(sdk.ready(), 12000, 'sdk_ready_timeout'),
            3, 600, 'sdk_ready'
          );
          if (signal.aborted) return;
          addLog('STEP 4b: sdk.ready() BAŞARILI!');

          addLog('STEP 5: authorize() çağrılıyor...');
          const auth = await authorizeWithFallback(sdk, clientId);
          if (signal.aborted) return;
          addLog(`STEP 5a: authorize BAŞARILI, code=${auth.code?.substring(0, 8)}...`);

          addLog('STEP 6: Backend auth endpoint çağrılıyor...');
          const authUrl = apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(guildId ?? '')}`);
          const response = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: auth.code }),
            signal,
          });
          if (signal.aborted) return;

          if (!response.ok) {
            const text = await response.text().catch(() => '<unreadable body>');
            throw new Error(`Backend auth hatası: ${response.status} ${text}`);
          }

          const result = await response.json();
          if (signal.aborted) return;
          addLog(`STEP 7: Backend response: status=${result.status}`);

          if (result.status === 'ok') {
            addLog('STEP 7a: OK! isAuthenticated=true yapılıyor...');
            setIsAuthenticated(true);
            setIsLoading(false);
            localStorage.setItem('discordUser', JSON.stringify(result.user));
            localStorage.setItem('selectedGuildId', resolvedGuildId);
            if (result.bearerToken) {
              localStorage.setItem('discord_bearer_token', result.bearerToken);
            }
            try { localStorage.setItem('auth_ready', 'true'); } catch {}
            addLog('STEP 8: Auth tamamlandı');
            return;
          }
          throw new Error('Authentication failed');
        } catch (sdkError) {
          if (inDiscordRuntime) {
            console.error('Discord SDK auth failed inside Discord Activity runtime', sdkError);
            setError('Discord yetkilendirmesi tamamlanamadı. Activity penceresini kapatıp tekrar açın.');
            setIsLoading(false);
            return;
          }

          // Fallback: development session
          addLog('⚠️ Real Discord SDK failed in dev mode, creating development session...');
          const devUser = {
            id: 'dev-user-12345',
            username: 'DevUser',
            discriminator: '0001',
            avatar: null,
          };
          setDevCookies();
          try {
            const res = await fetch(apiUrl('/api/activity/dev-session'), { signal });
            if (res.ok) {
              const json = await res.json();
              if (json.token) localStorage.setItem('discord_bearer_token', json.token);
            }
          } catch {}

          setIsAuthenticated(true);
          setIsLoading(false);
          localStorage.setItem('discordUser', JSON.stringify(devUser));
          localStorage.setItem('selectedGuildId', resolvedGuildId);
          try { localStorage.setItem('auth_ready', 'true'); } catch {}
          addLog('✅ Development session created');
          return;
        }
      }

      // --- Production modu ---
      // Önce mevcut bearer token varsa dene (cookie'ler sayesinde)
      const storedBearerToken = (() => {
        try {
          return localStorage.getItem('discord_bearer_token');
        } catch {
          return null;
        }
      })();
      if (inDiscordRuntime && isDevSessionToken(storedBearerToken)) {
        localStorage.removeItem('discord_bearer_token');
      } else if (storedBearerToken) {
        try {
          addLog('Mevcut bearer token ile /api/auth/me deneniyor...');
          const meRes = await fetchWithCreds(apiUrl('/api/auth/me'), { signal });
          if (meRes.ok) {
            const user = await meRes.json();
            if (signal.aborted) return;
            setIsAuthenticated(true);
            setIsLoading(false);
            localStorage.setItem('discordUser', JSON.stringify(user));
            localStorage.setItem('selectedGuildId', resolvedGuildId);
            try { localStorage.setItem('auth_ready', 'true'); } catch {}
            addLog('Mevcut oturum geçerli, direkt geçildi');
            return;
          }
        } catch {}
      }

      // Production'da Discord SDK ile yetkilendirme
      try {
        addLog('Production mode: Starting Discord SDK authentication...');
        if (!resolvedFrameId) {
          setError('Discord frame_id parametresi bulunamadı. Lütfen Activity penceresini kapatıp tekrar açın.');
          setIsLoading(false);
          return;
        }

        const discordSdkModule = await import('@discord/embedded-app-sdk');
        const DiscordSDK = discordSdkModule.DiscordSDK;

        if (typeof window !== 'undefined') {
          const tempUrl = new URL(window.location.href);
          if (!tempUrl.searchParams.has('frame_id')) {
            tempUrl.searchParams.set('frame_id', resolvedFrameId);
            window.history.replaceState(null, '', tempUrl.toString());
          }
        }

        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await withRetry(
          () => withTimeout(sdk.ready(), 12000, 'sdk_ready_timeout'),
          3, 600, 'sdk_ready'
        );
        if (signal.aborted) return;

        addLog('SDK ready, attempting authorization...');
        const auth = await authorizeWithFallback(sdk, process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        if (signal.aborted) return;

        addLog('Got auth code, exchanging for token...');
        const authUrl = apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(guildId ?? '')}`);
        const response = await fetch(authUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: auth.code }),
          signal,
        });
        if (signal.aborted) return;

        interface AuthResponse {
          status: string;
          user: { id: string; username: string; discriminator: string; avatar: string | null };
          bearerToken?: string;
          reason?: string;
        }

        let result: AuthResponse;
        if (response.ok) {
          result = await response.json();
        } else {
          const body = await response.text().catch(() => '<unreadable>');
          throw new Error(`Auth endpoint failed: ${response.status} ${body}`);
        }

        if (result.status !== 'ok') {
          throw new Error(`Auth failed: ${result.reason ?? 'unknown reason'}`);
        }

        setIsAuthenticated(true);
        setIsLoading(false);
        localStorage.setItem('discordUser', JSON.stringify(result.user));
        localStorage.setItem('selectedGuildId', resolvedGuildId);
        if (result.bearerToken) {
          localStorage.setItem('discord_bearer_token', result.bearerToken);
        }
        try { localStorage.setItem('auth_ready', 'true'); } catch {}
        addLog('Auth tamamlandı (production)');
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        setError(`Authentication failed. ${message}`);
        setIsLoading(false);
      }
    }

    authenticate()
      .catch((err) => {
        if (signal.aborted) return;
        console.error('Unhandled error in authenticate:', err);
        setError(`Beklenmeyen hata: ${err.message}`);
        setIsLoading(false);
      })
      .finally(() => {
        window.clearTimeout(hardTimeoutId);
      });

    return () => {
      abortController.abort();
      window.clearTimeout(hardTimeoutId);
    };
  }, [addLog]);

  // ---------- Render ----------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-center max-w-md w-full px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Discord ile bağlanılıyor...</p>
          <div className="mt-4 text-left text-xs text-white/60 bg-black/40 rounded p-3 max-h-48 overflow-y-auto">
            <p className="text-white/80 font-bold mb-1">Auth Debug:</p>
            {debugLogs.length === 0 && <p className="text-yellow-400">⏳ Henüz log yok...</p>}
            {debugLogs.map((log, i) => (
              <p key={i} className="break-all">{log}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const resetActivityCookies = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedGuildId');
      localStorage.removeItem('discord_bearer_token');
      localStorage.removeItem('discord_frame_id');
      localStorage.removeItem('discord_instance_id');
      localStorage.removeItem('discordUser');
      localStorage.removeItem('activity_session');
      localStorage.removeItem('auth_ready');
      document.cookie = 'discord_session=; Max-Age=0; path=/;';
      document.cookie = 'selected_guild_id=; Max-Age=0; path=/;';
      window.location.reload();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-center">
          <p className="text-red-500 mb-4">{error}</p>
          {debugUrl && (
            <div className="mb-4 text-left text-xs text-white/60">
              <p className="break-all">URL: {debugUrl}</p>
              <p>search: {new URL(debugUrl).search}</p>
              <p>iframe içinde mi: {debugIsInIframe === null ? 'bilinmiyor' : debugIsInIframe ? 'evet' : 'hayır'}</p>
              <p>frame_id (URL): {debugFrameIdUrl ?? 'yok'}</p>
              <p>frame_id (storage): {debugFrameIdStorage ?? 'yok'}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">Tekrar Dene</button>
            <button onClick={resetActivityCookies} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded">Çerezleri Temizle ve Yeniden Başlat</button>
            <button onClick={() => { const guildId = new URL(window.location.href).searchParams.get('guild_id') || ''; window.location.href = `/activity?guild_id=${encodeURIComponent(guildId)}`; }} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded">Discord Yetkilendirmesine Dön</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg font-semibold">Authentication required</p>
          <p className="text-white/80 text-sm">Bu hesap için yetkilendirme gerekliyse lütfen Discord oturumunu yenileyin.</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => { localStorage.removeItem('selectedGuildId'); localStorage.removeItem('discord_bearer_token'); localStorage.removeItem('discord_frame_id'); localStorage.removeItem('discordUser'); document.cookie = 'discord_session=; Max-Age=0; path=/;'; document.cookie = 'selected_guild_id=; Max-Age=0; path=/;'; window.location.href = '/activity'; }} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded">Discord Yetkilendirme Panelini Aç</button>
            <button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">Yeniden Dene</button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}