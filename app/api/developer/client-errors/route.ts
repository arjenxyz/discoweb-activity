import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const page  = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const limit = 50;

  const { data, error, count } = await supabase
    .from('client_error_log')
    .select('id, error_key, message, type, unique_ips, total_hits, critical_alerted, last_seen, created_at', { count: 'exact' })
    .order('last_seen', { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

export async function DELETE(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  await supabase.from('client_error_log').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
