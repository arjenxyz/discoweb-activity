/**
 * Quiz state machine — poll sırasında tetiklenir (bot cron yedek).
 * scheduled→live geçişi ve live soru ilerlemesi.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { lockEventQuestions } from './lockQuestions';

type Event = {
  id: string;
  status: string;
  start_at: string;
  total_questions: number;
  seconds_per_question: number;
  reveal_seconds: number;
  current_position: number;
  current_question_started_at: string | null;
  questions_locked_at: string | null;
};

async function missedAsWrong(supabase: SupabaseClient, ev: Event) {
  const { data: participants } = await supabase
    .from('quiz_event_participants')
    .select('user_id, wrong_count, last_position, eliminated_at')
    .eq('event_id', ev.id)
    .is('eliminated_at', null);

  if (!participants?.length) return;

  const missed = participants.filter((p) => p.last_position < ev.current_position);
  if (!missed.length) return;

  const { data: fullEv } = await supabase
    .from('quiz_events')
    .select('wrong_allowed')
    .eq('id', ev.id)
    .single();
  const wrongAllowed = fullEv?.wrong_allowed ?? 3;
  const now = new Date().toISOString();

  for (const p of missed) {
    const nextWrong = (p.wrong_count ?? 0) + 1;
    const patch: Record<string, unknown> = {
      wrong_count: nextWrong,
      last_position: ev.current_position,
    };
    if (nextWrong >= wrongAllowed) patch.eliminated_at = now;
    await supabase
      .from('quiz_event_participants')
      .update(patch)
      .eq('event_id', ev.id)
      .eq('user_id', p.user_id);

    await supabase.from('quiz_event_attempts').upsert(
      {
        event_id: ev.id,
        user_id: p.user_id,
        position: ev.current_position,
        selected_index: null,
        is_correct: false,
        ms_elapsed: null,
        answered_at: now,
      },
      { onConflict: 'event_id,user_id,position' },
    );
  }
}

/** Tek event veya tüm due event'ler için tick çalıştır */
export async function runQuizTick(
  supabase: SupabaseClient,
  eventId?: string,
): Promise<{ lock_failures: { event_id: string; error: string }[]; finished: number; advanced: number }> {
  const now = new Date();
  const lock_failures: { event_id: string; error: string }[] = [];
  let finished = 0;
  let advanced = 0;

  const lockWindow = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  let lockQuery = supabase
    .from('quiz_events')
    .select('id')
    .eq('status', 'scheduled')
    .is('questions_locked_at', null)
    .lte('start_at', lockWindow)
    .limit(20);
  if (eventId) lockQuery = lockQuery.eq('id', eventId);

  const { data: toLock } = await lockQuery;
  for (const ev of toLock ?? []) {
    const result = await lockEventQuestions(supabase, ev.id);
    if (!result.ok) {
      console.warn('[quiz-tick] lock failed', ev.id, result.error);
      lock_failures.push({ event_id: ev.id, error: result.error });
    }
  }

  let startQuery = supabase
    .from('quiz_events')
    .select('id, questions_locked_at')
    .eq('status', 'scheduled')
    .lte('start_at', now.toISOString())
    .limit(20);
  if (eventId) startQuery = startQuery.eq('id', eventId);

  const { data: toStart } = await startQuery;
  for (const ev of toStart ?? []) {
    if (!ev.questions_locked_at) {
      const result = await lockEventQuestions(supabase, ev.id);
      if (!result.ok) {
        console.warn('[quiz-tick] start lock failed', ev.id, result.error);
        lock_failures.push({ event_id: ev.id, error: result.error });
        continue;
      }
    }
    await supabase
      .from('quiz_events')
      .update({
        status: 'live',
        current_position: 1,
        current_question_started_at: now.toISOString(),
      })
      .eq('id', ev.id)
      .eq('status', 'scheduled');
  }

  let liveQuery = supabase.from('quiz_events').select('*').eq('status', 'live').limit(50);
  if (eventId) liveQuery = liveQuery.eq('id', eventId);

  const { data: live } = await liveQuery;
  for (const ev of (live ?? []) as Event[]) {
    let startedAt = ev.current_question_started_at
      ? new Date(ev.current_question_started_at).getTime()
      : 0;
    if (!startedAt && ev.current_position > 0) {
      const repairIso = now.toISOString();
      await supabase
        .from('quiz_events')
        .update({ current_question_started_at: repairIso })
        .eq('id', ev.id)
        .eq('status', 'live')
        .is('current_question_started_at', null);
      startedAt = now.getTime();
    }
    if (!startedAt) continue;
    const tickMs = (ev.seconds_per_question + (ev.reveal_seconds ?? 2)) * 1000;
    if (now.getTime() - startedAt < tickMs) continue;

    const nextPos = ev.current_position + 1;
    if (nextPos > ev.total_questions) {
      const { error } = await supabase
        .from('quiz_events')
        .update({ status: 'finished', current_question_started_at: null })
        .eq('id', ev.id)
        .eq('status', 'live')
        .eq('current_position', ev.current_position);
      if (error) {
        console.warn('[quiz-tick] finish failed', ev.id, error.message);
      } else {
        finished += 1;
      }
      await missedAsWrong(supabase, ev);
      continue;
    }

    await missedAsWrong(supabase, ev);
    const { error } = await supabase
      .from('quiz_events')
      .update({
        current_position: nextPos,
        current_question_started_at: now.toISOString(),
      })
      .eq('id', ev.id)
      .eq('status', 'live')
      .eq('current_position', ev.current_position);
    if (error) {
      console.warn('[quiz-tick] advance failed', ev.id, error.message);
    } else {
      advanced += 1;
    }
  }

  return { lock_failures, finished, advanced };
}
