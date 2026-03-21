import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'discord_session';
const ACTIVITY_SESSION_COOKIE = 'discord_activity_session';
const IGNORED_PREFIXES = ['/api', '/_next'];
const IGNORED_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/sw.js', '/manifest.json'];
const LEGACY_PUBLIC_PREFIXES = ['/docs', '/contact', '/privacy', '/important', '/thank-you'];

const roleCheckCache = new Map<string, { member: boolean; roles: string[]; expires: number }>();
const CACHE_DURATION_MS = 2 * 60 * 1000;
const CACHE_GRACE_MS = 30 * 1000;

type SessionPayload = {
  sub: string;
  exp: number;
};

const getSecret = () => process.env.SESSION_SECRET;

const base64UrlToBytes = (input: string) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let base64 = '';

  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    base64 = btoa(binary);
  }

  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64UrlDecode = (input: string) => {
  return new TextDecoder().decode(base64UrlToBytes(input));
};

const sign = async (data: string, secret: string) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto unavailable');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
};

const verifySessionToken = async (token: string): Promise<SessionPayload | null> => {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const expected = await sign(encoded, secret);
    if (sig !== expected) return null;

    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
};

const getSessionUserId = async (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  return payload?.sub ?? null;
};

const isStaticAsset = (pathname: string) => /\.[a-zA-Z0-9]+$/.test(pathname);

async function checkUserRoles(userId: string, guildId: string): Promise<{ member: boolean; roles: string[] } | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  const cacheKey = `${userId}-${guildId}`;
  const now = Date.now();
  const cached = roleCheckCache.get(cacheKey);

  if (cached && cached.expires > now) {
    return { member: true, roles: cached.roles };
  }

  try {
    const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberResponse.ok) {
      // User not found in guild
      if (memberResponse.status === 404) {
        roleCheckCache.delete(cacheKey);
        return { member: false, roles: [] };
      }

      // Transient Discord API error — serve stale cache within grace period
      if (cached && now < cached.expires + CACHE_GRACE_MS) {
        return { member: true, roles: cached.roles };
      }

      return null;
    }

    const member = (await memberResponse.json()) as { roles?: string[] };
    const roles = Array.isArray(member.roles) ? member.roles : [];

    roleCheckCache.set(cacheKey, {
      member: true,
      roles,
      expires: now + CACHE_DURATION_MS,
    });

    return { member: true, roles };
  } catch {
    if (cached) {
      return { member: true, roles: cached.roles };
    }

    return null;
  }
}

function redirectToActivity(request: NextRequest) {
  const url = new URL('/activity', request.url);
  return NextResponse.redirect(url);
}

function isDiscordEmbedRequest(request: NextRequest): boolean {
  const referer = request.headers.get('referer') ?? '';
  const origin = request.headers.get('origin') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  const secFetchSite = request.headers.get('sec-fetch-site') ?? '';

  const discordReferrer =
    referer.includes('discord.com') ||
    referer.includes('discordapp.com') ||
    referer.includes('discordsays.com');

  const discordOrigin =
    origin.includes('discord.com') ||
    origin.includes('discordapp.com') ||
    origin.includes('discordsays.com');

  const discordUserAgent = userAgent.includes('Discord');
  const crossSiteEmbed = secFetchSite === 'cross-site' && discordReferrer;

  return discordReferrer || discordOrigin || discordUserAgent || crossSiteEmbed;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    IGNORED_PATHS.includes(pathname) ||
    isStaticAsset(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return redirectToActivity(request);
  }

  if (pathname.startsWith('/activity') || pathname.startsWith('/maintenance') || pathname.startsWith('/server-left')) {
    return NextResponse.next();
  }

  if (LEGACY_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return redirectToActivity(request);
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/chat')) {
    const isEmbedRequest = isDiscordEmbedRequest(request);
    const hasActivityHint =
      request.nextUrl.searchParams.get('activity') === '1' ||
      request.nextUrl.searchParams.has('frame_id');
    const hasActivitySession =
      request.cookies.get(ACTIVITY_SESSION_COOKIE)?.value === '1' || isEmbedRequest || hasActivityHint;
    if (!hasActivitySession) {
      return redirectToActivity(request);
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      // Embedded Activity requests may not include third-party cookies.
      // Let the page load and rely on bearer-token authenticated API calls.
      if (!isEmbedRequest && !hasActivityHint) {
        return redirectToActivity(request);
      }

      return NextResponse.next();
    }

    const requestedGuildId = request.nextUrl.searchParams.get('guild_id');
    const selectedGuildId = requestedGuildId || request.cookies.get('selected_guild_id')?.value;

    if (selectedGuildId) {
      const userStatus = await checkUserRoles(userId, selectedGuildId);
      if (userStatus && userStatus.member === false) {
        return NextResponse.redirect(new URL('/server-left', request.url));
      }
    }

    return NextResponse.next();
  }

  return redirectToActivity(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

