import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/guildAdmin';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const auth = await requireGuildAdmin(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';
  const q = searchParams.get('q')?.trim() ?? '';

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  let query = supabase
    .from('custom_role_requests')
    .select('*')
    .eq('guild_id', auth.guildId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: requests, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  let members: { user_id: string; username: string | null; nickname: string | null }[] = [];
  if (q.length >= 2) {
    const { data: profiles } = await supabase
      .from('member_profiles')
      .select('user_id, username, nickname')
      .eq('guild_id', auth.guildId)
      .or(`username.ilike.%${q}%,nickname.ilike.%${q}%,user_id.ilike.%${q}%`)
      .limit(15);
    members = profiles ?? [];
  }

  return NextResponse.json({ requests: requests ?? [], members });
}
