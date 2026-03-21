import { NextResponse } from 'next/server';
import { logError } from '@/lib/serverLogger';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  js_error: '🔴 JS Hatası',
  unhandled_rejection: '🟠 Promise Rejection',
  console_error: '🟡 Console Error',
};

// Rate limit — IP başına 10 istek/dakika
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: {
    type?: string;
    message?: string;
    source?: string;
    line?: number;
    col?: number;
    stack?: string;
    url?: string;
    userAgent?: string;
    timestamp?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.message) return NextResponse.json({ ok: false }, { status: 400 });

  const label = TYPE_LABELS[body.type ?? ''] ?? '⚪ İstemci Hatası';

  // Gürültülü / beklenen hataları filtrele
  const noise = [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Script error',
    'Load failed',
    'cancelled',
    'NetworkError',
    'AbortError',
    'ChunkLoadError',
  ];
  if (noise.some(n => body.message?.includes(n))) {
    return NextResponse.json({ ok: true });
  }

  await logError(new Error(`${label}: ${body.message}`), {
    route: `client → ${body.url ?? '?'}`,
    extra: {
      type: body.type,
      source: body.source,
      line: body.line,
      col: body.col,
      stack: body.stack,
      userAgent: body.userAgent,
      timestamp: body.timestamp,
      ip,
    },
  });

  return NextResponse.json({ ok: true });
}
