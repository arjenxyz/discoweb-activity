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

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');

  const [userResult, serverResult] = await Promise.all([
    supabase.from('users').select('oauth_access_token').eq('discord_id', session.userId).maybeSingle(),
    guildId
      ? supabase.from('servers').select('name').eq('discord_id', guildId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!userResult.data?.oauth_access_token) {
    return NextResponse.json({ error: 'no_token' }, { status: 404 });
  }

  return NextResponse.json({
    access_token: userResult.data.oauth_access_token,
    guild_name: serverResult.data?.name ?? null,
  });
}
