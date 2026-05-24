import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);

function isAllowedUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Discord CDN medyasını same-origin üzerinden sunar (video/img CORS sorunları için).
 * GET /api/media-proxy?url=https://cdn.discordapp.com/...
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 });
  }

  const target = isAllowedUrl(rawUrl.trim().replace(/[&\s]+$/, ''));
  if (!target) {
    return NextResponse.json({ error: 'url_not_allowed' }, { status: 403 });
  }

  const range = request.headers.get('range');
  const upstreamHeaders: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (compatible; DiscoWeb/1.0; +https://discord.com)',
    Accept: '*/*',
  };
  if (range) upstreamHeaders.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[media-proxy] fetch failed', e);
    return NextResponse.json({ error: 'upstream_fetch_failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const headers = new Headers();
  const passThrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
  for (const key of passThrough) {
    const v = upstream.headers.get(key);
    if (v) headers.set(key, v);
  }
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  // Tarayıcıda inline oynatma (attachment yerine)
  headers.set('Content-Disposition', 'inline');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
