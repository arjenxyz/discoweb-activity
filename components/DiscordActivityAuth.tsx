'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

interface DiscordActivityAuthProps {
  children: React.ReactNode;
}

export default function DiscordActivityAuth({ children }: DiscordActivityAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function authenticate() {
      // URL'den guild_id'yi al
      const urlParams = new URLSearchParams(window.location.search);
      const guildId = urlParams.get('guild_id');
      
      const isDevMode = process.env.NODE_ENV === 'development';

      // localStorage'dan mevcut kullanıcıyı kontrol et
      const existingUser = localStorage.getItem('discordUser');
      const existingGuildId = localStorage.getItem('selectedGuildId');

      // Yeni guild detected veya mevcut kullanıcı yoksa refresh
      if (guildId && existingGuildId !== guildId) {
        console.log('🔄 New guild detected or dev mode, refreshing user data...');
        localStorage.clear();

        // Ensure backend sees the correct guild immediately via cookie.
        const sameSiteValue = window.location.protocol === 'https:' ? 'None' : 'Lax';
        const secureValue = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `selected_guild_id=${guildId}; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
      }

      const setDevCookies = () => {
        const sameSiteValue = window.location.protocol === 'https:' ? 'None' : 'Lax';
        const secureValue = window.location.protocol === 'https:' ? '; Secure' : '';

        document.cookie = `discord_session=dev-session-12345; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
        document.cookie = `selected_guild_id=${guildId || 'dev-guild'}; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
      };

      // Prod ortamında dev-user kalmışsa temizle ve devam et
      if (existingUser && !isDevMode) {
        const parsed = (() => {
          try {
            return JSON.parse(existingUser);
          } catch {
            return null;
          }
        })();

        if (parsed?.id === 'dev-user-12345') {
          console.log('🚫 Clearing dev session from localStorage (prod mode)');
          // Clear any leftover cookies that were set for dev mode.
          document.cookie = 'discord_session=; Path=/; Max-Age=0';
          document.cookie = 'selected_guild_id=; Path=/; Max-Age=0';
          localStorage.removeItem('discordUser');
          localStorage.removeItem('discord_bearer_token');
          localStorage.removeItem('selectedGuildId');
        }
      }

      if (existingUser && isDevMode) {
        console.log('✅ User already authenticated from localStorage');
        console.log('✅ Stored bearer token:', localStorage.getItem('discord_bearer_token'));

        const parsed = (() => {
          try { return JSON.parse(existingUser); } catch { return null; }
        })();

        const isDevUser = parsed && parsed.id === 'dev-user-12345';

        // If we already have a dev user stored, ensure cookies + bearer token exist.
        if (isDevUser) {
          if (!document.cookie.includes('discord_session=')) {
            setDevCookies();
          }

          try {
            const res = await fetch(apiUrl('/api/activity/dev-session'));
            if (res.ok) {
              const json = await res.json();
              localStorage.setItem('discord_bearer_token', json.token);
            }
          } catch {
            // ignore
          }
        }

        setIsAuthenticated(true);
        setIsLoading(false);
        localStorage.setItem('selectedGuildId', guildId || '');
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Attempting real Discord SDK...');
        
        try {
          console.log('🚀 Starting Discord SDK authentication...');
          const discordSdkModule = await import('@discord/embedded-app-sdk');
          const DiscordSDK = discordSdkModule.DiscordSDK;
          
          const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
          await sdk.ready();

          console.log('🔍 SDK ready, attempting authorization...');
          
          const auth = await sdk.commands.authorize({
            client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
            scope: ['identify', 'guilds'],
            prompt: 'none',
          });

          console.log('📝 Got auth code, exchanging for token...');

          // Backend'e code gönder ve token al - Web sitesi ile aynı endpoint
          const authUrl = apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(guildId ?? '')}`);
          const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: auth.code }),
          });

          if (!response.ok) {
            const text = await response.text().catch(() => '<unreadable body>');
            console.error('[DiscordActivityAuth] /api/activity/auth failed', {
              status: response.status,
              statusText: response.statusText,
              body: text,
            });
            throw new Error('Authentication failed');
          }

          const result = await response.json();
          console.log('✅ Real Discord SDK auth successful in dev mode:', result);
          
          if (result.status === 'ok') {
            setIsAuthenticated(true);
            setIsLoading(false);
            localStorage.setItem('discordUser', JSON.stringify(result.user));
            localStorage.setItem('selectedGuildId', guildId || '');
            if (result.bearerToken) {
              localStorage.setItem('discord_bearer_token', result.bearerToken);
            }

            console.log('✅ User authenticated with real Discord data in dev mode');
            return;
          }

          console.error('[DiscordActivityAuth] /api/activity/auth returned ok but status != ok', result);
          throw new Error('Authentication failed');
          
        } catch (sdkError) {
          console.warn('⚠️ Real Discord SDK failed in dev mode, creating development session...');
          
          // Development modunda gerçek Discord SDK çalışmadığında, Supabise'den veri çekmek için
          // geçici bir session oluştur
          console.log('🔄 Creating development session for Supabise data...');
          
          const devUser = {
            id: 'dev-user-12345',
            username: 'DevUser',
            discriminator: '0001',
            avatar: null,
            guildId: guildId || 'dev-guild'
          };
          
          setIsAuthenticated(true);
          setIsLoading(false);
          localStorage.setItem('discordUser', JSON.stringify(devUser));
          localStorage.setItem('selectedGuildId', guildId || '');
          
          // API'lerin çalışması için session cookie oluştur
          const sameSiteValue = window.location.protocol === 'https:' ? 'None' : 'Lax';
          const secureValue = window.location.protocol === 'https:' ? '; Secure' : '';

          document.cookie = `discord_session=dev-session-12345; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;
          document.cookie = `selected_guild_id=${guildId || 'dev-guild'}; Path=/; Max-Age=604800; SameSite=${sameSiteValue}${secureValue}`;

          // Dev modda cookie 3rd-party olarak engellenebildiği için, API istekleri için
          // Bearer token da alıp localStorage'a kaydet.
          try {
            const res = await fetch(apiUrl('/api/activity/dev-session'));
            if (res.ok) {
              const json = await res.json();
              localStorage.setItem('discord_bearer_token', json.token);
            }
          } catch (e) {
            console.warn('Dev session token fetch failed', e);
          }

          console.log('✅ Development session created, APIs will fetch real Supabise data');
          return;
        }
      }

      // Eğer zaten bearer token varsa, yeniden OAuth istemeden doğrulamayı dene
      const storedBearerToken = typeof window !== 'undefined' ? localStorage.getItem('discord_bearer_token') : null;
      if (storedBearerToken) {
        try {
          const meRes = await fetchWithCreds(apiUrl('/api/auth/me'));
          if (meRes.ok) {
            const user = await meRes.json();
            setIsAuthenticated(true);
            setIsLoading(false);
            localStorage.setItem('discordUser', JSON.stringify(user));
            localStorage.setItem('selectedGuildId', guildId || '');
            return;
          }
        } catch {
          // Başarısız olursa normal OAuth akışına devam et
        }
      }

      // Production modunda Discord SDK'yi kullan
      try {
        console.log('� Production mode: Starting Discord SDK authentication...');
        console.log('🔍 Environment check:', { 
          isDevMode, 
          hasExistingUser: !!existingUser,
          guildId,
          frameId: new URLSearchParams(window.location.search).get('frame_id'),
          searchParams: window.location.search
        });
        
        // frame_id kontrolü
        const urlParams = new URLSearchParams(window.location.search);
        const frameId = urlParams.get('frame_id');

        if (!frameId) {
          console.warn('⚠️ No frame_id found - this is normal in Discord Developer Portal test');
          // Discord Developer Portal'da test ederken frame_id gelmez ama SDK çalışabilir
        }

        console.log('�🚀 Starting Discord SDK authentication...');
        const discordSdkModule = await import('@discord/embedded-app-sdk');
        const DiscordSDK = discordSdkModule.DiscordSDK;

        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await sdk.ready();

        console.log('🔍 SDK ready, attempting authorization...');
        
        const auth = await sdk.commands.authorize({
          client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
          scope: ['identify', 'guilds'],
        });

        console.log('📝 Got auth code, exchanging for token...');

        // Backend'e code gönder ve token al - Web sitesi ile aynı endpoint
        const authUrl = apiUrl(`/api/activity/auth?guild_id=${encodeURIComponent(guildId ?? '')}`);
        const response = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: auth.code }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Discord SDK auth successful:', result);
          
          if (result.status === 'ok') {
            setIsAuthenticated(true);
            setIsLoading(false);
            localStorage.setItem('discordUser', JSON.stringify(result.user));
            localStorage.setItem('selectedGuildId', guildId || '');
            if (result.bearerToken) {
              localStorage.setItem('discord_bearer_token', result.bearerToken);
            }

            // Backend'den gelen session cookie'ler zaten ayarlanmış olacak
            console.log('✅ User authenticated with real Discord data');
            return;
          }
        }
        
        throw new Error('Authentication failed');
        
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
      }
    }

    authenticate();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Discord ile bağlanılıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-500">Authentication required</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
