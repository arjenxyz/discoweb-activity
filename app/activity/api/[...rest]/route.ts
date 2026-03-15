import { NextRequest } from 'next/server';

function getTargetUrl(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Incoming path looks like: /activity/api/... (e.g. /activity/api/member/profile)
  // Forward internally to /api/... by stripping the leading /activity
  const segments = pathname.split('/').filter(Boolean);
  const stripped = segments.slice(2).join('/');
  return new URL(`/api/${stripped}${search}`, request.url);
}

async function forwardRequest(request: NextRequest) {
  const targetUrl = getTargetUrl(request);

  // Clone headers and remove hop-by-hop headers that would otherwise break
  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('keep-alive');
  headers.delete('host');
  headers.delete('upgrade');
  headers.delete('proxy-authorization');
  headers.delete('proxy-authenticate');
  headers.delete('te');
  headers.delete('trailer');
  headers.delete('transfer-encoding');

  try {
    const resp = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });

    // Log non-OK responses for easier debugging
    if (!resp.ok) {
      console.warn('[activity/api proxy] upstream response not ok', {
        method: request.method,
        url: request.url,
        targetUrl: targetUrl.toString(),
        status: resp.status,
        statusText: resp.statusText,
      });
    }

    // Forward response headers (but avoid some hop-by-hop headers and
    // headers that Next.js uses for middleware rewrites.
    const responseHeaders = new Headers(resp.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');
    responseHeaders.delete('x-middleware-rewrite');
    responseHeaders.delete('x-middleware-next');

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // Log for visibility in server logs
    console.error('[activity/api proxy] failed to forward', {
      method: request.method,
      url: request.url,
      targetUrl: targetUrl.toString(),
      error,
    });

    return new Response(
      JSON.stringify({
        error: 'proxy_failure',
        message: (error as Error)?.message ?? 'unknown',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return forwardRequest(request);
}

export async function POST(request: NextRequest) {
  return forwardRequest(request);
}

export async function PUT(request: NextRequest) {
  return forwardRequest(request);
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request);
}

export async function DELETE(request: NextRequest) {
  return forwardRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return forwardRequest(request);
}
