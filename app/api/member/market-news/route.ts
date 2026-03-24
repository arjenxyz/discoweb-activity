import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get('guild_id'); // null = global feed
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let query = supabase
    .from('market_events')
    .select('id, event_type, guild_id, actor_id, headline, body, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (guildId) {
    query = query.eq('guild_id', guildId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [], total: count ?? 0 });
}
