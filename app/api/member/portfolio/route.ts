/**
 * GET /api/member/portfolio — Kullanıcının tüm holdings (portföy)
 */

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
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data: holdings } = await supabase
    .from('investor_holdings')
    .select('guild_id, lot_count, avg_buy_price')
    .eq('user_id', userId)
    .gt('lot_count', 0);

  return NextResponse.json({ holdings: holdings ?? [] });
}
