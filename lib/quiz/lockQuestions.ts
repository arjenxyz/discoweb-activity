/**
 * Quiz event soru kilitleme (activity-web — discoweb-main ile aynı mantık).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type LockResult =
  | { ok: true; locked: true; count: number; lang_used: string }
  | { ok: true; locked: false; reason: 'already_locked' | 'not_scheduled' | 'cancelled' }
  | { ok: false; error: string };

type EventRow = {
  id: string;
  scope: 'global' | 'guild';
  guild_id: string | null;
  total_questions: number;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  questions_locked_at: string | null;
  lang: string;
};

type BankWithTranslation = {
  id: string;
  correct_index: number;
  category: string | null;
  difficulty: string | null;
  question: string;
  options: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueLangs(primary: string): string[] {
  const p = (primary || 'tr').toLowerCase();
  return [...new Set([p, 'en', 'tr'])];
}

async function fetchReady(
  supabase: SupabaseClient,
  lang: string,
  options: { guildId?: string | null; globalOnly?: boolean; limit: number },
): Promise<BankWithTranslation[]> {
  let query = supabase
    .from('quiz_question_bank')
    .select(
      'id, correct_index, category, difficulty, is_custom_for_guild_id, last_used_at, quiz_question_translations!inner(question, options, is_ready, lang)',
    )
    .eq('quiz_question_translations.lang', lang)
    .eq('quiz_question_translations.is_ready', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(options.limit);

  if (options.globalOnly) query = query.is('is_custom_for_guild_id', null);
  if (options.guildId) query = query.eq('is_custom_for_guild_id', options.guildId);

  const { data, error } = await query;
  if (error) {
    console.warn('[quiz-lock] fetchReady error', lang, error.message);
    return [];
  }

  type Row = {
    id: string;
    correct_index: number;
    category: string | null;
    difficulty: string | null;
    quiz_question_translations: Array<{ question: string; options: string[] }>;
  };

  return ((data as unknown as Row[]) ?? [])
    .map((r) => {
      const t = r.quiz_question_translations?.[0];
      if (!t?.question || !Array.isArray(t.options) || t.options.length !== 4) return null;
      return {
        id: r.id,
        correct_index: r.correct_index,
        category: r.category,
        difficulty: r.difficulty,
        question: t.question,
        options: t.options,
      } satisfies BankWithTranslation;
    })
    .filter((r): r is BankWithTranslation => r !== null);
}

async function collectForLang(
  supabase: SupabaseClient,
  e: EventRow,
  lang: string,
): Promise<BankWithTranslation[]> {
  const total = e.total_questions;
  const collected: BankWithTranslation[] = [];

  if (e.scope === 'guild' && e.guild_id) {
    collected.push(...await fetchReady(supabase, lang, { guildId: e.guild_id, limit: total }));
  }
  if (collected.length < total) {
    const need = total - collected.length;
    const globals = shuffle(await fetchReady(supabase, lang, { globalOnly: true, limit: need * 3 }));
    for (const g of globals) {
      if (collected.length >= total) break;
      if (collected.some((c) => c.id === g.id)) continue;
      collected.push(g);
    }
  }
  return collected;
}

export async function lockEventQuestions(
  supabase: SupabaseClient,
  eventId: string,
): Promise<LockResult> {
  const { data: event, error: eventErr } = await supabase
    .from('quiz_events')
    .select('id, scope, guild_id, total_questions, status, questions_locked_at, lang')
    .eq('id', eventId)
    .single();

  if (eventErr || !event) {
    return { ok: false, error: eventErr?.message ?? 'event_not_found' };
  }

  const e = event as EventRow;

  if (e.questions_locked_at) return { ok: true, locked: false, reason: 'already_locked' };
  if (e.status === 'cancelled') return { ok: true, locked: false, reason: 'cancelled' };
  if (e.status !== 'scheduled') return { ok: true, locked: false, reason: 'not_scheduled' };

  let chosen: BankWithTranslation[] = [];
  let langUsed = (e.lang || 'tr').toLowerCase();

  for (const lang of uniqueLangs(e.lang)) {
    const collected = await collectForLang(supabase, e, lang);
    if (collected.length >= e.total_questions) {
      chosen = collected.slice(0, e.total_questions);
      langUsed = lang;
      break;
    }
  }

  if (chosen.length < e.total_questions) {
    const tried = uniqueLangs(e.lang).join(', ');
    return {
      ok: false,
      error: `Yetersiz hazır soru (${e.total_questions} gerekli). Denenen diller: ${tried}. Developer panelden çevirileri is_ready=true yapın.`,
    };
  }

  const rows = chosen.map((row, idx) => ({
    event_id: eventId,
    position: idx + 1,
    question_bank_id: row.id,
    question_text: row.question,
    options: row.options,
    correct_index: row.correct_index,
    category: row.category,
    difficulty: row.difficulty,
  }));

  await supabase.from('quiz_event_questions').delete().eq('event_id', eventId);
  const { error: insertErr } = await supabase.from('quiz_event_questions').insert(rows);
  if (insertErr) return { ok: false, error: insertErr.message };

  const bankIds = chosen.map((c) => c.id);
  if (bankIds.length > 0) {
    await supabase
      .from('quiz_question_bank')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', bankIds);
  }

  const { error: updateErr } = await supabase
    .from('quiz_events')
    .update({ questions_locked_at: new Date().toISOString() })
    .eq('id', eventId);
  if (updateErr) return { ok: false, error: updateErr.message };

  return { ok: true, locked: true, count: rows.length, lang_used: langUsed };
}
