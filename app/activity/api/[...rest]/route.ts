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

  const resp = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  });

  // Forward response headers (but avoid some hop-by-hop headers)
  const responseHeaders = new Headers(resp.headers);
  responseHeaders.delete('transfer-encoding');
  responseHeaders.delete('connection');

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: responseHeaders,
  });
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
