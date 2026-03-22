import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

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
  if (!supabase) return NextResponse.json({ pending: false });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ pending: false });

  const { data } = await supabase
    .from('economy_tier_applications')
    .select('id, status, created_at')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .maybeSingle();

  return NextResponse.json({ pending: !!data, application: data ?? null });
}
