import type { NextRequest } from 'next/server';

/**
 * Harici cron (cron-job.org vb.) için header tabanlı auth.
 * Query string secret kullanılmaz — log'larda sızma riski olmaması için.
 *
 * Desteklenen header'lar:
 * - Authorization: Bearer <CRON_SECRET>
 * - X-Cron-Secret: <CRON_SECRET>
 */
export function checkCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.QUIZ_CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[cron] CRON_SECRET tanımlı değil');
      return false;
    }
    return true;
  }

  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? null;

  return bearer === secret || headerSecret === secret;
}
