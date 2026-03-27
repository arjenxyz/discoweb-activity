/**
 * Internal endpoint called by the Discord bot to update a bug report's status.
 * Protected by INTERNAL_API_SECRET.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const VALID_STATUSES = ['reviewing', 'resolved', 'not_found'] as const;
type Status = typeof VALID_STATUSES[number];

export async function POST(request: Request) {
  const secret = request.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { reportId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { reportId, status } = body;
  if (!reportId || !status || !VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_unavailable' }, { status: 500 });

  const { error } = await supabase
    .from('bug_reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
