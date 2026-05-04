import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await requireSessionUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { pollId, optionId } = await request.json();
  if (!pollId || !optionId) {
    return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
  }

  const supabaseServiceClient = getSupabaseServiceClient();
  if (!supabaseServiceClient) {
    return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
  }

  const { data: optionRow } = await supabaseServiceClient
    .from('announcement_poll_options')
    .select('id, poll_id')
    .eq('id', optionId)
    .maybeSingle();

  if (!optionRow || optionRow.poll_id !== pollId) {
    return NextResponse.json({ error: 'Gecersiz secenek' }, { status: 400 });
  }

  const { data: existingVote } = await supabaseServiceClient
    .from('announcement_poll_votes')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (existingVote?.option_id === optionId) {
    return NextResponse.json({ ok: true });
  }

  if (existingVote) {
    const { error: updateError } = await supabaseServiceClient
      .from('announcement_poll_votes')
      .update({ option_id: optionId })
      .eq('id', existingVote.id);

    if (updateError) {
      return NextResponse.json({ error: 'Oy guncellenemedi' }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabaseServiceClient
      .from('announcement_poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: auth.userId,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Oy kaydedilemedi' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
