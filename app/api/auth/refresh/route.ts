import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, verifySessionTokenAllowExpired } from '@/lib/auth';
import { logWebEvent } from '@/lib/serverLogger';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = verifySessionTokenAllowExpired(token);
    if (!payload) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const userId = payload.sub;
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('oauth_refresh_token')
      .eq('discord_id', userId)
      .maybeSingle();

    if (!user?.oauth_refresh_token) {
      return NextResponse.json({ error: 'missing_refresh_token' }, { status: 403 });
    }

    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'missing_env' }, { status: 500 });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: user.oauth_refresh_token,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      const discordBody = await tokenResponse.text().catch(() => null);
      await logWebEvent(request, {
        event: 'refresh_token_failed',
        status: 'discord_token_error',
        metadata: { discordStatus: tokenResponse.status, discordBody },
      });
      return NextResponse.json({ error: 'refresh_failed', details: discordBody }, { status: 401 });
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Update the user record with the new tokens
    await supabase
      .from('users')
      .update({
        oauth_access_token: tokenData.access_token,
        oauth_refresh_token: tokenData.refresh_token ?? user.oauth_refresh_token,
        oauth_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('discord_id', userId);

    const newSessionToken = createSessionToken(userId);
    const response = NextResponse.json({ ok: true, bearerToken: newSessionToken });

    const sameSiteValue = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const secureValue = process.env.NODE_ENV === 'production';

    response.cookies.set('discord_session', newSessionToken, {
      httpOnly: true,
      sameSite: sameSiteValue,
      secure: secureValue,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('refresh auth error', err);
    await logWebEvent(request, {
      event: 'refresh_token_unhandled',
      status: 'error',
      metadata: { error: String(err), stack: err instanceof Error ? err.stack : undefined },
    });
    return NextResponse.json({ error: 'unhandled_error' }, { status: 500 });
  }
}
