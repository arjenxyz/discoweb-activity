import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_unavailable' }, { status: 500 });

  const { data } = await supabase
    .from('bug_reports')
    .select('id, status, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', session.userId) // users can only see their own reports
    .single();

  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(data);
}
