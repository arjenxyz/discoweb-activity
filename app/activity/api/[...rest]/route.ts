import { NextRequest, NextResponse } from 'next/server';

function rewriteToBackend(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Incoming path looks like: /activity/api/...?...
  // Forward internally to /api/... by stripping the leading /activity
  const segments = pathname.split('/').filter(Boolean);
  // Expect segments[0] === 'activity' and segments[1] === 'api'
  const stripped = segments.slice(2).join('/');
  const target = new URL(`/api/${stripped}${search}`, request.url);
  return NextResponse.rewrite(target);
}

export async function GET(request: NextRequest) {
  return rewriteToBackend(request);
}

export async function POST(request: NextRequest) {
  return rewriteToBackend(request);
}

export async function PUT(request: NextRequest) {
  return rewriteToBackend(request);
}

export async function PATCH(request: NextRequest) {
  return rewriteToBackend(request);
}

export async function DELETE(request: NextRequest) {
  return rewriteToBackend(request);
}

export async function OPTIONS(request: NextRequest) {
  return rewriteToBackend(request);
}
