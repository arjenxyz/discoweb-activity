import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'discord_session';
const CSRF_COOKIE = 'csrf_token';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

const getSecret = () => process.env.SESSION_SECRET;

const base64UrlEncode = (input: string | Buffer) =>
  Buffer.from(input).toString('base64url');

const base64UrlDecode = (input: string) =>
  Buffer.from(input, 'base64url').toString('utf8');

const sign = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('base64url');

const timingSafeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export const createSessionToken = (userId: string) => {
  const secret = getSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: userId,
    iat: now,
    exp: now + SESSION_MAX_AGE_SEC,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  try {
    const secret = getSecret();
    if (!secret) {
      return null;
    }
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = sign(encoded, secret);
    if (!timingSafeEqual(sig, expected)) return null;
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!payload?.sub || !payload?.exp) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
};

export const setSessionCookies = (response: NextResponse, userId: string) => {
  const token = createSessionToken(userId);
  const csrfToken = base64UrlEncode(crypto.randomBytes(32));

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SEC,
    path: '/',
  });

  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SEC,
    path: '/',
  });

  return token;
};

export const clearSessionCookies = (response: NextResponse) => {
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  response.cookies.set(CSRF_COOKIE, '', { maxAge: 0, path: '/' });
};

export const getSessionUserId = async () => {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return 'dev-user-12345';
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    if ((process.env.NODE_ENV as string) === 'development') {
      const all = cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
      console.log('[auth] No discord_session cookie found. Available cookies:', all);
    }
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    if ((process.env.NODE_ENV as string) === 'development') {
      console.log('[auth] discord_session cookie exists but verification failed (expired or invalid signature)');
    }
  }
  return payload?.sub ?? null;
};

export const assertSameOrigin = (request: Request) => {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    // Allow server-to-server calls without Origin header.
    return null;
  }

  let requestOrigin: string | null = null;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = null;
  }

  const allowed = new Set<string>();
  if (requestOrigin) allowed.add(requestOrigin);
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // ignore invalid env
    }
  }

  if (allowed.size > 0 && !allowed.has(origin)) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  return null;
};

/**
 * Request'ten Bearer token ile userId çıkarır.
 * Activity iframe'i cookie gönderemediği için Authorization header kullanır.
 */
export const getSessionUserIdFromRequest = (request: Request): string | null => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[auth] Missing or invalid Authorization header:', authHeader);
    }
    return null;
  }
  const token = authHeader.slice(7);
  const payload = verifySessionToken(token);
  if (!payload && process.env.NODE_ENV === 'development') {
    console.log('[auth] Bearer token present but verification failed:', token);
  }
  return payload?.sub ?? null;
};

export const requireSessionUser = async (request?: Request) => {
  // Bearer token varsa önce onu dene (Activity iframe desteği)
  if (request) {
    const bearerUserId = getSessionUserIdFromRequest(request);
    if (bearerUserId) {
      // Bearer token geçerliyse origin kontrolü atla (token zaten yetki kanıtı)
      return { ok: true as const, userId: bearerUserId };
    }

    const originError = assertSameOrigin(request);
    if (originError) {
      return { ok: false as const, response: originError };
    }
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  return { ok: true as const, userId };
};

