/**
 * GET /api/member/quiz/state?event_id=...
 *
 * Aktif quiz'in client'a güvenli sunucu-otoriteli durumunu döner:
 *   - Event status + current_position + current_question_started_at + seconds_per_question
 *   - Eğer status='live' ise: o anki soru metni + 4 şık (correct_index ASLA gönderilmez)
 *   - Kullanıcının kendi state'i (wrong_count, eliminated, papel_earned, last_position)
 *   - Eğer participant katılım yapmamışsa joined=false
 *
 * Realtime broadcast yedek mekanizması; UI bunu 5sn'de bir poll edebilir.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { runQuizTick } from '@/lib/quiz/tick';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;
  const guildId = await getSelectedGuildId(request);

  const url = new URL(request.url);
  const eventId = url.searchParams.get('event_id');
  if (!eventId) return NextResponse.json({ error: 'event_id_required' }, { status: 400 });

  // Bot cron yoksa bile poll ile state machine ilerlesin
  let startBlocked: string | null = null;
  try {
    const tickResult = await runQuizTick(supabase, eventId);
    startBlocked = tickResult.lock_failures.find((f) => f.event_id === eventId)?.error ?? null;
  } catch (e) {
    console.warn('[quiz/state] tick failed', e);
  }

  const { data: eventRow } = await supabase
    .from('quiz_events')
    .select('*')
    .eq('id', eventId)
    .single();
  const event = eventRow;
  if (!event) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (event.scope === 'guild' && event.guild_id !== guildId) {
    return NextResponse.json({ error: 'wrong_guild' }, { status: 403 });
  }

  const { data: participant } = await supabase
    .from('quiz_event_participants')
    .select('wrong_count, total_correct, last_position, eliminated_at, papel_earned, perfect_score')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  const joined = !!participant;
  const canJoin = event.status === 'scheduled' && !joined;
  const registrationClosed = !joined && event.status === 'live';
  const startPending = event.status === 'scheduled' && new Date(event.start_at) <= new Date();

  // Sorular yalnızca önceden kayıt olmuş katılımcılara gösterilir
  let currentQuestion: { position: number; question_text: string; options: string[]; category: string | null; difficulty: string | null } | null = null;
  if (joined && event.status === 'live' && event.current_position > 0) {
    const { data: q } = await supabase
      .from('quiz_event_questions')
      .select('position, question_text, options, category, difficulty')
      .eq('event_id', eventId)
      .eq('position', event.current_position)
      .maybeSingle();
    if (q) {
      currentQuestion = {
        position: q.position,
        question_text: q.question_text,
        options: q.options as string[],
        category: q.category,
        difficulty: q.difficulty,
      };
    }
  }

  // Bu pozisyona cevap verilmiş mi? (sadece katılımcılar)
  let answeredThisPosition: { selected_index: number | null; is_correct: boolean } | null = null;
  if (joined && event.status === 'live' && event.current_position > 0) {
    const { data: attempt } = await supabase
      .from('quiz_event_attempts')
      .select('selected_index, is_correct')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('position', event.current_position)
      .maybeSingle();
    if (attempt) answeredThisPosition = { selected_index: attempt.selected_index, is_correct: attempt.is_correct };
  }

  return NextResponse.json({
    event: {
      id: event.id,
      scope: event.scope,
      guild_id: event.guild_id,
      lang: event.lang ?? 'tr',
      title: event.title,
      description: event.description,
      start_at: event.start_at,
      end_at: event.end_at,
      total_questions: event.total_questions,
      seconds_per_question: event.seconds_per_question,
      reveal_seconds: event.reveal_seconds,
      wrong_allowed: event.wrong_allowed,
      prize_pool_papel: event.prize_pool_papel,
      status: event.status,
      current_position: event.current_position,
      current_question_started_at: event.current_question_started_at,
      questions_locked_at: event.questions_locked_at ?? null,
    },
    current_question: currentQuestion,
    answered_this_position: answeredThisPosition,
    me: participant ?? null,
    joined,
    can_join: canJoin,
    registration_closed: registrationClosed,
    start_pending: startPending,
    start_blocked: startBlocked,
    server_now: new Date().toISOString(),
  });
}
