import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { discordFetch } from '@/lib/discordRest';

const DISCORD_API = 'https://discord.com/api/v10';
export const dynamic = 'force-dynamic';

type SupabaseAnyClient = ReturnType<typeof createClient<any>>;

const getSupabase = (): SupabaseAnyClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient<any>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

async function refreshAccessToken(
  supabase: SupabaseAnyClient,
  discordId: string,
  refreshToken: string,
) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    return null;
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  await (supabase as any)
    .from('users')
    .update({
      oauth_access_token: tokenData.access_token,
      oauth_refresh_token: tokenData.refresh_token ?? refreshToken,
      oauth_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId);

  return tokenData.access_token;
}

async function fetchDiscordWithRefresh(
  request: Request,
  supabase: SupabaseAnyClient,
  discordId: string,
  accessToken: string,
  refreshToken: string | null,
  input: string,
  init: RequestInit,
) {
  let response = await discordFetch(input, init, { retries: 2 });
  if (response.status !== 401) {
    return { response, accessToken };
  }

  if (!refreshToken) {
    return { response, accessToken: '' };
  }

  const refreshed = await refreshAccessToken(supabase, discordId, refreshToken);
  if (!refreshed) {
    return { response, accessToken: '' };
  }

  response = await discordFetch(input, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${refreshed}`,
    },
  }, { retries: 2 });

  return { response, accessToken: refreshed };
}

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  if (!guildId) {
    return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_supabase_config' }, { status: 500 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('oauth_access_token, oauth_refresh_token')
    .eq('discord_id', session.userId)
    .maybeSingle();

  if (!userRow?.oauth_access_token) {
    return NextResponse.json({ error: 'missing_token', needs_reauth: true }, { status: 401 });
  }

  const { response, accessToken } = await fetchDiscordWithRefresh(
    request,
    supabase,
    session.userId,
    userRow.oauth_access_token,
    userRow.oauth_refresh_token ?? null,
    `${DISCORD_API}/users/@me/guilds`,
    { headers: { Authorization: `Bearer ${userRow.oauth_access_token}` } },
  );

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json({ error: 'unauthorized', needs_reauth: true }, { status: 401 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json({ error: 'discord_api_error', detail: text }, { status: 502 });
  }

  const guilds = (await response.json()) as Array<{ id: string }>;
  const isMember = guilds.some((guild) => guild.id === guildId);
  return NextResponse.json({ member: isMember });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  if (!guildId) {
    return NextResponse.json({ error: 'guild_id_required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_supabase_config' }, { status: 500 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('oauth_access_token, oauth_refresh_token')
    .eq('discord_id', session.userId)
    .maybeSingle();

  if (!userRow?.oauth_access_token) {
    return NextResponse.json({ error: 'missing_token', needs_reauth: true }, { status: 401 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  const membershipRes = await fetchDiscordWithRefresh(
    request,
    supabase,
    session.userId,
    userRow.oauth_access_token,
    userRow.oauth_refresh_token ?? null,
    `${DISCORD_API}/users/@me/guilds`,
    { headers: { Authorization: `Bearer ${userRow.oauth_access_token}` } },
  );

  if (membershipRes.response.status === 401 || membershipRes.response.status === 403) {
    return NextResponse.json({ error: 'unauthorized', needs_reauth: true }, { status: 401 });
  }

  if (!membershipRes.response.ok) {
    const text = await membershipRes.response.text().catch(() => '');
    return NextResponse.json({ error: 'discord_api_error', detail: text }, { status: 502 });
  }

  const guilds = (await membershipRes.response.json()) as Array<{ id: string }>;
  if (guilds.some((guild) => guild.id === guildId)) {
    return NextResponse.json({ joined: true, already_member: true });
  }

  const accessToken = membershipRes.accessToken || userRow.oauth_access_token;
  const joinResponse = await discordFetch(
    `${DISCORD_API}/guilds/${guildId}/members/${session.userId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
    { retries: 2 },
  );

  if (joinResponse.ok) {
    return NextResponse.json({ joined: true });
  }

  const text = await joinResponse.text().catch(() => '');
  let body: { message?: string; code?: number } | null = null;
  try {
    body = JSON.parse(text) as { message?: string; code?: number };
  } catch {
    body = null;
  }

  if (joinResponse.status === 401 || joinResponse.status === 403) {
    const message = body?.message ?? '';
    const missingScope = message.toLowerCase().includes('guilds.join') || message.toLowerCase().includes('scope');
    if (missingScope) {
      return NextResponse.json({ error: 'missing_scope', needs_reauth: true, detail: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'bot_join_forbidden', detail: message }, { status: 403 });
  }

  if (joinResponse.status === 404) {
    return NextResponse.json({ error: 'guild_not_found', detail: text }, { status: 404 });
  }

  return NextResponse.json({ error: 'discord_join_failed', detail: text }, { status: 502 });
}
