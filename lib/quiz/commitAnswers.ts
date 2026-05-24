import type { SupabaseClient } from '@supabase/supabase-js';

/** Soru cevaplama süresi bittikten sonra bekleyen attempt'leri katılımcı istatistiklerine işler. */
export async function commitAnswersForPosition(
  supabase: SupabaseClient,
  eventId: string,
  position: number,
  wrongAllowed: number,
): Promise<void> {
  const { data: attempts } = await supabase
    .from('quiz_event_attempts')
    .select('user_id, is_correct')
    .eq('event_id', eventId)
    .eq('position', position);

  if (!attempts?.length) return;

  const { data: participants } = await supabase
    .from('quiz_event_participants')
    .select('user_id, wrong_count, total_correct, last_position, eliminated_at')
    .eq('event_id', eventId)
    .in(
      'user_id',
      attempts.map((a) => a.user_id),
    );

  const participantByUser = new Map((participants ?? []).map((p) => [p.user_id, p]));
  const now = new Date().toISOString();

  for (const attempt of attempts) {
    const participant = participantByUser.get(attempt.user_id);
    if (!participant || participant.eliminated_at) continue;
    if (participant.last_position >= position) continue;

    const isCorrect = !!attempt.is_correct;
    const newWrong = (participant.wrong_count ?? 0) + (isCorrect ? 0 : 1);
    const newCorrect = (participant.total_correct ?? 0) + (isCorrect ? 1 : 0);
    const patch: Record<string, unknown> = {
      last_position: position,
      wrong_count: newWrong,
      total_correct: newCorrect,
    };
    if (newWrong >= wrongAllowed) patch.eliminated_at = now;

    await supabase
      .from('quiz_event_participants')
      .update(patch)
      .eq('event_id', eventId)
      .eq('user_id', attempt.user_id);
  }
}

export function isQuestionAnswerPhaseOver(
  startedAtIso: string | null,
  secondsPerQuestion: number,
  nowMs = Date.now(),
): boolean {
  if (!startedAtIso) return false;
  const elapsed = nowMs - new Date(startedAtIso).getTime();
  return elapsed >= secondsPerQuestion * 1000;
}
