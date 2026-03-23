import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'missing_config' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data } = await supabase
    .from('users')
    .select('oauth_access_token')
    .eq('discord_id', session.userId)
    .maybeSingle();

  if (!data?.oauth_access_token) {
    return NextResponse.json({ error: 'no_token' }, { status: 404 });
  }

  return NextResponse.json({ access_token: data.oauth_access_token });
}
