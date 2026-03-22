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
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  // Mevcut listing kontrolü
  const { data: listing } = await supabase
    .from('server_listings')
    .select('id, status, market_price, ipo_price, listed_at, founder_vested_lots, founder_lots, public_lots, total_lots')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (listing) {
    return NextResponse.json({ listed: true, listing });
  }

  // Bekleyen başvuru kontrolü
  const { data: application } = await supabase
    .from('ipo_applications')
    .select('id, status, proposed_price, proposed_founder_ratio, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ listed: false, pending: application?.status === 'pending', application });
}
