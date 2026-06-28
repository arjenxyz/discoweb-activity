/**
 * Supabase free plan keepalive — cron-job.org ile tetiklenir.
 * DB'ye hafif sorgu atarak projeyi uyanık tutar; sonucu Discord'a bildirir.
 *
 * Auth (header — URL'de secret yok):
 *   Authorization: Bearer $CRON_SECRET
 *   veya X-Cron-Secret: $CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import {
  getKeepaliveSupabase,
  notifyKeepaliveDiscord,
  pingSupabase,
} from '@/lib/supabaseKeepalive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!checkCronSecret(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const t0 = Date.now();

  const supabase = getKeepaliveSupabase();
  if (!supabase) {
    const result = { ok: false, supabase_latency_ms: 0, error: 'missing_supabase_config' };
    const discord = await notifyKeepaliveDiscord(result);
    return NextResponse.json(
      { ...result, elapsed_ms: Date.now() - t0, discord },
      { status: 500 },
    );
  }

  const result = await pingSupabase(supabase);
  const discord = await notifyKeepaliveDiscord(result);

  return NextResponse.json(
    {
      ok: result.ok,
      supabase_latency_ms: result.supabase_latency_ms,
      elapsed_ms: Date.now() - t0,
      discord,
      ...(result.error ? { error: result.error } : {}),
    },
    { status: result.ok ? 200 : 503 },
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
