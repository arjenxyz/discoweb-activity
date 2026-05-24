/**
 * POST /api/member/quiz/join
 * body: { event_id: string }
 *
 * Sadece status='live' event'lere katılınabilir.
 * (İstenirse status='scheduled' iken pre-join da açılabilir.)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const userId = session.userId;
  const guildId = await getSelectedGuildId(request);

  let body: { event_id?: string };
  try {
    body = (await request.json()) as { event_id?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.event_id) return NextResponse.json({ error: 'event_id_required' }, { status: 400 });

  const { data: event } = await supabase
    .from('quiz_events')
    .select('id, scope, guild_id, status, current_position')
    .eq('id', body.event_id)
    .single();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (event.scope === 'guild' && event.guild_id !== guildId) {
    return NextResponse.json({ error: 'wrong_guild' }, { status: 403 });
  }
  if (event.status !== 'live') {
    return NextResponse.json({ error: 'not_live', status: event.status }, { status: 400 });
  }

  // Mevcut participant'ı bul (varsa)
  const { data: existing } = await supabase
    .from('quiz_event_participants')
    .select('event_id, wrong_count, last_position, eliminated_at')
    .eq('event_id', body.event_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, joined: false, participant: existing });
  }

  // Yeni katılım: kullanıcı pozisyonu kaçırdığı için missed olarak kaydedilecek
  // ama wrong_count başlangıçta 0; tick cron sonraki çağrıda last_position güncelleyecek
  const insertRow = {
    event_id: body.event_id,
    user_id: userId,
    guild_id: guildId ?? null,
    last_position: Math.max(0, event.current_position - 1), // bu pozisyonu cevaplayabilsin
  };

  const { data, error } = await supabase
    .from('quiz_event_participants')
    .insert(insertRow)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, joined: true, participant: data });
}
