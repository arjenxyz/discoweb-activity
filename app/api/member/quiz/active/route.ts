/**
 * GET /api/member/quiz/active
 *
 * Kullanıcıya görünür yaklaşan ve canlı quiz event'leri döner (bitmişler dahil değil).
 * Görünürlük: global event'ler herkese; guild event'ler sadece o sunucudaki üyelere.
 *
 * Dönen alanlar client'a güvenli (correct_index ASLA gönderilmez).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { runQuizTick } from '@/lib/quiz/tick';
import { isLocalDevRequest } from '@/lib/localDev';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  if (isLocalDevRequest(request)) {
    return NextResponse.json({ events: [], upcoming: [], live: [] });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;
  const guildId = await getSelectedGuildId(request);

  // Yaklaşan/canlı event'ler için state machine (bot cron yedek)
  try {
    await runQuizTick(supabase);
  } catch (e) {
    console.warn('[quiz/active] tick failed', e);
  }

  // Bu zaman penceresi içindeki event'leri al
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const orFilter = guildId
    ? `scope.eq.global,and(scope.eq.guild,guild_id.eq.${guildId})`
    : 'scope.eq.global';

  const { data: events, error } = await supabase
    .from('quiz_events')
    .select('id, scope, guild_id, lang, title, description, start_at, end_at, total_questions, seconds_per_question, reveal_seconds, wrong_allowed, prize_pool_papel, status, current_position, current_question_started_at, questions_locked_at')
    .or(orFilter)
    .in('status', ['scheduled', 'live'])
    .gte('start_at', dayAgo)
    .order('start_at', { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const eventIds = (events ?? []).map((e) => e.id);
  let cps: Array<{ event_id: string; position: number; papel_reward: number; label: string | null }> = [];
  let myParts: Array<{ event_id: string; wrong_count: number; total_correct: number; last_position: number; eliminated_at: string | null; papel_earned: number; perfect_score: boolean }> = [];
  if (eventIds.length) {
    const [{ data: cpData }, { data: partData }] = await Promise.all([
      supabase
        .from('quiz_event_checkpoints')
        .select('event_id, position, papel_reward, label')
        .in('event_id', eventIds),
      supabase
        .from('quiz_event_participants')
        .select('event_id, wrong_count, total_correct, last_position, eliminated_at, papel_earned, perfect_score')
        .in('event_id', eventIds)
        .eq('user_id', userId),
    ]);
    cps = cpData ?? [];
    myParts = partData ?? [];
  }

  const cpsByEvent = new Map<string, Array<{ position: number; papel_reward: number; label: string | null }>>();
  for (const c of cps) {
    const list = cpsByEvent.get(c.event_id) ?? [];
    list.push({ position: c.position, papel_reward: Number(c.papel_reward), label: c.label });
    cpsByEvent.set(c.event_id, list);
  }
  const partByEvent = new Map(myParts.map((p) => [p.event_id, p]));

  return NextResponse.json({
    events: (events ?? []).map((e) => ({
      ...e,
      checkpoints: (cpsByEvent.get(e.id) ?? []).sort((a, b) => a.position - b.position),
      me: partByEvent.get(e.id) ?? null,
      server_now: new Date().toISOString(),
    })),
  });
}
