/**
 * Quiz tick cron — canlı etkinlikleri ilerletir / bitirir.
 * Vercel Cron veya harici scheduler ile tetiklenir.
 *
 * Auth: ?secret=$QUIZ_CRON_SECRET veya Authorization: Bearer $QUIZ_CRON_SECRET|CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runQuizTick } from '@/lib/quiz/tick';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

function checkSecret(request: NextRequest): boolean {
  const secret = process.env.QUIZ_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[quiz-tick] QUIZ_CRON_SECRET tanımlı değil; production için ekle');
    }
    return true;
  }
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('secret');
  const auth = request.headers.get('authorization');
  const fromHeader = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  return fromQuery === secret || fromHeader === secret;
}

export async function GET(request: NextRequest) {
  if (!checkSecret(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'no_supabase' }, { status: 500 });
  const t0 = Date.now();
  const result = await runQuizTick(supabase);
  return NextResponse.json({ ok: true, ...result, elapsed_ms: Date.now() - t0 });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
