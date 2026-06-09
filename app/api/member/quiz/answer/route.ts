/**
 * POST /api/member/quiz/answer
 * body: { event_id: string, position: number, selected_index: 0|1|2|3 }
 *
 * Cevap kaydedilir; doğru/yanlış sonucu soru süresi bitene kadar client'a gönderilmez.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { runQuizTick } from '@/lib/quiz/tick';
import { QUIZ_INTRO_COUNTDOWN_SECONDS } from '@/lib/quiz/constants';

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

  let body: { event_id?: string; position?: number; selected_index?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.event_id || typeof body.position !== 'number' || typeof body.selected_index !== 'number') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (body.selected_index < 0 || body.selected_index > 3) {
    return NextResponse.json({ error: 'invalid_selected_index' }, { status: 400 });
  }

  const { data: event } = await supabase
    .from('quiz_events')
    .select('id, scope, guild_id, status, current_position, current_question_started_at, seconds_per_question, reveal_seconds, wrong_allowed')
    .eq('id', body.event_id)
    .single();
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (event.scope === 'guild' && event.guild_id !== guildId) {
    return NextResponse.json({ error: 'wrong_guild' }, { status: 403 });
  }
  if (event.status !== 'live') {
    return NextResponse.json({ error: 'not_live', status: event.status }, { status: 400 });
  }
  if (body.position !== event.current_position) {
    return NextResponse.json({ error: 'wrong_position', expected: event.current_position }, { status: 400 });
  }
  if (!event.current_question_started_at) {
    return NextResponse.json({ error: 'no_question_started' }, { status: 400 });
  }

  const startedAt = new Date(event.current_question_started_at).getTime();
  const now = Date.now();
  const msElapsed = now - startedAt;
  const revealSeconds = event.reveal_seconds ?? 2;
  const introGraceMs = body.position === 1 ? QUIZ_INTRO_COUNTDOWN_SECONDS * 1000 : 0;
  const questionWindowMs = event.seconds_per_question * 1000 + introGraceMs;
  const roundMs = (event.seconds_per_question + revealSeconds) * 1000 + introGraceMs;
  if (msElapsed > roundMs) {
    return NextResponse.json({ error: 'question_closed' }, { status: 400 });
  }

  const lateAnswer = msElapsed > questionWindowMs;

  const { data: participant } = await supabase
    .from('quiz_event_participants')
    .select('user_id, eliminated_at, last_position')
    .eq('event_id', body.event_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!participant) return NextResponse.json({ error: 'not_joined' }, { status: 400 });
  if (participant.eliminated_at) {
    return NextResponse.json({ error: 'eliminated' }, { status: 400 });
  }

  const { data: existingAttempt } = await supabase
    .from('quiz_event_attempts')
    .select('selected_index')
    .eq('event_id', body.event_id)
    .eq('user_id', userId)
    .eq('position', body.position)
    .maybeSingle();
  if (existingAttempt) {
    return NextResponse.json({ error: 'already_answered' }, { status: 400 });
  }

  const { data: question } = await supabase
    .from('quiz_event_questions')
    .select('correct_index')
    .eq('event_id', body.event_id)
    .eq('position', body.position)
    .single();
  if (!question) return NextResponse.json({ error: 'question_not_found' }, { status: 500 });

  const isCorrect = !lateAnswer && body.selected_index === question.correct_index;

  await supabase.from('quiz_event_attempts').upsert(
    {
      event_id: body.event_id,
      user_id: userId,
      position: body.position,
      selected_index: body.selected_index,
      is_correct: isCorrect,
      ms_elapsed: msElapsed,
      answered_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,user_id,position' },
  );

  try {
    await runQuizTick(supabase, body.event_id);
  } catch (e) {
    console.warn('[quiz/answer] tick failed', e);
  }

  return NextResponse.json({
    ok: true,
    selected_index: body.selected_index,
    pending_reveal: true,
  });
}
