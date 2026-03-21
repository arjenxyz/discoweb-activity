import { NextResponse } from 'next/server';
import { logWebEvent } from '@/lib/serverLogger';
import { logActivityLogin, logActivityAuthError, logNewUser } from '@/lib/activityLogger';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken } from '@/lib/auth';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  await logWebEvent(request, { event: 'activity_auth_attempt' });

  try {
    const { code } = (await request.json()) as { code?: string };
    const url = new URL(request.url);
    const guildId = url.searchParams.get('guild_id') || url.searchParams.get('guild_id');

    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!code || !clientId || !clientSecret || !botToken) {
const envFlags = {
      hasClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
      hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
      hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    await logWebEvent(request, {
      event: 'activity_auth_failed',
      status: 'missing_env_or_code',
      metadata: { envFlags },
    });

    return NextResponse.json({ status: 'error', reason: 'missing_env_or_code', env: envFlags }, { status: 400 });
    }

    // Activity için özel redirect URI (Discord Embedded App)
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://discord.com/oauth2/authorize', // Activity için standart URI
      scope: 'identify guilds',
    });

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (e) {
      console.error('activity auth token fetch failed', e);
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'token_fetch_error',
        metadata: { error: String(e) },
      });
      return NextResponse.json({ status: 'error', reason: 'token_fetch_error' }, { status: 502 });
    }

    if (!tokenResponse.ok) {
      let discordBody = null;
      try {
        discordBody = await tokenResponse.json();
      } catch {
        try { discordBody = await tokenResponse.text(); } catch { discordBody = null; }
      }
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'token_exchange_failed',
        metadata: { discordStatus: tokenResponse.status, discordBody },
      });
      return NextResponse.json({ status: 'error', reason: 'token_exchange_failed', discordStatus: tokenResponse.status, discordBody }, { status: 401 });
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    let userResponse: Response;
    try {
      userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
    } catch (e) {
      console.error('activity auth user fetch failed', e);
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'user_fetch_error',
        metadata: { error: String(e) },
      });
      return NextResponse.json({ status: 'error', reason: 'user_fetch_error' }, { status: 502 });
    }

    if (!userResponse.ok) {
      let discordBody = null;
      try {
        discordBody = await userResponse.json();
      } catch {
        try { discordBody = await userResponse.text(); } catch { discordBody = null; }
      }
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'user_fetch_failed',
        metadata: { discordStatus: userResponse.status, discordBody },
      });
      return NextResponse.json({ status: 'error', reason: 'user_fetch_failed', discordStatus: userResponse.status, discordBody }, { status: 401 });
    }

    const user = (await userResponse.json()) as {
      id: string;
      username: string;
      avatar: string | null;
      discriminator: string;
      email?: string | null;
    };

    // Kullanıcının bulunduğu tüm sunucuları al
    let guildsResponse: Response;
    try {
      guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
    } catch (e) {
      console.error('activity auth guilds fetch failed', e);
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'guilds_fetch_error',
        metadata: { error: String(e) },
      });
      return NextResponse.json({ status: 'error', reason: 'guilds_fetch_error' }, { status: 502 });
    }

    if (!guildsResponse.ok) {
      let discordBody = null;
      try {
        discordBody = await guildsResponse.json();
      } catch {
        try { discordBody = await guildsResponse.text(); } catch { discordBody = null; }
      }
      await logWebEvent(request, {
        event: 'activity_auth_failed',
        status: 'guilds_fetch_failed',
        metadata: { discordStatus: guildsResponse.status, discordBody },
      });
      return NextResponse.json({ status: 'error', reason: 'guilds_fetch_failed', discordStatus: guildsResponse.status, discordBody }, { status: 401 });
    }

    const guilds = (await guildsResponse.json()) as Array<{
      id: string;
      name: string;
      permissions: string;
      owner?: boolean;
      icon?: string | null;
    }>;

    const supabase = getSupabase();
    let existingUserForLog: boolean | null = null;

    if (supabase) {
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;
      
      // Önce mevcut kullanıcıyı kontrol et
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', user.id)
        .maybeSingle();

      existingUserForLog = !!existingUser;

      if (existingUser) {
        console.log('✅ Existing user found, updating tokens:', existingUser.username);
        
        // Mevcut kullanıcının token'larını güncelle
        await supabase
          .from('users')
          .update({
            username: user.username,
            avatar: user.avatar ?? null,
            email: user.email ?? null,
            oauth_access_token: tokenData.access_token,
            oauth_refresh_token: tokenData.refresh_token ?? null,
            oauth_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('discord_id', user.id);
      } else {
        console.log('👤 New user, creating in database:', user.username);
        
        // Yeni kullanıcı oluştur
        await (supabase.from('users') as unknown as {
          upsert: (values: Array<Record<string, unknown>>, options?: { onConflict?: string }) => Promise<unknown>;
        }).upsert(
          [
            {
              discord_id: user.id,
              username: user.username,
              avatar: user.avatar ?? null,
              email: user.email ?? null,
              oauth_access_token: tokenData.access_token,
              oauth_refresh_token: tokenData.refresh_token ?? null,
              oauth_expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'discord_id' },
        );
      }

      // Sadece Activity'nin açıldığı sunucu için member_profiles oluştur veya güncelle
      if (guildId) {
        const activeGuild = guilds.find((g) => g.id === guildId);
        const guildName = activeGuild?.name ?? guildId;

        // Sunucunun bizim sistemimizde kayıtlı olup olmadığını kontrol et
        const { data: server } = await supabase
          .from('servers')
          .select('id')
          .eq('discord_id', guildId)
          .maybeSingle();

        if (server) {
          const { data: existingProfile } = await supabase
            .from('member_profiles')
            .select('*')
            .eq('guild_id', guildId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingProfile) {
            console.log('✅ Existing member profile found for server:', guildName);
          } else {
            console.log('👤 Creating new member profile for server:', guildName);
            await supabase
              .from('member_profiles')
              .upsert(
                {
                  guild_id: guildId,
                  user_id: user.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'guild_id,user_id' }
              );
          }
        }
      }
    }

    // Activity için sadece kullanıcı bilgilerini döndür, sunucu seçimi olmadan direkt dashboard'a yönlendir
    const responseBody: Record<string, unknown> = {
      status: 'ok',
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator,
        guildId: guildId,
      },
      // Bearer token for clients that can't send cookies (like embedded apps in iframes)
      bearerToken: null,
    };

    // Create session token (and add it to cookies for browser requests)
    const sessionToken = createSessionToken(user.id);

    // Log successful Activity auth (stores in Supabase and sends to configured log webhook)
    await logWebEvent(request, {
      event: 'activity_auth_success',
      status: 'success',
      userId: user.id,
      guildId: guildId ?? undefined,
      metadata: {
        username: user.username,
        discriminator: user.discriminator,
      },
    });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null;
    const ua = request.headers.get('user-agent') ?? null;
    const loginExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
    const activeGuild = guildId ? guilds.find((g) => g.id === guildId) : null;
    const activeGuildName = activeGuild?.name ?? null;
    const activeGuildIcon = activeGuild?.icon ?? null;

    const isNewUser = !existingUserForLog;

    await logActivityLogin({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      guildId: guildId ?? null,
      guildName: activeGuildName,
      guildIcon: activeGuildIcon,
      isNewUser,
      ip,
      userAgent: ua,
      tokenExpiresAt: loginExpiresAt,
    });

    if (isNewUser) {
      await logNewUser({
        userId: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        guildId: guildId ?? null,
        guildName: activeGuildName,
        guildIcon: activeGuildIcon,
        ip,
        userAgent: ua,
      });
    }

    const response = NextResponse.json({
      ...responseBody,
      bearerToken: sessionToken,
    });

    // Set cookies for clients that can send cookies (embedded iframe may not send them)
    const sameSiteValue = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const secureValue = process.env.NODE_ENV === 'production';

    response.cookies.set('discord_session', sessionToken, {
      httpOnly: true,
      sameSite: sameSiteValue,
      secure: secureValue,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('discord_activity_session', '1', {
      httpOnly: true,
      sameSite: sameSiteValue,
      secure: secureValue,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    if (guildId) {
      response.cookies.set('selected_guild_id', guildId, {
        httpOnly: true,
        sameSite: sameSiteValue,
        secure: secureValue,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    response.cookies.set('discord_access_token', tokenData.access_token, {
      httpOnly: true,
      sameSite: sameSiteValue,
      secure: secureValue,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('activity auth unhandled error', err);
    await logWebEvent(request, {
      event: 'activity_auth_failed',
      status: 'unhandled_exception',
      metadata: {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
    await logActivityAuthError({
      reason: 'unhandled_exception',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
      metadata: { error: String(err), stack: err instanceof Error ? err.stack : undefined },
    });

    const envFlags = {
      hasClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
      hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
      hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const responseBody: Record<string, unknown> = {
      status: 'error',
      reason: 'unhandled_exception',
      env: envFlags,
    };

    // Provide more debug info in development, including stack
    if ((process.env.NODE_ENV as string) !== 'production') {
      responseBody.error = String(err);
      responseBody.stack = err instanceof Error ? err.stack : undefined;
    }

    return NextResponse.json(responseBody, { status: 500 });
  }
}
