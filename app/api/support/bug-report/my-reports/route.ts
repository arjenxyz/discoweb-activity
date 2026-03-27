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
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_unavailable' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'bug';

  // Try with type filter first; if column doesn't exist fall back without it
  let query = supabase
    .from('bug_reports')
    .select('id, type, section, description, status, created_at, updated_at')
    .eq('user_id', session.userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data, error } = await query;

  if (error) {
    // type column might not exist yet — return all reports for this user
    const { data: fallback } = await supabase
      .from('bug_reports')
      .select('id, section, description, status, created_at, updated_at')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return NextResponse.json(fallback ?? []);
  }

  return NextResponse.json(data ?? []);
}
