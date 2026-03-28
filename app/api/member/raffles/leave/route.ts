import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { getSelectedGuildId } from '@/lib/guild';

export async function POST(request: NextRequest) {
  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  let body: { raffle_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }); }

  const { raffle_id } = body;
  if (!raffle_id) return NextResponse.json({ error: 'raffle_id_required' }, { status: 400 });

  // Raffle must be active and not yet drawn, and end_date not passed
  const { data: raffle } = await supabase
    .from('raffles')
    .select('id,is_active,drawn_at,end_date')
    .eq('id', raffle_id)
    .eq('guild_id', selectedGuildId)
    .single();

  if (!raffle) return NextResponse.json({ error: 'raffle_not_found' }, { status: 404 });
  if (raffle.drawn_at) return NextResponse.json({ error: 'already_drawn' }, { status: 400 });
  if (!raffle.is_active) return NextResponse.json({ error: 'raffle_not_active' }, { status: 400 });
  if (raffle.end_date && new Date(raffle.end_date) < new Date()) {
    return NextResponse.json({ error: 'raffle_ended' }, { status: 400 });
  }

  const { error } = await supabase
    .from('raffle_entries')
    .delete()
    .eq('raffle_id', raffle_id)
    .eq('user_id', userId)
    .eq('guild_id', selectedGuildId);

  if (error) return NextResponse.json({ error: 'leave_failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
