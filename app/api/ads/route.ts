import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ad: null });

  const { data } = await supabase
    .from('ads')
    .select('id, invite_url, server_name, server_description, server_icon, member_count, online_count, target_guild_id, mari_reward, task_enabled')
    .eq('active', true)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ads: data ?? [] });
}
